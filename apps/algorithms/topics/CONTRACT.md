# Adding an algorithm

This is the complete specification for a topic module. Anything written to this
contract drops into the site with no rework: one file in `topics/`, one import
and one array entry in `core/catalog.js`.

Read `mst-kruskal.js` alongside this. It is the reference implementation of
every rule below, and copying its shape is the fastest way to get this right.

Before sending anything back, run the validator. It checks every rule here
mechanically, including running your generator:

```
cd apps/algorithms && node validate.mjs topics/your-file.js
```

A file that does not pass the validator is not finished. Send the validator's
output rather than a description of what you wrote.

---

## The file

One file per algorithm, named after its id: `topics/<id>.js`.

It exports exactly one object. The export is named, not default:

```js
import { frame } from "../core/trace.js";

const GRAPH = { /* … */ };

function* run(graph) { /* … */ }

export const primMst = {
  id: "mst-prim",
  section: "Algorithms",
  topic: "Minimum spanning tree",
  title: "Prim's algorithm",
  blurb: "Grow one tree outward, always taking the cheapest edge leaving it.",
  structure: GRAPH,
  run,
  explanation: [ /* … */ ],
  analysis: { /* … */ },
  code: { /* … */ },
  // editable: { … }   optional, see below
};
```

`../core/trace.js` is the **only** import permitted. There are no libraries on
that page and no build step. The module must not touch the DOM, read the
network, or reference `window` or `document`: it is imported and executed
outside a browser during validation.

---

## Fields

### Identity

| Field | Type | Rule |
|---|---|---|
| `id` | string | kebab-case, unique across all topics, identical to the filename without `.js` |
| `section` | string | `"Algorithms"` today. New sections are fine but say so, they change the nav. |
| `topic` | string | The grouping heading, e.g. `"Minimum spanning tree"`. Reuse an existing string exactly to group with it. |
| `title` | string | The algorithm's name, e.g. `"Prim's algorithm"` |
| `blurb` | string | One sentence, under 160 characters, no trailing full stop needed |

Grouping in the sidebar is derived from `section` + `topic`, so a typo in
either silently creates a new group instead of joining the intended one.

### `structure`

The thing being drawn. Handed to the renderer once, then never changed — the
algorithm may not add or remove nodes and edges as it runs.

```js
const GRAPH = {
  kind: "graph",
  nodes: [
    { id: "A", x: 0.08, y: 0.22 },
    { id: "B", x: 0.38, y: 0.04 },
  ],
  edges: [
    { u: "A", v: "B", w: 7 },
  ],
};
```

- `kind` must be `"graph"`. It is the only renderer that exists. Arrays and
  trees are planned but need renderer work first — do not invent a new kind.
- `nodes[].id` — short label, 1–3 characters, drawn inside the circle. Unique.
- `nodes[].x` / `.y` — **normalised to 0–1**, not pixels. The renderer scales
  them into a 640×400 viewBox and adds its own padding. Lay the graph out so
  edges cross as little as possible; it is drawn exactly as specified.
- `edges[].u` / `.v` — node ids that must exist. No self-loops, no duplicate
  pairs.
- `edges[].w` — a finite number, drawn in a chip at the edge midpoint. Keep to
  small integers so the chip stays legible.

Aim for 6–9 nodes and 9–14 edges. Big enough to be interesting, small enough
that every step is readable. Hard ceiling is 64 nodes.

### `run`

A **generator function** taking the structure and yielding frames. This is the
heart of it, and the one thing that cannot be copied mechanically.

The visualiser is not driven by running the algorithm and looking at the
result. It is driven by commentary the implementation deliberately emits. So
narrate the decisions, especially the rejections — "this edge was skipped
because both ends are already connected" is the part a reader learns from.

```js
function* run(graph) {
  yield frame({
    phase: "Sort",
    note: "Sort all 10 edges by weight, lightest first.",
    detail: "AB(7) AG(5) BC(8) …",
    marks: { edges: {}, components: {} },
    metrics: [{ label: "Total weight", value: "0" }],
  });
  // …
}
```

`frame({ note, phase, marks, metrics, detail })` — only `note` is required.

- `note` — one sentence, present tense, describing *this* step. Required and
  non-empty: a step the viewer cannot read is not worth showing.
- `phase` — coarse stage name for the timeline, e.g. `"Sort"`, `"Scan"`,
  `"Done"`. Reuse the same few strings; consecutive frames sharing a phase are
  grouped. End with a `"Done"` frame.
- `detail` — optional second line, for the arithmetic behind the decision.
- `metrics` — `[{ label, value }]`, shown as running totals beside the canvas.
  Keep `label` stable across frames so numbers update in place instead of the
  list reordering. `value` is a string or number.
- `marks` — the visual state, below.

**Frames are whole snapshots, not deltas.** Every frame must describe the
complete visual state, because scrubbing jumps to an arbitrary index and
replays that one frame. Build the marks object fresh, or spread a running copy
(`{ ...edgeState }`) — never yield a reference to an object you keep mutating,
or every frame will end up showing the final state.

Emit 15–120 frames. The hard cap is 5000.

`run` must be **deterministic**: no `Math.random()`, no `Date.now()`, no
iteration over a `Set`/`Map` whose insertion order depends on anything
external. The validator runs it twice and compares.

