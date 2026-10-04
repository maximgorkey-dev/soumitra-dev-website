/**
 * Application wiring.
 *
 * Holds no algorithms: the flow lives in a worker, the drawing lives in the
 * view, and this file's job is to move messages between them and keep the
 * controls honest about what is happening.
 *
 * The design deliberately runs itself on first load. An empty canvas with a
 * cell palette next to it asks a visitor to do work before showing them
 * anything, and most of them will simply leave.
 */

import { PRESETS, DEFAULT_PRESET, buildPreset } from "./core/presets.js";
import { parseNetlist, toNetlistText } from "./core/netlist.js";
import { LIBRARY } from "./core/library.js";
import { STAGES, PLANNED, UPSTREAM } from "./flow/stages.js";
import { createView } from "./ui/view.js";
import {
  createStageBar,
  createMetrics,
  createLog,
  createSparkline,
  createExplainer,
  createFocusStrip,
  PLANNED_NOTE,
  fmt,
} from "./ui/panels.js";
import * as storage from "./ui/storage.js";

const el = (id) => document.getElementById(id);

/**
 * The animation speed dial, slowest first. Below the top two settings every
 * iteration is drawn and the wait does the pacing; the top two stop waiting and
 * skip frames instead, because past a certain rate the frame is the cost.
 */
const SPEED_STEPS = [
  { label: "320 ms", delay: 320, every: 1 },
  { label: "160 ms", delay: 160, every: 1 },
  { label: "80 ms", delay: 80, every: 1 },
  { label: "40 ms", delay: 40, every: 1 },
  { label: "16 ms", delay: 16, every: 1 },
  { label: "Fast", delay: 0, every: 2 },
  { label: "Instant", delay: 0, every: 12 },
];
const DEFAULT_SPEED = 5;

const state = {
  source: null,
  presetId: DEFAULT_PRESET,
  origin: "preset", // preset | custom | saved
  savedId: null,
  savedName: null,
  signedIn: false,
  speedIndex: DEFAULT_SPEED,
  running: false,
  paused: false,
  stageMetrics: {},
  live: null,
  floorplan: null,
  // First and previous placement samples, for "how far has it come" and "which
  // way is it going". Reset whenever placement restarts.
  placeFirst: null,
  placePrev: null,
};

/* ------------------------------------------------------------------ */
/* pieces                                                              */
/* ------------------------------------------------------------------ */

const log = createLog(el("log"));
const metricsPanel = createMetrics(el("metrics"));
const spark = createSparkline(el("spark"));
const explainer = createExplainer(el("explain"));
const focus = createFocusStrip(el("focus"));

const stageBar = createStageBar(el("stage-bar"), {
  upstream: UPSTREAM,
  stages: STAGES,
  planned: PLANNED,
  onInfo: (id) => explainer.show(id),
});

const view = createView(el("layout"), {
  onHover(cell, world) {
    const out = el("readout");
    if (cell) {
      out.textContent = `${cell.name}  ${cell.type}  @ ${fmt.um(cell.x)}, ${fmt.um(cell.y)}`;
    } else if (world) {
      out.textContent = `${fmt.um(world.x)}, ${fmt.um(world.y)}`;
    } else {
      out.textContent = "";
    }
  },
});

const worker = new Worker("/eda/worker.js", { type: "module" });
worker.onmessage = (event) => handle(event.data);
worker.onerror = (event) => {
  log.add("error", `worker error: ${event.message || "failed to start"}`);
  setRunning(false);
};

/* ------------------------------------------------------------------ */
/* worker messages                                                     */
/* ------------------------------------------------------------------ */

