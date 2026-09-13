/**
 * Dijkstra's single-source shortest paths.
 *
 * Drawn on the same graph as the three minimum spanning tree pages, on purpose:
 * the tree Dijkstra grows from A is *not* the minimum spanning tree, and having
 * both on one graph is the clearest way to show that those are different
 * problems with different answers.
 *
 * The renderer has no per-vertex styling for node states, so the visible vertex
 * colouring is carried by the components channel: 0 for settled, 1 for the
 * frontier, and unreached vertices left unmapped so they stay neutral. The
 * semantically correct node marks are emitted alongside it.
 */

import { frame } from "../core/trace.js";

const GRAPH = {
  kind: "graph",
  nodes: [
    { id: "A", x: 0.08, y: 0.22 },
    { id: "B", x: 0.38, y: 0.04 },
    { id: "C", x: 0.70, y: 0.20 },
    { id: "D", x: 0.96, y: 0.55 },
    { id: "E", x: 0.66, y: 0.92 },
    { id: "F", x: 0.30, y: 0.96 },
    { id: "G", x: 0.02, y: 0.66 },
  ],
  edges: [
    { u: "A", v: "B", w: 7 },
    { u: "A", v: "G", w: 5 },
    { u: "B", v: "C", w: 8 },
    { u: "B", v: "G", w: 9 },
    { u: "C", v: "D", w: 5 },
    { u: "C", v: "E", w: 7 },
    { u: "D", v: "E", w: 6 },
    { u: "E", v: "F", w: 8 },
    { u: "E", v: "G", w: 7 },
    { u: "F", v: "G", w: 11 },
  ],
};