### `marks`

The renderer's entire vocabulary. Anything outside it is ignored silently —
which looks like the animation simply not working, so this is the most common
way to waste a round trip.

```js
marks: {
  edges: { 0: "accepted", 3: "candidate", 7: "rejected" },
  nodes: { A: "visited", B: "frontier" },
  components: { A: 0, B: 0, C: 1 },
}
```

- `marks.edges` — keys are **indices into `structure.edges`**, as originally
  declared. If the algorithm sorts edges, it must map back to the original
  index; the renderer drew them in declaration order and knows nothing about
  the sorted order. Values: `"idle"`, `"candidate"`, `"rejected"`,
  `"accepted"`.
- `marks.nodes` — keys are node ids. Values: `"idle"`, `"frontier"`,
  `"visited"`. Use `"frontier"` for the set under consideration and
  `"visited"` for the settled set; that reads naturally for Prim, Dijkstra and
  the traversals.
- `marks.components` — node id to a component number. The renderer colours by
  `number % 8`. This is what makes union-find legible: two nodes sharing a
  colour are already connected, so an edge between them is one about to be
  rejected. Omit it entirely for algorithms where it means nothing.

### `explanation`

An array of paragraph strings, rendered in order as `<p>`. Plain text — no
markdown, no HTML, it is escaped on the way in. Unicode is fine and preferred
(α, ≤, −).

Three or four paragraphs. Aim it at someone who knows how to program but has
not met this algorithm. Cover, roughly in this order: what problem it solves,
*why it is correct* (the part usually skipped, and the most valuable), and what
the interesting implementation difficulty is. Tie the last one to what the
visualisation shows, so the prose and the animation reinforce each other.

### `analysis`

```js
analysis: {
  time: "O(E log E), equivalently O(E log V)",
  space: "O(V) for the disjoint-set structure, plus O(E) to hold the edges",
  notes: [ "…", "…" ],
}
```

`time` and `space` are single strings. `notes` is an array of 3–6 sentences
covering: which term dominates and why, how the bound is usually quoted and why
those forms are equivalent, any early exit and whether it changes the worst
case, how it compares to the obvious alternative, and any edge case worth
naming. Substance over completeness — say things a reader would not derive in
ten seconds.

### `code`

```js
code: {
  lang: "cpp",
  source: `// …`,
}
```

The reference implementation, shown in the Code tab and highlighted by
highlight.js. `lang` should be `"cpp"` for consistency with what is there.

This one is written **to be read**, not to be run: complete and compilable, but
optimised for clarity. Include the includes. Comment the non-obvious lines,
particularly the ones the explanation refers to. It must be the same logic the
animation shows, or the two tabs contradict each other.

Watch the escaping — the source lives in a template literal, so any backtick or
`${` inside it must be escaped as `` \` `` and `\${`.

### `editable` — optional

Only include this if the algorithm is a **graph** algorithm and you have been
told its id is enabled server-side. The whitelist is currently `mst-kruskal`
and `mst-prim`; anything else needs a one-line server change first, so include
`editable` only when asked. Omit it and the Run tab shows a short "no
server-side runner yet" note, which is a perfectly good state.

```js
editable: {
  topic: "mst-prim",                                  // must equal `id`
  lang: "cpp",
  signature: "void solve(const viz::Graph& g, viz::Trace& t)",
  starter: `…`,
}
```

`starter` is **only the body** of `solve()`. The harness owns `main()`, reads
the graph and constructs the `Trace`, so:

- No `#include` and no `#pragma`. The API rejects both. The harness supplies
  `<algorithm> <array> <cstdint> <cstdio> <cstdlib> <cstring> <deque>
  <functional> <map> <numeric> <optional> <queue> <set> <string> <vector>` and
  a few others.
- No `extern "C"` — the body is spliced at block scope, where it is illegal.
- Nothing may print. `t.emit()` is the only thing that writes to stdout.
- It must narrate itself through `viz::Trace` exactly as the JavaScript
  generator does, and produce the same frames.

The API available inside `solve`:

| Call | Meaning |
|---|---|
| `g.n` | vertex count |
| `g.edge_count()` | edge count |
| `g.edges[i].u/.v/.w` | edge `i`, endpoints as 0-based ints |
| `g.label(v)` | the node's display id, e.g. `"A"` |
| `t.edge(i, viz::CANDIDATE \| ACCEPTED \| REJECTED \| IDLE)` | set an edge's state |
| `t.reset_edges()` | clear all edge states |
| `t.components(std::vector<int>)` | per-vertex component number |
| `t.metric(label, value)` | set a running total |
| `t.clear_metrics()` | drop all metrics |
| `t.emit(phase, note)` / `t.emit(phase, note, detail)` | yield one frame |

---

## Sending it back

Do not paste module source into chat or into a markdown file. Put the `.js`
file on a branch and push it:

```
git checkout -b algorithms/<id>
git add apps/algorithms/topics/<id>.js
git commit -m "Add <title>"
git push -u origin algorithms/<id>
```

Then report only three things: the branch name, the validator output, and
anything you had to decide that this document did not cover.

Do **not** edit `core/catalog.js`, the renderer, the shell, or anything under
`server/`. Wiring the module in is one import and one array entry, done on the
other side, and a conflict in `catalog.js` costs more than it saves.
