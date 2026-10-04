/**
 * Clock tree synthesis, by recursive geometric partitioning — the method of
 * means and medians (Jackson, Srinivasan and Kuh, 1990) — followed by buffer
 * insertion and skew balancing.
 *
 * The clock net arrives from placement as one net driving every flop, a
 * fanout no single driver can handle. The sinks are split in two at the median
 * along the longer side of their bounding box, each half is split again, and
 * so on until a group is small enough for one buffer to drive. Every split
 * point gets a buffer at the centroid of the sinks beneath it, so the tree is
 * shaped by where the flops actually are.
 *
 * Three steps after that, in the order a real tool runs them:
 *
 *   Insert    Each buffer becomes a real cell, put on the nearest free legal
 *             site, and the clock net is split into one net per buffer. The
 *             tree is then timed from the buffers' actual pins, not from the
 *             ideal points the partitioning chose.
 *
 *   Balance   Splitting at the median keeps the halves equal in sink count,
 *             not in delay: their loads and wire lengths differ. Working up
 *             from the leaves, every buffer whose subtree is faster than its
 *             sibling's gets extra wire hung on its output — a serpentine
 *             "snake". In this technology clock wire resistance is tiny, so a
 *             snake slows things through its capacitance: the buffer driving
 *             it takes R_drive x C_snake longer to switch, and only its own
 *             subtree sees that. Snake lengths are whole multiples of a track
 *             pitch, which is what leaves a little residual skew.
 *
 *   Report   Insertion delay and skew, before and after balancing.
 *
 * Timing is Elmore: a buffer's output switches after intrinsic + R_drive x
 * C_load, and each wire adds R_wire x (C_wire / 2 + C_downstream).
 */

import { TECH, wireRC } from "../core/tech.js";
import { LIBRARY, pinDef } from "../core/library.js";
import { terminalPos } from "../core/metrics.js";
import { addCell, addNet, cellTerm, placeNear, refreshStats, setSinks } from "../core/eco.js";

/** Sinks one leaf buffer drives before the group is split again. */
const LEAF_SINKS = 4;
/** Above this load (fF) a node gets the high-drive buffer. */
const BIG_LOAD = 24;
/** Drive resistance (kohm) of a clock arriving through a port: a pad or PLL. */
const SOURCE_RES = 0.8;
/** Clocks run on the thick upper layers, where resistance is lowest. */
const CLOCK_LAYER = TECH.layers[4];
/** Snakes are laid in whole steps of this many dbu of wire. */
const SNAKE_STEP = CLOCK_LAYER.pitch;
/** Height of one meander leg when a snake is drawn, in dbu. */
const SNAKE_LEG = 600;

const manhattan = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const wire = (a, b) => wireRC(manhattan(a, b), CLOCK_LAYER);
const inputCap = (type) => LIBRARY[type].pins[0].cap;
const capPerDbu = CLOCK_LAYER.capPerUm / 1000;

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
    snake: 0, // dbu of balancing wire on this buffer's output
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

/** Bottom-up, at the ideal points: what each buffer has to drive, and therefore which buffer. */
function chooseTypes(node) {
  let load = 0;
  for (const s of node.sinks) load += s.cap + wire(node, s).c;
  for (const ch of node.children) {
    chooseTypes(ch);
    load += inputCap(ch.type) + wire(node, ch).c;
  }
  node.type = load > BIG_LOAD ? "BUFX4" : "BUF";
}

const preorder = (node, out = []) => {
  out.push(node);
  for (const ch of node.children) preorder(ch, out);
  return out;
};

