/**
 * The netlist database.
 *
 * There are two representations here, and the split is deliberate:
 *
 *   Source form   ports + instances, each instance listing named connections.
 *                 This is what presets emit, what the text editor round-trips,
 *                 and what gets saved or put in a share link. Nets are implied
 *                 by shared net names, exactly as in a Verilog netlist.
 *
 *   Compiled form nets made explicit as one driver plus a list of sinks, with
 *                 pin offsets resolved and everything addressed by array index.
 *                 This is what the flow stages consume.
 *
 * Keeping them apart means editing never has to think about indices, and the
 * algorithms never have to resolve a name.
 */

import { cellDef, outputPin } from "./library.js";

export const DEFAULT_CONSTRAINTS = {
  // Timing. Unused until static timing analysis lands, but the clock period is
  // already the headline constraint of any real flow, so it is authored here.
  clockPeriod: 2000, // ps
  inputDelay: 200, // ps, arrival at a primary input relative to the clock edge
  outputDelay: 200, // ps, required time budget reserved outside this block
  maxFanout: 12,

  // Floorplan. These two are what phase 1 actually lets you push on.
  utilization: 0.7, // fraction of core area occupied by cells
  aspectRatio: 1.0, // core width / core height
};

/** An empty source-form design. */
export function emptyDesign(name = "untitled") {
  return { name, ports: [], instances: [], constraints: { ...DEFAULT_CONSTRAINTS } };
}

/**
 * Turn source form into the compiled database the flow runs on.
 *
 * Returns { name, constraints, cells, ports, nets, warnings, stats }. Cells
 * carry mutable x/y that the placement stages write; everything else is fixed
 * for the lifetime of a run.
 */
export function compile(source) {
  const warnings = [];
  const constraints = { ...DEFAULT_CONSTRAINTS, ...(source.constraints || {}) };

  const ports = (source.ports || []).map((p, i) => ({
    index: i,
    name: p.name,
    dir: p.dir === "output" ? "output" : "input",
    x: 0,
    y: 0,
  }));

  const cells = [];
  for (const inst of source.instances || []) {
    let def;
    try {
      def = cellDef(inst.type);
    } catch (err) {
      warnings.push({ level: "error", text: `instance ${inst.name}: ${err.message}` });
      continue;
    }
    cells.push({
      index: cells.length,
      name: inst.name,
      type: inst.type,
      width: def.width,
      height: def.height,
      kind: def.kind,
      // Placement state. Origin is the cell's lower-left corner.
      x: 0,
      y: 0,
      orient: "N",
      fixed: Boolean(inst.fixed),
    });
  }

  const cellByName = new Map(cells.map((c) => [c.name, c]));
  const portByName = new Map(ports.map((p) => [p.name, p]));

  // Gather terminals per net name before deciding which one is the driver, so
  // that a multiply-driven net can be reported rather than silently resolved.
  const buckets = new Map();
  const bucket = (netName) => {
    let b = buckets.get(netName);
    if (!b) {
      b = { name: netName, drivers: [], sinks: [], clocked: false };
      buckets.set(netName, b);
    }
    return b;
  };

  for (const p of ports) {
    // A primary input drives logic inside the block; a primary output loads it.
    // A port normally shares its net's name, but `net` can override that.
    const netName = p.net || p.name;
    const term = { port: true, index: p.index, pin: p.name, dx: 0, dy: 0 };
    if (p.dir === "input") bucket(netName).drivers.push(term);
    else bucket(netName).sinks.push(term);
  }

  for (const inst of source.instances || []) {
    const cell = cellByName.get(inst.name);
    if (!cell) continue;
    const def = cellDef(cell.type);
    const conns = inst.conns || {};

    for (const pin of def.pins) {
      const netName = conns[pin.name];
      if (!netName) {
        warnings.push({ level: "warn", text: `${inst.name}/${pin.name} is unconnected` });
        continue;
      }
      const term = {
        port: false,
        index: cell.index,
        pin: pin.name,
        dx: pin.x,
        dy: pin.y,
      };
      const b = bucket(netName);
      if (pin.dir === "output") b.drivers.push(term);
      else {
        b.sinks.push(term);
        if (pin.dir === "clock") b.clocked = true;
      }
    }

    for (const key of Object.keys(conns)) {
      if (!def.pins.some((p) => p.name === key)) {
        warnings.push({ level: "warn", text: `${inst.name} has no pin "${key}"` });
      }
    }
  }

  const nets = [];
  for (const b of buckets.values()) {
    if (b.drivers.length === 0) {
      warnings.push({ level: "error", text: `net ${b.name} has no driver` });
    } else if (b.drivers.length > 1) {
      warnings.push({ level: "error", text: `net ${b.name} is driven by ${b.drivers.length} pins` });
    }
    if (b.sinks.length === 0) {
      warnings.push({ level: "warn", text: `net ${b.name} has no load` });
    }
    nets.push({
      index: nets.length,
      name: b.name,
      driver: b.drivers[0] || null,
      sinks: b.sinks,
      isClock: b.clocked,
      // Every terminal, driver first. The placer only ever wants this list.
      terminals: [...(b.drivers[0] ? [b.drivers[0]] : []), ...b.sinks],
    });
  }

  const design = {
    name: source.name || "untitled",
    constraints,
    cells,
    ports,
    nets,
    warnings,
    floorplan: null,
  };
  design.stats = designStats(design);
  return design;
}

