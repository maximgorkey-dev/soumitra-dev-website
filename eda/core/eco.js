/**
 * Engineering change orders: editing a design after it has been placed.
 *
 * Clock tree synthesis and hold fixing both add cells to a legal placement.
 * A real flow does not re-run the placer for that. It finds each new cell the
 * nearest free stretch of row that fits it and leaves everything else where
 * it is. Doing the same here keeps "placement is legal" true at every stage
 * after legalisation, which the self-test checks.
 */

import { TECH } from "./tech.js";
import { cellDef, pinDef } from "./library.js";
import { designStats } from "./netlist.js";

/** A compiled terminal on a cell pin, the same shape `compile` produces. */
export function cellTerm(cell, pin) {
  const p = pinDef(cell.type, pin);
  return { port: false, index: cell.index, pin, dx: p.x, dy: p.y };
}

/**
 * Append a cell. `role` says why a tool added it ("clock" or "hold"), which
 * the view colours by and timing reads to tell clock buffers from logic.
 */
export function addCell(design, type, baseName, role) {
  const def = cellDef(type);
  const taken = new Set(design.cells.map((c) => c.name));
  let name = baseName;
  for (let k = 1; taken.has(name); k++) name = `${baseName}_${k}`;
  const cell = {
    index: design.cells.length,
    name,
    type,
    width: def.width,
    height: def.height,
    kind: def.kind,
    x: 0,
    y: 0,
    orient: "N",
    fixed: false,
    role,
  };
  design.cells.push(cell);
  return cell;
}

export function addNet(design, name, driver, sinks, isClock) {
  const net = {
    index: design.nets.length,
    name,
    driver,
    sinks,
    isClock,
    terminals: [driver, ...sinks],
  };
  design.nets.push(net);
  return net;
}

export function setSinks(net, sinks) {
  net.sinks = sinks;
  net.terminals = [net.driver, ...sinks];
}

/** Call once an edit is finished, so the netlist summary counts the new cells. */
export function refreshStats(design) {
  design.stats = designStats(design);
}

/**
 * Put `cell` on the free, legal site closest to having its centre at (cx, cy).
 * Returns the Manhattan distance it ended up from there, or null when no row
 * has a gap wide enough.
 */
export function placeNear(design, cell, cx, cy) {
  const { rows, core } = design.floorplan;
  const site = TECH.siteWidth;
  const wantX = cx - cell.width / 2;
  const wantY = cy - cell.height / 2;

  const byRow = new Map(rows.map((r) => [r.y, []]));
  for (const c of design.cells) {
    if (c !== cell && byRow.has(c.y)) byRow.get(c.y).push(c);
  }

  let best = null;
  for (const row of rows) {
    const dy = Math.abs(row.y - wantY);
    if (best && dy >= best.cost) continue;
    const occupied = byRow.get(row.y).sort((a, b) => a.x - b.x);
    let start = row.x;
    const gaps = [];
    for (const c of occupied) {
      if (c.x > start) gaps.push([start, c.x]);
      start = Math.max(start, c.x + c.width);
    }
    if (row.x + row.w > start) gaps.push([start, row.x + row.w]);

    for (const [g0, g1] of gaps) {
      const lo = core.x + Math.ceil((g0 - core.x) / site) * site;
      const hi = core.x + Math.floor((g1 - cell.width - core.x) / site) * site;
      if (lo > hi) continue;
      const snapped = core.x + Math.round((wantX - core.x) / site) * site;
      const x = Math.min(hi, Math.max(lo, snapped));
      const cost = Math.abs(x - wantX) + dy;
      if (!best || cost < best.cost) best = { cost, x, y: row.y, orient: row.orient };
    }
  }

  if (!best) return null;
  cell.x = best.x;
  cell.y = best.y;
  cell.orient = best.orient;
  return best.cost;
}
