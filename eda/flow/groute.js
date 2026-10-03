/**
 * Global routing.
 *
 * The core is cut into a coarse grid of tiles (gcells), and every boundary
 * between two neighbouring tiles has a capacity: the number of routing tracks
 * that cross it on the layers running in that direction. A net is "routed"
 * once it has a path of tiles; actual wire geometry is the detail router's job.
 *
 * Three steps, in the order real routers use them:
 *
 *   Decompose  A multi-pin net becomes a set of two-pin connections along its
 *              minimum spanning tree (Prim, Manhattan distance). Production
 *              routers use a rectilinear Steiner tree, which is up to a third
 *              shorter; the MST is its standard approximation.
 *
 *   Pattern    Every connection is first routed as the cheaper of its two
 *              L-shapes. Fast, and good enough for most nets.
 *
 *   Negotiate  Edges carrying more than their capacity are overflowed. Nets
 *              crossing them are ripped up and rerouted with A* over the grid,
 *              under a cost that grows with present overuse and with a history
 *              term that remembers which edges have been contested before.
 *              This is PathFinder's negotiated congestion (McMurchie and
 *              Ebeling, 1995), and the history is what stops two nets fighting
 *              over one edge forever: whoever has the cheaper alternative
 *              eventually takes it.
 *
 * The clock is left out because clock tree synthesis already routed it.
 */

import { TECH } from "../core/tech.js";
import { terminalPos, netBBox } from "../core/metrics.js";

/** Tile size, in standard-cell rows. */
export const GCELL_ROWS = 2;
const MAX_ITERATIONS = 14;
/** How far outside a connection's bounding box A* may detour, in tiles. */
const DETOUR = 3;

/** Tracks crossing a tile boundary on layers running in direction `dir`. */
function tracks(dir, size) {
  let n = 0;
  for (const layer of TECH.layers.slice(TECH.firstRoutingLayer)) {
    if (layer.dir === dir) n += Math.floor(size / layer.pitch);
  }
  return n;
}

/** Minimal binary heap of [priority, value]. */
function heap() {
  const keys = [];
  const vals = [];
  return {
    get size() { return keys.length; },
    push(k, v) {
      let i = keys.length;
      keys.push(k); vals.push(v);
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (keys[p] <= keys[i]) break;
        [keys[p], keys[i]] = [keys[i], keys[p]];
        [vals[p], vals[i]] = [vals[i], vals[p]];
        i = p;
      }
    },
    pop() {
      const top = vals[0];
      const lk = keys.pop(), lv = vals.pop();
      if (keys.length) {
        keys[0] = lk; vals[0] = lv;
        let i = 0;
        for (;;) {
          const l = 2 * i + 1, r = l + 1;
          let m = i;
          if (l < keys.length && keys[l] < keys[m]) m = l;
          if (r < keys.length && keys[r] < keys[m]) m = r;
          if (m === i) break;
          [keys[m], keys[i]] = [keys[i], keys[m]];
          [vals[m], vals[i]] = [vals[i], vals[m]];
          i = m;
        }
      }
      return top;
    },
  };
}