function handle(msg) {
  switch (msg.t) {
    case "reset":
      stageBar.reset();
      metricsPanel.clear();
      spark.clear();
      focus.reset();
      state.stageMetrics = {};
      state.live = null;
      state.floorplan = null;
      state.placeFirst = null;
      state.placePrev = null;
      setLayer("flylines", true);
      break;

    case "design":
      view.setDesign(msg.design);
      break;

    case "floorplan":
      state.floorplan = msg.floorplan;
      view.setFloorplan(msg.floorplan);
      view.setPorts(msg.ports);
      break;

    case "frame":
      if (msg.pos) view.setPositions(msg.pos);
      if (msg.density) view.setDensity(msg.density);
      if (msg.stage === "place" && msg.metrics && msg.metrics.hpwl != null) {
        state.live = msg.metrics;
        stageBar.setMetric(
          "place",
          `iter ${msg.iter} · ${fmt.um(msg.metrics.hpwl, 1)} · ovf ${fmt.pct(msg.metrics.overflow, 1)}`
        );
        showPlaceGauges(msg.iter, msg.metrics);
        spark.push({ hpwl: msg.metrics.hpwl, overflow: msg.metrics.overflow });
        renderMetrics();
      }
      break;

    case "cts":
      view.setClockTree(msg.tree);
      setLayer("flylines", false);
      break;

    case "ctsLevel":
      view.setClockLevel(msg.upto);
      stageBar.setMetric("cts", `level ${msg.upto} / ${msg.levels}`);
      break;

    case "route": {
      view.setRoute(msg.grid, msg.usage, msg.congestion);
      const m = msg.metrics;
      stageBar.setMetric("groute", `round ${m.iter} · overflow ${fmt.int(m.overflow)}`);
      focus.setGauges([
        { role: "objective", label: "Wirelength", value: fmt.um(m.wirelength, 1) },
        { role: "constraint", label: "Overflow", value: fmt.int(m.overflow), note: `${fmt.int(m.overEdges)} edges over capacity` },
        { role: "info", label: "Round", value: fmt.int(m.iter) },
      ]);
      break;
    }

    case "timing":
      view.setTiming({ slack: msg.slack, pathPts: msg.pathPts, period: msg.period });
      break;

    case "eco":
      view.updateDesign(msg.design);
      break;

    case "wires":
      if (msg.geometry) view.setWires(msg.geometry);
      view.setWiresUpto(msg.upto);
      stageBar.setMetric("droute", `${fmt.int(msg.metrics.vias)} vias · ${fmt.int(msg.metrics.shorts)} shorts`);
      break;

    case "progress":
      if (msg.text) stageBar.setMetric(msg.stage, msg.text);
      if (msg.stage === "legalize") {
        stageBar.setMetric("legalize", `${msg.placed} / ${msg.total} cells`);
        focus.setGauges([
          { role: "objective", label: "Cells placed", value: `${fmt.int(msg.placed)} / ${fmt.int(msg.total)}` },
        ]);
      }
      break;

    case "paused":
      setPaused(msg.on);
      break;

    case "stage":
      onStage(msg);
      break;

    case "log":
      log.add(msg.level || "info", msg.text);
      break;

    case "idle":
      setRunning(false);
      break;

    default:
      break;
  }
}

function onStage(msg) {
  stageBar.setStatus(msg.id, msg.status === "running" ? "running" : msg.status);

  if (msg.status === "running") {
    setRunning(true);
    focus.setStage(msg.id, { label: labelOf(msg.id) });
    focus.clearGauges();
    if (msg.id === "place") {
      state.placeFirst = null;
      state.placePrev = null;
    }
    log.banner(`--- ${labelOf(msg.id)} ---`);
    return;
  }

  if (msg.status === "error") {
    toast(msg.message || "stage failed", true);
    setRunning(false);
    return;
  }

  state.stageMetrics[msg.id] = msg.metrics || {};

  if (msg.id === "floorplan" && msg.metrics) view.setTarget(msg.metrics.utilization);
  if (msg.id === "place" && Array.isArray(msg.extra)) {
    // The full per-iteration history, so the curve is complete even when
    // frames were throttled for speed.
    spark.set(msg.extra.map((h) => ({ hpwl: h.hpwl, overflow: h.overflow })));
  }

  stageBar.setMetric(msg.id, headline(msg.id, msg.metrics || {}));
  focus.setGauges(finalGauges(msg.id, msg.metrics || {}));
  renderMetrics();
}

const labelOf = (id) => (STAGES.find((s) => s.id === id) || { label: id }).label;

/* ------------------------------------------------------------------ */
/* live objective strip                                                */
/* ------------------------------------------------------------------ */

/**
 * Placement in flight. Trend is against the previous frame and tells you which
 * way each number is moving right now; the note is against the first frame, so
 * a wirelength that is rising this instant can still be shown as a large net
 * improvement over where it started. Both readings are needed to make sense of
 * what is on the canvas.
 */
