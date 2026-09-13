/**
 * Articulation points, by Tarjan's low-link.
 *
 * Same machinery as graph-bridges, deliberately on a graph that has cut
 * vertices and no bridges at all: three triangles chained through C and E.
 * Every edge lies on a cycle, so no single edge matters, yet removing C or E
 * splits the graph. That pairing is the reason this is a separate page rather
 * than a footnote.
 *
 * Vertex colouring rides on the components channel, since the renderer has no
 * node-state styling: 2 for a confirmed cut vertex, 1 while on the recursion
 * stack, 0 once finished, and unvisited vertices left unmapped.
 */

import { frame } from "../core/trace.js";

const GRAPH = {
  kind: "graph",
  nodes: [
    { id: "A", x: 0.06, y: 0.20 },
    { id: "B", x: 0.06, y: 0.68 },
    { id: "C", x: 0.30, y: 0.44 },
    { id: "D", x: 0.50, y: 0.14 },
    { id: "E", x: 0.62, y: 0.60 },
    { id: "F", x: 0.88, y: 0.32 },
    { id: "G", x: 0.90, y: 0.84 },
  ],
  edges: [
    { u: "A", v: "B", w: 1 },
    { u: "B", v: "C", w: 1 },
    { u: "C", v: "A", w: 1 },
    { u: "C", v: "D", w: 1 },
    { u: "D", v: "E", w: 1 },
    { u: "E", v: "C", w: 1 },
    { u: "E", v: "F", w: 1 },
    { u: "F", v: "G", w: 1 },
    { u: "G", v: "E", w: 1 },
  ],
};

