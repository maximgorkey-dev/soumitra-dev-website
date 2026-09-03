/**
 * Self-test for the flow core.
 *
 * Nothing under core/ or flow/ touches a browser API, so the whole pipeline
 * can be driven headless. This checks the invariants the UI cannot easily
 * show: that every preset compiles clean, that a floorplan always has room
 * for its cells, that legalisation produces a genuinely legal placement
 * rather than a plausible-looking one, and that runs are reproducible.
 *
 * Run it from the browser console on /eda/:
 *
 *     const t = await import("/eda/selftest.js"); console.log(t.report());
 *
 * It is never imported by the app, so it costs a visitor nothing.
 */

import { PRESETS } from "./core/presets.js";
import { compile, parseNetlist, toNetlistText } from "./core/netlist.js";
import { floorplan } from "./flow/floorplan.js";
import { globalPlace } from "./flow/globalplace.js";
import { legalize } from "./flow/legalize.js";
import { hpwl, checkLegality, utilization } from "./core/metrics.js";
import { TECH } from "./core/tech.js";

/** Drive a stage generator to completion and hand back its result. */
function drive(gen) {
  let step = gen.next();
  while (!step.done) step = gen.next();
  return step.value;
}

export function runTests() {
  const failures = [];
  const lines = [];
  const say = (text) => lines.push(text);
  const check = (ok, label, detail = "") => {
    if (!ok) failures.push(`${label}${detail ? ` — ${detail}` : ""}`);
    return ok;
  };

  function runFlow(source, label) {
    const design = compile(source);
    const errors = design.warnings.filter((w) => w.level === "error");
    const warns = design.warnings.filter((w) => w.level === "warn");

    check(errors.length === 0, `${label}: netlist errors`, errors.map((e) => e.text).join("; "));
    check(warns.length === 0, `${label}: netlist warnings`, warns.map((e) => e.text).slice(0, 4).join("; "));
    check(design.cells.length > 0, `${label}: has cells`);

    for (const net of design.nets) {
      check(net.driver !== null, `${label}: net ${net.name} is undriven`);
      check(net.sinks.length > 0, `${label}: net ${net.name} has no load`);
    }

    floorplan(design);
    const fp = design.floorplan;
    const cellWidth = design.cells.reduce((a, c) => a + c.width, 0);
    check(
      fp.rows.length * fp.core.w >= cellWidth,
      `${label}: floorplan has room`,
      `capacity ${fp.rows.length * fp.core.w} < cells ${cellWidth}`
    );
    check(
      fp.core.x % TECH.siteWidth === 0 && fp.core.y % TECH.rowHeight === 0,
      `${label}: core origin sits on the grid`
    );

    const t0 = Date.now();
    const place = drive(globalPlace(design, {}));
    const placeMs = Date.now() - t0;

    check(Number.isFinite(hpwl(design)) && hpwl(design) > 0, `${label}: wirelength is finite`);
    check(place.metrics.overflow < 0.35, `${label}: overflow came down`, place.metrics.overflow.toFixed(3));

    // Global placement must never leave a cell hanging outside the core.
    for (const c of design.cells) {
      const inside =
        c.x >= fp.core.x - 1e-6 &&
        c.y >= fp.core.y - 1e-6 &&
        c.x + c.width <= fp.core.x + fp.core.w + 1e-6 &&
        c.y + c.height <= fp.core.y + fp.core.h + 1e-6;
      if (!check(inside, `${label}: ${c.name} left the core during placement`)) break;
    }

    const t1 = Date.now();
    const legal = drive(legalize(design, {}));
    const legalMs = Date.now() - t1;

    const legality = checkLegality(design);
    check(
      legality.ok,
      `${label}: placement is legal`,
      `overlaps=${legality.overlaps.length} offGrid=${legality.offGrid.length} outside=${legality.outside.length}`
    );
    check(legal.metrics.unplaced === 0, `${label}: every cell placed`, `${legal.metrics.unplaced} unplaced`);

    // Legality costs wirelength, but a sane global placement should not need
    // rearranging wholesale. A big jump means something upstream is wrong.
    check(
      legal.metrics.hpwlDelta < 0.6,
      `${label}: cost of legality is reasonable`,
      `${(100 * legal.metrics.hpwlDelta).toFixed(1)}%`
    );

    say(
      `  ${label.padEnd(12)}` +
        `${String(design.cells.length).padStart(4)} cells` +
        `${String(design.nets.length).padStart(5)} nets` +
        `   util ${(100 * utilization(design)).toFixed(1).padStart(5)}%` +
        `   wl ${(legal.metrics.hpwl / 1000).toFixed(1).padStart(7)}um` +
        `   dWL ${(100 * legal.metrics.hpwlDelta).toFixed(1).padStart(6)}%` +
        `   ovf ${(100 * place.metrics.overflow).toFixed(1).padStart(5)}%` +
        `   disp ${(legal.metrics.avgDisplacement / 1000).toFixed(2).padStart(6)}um` +
        `   ${String(place.metrics.iterations).padStart(3)}it ${placeMs + legalMs}ms`
    );

    return { design, place, legal };
  }

  /* ---------------- presets ---------------- */

  say("presets");
  for (const preset of PRESETS) runFlow(preset.build(), preset.id);

  /* ---------------- constraint sweeps ---------------- */

  say("");
  say("utilisation sweep (adder8)");
  for (const util of [0.3, 0.5, 0.7, 0.85]) {
    const source = PRESETS.find((p) => p.id === "adder8").build();
    source.constraints = { ...source.constraints, utilization: util };
    runFlow(source, `util ${util}`);
  }

  say("");
  say("aspect ratio sweep (accum8)");
  for (const ratio of [0.5, 1, 2]) {
    const source = PRESETS.find((p) => p.id === "accum8").build();
    source.constraints = { ...source.constraints, aspectRatio: ratio };
    runFlow(source, `ar ${ratio}`);
  }

  /* ---------------- text round-trip ---------------- */

  say("");
  say("text form");
  for (const preset of PRESETS) {
    const source = preset.build();
    const { design: reparsed, errors } = parseNetlist(toNetlistText(source), preset.id);
    check(errors.length === 0, `${preset.id}: text round-trip parses`, errors.slice(0, 3).join("; "));

    const a = compile(source);
    const b = compile(reparsed);
    check(a.cells.length === b.cells.length, `${preset.id}: cell count survives round-trip`);
    check(
      a.nets.length === b.nets.length,
      `${preset.id}: net count survives round-trip`,
      `${a.nets.length} vs ${b.nets.length}`
    );
    check(
      b.warnings.filter((w) => w.level === "error").length === 0,
      `${preset.id}: round-trip is error free`
    );
  }
  say(`  round-tripped ${PRESETS.length} presets through the text form`);

  /* ---------------- parser diagnostics ---------------- */

  say("");
  say("parser diagnostics (all of these lines are meant to fail)");
  const bad = parseNetlist(
    [
      "input a b",
      "output y",
      "NAND2 u1 A=a B=b Y=n1",
      "FROBNICATE u2 A=n1 Y=y",
      "INV u3 Z=n1 Y=y",
      "NAND2 u1 A=a B=b Y=n2",
      "INV A=n1 Y=y",
    ].join("\n")
  );
  check(bad.errors.length >= 4, "parser reports the bad lines", `only ${bad.errors.length} errors`);
  for (const e of bad.errors) say(`  ${e}`);

  /* ---------------- determinism ---------------- */

  say("");
  say("determinism");
  const a = runFlow(PRESETS.find((p) => p.id === "alu4").build(), "alu4 run 1");
  const b = runFlow(PRESETS.find((p) => p.id === "alu4").build(), "alu4 run 2");
  check(
    a.legal.metrics.hpwl === b.legal.metrics.hpwl,
    "the same design twice gives identical wirelength",
    `${a.legal.metrics.hpwl} vs ${b.legal.metrics.hpwl}`
  );

  /* ---------------- edge cases ---------------- */

  say("");
  say("edge cases");
  try {
    floorplan(compile({ name: "empty", ports: [], instances: [], constraints: {} }));
    check(false, "an empty design should be rejected");
  } catch (err) {
    check(/no placeable cells/.test(err.message), "empty design fails clearly", err.message);
    say(`  empty design: ${err.message}`);
  }

  const single = compile({
    name: "single",
    ports: [
      { name: "a", dir: "input" },
      { name: "y", dir: "output" },
    ],
    instances: [{ name: "u1", type: "INV", conns: { A: "a", Y: "y" } }],
    constraints: {},
  });
  floorplan(single);
  drive(globalPlace(single, {}));
  drive(legalize(single, {}));
  check(checkLegality(single).ok, "a one-cell design legalises");
  say("  one-cell design legalises");

  return { ok: failures.length === 0, failures, lines };
}

