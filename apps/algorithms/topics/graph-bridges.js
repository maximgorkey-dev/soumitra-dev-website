/**
 * Bridges, by Tarjan's low-link.
 *
 * The natural companion to traverse-dfs: it depends entirely on the fact
 * established there, that an undirected depth-first search produces only tree
 * edges and back edges to ancestors. Because there are no cross edges, one
 * number per vertex is enough to decide every bridge in a single pass.
 *
 * The graph is two triangles joined by a single edge, with a tail hanging off
 * one of them, so the answer is three bridges out of nine edges.
 *
 * The renderer has no per-vertex styling for node states, so vertex colouring
 * rides on the components channel: 1 while on the recursion stack, 0 once
 * finished, and unvisited vertices left unmapped.
 */

import { frame } from "../core/trace.js";

const GRAPH = {
  kind: "graph",
  nodes: [
    { id: "A", x: 0.05, y: 0.25 },
    { id: "B", x: 0.05, y: 0.72 },
    { id: "C", x: 0.26, y: 0.48 },
    { id: "D", x: 0.48, y: 0.48 },
    { id: "E", x: 0.66, y: 0.16 },
    { id: "F", x: 0.66, y: 0.80 },
    { id: "G", x: 0.88, y: 0.16 },
    { id: "H", x: 0.96, y: 0.55 },
  ],
  edges: [
    { u: "A", v: "B", w: 1 },
    { u: "B", v: "C", w: 1 },
    { u: "C", v: "A", w: 1 },
    { u: "C", v: "D", w: 1 },
    { u: "D", v: "E", w: 1 },
    { u: "E", v: "F", w: 1 },
    { u: "F", v: "D", w: 1 },
    { u: "E", v: "G", w: 1 },
    { u: "G", v: "H", w: 1 },
  ],
};

function* run(graph) {
  const ids = graph.nodes.map((n) => n.id);
  const indices = graph.edges.map((_, i) => i);

  const incident = (id) =>
    indices.filter((i) => graph.edges[i].u === id || graph.edges[i].v === id);

  const other = (i, id) => (graph.edges[i].u === id ? graph.edges[i].v : graph.edges[i].u);

  const entry = new Map();      // discovery time
  const low = new Map();        // shallowest entry time reachable from the subtree
  const finished = new Set();
  const path = [];              // recursion stack
  const treeEdges = new Set();
  const backEdges = new Set();
  const bridges = new Set();
  const cyclic = new Set();     // tree edges proven to sit on a cycle
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
      if (finished.has(id)) out[id] = 0;
      else if (entry.has(id)) out[id] = 1;
    }
    return out;
  };

  const edgeMarks = (examining) => {
    const out = {};
    for (const i of indices) {
      if (bridges.has(i)) out[i] = "accepted";
      else if (backEdges.has(i) || cyclic.has(i)) out[i] = "rejected";
      else if (treeEdges.has(i)) out[i] = "candidate";
    }
    if (examining !== undefined) out[examining] = "candidate";
    return out;
  };

  const stamp = (id) => `entry=${entry.get(id)} low=${low.get(id)}`;

  const metrics = () => [
    { label: "Visited", value: `${entry.size} / ${ids.length}` },
    { label: "Bridges found", value: String(bridges.size) },
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

    yield snapshot(
      {
        phase: "Descend",
        note: viaEdge === undefined
          ? `Enter ${id} at time ${entry.get(id)}. Its low value starts equal to its own entry time.`
          : `Enter ${id} at time ${entry.get(id)} along ${graph.edges[viaEdge].u}–${graph.edges[viaEdge].v}.`,
        detail: `${stamp(id)}. low will end up as the shallowest entry time anything in ${id}'s subtree can reach.`,
      },
      viaEdge,
    );

    for (const i of incident(id)) {
      const nb = other(i, id);

      if (!entry.has(nb)) {
        treeEdges.add(i);
        yield* visit(nb, i);

        // Back from the child: its low value decides whether this edge is a bridge.
        low.set(id, Math.min(low.get(id), low.get(nb)));
        const isBridge = low.get(nb) > entry.get(id);
        if (isBridge) bridges.add(i);
        else cyclic.add(i);

        yield snapshot(
          {
            phase: "Return",
            note: isBridge
              ? `${id}–${nb} is a bridge: nothing under ${nb} can reach ${id} or above.`
              : `${id}–${nb} is not a bridge: something under ${nb} reaches back past ${id}.`,
            detail: isBridge
              ? `low(${nb}) = ${low.get(nb)} is greater than entry(${id}) = ${entry.get(id)}, so removing this edge strands ${nb}'s subtree. ${id} now has ${stamp(id)}.`
              : `low(${nb}) = ${low.get(nb)} is not greater than entry(${id}) = ${entry.get(id)}, so a back edge bypasses it. ${id} now has ${stamp(id)}.`,
          },
          i,
        );
        continue;
      }

      if (i === viaEdge) {
        yield snapshot(
          {
            phase: "Skip",
            note: `${id}–${nb} is the edge we arrived by, so it tells us nothing new.`,
            detail: "The parent edge is deliberately ignored; counting it would make every tree edge look bypassed.",
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
          note: `${id}–${nb} is a back edge to an ancestor at time ${entry.get(nb)}.`,
          detail: `It pulls low(${id}) down to ${low.get(id)}, and every edge between here and ${nb} is now known to sit on a cycle.`,
        },
        i,
      );
    }

    path.pop();
    finished.add(id);
  }

  yield snapshot({
    phase: "Initialise",
    note: "A bridge is an edge whose removal disconnects the graph. One depth-first pass finds them all.",
    detail: "Each vertex gets an entry time and a low value; a tree edge is a bridge exactly when the child's low exceeds the parent's entry time.",
  });

  for (const id of ids) {
    if (!entry.has(id)) yield* visit(id, undefined);
  }

  const names = [...bridges].sort((a, b) => a - b).map((i) => `${graph.edges[i].u}–${graph.edges[i].v}`);

  yield snapshot({
    phase: "Done",
    note: `${bridges.size} bridges out of ${graph.edges.length} edges: ${names.join(", ")}.`,
    detail: `Every other edge lies on a cycle, so it can be removed without splitting the graph. The two triangles survive losing any single one of their own edges.`,
  });
}