function* run(graph) {
  const ids = graph.nodes.map((n) => n.id);
  const indices = graph.edges.map((_, i) => i);

  const incident = (id) =>
    indices.filter((i) => graph.edges[i].u === id || graph.edges[i].v === id);

  const other = (i, id) => (graph.edges[i].u === id ? graph.edges[i].v : graph.edges[i].u);

  const entry = new Map();
  const low = new Map();
  const finished = new Set();
  const path = [];
  const treeEdges = new Set();
  const backEdges = new Set();
  const cut = new Set();
  let clock = 0;

  const nodeMarks = () => {
    const out = {};
    for (const id of ids) {
      out[id] = finished.has(id) ? "visited" : entry.has(id) ? "frontier" : "idle";
    }
    return out;
  };

  const componentMarks = () => {
    const out = {};
    for (const id of ids) {
      if (cut.has(id)) out[id] = 2;
      else if (finished.has(id)) out[id] = 0;
      else if (entry.has(id)) out[id] = 1;
    }
    return out;
  };

  const edgeMarks = (examining) => {
    const out = {};
    for (const i of indices) {
      if (treeEdges.has(i)) out[i] = "accepted";
      else if (backEdges.has(i)) out[i] = "rejected";
    }
    if (examining !== undefined) out[examining] = "candidate";
    return out;
  };

  const stamp = (id) => `entry=${entry.get(id)} low=${low.get(id)}`;

  const metrics = () => [
    { label: "Visited", value: `${entry.size} / ${ids.length}` },
    { label: "Cut vertices", value: String(cut.size) },
    { label: "Stack depth", value: String(path.length) },
  ];

  const snapshot = (extra, examining) =>
    frame({
      marks: { edges: edgeMarks(examining), nodes: nodeMarks(), components: componentMarks() },
      metrics: metrics(),
      ...extra,
    });

  function* visit(id, viaEdge) {
    entry.set(id, clock);
    low.set(id, clock);
    clock += 1;
    path.push(id);
    let children = 0;

    yield snapshot(
      {
        phase: "Descend",
        note: viaEdge === undefined
          ? `Enter ${id} at time ${entry.get(id)}. It is the root, which needs its own rule.`
          : `Enter ${id} at time ${entry.get(id)} along ${graph.edges[viaEdge].u}–${graph.edges[viaEdge].v}.`,
        detail: `${stamp(id)}. A vertex is a cut vertex if some child's subtree cannot reach above it.`,
      },
      viaEdge,
    );

    for (const i of incident(id)) {
      const nb = other(i, id);

      if (!entry.has(nb)) {
        treeEdges.add(i);
        children += 1;
        yield* visit(nb, i);

        low.set(id, Math.min(low.get(id), low.get(nb)));

        // Note the >= here. Bridges use a strict >; for a cut vertex, a child
        // reaching exactly back to this vertex is not an escape route, because
        // the route still passes through it.
        const traps = low.get(nb) >= entry.get(id);
        const isCut = viaEdge !== undefined && traps;
        if (isCut) cut.add(id);

        yield snapshot(
          {
            phase: "Return",
            note: viaEdge === undefined
              ? `Back at the root ${id} from ${nb}; the root's verdict waits until all its children are done.`
              : isCut
                ? `${id} is a cut vertex: ${nb}'s subtree cannot get above it.`
                : `${nb}'s subtree escapes past ${id}, so this child does not make ${id} a cut vertex.`,
            detail: `low(${nb}) = ${low.get(nb)} against entry(${id}) = ${entry.get(id)} — ${traps ? "not lower, so every route out of that subtree goes through " + id : "lower, so a back edge bypasses " + id}. ${id} now has ${stamp(id)}.`,
          },
          i,
        );
        continue;
      }

      if (i === viaEdge) {
        yield snapshot(
          {
            phase: "Skip",
            note: `${id}–${nb} is the edge we arrived by, so it is not evidence of an escape route.`,
            detail: "Counting the parent edge would make low collapse and hide every cut vertex.",
          },
          i,
        );
        continue;
      }

      backEdges.add(i);
      low.set(id, Math.min(low.get(id), entry.get(nb)));

      yield snapshot(
        {
          phase: "Skip",
          note: `${id}–${nb} is a back edge up to time ${entry.get(nb)}.`,
          detail: `low(${id}) drops to ${low.get(id)}, which is how ${id}'s subtree proves it can escape without its parent.`,
        },
        i,
      );
    }

    if (viaEdge === undefined) {
      // The root has no ancestors, so the low test is meaningless for it. It is
      // a cut vertex exactly when it holds two or more separate subtrees.
      if (children > 1) cut.add(id);
      yield snapshot({
        phase: "Return",
        note: children > 1
          ? `The root ${id} has ${children} separate subtrees, so removing it would split them apart.`
          : `The root ${id} has only ${children} subtree, so removing it leaves the rest connected.`,
        detail: "The low test cannot apply to the root, which has nothing above it; counting its depth-first children is the replacement.",
      });
    }

    path.pop();
    finished.add(id);
  }

  yield snapshot({
    phase: "Initialise",
    note: "A cut vertex is one whose removal disconnects the graph. The same depth-first pass that finds bridges finds these.",
    detail: "Every edge here lies on a triangle, so there are no bridges at all — which does not stop some vertices from being critical.",
  });

  for (const id of ids) {
    if (!entry.has(id)) yield* visit(id, undefined);
  }

  const names = ids.filter((id) => cut.has(id));

  yield snapshot({
    phase: "Done",
    note: `${cut.size} cut vertices: ${names.join(", ")}. No edge is a bridge.`,
    detail: `Removing ${names[0]} strands A and B; removing ${names[1]} strands F and G. Yet every single edge sits on a triangle, so no individual edge matters — cut vertices and bridges are genuinely different questions.`,
  });
}

