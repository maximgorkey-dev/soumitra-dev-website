/**
 * Global placement.
 *
 * This is an analytic placer, the family every modern tool belongs to. Two
 * forces act on each cell and the stage is the story of their tug of war:
 *
 *   Wirelength  Nets are modelled as springs and the resulting quadratic
 *               system is solved for the positions that minimise total spring
 *               energy. Left alone this collapses the whole design into a
 *               point, because zero wirelength is the optimum.
 *
 *   Density     A field computed from how much cell area sits in each bin of
 *               the core. Cells slide down its gradient, out of crowded
 *               regions into empty ones. Left alone this spreads the design
 *               uniformly and ignores connectivity entirely.
 *
 * The wirelength model is bound-to-bound: within each net every pin is sprung
 * to the two pins at the extremes of the net's bounding box, with a weight
 * inversely proportional to the distance between them. That weighting is what
 * makes the quadratic objective approximate half-perimeter wirelength rather
 * than merely penalising spread, and it has to be recomputed as cells move,
 * which is why weights are rebuilt on every sweep.
 *
 * How the two forces are combined matters more than any tuning constant.
 * Moving cells down the density gradient *after* solving for wirelength does
 * not work: the solve jumps straight to the quadratic optimum, so the next one
 * simply undoes the nudge, and the two settle into an equilibrium with the
 * design still piled up — no step size or iteration count escapes it.
 *
 * Instead the density term enters the system being solved, as a per-cell
 * spreading force added to the right-hand side. Because a cell's own row of
 * the system reads
 *
 *     x_i = ( sum(w * (p - o)) + f_i ) / sum(w)
 *
 * setting f_i to (total spring weight) x (desired displacement) shifts that
 * cell's solved position by exactly the displacement asked for, while leaving
 * it free to optimise wirelength around the shifted point. This is the classic
 * force-directed formulation.
 *
 * Forces accumulate across iterations in small increments, and the increment
 * has to stay small — under about a bin. Scaling it up to spread faster puts
 * the requested displacement outside the core, every cell clamps to the
 * boundary, and the design piles up along the edges instead of spreading.
 *
 * Accumulation is what allows a large total force to be reached from small
 * increments, and it is stable because the gradient reverses sign once a
 * region becomes under-full: a cell pushed too far stops being pushed and is
 * pulled back. That feedback, not any step limit, is what bounds the result.
 *
 * One other detail: the bin grid must be fine relative to the design. With a
 * coarse grid the whole design starts inside a single bin, and the central
 * difference used for the gradient is zero exactly where crowding is worst.
 * Bins are sized to roughly one standard-cell row.
 *
 * The result is a placement with good wirelength and roughly even density, but
 * with cells at arbitrary coordinates and still overlapping. Legalisation is a
 * separate stage for exactly that reason.
 */

import { TECH } from "../core/tech.js";
import { hpwl, densityMap, terminalPos, densityCeiling } from "../core/metrics.js";

// Distances below this are treated as equal. Sub-site separations carry no
// real information and would otherwise produce enormous spring weights.
const EPS = TECH.siteWidth;

export const PLACE_DEFAULTS = {
  iterations: 140,
  // Wirelength solves between spreading steps. Bound-to-bound weights are
  // rebuilt on each one, so extra sweeps buy a better-converged solve against
  // the current forces; three is where wirelength stops improving.
  sweeps: 3,
  smoothPasses: 2,
  // Fraction of a bin a cell is pushed per spreading step. Small, because
  // forces accumulate: the effective push is many steps deep.
  stepScale: 0.25,
  // Accumulated force fades each iteration, which sheds the very large forces
  // generated while the design is still a pile and would otherwise keep
  // shoving cells around long after it has spread. The cost is a ceiling: at
  // equilibrium a cell cannot hold more force than one increment / (1 - decay),
  // so too much decay leaves a large design unable to spread at all.
  forceDecay: 0.96,
  // Spreading strength ramps from this to 1.0 over `alphaRamp` of the run, so
  // the first solves can pull cells towards their fixed IO before the density
  // term starts fighting back.
  alphaStart: 0.4,
  alphaRamp: 0.25,
  // Bin density to stay under. See `densityCeiling` in metrics.
  densityCeiling: undefined,
  targetOverflow: 0.06,
  minIterations: 12,
  // Not every design can reach the target. Bins hold only a handful of cells,
  // and cell widths vary six-fold between an inverter and a flop, so there is
  // a granularity floor on how evenly area can be distributed. Rather than
  // grind on to the iteration cap, stop once a whole window of iterations has
  // failed to improve the best overflow by `windowGain`. The test is windowed
  // rather than a count of consecutive failures to improve, because overflow
  // moves in fits and starts: a placement can sit flat for ten iterations and
  // then drop sharply as a cluster finally breaks apart.
  window: 30,
  windowGain: 0.01,
  // Meeting the density target is necessary to stop but not sufficient. Each
  // iteration also re-linearises the net model and re-solves, so wirelength is
  // still improving when spreading finishes — stopping the moment overflow
  // crosses the target throws that away and can cost 20% wirelength. Carry on
  // until wirelength has also gone `wlWindow` iterations without improving by
  // `wlGain`.
  wlWindow: 8,
  wlGain: 0.005,
};

