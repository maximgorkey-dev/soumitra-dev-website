/**
 * Legalisation (Abacus).
 *
 * Global placement leaves cells at arbitrary coordinates, overlapping each
 * other. This stage moves them onto the row and site grid with no overlaps,
 * while disturbing the placement as little as possible — because the global
 * placer's answer was the good one, and every dbu of displacement spends some
 * of its quality.
 *
 * The algorithm is Abacus. Cells are processed in order of increasing x, and
 * each is tried in its preferred row and a band of neighbouring rows; the row
 * whose total displacement grows least wins. Within a row, cells are grouped
 * into clusters of touching cells, and each cluster is positioned at the
 * weighted average of its members' desired positions — which is the exact
 * optimum for squared displacement given a fixed left-to-right ordering.
 * Clusters that end up overlapping are merged and re-solved, recursively.
 *
 * Expect wirelength to get slightly worse here. That is not a bug: the global
 * placer was optimising against a relaxed problem where cells could overlap,
 * so its wirelength was not achievable. The number to watch is how *little*
 * it degrades.
 */

import { TECH } from "../core/tech.js";
import { hpwl, checkLegality } from "../core/metrics.js";

export function* legalize(design, opts = {}) {
  const { core, rows } = design.floorplan;
  const site = TECH.siteWidth;
  const rowCount = rows.length;
  const searchRadius = opts.searchRadius ?? 6;

  const hpwlBefore = hpwl(design);

  // Where global placement wanted each cell. Every cost below is measured
  // against these, not against wherever a cell has been shuffled to since.
  const items = design.cells.map((c) => ({
    cell: c,
    width: c.width,
    targetX: c.x,
    targetY: c.y,
    weight: 1,
  }));

  const failures = [];
  let pass = yield* assignByDisplacement(items, rows, core, searchRadius);
  let retried = false;

  // Assigning in order of increasing x is what gives Abacus its quality, and
  // it is also what can strand the last cell: each row is left with a gap too
  // narrow for anything, and a wide cell arriving late finds every row short
  // even though the free area, added up, is ample. Retry widest-first, which
  // places the cells with the fewest options while the choice still exists.
  if (pass.failures.length) {
    retried = true;
    pass = yield* assignByWidth(items, rows, core);
  }

  const state = pass.state;
  for (const name of pass.failures) failures.push(name);
  for (const st of state) finalizeRow(st, site, failures);

  const hpwlAfter = hpwl(design);
  const disp = displacementOf(items);
  const legality = checkLegality(design);

  const logs = [
    `${pass.placed} of ${items.length} cells assigned to ${legality.rowsUsed} of ${rowCount} rows`,
    `displacement avg ${(disp.avg / 1000).toFixed(2)} um, max ${(disp.max / 1000).toFixed(2)} um` +
      (disp.maxCell ? ` (${disp.maxCell})` : ""),
    `wirelength ${(hpwlBefore / 1000).toFixed(1)} -> ${(hpwlAfter / 1000).toFixed(1)} um ` +
      `(${signedPct(hpwlAfter, hpwlBefore)})`,
    legality.ok
      ? "legality check passed: no overlaps, all cells on-grid and inside the core"
      : `legality check FAILED: ${legality.overlaps.length} overlaps, ` +
        `${legality.offGrid.length} off-grid, ${legality.outside.length} outside core`,
  ];
  if (retried) {
    logs.push("row assignment retried widest-cell-first: the first pass stranded a cell");
  }
  if (failures.length) logs.push(`could not place: ${failures.join(", ")}`);

  return {
    metrics: {
      hpwl: hpwlAfter,
      hpwlBefore,
      hpwlDelta: hpwlBefore > 0 ? (hpwlAfter - hpwlBefore) / hpwlBefore : 0,
      avgDisplacement: disp.avg,
      maxDisplacement: disp.max,
      maxDisplacementCell: disp.maxCell,
      rowsUsed: legality.rowsUsed,
      legal: legality.ok,
      overlaps: legality.overlaps.length,
      offGrid: legality.offGrid.length,
      outside: legality.outside.length,
      unplaced: failures.length,
    },
    logs,
  };
}

/* ------------------------------------------------------------------ */
/* Row assignment                                                      */
/* ------------------------------------------------------------------ */

