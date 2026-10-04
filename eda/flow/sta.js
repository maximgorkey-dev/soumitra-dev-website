/**
 * Static timing analysis.
 *
 * Every signal's arrival time is computed at every pin, in one pass over the
 * logic in topological order, and compared at the endpoints against the time
 * it was required. Nothing is simulated: the arrival at a gate's output is the
 * latest of its inputs plus the gate's own delay, whatever the data happens to
 * be, which is what makes the answer exhaustive.
 *
 * Paths start at primary inputs and at flip-flop outputs, and end at primary
 * outputs and flip-flop data inputs. Flip-flops therefore cut the design into
 * purely combinational pieces, which is why the topological sort never has to
 * look through one.
 *
 * Delay model, all in picoseconds:
 *
 *   cell   intrinsic(pin) + R_drive x C_load, from the library
 *   wire   Elmore. Once detail routing has run, each sink's delay comes from
 *          the RC tree extracted from the net's actual wires and vias. Before
 *          that, the net is one lumped wire, R_wire x (C_wire / 2 + C_pin),
 *          whose length comes from global routing or the bounding box
 *   clock  the latency clock tree synthesis computed for each flop
 *
 * Two checks per flip-flop. Setup: data must arrive before the next clock edge
 * reaches the capturing flop, less its setup time. Hold: data must not arrive
 * before the *same* edge has finished being captured, plus the hold time. That
 * is why clock skew matters twice — a late capture clock helps setup and hurts
 * hold, and an early one does the reverse.
 */

import { TECH, wireRC } from "../core/tech.js";
import { cellDef, pinDef } from "../core/library.js";
import { netLengths, terminalPos } from "../core/metrics.js";

/** What drives a primary input from outside the block (kohm). */
const INPUT_DRIVE = 2.0;
/** What a primary output drives outside the block (fF). */
export const OUTPUT_LOAD = 5.0;
/** Signals route mostly on the middle layers. */
const SIGNAL_LAYER = TECH.layers[2];

/** Key for one sink of one net in the extracted parasitics. */
export const sinkKey = (ni, t) => `${ni}:${t.port ? "p" : "c"}${t.index}:${t.pin}`;

export function sinkCapOf(design, t) {
  return t.port ? OUTPUT_LOAD : pinDef(design.cells[t.index].type, t.pin).cap;
}

