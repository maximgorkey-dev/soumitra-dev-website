# Site to-do list

The one list of pending work across soumitra.dev. Lives under /apps/ so it sits
behind the login. Per-app design detail stays in the app roadmaps
(`apps/algorithms/ROADMAP.md`, `apps/patterns/ROADMAP.md`); items here link to
them rather than repeating them.

**How to use it.** Work top to bottom through "Up next", one item per session.
When an item ships, delete it here and add one line to "Done log" at the
bottom. New ideas go into their area's section with an id, never only in chat.

Item format: `[ ] ID — title (size)`, then why, what, and how to know it is
done. Sizes: **S** under an hour of work, **M** one session, **L** several
sessions (split before starting).

---

## Up next (recommended order)

1. OPS-1 off-site backups — the only item where data can be lost for good.
2. U-1 sign-in check of the new topics — two minutes, needs you.
3. OPS-3 line endings and a local git clone — removes friction from every later item.
4. ALG-6 validator rules — cheap, protects all the content waves after it.
5. ALG-2a grid DP wave — builds straight on the grid view just shipped.
6. ALG-2b grid search wave.
7. ALG-4 tree renderer — the last big gap in what the algorithms app can draw.
8. PAT-1 live object animation — the most valuable patterns item, and the largest.

After that, pick by mood: more content (ALG, PAT), EDA depth (EDA), or notes
polish (NOTES).

---

## Needs you

- [ ] **U-1 — Click through the new private topics (S).** The agent's browser
  can't sign in. Open `/apps/patterns/` (lands on the new pattern map; also
  Iterator, Memento, Proxy, Flyweight) and `/apps/algorithms/` (Dynamic
  programming → Longest common subsequence; Grid search → Shortest path in a
  maze). Done when each plays end to end and nothing overlaps badly; report
  any frame that looks wrong. Memento was not screenshot-checked at all.

---

## Operations and data safety

- [ ] **OPS-1 — Off-site backups (M).** The nightly encrypted backup (database
  plus attachments, `site-api-backup.timer` → `/var/backups/site-api`) lives on
  the VM's own disk, so losing the disk loses everything.
  What: a Cloud Storage bucket in the same project with a lifecycle rule (keep
  30 daily, 12 monthly), a service account that can only write objects, and an
  upload step at the end of `server/site-api-backup.sh`. Keep the encryption
  key off the VM's disk image, or at least out of the bucket.
  Done when: last night's archive is in the bucket and OPS-2 restores from it.

- [ ] **OPS-2 — Restore drill (S).** A backup is only real once it has been
  restored. Write `tools/restore-drill.sh`: fetch the newest archive, decrypt
  to a scratch directory, open the database read-only, count notes, cards and
  files, and check a random attachment's hash. Run it once by hand, then
  monthly from a timer. Done when it prints matching counts against live.

- [ ] **OPS-3 — Line endings and a local clone (S).** Some files in the repo
  were committed with CRLF, so every deploy that strips CRs shows whole-file
  diffs (seen on 2026-10-04 in `eda/`). Add `.gitattributes` with
  `* text=auto eol=lf`, renormalise once in its own commit. Separately, make
  the local workspace a clone of the repo, so `git diff` works locally and the
  scp-then-sed loop can become `git pull` on the VM. Done when `git status` on
  the VM is clean after a deploy and local diffs work.

- [ ] **OPS-4 — Health monitoring (S).** Nothing alerts if `site-api`,
  `site-cc` or the certificate renewal fails. Add a timer that calls
  `/api/health`, checks both services are active and the certificate has more
  than 14 days left, and alerts the owner on failure (reuse whatever channel
  `site-stats-report.timer` uses, or add mail). Done when stopping `site-cc`
  produces an alert within the hour.

- [ ] **OPS-5 — README is stale (S).** `README.md` describes only the
  portfolio page. Add the map of the site: `apps/` (notes, flashcards,
  algorithms, patterns; private), `eda/` (public), `server/` (site-api,
  site-cc sandbox, backups, stats timers), `tools/` (self-tests), and the
  deploy loop. Done when a fresh reader can find any service from it.

