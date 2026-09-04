/**
 * Kruskal's minimum spanning tree.
 *
 * The template for every algorithm added here: one module exporting one
 * object, carrying its own prose, its own reference implementation and a
 * generator that narrates itself. Adding an algorithm should never mean
 * touching the renderer or the shell.
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

/** Union-find with path compression and union by size. */
function unionFind(ids) {
  const parent = new Map(ids.map((id) => [id, id]));
  const size = new Map(ids.map((id) => [id, 1]));

  const find = (x) => {
    let r = x;
    while (parent.get(r) !== r) r = parent.get(r);
    while (parent.get(x) !== r) {
      const next = parent.get(x);
      parent.set(x, r);
      x = next;
    }
    return r;
  };

  const union = (a, b) => {
    let ra = find(a);
    let rb = find(b);
    if (ra === rb) return false;
    if (size.get(ra) < size.get(rb)) [ra, rb] = [rb, ra];
    parent.set(rb, ra);
    size.set(ra, size.get(ra) + size.get(rb));
    return true;
  };

  return { find, union };
}

function* run(graph) {
  const ids = graph.nodes.map((n) => n.id);
  const uf = unionFind(ids);

  // Edges are sorted by weight, but the frames must refer to edges by their
  // index in the *original* list, because that is what the renderer drew.
  const order = graph.edges.map((e, i) => i).sort((a, b) => graph.edges[a].w - graph.edges[b].w);

  const edgeState = {};
  let total = 0;
  let accepted = 0;
  let examined = 0;

  const components = () => {
    const roots = new Map();
    const out = {};
    for (const id of ids) {
      const r = uf.find(id);
      if (!roots.has(r)) roots.set(r, roots.size);
      out[id] = roots.get(r);
    }
    return out;
  };

  const metrics = () => [
    { label: "Edges examined", value: `${examined} / ${graph.edges.length}` },
    { label: "Edges in tree", value: `${accepted} / ${ids.length - 1}` },
    { label: "Total weight", value: String(total) },
  ];

  const snapshot = (extra) =>
    frame({ marks: { edges: { ...edgeState }, components: components() }, metrics: metrics(), ...extra });

  yield snapshot({
    phase: "Sort",
    note: `Sort all ${graph.edges.length} edges by weight, lightest first.`,
    detail: order.map((i) => `${graph.edges[i].u}${graph.edges[i].v}(${graph.edges[i].w})`).join("  "),
  });

  yield snapshot({
    phase: "Initialise",
    note: `Every vertex starts as its own component — ${ids.length} components, no edges chosen.`,
    detail: "Colours show components. Two vertices sharing a colour are already connected.",
  });

  for (const i of order) {
    const e = graph.edges[i];
    examined += 1;

    edgeState[i] = "candidate";
    yield snapshot({
      phase: "Scan",
      note: `Consider ${e.u}–${e.v}, weight ${e.w}. Are its ends already connected?`,
    });

    if (uf.union(e.u, e.v)) {
      edgeState[i] = "accepted";
      total += e.w;
      accepted += 1;
      yield snapshot({
        phase: "Scan",
        note: `Accept ${e.u}–${e.v}. Different components, so it joins them without making a cycle.`,
        detail: `Running weight ${total}.`,
      });
      // n − 1 edges span n vertices; anything further is guaranteed a cycle.
      if (accepted === ids.length - 1) break;
    } else {
      edgeState[i] = "rejected";
      yield snapshot({
        phase: "Scan",
        note: `Reject ${e.u}–${e.v}. Both ends are already in the same component, so it would close a cycle.`,
      });
    }
  }

  yield snapshot({
    phase: "Done",
    note: `Spanning tree complete: ${accepted} edges, total weight ${total}.`,
    detail:
      examined < graph.edges.length
        ? `Stopped early — ${graph.edges.length - examined} heavier edges never needed examining.`
        : "Every edge was examined.",
  });
}