function showPlaceGauges(iter, m) {
  if (!state.placeFirst) state.placeFirst = m;
  const first = state.placeFirst;
  const prev = state.placePrev || m;
  state.placePrev = m;

  const target = m.targetOverflow;
  focus.setGauges([
    {
      role: "objective",
      label: "Wirelength",
      value: fmt.um(m.hpwl, 1),
      trend: m.hpwl - prev.hpwl,
      note: first.hpwl ? `${fmt.signedPct((m.hpwl - first.hpwl) / first.hpwl)} from start` : "",
    },
    {
      role: "constraint",
      label: "Density overflow",
      value: fmt.pct(m.overflow, 1),
      trend: m.overflow - prev.overflow,
      note: target != null ? `target ${fmt.pct(target, 0)}` : "",
    },
    { role: "info", label: "Iteration", value: fmt.int(iter) },
  ]);
}

/** What the strip settles on once a stage finishes. */
function finalGauges(id, m) {
  switch (id) {
    case "netlist":
      return [
        { role: "info", label: "Cells", value: fmt.int(m.cells) },
        { role: "info", label: "Nets", value: fmt.int(m.nets) },
        { role: "info", label: "Max fanout", value: fmt.int(m.maxFanout) },
      ];
    case "floorplan":
      return [
        { role: "objective", label: "Utilisation", value: fmt.pct(m.utilization) },
        { role: "info", label: "Rows x sites", value: `${m.rows} x ${m.sitesPerRow}` },
      ];
    case "place":
      return [
        { role: "objective", label: "Wirelength", value: fmt.um(m.hpwl, 1) },
        {
          role: "constraint",
          label: "Density overflow",
          value: fmt.pct(m.overflow, 1),
          note: m.targetOverflow != null ? `target ${fmt.pct(m.targetOverflow, 0)}` : "",
        },
        { role: "info", label: "Stopped", value: m.stopReason || "—" },
      ];
    case "legalize":
      return [
        { role: "objective", label: "Displacement avg", value: fmt.um(m.avgDisplacement) },
        { role: "constraint", label: "Cost of legality", value: fmt.signedPct(m.hpwlDelta) },
        { role: "info", label: "Legal", value: m.legal ? "yes" : "no" },
      ];
    case "cts":
      return [
        { role: "objective", label: "Skew", value: fmt.ps(m.skew), note: m.skewBefore != null ? `from ${fmt.ps(m.skewBefore)} before balancing` : "" },
        { role: "info", label: "Insertion delay", value: `${fmt.ps(m.minLatency)} – ${fmt.ps(m.maxLatency)}` },
        { role: "info", label: "Buffers", value: fmt.int(m.buffers), note: m.snaked ? `${m.snaked} snaked` : "" },
      ];
    case "holdfix":
      if (m.whsBefore == null) return [{ role: "info", label: "Hold checks", value: "none" }];
      return [
        { role: "objective", label: "Worst hold slack", value: fmt.ps(m.whs), note: `from ${fmt.ps(m.whsBefore)}` },
        { role: "constraint", label: "Worst setup slack", value: fmt.ps(m.wns), note: `from ${fmt.ps(m.wnsBefore)}` },
        { role: "info", label: "Cells inserted", value: fmt.int(m.inserted), note: m.unfixed ? `${m.unfixed} unfixed` : "" },
      ];
    case "droute":
      return [
        { role: "objective", label: "Wirelength", value: fmt.um(m.wirelength, 1) },
        { role: "constraint", label: "Shorts", value: fmt.int(m.shorts), note: `from ${fmt.int(m.initialShorts)} before repair` },
        { role: "info", label: "Vias", value: fmt.int(m.vias) },
      ];
    case "groute":
      return [
        { role: "objective", label: "Wirelength", value: fmt.um(m.wirelength, 1) },
        { role: "constraint", label: "Overflow", value: fmt.int(m.overflow), note: `from ${fmt.int(m.initialOverflow)}` },
        { role: "info", label: "Vias", value: fmt.int(m.vias) },
      ];
    case "sta":
      return [
        { role: "objective", label: "Worst setup slack", value: fmt.ps(m.wns), note: `${fmt.int(m.violations)} / ${fmt.int(m.endpoints)} failing` },
        { role: "constraint", label: "Worst hold slack", value: m.whs == null ? "—" : fmt.ps(m.whs), note: m.whs == null ? "no flops" : `${fmt.int(m.holdViolations)} failing` },
        { role: "info", label: "Fmax", value: m.fmax ? `${m.fmax.toFixed(0)} MHz` : "—", note: m.extracted ? "extracted RC" : "" },
      ];
    default:
      return [];
  }
}