/**
 * Has wirelength gone flat?
 *
 * Compares the latest wirelength against the value `wlWindow` iterations back
 * and asks whether it has moved, in either direction. Rising counts as not
 * settled, not as settled: wirelength climbs steadily through the spreading
 * phase as cells leave the pile they started in, so treating "not improving"
 * as "finished" ends the stage almost immediately, while the placement is
 * still mid-flight.
 */
function wlSettled(history, opts) {
  if (history.length <= opts.wlWindow) return false;
  const prev = history[history.length - 1 - opts.wlWindow].hpwl;
  const now = history[history.length - 1].hpwl;
  if (prev <= 0) return true;
  return Math.abs(prev - now) / prev < opts.wlGain;
}

/**
 * Grid used to build the density field the cells slide down. Fine — about one
 * standard-cell row tall — because the gradient needs spatial resolution to
 * point anywhere useful.
 */
function gradientGrid(core, rows, opts) {
  const binsY = clampInt(opts.binsY ?? Math.max(8, Math.min(32, rows)), 3, 64);
  const binsX = clampInt(opts.binsX ?? Math.round(core.w / (core.h / binsY)), 3, 64);
  return { binsX, binsY };
}

/**
 * Grid used to *report* overflow, which is a different question and needs a
 * different answer.
 *
 * Overflow asks how much cell area sits above target density. On the gradient
 * grid that question is meaningless for a small design: a bin one row tall
 * holds less area at target density than a single average cell occupies, so
 * every bin containing anything at all counts as over-full and overflow can
 * never approach zero however well the placer does. Sizing report bins to hold
 * roughly four cells at target density makes the number mean what it says.
 */
function reportGrid(core, cellCount) {
  const total = Math.max(9, Math.round(cellCount / 4));
  const ratio = core.w / core.h;
  const binsY = clampInt(Math.round(Math.sqrt(total / ratio)), 3, 24);
  const binsX = clampInt(Math.round(total / binsY), 3, 24);
  return { binsX, binsY };
}

