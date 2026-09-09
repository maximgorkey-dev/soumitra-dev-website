/**
 * Checks a topic module against topics/CONTRACT.md.
 *
 * Every rule in that document that can be checked by a machine is checked
 * here, including importing the module and running its generator. The point is
 * that a file which passes needs no further reading: it can be wired into the
 * catalogue on sight.
 *
 *   node validate.mjs topics/mst-prim.js
 *   node validate.mjs topics/*.js
 */

import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { pathToFileURL } from "node:url";

/* The renderer's whole vocabulary. Kept in step with views/graph.js — anything
   outside it is ignored at runtime, which looks like the animation silently
   not working, so it is worth failing loudly here instead. */
const EDGE_STATES = new Set(["idle", "candidate", "rejected", "accepted"]);
const NODE_STATES = new Set(["idle", "frontier", "visited"]);
const KINDS = new Set(["graph"]);

/* Topics the server-side C++ runner will accept, from CC_TOPICS in server/app.py. */
const CC_TOPICS = new Set(["mst-kruskal", "mst-prim"]);

const MAX_FRAMES = 5000;
const MAX_NODES = 64;          // MAX_CC_NODES in server/app.py
const MIN_FRAMES = 4;

class Report {
  constructor(file) {
    this.file = file;
    this.errors = [];
    this.warnings = [];
  }
  fail(msg) { this.errors.push(msg); return false; }
  warn(msg) { this.warnings.push(msg); }

  /* Asserts and returns whether it held, so callers can skip dependent checks
     rather than cascading one mistake into twenty messages. */
  ok(cond, msg) { return cond ? true : this.fail(msg); }

  str(value, path, { min = 1, max = Infinity } = {}) {
    if (typeof value !== "string") return this.fail(`${path} must be a string, got ${typeof value}`);
    const len = value.trim().length;
    if (len < min) {
      return this.fail(min === 1
        ? `${path} must not be empty`
        : `${path} is only ${len} characters, expected at least ${min}`);
    }
    if (value.length > max) return this.fail(`${path} is ${value.length} chars, limit is ${max}`);
    return true;
  }
}

/* ------------------------------------------------------------------ */
/* static checks on the source text                                     */
/* ------------------------------------------------------------------ */