function headline(id, m) {
  switch (id) {
    case "netlist":
      return `${fmt.int(m.cells)} cells · ${fmt.int(m.nets)} nets`;
    case "floorplan":
      return `${m.rows}x${m.sitesPerRow} · ${fmt.pct(m.utilization)}`;
    case "place":
      return `${fmt.um(m.hpwl, 1)} · ovf ${fmt.pct(m.overflow, 1)}`;
    case "legalize":
      return `${fmt.um(m.hpwl, 1)} · ${fmt.signedPct(m.hpwlDelta)}`;
    case "cts":
      return m.buffers ? `${fmt.int(m.buffers)} bufs · skew ${fmt.ps(m.skew)}` : "no clock";
    case "holdfix":
      return m.whsBefore == null ? "no flops" : `${fmt.int(m.inserted)} cells · hold ${fmt.ps(m.whs)}`;
    case "droute":
      return `${fmt.um(m.wirelength, 1)} · ${fmt.int(m.shorts)} shorts`;
    case "groute":
      return `${fmt.um(m.wirelength, 1)} · ovf ${fmt.int(m.overflow)}`;
    case "sta":
      return `WNS ${fmt.ps(m.wns)} · ${fmt.int(m.violations)} failing`;
    default:
      return "";
  }
}

/* ------------------------------------------------------------------ */
/* metrics table                                                       */
/* ------------------------------------------------------------------ */

