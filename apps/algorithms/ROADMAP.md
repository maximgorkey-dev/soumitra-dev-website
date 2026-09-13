# Algorithms section — build roadmap

Written 2026-09-13, to be executed around the end of the month. The point of
this document is that a future session can pick the work up without
re-deriving anything, because both accounts are working to a token budget.
Decisions already taken are recorded as settled; please do not re-open them
without a reason, since re-litigating them is most of the cost.

The governing principle, which every decision below follows from:

> This account's tokens buy **capabilities** — renderers, specs, validator
> rules. The other account's tokens buy **content** — algorithm modules.
> Content is high-volume and mechanical; capability is one-time and unlocks a
> whole category forever.

Evidence that the mechanism works: on 2026-09-13, thirteen graph algorithms
written by the other account against `topics/CONTRACT.md` landed in a single
batch, all passing `validate.mjs` first try with no warnings. This account's
entire contribution was running the validator and adding thirteen lines to
`core/catalog.js`.

---

## 1. State as of 2026-09-13

- 14 topics live, every one of them `kind: "graph"`, all passing the validator.
- **One renderer exists**: `views/graph.js`.
- `topics/CONTRACT.md` describes only the graph shape.
- `validate.mjs` and `package.json` (`{"type":"module"}`) are in place.
- Runnable server-side C++ exists for `mst-kruskal` and `mst-prim` only.

The catalogue order is a teaching progression, not alphabetical, because
`grouped()` derives the sidebar from array order. Keep new entries grouped by
topic in a sensible learning order rather than appending blindly.

---

## 2. Decisions taken (settled)

| Question | Decision |
|---|---|
| Renderer build order | `sequence`, then `grid`, then `tree`, then `chart` — strict leverage order |
| "metrics" in the original category list | Meant **matrix / 2D grids**; handled by the `grid` renderer |
| Runnable C++ on new renderers | **Deferred.** `editable` stays graph-only; new topics ship static reference `code` only |
| Can the other account self-validate? | **Yes**, Node runs on that laptop. Nothing may be mailed until the validator passes |
| Start more graph algorithms immediately? | **No.** The other account waits and sends one large batch |

### The consequence of batching, which matters

The original plan published each renderer's spec *before* building the
renderer, so the other account could write in parallel. Batching removes that
benefit entirely — if they are waiting anyway, there is no parallelism to buy.
And publishing an unproven spec is actively risky: a mark shape I later change
would invalidate a 25-module batch, over mail.

**So the order is inverted: build the renderer first, then write a spec that
has already been proven against working code.** Same cost, spec risk gone.

---

## 3. Facts worth not rediscovering

These were established by inspection and each one saves a round of digging.

- **The trace model needs no changes.** `core/trace.js` already documents
  `marks` as "per-element visual state, keyed by element id, shape is the
  renderer's business". Multiple renderers were designed for from the start.
- **View dispatch goes in one place.** `app.js` line ~12 is a single
  `import { createGraphView } from "./views/graph.js";`. Adding a renderer
  means selecting on `structure.kind` there, not a refactor.
- **`views/graph.js` is 125 lines with one export**, `createGraphView(root)`.
  It is the template for every new renderer: same constructor shape.
- **The existing 14 modules must not need editing.** Any new mark shape is
  additive, under a new `structure.kind`. If a change would touch them, it is
  the wrong change.
- **No cache-busting needed on deploy.** Nginx sets `Cache-Control: no-cache`
  on `/apps/`, so browsers revalidate. Filenames carry no version.
- **`/apps/algorithms/` is behind the auth wall** — anonymous requests get 302
  to Google, including the topic `.js` files. This document is served from
  there too, so it is not public.
- **Runnable C++ whitelist** is `CC_TOPICS` in `/opt/site-api/app.py`,
  currently `{"mst-kruskal", "mst-prim"}`. The harness is graph-specific
  (`viz::Graph` in `server/cc/`), which is why extending it was deferred.
- **Deploy loop**: edit under `/var/www/portfolio` on the VM, then commit and
  push to `origin main` (`git@github.com:maximgorkey-dev/soumitra-dev-website.git`).
- **PowerShell mangles inline SSH heredocs.** Write a `.sh` locally, `scp` it,
  then `ssh host "tr -d '\r' < ~/x.sh > ~/y.sh && bash ~/y.sh"`. Every attempt
  to shortcut this has failed.
- **`scp -r` preserves directory mode.** Files arriving from OneDrive came in
  as `dr-x------` and blocked renaming until `chmod u+rwx`. A single zip
  attachment avoids this entirely.

---

## 4. Renderer to category map

Four renderers cover all 21 categories originally asked about.

| Categories | Renderer | Status |
|---|---|---|
| Topological sort, union-find, and all remaining graph work | `graph` | **exists** |
| Arrays, strings, sliding window, stack, queues, monotonic stack, monotonic queue, bit manipulation | `sequence` | to build |
| Matrix, 2D dynamic programming, combinatorics (Pascal), game theory (Grundy tables) | `grid` | to build |
| Trees, heap, tries, segment tree, binary indexed tree, backtracking (recursion tree) | `tree` | to build |
| Probability and statistics | `chart` | optional |

The collapsing is where the savings are, and it is worth being explicit about:

- Stack, queue, monotonic stack and monotonic queue are **not** separate
  renderers. They are a second named row beneath the main array.
- Bit manipulation is a sequence of fixed-width cells.
- Backtracking is a recursion tree that grows and prunes — the `tree` renderer
  with a `pruned` state. N-Queens and sudoku additionally want a grid, which
  is the composite case below.
- Union-find is a forest, already expressible with the graph renderer's
  component colouring (Kruskal does this today).

### Composite views: leave the seam, do not build it