function* run(graph) {
  const ids = graph.nodes.map((n) => n.id);
  const indices = graph.edges.map((_, i) => i);
  const source = ids[0];

  const dist = new Map(ids.map((id) => [id, Infinity]));
  const parent = new Map();      // node id -> index of the edge it is reached by
  const settled = new Set();
  const tested = new Set();      // edge indices that have been relaxed
  dist.set(source, 0);

  const incident = (id) =>
    indices.filter((i) => graph.edges[i].u === id || graph.edges[i].v === id);

  const other = (i, id) => (graph.edges[i].u === id ? graph.edges[i].v : graph.edges[i].u);

  const show = (d) => (d === Infinity ? "∞" : String(d));

  const distTable = () => ids.map((id) => `${id}=${show(dist.get(id))}`).join("  ");

  const reached = (id) => dist.get(id) !== Infinity;

  // Which node, if any, currently reaches the graph through edge i.
  const claimant = (i) => ids.find((id) => parent.get(id) === i);

  /**
   * Derived fresh every frame from dist/parent/settled, which keeps frames
   * honest snapshots rather than an accumulating pile of assignments.
   *
   *   accepted  the edge a settled vertex is reached by — a final tree edge
   *   candidate the edge an unsettled vertex is currently reached by
   *   rejected  relaxed, and offered no improvement to anything
   */
  const edgeMarks = (relaxing) => {
    const out = {};
    for (const i of indices) {
      if (!tested.has(i)) continue;
      const owner = claimant(i);
      if (owner === undefined) out[i] = "rejected";
      else out[i] = settled.has(owner) ? "accepted" : "candidate";
    }
    if (relaxing !== undefined) out[relaxing] = "candidate";
    return out;
  };

  const nodeMarks = () => {
    const out = {};
    for (const id of ids) {
      out[id] = settled.has(id) ? "visited" : reached(id) ? "frontier" : "idle";
    }
    return out;
  };

  const componentMarks = () => {
    const out = {};
    for (const id of ids) {
      if (settled.has(id)) out[id] = 0;
      else if (reached(id)) out[id] = 1;
      // Unreached vertices are deliberately left out, so they render neutral.
    }
    return out;
  };

  const treeWeight = () => {
    let sum = 0;
    for (const id of ids) {
      if (settled.has(id) && parent.has(id)) sum += graph.edges[parent.get(id)].w;
    }
    return sum;
  };

  const metrics = () => [
    { label: "Settled", value: `${settled.size} / ${ids.length}` },
    { label: "Edges relaxed", value: `${tested.size} / ${graph.edges.length}` },
    { label: "Tree weight", value: String(treeWeight()) },
  ];

  const snapshot = (extra, relaxing) =>
    frame({
      marks: { edges: edgeMarks(relaxing), nodes: nodeMarks(), components: componentMarks() },
      metrics: metrics(),
      ...extra,
    });

  yield snapshot({
    phase: "Initialise",
    note: `Every vertex starts at distance ∞ except the source ${source}, which is 0.`,
    detail: `${distTable()} — a distance is a best guess until its vertex is settled.`,
  });

  while (settled.size < ids.length) {
    // The nearest vertex not yet settled. Ties go to declaration order.
    let pick = null;
    for (const id of ids) {
      if (settled.has(id) || !reached(id)) continue;
      if (pick === null || dist.get(id) < dist.get(pick)) pick = id;
    }
    if (pick === null) break;   // the rest of the graph is unreachable

    settled.add(pick);

    yield snapshot({
      phase: "Settle",
      note: pick === source
        ? `Settle the source ${source} at distance 0.`
        : `Settle ${pick} at distance ${dist.get(pick)} — no shorter route to it can exist.`,
      detail: pick === source
        ? distTable()
        : `Every unsettled vertex is already ${dist.get(pick)} or more away, and edges only add, so nothing can undercut it. ${distTable()}`,
    });

    for (const i of incident(pick)) {
      const target = other(i, pick);
      if (settled.has(target)) continue;   // its distance is already final

      const e = graph.edges[i];
      const offer = dist.get(pick) + e.w;
      const current = dist.get(target);
      const improves = offer < current;

      tested.add(i);
      if (improves) {
        dist.set(target, offer);
        parent.set(target, i);
      }

      yield snapshot(
        {
          phase: "Relax",
          note: improves
            ? `Relax ${e.u}–${e.v}: ${target} drops to ${offer}, reached through ${pick}.`
            : `Relax ${e.u}–${e.v}: no improvement, so ${target} keeps ${show(current)}.`,
          detail: improves
            ? `${dist.get(pick)} + ${e.w} = ${offer}, better than ${show(current)}.`
            : `${dist.get(pick)} + ${e.w} = ${offer}, which is not better than ${show(current)}. This edge is finished with.`,
        },
        improves ? undefined : i,
      );
    }
  }

  const unreachable = ids.filter((id) => !settled.has(id));

  yield snapshot({
    phase: "Done",
    note: `All ${settled.size} vertices settled. Shortest distances from ${source} are final.`,
    detail: unreachable.length > 0
      ? `${distTable()} — ${unreachable.join(", ")} could not be reached.`
      : `${distTable()} — the tree of shortest paths weighs ${treeWeight()}, while the minimum spanning tree of this same graph weighs only 38.`,
  });
}