/**
 * Classic Abacus assignment: cells in order of increasing x, each tried in its
 * preferred row and a widening band around it, and given to whichever row's
 * total displacement grows least.
 *
 * Feeding cells to a row in x order is a requirement, not a preference: the
 * cluster algebra appends to the row's rightmost cluster and has no way to
 * insert in the middle.
 */
function* assignByDisplacement(items, rows, core, searchRadius) {
  const rowCount = rows.length;
  const state = rows.map((row) => ({ row, clusters: [], used: 0 }));
  const order = items.slice().sort((a, b) => a.targetX - b.targetX || a.targetY - b.targetY);
  const failures = [];
  let placed = 0;

  for (const item of order) {
    const home = homeRow(item, core, rowCount);

    let bestRow = -1;
    let bestCost = Infinity;

    // Widen the band until some row can physically take the cell. Bounding the
    // search is what keeps this near-linear; without it every cell would be
    // trial-fitted into every row.
    for (let radius = searchRadius; ; radius = radius * 2) {
      for (let d = 0; d <= radius; d++) {
        for (const r of d === 0 ? [home] : [home - d, home + d]) {
          if (r < 0 || r >= rowCount) continue;
          const st = state[r];
          if (st.used + item.width > st.row.w) continue;

          const cost = trialCost(st, item);
          if (cost < bestCost) {
            bestCost = cost;
            bestRow = r;
          }
        }
      }
      if (bestRow >= 0 || radius >= rowCount) break;
    }

    if (bestRow < 0) {
      failures.push(item.cell.name);
      continue;
    }

    const st = state[bestRow];
    addToRow(st.clusters, st.row, item);
    st.used += item.width;

    placed += 1;
    if (placed % 16 === 0) yield { placed, total: order.length };
  }

  return { state, failures, placed };
}

/**
 * Fallback assignment for a core too tight for the x-ordered pass.
 *
 * Rows are chosen for the widest cell first, taking the nearest row that still
 * has room and preferring the emptier of two equally distant rows, which keeps
 * the large gaps intact for the cells that will need them. Only once every
 * cell has a row are the rows filled, each in x order, so the cluster algebra
 * still sees what it requires.
 *
 * Quality is a little worse than the x-ordered pass, because a row is picked
 * on vertical distance and free space rather than on how much horizontal
 * displacement it would actually cost. That is the trade for placing cells a
 * single pass cannot place at all.
 */
function* assignByWidth(items, rows, core) {
  const rowCount = rows.length;
  const state = rows.map((row) => ({ row, clusters: [], used: 0 }));
  const buckets = rows.map(() => []);
  const failures = [];

  const order = items.slice().sort((a, b) => b.width - a.width || a.targetX - b.targetX);
  const free = rows.map((r) => r.w);

  for (const item of order) {
    const home = homeRow(item, core, rowCount);
    let bestRow = -1;

    for (let d = 0; d < rowCount && bestRow < 0; d++) {
      for (const r of d === 0 ? [home] : [home - d, home + d]) {
        if (r < 0 || r >= rowCount) continue;
        if (free[r] < item.width) continue;
        if (bestRow < 0 || free[r] > free[bestRow]) bestRow = r;
      }
    }

    if (bestRow < 0) {
      failures.push(item.cell.name);
      continue;
    }

    free[bestRow] -= item.width;
    buckets[bestRow].push(item);
  }

  let placed = 0;
  for (let r = 0; r < rowCount; r++) {
    buckets[r].sort((a, b) => a.targetX - b.targetX);
    for (const item of buckets[r]) {
      addToRow(state[r].clusters, state[r].row, item);
      state[r].used += item.width;
      placed += 1;
      if (placed % 16 === 0) yield { placed, total: items.length };
    }
  }

  return { state, failures, placed };
}

/** The row a cell would land in if it kept its global-placement y. */
function homeRow(item, core, rowCount) {
  return clampInt(Math.round((item.targetY - core.y) / TECH.rowHeight), 0, rowCount - 1);
}

/* ------------------------------------------------------------------ */
/* Abacus cluster algebra                                              */
/* ------------------------------------------------------------------ */
/*
 * A cluster holds cells that must sit shoulder to shoulder. It carries just
 * enough accumulated state to find its own optimal position in constant time:
 *
 *   e  total weight
 *   q  weighted sum of member target positions, each offset by how far into
 *      the cluster that member sits
 *   w  total width
 *
 * The optimal left edge is then q/e. Adding a cell or absorbing a following
 * cluster updates e, q and w in O(1), which is what makes the whole stage
 * cheap despite the trial fitting.
 */

