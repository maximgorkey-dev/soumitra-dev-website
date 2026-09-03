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
import { STAGES, PLANNED } from "./flow/stages.js";
import { createView } from "./ui/view.js";
import {
  createStageBar,
  createMetrics,
  createLog,
  createSparkline,
  createExplainer,
  PLANNED_NOTE,
  fmt,
} from "./ui/panels.js";
import * as storage from "./ui/storage.js";

const el = (id) => document.getElementById(id);

const state = {
  source: null,
  presetId: DEFAULT_PRESET,
  origin: "preset", // preset | custom | saved
  savedId: null,
  savedName: null,
  signedIn: false,
  speed: "fast",
  running: false,
  stageMetrics: {},
  live: null,
  floorplan: null,
};

/* ------------------------------------------------------------------ */
/* pieces                                                              */
/* ------------------------------------------------------------------ */

const log = createLog(el("log"));
const metricsPanel = createMetrics(el("metrics"));
const spark = createSparkline(el("spark"));
const explainer = createExplainer(el("explain"));

const stageBar = createStageBar(el("stage-bar"), {
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
      state.stageMetrics = {};
      state.live = null;
      state.floorplan = null;
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
        spark.push({ hpwl: msg.metrics.hpwl, overflow: msg.metrics.overflow });
        renderMetrics();
      }
      break;

    case "progress":
      if (msg.stage === "legalize") {
        stageBar.setMetric("legalize", `${msg.placed} / ${msg.total} cells`);
      }
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
  renderMetrics();
}

const labelOf = (id) => (STAGES.find((s) => s.id === id) || { label: id }).label;

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
  };
}

function syncConstraintInputs(c) {
  el("util").value = Math.round((c.utilization ?? 0.7) * 100);
  el("aspect").value = Math.round((c.aspectRatio ?? 1) * 100);
  showConstraintValues();
}

function showConstraintValues() {
  el("util-out").textContent = `${el("util").value}%`;
  el("aspect-out").textContent = (Number(el("aspect").value) / 100).toFixed(2);
}

function runFlow() {
  worker.postMessage({ t: "run", opts: { speed: state.speed } });
}

function setRunning(on) {
  state.running = on;
  el("btn-run").disabled = on;
  el("btn-step").disabled = on;
  el("btn-apply-constraints").disabled = on;
  el("btn-cancel").disabled = !on;
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

  el("btn-apply-constraints").addEventListener("click", () => {
    const c = currentConstraints();
    state.source.constraints = { ...state.source.constraints, ...c };
    spark.clear();
    worker.postMessage({ t: "rerun", opts: { speed: state.speed, constraints: c } });
  });

  el("btn-run").addEventListener("click", runFlow);
  el("btn-step").addEventListener("click", () => {
    worker.postMessage({ t: "step", opts: { speed: "watch" } });
  });
  el("btn-cancel").addEventListener("click", () => worker.postMessage({ t: "cancel" }));
  el("btn-reset").addEventListener("click", () => {
    spark.clear();
    log.clear();
    worker.postMessage({ t: "reset" });
    worker.postMessage({ t: "load", source: state.source });
  });

  el("speed").addEventListener("change", () => {
    state.speed = el("speed").value;
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
