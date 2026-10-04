/**
 * Detail routing, as track assignment plus pin access, then extraction.
 *
 * Global routing decided which tiles every connection passes through. This
 * stage turns that into wires: actual rectangles on actual metal layers, with
 * vias where they change layer, so that timing can be computed from the
 * resistance and capacitance of what was built rather than from a length.
 *
 *   Runs        A connection's tile path is cut into straight runs: the
 *               stretches where it keeps going the same way. Horizontal runs
 *               live on the horizontal layers (M3, M5), vertical runs on the
 *               vertical ones (M4, M6).
 *
 *   Tracks      Every tile row offers a fixed set of horizontal tracks, and
 *               every tile column a set of vertical ones, thinned to the
 *               routing supply exactly as global routing's capacities were.
 *               Runs sharing a row are given tracks by the left-edge
 *               algorithm from channel routing (Hashimoto and Stevens, 1971):
 *               sorted by where they start, each takes the first track that
 *               is free by then. Long runs prefer the thick upper layer, where
 *               resistance per micron is half of M3's; short runs stay low
 *               and save the vias.
 *
 *   Repair      Where a run really ends depends on where its neighbours
 *               turn, so collisions are checked on the finished geometry:
 *               two nets on one track less than a pitch apart. An offender,
 *               or a neighbour whose corner sets its end, is moved to another
 *               track, into the next tile row or column if its own is full,
 *               or trades tracks with another run; a change is kept only if
 *               the design has fewer collisions afterwards. What survives is
 *               a short, and is counted, not hidden.
 *
 *   Geometry    The wire leaves its first pin with a short jog onto the first
 *               run's track, turns at the point where consecutive runs' tracks
 *               cross, and jogs off the last track into its second pin. Every
 *               change of layer is a via, including the stack up from the pin
 *               on M1.
 *
 *   Extraction  Each net becomes an RC tree, one branch per connection, with
 *               the R and C of every segment on its own layer plus the via
 *               resistances. Elmore delay from the driver to every sink of
 *               that tree is what signoff timing then uses.
 *
 * What a production detail router adds on top: a maze search on the full
 * track grid that walks around obstacles, spacing and end-of-line rules, pin
 * access that respects the cell's own M1, and rip-up of the shorts below.
 */

import { TECH, wireRC } from "../core/tech.js";
import { terminalPos } from "../core/metrics.js";
import { sinkCapOf, sinkKey } from "./sta.js";

/** Runs at least this many tiles long try the upper layer first. */
const LONG_RUN = 3;
/** Resistance of one via cut, kohm. */
const VIA_RES = 0.004;
/** Layers used for the short jogs into and out of pins. */
const JOG_V = 1; // M2
const JOG_H = 2; // M3
const SIGNAL_LAYER = TECH.layers[2];

const layersBy = (dir) =>
  TECH.layers.map((l, i) => ({ ...l, i })).filter((l, i) => i >= TECH.firstRoutingLayer && l.dir === dir);

/** Usable tracks of one layer across a tile of size `g`, spread evenly over it. */
function trackOffsets(layer, g, supply) {
  const n = Math.floor(g / layer.pitch);
  const use = Math.max(1, Math.floor(n * supply));
  return Array.from({ length: use }, (_, k) => layer.pitch / 2 + Math.floor(((k + 0.5) * n) / use) * layer.pitch);
}

/** Cut a tile path into maximal straight runs. */
function runsOf(path, nx) {
  const runs = [];
  for (let i = 1; i < path.length; i++) {
    const ax = path[i - 1] % nx, ay = (path[i - 1] / nx) | 0;
    const bx = path[i] % nx, by = (path[i] / nx) | 0;
    const dir = ay === by ? "h" : "v";
    const last = runs[runs.length - 1];
    if (last && last.dir === dir) {
      last.lo = Math.min(last.lo, dir === "h" ? bx : by);
      last.hi = Math.max(last.hi, dir === "h" ? bx : by);
    } else {
      runs.push({
        dir,
        line: dir === "h" ? ay : ax,
        lo: dir === "h" ? Math.min(ax, bx) : Math.min(ay, by),
        hi: dir === "h" ? Math.max(ax, bx) : Math.max(ay, by),
      });
    }
  }
  return runs;
}