export const bridges = {
  id: "graph-bridges",
  section: "Algorithms",
  topic: "Connectivity",
  title: "Bridges",
  blurb: "Find every edge whose removal would disconnect the graph, in a single depth-first pass",
  structure: GRAPH,
  run,

  explanation: [
    "A bridge is an edge whose removal increases the number of connected components — a single point of failure in a network. The obvious way to find them all is to remove each edge in turn and check connectivity, which costs O(E·(V+E)). Tarjan's method does it in one traversal instead, and the whole saving comes from one observation about depth-first search on an undirected graph.",
    "That observation is the one the depth-first page establishes: every non-tree edge joins a vertex to one of its own ancestors. There are no edges between separate branches. So give each vertex two numbers — entry, the time it was first reached, and low, the shallowest entry time reachable from anywhere in its subtree, including by following one back edge. Then a tree edge from parent u to child v is a bridge exactly when low(v) is greater than entry(u). Read that condition directly: nothing in v's subtree can reach u or anything above it except by coming back through this very edge, so cutting it strands the subtree. If instead some descendant of v has a back edge reaching u or higher, that back edge provides an alternative route and the edge is safe.",
    "Two details decide whether an implementation is correct. First, the parent edge must be excluded when computing low, because using it would let every vertex reach its parent trivially and no edge would ever look like a bridge. Excluding it by parent vertex rather than by edge is the classic bug, since it also wrongly discards genuine parallel edges. Second, low takes entry(neighbour) for a back edge but low(child) for a tree edge; mixing those up gives an algorithm that appears to work on small examples and fails on deeper ones.",
    "The graph here is built so the answer is easy to check by eye: two triangles joined by the single edge C–D, with the tail E–G–H hanging off the right-hand one. C–D, E–G and G–H are bridges; the six triangle edges are not, because each sits on a cycle. Watch the low values in the frame details — a back edge immediately pulls one down, and that is what disqualifies every edge between it and the ancestor it reaches.",
  ],

  analysis: {
    time: "O(V + E) — one depth-first traversal, with constant work per edge",
    space: "O(V) for the entry and low arrays, plus recursion depth up to V",
    notes: [
      "The naive approach removes each edge and retests connectivity at O(E·(V+E)); the low-link pass replaces that with two integers per vertex and a single O(V+E) traversal. That is the standard example of what the depth-first tree structure buys you.",
      "Excluding the parent must be done by edge, not by vertex. Skipping every neighbour equal to the parent silently mishandles parallel edges, which are exactly the case where an edge is not a bridge despite looking like a tree edge.",
      "A graph with no bridges at all is called 2-edge-connected, and the bridges are precisely the edges not lying on any cycle. Contracting each 2-edge-connected component gives the bridge tree, whose edges are the bridges and which is always a forest.",
      "Bridges and articulation points come from the same pass but are not interchangeable. An endpoint of a bridge need not be an articulation point, and a graph can have articulation points with no bridges at all — two triangles sharing a single vertex being the standard example.",
      "The recursion depth is the depth-first depth and can reach V, so the same stack-overflow caveat as plain depth-first search applies; production implementations on large graphs use an explicit stack holding a position in each adjacency list.",
      "The online version, maintaining bridges as edges are added, is much harder and needs link-cut trees or similar; the offline single-pass version being this cheap is what makes it worth knowing.",
    ],
  },

  code: {
    lang: "cpp",
    source: `// Bridges of an undirected graph by Tarjan's low-link, O(V + E).
#include <algorithm>
#include <vector>

struct Arc { int to, id; };   // neighbour, plus which edge was used

struct Bridges {
    const std::vector<std::vector<Arc>>& adj;
    std::vector<int> entry, low;
    std::vector<int> found;                 // edge ids that are bridges
    int clock = 0;

    explicit Bridges(const std::vector<std::vector<Arc>>& g)
        : adj(g), entry(g.size(), -1), low(g.size(), -1) {}

    // "via" is the edge id we arrived by, not the parent vertex. Excluding by
    // vertex instead would mishandle parallel edges, which are never bridges.
    void visit(int v, int via) {
        entry[v] = low[v] = clock++;

        for (const Arc& a : adj[v]) {
            if (a.id == via) continue;           // the edge we came in on

            if (entry[a.to] == -1) {             // tree edge: recurse
                visit(a.to, a.id);
                low[v] = std::min(low[v], low[a.to]);

                // Nothing under a.to can reach v or above except through this
                // edge, so cutting it strands that subtree.
                if (low[a.to] > entry[v]) found.push_back(a.id);
            } else {
                // Back edge to an ancestor: take its entry time, not its low.
                low[v] = std::min(low[v], entry[a.to]);
            }
        }
    }

    void run() {
        for (int v = 0; v < (int)adj.size(); ++v) {
            if (entry[v] == -1) visit(v, -1);
        }
    }
};`,
  },
};
