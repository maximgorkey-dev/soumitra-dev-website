/**
 * Flow orchestration.
 *
 * Owns the compiled design and walks it through the stages, one at a time, in
 * order. Runs inside a Web Worker: placement is a tight numerical loop and on
 * the UI thread it would freeze the page for the duration, which for an app
 * whose whole point is watching the placement move would be self-defeating.
 *
 * Cell positions go back to the UI as a transferred Float32Array rather than
 * as objects. At sixty frames a second, structured-cloning a few hundred
 * little {x, y} records is the difference between smooth and visibly stuttery.
 */

import { compile } from "../core/netlist.js";
import { densityMap, densityCeiling, checkLegality } from "../core/metrics.js";
import { floorplan } from "./floorplan.js";
import { globalPlace } from "./globalplace.js";
import { legalize } from "./legalize.js";
import { STAGES } from "./stages.js";

export { STAGES };

const SPEEDS = {
  instant: { every: 12, delay: 0 },
  fast: { every: 2, delay: 0 },
  watch: { every: 1, delay: 45 },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function createRunner(emit) {
  let source = null;
  let design = null;
  let done = -1; // index into STAGES of the last completed stage
  let running = false;
  let cancelled = false;

  const log = (text, level = "info") => emit({ t: "log", level, text });

  function positions() {
    const buf = new Float32Array(design.cells.length * 2);
    for (let i = 0; i < design.cells.length; i++) {
      buf[2 * i] = design.cells[i].x;
      buf[2 * i + 1] = design.cells[i].y;
    }
    return buf;
  }

  function densityFrame() {
    if (!design.floorplan) return null;
    const binsY = Math.min(40, Math.max(3, Math.round(design.floorplan.core.h / (4 * 1600))));
    const binsX = Math.min(
      40,
      Math.max(3, Math.round(design.floorplan.core.w / (design.floorplan.core.h / binsY)))
    );
    const dm = densityMap(design, binsX, binsY, densityCeiling(design));
    return dm ? { binsX, binsY, values: Float32Array.from(dm.density) } : null;
  }

  /** One frame of animation: positions, and the density field behind them. */
  function frame(stage, iter, metrics) {
    const pos = positions();
    const dens = densityFrame();
    const transfer = [pos.buffer];
    if (dens) transfer.push(dens.values.buffer);
    emit({ t: "frame", stage, iter, metrics, pos, density: dens }, transfer);
  }

  /* ---------------- individual stages ---------------- */

  function stageNetlist() {
    design = compile(source);

    const errors = design.warnings.filter((w) => w.level === "error");
    const warns = design.warnings.filter((w) => w.level === "warn");
    for (const w of design.warnings.slice(0, 40)) log(w.text, w.level);
    if (design.warnings.length > 40) {
      log(`... and ${design.warnings.length - 40} more`, "warn");
    }
    if (!design.cells.length) throw new Error("netlist has no cells");

    // The compiled database is sent once. Everything after this is deltas.
    emit({ t: "design", design: serialize(design) });

    const s = design.stats;
    return {
      metrics: { ...s, errors: errors.length, warnings: warns.length },
      logs: [
        `${s.cells} cells (${s.sequential} sequential), ${s.nets} nets, ${s.ports} ports`,
        `${s.pins} pins, average fanout ${s.avgFanout.toFixed(2)}, max fanout ${s.maxFanout}`,
      ],
    };
  }

  function stageFloorplan() {
    const res = floorplan(design);
    emit({
      t: "floorplan",
      floorplan: design.floorplan,
      ports: design.ports.map((p) => ({ index: p.index, x: p.x, y: p.y, edge: p.edge })),
    });
    frame("floorplan", 0, res.metrics);
    return res;
  }

  async function stagePlace(speed) {
    const { every, delay } = SPEEDS[speed] || SPEEDS.fast;
    const gen = globalPlace(design, {});
    let seen = 0;
    let result = null;

    for (;;) {
      const step = gen.next();
      if (step.done) {
        result = step.value;
        break;
      }
      seen += 1;
      const v = step.value;
      if (seen % every === 0) {
        frame("place", v.iter, { hpwl: v.hpwl, overflow: v.overflow, peak: v.peak });
        // Yielding to the event loop is what lets a Cancel message land
        // mid-run; without it the worker is deaf until the stage finishes.
        await sleep(delay);
      }
      if (cancelled) break;
    }

    frame("place", result ? result.metrics.iterations : seen, result ? result.metrics : {});
    return result || { metrics: {}, logs: ["cancelled"] };
  }

  async function stageLegalize(speed) {
    const { delay } = SPEEDS[speed] || SPEEDS.fast;
    const gen = legalize(design, {});
    let result = null;

    for (;;) {
      const step = gen.next();
      if (step.done) {
        result = step.value;
        break;
      }
      emit({ t: "progress", stage: "legalize", ...step.value });
      await sleep(delay ? 12 : 0);
      if (cancelled) break;
    }

    frame("legalize", 0, result ? result.metrics : {});
    return result || { metrics: {}, logs: ["cancelled"] };
  }

  async function runStage(index, speed) {
    const stage = STAGES[index];
    emit({ t: "stage", id: stage.id, status: "running" });

    try {
      let res;
      if (stage.id === "netlist") res = stageNetlist();
      else if (stage.id === "floorplan") res = stageFloorplan();
      else if (stage.id === "place") res = await stagePlace(speed);
      else if (stage.id === "legalize") res = await stageLegalize(speed);
      else throw new Error(`no implementation for stage ${stage.id}`);

      for (const line of res.logs || []) log(line);
      done = index;
      emit({ t: "stage", id: stage.id, status: "done", metrics: res.metrics || {}, extra: res.history });
      return true;
    } catch (err) {
      emit({ t: "stage", id: stage.id, status: "error", message: String(err.message || err) });
      log(String(err.message || err), "error");
      return false;
    }
  }

  /* ---------------- public surface ---------------- */

  return {
    load(nextSource) {
      source = nextSource;
      design = null;
      done = -1;
      emit({ t: "reset", stages: STAGES.map((s) => s.id) });
    },

    /** Run every remaining stage, or up to and including `upto`. */
    async run({ speed = "fast", upto = null } = {}) {
      if (running) return;
      running = true;
      cancelled = false;
      const limit = upto ? STAGES.findIndex((s) => s.id === upto) : STAGES.length - 1;

      for (let i = done + 1; i <= limit; i++) {
        if (cancelled) break;
        const ok = await runStage(i, speed);
        if (!ok) break;
      }

      running = false;
      emit({ t: "idle", done, cancelled });
    },

    /** Run exactly one more stage. */
    async step({ speed = "watch" } = {}) {
      if (running || done >= STAGES.length - 1) return;
      running = true;
      cancelled = false;
      await runStage(done + 1, speed);
      running = false;
      emit({ t: "idle", done, cancelled });
    },

    cancel() {
      if (running) cancelled = true;
    },

    /** Recompile from source, throwing away all placement. */
    reset() {
      cancelled = true;
      design = null;
      done = -1;
      emit({ t: "reset", stages: STAGES.map((s) => s.id) });
    },

    /** Re-run the flow after a constraint change, keeping the same netlist. */
    async rerun({ speed = "fast", constraints = null } = {}) {
      if (constraints) source = { ...source, constraints: { ...source.constraints, ...constraints } };
      cancelled = true;
      design = null;
      done = -1;
      emit({ t: "reset", stages: STAGES.map((s) => s.id) });
      await this.run({ speed });
    },

    legality() {
      return design && design.floorplan ? checkLegality(design) : null;
    },
  };
}

/**
 * Strip the compiled design down to what the UI needs. Shape is preserved so
 * that the renderer and the metric helpers can operate on it unchanged.
 */
function serialize(design) {
  return {
    name: design.name,
    constraints: design.constraints,
    stats: design.stats,
    warnings: design.warnings,
    cells: design.cells.map((c) => ({
      index: c.index,
      name: c.name,
      type: c.type,
      width: c.width,
      height: c.height,
      kind: c.kind,
      fixed: c.fixed,
      x: c.x,
      y: c.y,
      orient: c.orient,
    })),
    ports: design.ports.map((p) => ({
      index: p.index,
      name: p.name,
      dir: p.dir,
      x: p.x,
      y: p.y,
    })),
    nets: design.nets.map((n) => ({
      index: n.index,
      name: n.name,
      isClock: n.isClock,
      terminals: n.terminals,
    })),
  };
}
