#!/bin/bash
# Self-test for the design-patterns app. Usage: bash _pt.sh [preview-topic-id]
set -u
A=/var/www/portfolio/apps/algorithms
find $A -name '*.js' -exec sed -i 's/\r$//' {} +
sed -i 's/\r$//' $A/styles.css
chmod -R a+rX $A
for f in $A/app.js $A/views/*.js $A/topics/*.js $A/core/*.js; do node --check "$f" || { echo "SYNTAX: $f"; exit 1; }; done

T=/tmp/pt; rm -rf $T; mkdir -p $T/src; cp -r $A $T/alg; echo '{"type":"module"}' > $T/package.json
cat > $T/t.mjs <<'JS'
import fs from "fs";
import { ALGORITHMS } from "./alg/core/catalog.js";
import { record } from "./alg/core/trace.js";
let bad = 0;
const fail = (id, msg) => { bad++; console.log(`  FAIL ${id}: ${msg}`); };
for (const a of ALGORITHMS) {
  const frames = record(a.run(a.structure));
  if (a.structure.kind === "graph") continue;
  // structural sanity, so a typo shows here rather than as a blank box
  frames.forEach((f, i) => {
    const m = f.marks || {};
    if (a.structure.kind === "objects") {
      const ids = new Set();
      for (const o of m.objects || []) { if (ids.has(o.id)) fail(a.id, `frame ${i}: duplicate box ${o.id}`); ids.add(o.id); }
      for (const l of m.links || []) if (!ids.has(l.from) || !ids.has(l.to)) fail(a.id, `frame ${i}: link ${l.from}->${l.to}`);
      if (m.msg && (!ids.has(m.msg.from) || !ids.has(m.msg.to))) fail(a.id, `frame ${i}: msg ${m.msg.from}->${m.msg.to}`);
    } else if (a.structure.kind === "sequence") {
      if (!(m.rows || []).length) fail(a.id, `frame ${i}: no rows`);
      for (const r of m.rows || []) {
        const n = (r.values || []).length;
        for (const k of Object.keys(r.cells || {})) if (+k < 0 || +k >= n) fail(a.id, `frame ${i}: ${r.name} cell ${k} of ${n}`);
        for (const p of r.pointers || []) if (p.at < 0 || p.at > n) fail(a.id, `frame ${i}: ${r.name} pointer ${p.name} at ${p.at} of ${n}`);
        for (const g of r.ranges || []) if (g.from < 0 || g.to >= n || g.from > g.to) fail(a.id, `frame ${i}: ${r.name} range ${g.from}..${g.to} of ${n}`);
      }
    } else if (a.structure.kind === "grid") {
      if (!(m.grids || []).length) fail(a.id, `frame ${i}: no grids`);
      for (const g of m.grids || []) {
        const R = (g.values || []).length, C = R ? g.values[0].length : 0;
        const inside = ([r, c]) => r >= 0 && r < R && c >= 0 && c < C;
        if (!R || g.values.some((row) => row.length !== C)) fail(a.id, `frame ${i}: ragged or empty grid`);
        for (const k of Object.keys(g.cells || {})) if (!inside(k.split(",").map(Number))) fail(a.id, `frame ${i}: cell ${k} outside ${R}x${C}`);
        for (const ar of g.arrows || []) if (!inside(ar.from) || !inside(ar.to)) fail(a.id, `frame ${i}: arrow ${ar.from}->${ar.to} outside ${R}x${C}`);
      }
    } else {
      const ids = new Set((m.blocks || []).map((b) => b.id));
      for (const b of m.blocks || []) {
        if (!(m.regions || []).includes(b.region)) fail(a.id, `frame ${i}: block ${b.id} in unknown region ${b.region}`);
        for (const c of b.cells || []) if (c.to && !ids.has(c.to)) fail(a.id, `frame ${i}: ${b.id} points at missing ${c.to}`);
      }
    }
  });
  for (const b of a.explanation) if (typeof b !== "string" && !b.h && !b.list && !b.tip) fail(a.id, "unknown explanation block");
  const byResult = a.structure.kind === "sequence" || a.structure.kind === "grid";
  const out = byResult
    ? frames[frames.length - 1].metrics.filter((r) => r.label === "Result").map((r) => r.value)
    : frames.flatMap((f) => f.metrics.filter((r) => r.label === "printed").map((r) => r.value));
  if (byResult && !out.length) fail(a.id, "last frame has no Result");
  const traced = a.code.files.filter((f) => f.traced);
  if (traced.length !== 1) fail(a.id, `${traced.length} traced files`);
  fs.mkdirSync(`/tmp/pt/src/${a.id}`, { recursive: true });
  for (const f of a.code.files) fs.writeFileSync(`/tmp/pt/src/${a.id}/${f.name}`, f.source);
  fs.writeFileSync(`/tmp/pt/src/${a.id}/expected.txt`, out.join("\n") + (out.length ? "\n" : ""));
  fs.writeFileSync(`/tmp/pt/src/${a.id}/traced`, traced[0]?.name || "");
  console.log(`  ${a.id}: ${frames.length} frames, ${out.length} printed lines`);
}
console.log(`all ${ALGORITHMS.length} topics record; ${bad} structural failures`);
process.exit(bad ? 1 : 0);
JS
node $T/t.mjs || exit 1

cd $T/src
FAILED=0
for d in */; do
  d=${d%/}
  for f in $d/*.cpp; do
    if g++ -std=c++20 -Wall -Wextra -Werror -O1 -o ${f%.cpp} $f 2> ${f%.cpp}.err; then
      ./${f%.cpp} > ${f%.cpp}.out 2>&1 || { echo "  RUN FAILED $f"; FAILED=1; }
    else
      echo "  COMPILE FAILED $f"; head -15 ${f%.cpp}.err; FAILED=1
    fi
  done
  tr=$(cat $d/traced)
  if [ -n "$tr" ] && ! diff -q $d/${tr%.cpp}.out $d/expected.txt > /dev/null 2>&1; then
    echo "  MISMATCH $d/$tr (program < > animation):"; diff $d/${tr%.cpp}.out $d/expected.txt | head -20; FAILED=1
  fi
done
[ $FAILED = 0 ] && echo "every listing compiles with -Werror and every animation matches its program"
if [ "${1:-}" = "show" ]; then for d in */; do for o in $d*.out; do echo "--- $o"; cat $o; done; done; fi