function checkSource(src, r) {
  const imports = [...src.matchAll(/^\s*import\s.*?from\s+["']([^"']+)["']/gm)].map((m) => m[1]);
  for (const spec of imports) {
    if (spec !== "../core/trace.js") {
      r.fail(`imports "${spec}" — the only permitted import is "../core/trace.js"`);
    }
  }
  if (/\bexport\s+default\b/.test(src)) {
    r.fail("uses a default export; the catalogue imports a named export");
  }
  for (const [pattern, why] of [
    [/\bdocument\b/, "references document"],
    [/\bwindow\b/, "references window"],
    [/\bfetch\s*\(/, "calls fetch"],
    [/\brequire\s*\(/, "uses require; this is an ES module"],
  ]) {
    if (pattern.test(src)) r.fail(`${why} — a topic module must be pure and run outside a browser`);
  }
  for (const [pattern, why] of [
    [/Math\.random\s*\(/, "calls Math.random"],
    [/Date\.now\s*\(|new Date\s*\(/, "reads the clock"],
  ]) {
    if (pattern.test(src)) r.fail(`${why} — run must be deterministic, frames are replayed on scrub`);
  }
}

/* ------------------------------------------------------------------ */
/* the exported object                                                  */
/* ------------------------------------------------------------------ */

function pickTopic(mod, r) {
  const found = Object.entries(mod).filter(
    ([, v]) => v && typeof v === "object" && typeof v.id === "string"
  );
  if (found.length === 0) return r.fail("exports no object with a string `id`"), null;
  if (found.length > 1) {
    return r.fail(`exports ${found.length} topic objects (${found.map(([k]) => k).join(", ")}); expected one`), null;
  }
  return found[0][1];
}

function checkIdentity(alg, file, r) {
  if (r.str(alg.id, "id")) {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(alg.id)) r.fail(`id "${alg.id}" is not kebab-case`);
    const stem = basename(file).replace(/\.js$/, "");
    if (alg.id !== stem) r.fail(`id "${alg.id}" does not match the filename "${stem}.js"`);
  }
  r.str(alg.section, "section");
  r.str(alg.topic, "topic");
  r.str(alg.title, "title");
  if (r.str(alg.blurb, "blurb", { max: 160 })) {
    if (alg.blurb.includes("\n")) r.fail("blurb must be a single line");
  }
}

function checkStructure(s, r) {
  if (!r.ok(s && typeof s === "object", "structure is missing")) return null;
  if (!r.ok(KINDS.has(s.kind), `structure.kind "${s.kind}" has no renderer; only ${[...KINDS].join(", ")}`)) return null;

  if (!r.ok(Array.isArray(s.nodes) && s.nodes.length > 0, "structure.nodes must be a non-empty array")) return null;
  if (!r.ok(Array.isArray(s.edges) && s.edges.length > 0, "structure.edges must be a non-empty array")) return null;

  if (s.nodes.length > MAX_NODES) r.fail(`${s.nodes.length} nodes exceeds the ${MAX_NODES} the server accepts`);
  if (s.nodes.length > 12) r.warn(`${s.nodes.length} nodes is a lot to read; 6-9 is the sweet spot`);

  const ids = new Set();
  s.nodes.forEach((n, i) => {
    if (!r.str(n.id, `nodes[${i}].id`, { max: 3 })) return;
    if (ids.has(n.id)) r.fail(`duplicate node id "${n.id}"`);
    ids.add(n.id);
    for (const axis of ["x", "y"]) {
      const v = n[axis];
      if (typeof v !== "number" || !Number.isFinite(v)) r.fail(`nodes[${i}].${axis} must be a number`);
      else if (v < 0 || v > 1) r.fail(`nodes[${i}].${axis} is ${v}; coordinates are normalised to 0-1, not pixels`);
    }
  });

  const seen = new Set();
  s.edges.forEach((e, i) => {
    for (const end of ["u", "v"]) {
      if (!ids.has(e[end])) r.fail(`edges[${i}].${end} = "${e[end]}" is not a node id`);
    }
    if (e.u === e.v) r.fail(`edges[${i}] is a self-loop on "${e.u}"`);
    if (typeof e.w !== "number" || !Number.isFinite(e.w)) r.fail(`edges[${i}].w must be a finite number`);

    const key = [e.u, e.v].sort().join("\u0000");
    if (seen.has(key)) r.fail(`edges[${i}] duplicates the pair ${e.u}-${e.v}`);
    seen.add(key);
  });

  // A disconnected graph is legal but almost never intended for these topics.
  const adj = new Map([...ids].map((id) => [id, []]));
  for (const e of s.edges) {
    if (adj.has(e.u) && adj.has(e.v)) { adj.get(e.u).push(e.v); adj.get(e.v).push(e.u); }
  }
  const stack = [s.nodes[0].id];
  const reached = new Set(stack);
  while (stack.length) {
    for (const nxt of adj.get(stack.pop()) || []) {
      if (!reached.has(nxt)) { reached.add(nxt); stack.push(nxt); }
    }
  }
  if (reached.size !== ids.size) {
    r.warn(`graph is disconnected (${reached.size} of ${ids.size} reachable); intended?`);
  }

  return { ids, edgeCount: s.edges.length };
}

function checkProse(alg, r) {
  if (r.ok(Array.isArray(alg.explanation) && alg.explanation.length > 0, "explanation must be a non-empty array")) {
    alg.explanation.forEach((p, i) => {
      if (r.str(p, `explanation[${i}]`) && /<[a-z/]/i.test(p)) {
        r.fail(`explanation[${i}] contains markup; it is plain text and gets escaped`);
      }
    });
    if (alg.explanation.length < 2) r.warn("explanation is a single paragraph; three or four is the target");
  }

  const a = alg.analysis;
  if (r.ok(a && typeof a === "object", "analysis is missing")) {
    r.str(a.time, "analysis.time");
    r.str(a.space, "analysis.space");
    if (r.ok(Array.isArray(a.notes) && a.notes.length > 0, "analysis.notes must be a non-empty array")) {
      a.notes.forEach((n, i) => r.str(n, `analysis.notes[${i}]`));
      if (a.notes.length < 3) r.warn(`analysis.notes has ${a.notes.length} entries; three to six is the target`);
    }
  }

  const c = alg.code;
  if (r.ok(c && typeof c === "object", "code is missing")) {
    r.str(c.lang, "code.lang");
    r.str(c.source, "code.source", { min: 40 });
  }
}

function checkEditable(alg, r) {
  const e = alg.editable;
  if (e === undefined) {
    if (CC_TOPICS.has(alg.id)) r.warn(`"${alg.id}" is enabled server-side but has no editable block; the Run tab will be empty`);
    return;
  }
  if (!r.ok(e && typeof e === "object", "editable must be an object when present")) return;

  if (!CC_TOPICS.has(alg.id)) {
    r.fail(`editable is present but "${alg.id}" is not in the server whitelist; it must be enabled server-side first`);
  }
  if (e.topic !== alg.id) r.fail(`editable.topic "${e.topic}" must equal id "${alg.id}"`);
  r.str(e.lang, "editable.lang");
  r.str(e.signature, "editable.signature");
  if (!r.str(e.starter, "editable.starter", { min: 40 })) return;

  for (const directive of ["#include", "#pragma"]) {
    if (e.starter.includes(directive)) r.fail(`editable.starter contains ${directive}; the harness owns the preprocessor`);
  }
  if (/\bextern\s+"C"/.test(e.starter)) {
    r.fail('editable.starter uses extern "C", which is illegal at the block scope it is spliced into');
  }
  for (const call of ["printf", "std::cout", "puts("]) {
    if (e.starter.includes(call)) r.fail(`editable.starter calls ${call}; only t.emit() may write to stdout`);
  }
  if (!/\bt\.emit\s*\(/.test(e.starter)) r.fail("editable.starter never calls t.emit(), so it produces no frames");
}

/* ------------------------------------------------------------------ */
/* running the generator                                                */
/* ------------------------------------------------------------------ */

function drain(alg, r) {
  if (!r.ok(typeof alg.run === "function", "run must be a function")) return null;
  if (alg.run.constructor.name !== "GeneratorFunction") {
    return r.fail("run must be a generator function (`function* run(graph)`)"), null;
  }
  try {
    const frames = [];
    for (const f of alg.run(alg.structure)) {
      frames.push(f);
      if (frames.length > MAX_FRAMES) return r.fail(`run produced more than ${MAX_FRAMES} frames; runaway loop?`), null;
    }
    return frames;
  } catch (err) {
    return r.fail(`run threw: ${err && err.message}`), null;
  }
}

function checkFrames(frames, shape, r) {
  if (!r.ok(frames.length >= MIN_FRAMES, `only ${frames.length} frames; the animation needs at least ${MIN_FRAMES}`)) return;
  if (frames.length > 400) r.warn(`${frames.length} frames is a long sit; 15-120 is the target`);

  const labels = new Set();
  let sawEdgeMark = false;

  frames.forEach((f, i) => {
    const at = `frame ${i}`;
    if (!f || typeof f !== "object") return void r.fail(`${at} is not an object`);
    if (!r.str(f.note, `${at}.note`)) return;
    if (f.phase !== undefined) r.str(f.phase, `${at}.phase`);
    if (f.detail !== undefined && f.detail !== "") r.str(f.detail, `${at}.detail`);

    const marks = f.marks || {};
    for (const [key, state] of Object.entries(marks.edges || {})) {
      const idx = Number(key);
      if (!Number.isInteger(idx) || idx < 0 || idx >= shape.edgeCount) {
        r.fail(`${at} marks edge "${key}", which is not an index into structure.edges (0-${shape.edgeCount - 1})`);
      }
      if (!EDGE_STATES.has(state)) {
        r.fail(`${at} sets edge ${key} to "${state}"; the renderer only knows ${[...EDGE_STATES].join(", ")}`);
      }
      sawEdgeMark = true;
    }
    for (const [id, state] of Object.entries(marks.nodes || {})) {
      if (!shape.ids.has(id)) r.fail(`${at} marks node "${id}", which is not in structure.nodes`);
      if (!NODE_STATES.has(state)) {
        r.fail(`${at} sets node ${id} to "${state}"; the renderer only knows ${[...NODE_STATES].join(", ")}`);
      }
    }
    for (const [id, comp] of Object.entries(marks.components || {})) {
      if (!shape.ids.has(id)) r.fail(`${at} gives a component to "${id}", which is not a node`);
      if (!Number.isInteger(comp) || comp < 0) r.fail(`${at} component for "${id}" must be a non-negative integer`);
    }

    if (f.metrics !== undefined) {
      if (!Array.isArray(f.metrics)) return void r.fail(`${at}.metrics must be an array`);
      f.metrics.forEach((m, j) => {
        if (!m || typeof m !== "object") return void r.fail(`${at}.metrics[${j}] must be an object`);
        r.str(m.label, `${at}.metrics[${j}].label`);
        if (!["string", "number"].includes(typeof m.value)) {
          r.fail(`${at}.metrics[${j}].value must be a string or number`);
        }
        labels.add(m.label);
      });
    }
  });

  if (!sawEdgeMark) r.warn("no frame ever marks an edge; the graph will not animate");

  const last = frames[frames.length - 1];
  if (last && last.phase !== "Done") r.warn(`last frame's phase is "${last.phase}"; ending on "Done" reads better`);

  // Snapshots, not deltas: a shared mutable marks object shows up as every
  // frame being identical to the last one.
  if (frames.length > 3) {
    const seen = new Set(frames.map((f) => JSON.stringify(f.marks || {})));
    if (seen.size === 1) {
      r.fail("every frame has identical marks; the marks object is probably being mutated and yielded by reference");
    }
  }

  const counts = frames.map((f) => (f.metrics || []).length);
  if (new Set(counts).size > 3) {
    r.warn("the metric list changes length often; keeping labels stable stops the panel reordering");
  }
}

function checkDeterminism(alg, first, r) {
  let second;
  try {
    second = [...alg.run(alg.structure)];
  } catch {
    return;  // the first run already reported the throw
  }
  if (JSON.stringify(first) !== JSON.stringify(second)) {
    r.fail("two runs produced different frames; run must be deterministic");
  }
}

/* ------------------------------------------------------------------ */

async function validate(file) {
  const path = resolve(file);
  const r = new Report(file);

  let src;
  try {
    src = await readFile(path, "utf8");
  } catch (err) {
    r.fail(`cannot read: ${err.message}`);
    return r;
  }
  checkSource(src, r);

  let mod;
  try {
    mod = await import(pathToFileURL(path).href);
  } catch (err) {
    r.fail(`cannot import: ${err.message}`);
    return r;
  }

  const alg = pickTopic(mod, r);
  if (!alg) return r;

  checkIdentity(alg, file, r);
  checkProse(alg, r);
  checkEditable(alg, r);

  const shape = checkStructure(alg.structure, r);
  const frames = drain(alg, r);
  if (shape && frames) {
    checkFrames(frames, shape, r);
    checkDeterminism(alg, frames, r);
    r.frames = frames.length;
  }
  return r;
}

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("usage: node validate.mjs topics/<id>.js [...]");
  process.exit(2);
}

let bad = 0;
for (const file of files) {
  const r = await validate(file);
  const status = r.errors.length ? "FAIL" : "pass";
  const detail = r.frames ? ` (${r.frames} frames)` : "";
  console.log(`${status}  ${r.file}${r.errors.length ? "" : detail}`);
  for (const e of r.errors) console.log(`        error:   ${e}`);
  for (const w of r.warnings) console.log(`        warning: ${w}`);
  if (r.errors.length) bad += 1;
}

console.log(`\n${files.length - bad} of ${files.length} passed`);
process.exit(bad ? 1 : 0);