export function designStats(design) {
  let area = 0;
  let seq = 0;
  let maxFanout = 0;
  let pinCount = 0;

  for (const c of design.cells) {
    area += c.width * c.height;
    if (c.kind === "seq") seq += 1;
  }
  for (const n of design.nets) {
    pinCount += n.terminals.length;
    maxFanout = Math.max(maxFanout, n.sinks.length);
  }

  return {
    cells: design.cells.length,
    sequential: seq,
    ports: design.ports.length,
    nets: design.nets.length,
    pins: pinCount,
    cellArea: area,
    avgFanout: design.nets.length ? (pinCount - design.nets.length) / design.nets.length : 0,
    maxFanout,
  };
}

/* ------------------------------------------------------------------ */
/* source-form builder, used by the presets                            */
/* ------------------------------------------------------------------ */

/**
 * Small helper so a preset can be written as dataflow rather than as a table
 * of net names. `gate` invents a net name for each output and returns it, so
 * expressions compose: xor(a, xor(b, c)).
 */
export function builder(name) {
  const ports = [];
  const instances = [];
  const counters = new Map();
  // net name -> output port name. Applied at build() so that declaration order
  // does not matter: a net can be read by other gates after it is made a port.
  const aliases = new Map();

  const uniq = (prefix) => {
    const n = (counters.get(prefix) || 0) + 1;
    counters.set(prefix, n);
    return `${prefix}${n}`;
  };

  const api = {
    /** Declare a primary input. Returns the net it drives. */
    input(portName) {
      ports.push({ name: portName, dir: "input" });
      return portName;
    },

    /**
     * Declare a primary output fed by `net`. The net is renamed to the port
     * name at build time rather than buffered, so the port and its driver
     * share one net and the text form round-trips.
     */
    output(portName, net) {
      ports.push({ name: portName, dir: "output" });
      if (net && net !== portName && !aliases.has(net)) aliases.set(net, portName);
      return portName;
    },

    /**
     * Instantiate a combinational cell. `conns` maps input pin names to nets.
     * The output net is created automatically unless `out` is given.
     */
    gate(type, conns, out) {
      // Tool-generated net names are prefixed so they cannot collide with the
      // port and signal names a design author picks, the same reason real
      // synthesis emits things like n_1043.
      const y = out || uniq("n_");
      const instName = uniq(type.toLowerCase() + "_");
      instances.push({
        name: instName,
        type,
        conns: { ...conns, [outputPin(type)]: y },
      });
      return y;
    },

    /** A flip-flop. Returns its Q net. */
    dff(d, clk, out) {
      const q = out || uniq("q_");
      instances.push({
        name: uniq("dff_"),
        type: "DFF",
        conns: { D: d, CK: clk, Q: q },
      });
      return q;
    },

    inv: (a, out) => api.gate("INV", { A: a }, out),
    buf: (a, out) => api.gate("BUF", { A: a }, out),
    nand: (a, b, out) => api.gate("NAND2", { A: a, B: b }, out),
    nor: (a, b, out) => api.gate("NOR2", { A: a, B: b }, out),
    and: (a, b, out) => api.gate("AND2", { A: a, B: b }, out),
    or: (a, b, out) => api.gate("OR2", { A: a, B: b }, out),
    xor: (a, b, out) => api.gate("XOR2", { A: a, B: b }, out),
    xnor: (a, b, out) => api.gate("XNOR2", { A: a, B: b }, out),
    mux: (a, b, s, out) => api.gate("MUX2", { A: a, B: b, S: s }, out),

    build(constraints) {
      const rename = (net) => aliases.get(net) || net;
      const resolved = instances.map((inst) => ({
        ...inst,
        conns: Object.fromEntries(
          Object.entries(inst.conns).map(([pin, net]) => [pin, rename(net)])
        ),
      }));
      return {
        name,
        ports,
        instances: resolved,
        constraints: { ...DEFAULT_CONSTRAINTS, ...(constraints || {}) },
      };
    },
  };

  return api;
}