# Optional preview of one topic on a temporary public page.
if [ -n "${2:-}" ]; then
  D=/var/www/portfolio/eda/_ovt; rm -rf $D; mkdir -p $D; cp -r $A/{core,topics,views,styles.css} $D/
  cat > $D/index.html <<'HTML'
<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="styles.css">
<style>body{background:#0d1117;margin:6px;--text:#e6edf3;--mono:ui-monospace,Consolas,monospace;color:#ccc;font:12px sans-serif}
.f{width:560px;display:inline-block;vertical-align:top;margin:3px;border:1px solid #30363d}p{margin:3px}</style>
<div id="out"></div>
<script type="module">
import { byId } from "./core/catalog.js";
import { record } from "./core/trace.js";
import { createObjectsView } from "./views/objects.js";
const views = { objects: createObjectsView };
try { views.memory = (await import("./views/memory.js")).createMemoryView; } catch {}
try { views.sequence = (await import("./views/sequence.js")).createSequenceView; } catch {}
try { views.grid = (await import("./views/grid.js")).createGridView; } catch {}
const q = new URLSearchParams(location.search);
const a = byId(q.get("t"));
const frames = record(a.run(a.structure));
for (const i of q.get("f") ? q.get("f").split(",").map(Number) : frames.map((_, i) => i)) {
  const d = document.createElement("div"); d.className = "f";
  const p = document.createElement("p"); p.textContent = `${i}: ${frames[i].note}`;
  const s = document.createElement("div"); d.append(p, s); out.append(d);
  const v = views[a.structure.kind](s); v.setStructure(a.structure); v.show(frames[i]);
}
</script>
HTML
  chmod -R a+rX $D; echo "preview staged"
fi
