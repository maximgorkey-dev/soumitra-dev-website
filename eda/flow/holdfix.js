/**
 * Hold fixing, the part of post-clock-tree optimisation that this flow runs.
 *
 * A hold check fails when new data reaches a flop before the clock edge that
 * should capture the old data has finished doing so. Once the clock tree
 * exists, every flop sees its clock late by the tree's insertion delay, while
 * data from a primary input is launched relative to the ideal clock at the
 * port. So the shortest input-to-flop paths are the usual victims, and clock
 * skew between two flops does the same to short register-to-register paths.
 *
 * The fix is to make those paths slower without making them too slow. For
 * each failing flop input, a delay cell (or a plain buffer when only a little
 * is missing) is spliced into the wire right in front of it, which delays
 * that one endpoint and nothing else. It is only done when the endpoint's
 * setup slack can absorb the added delay; otherwise the hold violation is
 * reported rather than traded for a setup violation.
 *
 * Runs before routing, as real flows do, so it times on placement-based wire
 * estimates. Signoff timing after detail routing checks the result again.
 */

import { LIBRARY } from "../core/library.js";
import { terminalPos } from "../core/metrics.js";
import { addCell, addNet, cellTerm, placeNear, refreshStats, setSinks } from "../core/eco.js";
import { staticTiming, sinkCapOf } from "./sta.js";

/** Hold slack every fixed endpoint should end up with, as a guard band for routing. */
const HOLD_TARGET = 15;
/** Setup slack an endpoint must keep after a cell is added in front of it. */
const SETUP_KEEP = 25;
const MAX_PASSES = 4;

/** Rough delay of `type` driving one flop input over a short wire. */
function cellDelay(type, loadCap) {
  const def = LIBRARY[type];
  return def.intrinsic.A + def.driveRes * (loadCap + 1);
}

export function* fixHold(design) {
  let sta = staticTiming(design);
  const before = { whs: sta.metrics.whs, violations: sta.metrics.holdViolations, wns: sta.metrics.wns };
  const inserted = [];
  const blocked = new Set();
  const noSlack = new Set();
  const noRoom = new Set();
  let area = 0;

  for (let pass = 0; pass < MAX_PASSES; pass++) {
    const failing = sta.endpoints
      .filter((e) => e.hold !== undefined && e.hold < HOLD_TARGET && !blocked.has(e.name))
      .sort((a, b) => a.hold - b.hold);
    if (!failing.length) break;

    for (const e of failing) {
      const missing = HOLD_TARGET - e.hold;
      const cap = sinkCapOf(design, e.term);
      const type = cellDelay("BUF", cap) >= missing ? "BUF" : "DLY";
      const added = cellDelay(type, cap);
      if (e.slack - added < SETUP_KEEP) {
        blocked.add(e.name);
        noSlack.add(e.name);
        continue;
      }

      const flop = design.cells[e.term.index];
      const net = design.nets[e.net];
      const pin = terminalPos(design, e.term);
      const cell = addCell(design, type, `hold_${flop.name}`, "hold");
      // Just in front of the pin it protects, so its own output wire is short.
      if (placeNear(design, cell, pin.x - cell.width, pin.y) === null) {
        design.cells.pop();
        blocked.add(e.name);
        noRoom.add(e.name);
        continue;
      }
      setSinks(net, net.sinks.map((s) => (s === e.term ? cellTerm(cell, "A") : s)));
      addNet(design, `${net.name}_hold_${flop.name}`, cellTerm(cell, "Y"), [e.term], false);
      inserted.push({ cell: cell.index, endpoint: e.name, type });
      area += cell.width * cell.height;
    }

    sta = staticTiming(design);
    yield { pass: pass + 1, inserted: inserted.length, whs: sta.metrics.whs, violations: sta.metrics.holdViolations };
  }
  refreshStats(design);

  const m = sta.metrics;
  const dly = inserted.filter((i) => i.type === "DLY").length;
  const logs = [];
  if (before.whs === null) {
    logs.push("No flops, so there are no hold checks to fix.");
  } else if (!inserted.length && !blocked.size) {
    logs.push(`Every hold check already has at least ${HOLD_TARGET} ps of slack; nothing to insert.`);
  } else {
    logs.push(
      `Hold slack ${before.whs.toFixed(0)} ps with ${before.violations} violations before; ` +
        `${m.whs.toFixed(0)} ps with ${m.holdViolations} after`,
      `Inserted ${inserted.length} cells (${dly} DLY, ${inserted.length - dly} BUF), ${(area / 1e6).toFixed(1)} um2; ` +
        `worst setup slack ${before.wns.toFixed(0)} -> ${m.wns.toFixed(0)} ps`
    );
  }
  const plural = (n) => `${n} endpoint${n === 1 ? "" : "s"}`;
  if (noSlack.size) logs.push(`${plural(noSlack.size)} left unfixed: not enough setup slack to absorb a delay cell.`);
  if (noRoom.size) logs.push(`${plural(noRoom.size)} left unfixed: no free site for a delay cell. Lower the utilisation to leave room.`);
  return {
    metrics: {
      inserted: inserted.length,
      delayCells: dly,
      area,
      whsBefore: before.whs,
      whs: m.whs,
      violationsBefore: before.violations,
      holdViolations: m.holdViolations,
      wnsBefore: before.wns,
      wns: m.wns,
      unfixed: blocked.size,
    },
    logs,
  };
}