function renderMetrics() {
  const { netlist: n, floorplan: f, place: p, legalize: l } = state.stageMetrics;
  const rows = [];

  if (n) {
    rows.push(
      { label: "Cells", value: fmt.int(n.cells) },
      { label: "Sequential", value: fmt.int(n.sequential) },
      { label: "Nets", value: fmt.int(n.nets) },
      { label: "Pins", value: fmt.int(n.pins) },
      { label: "Boundary pins", value: fmt.int(n.ports) },
      { label: "Max fanout", value: fmt.int(n.maxFanout), tone: n.maxFanout > 12 ? "warn" : undefined }
    );
    if (n.errors) rows.push({ label: "Netlist errors", value: fmt.int(n.errors), tone: "bad" });
  }

  if (f && state.floorplan) {
    const { core, die } = state.floorplan;
    rows.push(
      "---",
      { label: "Die", value: `${fmt.um(die.w, 1)} x ${fmt.um(die.h, 1)}` },
      { label: "Core", value: `${fmt.um(core.w, 1)} x ${fmt.um(core.h, 1)}` },
      { label: "Rows x sites", value: `${f.rows} x ${f.sitesPerRow}` },
      { label: "Cell area", value: fmt.um2(f.cellArea) },
      { label: "Utilisation", value: fmt.pct(f.utilization), tone: "accent" }
    );
  }

  const live = state.live;
  if (p || live) {
    const m = p || live;
    rows.push(
      "---",
      { label: "Wirelength (HPWL)", value: fmt.um(m.hpwl, 1), tone: "accent" },
      { label: "Density overflow", value: fmt.pct(m.overflow, 1), tone: m.overflow > 0.12 ? "warn" : "good" }
    );
    if (p) {
      rows.push(
        { label: "Peak bin density", value: (p.peakDensity || 0).toFixed(2) },
        { label: "Placement iterations", value: fmt.int(p.iterations) }
      );
    }
  }

  if (l) {
    rows.push(
      "---",
      { label: "Legal wirelength", value: fmt.um(l.hpwl, 1) },
      {
        label: "Cost of legality",
        value: fmt.signedPct(l.hpwlDelta),
        tone: l.hpwlDelta > 0.05 ? "warn" : "good",
      },
      { label: "Displacement avg", value: fmt.um(l.avgDisplacement) },
      { label: "Displacement max", value: fmt.um(l.maxDisplacement) },
      { label: "Rows used", value: fmt.int(l.rowsUsed) },
      {
        label: "Legality check",
        value: l.legal ? "passed" : `${l.overlaps} overlaps`,
        tone: l.legal ? "good" : "bad",
      }
    );
    if (l.unplaced) rows.push({ label: "Unplaced cells", value: fmt.int(l.unplaced), tone: "bad" });
  }

  const { cts: c, holdfix: h, groute: g, droute: d, sta: t } = state.stageMetrics;
  if (c && c.buffers) {
    rows.push(
      "---",
      { label: "Clock sinks", value: fmt.int(c.sinks) },
      { label: "Clock buffers", value: `${fmt.int(c.buffers)} in ${c.levels} levels` },
      { label: "Buffer legalisation", value: `${fmt.um(c.bufferMoved)} avg move` },
      { label: "Insertion delay", value: `${fmt.ps(c.minLatency)} – ${fmt.ps(c.maxLatency)}` },
      { label: "Skew before balancing", value: fmt.ps(c.skewBefore) },
      { label: "Clock skew", value: fmt.ps(c.skew), tone: "accent" },
      { label: "Clock wire", value: `${fmt.um(c.wirelength, 1)} + ${fmt.um(c.snakeLength, 1)} snakes` }
    );
  }
  if (h && h.whsBefore != null) {
    rows.push(
      "---",
      { label: "Hold slack before fix", value: fmt.ps(h.whsBefore), tone: h.whsBefore < 0 ? "bad" : undefined },
      { label: "Hold cells inserted", value: `${fmt.int(h.inserted)} (${fmt.int(h.delayCells)} DLY)` },
      { label: "Hold slack after fix", value: fmt.ps(h.whs), tone: h.whs < 0 ? "bad" : "good" }
    );
    if (h.unfixed) rows.push({ label: "Unfixed hold endpoints", value: fmt.int(h.unfixed), tone: "bad" });
  }
  if (g) {
    rows.push(
      "---",
      { label: "GCell grid", value: `${g.nx} x ${g.ny}` },
      { label: "Routed wirelength", value: fmt.um(g.wirelength, 1), tone: "accent" },
      { label: "Vias (bends)", value: fmt.int(g.vias) },
      { label: "Peak edge use", value: fmt.pct(g.maxUtil, 0), tone: g.maxUtil > 1 ? "bad" : g.maxUtil > 0.85 ? "warn" : "good" },
      { label: "Overflow", value: `${fmt.int(g.overflow)} (was ${fmt.int(g.initialOverflow)})`, tone: g.overflow ? "bad" : "good" },
      { label: "Negotiation rounds", value: fmt.int(g.iterations) }
    );
  }
  if (d) {
    rows.push(
      "---",
      { label: "Detail wirelength", value: fmt.um(d.wirelength, 1), tone: "accent" },
      { label: "Via cuts", value: fmt.int(d.vias) },
      { label: "Tracks used", value: fmt.pct(d.trackUse, 0) },
      { label: "Shorts", value: `${fmt.int(d.shorts)} (was ${fmt.int(d.initialShorts)})`, tone: d.shorts ? "bad" : "good" },
      { label: "Wire cap extracted", value: `${d.extractedCap.toFixed(1)} fF (est. ${d.estimatedCap.toFixed(1)})` }
    );
  }
  if (t) {
    rows.push(
      "---",
      { label: "Clock period", value: fmt.ps(t.period) },
      { label: "Worst setup slack", value: fmt.ps(t.wns), tone: t.wns < 0 ? "bad" : "good" },
      { label: "Total negative slack", value: fmt.ps(t.tns), tone: t.tns < 0 ? "bad" : "good" },
      { label: "Failing endpoints", value: `${fmt.int(t.violations)} / ${fmt.int(t.endpoints)}` },
      { label: "Worst hold slack", value: t.whs == null ? "—" : fmt.ps(t.whs), tone: t.whs != null && t.whs < 0 ? "bad" : undefined },
      { label: "Critical endpoint", value: t.critEndpoint },
      { label: "Fmax estimate", value: t.fmax ? `${t.fmax.toFixed(0)} MHz` : "—", tone: "accent" }
    );
  }

  if (!rows.length) rows.push({ label: "No results yet", value: "—" });
  metricsPanel.set(rows);
}

/* ------------------------------------------------------------------ */
/* source management                                                   */
/* ------------------------------------------------------------------ */

function applySource(source, { origin, savedId = null, savedName = null, autoRun = true } = {}) {
  state.source = source;
  state.origin = origin;
  state.savedId = savedId;
  state.savedName = savedName;

  syncConstraintInputs(source.constraints);
  el("netlist-text").value = toNetlistText(source);
  el("parse-errors").hidden = true;
  updateSourceLabel();

  log.clear();
  log.banner(`loaded ${source.name}`);
  worker.postMessage({ t: "load", source });
  if (autoRun) runFlow();
}

