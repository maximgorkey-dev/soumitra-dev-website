/**
 * Floorplanning.
 *
 * Decides how much silicon the design gets, cuts that area into standard-cell
 * rows, and pins the primary inputs and outputs to the die edge.
 *
 * The core is sized from cell area and the target utilisation, because that is
 * the causal direction in a real flow: you know how much logic you have and
 * how densely you dare pack it, and the area follows. Utilisation is the knob
 * with the most obvious consequences downstream — push it towards 1.0 and
 * there is nowhere for the placer to spread, and later, nowhere to route.
 */

import { TECH } from "../core/tech.js";
import { rng, hashSeed } from "../core/rng.js";

/**
 * Space reserved outside the core for the IO ring, in row heights.
 *
 * Proportional to the block rather than fixed, because a constant margin is
 * either invisible on a large design or larger than the core itself on a
 * small one. Real rings scale with the block they surround for the same
 * reason: they hold a pin count that grows with the logic inside.
 */
function marginRows(rows) {
  return Math.min(3, Math.max(1, Math.round(rows * 0.15)));
}

// Fraction of each row the cells must fit inside. The leftover is slack for
// legalisation, which assigns cells to rows by displacement rather than by
// best fit and so needs room to be imperfect.
const ROW_FILL = 0.98;

/**
 * Can these cell widths be packed into `rows` rows of `rowWidth`?
 *
 * Best-fit-decreasing: widest cell first, into the fullest row that still
 * takes it, which leaves the largest gaps available for the cells most likely
 * to need them. A success is constructive — the packing found is a real one —
 * so the answer is only ever conservative, and being told to widen a core that
 * would in fact have fitted costs one extra column of sites.
 */
function packs(widths, rows, rowWidth) {
  const remaining = new Array(rows).fill(rowWidth);

  for (const w of widths) {
    if (w > rowWidth) return false;
    let best = -1;
    for (let r = 0; r < rows; r++) {
      if (remaining[r] >= w && (best < 0 || remaining[r] < remaining[best])) best = r;
    }
    if (best < 0) return false;
    remaining[best] -= w;
  }
  return true;
}

export function floorplan(design) {
  const { siteWidth, rowHeight } = TECH;
  const util = clamp(design.constraints.utilization, 0.15, 0.95);
  const ratio = clamp(design.constraints.aspectRatio, 0.25, 4);

  const cellArea = design.cells.reduce((a, c) => a + c.width * c.height, 0);
  const cellWidthTotal = design.cells.reduce((a, c) => a + c.width, 0);

  if (cellArea === 0) throw new Error("design has no placeable cells");

  // area = w * h and ratio = w / h, so h = sqrt(area / ratio).
  const targetArea = cellArea / util;
  let rows = Math.max(1, Math.round(Math.sqrt(targetArea / ratio) / rowHeight));
  let sites = Math.max(1, Math.round(targetArea / (rows * rowHeight) / siteWidth));

  // Widen the core until the cells demonstrably fit. Comparing total cell
  // width against total row width is not enough: a cell cannot straddle two
  // rows, so a row 9000 wide takes only three 2400-wide flops and wastes the
  // remaining 1800. Sixteen flops in five such rows fit on a total-width test
  // and then leave the sixteenth with nowhere to go.
  const widths = design.cells.map((c) => c.width).sort((a, b) => b - a);
  let guard = 0;
  while (!packs(widths, rows, sites * siteWidth * ROW_FILL) && guard++ < 10000) sites += 1;

  const coreW = sites * siteWidth;
  const coreH = rows * rowHeight;
  const ringRows = marginRows(rows);
  const margin = ringRows * rowHeight;
  // Keep the core origin on the site and row grid by construction, so "on
  // grid" is a simple modulo test everywhere else in the app.
  const coreX = Math.ceil(margin / siteWidth) * siteWidth;
  const coreY = margin;

  const core = { x: coreX, y: coreY, w: coreW, h: coreH };
  const die = { x: 0, y: 0, w: coreW + 2 * coreX, h: coreH + 2 * coreY };

  const rowList = [];
  for (let i = 0; i < rows; i++) {
    rowList.push({
      index: i,
      x: coreX,
      y: coreY + i * rowHeight,
      w: coreW,
      h: rowHeight,
      sites,
      // All rows share an orientation here. Real libraries alternate so that
      // adjacent rows can share power rails; skipping that keeps pin offsets
      // (and therefore wirelength) identical before and after legalisation.
      orient: "N",
    });
  }

  design.floorplan = {
    die,
    core,
    rows: rowList,
    siteWidth,
    rowHeight,
    sitesPerRow: sites,
    capacity: rows * sites,
  };

  placePorts(design);
  seedPlacement(design);

  const rowUtil = cellWidthTotal / (rows * coreW);
  const achieved = cellArea / (coreW * coreH);

  const logs = [
    `core ${fmtUm(coreW)} x ${fmtUm(coreH)} um, ${rows} rows of ${sites} sites`,
    `cell area ${fmtUm2(cellArea)} um2, utilisation ${(100 * achieved).toFixed(1)}%`,
    `die ${fmtUm(die.w)} x ${fmtUm(die.h)} um including a ${ringRows}-row IO margin`,
  ];
  if (achieved < util - 0.01) {
    logs.push(
      `core widened past the ${(100 * util).toFixed(0)}% target: the widest cells ` +
        `leave gaps at the end of each row that nothing fits into`
    );
  }

  return {
    metrics: {
      dieArea: die.w * die.h,
      coreArea: coreW * coreH,
      cellArea,
      rows,
      sitesPerRow: sites,
      utilization: achieved,
      rowUtilization: rowUtil,
      requestedUtilization: util,
    },
    logs,
  };
}

