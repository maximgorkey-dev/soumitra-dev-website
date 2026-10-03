/**
 * Clock tree synthesis, by recursive geometric partitioning — the method of
 * means and medians (Jackson, Srinivasan and Kuh, 1990).
 *
 * The clock net arrives from placement as one net driving every flop, a
 * fanout no single driver can handle. The sinks are split in two at the median
 * along the longer side of their bounding box, each half is split again, and
 * so on until a group is small enough for one buffer to drive. Every split
 * point gets a buffer at the centroid of the sinks beneath it, so the tree is
 * shaped by where the flops actually are.
 *
 * Splitting at the median keeps both halves equal in sink count, which is what
 * makes the tree roughly balanced in delay. It does not make it *exactly*
 * balanced: halves differ in spread, so their wires differ in length. That
 * residue is the skew this stage reports, and production tools remove it with
 * zero-skew merging (DME) and wire snaking, which is the next refinement.
 *
 * Buffers are modelled at their ideal positions rather than inserted as cells
 * and re-legalised. A real flow does insert and legalise them; leaving that
 * out changes the picture by a site or two and the delays not at all.
 *
 * Timing is Elmore: a buffer's output switches after intrinsic + R_drive x
 * C_load, and each wire adds R_wire x (C_wire / 2 + C_downstream).
 */

import { TECH, wireRC } from "../core/tech.js";
import { LIBRARY, cellDef, pinDef } from "../core/library.js";
import { terminalPos } from "../core/metrics.js";

/** Sinks one leaf buffer drives before the group is split again. */
const LEAF_SINKS = 4;
/** Above this load (fF) a node gets the high-drive buffer. */
const BIG_LOAD = 24;
/** Drive resistance (kohm) of a clock arriving through a port: a pad or PLL. */
const SOURCE_RES = 0.8;
/** Clocks run on the thick upper layers, where resistance is lowest. */
const CLOCK_LAYER = TECH.layers[4];

const manhattan = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const wire = (a, b) => wireRC(manhattan(a, b), CLOCK_LAYER);
const inputCap = (type) => LIBRARY[type].pins[0].cap;

function partition(sinks, depth) {
  let sx = 0, sy = 0;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const s of sinks) {
    sx += s.x;
    sy += s.y;
    minX = Math.min(minX, s.x); maxX = Math.max(maxX, s.x);
    minY = Math.min(minY, s.y); maxY = Math.max(maxY, s.y);
  }
  const node = {
    x: Math.round(sx / sinks.length),
    y: Math.round(sy / sinks.length),
    depth,
    sinks: [],
    children: [],
  };
  if (sinks.length <= LEAF_SINKS) {
    node.sinks = sinks;
    return node;
  }
  const axis = maxX - minX >= maxY - minY ? "x" : "y";
  const sorted = [...sinks].sort((a, b) => a[axis] - b[axis]);
  const half = sorted.length >> 1;
  node.children = [partition(sorted.slice(0, half), depth + 1), partition(sorted.slice(half), depth + 1)];
  return node;
}

/** Bottom-up: what each buffer has to drive, and therefore which buffer. */
function size(node) {
  let load = 0;
  for (const s of node.sinks) load += s.cap + wire(node, s).c;
  for (const ch of node.children) {
    size(ch);
    load += inputCap(ch.type) + wire(node, ch).c;
  }
  node.load = load;
  node.type = load > BIG_LOAD ? "BUFX4" : "BUF";
}

/** Top-down: arrival at every buffer input and every sink. */
function propagate(node, arrivalIn, sinkTimes) {
  const def = LIBRARY[node.type];
  const out = arrivalIn + def.intrinsic.A + def.driveRes * node.load;
  for (const s of node.sinks) {
    const w = wire(node, s);
    sinkTimes.push({ sink: s, at: out + w.r * (w.c / 2 + s.cap) });
  }
  for (const ch of node.children) {
    const w = wire(node, ch);
    propagate(ch, out + w.r * (w.c / 2 + inputCap(ch.type)), sinkTimes);
  }
}