export function* globalPlace(design, options = {}) {
  const opts = { ...PLACE_DEFAULTS, ...options };
  const { core, rows } = design.floorplan;
  const { binsX, binsY } = gradientGrid(core, rows.length, opts);
  const report = reportGrid(core, design.cells.length);
  const target = densityCeiling(design, opts.densityCeiling);

  const n = design.cells.length;
  const num = new Float64Array(n);
  const den = new Float64Array(n);
  // Spreading force per cell, and the spring stiffness each force is measured
  // against, kept per dimension because bound-to-bound weights depend on
  // distances within that dimension.
  const forceX = new Float64Array(n);
  const forceY = new Float64Array(n);
  const stiffX = new Float64Array(n);
  const stiffY = new Float64Array(n);
  const history = [];

  const cfg = { binsX, binsY, smoothPasses: opts.smoothPasses, stepScale: opts.stepScale };
  let last = null;
  let best = Infinity;
  let windowBest = Infinity;
  let windowEnd = opts.minIterations + opts.window;
  let stop = "iteration cap";

  for (let iter = 1; iter <= opts.iterations; iter++) {
    const alpha = Math.min(
      1,
      opts.alphaStart + ((1 - opts.alphaStart) * iter) / Math.max(1, opts.alphaRamp * opts.iterations)
    );

    if (opts.forceDecay !== 1) {
      for (let i = 0; i < n; i++) {
        forceX[i] *= opts.forceDecay;
        forceY[i] *= opts.forceDecay;
      }
    }

    for (let s = 0; s < opts.sweeps; s++) {
      solveDimension(design, num, den, "x", forceX);
      stiffX.set(den);
      solveDimension(design, num, den, "y", forceY);
      stiffY.set(den);
    }

    addSpreadingForce(design, cfg, target, alpha, forceX, forceY, stiffX, stiffY);

    const wl = hpwl(design);
    const rm = densityMap(design, report.binsX, report.binsY, target);
    history.push({ iter, hpwl: wl, overflow: rm.overflow });
    // `targetOverflow` rides along on every yield, under the same name the final
    // metrics use, so the UI can show what overflow is being aimed at without
    // importing the placer to read its defaults.
    last = { iter, hpwl: wl, overflow: rm.overflow, peak: rm.peak, alpha, targetOverflow: opts.targetOverflow };
    yield last;

    best = Math.min(best, rm.overflow);

    if (iter < opts.minIterations) continue;

    // Overflow is the fraction of cell area sitting above the density ceiling.
    // Once it is small the placement is spread enough for legalisation to
    // succeed without large displacement.
    if (rm.overflow <= opts.targetOverflow && wlSettled(history, opts)) {
      stop = "target overflow reached, wirelength settled";
      break;
    }

    if (iter >= windowEnd) {
      if (best > windowBest - opts.windowGain) {
        stop = "overflow stopped improving";
        break;
      }
      windowBest = best;
      windowEnd = iter + opts.window;
    }
  }

  const final = densityMap(design, report.binsX, report.binsY, target);
  return {
    metrics: {
      hpwl: hpwl(design),
      overflow: final.overflow,
      targetOverflow: opts.targetOverflow,
      peakDensity: final.peak,
      iterations: last ? last.iter : 0,
      binsX,
      binsY,
      reportBinsX: report.binsX,
      reportBinsY: report.binsY,
      stopReason: stop,
    },
    history,
    logs: [
      `${last ? last.iter : 0} iterations of ${opts.sweeps} wirelength solves ` +
        `plus a spreading step, on a ${binsX}x${binsY} density grid`,
      `overflow ${(100 * final.overflow).toFixed(1)}% and peak density ` +
        `${final.peak.toFixed(2)} over ${report.binsX}x${report.binsY} report bins`,
      `stopped: ${stop}`,
    ],
  };
}

/**
 * One nonlinear Jacobi sweep in a single dimension.
 *
 * For a spring of weight w between a pin on movable cell i at offset o and a
 * pin elsewhere at absolute position p, the energy is w*(x_i + o - p)^2.
 * Setting the derivative of the total to zero gives
 *
 *     x_i = sum( w * (p - o) ) / sum( w )
 *
 * plus, in the numerator, the accumulated spreading force. Weights come from
 * the current positions, so this is re-linearised every sweep rather than
 * solved once.
 */
function solveDimension(design, num, den, dim, force) {
  num.fill(0);
  den.fill(0);

  const pos = [];
  const off = [];

  for (const net of design.nets) {
    const T = net.terminals;
    const k = T.length;
    if (k < 2) continue;

    pos.length = 0;
    off.length = 0;
    for (let i = 0; i < k; i++) {
      const p = terminalPos(design, T[i]);
      pos.push(dim === "x" ? p.x : p.y);
      off.push(dim === "x" ? T[i].dx : T[i].dy);
    }

    let lo = 0;
    let hi = 0;
    for (let i = 1; i < k; i++) {
      if (pos[i] < pos[lo]) lo = i;
      if (pos[i] > pos[hi]) hi = i;
    }

    // Total weight per net is normalised by (k-1) so that a high-fanout net
    // does not simply overwhelm every two-pin net around it.
    const base = 2 / (k - 1);

    const edge = (i, j) => {
      const w = base / Math.max(Math.abs(pos[i] - pos[j]), EPS);
      contribute(design, num, den, T[i], off[i], pos[j], w);
      contribute(design, num, den, T[j], off[j], pos[i], w);
    };

    if (lo !== hi) edge(lo, hi);
    for (let i = 0; i < k; i++) {
      if (i === lo || i === hi) continue;
      edge(i, lo);
      edge(i, hi);
    }
  }

  const { core } = design.floorplan;
  for (const c of design.cells) {
    if (c.fixed || den[c.index] === 0) continue;
    const v = (num[c.index] + force[c.index]) / den[c.index];
    if (dim === "x") c.x = clamp(v, core.x, core.x + core.w - c.width);
    else c.y = clamp(v, core.y, core.y + core.h - c.height);
  }
}