/** Make every tree node a placed cell and split the clock net to match. */
function insertBuffers(design, net, root) {
  let moved = 0;
  const nodes = preorder(root);
  nodes.forEach((node, k) => {
    const cell = addCell(design, node.type, `cts_${net.name}_${k}`, "clock");
    const d = placeNear(design, cell, node.x, node.y);
    if (d === null) throw new Error("no free site for a clock buffer; lower the utilisation");
    moved += d;
    node.cell = cell;
    node.inTerm = cellTerm(cell, "A");
    node.outTerm = cellTerm(cell, "Y");
    node.inPos = terminalPos(design, node.inTerm);
    node.outPos = terminalPos(design, node.outTerm);
  });
  setSinks(net, [root.inTerm]);
  nodes.forEach((node, k) => {
    addNet(design, `${net.name}_cts${k}`, node.outTerm,
      [...node.children.map((ch) => ch.inTerm), ...node.sinks.map((s) => s.term)], true);
  });
  return { count: nodes.length, moved };
}

/* ---------------- timing on the real pins ---------------- */

function load(node) {
  let c = node.snake * capPerDbu;
  for (const s of node.sinks) c += s.cap + wire(node.outPos, s).c;
  for (const ch of node.children) c += inputCap(ch.type) + wire(node.outPos, ch.inPos).c;
  return c;
}

const outDelay = (node) => LIBRARY[node.type].intrinsic.A + LIBRARY[node.type].driveRes * load(node);
const branchToChild = (node, ch) => {
  const w = wire(node.outPos, ch.inPos);
  return w.r * (w.c / 2 + inputCap(ch.type));
};
const branchToSink = (node, s) => {
  const w = wire(node.outPos, s);
  return w.r * (w.c / 2 + s.cap);
};

/** From this buffer's input to the latest sink beneath it. */
function latest(node) {
  let m = 0;
  for (const s of node.sinks) m = Math.max(m, branchToSink(node, s));
  for (const ch of node.children) m = Math.max(m, branchToChild(node, ch) + latest(ch));
  return outDelay(node) + m;
}

/**
 * Bottom-up. Subtrees are balanced first, then siblings: each faster child is
 * slowed to match the slowest by the snake capacitance that adds exactly the
 * missing delay at its own output.
 */
function balance(node) {
  for (const ch of node.children) balance(ch);
  if (node.children.length < 2) return;
  const arrive = node.children.map((ch) => branchToChild(node, ch) + latest(ch));
  const target = Math.max(...arrive);
  node.children.forEach((ch, i) => {
    const missing = target - arrive[i];
    if (missing <= 0) return;
    const extraCap = missing / LIBRARY[ch.type].driveRes;
    ch.snake += Math.round(extraCap / capPerDbu / SNAKE_STEP) * SNAKE_STEP;
  });
}

function propagate(node, arrivalIn, out) {
  const t = arrivalIn + outDelay(node);
  for (const s of node.sinks) out.push({ sink: s, at: t + branchToSink(node, s) });
  for (const ch of node.children) propagate(ch, t + branchToChild(node, ch), out);
}

function sinkTimes(root, rootArrival) {
  const times = [];
  propagate(root, rootArrival, times);
  let lo = Infinity, hi = -Infinity;
  for (const { at } of times) {
    lo = Math.min(lo, at);
    hi = Math.max(hi, at);
  }
  return { times, lo, hi };
}

/* ---------------- drawing ---------------- */

const lShape = (out, a, b, level) => out.push(a.x, a.y, b.x, a.y, level, b.x, a.y, b.x, b.y, level);

/** A meander of `len` dbu starting at an output pin, drawn as vertical legs. */
function meander(out, at, len, level) {
  const legs = Math.max(1, Math.round(len / (SNAKE_LEG + TECH.siteWidth)));
  let x = at.x, y = at.y;
  for (let i = 0; i < legs; i++) {
    const ny = y + (i % 2 ? -SNAKE_LEG : SNAKE_LEG);
    out.push(x, y, x, ny, level);
    out.push(x, ny, x + TECH.siteWidth, ny, level);
    x += TECH.siteWidth;
    y = ny;
  }
}

