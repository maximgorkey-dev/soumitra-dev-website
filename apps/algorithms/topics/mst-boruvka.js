/**
 * Borůvka's minimum spanning tree.
 *
 * The oldest of the three — 1926, predating both Kruskal and Prim — and the odd
 * one out in shape: instead of one global decision per step, every component
 * picks its own cheapest way out at the same time and they all merge at once.
 *
 * Drawn on the same graph as mst-kruskal and mst-prim. All three reduce to the
 * same tree, which is the point of showing them together.
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

/** "B–G and C–E" — for narrating a batch of edges in one note. */
function joinNames(names) {
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

function* run(graph) {
  const ids = graph.nodes.map((n) => n.id);
  const indices = graph.edges.map((_, i) => i);
  const uf = unionFind(ids);

  const edgeState = {};
  let total = 0;
  let accepted = 0;
  let round = 0;

  // Roots in first-appearance order, so nothing depends on Set iteration order.
  const rootsInOrder = () => {
    const seen = new Set();
    const out = [];
    for (const id of ids) {
      const r = uf.find(id);
      if (!seen.has(r)) {
        seen.add(r);
        out.push(r);
      }
    }
    return out;
  };

  const componentMarks = () => {
    const dense = new Map();
    const out = {};
    for (const id of ids) {
      const r = uf.find(id);
      if (!dense.has(r)) dense.set(r, dense.size);
      out[id] = dense.get(r);
    }
    return out;
  };

  const membersOf = (root) => ids.filter((id) => uf.find(id) === root);

  const metrics = () => [
    { label: "Components", value: String(rootsInOrder().length) },
    { label: "Edges in tree", value: `${accepted} / ${ids.length - 1}` },
    { label: "Total weight", value: String(total) },
  ];

  const snapshot = (extra) =>
    frame({
      marks: { edges: { ...edgeState }, components: componentMarks() },
      metrics: metrics(),
      ...extra,
    });

  yield snapshot({
    phase: "Initialise",
    note: `All ${ids.length} vertices start as separate components, with no edges chosen.`,
    detail: "Colours are components. Each one is about to pick its own cheapest way out.",
  });

  while (rootsInOrder().length > 1) {
    round += 1;
    const phase = `Round ${round}`;
    const roots = rootsInOrder();
    const before = roots.length;

    yield snapshot({
      phase,
      note: `${before} components remain. Each picks the cheapest edge leaving it.`,
      detail: "The picks are independent — no component knows what any other is choosing.",
    });

    const picked = [];
    for (const root of roots) {
      const outgoing = indices.filter((i) => {
        const e = graph.edges[i];
        const a = uf.find(e.u);
        const b = uf.find(e.v);
        return a !== b && (a === root || b === root);
      });
      if (outgoing.length === 0) continue;   // component cannot reach anything

      // Lightest, ties going to the lower index. Both sides of a tie then agree
      // on the same edge, which is what stops picks closing a cycle.
      let best = outgoing[0];
      for (const i of outgoing) if (graph.edges[i].w < graph.edges[best].w) best = i;

      const already = picked.includes(best);
      if (!already) picked.push(best);
      edgeState[best] = "candidate";

      const e = graph.edges[best];
      yield snapshot({
        phase,
        note: `Component {${membersOf(root).join(" ")}} picks ${e.u}–${e.v} at weight ${e.w}.`,
        detail: already
          ? `The component on the other side had already picked ${e.u}–${e.v}. One edge, counted once.`
          : `The lightest of the ${outgoing.length} edge${outgoing.length === 1 ? "" : "s"} leaving it.`,
      });
    }

    // Edges about to fall inside a component without having been chosen. Read
    // before the merge, so each one is only ever narrated once.
    const doomed = indices.filter((i) => edgeState[i] !== "accepted" && edgeState[i] !== "rejected");

    for (const i of picked) {
      const e = graph.edges[i];
      if (uf.union(e.u, e.v)) {
        edgeState[i] = "accepted";
        total += e.w;
        accepted += 1;
      } else {
        // Two components picked their way to each other; the second is spare.
        edgeState[i] = "rejected";
      }
    }

    const swallowed = doomed.filter((i) => {
      const e = graph.edges[i];
      return edgeState[i] !== "accepted" && uf.find(e.u) === uf.find(e.v);
    });
    for (const i of swallowed) edgeState[i] = "rejected";

    const after = rootsInOrder().length;
    const names = swallowed.map((i) => `${graph.edges[i].u}–${graph.edges[i].v}`);

    yield snapshot({
      phase,
      note: `Add the ${picked.length} distinct chosen edge${picked.length === 1 ? "" : "s"} together; ${before} components become ${after}.`,
      detail: names.length > 0
        ? `Running weight ${total}. ${joinNames(names)} now lie inside a component and can never be used.`
        : `Running weight ${total}.`,
    });
  }

  yield snapshot({
    phase: "Done",
    note: `Spanning tree complete: ${accepted} edges, total weight ${total}, in ${round} rounds.`,
    detail: "Kruskal and Prim reach this same tree on this graph; only the route through it differs.",
  });
}

export const boruvka = {
  id: "mst-boruvka",
  section: "Algorithms",
  topic: "Minimum spanning tree",
  title: "Borůvka's algorithm",
  blurb: "Every component picks its own cheapest outgoing edge at once, then all of them merge",
  structure: GRAPH,
  run,

  explanation: [
    "Borůvka's algorithm is the oldest minimum spanning tree algorithm — published in 1926, before either Kruskal's or Prim's — and it is shaped quite differently from both. There is no single global decision per step. Instead every component looks at the edges leaving it, picks the cheapest, and then all of those chosen edges are added at the same time. Each round therefore does a lot of work at once, and because every surviving component must pair off with at least one other, the number of components at least halves. That caps the whole thing at O(log V) rounds.",
    "Correctness is the cut property once more, applied in parallel rather than one edge at a time. For any component, the split between it and the rest of the graph is a cut, so the cheapest edge crossing that split is safe to take. Every pick in a round is individually safe by that argument, and — with the caveat below — taking them all together is safe too, because none of them can close a cycle.",
    "That caveat is the interesting part, and it is the thing that catches people out. Two problems arise from picking simultaneously. First, one edge can be chosen twice: if A's cheapest way out is A–G and G's cheapest way out is also A–G, the edge must still be added only once, which is why the visualisation calls out the duplicate picks explicitly. Second, and worse, equal weights can produce a genuine cycle — three components each picking a different edge of the same weight can form a triangle. The fix is to break ties by a total order on the edges, here their declaration index, so that both endpoints of a tied edge always agree on the same winner. Without that rule the algorithm is simply wrong on graphs with repeated weights, and this graph has several.",
    "The reason Borůvka is worth knowing despite being the least commonly taught of the three is that it parallelises. Kruskal's sort and Prim's single growing tree are both inherently sequential, whereas a Borůvka round is a scan over the edges that different processors can split between them, with only the merge needing coordination. Essentially every modern parallel or distributed minimum spanning tree algorithm is built on this idea. Watch the component colours in the animation: seven collapse to two in a single round, then two to one.",
  ],

  analysis: {
    time: "O(E log V) — each of the O(log V) rounds scans every edge once",
    space: "O(V) for the disjoint-set structure and the per-component best edge",
    notes: [
      "Every round at least halves the component count, because each surviving component contributes an edge that merges it with at least one other. That gives at most log₂ V rounds, and since a round costs O(E) to scan, the total is O(E log V).",
      "It matches Kruskal and Prim asymptotically while avoiding both a global sort and a priority queue; the per-round scan is sequential memory access over the edge list, which is friendlier to a cache than heap traversal.",
      "The tie-breaking rule is not a detail but a correctness requirement. With repeated weights and no total order on edges, simultaneous picks can form a cycle; imposing any consistent order — index here — makes every chosen edge the unique lightest across its cut and removes the possibility.",
      "Deduplication is likewise mandatory rather than an optimisation: an edge is picked by the components at both of its ends whenever it is the cheapest exit for both, so a round yields fewer distinct edges than it has components. On this graph round one produces seven picks but only five distinct edges.",
      "Its real advantage is parallelism. A round is an independent scan per component with a single merge step, which is why distributed and GPU minimum spanning tree implementations are almost always Borůvka-based, whereas Kruskal's sort and Prim's single frontier resist splitting.",
      "Combining a few Borůvka rounds with Prim is the basis of the faster theoretical algorithms, including the O(E α(V)) Chazelle result and Karger–Klein–Tarjan's expected-linear-time randomised algorithm; Borůvka rounds cheaply shrink the vertex count before the expensive machinery starts.",
    ],
  },

  code: {
    lang: "cpp",
    source: `// Borůvka's minimum spanning tree, O(E log V).
#include <numeric>
#include <vector>

struct Edge { int u, v, w; };

struct DisjointSet {
    std::vector<int> parent, size;

    explicit DisjointSet(int n) : parent(n), size(n, 1) {
        std::iota(parent.begin(), parent.end(), 0);
    }

    int find(int x) {
        while (parent[x] != x) { parent[x] = parent[parent[x]]; x = parent[x]; }
        return x;
    }

    bool unite(int a, int b) {
        a = find(a);
        b = find(b);
        if (a == b) return false;
        if (size[a] < size[b]) std::swap(a, b);
        parent[b] = a;
        size[a] += size[b];
        return true;
    }
};

// Returns the total weight and fills "tree" with the indices of the chosen
// edges. Assumes the graph is connected.
long long boruvka(int n, const std::vector<Edge>& edges, std::vector<int>& tree) {
    DisjointSet ds(n);
    long long total = 0;
    int components = n;

    while (components > 1) {
        // cheapest[c] is the lightest edge leaving component c, or -1.
        std::vector<int> cheapest(n, -1);

        for (int i = 0; i < (int)edges.size(); ++i) {
            const int a = ds.find(edges[i].u);
            const int b = ds.find(edges[i].v);
            if (a == b) continue;                  // inside one component

            for (const int c : {a, b}) {
                const int best = cheapest[c];
                // Ties broken by index. Both ends of a tied edge then agree on
                // the same winner, which is what stops simultaneous picks
                // closing a cycle. Without this the algorithm is wrong on any
                // graph with repeated weights.
                if (best == -1 || edges[i].w < edges[best].w ||
                    (edges[i].w == edges[best].w && i < best)) {
                    cheapest[c] = i;
                }
            }
        }

        bool progress = false;
        for (int c = 0; c < n; ++c) {
            const int i = cheapest[c];
            if (i == -1) continue;
            // unite() returning false is the deduplication: the same edge is
            // picked by the components at both of its ends.
            if (ds.unite(edges[i].u, edges[i].v)) {
                tree.push_back(i);
                total += edges[i].w;
                --components;
                progress = true;
            }
        }
        if (!progress) break;                      // disconnected graph
    }
    return total;
}`,
  },
};