/**
 * Primary inputs go on the left edge and outputs on the right, spread evenly
 * over the core's height. That is a simplification — a real block takes its
 * pin locations from the level above — but it gives the design a direction,
 * and placement visibly respects it.
 *
 * The clock is the exception: it enters at the bottom centre, which is where a
 * clock tree wants its root.
 */
function placePorts(design) {
  const { core, die } = design.floorplan;
  const isClock = (p) => /^(clk|clock)([_0-9]*)$/i.test(p.name);

  const clocks = design.ports.filter(isClock);
  const inputs = design.ports.filter((p) => p.dir === "input" && !isClock(p));
  const outputs = design.ports.filter((p) => p.dir === "output" && !isClock(p));

  const spread = (list, x) => {
    list.forEach((p, i) => {
      p.x = x;
      p.y = Math.round(core.y + ((i + 0.5) * core.h) / Math.max(1, list.length));
      p.edge = x <= core.x ? "left" : "right";
    });
  };

  spread(inputs, die.x);
  spread(outputs, die.x + die.w);

  clocks.forEach((p, i) => {
    p.x = Math.round(core.x + ((i + 0.5) * core.w) / Math.max(1, clocks.length));
    p.y = die.y;
    p.edge = "bottom";
  });
}

/**
 * Initial placement: everything at the centre of the core with a small
 * deterministic scatter.
 *
 * Starting from a single point is what analytic placers do — the first
 * wirelength solve then pulls cells outward towards whatever fixed IO they are
 * connected to, which is the part worth watching. The scatter exists because
 * the bound-to-bound net model divides by inter-pin distance, and a design
 * collapsed to exactly one point has none.
 */
function seedPlacement(design) {
  const { core } = design.floorplan;
  const next = rng(hashSeed(design.name));
  const jitterX = core.w * 0.06;
  const jitterY = core.h * 0.06;
  const cx = core.x + core.w / 2;
  const cy = core.y + core.h / 2;

  for (const c of design.cells) {
    c.x = cx - c.width / 2 + (next() - 0.5) * jitterX;
    c.y = cy - c.height / 2 + (next() - 0.5) * jitterY;
    c.orient = "N";
  }
}

function clamp(v, lo, hi) {
  const n = Number(v);
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

const fmtUm = (dbu) => (dbu / 1000).toFixed(2);
const fmtUm2 = (dbu2) => (dbu2 / 1e6).toFixed(2);
