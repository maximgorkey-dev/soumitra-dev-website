/**
 * Quality-of-result measures.
 *
 * These are the numbers the flow is steered by and judged on, so they are
 * computed honestly rather than approximated for display. In particular the
 * legality check really does look for overlaps and off-grid cells, so if
 * legalisation has a bug the app will say so instead of drawing over it.
 */

import { TECH } from "./tech.js";

/** Absolute position of a compiled terminal. */
export function terminalPos(design, term) {
  if (term.port) {
    const p = design.ports[term.index];
    return { x: p.x, y: p.y };
  }
  const c = design.cells[term.index];
  const h = c.height;
  return {
    x: c.x + term.dx,
    y: c.y + (c.orient === "FS" ? h - term.dy : term.dy),
  };
}

export function netBBox(design, net) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const t of net.terminals) {
    const p = terminalPos(design, t);
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  if (minX === Infinity) return null;
  return { minX, minY, maxX, maxY };
}

/**
 * Half-perimeter wirelength, in dbu.
 *
 * The standard proxy for routed wirelength during placement: it is exact for
 * two- and three-pin nets and a lower bound beyond that, and unlike an actual
 * route it can be recomputed thousands of times a second.
 */
export function hpwl(design) {
  let total = 0;
  for (const net of design.nets) {
    if (net.terminals.length < 2) continue;
    const b = netBBox(design, net);
    if (b) total += b.maxX - b.minX + (b.maxY - b.minY);
  }
  return total;
}

/** Per-net HPWL, for finding the nets a placer struggled with. */
export function netLengths(design) {
  return design.nets.map((net) => {
    if (net.terminals.length < 2) return 0;
    const b = netBBox(design, net);
    return b ? b.maxX - b.minX + (b.maxY - b.minY) : 0;
  });
}

export function utilization(design) {
  const fp = design.floorplan;
  if (!fp) return 0;
  const cellArea = design.cells.reduce((a, c) => a + c.width * c.height, 0);
  return cellArea / (fp.core.w * fp.core.h);
}

/** Default ceiling on bin density. See `densityCeiling`. */
export const MAX_BIN_DENSITY = 0.85;

/**
 * The bin density global placement has to get under.
 *
 * Deliberately a ceiling and not the design's average utilisation. Aiming at
 * the average asks a design in a sparsely filled core to spread out until it
 * fills every corner of it, and that is the wrong answer: a block using 40% of
 * its core should sit in a compact cluster and keep its wires short, not smear
 * itself over ground it does not need. Legalisation is perfectly happy with
 * the cluster, because the rows underneath it are only 85% full.
 *
 * The ceiling cannot go below the average, though — a design at 95%
 * utilisation has to average 95% per bin, and asking for 85% is unsatisfiable.
 */
export function densityCeiling(design, ceiling = MAX_BIN_DENSITY) {
  return Math.max(utilization(design), ceiling);
}

/**
 * Bin density over the core, using exact rectangle overlap rather than a
 * cell's centre, so a wide cell straddling a bin boundary is counted in both.
 *
 * Overflow is the fraction of cell area sitting above `target`, and getting it
 * small is the usual stopping criterion for global placement.
 */