export const articulation = {
  id: "graph-articulation",
  section: "Algorithms",
  topic: "Connectivity",
  title: "Articulation points",
  blurb: "Find every vertex whose removal would disconnect the graph, reusing the low-link pass",
  structure: GRAPH,
  run,

  explanation: [
    "An articulation point, or cut vertex, is a vertex whose removal increases the number of connected components. In a network it is the machine whose failure partitions everything else. The test uses the same two numbers as the bridge algorithm — entry, when a vertex was first reached, and low, the shallowest entry time reachable from its subtree — but the condition is subtly different, and the difference is the whole content of this page.",
    "For a non-root vertex u with a depth-first child v, u is a cut vertex when low(v) is greater than or equal to entry(u). Compare that with the bridge condition on the edge u–v, which is a strict low(v) greater than entry(u). The equality case is exactly where they part. If low(v) equals entry(u), then v's subtree can reach back to u itself but no further, so the edge u–v is not a bridge — there is another route to u — yet every one of those routes still passes through u, so removing u strands the subtree anyway. Getting > and >= the wrong way round is the standard bug, and it produces an implementation that is right about bridges and wrong about cut vertices.",
    "The root of the depth-first tree needs a separate rule, because it has no ancestors for the low test to refer to. The root is a cut vertex precisely when it has two or more depth-first children, since each child's subtree is joined to the rest only through the root. One child means the graph below stays connected without it. On this graph the search starts at A, which ends up with a single child, so it is correctly not reported — a good check that the root rule is actually implemented rather than assumed away.",
    "The graph is three triangles chained together, sharing C and E. Because every edge lies on a triangle, no edge is a bridge: any single edge can be removed and the graph stays connected. But C and E are both cut vertices — deleting C strands A and B, deleting E strands F and G. That is the cleanest way to see that the two notions are independent, and it also runs the other way: the endpoints of a bridge need not be cut vertices, as a bridge to a leaf shows.",
  ],

  analysis: {
    time: "O(V + E) — one depth-first traversal",
    space: "O(V) for entry and low, plus recursion depth up to V",
    notes: [
      "It shares its traversal with the bridge algorithm, so both sets can be produced in the same O(V+E) pass. The only differences are >= in place of >, and the special handling of the root.",
      "The equality case is what separates the two conditions. low(v) == entry(u) means v's subtree reaches u but nothing above it, so u–v is not a bridge while u is still a cut vertex; this graph is built entirely out of that case.",
      "The root rule is not an optimisation but a necessity, since the low condition refers to ancestors the root does not have. Counting depth-first children is the substitute, and it must be depth-first children rather than neighbours.",
      "A graph with no cut vertices is biconnected. Splitting a graph at its cut vertices gives its biconnected components, which form a tree — the block-cut tree — whose structure is what algorithms on nearly-biconnected graphs exploit.",
      "Cut vertices and bridges are independent properties. A graph can have cut vertices and no bridges, as here, and an endpoint of a bridge need not be a cut vertex, as happens when the bridge leads to a leaf.",
      "The same pass generalises: tracking the second-smallest low value gives the vertices whose removal splits the graph into a specific number of pieces, and the edge-based variant gives 2-edge-connected components.",
    ],
  },

  code: {
    lang: "cpp",
    source: `// Articulation points of an undirected graph, O(V + E).
#include <algorithm>
#include <vector>

struct Arc { int to, id; };

struct Articulation {
    const std::vector<std::vector<Arc>>& adj;
    std::vector<int> entry, low;
    std::vector<char> is_cut;
    int clock = 0;

    explicit Articulation(const std::vector<std::vector<Arc>>& g)
        : adj(g), entry(g.size(), -1), low(g.size(), -1), is_cut(g.size(), 0) {}

    void visit(int v, int via) {
        entry[v] = low[v] = clock++;
        int children = 0;

        for (const Arc& a : adj[v]) {
            if (a.id == via) continue;

            if (entry[a.to] == -1) {
                ++children;
                visit(a.to, a.id);
                low[v] = std::min(low[v], low[a.to]);

                // Note >=, where the bridge test uses a strict >. If the child
                // reaches back to exactly v, the edge is not a bridge but v is
                // still a cut vertex, because every escape route runs through v.
                if (via != -1 && low[a.to] >= entry[v]) is_cut[v] = 1;
            } else {
                low[v] = std::min(low[v], entry[a.to]);
            }
        }

        // The root has no ancestor, so the low test says nothing about it. It
        // matters exactly when it holds more than one subtree together.
        if (via == -1 && children > 1) is_cut[v] = 1;
    }

    void run() {
        for (int v = 0; v < (int)adj.size(); ++v) {
            if (entry[v] == -1) visit(v, -1);
        }
    }
};`,
  },
};
