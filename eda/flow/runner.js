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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * How fast the animation runs. `delay` is milliseconds of pause after a frame
 * and `every` is how many solver iterations pass between frames — the two ends
 * of the same dial. Slow viewing wants delay with every=1 so no iteration is
 * skipped; raw throughput wants delay=0 and a larger every, because the cost
 * at that point is the frame itself, not the wait.
 *
 * Mutable and read inside the stage loops rather than captured when the stage
 * starts, so dragging the speed slider mid-run takes effect on the next frame.
 * That matters: the reason to slow the placer down is usually that something
 * interesting is happening right now.
 */
const pace = { delay: 0, every: 2 };

/**
 * Pause, resume, and advance-one-frame, layered on top of the delay.
 *
 * The stage loops already await between frames so that a `cancel` message can
 * land; holding that await open is all pausing requires. A single waiter exists
 * at a time — one stage runs at a time — so one resolver slot is enough.
 */
function createPacer() {
  let paused = false;
  let credits = 0; // frames granted while paused, by the step-one button
  let wake = null;

  const nudge = () => {
    if (wake) {
      const w = wake;
      wake = null;
      w();
    }
  };

  return {
    isPaused: () => paused,
    setPaused(on) {
      paused = on;
      if (!on) nudge();
    },
    /** Let exactly one more frame through without leaving the paused state. */
    grant() {
      credits += 1;
      nudge();
    },
    /** Wake any waiter and drop the paused state — for cancel and reset. */
    release() {
      paused = false;
      credits = 0;
      nudge();
    },
    async wait(delay) {
      if (delay > 0) await sleep(delay);
      while (paused) {
        if (credits > 0) {
          credits -= 1;
          return;
        }
        await new Promise((resolve) => {
          wake = resolve;
        });
      }
    },
  };
}

export function createRunner(emit) {
  let source = null;
  let design = null;
  let done = -1; // index into STAGES of the last completed stage
  let running = false;
  let cancelled = false;
  const pacer = createPacer();

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

  async function stagePlace() {
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
      // Paused counts as "show me every iteration": skipping frames while
      // someone is stepping through by hand would hide the ones they asked for.
      if (pacer.isPaused() || seen % pace.every === 0) {
        frame("place", v.iter, {
          hpwl: v.hpwl,
          overflow: v.overflow,
          peak: v.peak,
          targetOverflow: v.targetOverflow,
        });
        // Yielding to the event loop is what lets a Cancel message land
        // mid-run; without it the worker is deaf until the stage finishes.
        await pacer.wait(pace.delay);
      }
      if (cancelled) break;
    }

    frame("place", result ? result.metrics.iterations : seen, result ? result.metrics : {});
    return result || { metrics: {}, logs: ["cancelled"] };
  }

  async function stageLegalize() {
    const gen = legalize(design, {});
    let result = null;

    for (;;) {
      const step = gen.next();
      if (step.done) {
        result = step.value;
        break;
      }
      emit({ t: "progress", stage: "legalize", ...step.value });
      // Legalisation reports per row, not per iteration, so there are far
      // fewer steps than placement has — pacing it at the full delay would
      // make it crawl. A fraction of it reads as deliberate without dragging.
      await pacer.wait(pace.delay ? Math.min(24, pace.delay) : 0);
      if (cancelled) break;
    }

    frame("legalize", 0, result ? result.metrics : {});
    return result || { metrics: {}, logs: ["cancelled"] };
  }

  async function runStage(index) {
    const stage = STAGES[index];
    emit({ t: "stage", id: stage.id, status: "running" });

    try {
      let res;
      if (stage.id === "netlist") res = stageNetlist();
      else if (stage.id === "floorplan") res = stageFloorplan();
      else if (stage.id === "place") res = await stagePlace();
      else if (stage.id === "legalize") res = await stageLegalize();
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

    /** Change the animation pacing. Safe to call mid-run; that is the point. */
    setPace(next = {}) {
      if (Number.isFinite(next.delay)) pace.delay = Math.max(0, next.delay);
      if (Number.isFinite(next.every)) pace.every = Math.max(1, Math.round(next.every));
    },

    setPaused(on) {
      pacer.setPaused(Boolean(on));
      emit({ t: "paused", on: pacer.isPaused() });
    },

    /** Advance one frame while paused. No effect otherwise. */
    tick() {
      if (pacer.isPaused()) pacer.grant();
    },

    /** Run every remaining stage, or up to and including `upto`. */
    async run({ upto = null } = {}) {
      if (running) return;
      running = true;
      cancelled = false;
      // A run left paused from last time would look like a dead Run button.
      pacer.release();
      emit({ t: "paused", on: false });
      const limit = upto ? STAGES.findIndex((s) => s.id === upto) : STAGES.length - 1;

      for (let i = done + 1; i <= limit; i++) {
        if (cancelled) break;
        const ok = await runStage(i);
        if (!ok) break;
      }

      running = false;
      emit({ t: "idle", done, cancelled });
    },

    /** Run exactly one more stage. */
    async step() {
      if (running || done >= STAGES.length - 1) return;
      running = true;
      cancelled = false;
      pacer.release();
      emit({ t: "paused", on: false });
      await runStage(done + 1);
      running = false;
      emit({ t: "idle", done, cancelled });
    },

    cancel() {
      if (running) cancelled = true;
      // Cancelling a paused run has to wake the loop, or it never sees the flag.
      pacer.release();
      emit({ t: "paused", on: false });
    },

    /** Recompile from source, throwing away all placement. */
    reset() {
      cancelled = true;
      pacer.release();
      emit({ t: "paused", on: false });
      design = null;
      done = -1;
      emit({ t: "reset", stages: STAGES.map((s) => s.id) });
    },

    /** Re-run the flow after a constraint change, keeping the same netlist. */
    async rerun({ constraints = null } = {}) {
      if (constraints) source = { ...source, constraints: { ...source.constraints, ...constraints } };
      cancelled = true;
      pacer.release();
      design = null;
      done = -1;
      emit({ t: "reset", stages: STAGES.map((s) => s.id) });
      await this.run({});
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
