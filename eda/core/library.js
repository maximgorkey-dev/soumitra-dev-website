/**
 * A miniature standard-cell library, in the spirit of a Liberty file plus the
 * geometry half of a LEF.
 *
 * Phase 1 (floorplan, placement, legalisation) reads only `width`, `height`
 * and the pin offsets. The timing fields are populated now so that static
 * timing analysis can be added without reshaping this file: delays follow the
 * usual first-order form
 *
 *     arc delay = intrinsic + driveRes * loadCap
 *
 * with resistance in kilohms and capacitance in femtofarads, which makes the
 * product picoseconds. Every timing number in this file is therefore in ps.
 *
 * Pin offsets are relative to the cell origin (its lower-left corner) and sit
 * on M1 track centres, i.e. y in {100, 300, ... 1500} for a 1600 dbu row.
 * Inputs are biased to the left of the cell and outputs to the right, which is
 * both conventional and useful here: it gives wirelength a sense of direction.
 */

import { TECH } from "./tech.js";

const ROW = TECH.rowHeight;

/**
 * kind drives both colour in the layout view and behaviour in later stages:
 *   comb — combinational logic
 *   buf  — buffers and inverters, the things a tool inserts for you
 *   seq  — flip-flops, which terminate timing paths and need a clock
 */
function cell(def) {
  return { height: ROW, kind: "comb", ...def };
}

export const LIBRARY = {
  INV: cell({
    name: "INV", width: 400, kind: "buf", driveRes: 5.0,
    pins: [
      { name: "A", dir: "input", x: 100, y: 700, cap: 2.0 },
      { name: "Y", dir: "output", x: 300, y: 900 },
    ],
    intrinsic: { A: 12 },
    inverting: true,
  }),

  BUF: cell({
    name: "BUF", width: 600, kind: "buf", driveRes: 3.5,
    pins: [
      { name: "A", dir: "input", x: 100, y: 700, cap: 2.2 },
      { name: "Y", dir: "output", x: 500, y: 900 },
    ],
    intrinsic: { A: 22 },
  }),

  // A high-drive buffer. Clock tree synthesis will reach for this one.
  BUFX4: cell({
    name: "BUFX4", width: 1000, kind: "buf", driveRes: 1.2,
    pins: [
      { name: "A", dir: "input", x: 100, y: 700, cap: 6.0 },
      { name: "Y", dir: "output", x: 900, y: 900 },
    ],
    intrinsic: { A: 26 },
  }),

  NAND2: cell({
    name: "NAND2", width: 600, driveRes: 6.0,
    pins: [
      { name: "A", dir: "input", x: 100, y: 500, cap: 2.4 },
      { name: "B", dir: "input", x: 300, y: 1100, cap: 2.4 },
      { name: "Y", dir: "output", x: 500, y: 700 },
    ],
    intrinsic: { A: 18, B: 20 },
    inverting: true,
  }),

  NOR2: cell({
    name: "NOR2", width: 600, driveRes: 7.5,
    pins: [
      { name: "A", dir: "input", x: 100, y: 500, cap: 2.6 },
      { name: "B", dir: "input", x: 300, y: 1100, cap: 2.6 },
      { name: "Y", dir: "output", x: 500, y: 700 },
    ],
    intrinsic: { A: 22, B: 24 },
    inverting: true,
  }),

  AND2: cell({
    name: "AND2", width: 800, driveRes: 5.5,
    pins: [
      { name: "A", dir: "input", x: 100, y: 500, cap: 2.4 },
      { name: "B", dir: "input", x: 100, y: 1100, cap: 2.4 },
      { name: "Y", dir: "output", x: 700, y: 700 },
    ],
    intrinsic: { A: 30, B: 32 },
  }),

  OR2: cell({
    name: "OR2", width: 800, driveRes: 5.8,
    pins: [
      { name: "A", dir: "input", x: 100, y: 500, cap: 2.6 },
      { name: "B", dir: "input", x: 100, y: 1100, cap: 2.6 },
      { name: "Y", dir: "output", x: 700, y: 700 },
    ],
    intrinsic: { A: 32, B: 34 },
  }),

  XOR2: cell({
    name: "XOR2", width: 1200, driveRes: 6.5,
    pins: [
      { name: "A", dir: "input", x: 100, y: 500, cap: 3.2 },
      { name: "B", dir: "input", x: 300, y: 1100, cap: 3.2 },
      { name: "Y", dir: "output", x: 1100, y: 700 },
    ],
    intrinsic: { A: 45, B: 48 },
  }),

  XNOR2: cell({
    name: "XNOR2", width: 1200, driveRes: 6.5,
    pins: [
      { name: "A", dir: "input", x: 100, y: 500, cap: 3.2 },
      { name: "B", dir: "input", x: 300, y: 1100, cap: 3.2 },
      { name: "Y", dir: "output", x: 1100, y: 700 },
    ],
    intrinsic: { A: 47, B: 50 },
    inverting: true,
  }),

  MUX2: cell({
    name: "MUX2", width: 1400, driveRes: 6.0,
    pins: [
      { name: "A", dir: "input", x: 100, y: 300, cap: 3.0 },
      { name: "B", dir: "input", x: 100, y: 900, cap: 3.0 },
      { name: "S", dir: "input", x: 300, y: 1500, cap: 3.4 },
      { name: "Y", dir: "output", x: 1300, y: 700 },
    ],
    intrinsic: { A: 52, B: 54, S: 60 },
  }),

  DFF: cell({
    name: "DFF", width: 2400, kind: "seq", driveRes: 4.0,
    pins: [
      { name: "D", dir: "input", x: 100, y: 500, cap: 2.8 },
      { name: "CK", dir: "clock", x: 300, y: 1300, cap: 4.5 },
      { name: "Q", dir: "output", x: 2300, y: 700 },
    ],
    // Sequential arcs: CK->Q is a delay, and D must be stable around CK.
    intrinsic: { CK: 80 },
    setup: 35,
    hold: 10,
    clockPin: "CK",
  }),
};