export function staticTiming(design) {
  const { cells, nets, ports } = design;
  const { clockPeriod: period, inputDelay, outputDelay } = design.constraints;
  const latency = (i) => (design.clockLatency && Number.isFinite(design.clockLatency[i]) ? design.clockLatency[i] : 0);
  const extracted = design.parasitics || null;
  const routed = Boolean(design.netWire);
  const lengths = design.netWire || netLengths(design);

  const sinkCap = (t) => sinkCapOf(design, t);
  const elec = nets.map((n, i) => {
    const w = wireRC(lengths[i], SIGNAL_LAYER);
    const cw = extracted && Number.isFinite(extracted.wireCap[i]) ? extracted.wireCap[i] : w.c;
    let load = cw;
    for (const s of n.sinks) load += sinkCap(s);
    return { r: w.r, cw, load };
  });
  const wireDelay = (ni, t) => {
    const d = extracted && extracted.delay.get(sinkKey(ni, t));
    return d !== undefined ? d : elec[ni].r * (elec[ni].cw / 2 + sinkCap(t));
  };

  const outNet = new Int32Array(cells.length).fill(-1);
  const inputs = cells.map(() => []);
  for (const n of nets) {
    if (n.driver && !n.driver.port) outNet[n.driver.index] = n.index;
    for (const s of n.sinks) if (!s.port) inputs[s.index].push({ net: n.index, term: s });
  }

  /* ---------------- forward: arrival times ---------------- */

  // Arrival at each net's driver pin, latest and earliest.
  const late = new Float64Array(nets.length).fill(NaN);
  const early = new Float64Array(nets.length).fill(NaN);
  // Which input of the driving cell produced the latest arrival, for tracing.
  const via = new Array(nets.length).fill(null);

  const pending = new Int32Array(cells.length);
  const queue = [];
  const order = [];

  const settle = (ni) => {
    for (const s of nets[ni].sinks) {
      if (s.port || !timed(cells[s.index])) continue;
      if (--pending[s.index] === 0) queue.push(s.index);
    }
  };

  // Clock buffers are timed by clock tree synthesis, which hands over the
  // latency at every flop; they are not data logic.
  const timed = (c) => c.kind !== "seq" && c.role !== "clock";
  for (const c of cells) {
    if (timed(c)) {
      pending[c.index] = inputs[c.index].length;
      if (!pending[c.index]) queue.push(c.index);
    }
  }
  for (const n of nets) {
    if (!n.driver) continue;
    if (n.isClock) {
      late[n.index] = early[n.index] = 0;
    } else if (n.driver.port) {
      late[n.index] = early[n.index] = inputDelay + INPUT_DRIVE * elec[n.index].load;
    } else if (cells[n.driver.index].kind === "seq") {
      const def = cellDef(cells[n.driver.index].type);
      late[n.index] = early[n.index] = latency(n.driver.index) + def.intrinsic.CK + def.driveRes * elec[n.index].load;
    } else {
      continue;
    }
    settle(n.index);
  }

  while (queue.length) {
    const ci = queue.shift();
    order.push(ci);
    const on = outNet[ci];
    if (on < 0) continue;
    const def = cellDef(cells[ci].type);
    const drive = def.driveRes * elec[on].load;
    let hi = -Infinity, lo = Infinity, worst = null;
    for (const inp of inputs[ci]) {
      const base = def.intrinsic[inp.term.pin] + wireDelay(inp.net, inp.term);
      const a = late[inp.net] + base;
      const b = early[inp.net] + base;
      if (a > hi) { hi = a; worst = inp; }
      if (b < lo) lo = b;
    }
    late[on] = hi + drive;
    early[on] = lo + drive;
    via[on] = worst;
    settle(on);
  }

  const loops = cells.filter((c) => timed(c) && pending[c.index] > 0).length;

  /* ---------------- endpoints: setup and hold ---------------- */

  const endpoints = [];
  const required = new Map(); // "cell:pin" or "port:index" -> required time at that pin
  for (const n of nets) {
    if (n.isClock || !Number.isFinite(late[n.index])) continue;
    for (const s of n.sinks) {
      const wd = wireDelay(n.index, s);
      if (s.port) {
        const req = period - outputDelay;
        required.set(`port:${s.index}`, req);
        endpoints.push({ name: ports[s.index].name, net: n.index, term: s, arrival: late[n.index] + wd, req, slack: req - late[n.index] - wd });
      } else if (cells[s.index].kind === "seq") {
        const def = cellDef(cells[s.index].type);
        if (s.pin === def.clockPin) continue;
        const capture = latency(s.index);
        const req = period + capture - def.setup;
        required.set(`${s.index}:${s.pin}`, req);
        endpoints.push({
          name: `${cells[s.index].name}/${s.pin}`,
          net: n.index,
          term: s,
          arrival: late[n.index] + wd,
          req,
          slack: req - late[n.index] - wd,
          hold: early[n.index] + wd - (capture + def.hold),
        });
      }
    }
  }

  /* ---------------- backward: required times, slack per cell ---------------- */

  const netReq = new Float64Array(nets.length).fill(Infinity);
  const needBy = (ni) => {
    let r = Infinity;
    for (const s of nets[ni].sinks) {
      const at = required.get(s.port ? `port:${s.index}` : `${s.index}:${s.pin}`);
      if (at !== undefined) r = Math.min(r, at - wireDelay(ni, s));
    }
    return r;
  };
  for (let k = order.length - 1; k >= 0; k--) {
    const ci = order[k];
    const on = outNet[ci];
    if (on < 0) continue;
    netReq[on] = needBy(on);
    const def = cellDef(cells[ci].type);
    const drive = def.driveRes * elec[on].load;
    for (const inp of inputs[ci]) required.set(`${ci}:${inp.term.pin}`, netReq[on] - drive - def.intrinsic[inp.term.pin]);
  }
  for (const n of nets) if (n.driver && !Number.isFinite(netReq[n.index])) netReq[n.index] = needBy(n.index);

  const slack = new Float32Array(cells.length).fill(NaN);
  for (const c of cells) {
    const on = outNet[c.index];
    if (on >= 0 && Number.isFinite(netReq[on]) && Number.isFinite(late[on])) slack[c.index] = netReq[on] - late[on];
  }

  /* ---------------- summary and the critical path ---------------- */

  let wns = Infinity, tns = 0, violations = 0, whs = Infinity, holdViolations = 0;
  let worst = null, worstHold = null;
  for (const e of endpoints) {
    if (e.slack < wns) { wns = e.slack; worst = e; }
    if (e.slack < 0) { tns += e.slack; violations += 1; }
    if (e.hold !== undefined) {
      if (e.hold < whs) { whs = e.hold; worstHold = e; }
      if (e.hold < 0) holdViolations += 1;
    }
  }

  const report = [];
  const pathCells = [];
  const pathPts = [];
  if (worst) {
    // Walk back from the endpoint, collecting hops in reverse.
    const hops = [];
    let ni = worst.net;
    let sinkTerm = worst.term;
    while (via[ni]) {
      const ci = nets[ni].driver.index;
      hops.push({ ci, ni, sinkTerm, inp: via[ni] });
      sinkTerm = via[ni].term;
      ni = via[ni].net;
    }
    hops.reverse();

    const drv = nets[ni].driver;
    const pt = (t) => { const p = terminalPos(design, t); pathPts.push(p.x, p.y); };
    pt(drv);
    if (drv.port) {
      report.push(["input external delay", inputDelay, inputDelay]);
      report.push([`${ports[drv.index].name} (in)`, late[ni] - inputDelay, late[ni]]);
    } else {
      const lat = latency(drv.index);
      report.push(["clock latency", lat, lat]);
      report.push([`${cells[drv.index].name}/CK->Q (${cells[drv.index].type})`, late[ni] - lat, late[ni]]);
      pathCells.push(drv.index);
    }
    for (const h of hops) {
      pt(h.inp.term);
      const c = cells[h.ci];
      pathCells.push(h.ci);
      const out = nets[h.ni].driver;
      pt(out);
      report.push([`${c.name}/${h.inp.term.pin}->${out.pin} (${c.type})`, late[h.ni] - late[h.inp.net], late[h.ni]]);
    }
    pt(worst.term);
    report.push([`${worst.name} (wire)`, worst.arrival - late[worst.net], worst.arrival]);
  }

  const fmt = (v) => `${v >= 0 ? " " : ""}${v.toFixed(0)}`.padStart(7);
  const logs = [
    `${endpoints.length} timing endpoints at a ${period} ps clock (${(1e6 / period).toFixed(0)} MHz), wires ${
      extracted ? "from parasitics extracted after detail routing" : routed ? "from global-route lengths" : "estimated from bounding boxes"}`,
  ];
  if (worst) {
    logs.push(`Critical path to ${worst.name}:`);
    logs.push(`  ${"point".padEnd(34)}   incr   arrival`);
    for (const [label, incr, at] of report) logs.push(`  ${label.padEnd(34)}${fmt(incr)}${fmt(at)}`);
    logs.push(`  ${"required".padEnd(34)}       ${fmt(worst.req)}`);
    logs.push(`  ${"slack".padEnd(34)}       ${fmt(worst.slack)}  ${worst.slack < 0 ? "VIOLATED" : "met"}`);
  }
  if (worstHold) {
    logs.push(`Worst hold slack ${worstHold.hold.toFixed(0)} ps at ${worstHold.name}; ${holdViolations} hold violation${holdViolations === 1 ? "" : "s"}`);
  }
  if (loops) logs.push(`${loops} cells sit on combinational loops and were not timed.`);

  const critical = worst ? worst.arrival : 0;
  return {
    slack,
    pathCells,
    pathPts,
    endpoints,
    metrics: {
      endpoints: endpoints.length,
      wns: Number.isFinite(wns) ? wns : 0,
      tns,
      violations,
      whs: Number.isFinite(whs) ? whs : null,
      holdViolations,
      critical,
      critEndpoint: worst ? worst.name : "—",
      fmax: Number.isFinite(wns) && period - wns > 0 ? 1e6 / (period - wns) : null,
      period,
      routed,
      extracted: Boolean(extracted),
      holdEndpoint: worstHold ? worstHold.name : "—",
      loops,
    },
    logs,
  };
}