export function densityMap(design, binsX, binsY, target) {
  const fp = design.floorplan;
  if (!fp) return null;

  const { core } = fp;
  const binW = core.w / binsX;
  const binH = core.h / binsY;
  const binArea = binW * binH;
  const capacity = binArea * (target ?? densityCeiling(design));
  const area = new Float64Array(binsX * binsY);

  for (const c of design.cells) {
    const x0 = c.x;
    const x1 = c.x + c.width;
    const y0 = c.y;
    const y1 = c.y + c.height;

    const i0 = Math.max(0, Math.floor((x0 - core.x) / binW));
    const i1 = Math.min(binsX - 1, Math.floor((x1 - core.x) / binW));
    const j0 = Math.max(0, Math.floor((y0 - core.y) / binH));
    const j1 = Math.min(binsY - 1, Math.floor((y1 - core.y) / binH));

    for (let j = j0; j <= j1; j++) {
      const by0 = core.y + j * binH;
      const by1 = by0 + binH;
      const oy = Math.min(y1, by1) - Math.max(y0, by0);
      if (oy <= 0) continue;
      for (let i = i0; i <= i1; i++) {
        const bx0 = core.x + i * binW;
        const bx1 = bx0 + binW;
        const ox = Math.min(x1, bx1) - Math.max(x0, bx0);
        if (ox <= 0) continue;
        area[j * binsX + i] += ox * oy;
      }
    }
  }

  let over = 0;
  let peak = 0;
  const density = new Float64Array(area.length);
  for (let k = 0; k < area.length; k++) {
    density[k] = area[k] / binArea;
    if (density[k] > peak) peak = density[k];
    if (capacity > 0) over += Math.max(0, area[k] - capacity);
  }

  const cellArea = design.cells.reduce((a, c) => a + c.width * c.height, 0);
  return {
    binsX,
    binsY,
    binW,
    binH,
    density,
    peak,
    overflow: cellArea > 0 ? over / cellArea : 0,
  };
}

/**
 * Does the placement actually satisfy the rules? Checks the three things a
 * detailed placer must guarantee: cells sit on the site and row grid, stay
 * inside the core, and do not overlap each other.
 */
export function checkLegality(design) {
  const fp = design.floorplan;
  if (!fp) return { ok: false, reason: "no floorplan" };

  const { core } = fp;
  const offGrid = [];
  const outside = [];
  const overlaps = [];

  const byRow = new Map();
  for (const c of design.cells) {
    const dx = (c.x - core.x) % TECH.siteWidth;
    const dy = (c.y - core.y) % TECH.rowHeight;
    if (dx !== 0 || dy !== 0) offGrid.push(c.name);

    if (c.x < core.x || c.y < core.y || c.x + c.width > core.x + core.w || c.y + c.height > core.y + core.h) {
      outside.push(c.name);
    }

    const row = Math.round((c.y - core.y) / TECH.rowHeight);
    if (!byRow.has(row)) byRow.set(row, []);
    byRow.get(row).push(c);
  }

  for (const cells of byRow.values()) {
    cells.sort((a, b) => a.x - b.x);
    for (let i = 1; i < cells.length; i++) {
      const prev = cells[i - 1];
      if (cells[i].x < prev.x + prev.width) {
        overlaps.push(`${prev.name} / ${cells[i].name}`);
      }
    }
  }

  return {
    ok: offGrid.length === 0 && outside.length === 0 && overlaps.length === 0,
    offGrid,
    outside,
    overlaps,
    rowsUsed: byRow.size,
  };
}

/** How far legalisation had to move things, relative to a saved snapshot. */
export function displacement(design, snapshot) {
  if (!snapshot) return { avg: 0, max: 0, maxCell: null };
  let sum = 0;
  let max = 0;
  let maxCell = null;
  for (const c of design.cells) {
    const ref = snapshot[c.index];
    if (!ref) continue;
    // Manhattan distance, which is what a placer's cost function uses.
    const d = Math.abs(c.x - ref.x) + Math.abs(c.y - ref.y);
    sum += d;
    if (d > max) {
      max = d;
      maxCell = c.name;
    }
  }
  return { avg: design.cells.length ? sum / design.cells.length : 0, max, maxCell };
}

/** Snapshot just the placement, for before/after comparisons. */
export function snapshotPositions(design) {
  return design.cells.map((c) => ({ x: c.x, y: c.y }));
}

/** Fanout histogram, useful once max_fanout becomes a real constraint. */
export function fanoutHistogram(design) {
  const hist = new Map();
  for (const net of design.nets) {
    const f = net.sinks.length;
    hist.set(f, (hist.get(f) || 0) + 1);
  }
  return [...hist.entries()].sort((a, b) => a[0] - b[0]);
}