function updateSourceLabel() {
  const bits = [];
  if (state.origin === "preset") bits.push(`preset: ${state.presetId}`);
  else if (state.origin === "custom") bits.push("custom netlist");
  else if (state.origin === "saved") bits.push(`saved: ${state.savedName}`);
  bits.push(`seed: ${state.source.name}`);
  el("design-source").textContent = bits.join("  ·  ");
}

function currentConstraints() {
  return {
    utilization: Number(el("util").value) / 100,
    aspectRatio: Number(el("aspect").value) / 100,
    clockPeriod: Number(el("period").value),
    routeSupply: Number(el("supply").value) / 100,
  };
}

function syncConstraintInputs(c) {
  el("util").value = Math.round((c.utilization ?? 0.7) * 100);
  el("aspect").value = Math.round((c.aspectRatio ?? 1) * 100);
  el("period").value = c.clockPeriod ?? 2000;
  el("supply").value = Math.round((c.routeSupply ?? 0.5) * 100);
  showConstraintValues();
}

function showConstraintValues() {
  el("util-out").textContent = `${el("util").value}%`;
  el("aspect-out").textContent = (Number(el("aspect").value) / 100).toFixed(2);
  const ps = Number(el("period").value);
  el("period-out").textContent = `${ps} ps · ${(1e6 / ps).toFixed(0)} MHz`;
  el("supply-out").textContent = `${el("supply").value}%`;
}

/** Turn a layer on or off from code, keeping its chip in step. */
function setLayer(key, on) {
  view.toggle(key, on);
  const chip = document.querySelector(`[data-toggle="${key}"]`);
  if (chip) chip.classList.toggle("chip-active", on);
}

function runFlow() {
  worker.postMessage({ t: "run", opts: {} });
}

function setRunning(on) {
  state.running = on;
  el("btn-run").disabled = on;
  el("btn-step").disabled = on;
  el("btn-apply-constraints").disabled = on;
  el("btn-cancel").disabled = !on;
  el("btn-pause").disabled = !on;
  if (!on) setPaused(false);
}

function setPaused(on) {
  state.paused = on;
  el("btn-pause").textContent = on ? "Resume" : "Pause";
  el("btn-pause").classList.toggle("app-btn-primary", on);
  // Stepping one iteration at a time only means anything while paused.
  el("btn-tick").disabled = !on;
  el("focus").classList.toggle("focus-paused", on);
}

/** Push the current dial position to the worker. Applies mid-run. */
function sendPace() {
  const step = SPEED_STEPS[state.speedIndex] || SPEED_STEPS[DEFAULT_SPEED];
  el("speed-out").textContent = step.label;
  worker.postMessage({ t: "pace", pace: { delay: step.delay, every: step.every } });
}

/* ------------------------------------------------------------------ */
/* controls                                                            */
/* ------------------------------------------------------------------ */