export function* detailRoute(design, guides) {
  const { grid, connections } = guides;
  const { nx, g, x0, y0 } = grid;
  const supply = Math.min(1, Math.max(0.05, design.constraints.routeSupply ?? 0.5));

  const slotsFor = (dir) => {
    const out = [];
    for (const layer of layersBy(dir)) {
      for (const off of trackOffsets(layer, g, supply)) out.push({ layer: layer.i, off });
    }
    return out;
  };
  const hSlots = slotsFor("h");
  const vSlots = slotsFor("v");
  const lowFirst = (slots) => [...slots].sort((a, b) => a.layer - b.layer);
  const highFirst = (slots) => [...slots].sort((a, b) => b.layer - a.layer);
  const pref = {
    h: { short: lowFirst(hSlots), long: highFirst(hSlots) },
    v: { short: lowFirst(vSlots), long: highFirst(vSlots) },
  };

  /* -------- track assignment, one tile row or column at a time -------- */

  const channels = new Map();
  for (const c of connections) {
    c.runs = c.path.length > 1 ? runsOf(c.path, nx) : [];
    for (const r of c.runs) {
      const key = `${r.dir}${r.line}`;
      if (!channels.has(key)) channels.set(key, []);
      channels.get(key).push(r);
    }
  }

  // Left-edge, in tile units. Two runs that merely meet in a shared end tile
  // are allowed on one track here; whether their real ends collide depends on
  // where the neighbouring runs turn, which is only known once every run has a
  // track, so that is checked on the geometry below.
  const setSlot = (r, slot) => {
    r.slot = slot;
    r.layer = slot.layer;
    r.coord = (r.dir === "h" ? y0 : x0) + r.line * g + slot.off;
  };
  for (const [key, runs] of channels) {
    const dir = key[0];
    const freeFrom = new Map((dir === "h" ? hSlots : vSlots).map((s) => [s, -Infinity]));
    runs.sort((a, b) => a.lo - b.lo || b.hi - a.hi);
    for (const r of runs) {
      const order = r.hi - r.lo + 1 >= LONG_RUN ? pref[dir].long : pref[dir].short;
      const slot = order.find((s) => freeFrom.get(s) <= r.lo)
        || order.reduce((best, s) => (freeFrom.get(s) < freeFrom.get(best) ? s : best), order[0]);
      freeFrom.set(slot, Math.max(freeFrom.get(slot), r.hi));
      setSlot(r, slot);
    }
  }

  /* -------- check the real extents, and repair collisions -------- */

  const pinPos = connections.map((c) => {
    const net = design.nets[c.net];
    return [terminalPos(design, net.terminals[c.ta]), terminalPos(design, net.terminals[c.tb])];
  });

  // A run reaches from where the previous run turns into it to where the next
  // one turns out of it; the first and last reach their pins' coordinates.
  function extents() {
    connections.forEach((c, k) => {
      const [pa, pb] = pinPos[k];
      c.runs.forEach((r, i) => {
        const along = r.dir === "h" ? "x" : "y";
        const s = i ? c.runs[i - 1].coord : pa[along];
        const e = i < c.runs.length - 1 ? c.runs[i + 1].coord : pb[along];
        r.a = Math.min(s, e);
        r.b = Math.max(s, e);
        r.net = c.net;
        r.prev = c.runs[i - 1] || null;
        r.next = c.runs[i + 1] || null;
      });
    });
  }

  /** Runs of different nets on one track closer than a pitch apart. */
  function collisions() {
    const tracks = new Map();
    for (const c of connections) {
      for (const r of c.runs) {
        const key = `${r.dir}${r.layer}:${r.coord}`;
        if (!tracks.has(key)) tracks.set(key, []);
        tracks.get(key).push(r);
      }
    }
    const bad = new Set();
    const pairs = [];
    for (const runs of tracks.values()) {
      runs.sort((p, q) => p.a - q.a);
      for (let i = 0; i < runs.length; i++) {
        const pitch = TECH.layers[runs[i].layer].pitch;
        for (let j = i + 1; j < runs.length && runs[j].a < runs[i].b + pitch; j++) {
          if (runs[j].net === runs[i].net) continue;
          bad.add(runs[j]);
          bad.add(runs[i]);
          pairs.push([runs[i], runs[j]]);
        }
      }
    }
    return { bad, count: pairs.length, pairs, tracks };
  }

  const fits = (tracks, r, slot) => {
    const coord = (r.dir === "h" ? y0 : x0) + r.line * g + slot.off;
    const others = tracks.get(`${r.dir}${slot.layer}:${coord}`) || [];
    const pitch = TECH.layers[slot.layer].pitch;
    return others.every((o) => o === r || o.net === r.net || o.b + pitch <= r.a || r.b + pitch <= o.a);
  };

  /** Try a change; keep it only if the design ends up with fewer collisions. */
  let sideways = 40; // moves that only shuffle the problem, allowed to escape a dead end
  function attempt(apply, undo) {
    const before = check.count;
    apply();
    extents();
    const after = collisions();
    if (after.count < before || (after.count === before && sideways > 0 && after.pairs.some(([p, q]) => !check.bad.has(p) || !check.bad.has(q)))) {
      if (after.count === before) sideways -= 1;
      check = after;
      return true;
    }
    undo();
    extents();
    return false;
  }

  const moveLine = (r, line) => {
    const from = channels.get(`${r.dir}${r.line}`);
    from.splice(from.indexOf(r), 1);
    const key = `${r.dir}${line}`;
    if (!channels.has(key)) channels.set(key, []);
    channels.get(key).push(r);
    r.line = line;
  };

  /**
   * Moving a run also moves the corners of the runs either side of it, so a
   * track that looks free can still create a collision one step away. Every
   * candidate is therefore judged by the whole design's collision count.
   * In order: another track in the same tile row or column; a track in the
   * next row or column over, outside the global route's guide, which is what
   * a detail router does when a tile is fuller inside than its boundaries
   * suggested; and trading tracks with another run in the same channel.
   */
  function repair(r) {
    const slots = r.dir === "h" ? hSlots : vSlots;
    const home = { line: r.line, slot: r.slot };
    const back = () => {
      if (r.line !== home.line) moveLine(r, home.line);
      setSlot(r, home.slot);
    };
    for (const s of slots) {
      if (s !== r.slot && fits(check.tracks, r, s) && attempt(() => setSlot(r, s), back)) return "move";
    }
    const limit = r.dir === "h" ? grid.ny : grid.nx;
    for (const line of [r.line + 1, r.line - 1]) {
      if (line < 0 || line >= limit) continue;
      for (const s of slots) {
        if (attempt(() => { moveLine(r, line); setSlot(r, s); }, back)) return "detour";
      }
    }
    for (const o of channels.get(`${r.dir}${r.line}`)) {
      if (o === r || o.slot === r.slot) continue;
      const theirs = o.slot;
      if (attempt(() => { setSlot(r, theirs); setSlot(o, home.slot); }, () => { setSlot(o, theirs); back(); })) return "swap";
    }
    return null;
  }

  extents();
  let check = collisions();
  const initialShorts = check.count;
  let repairs = 0, detours = 0;
  for (let round = 0; round < 12 && check.count; round++) {
    const before = check.count;
    for (const r of check.bad) {
      if (!check.bad.has(r)) continue;
      // Where a run ends is set by the runs either side of it, so moving one
      // of those can clear a collision the run itself has no room to escape.
      const how = repair(r) || (r.prev && repair(r.prev)) || (r.next && repair(r.next));
      if (how) repairs += 1;
      if (how === "detour") detours += 1;
    }
    if (check.count >= before && sideways <= 0) break;
  }
  const shorts = check.count;
  const slotsUsed = check.tracks.size;
  let slotsOffered = 0;
  for (const key of channels.keys()) slotsOffered += (key[0] === "h" ? hSlots : vSlots).length;

  /* -------- geometry and extraction -------- */

  const segs = []; // net, layer, x1, y1, x2, y2
  const vias = []; // net, x, y, cuts
  const layerLength = new Float64Array(TECH.layers.length);
  let viaCount = 0;
  const edgesByNet = new Map();

  for (const c of connections) {
    const net = design.nets[c.net];
    const pa = terminalPos(design, net.terminals[c.ta]);
    const pb = terminalPos(design, net.terminals[c.tb]);

    // A polyline as [point, layer of the segment arriving at it] pairs.
    const pts = [{ x: pa.x, y: pa.y, layer: null }];
    const to = (x, y, layer) => pts.push({ x, y, layer });
    if (!c.runs.length) {
      to(pb.x, pa.y, JOG_H);
      to(pb.x, pb.y, JOG_V);
    } else {
      const first = c.runs[0];
      if (first.dir === "h") to(pa.x, first.coord, JOG_V);
      else to(first.coord, pa.y, JOG_H);
      for (let i = 0; i < c.runs.length; i++) {
        const r = c.runs[i], next = c.runs[i + 1];
        if (next) {
          if (r.dir === "h") to(next.coord, r.coord, r.layer);
          else to(r.coord, next.coord, r.layer);
        } else if (r.dir === "h") {
          to(pb.x, r.coord, r.layer);
          to(pb.x, pb.y, JOG_V);
        } else {
          to(r.coord, pb.y, r.layer);
          to(pb.x, pb.y, JOG_H);
        }
      }
    }

    let R = 0, C = 0, prevLayer = 0; // pins are on M1
    const via = (x, y, from, toLayer) => {
      const cuts = Math.abs(toLayer - from);
      if (!cuts) return;
      vias.push(c.net, x, y, cuts);
      viaCount += cuts;
      R += cuts * VIA_RES;
    };
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      const len = Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
      if (!len) continue;
      via(a.x, a.y, prevLayer, b.layer);
      prevLayer = b.layer;
      const rc = wireRC(len, TECH.layers[b.layer]);
      R += rc.r;
      C += rc.c;
      layerLength[b.layer] += len;
      segs.push(c.net, b.layer, a.x, a.y, b.x, b.y);
    }
    via(pb.x, pb.y, prevLayer, 0);

    if (!edgesByNet.has(c.net)) edgesByNet.set(c.net, []);
    edgesByNet.get(c.net).push({ a: c.ta, b: c.tb, R, C });
  }

  const wireCap = new Float64Array(design.nets.length).fill(NaN);
  const delay = new Map();
  let deltaSum = 0, deltaMax = 0, deltaN = 0, estCap = 0, extCap = 0;
  for (const [ni, edges] of edgesByNet) {
    const net = design.nets[ni];
    const n = net.terminals.length;
    const adj = Array.from({ length: n }, () => []);
    for (const e of edges) {
      adj[e.a].push({ to: e.b, e });
      adj[e.b].push({ to: e.a, e });
    }
    // Orient the tree away from the driver, terminal 0.
    const parent = new Array(n).fill(null);
    const order = [0];
    const seen = new Uint8Array(n);
    seen[0] = 1;
    for (let k = 0; k < order.length; k++) {
      for (const { to, e } of adj[order[k]]) {
        if (seen[to]) continue;
        seen[to] = 1;
        parent[to] = { from: order[k], e };
        order.push(to);
      }
    }
    const down = net.terminals.map((t, i) => (i === 0 ? 0 : sinkCapOf(design, t)));
    for (let k = order.length - 1; k > 0; k--) {
      const v = order[k];
      down[parent[v].from] += parent[v].e.C + down[v];
    }
    const at = new Float64Array(n);
    for (let k = 1; k < order.length; k++) {
      const v = order[k], { from, e } = parent[v];
      at[v] = at[from] + e.R * (e.C / 2 + down[v]);
    }

    let cw = 0;
    for (const e of edges) cw += e.C;
    wireCap[ni] = cw;
    extCap += cw;

    // What the lumped global-route estimate would have said, for the report.
    const est = wireRC(design.netWire ? design.netWire[ni] : 0, SIGNAL_LAYER);
    estCap += est.c;
    for (let i = 1; i < n; i++) {
      const t = net.terminals[i];
      delay.set(sinkKey(ni, t), at[i]);
      const lumped = est.r * (est.c / 2 + sinkCapOf(design, t));
      const d = Math.abs(at[i] - lumped);
      deltaSum += d;
      deltaN += 1;
      deltaMax = Math.max(deltaMax, d);
    }
  }

  const geometry = { segs: Float32Array.from(segs), vias: Float32Array.from(vias) };
  const routedNets = [...edgesByNet.keys()].sort((a, b) => a - b);
  // Reveal the wires a few nets at a time, so the stage reads as work being done.
  const steps = Math.min(10, Math.max(1, routedNets.length));
  for (let s = 1; s <= steps; s++) {
    const upto = routedNets[Math.ceil((s * routedNets.length) / steps) - 1] ?? -1;
    yield { geometry: s === 1 ? geometry : null, upto, metrics: { shorts, vias: viaCount } };
  }

  const wirelength = layerLength.reduce((a, b) => a + b, 0);
  const byLayer = TECH.layers
    .map((l, i) => [l.name, layerLength[i]])
    .filter(([, len]) => len > 0)
    .map(([name, len]) => `${name} ${(len / 1000).toFixed(1)}`)
    .join(", ");
  const logs = [
    `${connections.length} connections on ${routedNets.length} nets; ${(wirelength / 1000).toFixed(1)} um of wire (${byLayer} um), ${viaCount} via cuts`,
    `${slotsUsed} of ${slotsOffered} row and column tracks used; ${initialShorts} collision${initialShorts === 1 ? "" : "s"} after track assignment, ` +
      `${repairs} run${repairs === 1 ? "" : "s"} moved to another track (${detours} outside its guide), ${shorts} short${shorts === 1 ? "" : "s"} left`,
    `Extracted wire capacitance ${extCap.toFixed(1)} fF against ${estCap.toFixed(1)} fF estimated from global-route lengths; ` +
      `sink wire delay changed by ${(deltaN ? deltaSum / deltaN : 0).toFixed(2)} ps on average, ${deltaMax.toFixed(2)} ps at most`,
  ];
  for (const [p, q] of check.pairs.slice(0, 4)) {
    const at = p.dir === "h" ? `y ${(p.coord / 1000).toFixed(2)} um, x ${(Math.max(p.a, q.a) / 1000).toFixed(2)}` : `x ${(p.coord / 1000).toFixed(2)} um, y ${(Math.max(p.a, q.a) / 1000).toFixed(2)}`;
    logs.push(`  short on ${TECH.layers[p.layer].name} between ${design.nets[p.net].name} and ${design.nets[q.net].name} at ${at} um`);
  }
  if (shorts) logs.push("Shorts remain: a production router would rip these up and reroute them. Raise the routing supply or widen the core.");

  return {
    parasitics: { wireCap, delay },
    metrics: {
      wirelength,
      vias: viaCount,
      shorts,
      initialShorts,
      repairs,
      detours,
      nets: routedNets.length,
      connections: connections.length,
      trackUse: slotsOffered ? slotsUsed / slotsOffered : 0,
      extractedCap: extCap,
      estimatedCap: estCap,
      delayDeltaAvg: deltaN ? deltaSum / deltaN : 0,
      delayDeltaMax: deltaMax,
    },
    logs,
  };
}