- [ ] **OPS-6 — Faster pattern self-test (S).** `tools/patterns-selftest.sh`
  compiles every listing on every run, about four minutes. Add an optional
  topic filter (`patterns-selftest.sh only=pat-iterator,grid-lcs`), keep the
  full run as the pre-commit default, and split the preview staging into its
  own `tools/preview.sh`. Done when a single-topic run takes under 20 s.

---

## Notes app (`/apps/notes/`)

- [ ] **NOTES-1 — Attachments in the user-facing export (M).** Exported notes
  lose their images and files; only the server backup has them. Export as a
  zip: notes as Markdown plus an `attachments/` folder, with links rewritten
  to relative paths. Done when an exported note opens offline with its images.

- [ ] **NOTES-2 — Preview PDFs (S).** Non-image files always download. Open
  PDFs in an inline viewer (the browser's own, via an `<iframe>` with the
  file's URL and `Content-Disposition: inline` for `application/pdf` only).
  Done when clicking a PDF attachment shows it in place.

- [ ] **NOTES-3 — Resize pasted images (S).** Phone screenshots upload at full
  size. Downscale in the browser to at most 2000 px on the long edge and
  re-encode as WebP or JPEG before upload, keeping the original only when
  it is already small. Done when a 4 MB screenshot uploads as under 500 KB.

- [ ] **NOTES-4 — Upload progress (S).** Large uploads show nothing until they
  finish. Use `XMLHttpRequest` upload progress for a small bar in the
  placeholder. Done when a 20 MB file shows progress.

- [ ] **NOTES-5 — Images inside copied rich text (M).** Pasting a web-page
  selection keeps the text and drops its images. On paste, find `<img>` in the
  HTML; upload `data:` images directly and fetch same-origin ones; for
  cross-origin images, keep a link and say so. Done when pasting a selection
  from a page with an inline image keeps it.

- [ ] **NOTES-6 — Show files pending deletion (S).** Orphaned files count
  against the quota for 7 days before the sweep removes them, which looks
  like a leak. Show "N MB pending deletion" next to the quota. Done when
  deleting an image visibly moves its size into that line.

---

## Flashcards (`/apps/flashcards/`)

- [ ] **FC-1 — An algorithms deck (M).** Patterns got a "which pattern is
  this?" deck; algorithms have none. Seed `server/seed/algorithms.json`: per
  topic, "which algorithm / what invariant / what complexity" cards, each
  linking to its walkthrough. Grow it with each content wave. Done when the
  deck appears for the owner and every link opens the right topic.

---

## Algorithms app (`/apps/algorithms/`)

Detail: `apps/algorithms/ROADMAP.md` sections 4–6. Every new topic ends in
`Result` metrics checked against its C++ by `tools/patterns-selftest.sh`.

- [ ] **ALG-6 — Validator rules (S).** `validate.mjs` only knows the graph kind.
  Add the sequence and grid vocabularies and bounds (the self-test has them;
  share one checker), the "`a / b` metric must have a ≤ b" rule from ROADMAP
  §8, and reject `editable` on non-graph kinds. Done when a deliberately
  broken grid topic fails with a readable message.

- [ ] **ALG-2a — Grid DP wave (M).** Edit distance (same table as LCS, three
  arrows), 0/1 knapsack (items × capacity, the take/skip choice), unique paths
  and minimum path sum (obstacles as walls), Pascal's triangle (combinatorics).
  One file `topics/grid-dp.js` beside LCS. Done when all record, compile and
  match, and one screenshot per topic is legible.

- [ ] **ALG-2b — Grid search wave (M).** Number of islands (flood fill,
  colour per island), multi-source BFS (rotting oranges), 0-1 BFS (deque, two
  edge costs), A* on a grid (Manhattan heuristic, compare expanded cells with
  the BFS topic on the same maze). Into `topics/grid-search.js`.

- [ ] **ALG-1 — Sequence wave (M).** KMP (failure function as a second row),
  Z-function, bit manipulation (fixed-width cells: popcount, lowest set bit,
  subsets), house robber and LIS (1-D DP with the patience-sorting row).

- [ ] **ALG-3 — Graph wave (L, split in two).** Topological sort (Kahn and DFS
  as separate entries), SCC (Tarjan, Kosaraju), Bellman-Ford with negative
  cycle detection, union-find as its own topic, cycle detection (directed and
  undirected), longest path in a DAG; then max flow (Edmonds-Karp, Dinic).
  Graph view already exists, so this is content only. Directed edges may need
  arrowheads in `views/graph.js`; check first.

- [ ] **ALG-4 — Tree renderer (L).** `views/tree.js`: nodes with values, parent
  links laid out by depth, node states including `pruned`, and optional
  per-node labels (ranges for segment trees). Reference topic: binary heap
  push/pop (tree above its array — use two panels only if it truly needs it,
  ROADMAP §4). Then tries, BST rotations, segment tree, Fenwick tree, and
  backtracking as a recursion tree (subsets, then N-Queens with the board on
  the grid view beside it — the first composite view).

- [ ] **ALG-7 — Run your own for sequence and grid topics (S–M).** The
  program runner already exists (`POST /api/algorithms/program`). Check the
  Run tab offers it for these topics and compares stdout with the `Result`
  lines, as the patterns app does with `printed`. Done when editing the LCS
  strings and running prints the new answer with a clear "differs from the
  animation" note.

- [ ] **ALG-8 — Editable mazes (M).** Click cells on the BFS and A* topics to
  toggle walls and move S and T, then re-record the trace in the browser. The
  topics already compute from `MAZE`; this needs a grid-view click hook and a
  way for a topic to accept edited input. Done when a wall drawn across the
  shortest path makes the animation find the detour.

- [ ] **ALG-5 — Chart renderer (M, optional).** For probability and statistics
  topics (law of large numbers, reservoir sampling, Monte Carlo π). Only if
  there is appetite after ALG-4.

- [ ] **ALG-9 — Roadmap cleanup (S).** ROADMAP §7 and §9 describe hand-offs to
  the other account, which no longer apply. Collapse them into a short
  "content waves" list matching ALG-1 to ALG-4.

---

## Design patterns app (`/apps/patterns/`)

Detail: `apps/patterns/ROADMAP.md`.

- [ ] **PAT-1 — Animate your own edited program (L).** The Run tab compiles and
  runs an edited listing and compares its output, but the objects view still
  shows the pre-written frames. Plan: a small `trace.hpp` the listings include
  (`TRACE_NEW(obj, label)`, `TRACE_CALL(from, to, label)`, `TRACE_PRINT`), the
  runner returning those NDJSON events in `program` mode, and a converter in
  the browser that builds objects-view frames from them (boxes appear on
  `new`, a message per call). Start with Strategy and Observer. Done when
  adding a new strategy class in the editor makes a new box appear in the run.

- [ ] **PAT-2 — Promote more notes (S–M each).** 15 patterns are still one
  page each. Best candidates, in order: Template Method (the varying step
  lighting up per subclass), Bridge (two hierarchies, the class-count
  explosion it prevents), Adapter, Builder, Singleton (initialisation order
  and the test seam it breaks). Copy the shape of `topics/pat-proxy.js`.

- [ ] **PAT-3 — Clickable pattern map (S).** Clicking a box on the map should
  open that pattern. Needs an optional `href` (topic id) on objects-view boxes
  and a click handler in `app.js` that calls the existing topic switch.

- [ ] **PAT-4 — Quiz deck for the map's pairs (S).** Add "Decorator or Proxy?",
  "Strategy or State?", "Command or Memento?" comparison cards to
  `server/seed/design-patterns.json`, one per link on the map, if not already
  covered. Reseed without wiping review history.

---

## EDA demo (`/eda/`, public)

Shipped 2026-10-04: legalised clock buffers, snake skew balancing, hold fixing,
detail routing with RC extraction, per-layer wires. Remaining simplifications,
roughly by how much a reviewer would notice:

- [ ] **EDA-1 — Maze search in the detail router (L).** Today tracks are
  assigned inside the global guides with one-pitch spacing checks. Add an A*
  search over the track grid (per layer, vias as edges) for the runs that
  repair cannot fix, with real min-spacing and end-of-line rules. Done when
  routing supply 0.3 leaves no shorts on the default design.

- [ ] **EDA-2 — Pin access on M1 (M).** Wires drop straight onto pins through
  the cells' own metal. Give each library pin an M1 shape and access points,
  and route the last hop through a via onto an access point. Done when the
  zoomed-in view shows vias landing on pin shapes, never on cell interiors.

- [ ] **EDA-3 — Detail-route the clock (M).** The clock tree and snakes are
  drawn from CTS, not routed. Route clock nets first on reserved tracks
  (M5/M6), snakes included, and extract them like signal nets. Done when the
  clock shows up in the layer view and its skew is recomputed from extraction.

- [ ] **EDA-4 — Zero-skew merging (DME) (M).** Skew is fixed afterwards with
  snakes. Implement deferred-merge embedding for the tree topology already
  built, keep snaking only for the residue, and show both skews. Done when
  snake length drops markedly on pipe8 at the same skew.

- [ ] **EDA-5 — Multi-corner timing and a crosstalk estimate (M).** Add slow
  and fast corners (scale cell delays and wire RC), check setup at slow and
  hold at fast, and a coupling-capacitance estimate from parallel run length
  on adjacent tracks. Done when the timing panel shows per-corner WNS and WHS.

- [ ] **EDA-6 — Hold fixing that makes room (S–M).** At 85 % utilisation hold
  cells run out of free sites. Allow a small displacement of neighbouring
  cells (re-legalise the row) before giving up. Done when the 85 % case has no
  unfixed holds.

- [ ] **EDA-7 — Primer pictures (S).** The primer is all text. Add three
  screenshots from the demo (placement density, congestion map, routed
  layers) at the matching sections.

---

## Public portfolio (`/`)

- [ ] **WEB-1 — Projects list (S).** Check `projects.js` lists the EDA demo
  with a one-line pitch and a link, and decide whether the private apps get a
  "sign-in required" mention or stay invisible (the analytics dashboard must
  stay invisible either way).

- [ ] **WEB-2 — Link previews for `/eda/` (S).** Add Open Graph and Twitter
  card tags plus a 1200×630 image, so a shared link shows the routed layout.

- [ ] **WEB-3 — Accessibility and performance pass (S–M).** Run Lighthouse on
  `/`, `/eda/` and `/eda/guide/`; fix contrast, labels on canvas controls, and
  anything over budget. Done when all three score 90+ on accessibility.

---

## Constraints that every item keeps

- The analytics dashboard is visible only to majumder.soumitra@gmail.com, with
  no hint of it for anyone else.
- Algorithms, patterns, notes and flashcards stay behind the sign-in.
- Untrusted C++ runs only in the `site-cc` sandbox.
- Personal work only from this Cursor account.
- Deploy loop: copy files, strip CRs, run the relevant self-test
  (`eda/selftest.js`, `tools/patterns-selftest.sh`), commit on the VM, push.

---

## Done log

- 2026-10-04 — Patterns: Iterator, Memento, Proxy, Flyweight animated; pattern map added (`8e93a61`).
- 2026-10-04 — Algorithms: grid renderer, longest common subsequence, maze BFS (`21fc4a7`).
- 2026-10-04 — EDA: legalised clock buffers, skew balancing, hold fixing, detail routing with extraction (`666a721`).
- 2026-10-04 — Patterns: run-your-own C++ (`29bd329`); Chain and Mediator animated (`b34572a`); quiz deck (`efce8e3`).
- 2026-10-04 — Algorithms: sequence renderer and seven topics (`1021d99`, `efce8e3`).
- 2026-10-03/04 — Notes attachments phase 2, attachments in the nightly backup, orphan sweep, EDA primer refresh.