function initControls() {
  const presetSelect = el("preset");
  presetSelect.innerHTML = PRESETS.map(
    (p) => `<option value="${p.id}">${p.label} — ${p.cells} cells</option>`
  ).join("");

  el("cell-list").textContent = Object.keys(LIBRARY).join("  ");

  presetSelect.addEventListener("change", () => {
    state.presetId = presetSelect.value;
    const preset = PRESETS.find((p) => p.id === state.presetId);
    el("preset-blurb").textContent = preset ? preset.blurb : "";
    const source = buildPreset(state.presetId);
    source.constraints = { ...source.constraints, ...currentConstraints() };
    applySource(source, { origin: "preset" });
  });

  el("util").addEventListener("input", showConstraintValues);
  el("aspect").addEventListener("input", showConstraintValues);
  el("period").addEventListener("input", showConstraintValues);
  el("supply").addEventListener("input", showConstraintValues);

  el("btn-apply-constraints").addEventListener("click", () => {
    const c = currentConstraints();
    state.source.constraints = { ...state.source.constraints, ...c };
    spark.clear();
    worker.postMessage({ t: "rerun", opts: { constraints: c } });
  });

  el("btn-run").addEventListener("click", runFlow);
  el("btn-step").addEventListener("click", () => {
    worker.postMessage({ t: "step", opts: {} });
  });
  el("btn-cancel").addEventListener("click", () => worker.postMessage({ t: "cancel" }));
  el("btn-reset").addEventListener("click", () => {
    spark.clear();
    log.clear();
    worker.postMessage({ t: "reset" });
    worker.postMessage({ t: "load", source: state.source });
  });

  el("btn-pause").addEventListener("click", () => {
    worker.postMessage({ t: state.paused ? "resume" : "pause" });
  });
  el("btn-tick").addEventListener("click", () => worker.postMessage({ t: "tick" }));

  el("speed").addEventListener("input", () => {
    state.speedIndex = Number(el("speed").value);
    sendPace();
  });

  el("btn-clear-log").addEventListener("click", () => log.clear());

  /* view controls */
  document.querySelectorAll("[data-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.toggle;
      view.toggle(key);
      btn.classList.toggle("chip-active", view.isOn(key));
    });
  });
  el("btn-fit").addEventListener("click", () => view.fit());
  el("btn-zoom-in").addEventListener("click", () => view.zoomBy(1.35));
  el("btn-zoom-out").addEventListener("click", () => view.zoomBy(1 / 1.35));

  el("layout").addEventListener("pointerdown", () => {
    el("view-hint").hidden = true;
  }, { once: true });

  /* netlist editor */
  el("btn-apply-netlist").addEventListener("click", () => {
    const { design, errors } = parseNetlist(el("netlist-text").value, "custom");
    const box = el("parse-errors");
    if (errors.length) {
      box.hidden = false;
      box.textContent = errors.slice(0, 20).join("\n");
      return;
    }
    if (!design.instances.length) {
      box.hidden = false;
      box.textContent = "netlist has no cells";
      return;
    }
    box.hidden = true;
    design.constraints = { ...design.constraints, ...currentConstraints() };
    applySource(design, { origin: "custom" });
  });

  el("btn-revert-netlist").addEventListener("click", () => {
    el("netlist-text").value = toNetlistText(state.source);
    el("parse-errors").hidden = true;
  });

  /* sharing and saving */
  el("btn-share").addEventListener("click", async () => {
    const url = storage.shareURL(shareState());
    try {
      await navigator.clipboard.writeText(url);
      toast("share link copied to the clipboard");
    } catch {
      window.location.hash = `d=${storage.encodeShare(shareState())}`;
      toast("share link is in the address bar");
    }
  });

  el("btn-save").addEventListener("click", saveCurrent);

  el("speed").value = String(state.speedIndex);
  sendPace();
  setPaused(false);
  focus.reset();
}

/** What a share link carries: the source, not the placement. */
function shareState() {
  const c = currentConstraints();
  return state.origin === "preset"
    ? { p: state.presetId, c }
    : { t: toNetlistText(state.source), n: state.source.name, c };
}

/* ------------------------------------------------------------------ */
/* saved designs                                                       */
/* ------------------------------------------------------------------ */

async function refreshSaved() {
  const backend = storage.store(state.signedIn);
  const root = el("saved-list");
  let list = [];
  try {
    list = await backend.list();
  } catch (err) {
    root.innerHTML = `<p class="saved-empty">could not load: ${escapeHTML(err.message)}</p>`;
    return;
  }

  if (!list.length) {
    root.innerHTML = '<p class="saved-empty">Nothing saved yet.</p>';
    return;
  }

  root.innerHTML = list
    .map(
      (d) => `<div class="saved-row">
        <span class="saved-name" title="${escapeHTML(d.name)}">${escapeHTML(d.name)}</span>
        <button type="button" data-load="${escapeHTML(d.id)}">open</button>
        <button type="button" class="saved-del" data-del="${escapeHTML(d.id)}">delete</button>
      </div>`
    )
    .join("");

  root.querySelectorAll("[data-load]").forEach((b) =>
    b.addEventListener("click", () => openSaved(b.dataset.load))
  );
  root.querySelectorAll("[data-del]").forEach((b) =>
    b.addEventListener("click", () => deleteSaved(b.dataset.del))
  );
}

async function openSaved(id) {
  const backend = storage.store(state.signedIn);
  try {
    const record = await backend.load(id);
    const source = record && record.payload ? record.payload.source : null;
    if (!source || !source.instances) throw new Error("saved design is unreadable");
    applySource(source, { origin: "saved", savedId: id, savedName: record.name });
  } catch (err) {
    toast(err.message, true);
  }
}

async function deleteSaved(id) {
  const backend = storage.store(state.signedIn);
  try {
    await backend.remove(id);
    await refreshSaved();
    toast("deleted");
  } catch (err) {
    toast(err.message, true);
  }
}