// Short tags for why global placement stopped, so a sweep line stays readable.
const STOP_TAG = {
  "target overflow reached, wirelength settled": "target",
  "overflow stopped improving": "plateau",
  "iteration cap": "CAPPED",
};

/**
 * Placement tuning harness.
 *
 * Runs every preset with one set of placement options and summarises the
 * result, so the balance between wirelength and spreading can be explored from
 * the console rather than by guessing:
 *
 *     const t = await import("/eda/selftest.js");
 *     console.log(t.sweep({ stepScale: 0.6, iterations: 180 }));
 *
 * Constraints can be overridden too, since utilisation and aspect ratio change
 * the problem more than any placer option does:
 *
 *     console.log(t.sweep({}, { constraints: { utilization: 0.85 } }));
 */
export function sweep(placeOpts = {}, { presetIds = null, constraints = null } = {}) {
  const ids = presetIds || PRESETS.map((p) => p.id);
  const lines = [];
  let worstOverflow = 0;
  let worstDelta = 0;
  let totalMs = 0;
  let illegal = 0;

  for (const id of ids) {
    const design = compile(PRESETS.find((p) => p.id === id).build());
    if (constraints) Object.assign(design.constraints, constraints);
    floorplan(design);

    const t0 = Date.now();
    const place = drive(globalPlace(design, placeOpts));
    const legal = drive(legalize(design, {}));
    totalMs += Date.now() - t0;

    const ok = checkLegality(design).ok;
    if (!ok) illegal += 1;
    worstOverflow = Math.max(worstOverflow, place.metrics.overflow);
    worstDelta = Math.max(worstDelta, legal.metrics.hpwlDelta);

    lines.push(
      `  ${id.padEnd(9)}` +
        ` ovf ${(100 * place.metrics.overflow).toFixed(1).padStart(5)}%` +
        ` peak ${place.metrics.peakDensity.toFixed(2).padStart(5)}` +
        ` wl ${(legal.metrics.hpwl / 1000).toFixed(1).padStart(7)}um` +
        ` dWL ${(100 * legal.metrics.hpwlDelta).toFixed(1).padStart(6)}%` +
        ` disp ${(legal.metrics.avgDisplacement / 1000).toFixed(2).padStart(5)}um` +
        ` ${String(place.metrics.iterations).padStart(3)}it` +
        ` ${STOP_TAG[place.metrics.stopReason] || "?"}` +
        (ok ? "" : "  ILLEGAL")
    );
  }

  lines.push(
    `  => worst overflow ${(100 * worstOverflow).toFixed(1)}%, ` +
      `worst dWL ${(100 * worstDelta).toFixed(1)}%, ` +
      `${illegal} illegal, ${totalMs}ms total`
  );
  return lines.join("\n");
}

/** Human-readable transcript, for pasting into a console. */
export function report() {
  const r = runTests();
  const out = [...r.lines, ""];
  out.push(r.ok ? "all checks passed" : `${r.failures.length} CHECK(S) FAILED:`);
  for (const f of r.failures) out.push(`  FAIL  ${f}`);
  return out.join("\n");
}