/* ------------------------------------------------------------------ */
/* text form                                                           */
/* ------------------------------------------------------------------ */

/**
 * A deliberately small netlist language, so a design can be typed or pasted:
 *
 *     # comments run to end of line
 *     input  clk a b
 *     output sum
 *     NAND2 u1 A=a B=b Y=n1
 *     INV   u2 A=n1 Y=sum
 *
 * Commas are accepted anywhere whitespace is, because people type them.
 */
export function parseNetlist(text, name = "typed") {
  const ports = [];
  const instances = [];
  const errors = [];
  const seenInst = new Set();

  const lines = String(text || "").split("\n");
  lines.forEach((raw, i) => {
    const line = raw.replace(/#.*$/, "").replace(/,/g, " ").trim();
    if (!line) return;
    const tok = line.split(/\s+/);
    const head = tok[0].toLowerCase();
    const at = i + 1;

    if (head === "input" || head === "output") {
      if (tok.length < 2) errors.push(`line ${at}: ${head} needs at least one name`);
      for (const p of tok.slice(1)) {
        if (ports.some((q) => q.name === p)) errors.push(`line ${at}: port ${p} declared twice`);
        else ports.push({ name: p, dir: head });
      }
      return;
    }

    // Anything else is a cell instantiation: TYPE instName PIN=net ...
    const type = tok[0].toUpperCase();
    let def;
    try {
      def = cellDef(type);
    } catch {
      errors.push(`line ${at}: unknown cell type "${tok[0]}"`);
      return;
    }
    if (tok.length < 3) {
      errors.push(`line ${at}: ${type} needs an instance name and connections`);
      return;
    }
    const instName = tok[1];
    if (instName.includes("=")) {
      errors.push(`line ${at}: missing instance name before "${instName}"`);
      return;
    }
    if (seenInst.has(instName)) errors.push(`line ${at}: instance ${instName} declared twice`);
    seenInst.add(instName);

    const conns = {};
    for (const pair of tok.slice(2)) {
      const eq = pair.indexOf("=");
      if (eq < 1) {
        errors.push(`line ${at}: expected PIN=net, got "${pair}"`);
        continue;
      }
      const pin = pair.slice(0, eq).toUpperCase();
      const net = pair.slice(eq + 1);
      if (!def.pins.some((p) => p.name === pin)) {
        errors.push(`line ${at}: ${type} has no pin "${pin}"`);
        continue;
      }
      if (!net) {
        errors.push(`line ${at}: pin ${pin} has no net`);
        continue;
      }
      conns[pin] = net;
    }
    instances.push({ name: instName, type, conns });
  });

  return { design: { name, ports, instances, constraints: { ...DEFAULT_CONSTRAINTS } }, errors };
}

/** Render source form back to the text language, so the editor round-trips. */
export function toNetlistText(source) {
  const out = [];
  const ins = (source.ports || []).filter((p) => p.dir === "input").map((p) => p.name);
  const outs = (source.ports || []).filter((p) => p.dir === "output").map((p) => p.name);
  if (ins.length) out.push(`input  ${ins.join(" ")}`);
  if (outs.length) out.push(`output ${outs.join(" ")}`);
  if (out.length) out.push("");

  const pad = Math.max(0, ...(source.instances || []).map((i) => i.type.length));
  for (const inst of source.instances || []) {
    const conns = Object.entries(inst.conns || {})
      .map(([pin, net]) => `${pin}=${net}`)
      .join(" ");
    out.push(`${inst.type.padEnd(pad)} ${inst.name} ${conns}`);
  }
  return out.join("\n");
}

/** Total cell area, the number the floorplan is sized from. */
export function totalCellArea(design) {
  return design.cells.reduce((a, c) => a + c.width * c.height, 0);
}