export function* globalRoute(design) {
  const { core } = design.floorplan;
  const supply = Math.min(1, Math.max(0.05, design.constraints.routeSupply ?? 0.5));
  const G = GCELL_ROWS * TECH.rowHeight;
  const nx = Math.max(2, Math.ceil(core.w / G));
  const ny = Math.max(2, Math.ceil(core.h / G));
  // Not every track is free for signals: the power grid, pin access and the
  // clock all take a share. `supply` is the fraction left for signal routing.
  const capH = Math.max(1, Math.floor(tracks("h", G) * supply));
  const capV = Math.max(1, Math.floor(tracks("v", G) * supply));

  const nH = (nx - 1) * ny;
  const nE = nH + nx * (ny - 1);
  const usage = new Int32Array(nE);
  const history = new Float64Array(nE);
  const cap = new Int32Array(nE);
  cap.fill(capH, 0, nH);
  cap.fill(capV, nH);

  const hEdge = (x, y) => y * (nx - 1) + x;
  const vEdge = (x, y) => nH + y * nx + x;
  const edgeBetween = (a, b) => {
    const ax = a % nx, ay = (a / nx) | 0, bx = b % nx, by = (b / nx) | 0;
    return ay === by ? hEdge(Math.min(ax, bx), ay) : vEdge(ax, Math.min(ay, by));
  };
  const tileOf = (p) => {
    const x = Math.min(nx - 1, Math.max(0, Math.floor((p.x - core.x) / G)));
    const y = Math.min(ny - 1, Math.max(0, Math.floor((p.y - core.y) / G)));
    return y * nx + x;
  };

  let present = 0.5;
  const cost = (e) => {
    const over = usage[e] + 1 - cap[e];
    return (1 + history[e]) * (over > 0 ? 1 + present * over : 1);
  };
  const commit = (path, d) => {
    for (let i = 1; i < path.length; i++) usage[edgeBetween(path[i - 1], path[i])] += d;
  };
  const pathCost = (path) => {
    let s = 0;
    for (let i = 1; i < path.length; i++) s += cost(edgeBetween(path[i - 1], path[i]));
    return s;
  };

  function lPath(a, b, horizontalFirst) {
    let x = a % nx, y = (a / nx) | 0;
    const bx = b % nx, by = (b / nx) | 0;
    const path = [a];
    const stepX = () => { while (x !== bx) { x += Math.sign(bx - x); path.push(y * nx + x); } };
    const stepY = () => { while (y !== by) { y += Math.sign(by - y); path.push(y * nx + x); } };
    if (horizontalFirst) { stepX(); stepY(); } else { stepY(); stepX(); }
    return path;
  }

  function aStar(a, b) {
    const ax = a % nx, ay = (a / nx) | 0, bx = b % nx, by = (b / nx) | 0;
    const x0 = Math.max(0, Math.min(ax, bx) - DETOUR), x1 = Math.min(nx - 1, Math.max(ax, bx) + DETOUR);
    const y0 = Math.max(0, Math.min(ay, by) - DETOUR), y1 = Math.min(ny - 1, Math.max(ay, by) + DETOUR);
    const dist = new Float64Array(nx * ny).fill(Infinity);
    const prev = new Int32Array(nx * ny).fill(-1);
    const open = heap();
    dist[a] = 0;
    open.push(Math.abs(ax - bx) + Math.abs(ay - by), a);
    while (open.size) {
      const u = open.pop();
      if (u === b) break;
      const ux = u % nx, uy = (u / nx) | 0;
      for (const [vx, vy] of [[ux + 1, uy], [ux - 1, uy], [ux, uy + 1], [ux, uy - 1]]) {
        if (vx < x0 || vx > x1 || vy < y0 || vy > y1) continue;
        const v = vy * nx + vx;
        const nd = dist[u] + cost(edgeBetween(u, v));
        if (nd < dist[v]) {
          dist[v] = nd;
          prev[v] = u;
          // Every edge costs at least 1, so Manhattan distance never overestimates.
          open.push(nd + Math.abs(vx - bx) + Math.abs(vy - by), v);
        }
      }
    }
    const path = [b];
    while (path[path.length - 1] !== a) path.push(prev[path[path.length - 1]]);
    return path.reverse();
  }

  /* -------- decompose every signal net into two-pin connections -------- */

  const conns = [];
  const localWire = new Float64Array(design.nets.length);
  for (const net of design.nets) {
    if (net.isClock || net.terminals.length < 2) continue;
    const tiles = [...new Set(net.terminals.map((t) => tileOf(terminalPos(design, t))))];
    const box = netBBox(design, net);
    localWire[net.index] = box ? box.maxX - box.minX + (box.maxY - box.minY) : 0;
    if (tiles.length < 2) continue;

    // Prim's MST over the tiles the net touches.
    const inTree = [tiles[0]];
    const rest = tiles.slice(1);
    while (rest.length) {
      let best = Infinity, bi = 0, bj = 0;
      for (let i = 0; i < inTree.length; i++) {
        for (let j = 0; j < rest.length; j++) {
          const d = Math.abs((inTree[i] % nx) - (rest[j] % nx)) + Math.abs(((inTree[i] / nx) | 0) - ((rest[j] / nx) | 0));
          if (d < best) { best = d; bi = i; bj = j; }
        }
      }
      conns.push({ net: net.index, a: inTree[bi], b: rest[bj], path: null });
      inTree.push(rest[bj]);
      rest.splice(bj, 1);
    }
  }

  /* -------- measurement -------- */

  function measure(iter) {
    let overflow = 0, overEdges = 0, maxUtil = 0, edges = 0, bends = 0;
    for (let e = 0; e < nE; e++) {
      const u = usage[e];
      edges += u;
      if (u > cap[e]) { overflow += u - cap[e]; overEdges += 1; }
      maxUtil = Math.max(maxUtil, u / cap[e]);
    }
    for (const c of conns) {
      for (let i = 2; i < c.path.length; i++) {
        const turn = (c.path[i] - c.path[i - 1]) !== (c.path[i - 1] - c.path[i - 2]);
        if (turn) bends += 1;
      }
    }
    const congestion = new Float32Array(nx * ny);
    for (let y = 0; y < ny; y++) {
      for (let x = 0; x < nx; x++) {
        let m = 0;
        if (x > 0) m = Math.max(m, usage[hEdge(x - 1, y)] / capH);
        if (x < nx - 1) m = Math.max(m, usage[hEdge(x, y)] / capH);
        if (y > 0) m = Math.max(m, usage[vEdge(x, y - 1)] / capV);
        if (y < ny - 1) m = Math.max(m, usage[vEdge(x, y)] / capV);
        congestion[y * nx + x] = m;
      }
    }
    // A bend is a change of layer, so it costs at least one via.
    return {
      metrics: { iter, overflow, overEdges, maxUtil, wirelength: edges * G, vias: bends, connections: conns.length },
      usage: usage.slice(),
      congestion,
    };
  }

  const grid = { nx, ny, g: G, x0: core.x, y0: core.y, nH, capH, capV };

  /* -------- pattern route everything -------- */

  for (const c of conns) {
    const p1 = lPath(c.a, c.b, true);
    const p2 = lPath(c.a, c.b, false);
    c.path = pathCost(p1) <= pathCost(p2) ? p1 : p2;
    commit(c.path, 1);
  }
  let snap = measure(0);
  const initialOverflow = snap.metrics.overflow;
  yield { grid, ...snap };

  /* -------- negotiate congestion away -------- */

  let iter = 0;
  let rerouted = 0;
  while (snap.metrics.overflow > 0 && iter < MAX_ITERATIONS) {
    iter += 1;
    const hot = new Uint8Array(nE);
    for (let e = 0; e < nE; e++) {
      if (usage[e] > cap[e]) {
        hot[e] = 1;
        history[e] += 1;
      }
    }
    present *= 1.8;
    for (const c of conns) {
      let crosses = false;
      for (let i = 1; i < c.path.length && !crosses; i++) crosses = hot[edgeBetween(c.path[i - 1], c.path[i])] === 1;
      if (!crosses) continue;
      commit(c.path, -1);
      c.path = aStar(c.a, c.b);
      commit(c.path, 1);
      rerouted += 1;
    }
    snap = measure(iter);
    yield { ...snap };
  }

  // Routed length per net, for timing. A net inside a single tile keeps its
  // bounding-box estimate, and no net is shorter than its bounding box.
  const netWire = Float64Array.from(localWire);
  const routedLen = new Float64Array(design.nets.length);
  for (const c of conns) routedLen[c.net] += (c.path.length - 1) * G;
  for (let i = 0; i < netWire.length; i++) netWire[i] = Math.max(netWire[i], routedLen[i]);

  const m = snap.metrics;
  const logs = [
    `${nx} x ${ny} gcells of ${(G / 1000).toFixed(1)} um; ${capH} horizontal and ${capV} vertical tracks per edge at ${Math.round(supply * 100)}% supply`,
    `${conns.length} two-pin connections; overflow ${initialOverflow} after pattern routing, ${m.overflow} after ${iter} negotiation round${iter === 1 ? "" : "s"} (${rerouted} reroutes)`,
  ];
  if (m.overflow > 0) {
    logs.push("Overflow remains: raise the routing supply, lower utilisation, or widen the core.");
  }
  return { netWire, metrics: { ...m, iterations: iter, rerouted, initialOverflow, nx, ny }, logs };
}