/** Flatten into drawable L-shaped segments, tagged with the level they belong to. */
function collect(node, parent, out) {
  if (parent) out.segs.push(parent.x, parent.y, node.x, parent.y, node.depth, node.x, parent.y, node.x, node.y, node.depth);
  out.bufs.push({ x: node.x, y: node.y, big: node.type === "BUFX4", level: node.depth });
  out.wirelength += parent ? manhattan(parent, node) : 0;
  out.buffers += 1;
  out.area += cellDef(node.type).width * cellDef(node.type).height;
  out.levels = Math.max(out.levels, node.depth + 1);
  for (const s of node.sinks) {
    out.segs.push(node.x, node.y, s.x, node.y, node.depth + 1, s.x, node.y, s.x, s.y, node.depth + 1);
    out.wirelength += manhattan(node, s);
  }
  for (const ch of node.children) collect(ch, node, out);
}

export function* clockTreeSynthesis(design) {
  const latency = new Float64Array(design.cells.length).fill(NaN);
  const clockNets = design.nets.filter((n) => n.isClock && n.driver && n.sinks.length);

  if (!clockNets.length) {
    return {
      latency,
      metrics: { sinks: 0, buffers: 0, levels: 0, skew: 0, minLatency: 0, maxLatency: 0, wirelength: 0 },
      logs: ["No clock net: the design is purely combinational, so there is no tree to build."],
    };
  }

  const tree = { segs: [], bufs: [], wirelength: 0, buffers: 0, area: 0, levels: 0 };
  let sinkCount = 0;
  let minLat = Infinity;
  let maxLat = -Infinity;
  const logs = [];

  for (const net of clockNets) {
    const source = terminalPos(design, net.driver);
    const sinks = net.sinks.map((t) => ({
      ...terminalPos(design, t),
      term: t,
      cap: t.port ? 0 : pinDef(design.cells[t.index].type, t.pin).cap,
    }));
    sinkCount += sinks.length;

    const root = partition(sinks, 1);
    size(root);

    // The trunk: from the clock source to the root buffer.
    const trunk = wire(source, root);
    const srcRes = net.driver.port ? SOURCE_RES : cellDef(design.cells[net.driver.index].type).driveRes;
    const cin = inputCap(root.type);
    const rootArrival = srcRes * (trunk.c + cin) + trunk.r * (trunk.c / 2 + cin);

    const times = [];
    propagate(root, rootArrival, times);
    let lo = Infinity, hi = -Infinity;
    for (const { sink, at } of times) {
      if (!sink.term.port) latency[sink.term.index] = at;
      lo = Math.min(lo, at);
      hi = Math.max(hi, at);
    }
    minLat = Math.min(minLat, lo);
    maxLat = Math.max(maxLat, hi);

    tree.segs.push(source.x, source.y, root.x, source.y, 0, root.x, source.y, root.x, root.y, 0);
    tree.wirelength += manhattan(source, root);
    collect(root, null, tree);
    logs.push(`${net.name}: ${sinks.length} sinks, insertion delay ${lo.toFixed(0)}–${hi.toFixed(0)} ps, skew ${(hi - lo).toFixed(0)} ps`);
  }

  // Grow the tree on screen one level at a time, root first.
  const payload = { segs: tree.segs, bufs: tree.bufs };
  for (let level = 0; level <= tree.levels; level++) {
    yield { upto: level, levels: tree.levels, tree: level === 0 ? payload : null };
  }

  const metrics = {
    sinks: sinkCount,
    buffers: tree.buffers,
    levels: tree.levels,
    minLatency: minLat,
    maxLatency: maxLat,
    skew: maxLat - minLat,
    wirelength: tree.wirelength,
    bufferArea: tree.area,
  };
  logs.push(
    `${tree.buffers} buffers in ${tree.levels} levels, ${(tree.wirelength / 1000).toFixed(1)} um of clock wire`,
    "Buffers are modelled at their ideal positions; a production flow would also legalise them."
  );
  return { latency, metrics, logs };
}