/** Cells the clock tree is allowed to insert, weakest drive first. */
export const CLOCK_BUFFERS = ["BUF", "BUFX4"];

export function cellDef(type) {
  const def = LIBRARY[type];
  if (!def) throw new Error(`unknown cell type "${type}"`);
  return def;
}

export function pinDef(type, pinName) {
  const def = cellDef(type);
  const pin = def.pins.find((p) => p.name === pinName);
  if (!pin) throw new Error(`cell ${type} has no pin "${pinName}"`);
  return pin;
}

export const cellWidth = (type) => cellDef(type).width;
export const cellArea = (type) => cellDef(type).width * cellDef(type).height;
export const widthInSites = (type) => cellDef(type).width / TECH.siteWidth;

/**
 * Absolute position of a pin on a placed instance.
 *
 * Rows alternate orientation so that neighbouring cells can share power rails,
 * which means every other row holds cells mirrored about their horizontal
 * axis. "FS" is the LEF/DEF name for that flip, and it moves pins in y.
 */
export function pinPos(inst, pinName) {
  const def = cellDef(inst.type);
  const pin = def.pins.find((p) => p.name === pinName);
  if (!pin) throw new Error(`cell ${inst.type} has no pin "${pinName}"`);
  return {
    x: inst.x + pin.x,
    y: inst.y + (inst.orient === "FS" ? def.height - pin.y : pin.y),
  };
}

/** The output pin name of a cell type. Every cell in this library has one. */
export function outputPin(type) {
  const pin = cellDef(type).pins.find((p) => p.dir === "output");
  if (!pin) throw new Error(`cell ${type} has no output`);
  return pin.name;
}

export function inputPins(type) {
  return cellDef(type).pins.filter((p) => p.dir === "input" || p.dir === "clock");
}