async function saveCurrent() {
  const suggestion = state.savedName || state.source.name;
  const name = await askName("Save design", suggestion);
  if (!name) return;

  const backend = storage.store(state.signedIn);
  const payload = { source: { ...state.source, constraints: { ...state.source.constraints, ...currentConstraints() } } };
  try {
    const rec = await backend.create(name, payload);
    state.savedId = rec && rec.id ? rec.id : null;
    state.savedName = name;
    await refreshSaved();
    toast(state.signedIn ? "saved to your account" : "saved in this browser");
  } catch (err) {
    toast(err.message, true);
  }
}

/* ------------------------------------------------------------------ */
/* small UI helpers                                                    */
/* ------------------------------------------------------------------ */

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

let toastTimer = null;
function toast(message, isError = false) {
  const node = el("toast");
  node.textContent = message;
  node.classList.toggle("app-toast-error", isError);
  node.classList.add("app-toast-show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove("app-toast-show"), isError ? 5000 : 2600);
}

/** A one-field modal, using the shared modal styling. */
function askName(title, value) {
  return new Promise((resolve) => {
    const root = el("modal-root");
    const backdrop = document.createElement("div");
    backdrop.className = "app-modal-backdrop";
    backdrop.innerHTML = `
      <div class="app-modal" role="dialog" aria-modal="true">
        <h2>${escapeHTML(title)}</h2>
        <form id="name-form">
          <div class="app-field">
            <label class="app-label" for="name-input">Name</label>
            <input class="app-input" id="name-input" type="text" value="${escapeHTML(value)}" maxlength="120" />
          </div>
          <div class="app-modal-actions">
            <button type="button" class="app-btn app-btn-ghost" data-act="cancel">Cancel</button>
            <button type="submit" class="app-btn app-btn-primary">Save</button>
          </div>
        </form>
      </div>`;

    const close = (result) => {
      document.removeEventListener("keydown", onKey);
      backdrop.remove();
      resolve(result);
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close(null);
      }
    };

    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) close(null);
    });
    backdrop.querySelector('[data-act="cancel"]').addEventListener("click", () => close(null));
    backdrop.querySelector("#name-form").addEventListener("submit", (e) => {
      e.preventDefault();
      close(el("name-input").value.trim() || null);
    });

    document.addEventListener("keydown", onKey);
    root.appendChild(backdrop);
    const input = el("name-input");
    input.focus();
    input.select();
  });
}

/* ------------------------------------------------------------------ */
/* boot                                                               */
/* ------------------------------------------------------------------ */

function initialSource() {
  const shared = storage.decodeShare(window.location.hash);
  if (shared) {
    if (shared.t) {
      const { design, errors } = parseNetlist(shared.t, shared.n || "shared");
      if (!errors.length && design.instances.length) {
        design.constraints = { ...design.constraints, ...(shared.c || {}) };
        return { source: design, origin: "custom" };
      }
    }
    if (shared.p) {
      const source = buildPreset(shared.p);
      state.presetId = shared.p;
      source.constraints = { ...source.constraints, ...(shared.c || {}) };
      return { source, origin: "preset" };
    }
  }

  const remembered = storage.recallSession();
  if (remembered && remembered.p && PRESETS.some((p) => p.id === remembered.p)) {
    state.presetId = remembered.p;
    const source = buildPreset(remembered.p);
    source.constraints = { ...source.constraints, ...(remembered.c || {}) };
    return { source, origin: "preset" };
  }

  return { source: buildPreset(DEFAULT_PRESET), origin: "preset" };
}

async function boot() {
  initControls();

  const { source, origin } = initialSource();
  el("preset").value = state.presetId;
  const preset = PRESETS.find((p) => p.id === state.presetId);
  el("preset-blurb").textContent = preset ? preset.blurb : "";

  applySource(source, { origin, autoRun: true });
  log.add("info", PLANNED_NOTE);

  const account = await storage.probeAccount();
  state.signedIn = account.signedIn;
  el("account").textContent = account.signedIn ? account.email || "signed in" : "";
  el("save-note").textContent = account.signedIn
    ? "Saved designs are on your account and follow you between devices."
    : "Designs are saved in this browser. Sign in to keep them on your account, or use the share link.";
  await refreshSaved();

  window.addEventListener("beforeunload", () => {
    if (state.origin === "preset") {
      storage.rememberSession({ p: state.presetId, c: currentConstraints() });
    }
  });
}

boot();