function contribute(design, num, den, term, offset, otherPos, w) {
  if (term.port) return; // IO is fixed; it anchors the system
  const cell = design.cells[term.index];
  if (cell.fixed) return;
  num[cell.index] += w * (otherPos - offset);
  den[cell.index] += w;
}

/**
 * Add one increment of spreading force, pushing cells down the density
 * gradient.
 *
 * The field is smoothed first: raw bin densities are noisy at this scale, and
 * a noisy field produces gradients that point in inconsistent directions from
 * one iteration to the next, which shows up as cells jittering in place.
 * Smoothing also widens the field, so a cell buried in the middle of a pile
 * still feels an outward push rather than sitting at a flat maximum.
 *
 * Each increment is scaled by the cell's own spring stiffness, which is what
 * makes it a displacement rather than an arbitrary number: a force of
 * stiffness x d moves that cell's solved position by d.
 */
function addSpreadingForce(design, cfg, target, alpha, forceX, forceY, stiffX, stiffY) {
  const { binsX, binsY } = cfg;
  const dm = densityMap(design, binsX, binsY, target);
  const field = smooth(dm.density, binsX, binsY, cfg.smoothPasses);
  const { core } = design.floorplan;

  const stepX = cfg.stepScale * dm.binW * alpha;
  const stepY = cfg.stepScale * dm.binH * alpha;
  const scale = Math.max(target, 0.1);
  const at = (i, j) =>
    field[clampInt(j, 0, binsY - 1) * binsX + clampInt(i, 0, binsX - 1)];

  for (const c of design.cells) {
    if (c.fixed) continue;
    const i = clampInt(Math.floor((c.x + c.width / 2 - core.x) / dm.binW), 0, binsX - 1);
    const j = clampInt(Math.floor((c.y + c.height / 2 - core.y) / dm.binH), 0, binsY - 1);

    // Central differences, normalised by the target density so a step is the
    // same size whether the design is packed at 40% or 85%.
    const gx = clamp((at(i + 1, j) - at(i - 1, j)) / (2 * scale), -1, 1);
    const gy = clamp((at(i, j + 1) - at(i, j - 1)) / (2 * scale), -1, 1);

    const dx = -stepX * gx;
    const dy = -stepY * gy;

    if (stiffX[c.index] > 0) forceX[c.index] += stiffX[c.index] * dx;
    else c.x = clamp(c.x + dx, core.x, core.x + core.w - c.width);

    if (stiffY[c.index] > 0) forceY[c.index] += stiffY[c.index] * dy;
    // A cell connected to nothing has no springs to carry a force, so it is
    // simply moved. Rare, but a netlist under construction will have them.
    else c.y = clamp(c.y + dy, core.y, core.y + core.h - c.height);
  }

  return dm;
}

/** Repeated 3x3 box blur with edge clamping. */
function smooth(src, w, h, passes) {
  let a = Float64Array.from(src);
  let b = new Float64Array(a.length);
  for (let p = 0; p < passes; p++) {
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        let sum = 0;
        for (let dj = -1; dj <= 1; dj++) {
          const jj = clampInt(j + dj, 0, h - 1);
          for (let di = -1; di <= 1; di++) {
            sum += a[jj * w + clampInt(i + di, 0, w - 1)];
          }
        }
        b[j * w + i] = sum / 9;
      }
    }
    const t = a;
    a = b;
    b = t;
  }
  return a;
}

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function clampInt(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v | 0));
}