export const dijkstra = {
  id: "sp-dijkstra",
  section: "Algorithms",
  topic: "Shortest path",
  title: "Dijkstra's algorithm",
  blurb: "Repeatedly settle the nearest vertex not yet finished, and relax the edges leaving it",
  structure: GRAPH,
  run,

  explanation: [
    "Dijkstra's algorithm computes the shortest distance from one source vertex to every other vertex of a graph whose edge weights are non-negative. It keeps a tentative distance for each vertex, initially ∞ everywhere except the source, and repeatedly does two things: settle the nearest vertex that is not yet settled, then relax each edge leaving it, meaning check whether going through it gives a neighbour a shorter route than the one already recorded. A settled vertex is never revisited, so the algorithm finishes after V settle steps.",
    "The claim that makes it work is that when you settle the vertex with the smallest tentative distance, that distance is already final. Suppose some shorter route to it existed. That route starts at the source, which is settled, and ends at our vertex, which is not, so somewhere along it there is a first unsettled vertex. That vertex has tentative distance at least as large as the one we are settling — we chose the smallest, after all — and the remainder of the route only adds more edges. So the supposed shorter route is not shorter after all. Notice exactly where that argument leans on weights being non-negative: with a negative edge, the remainder of a route can subtract, the contradiction evaporates, and the algorithm is simply wrong. That is what Bellman–Ford is for.",
    "The implementation question is how to find the nearest unsettled vertex quickly. A priority queue keyed on tentative distance does it in O(log V), but relaxing an edge lowers a key that is already in the queue, and binary heaps do not support that cheaply. The usual answer is to push a fresh entry and ignore any entry whose vertex turns out to be settled when it is popped, which is why the queue holds O(E) entries rather than O(V). In the animation the yellow candidate edges are the current best-known route into each unsettled vertex, and they can be replaced as better routes appear; the dashed rejected edges are relaxations that offered no improvement and will never be looked at again.",
    "This is deliberately the same graph as the Kruskal, Prim and Borůvka pages, because the comparison is instructive. Those three all produce a minimum spanning tree weighing 38. Dijkstra from A produces a tree weighing 44, and it differs in two edges: it reaches F by F–G at 11 rather than E–F at 8, and D by D–E rather than C–D. A shortest-path tree minimises each vertex's distance from the source individually, and a spanning tree minimises the total weight of the edges. Those are different objectives, so there is no reason for the answers to coincide, and here they do not.",
  ],

  analysis: {
    time: "O(E log V) with a binary heap; O(V²) with a linear scan for the minimum",
    space: "O(V) for distances and parents, plus O(E) for the queue when stale entries are left in it",
    notes: [
      "The heap dominates. Every edge can push at most one entry, so there are O(E) pushes and pops at O(log E) each, and log E ≤ 2 log V, giving the usual O(E log V).",
      "Non-negative weights are a correctness requirement, not a convenience. A single negative edge breaks the argument that a settled distance is final; Bellman–Ford handles that in O(VE), and Johnson's algorithm reweights a graph to make Dijkstra usable on it.",
      "On a dense graph, skip the heap. Scanning all V vertices for the minimum each round is O(V²) overall, which beats O(E log V) once E approaches V², and needs no allocation at all. That linear-scan variant is what this animation shows.",
      "A Fibonacci heap supports decrease-key in amortised O(1) and brings the bound to O(E + V log V), the best known for comparison-based Dijkstra, but its constants mean a binary heap is usually faster in practice.",
      "If only one target matters, stop as soon as that vertex is settled rather than draining the queue. It is a large saving in practice and none at all in the worst case, since the target may be the last vertex settled.",
      "A shortest-path tree is not a minimum spanning tree. Dijkstra minimises each vertex's distance from the source; a spanning tree minimises total edge weight. On this graph the shortest-path tree weighs 44 against the minimum spanning tree's 38.",
    ],
  },

  code: {
    lang: "cpp",
    source: `// Dijkstra's single-source shortest paths, O(E log V).
#include <limits>
#include <queue>
#include <utility>
#include <vector>

struct Arc { int to, w; };   // adjacency entry

constexpr long long INF = std::numeric_limits<long long>::max();

// Fills "dist" with the shortest distance from "source" to every vertex, and
// "parent" with the previous vertex on that route (-1 for the source and for
// anything unreachable). Requires every weight to be non-negative.
void dijkstra(const std::vector<std::vector<Arc>>& adj, int source,
              std::vector<long long>& dist, std::vector<int>& parent) {
    const int n = static_cast<int>(adj.size());
    dist.assign(n, INF);
    parent.assign(n, -1);
    dist[source] = 0;

    // (distance, vertex), nearest first.
    using Item = std::pair<long long, int>;
    std::priority_queue<Item, std::vector<Item>, std::greater<Item>> pq;
    pq.emplace(0, source);

    while (!pq.empty()) {
        const auto [d, v] = pq.top();
        pq.pop();

        // A binary heap cannot cheaply lower a key that is already in it, so
        // relaxing pushes a fresh entry and the outdated ones are skipped here.
        // That is why the queue holds O(E) entries rather than O(V).
        if (d > dist[v]) continue;

        for (const Arc& a : adj[v]) {
            const long long offer = d + a.w;
            if (offer < dist[a.to]) {          // relax: a shorter route found
                dist[a.to] = offer;
                parent[a.to] = v;
                pq.emplace(offer, a.to);
            }
        }
    }
}`,
  },
};
