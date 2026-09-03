/**
 * Ready-made gate-level designs.
 *
 * These exist so the app is useful in the first five seconds: pick one, press
 * Run, watch a flow happen. Building a netlist by hand is the second thing you
 * do here, not the first.
 *
 * They are written as generators rather than stored as data because a netlist
 * with a hundred instances is unreadable and unmaintainable as a literal, and
 * because sharing the adder generator between three designs means there is one
 * carry chain to get right rather than three.
 *
 * Synthesis is deliberately out of scope, so everything here is already mapped
 * to the cell library — which is exactly what a placer expects as input.
 */

import { builder } from "./netlist.js";

const bits = (n) => Array.from({ length: n }, (_, i) => i);

/**
 * Ripple-carry adder bit slice: sum = a ^ b ^ cin, cout = ab + cin(a ^ b).
 * Returns the carry out, so slices chain by threading the return value.
 */
function fullAdder(b, a, bIn, cin) {
  const axb = b.xor(a, bIn);
  const sum = b.xor(axb, cin);
  const ab = b.and(a, bIn);
  const cx = b.and(cin, axb);
  return { sum, cout: b.or(ab, cx) };
}

function rippleAdder(width, name) {
  const b = builder(name);
  const a = bits(width).map((i) => b.input(`a${i}`));
  const y = bits(width).map((i) => b.input(`b${i}`));
  let carry = b.input("cin");

  for (const i of bits(width)) {
    const fa = fullAdder(b, a[i], y[i], carry);
    b.output(`s${i}`, fa.sum);
    carry = fa.cout;
  }
  b.output("cout", carry);
  return b.build();
}

/**
 * Synchronous up-counter. Bit i toggles when every lower bit is set, so the
 * enable term ripples through an AND chain — a short, deep timing path that
 * makes a good example once static timing analysis is in.
 */
function counter(width, name) {
  const b = builder(name);
  const clk = b.input("clk");
  let enable = b.input("en");

  // Flip-flop outputs are referenced before the flops are instantiated. Nets
  // are just names, so declaration order does not matter to the compiler.
  const q = bits(width).map((i) => `state${i}`);

  for (const i of bits(width)) {
    const d = b.xor(q[i], enable);
    b.dff(d, clk, q[i]);
    enable = b.and(enable, q[i]);
  }
  for (const i of bits(width)) b.output(`count${i}`, q[i]);
  b.output("carryout", enable);
  return b.build();
}

/**
 * Shift register with taps. Every flop's clock pin hangs off one net, so the
 * clock has a fanout of `width` — well past the max_fanout constraint, which
 * is precisely the problem clock tree synthesis exists to solve.
 */
function shiftRegister(width, name) {
  const b = builder(name);
  const clk = b.input("clk");
  let d = b.input("din");

  for (const i of bits(width)) {
    d = b.dff(d, clk, `stage${i}`);
    if ((i + 1) % 4 === 0 && i + 1 < width) b.output(`tap${i + 1}`, d);
  }
  b.output("dout", d);
  return b.build();
}

/**
 * Accumulator: an adder whose result is registered and fed back into its own
 * input. The feedback means placement cannot simply lay the design out left to
 * right, which shows up clearly as clustering.
 */
function accumulator(width, name) {
  const b = builder(name);
  const clk = b.input("clk");
  const x = bits(width).map((i) => b.input(`x${i}`));
  let carry = b.input("cin");
  const acc = bits(width).map((i) => `acc${i}`);

  for (const i of bits(width)) {
    const fa = fullAdder(b, x[i], acc[i], carry);
    b.dff(fa.sum, clk, acc[i]);
    carry = fa.cout;
  }
  for (const i of bits(width)) b.output(`q${i}`, acc[i]);
  b.output("cout", carry);
  return b.build();
}

/**
 * Four-function ALU: AND, OR, XOR and ADD, selected by a two-bit opcode
 * through a mux tree. The select nets fan out across the whole datapath, which
 * pulls the placement into a recognisable bit-sliced shape.
 */
function alu(width, name) {
  const b = builder(name);
  const a = bits(width).map((i) => b.input(`a${i}`));
  const y = bits(width).map((i) => b.input(`b${i}`));
  const op0 = b.input("op0");
  const op1 = b.input("op1");
  let carry = b.input("cin");

  for (const i of bits(width)) {
    const andOp = b.and(a[i], y[i]);
    const orOp = b.or(a[i], y[i]);
    const xorOp = b.xor(a[i], y[i]);
    const fa = fullAdder(b, a[i], y[i], carry);
    carry = fa.cout;

    const lo = b.mux(andOp, orOp, op0);
    const hi = b.mux(xorOp, fa.sum, op0);
    b.output(`r${i}`, b.mux(lo, hi, op1));
  }
  b.output("cout", carry);
  return b.build();
}

/**
 * The catalogue. `cells` is indicative only — the real count comes from
 * compiling — but it lets the picker show sizes without building everything.
 */
export const PRESETS = [
  {
    id: "counter4",
    label: "4-bit counter",
    blurb: "Smallest design here. Sequential, with an enable that ripples through an AND chain.",
    cells: 13,
    build: () => counter(4, "counter4"),
  },
  {
    id: "shift16",
    label: "16-bit shift register",
    blurb: "A long flop chain with tapped outputs. One clock net feeds all sixteen flops.",
    cells: 16,
    build: () => shiftRegister(16, "shift16"),
  },
  {
    id: "adder8",
    label: "8-bit adder",
    blurb: "Purely combinational ripple-carry. The carry chain is the long path.",
    cells: 40,
    build: () => rippleAdder(8, "adder8"),
  },
  {
    id: "alu4",
    label: "4-bit ALU",
    blurb: "AND, OR, XOR and ADD behind a mux tree. Opcode nets fan out across the datapath.",
    cells: 44,
    build: () => alu(4, "alu4"),
  },
  {
    id: "accum8",
    label: "8-bit accumulator",
    blurb: "Adder plus register with feedback, so the placer cannot lay it out in one direction.",
    cells: 48,
    build: () => accumulator(8, "accum8"),
  },
  {
    id: "adder16",
    label: "16-bit adder",
    blurb: "The big one. Enough cells to make global placement take visible work.",
    cells: 80,
    build: () => rippleAdder(16, "adder16"),
  },
];

export const DEFAULT_PRESET = "adder8";

export function presetById(id) {
  return PRESETS.find((p) => p.id === id) || null;
}

export function buildPreset(id) {
  const preset = presetById(id);
  if (!preset) throw new Error(`unknown preset "${id}"`);
  return preset.build();
}