function newCluster(x) {
  return { xc: x, w: 0, e: 0, q: 0, cells: [] };
}

function addCell(c, item) {
  c.cells.push(item);
  c.e += item.weight;
  c.q += item.weight * (item.targetX - c.w);
  c.w += item.width;
}

function absorb(c, next) {
  c.cells.push(...next.cells);
  c.e += next.e;
  c.q += next.q - next.e * c.w;
  c.w += next.w;
}

function collapse(clusters, idx, row) {
  const c = clusters[idx];
  c.xc = c.q / c.e;
  // A cluster cannot hang off either end of the row.
  c.xc = Math.min(Math.max(c.xc, row.x), row.x + row.w - c.w);

  if (idx > 0) {
    const prev = clusters[idx - 1];
    if (prev.xc + prev.w > c.xc) {
      absorb(prev, c);
      clusters.splice(idx, 1);
      collapse(clusters, idx - 1, row);
    }
  }
}

/** Requires cells to arrive in non-decreasing target x, which they do. */
function addToRow(clusters, row, item) {
  const last = clusters.length ? clusters[clusters.length - 1] : null;
  if (!last || last.xc + last.w <= item.targetX) {
    clusters.push(newCluster(item.targetX));
    addCell(clusters[clusters.length - 1], item);
    collapse(clusters, clusters.length - 1, row);
  } else {
    addCell(last, item);
    collapse(clusters, clusters.length - 1, row);
  }
}

function cloneClusters(clusters) {
  return clusters.map((c) => ({ xc: c.xc, w: c.w, e: c.e, q: c.q, cells: c.cells.slice() }));
}

function rowCost(clusters) {
  let cost = 0;
  for (const c of clusters) {
    let x = c.xc;
    for (const item of c.cells) {
      const d = x - item.targetX;
      cost += item.weight * d * d;
      x += item.width;
    }
  }
  return cost;
}

/**
 * Marginal cost of putting `item` in this row: how much worse the row's
 * horizontal displacement gets, plus the vertical distance the cell itself
 * must travel. The delta matters rather than the absolute — otherwise a row
 * that already holds thirty cells would always look expensive next to an
 * empty one.
 */
function trialCost(st, item) {
  const before = rowCost(st.clusters);
  const trial = cloneClusters(st.clusters);
  addToRow(trial, st.row, item);
  const dy = st.row.y - item.targetY;
  return rowCost(trial) - before + dy * dy;
}

/**
 * Turn cluster positions into final cell coordinates.
 *
 * Cluster left edges are real numbers and have to land on the site grid. Every
 * cell width and the row origin are whole numbers of sites, so snapping the
 * cluster start puts every cell in it on-grid too. The cursor guards the one
 * hazard: two abutting clusters could otherwise round towards each other and
 * overlap by a site.
 */
function finalizeRow(st, site, failures) {
  const row = st.row;
  let cursor = row.x;

  for (const c of st.clusters) {
    const maxX = row.x + row.w - c.w;
    let x = row.x + Math.round((c.xc - row.x) / site) * site;
    if (x < cursor) x = cursor;
    if (x > maxX) x = maxX;

    if (x < cursor) {
      for (const item of c.cells) failures.push(item.cell.name);
      continue;
    }

    for (const item of c.cells) {
      item.cell.x = x;
      item.cell.y = row.y;
      item.cell.orient = row.orient;
      x += item.width;
    }
    cursor = x;
  }
}

function displacementOf(items) {
  let sum = 0;
  let max = 0;
  let maxCell = null;
  for (const item of items) {
    const d = Math.abs(item.cell.x - item.targetX) + Math.abs(item.cell.y - item.targetY);
    sum += d;
    if (d > max) {
      max = d;
      maxCell = item.cell.name;
    }
  }
  return { avg: items.length ? sum / items.length : 0, max, maxCell };
}

function signedPct(after, before) {
  if (!before) return "n/a";
  const pct = (100 * (after - before)) / before;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
}

function clampInt(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v | 0));
}