Segment trees want a tree above an array; sudoku wants a grid beside a
recursion tree. Shape the renderer interface so panels *could* compose later,
but do not build composition until a topic genuinely needs it. Render segment
trees as tree-only with ranges in the node labels first. Building composition
before it is needed is the expensive mistake available here.

---

## 5. The loop, per renderer

Five steps, repeated for `sequence`, then `grid`, then `tree`.

1. **(this account)** Build `views/<name>.js`, add `structure.kind` dispatch in
   `app.js`, add the CSS to `styles.css`.
2. **(this account)** Write **one** algorithm module in the new shape, by hand.
   This is the deliberate exception to "never write content": `mst-kruskal.js`
   is what the other account pattern-matched to get thirteen modules right on
   the first attempt. A proven reference module is the highest-value token
   spend available, because it is what the whole batch is copied from.
3. **(this account)** Add the renderer's section to `topics/CONTRACT.md` and
   its rules to `validate.mjs`. Push, so the other account can clone it.
4. **(other account)** Write the batch, self-validate, mail it per section 7.
5. **(this account)** Validate, wire into `core/catalog.js`, commit, push, and
   look at one screenshot to confirm it is legible. The validator can prove
   frames are well-formed; only a human can see that a picture teaches.

---

## 6. Renderer 1 — `sequence`, provisional design

To be frozen in step 1 above, then written into `CONTRACT.md` in step 3. It is
provisional here precisely so that the spec is not published before the
renderer proves it.

```js
structure = {
  kind: "sequence",
  values: [5, 3, 8, 1, 9, 2],
  labels: ["a", "b", "c"],        // optional, defaults to indices
}
```

```js
marks = {
  cells:    { 3: "active", 4: "compared" },      // by index
  pointers: [{ name: "lo", at: 0 }, { name: "hi", at: 5 }],
  ranges:   [{ from: 1, to: 3, label: "window" }],
  rows:     [{ name: "stack", values: [2, 5], cells: { 1: "active" } }],
}
```

Provisional cell states: `idle`, `active`, `compared`, `selected`, `sorted`,
`excluded`, `pivot`. Reuse the graph renderer's colour palette so the two
renderers look like one product.

The load-bearing feature is `rows`. It is what makes four of the listed
categories free rather than four more renderers, so it should be designed
first and not treated as an add-on.

---

## 7. Transfer protocol

The 2026-09-13 batch worked but had avoidable friction: fourteen loose
attachments, a read-only directory, and one bug that reached this account.

- **One `.zip.data` attachment**, not N files. Removes the permissions problem.
- **Include `MANIFEST.txt`**: per file, the id, section, topic, title and
  export name, plus the literal `import` line and `catalog.js` array entry.
  Wiring then requires opening no module at all.
- **Nothing is mailed until `node validate.mjs topics/*.js` reports
  `N of N passed` with zero warnings.** Paste that output into the mail body.
  This is what keeps review cost off this account.
- **LF line endings, no BOM.** The last batch was clean; the file already in
  the repo was the CRLF one.
- **Send the pilot first even when batching**: three modules in the new shape,
  mailed on their own, before writing the other twenty. A misread spec then
  costs three modules instead of the whole batch. This is cheap insurance and
  the one place where an extra round trip is worth it.

---

## 8. Validator rules to add (cheap, high value)

- The new renderer's mark vocabulary and index bounds.
- **Any metric shaped `a / b` must satisfy `a <= b`.** This is exactly the
  `Edges checked: 18 / 10` bug found in `bipartite-check` on 2026-09-13, where
  a counter incremented once per direction of travel while dividing by the
  undirected edge count. It is a whole class of error and nearly free to catch.
- **Reject `editable` on any non-graph `kind`**, since runnable C++ is
  deliberately graph-only until a harness exists.
- Cross-family agreement is worth doing manually at wire-up time rather than
  encoding: on 2026-09-13, all three MST algorithms independently agreeing on
  total weight 38 was the strongest correctness signal available, and the
  validator cannot know that two modules ought to produce the same answer.

---

## 9. Batch assignment for the other account

Written now because it is cheap now and expensive to re-derive later. Two
waves in one mail, per the batching decision.

**Wave A — graph, needs no new renderer.** Topological sort (Kahn and the
DFS-based version as separate entries), strongly connected components (Tarjan,
Kosaraju), Bellman-Ford with negative-cycle detection, maximum flow
(Edmonds-Karp, then Dinic if appetite remains), union-find as a topic in its
own right, cycle detection in directed and undirected graphs, longest path in
a DAG. Roughly 8–12 modules.

**Wave B — sequence, needs the renderer from section 6.** Two pointers, binary
search and its boundary variants, Kadane's maximum subarray, prefix sums,
KMP and Z-function string matching, next greater element, sliding window
maximum, one-dimensional dynamic programming (house robber, longest increasing
subsequence), stack and queue as explicit structures, monotonic stack and
monotonic queue, and a bit-manipulation set. Roughly 12–15 modules.

Later waves, once their renderers exist: matrix and 2D dynamic programming
(edit distance, longest common subsequence, knapsack, coin change, flood fill,
island counting) on `grid`; heaps, tries, BST rotations, segment trees and
backtracking on `tree`.

---

## 10. Risks

- **Visual quality cannot be delegated or validated.** The validator proves
  frames are well-formed, never that a picture teaches. Budget one screenshot
  review per renderer on this account.
- **A renderer that needs a mark shape the batch did not use** is the main way
  this plan wastes the other account's work. Section 2's inversion and section
  7's pilot both exist to prevent it; keep both.
- **Token exhaustion mid-renderer** leaves a half-built view. Prefer finishing
  `sequence` completely — renderer, reference module, contract, validator —
  over starting `grid`. A finished renderer is permanent leverage; a half
  built one is nothing.