function collect(node, parent, tree) {
  if (parent) lShape(tree.segs, parent.outPos, node.inPos, node.depth);
  tree.bufs.push({
    x: node.cell.x + node.cell.width / 2,
    y: node.cell.y + node.cell.height / 2,
    big: node.type === "BUFX4",
    level: node.depth,
  });
  tree.wirelength += parent ? manhattan(parent.outPos, node.inPos) : 0;
  tree.snakeLength += node.snake;
  if (node.snake) {
    tree.snaked += 1;
    meander(tree.snakes, node.outPos, node.snake, node.depth + 1);
  }
  tree.area += node.cell.width * node.cell.height;
  tree.levels = Math.max(tree.levels, node.depth + 1);
  for (const s of node.sinks) {
    lShape(tree.segs, node.outPos, s, node.depth + 1);
    tree.wirelength += manhattan(node.outPos, s);
  }
  for (const ch of node.children) collect(ch, node, tree);
}

export function* clockTreeSynthesis(design) {
  const clockNets = design.nets.filter((n) => n.isClock && n.driver && n.sinks.length);

  if (!clockNets.length) {
    return {
      latency: new Float64Array(design.cells.length).fill(NaN),
      metrics: { sinks: 0, buffers: 0, levels: 0, skew: 0, minLatency: 0, maxLatency: 0, wirelength: 0 },
      logs: ["No clock net: the design is purely combinational, so there is no tree to build."],
    };
  }

  const tree = { segs: [], bufs: [], snakes: [], wirelength: 0, snakeLength: 0, snaked: 0, area: 0, levels: 0 };
  const results = [];
  let sinkCount = 0, moved = 0, buffers = 0;
  let skewBefore = 0;
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
    chooseTypes(root);
    const ins = insertBuffers(design, net, root);
    moved += ins.moved;
    buffers += ins.count;

    // The trunk: from the clock source to the root buffer's input pin.
    const trunk = wire(source, root.inPos);
    const srcRes = net.driver.port ? SOURCE_RES : LIBRARY[design.cells[net.driver.index].type].driveRes;
    const cin = inputCap(root.type);
    const rootArrival = srcRes * (trunk.c + cin) + trunk.r * (trunk.c / 2 + cin);

    const before = sinkTimes(root, rootArrival);
    balance(root);
    const after = sinkTimes(root, rootArrival);
    skewBefore = Math.max(skewBefore, before.hi - before.lo);
    results.push(after);

    lShape(tree.segs, source, root.inPos, 0);
    tree.wirelength += manhattan(source, root.inPos);
    collect(root, null, tree);
    logs.push(
      `${net.name}: ${sinks.length} sinks, insertion delay ${after.lo.toFixed(0)}–${after.hi.toFixed(0)} ps, ` +
        `skew ${(before.hi - before.lo).toFixed(1)} ps placed, ${(after.hi - after.lo).toFixed(1)} ps balanced`
    );
  }
  refreshStats(design);

  const latency = new Float64Array(design.cells.length).fill(NaN);
  let minLat = Infinity, maxLat = -Infinity;
  for (const r of results) {
    for (const { sink, at } of r.times) if (!sink.term.port) latency[sink.term.index] = at;
    minLat = Math.min(minLat, r.lo);
    maxLat = Math.max(maxLat, r.hi);
  }

  // Grow the tree on screen one level at a time, root first.
  const payload = { segs: tree.segs, bufs: tree.bufs, snakes: tree.snakes };
  for (let level = 0; level <= tree.levels; level++) {
    yield { upto: level, levels: tree.levels, tree: level === 0 ? payload : null };
  }

  const metrics = {
    sinks: sinkCount,
    buffers,
    levels: tree.levels,
    minLatency: minLat,
    maxLatency: maxLat,
    skew: maxLat - minLat,
    skewBefore,
    snaked: tree.snaked,
    snakeLength: tree.snakeLength,
    wirelength: tree.wirelength,
    bufferArea: tree.area,
    bufferMoved: buffers ? moved / buffers : 0,
  };
  logs.push(
    `${buffers} buffers in ${tree.levels} levels, legalised an average ${(metrics.bufferMoved / 1000).toFixed(2)} um from their ideal points`,
    `${(tree.wirelength / 1000).toFixed(1)} um of clock wire, plus ${(tree.snakeLength / 1000).toFixed(1)} um of balancing snakes on ${tree.snaked} buffers`
  );
  return { latency, metrics, logs };
}