export const kruskal = {
  id: "mst-kruskal",
  section: "Algorithms",
  topic: "Minimum spanning tree",
  title: "Kruskal's algorithm",
  blurb: "Sort every edge by weight and take the cheapest that does not close a cycle.",
  structure: GRAPH,
  run,

  explanation: [
    "A spanning tree of a connected graph is a subset of its edges that touches every vertex and contains no cycle. A minimum spanning tree is the cheapest such subset. Kruskal's answer to finding one is almost aggressively simple: look at the edges in order of increasing weight and take each one unless taking it would create a cycle.",
    "The reason it works is a property of the problem rather than of the algorithm. For any way you cut the graph into two halves, the cheapest edge crossing that cut belongs to some minimum spanning tree. Kruskal's greedy choice is always such an edge for the cut separating the component it is about to join from everything else, so it never has to reconsider a decision. Greedy algorithms are usually wrong; this is one of the cases where the structure of the problem makes greed optimal.",
    "The whole difficulty is the cycle test. Asking \"would this edge close a cycle?\" is the same as asking \"are these two vertices already connected?\", and answering that repeatedly is what disjoint-set union is for. Each vertex begins in its own set; accepting an edge merges two sets; an edge whose endpoints are already in the same set is rejected. In the visualisation, colour is the set — an edge between two vertices of the same colour is one that is about to be thrown away.",
  ],

  analysis: {
    time: "O(E log E), equivalently O(E log V)",
    space: "O(V) for the disjoint-set structure, plus O(E) to hold the sorted edges",
    notes: [
      "Sorting the edges dominates. Everything after it is E disjoint-set operations, which cost O(E · α(V)) where α is the inverse Ackermann function — under 5 for any input that fits in a computer, so effectively constant.",
      "Since E ≤ V², log E ≤ 2 log V, which is why the bound is usually quoted as O(E log V). The two are the same statement.",
      "It can stop as soon as V − 1 edges are accepted, which on a dense graph often means the heaviest edges are never examined at all. The worst case is unchanged.",
      "Kruskal looks at the graph globally, sorting all edges up front, whereas Prim grows one tree outward from a start vertex. That makes Kruskal the natural choice on sparse graphs and when edges arrive already sorted, and Prim better on dense ones, where a heap-based Prim reaches O(E + V log V).",
      "Correctness does not depend on the tie-breaking rule. If weights are distinct the minimum spanning tree is unique; if not, different tie-breaks give different trees of identical total weight.",
    ],
  },

  /**
   * The server-side variant. The reference implementation below is written to
   * be read; this one is written to be edited and run, so it narrates itself
   * through `viz::Trace` exactly as the JavaScript generator above does.
   *
   * Only the body of solve() is sent. The harness owns main(), reads the graph
   * and constructs the Trace, which is why there are no includes here and no
   * printing: emit() is the only thing that writes to stdout.
   */
  editable: {
    topic: "mst-kruskal",
    lang: "cpp",
    signature: "void solve(const viz::Graph& g, viz::Trace& t)",
    starter: `// Disjoint-set over the vertices, iterative find with path halving.
std::vector<int> parent(g.n), size(g.n, 1);
std::iota(parent.begin(), parent.end(), 0);

auto find = [&](int x) {
    while (parent[x] != x) { parent[x] = parent[parent[x]]; x = parent[x]; }
    return x;
};

auto unite = [&](int a, int b) {
    a = find(a);
    b = find(b);
    if (a == b) return false;                 // already connected: a cycle
    if (size[a] < size[b]) std::swap(a, b);
    parent[b] = a;
    size[a] += size[b];
    return true;
};

// Hand the current grouping to the viewer. Two vertices sharing a colour are
// already connected, so an edge between them is one about to be rejected.
auto paint = [&] {
    std::vector<int> group(g.n);
    for (int v = 0; v < g.n; ++v) group[v] = find(v);
    t.components(group);
};

int examined = 0, accepted = 0;
long long total = 0;

auto counters = [&] {
    t.metric("Edges examined", std::to_string(examined) + " / " + std::to_string(g.edge_count()));
    t.metric("Edges in tree", std::to_string(accepted) + " / " + std::to_string(g.n - 1));
    t.metric("Total weight", total);
};

// Edge indices ordered by weight. Frames address edges by their position in
// g.edges, not in this order, because that is how the renderer drew them.
std::vector<int> order(g.edge_count());
std::iota(order.begin(), order.end(), 0);
std::sort(order.begin(), order.end(),
          [&](int a, int b) { return g.edges[a].w < g.edges[b].w; });

paint();
counters();
t.emit("Sort", "Sort all " + std::to_string(g.edge_count()) + " edges by weight, lightest first.");
t.emit("Initialise", "Every vertex starts as its own component.",
       "Colours show components.");

for (const int i : order) {
    const viz::Edge& e = g.edges[i];
    ++examined;

    t.edge(i, viz::CANDIDATE);
    counters();
    t.emit("Scan", "Consider " + g.label(e.u) + "-" + g.label(e.v) +
                   ", weight " + std::to_string(e.w) + ". Are its ends already connected?");

    if (unite(e.u, e.v)) {
        t.edge(i, viz::ACCEPTED);
        total += e.w;
        ++accepted;
        paint();
        counters();
        t.emit("Scan", "Accept " + g.label(e.u) + "-" + g.label(e.v) +
                       ". Different components, so it joins them without a cycle.",
               "Running weight " + std::to_string(total) + ".");
        if (accepted == g.n - 1) break;       // spanned; the rest is heavier
    } else {
        t.edge(i, viz::REJECTED);
        counters();
        t.emit("Scan", "Reject " + g.label(e.u) + "-" + g.label(e.v) +
                       ". Both ends are in the same component, so it would close a cycle.");
    }
}

counters();
t.emit("Done", "Spanning tree complete: " + std::to_string(accepted) +
               " edges, total weight " + std::to_string(total) + ".");
`,
  },

  code: {
    lang: "cpp",
    source: `// Kruskal's minimum spanning tree, O(E log E).
#include <algorithm>
#include <numeric>
#include <vector>

struct Edge { int u, v, w; };

struct DisjointSet {
    std::vector<int> parent, size;

    explicit DisjointSet(int n) : parent(n), size(n, 1) {
        std::iota(parent.begin(), parent.end(), 0);
    }

    int find(int x) {                      // path compression
        while (parent[x] != x) {
            parent[x] = parent[parent[x]];
            x = parent[x];
        }
        return x;
    }

    bool unite(int a, int b) {             // union by size
        a = find(a);
        b = find(b);
        if (a == b) return false;          // already connected: would be a cycle
        if (size[a] < size[b]) std::swap(a, b);
        parent[b] = a;
        size[a] += size[b];
        return true;
    }
};

// Returns the total weight, and fills \`tree\` with the chosen edges.
long long kruskal(int n, std::vector<Edge> edges, std::vector<Edge>& tree) {
    std::sort(edges.begin(), edges.end(),
              [](const Edge& a, const Edge& b) { return a.w < b.w; });

    DisjointSet ds(n);
    long long total = 0;

    for (const Edge& e : edges) {
        if (!ds.unite(e.u, e.v)) continue; // skip: closes a cycle
        tree.push_back(e);
        total += e.w;
        if ((int)tree.size() == n - 1) break;   // spanned; the rest is heavier
    }
    return total;
}`,
  },
};
