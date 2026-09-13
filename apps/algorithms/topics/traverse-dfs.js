/**
 * Depth-first search.
 *
 * Shares its graph and its start vertex with traverse-bfs. On this graph the
 * two could hardly disagree more: breadth-first builds a bush of depth 3,
 * depth-first walks a single path seven edges long that touches everything.
 *
 * The problem is unweighted, so every edge carries weight 1 — the renderer
 * always draws a weight chip, and 1 is the honest value for "one step".
 *
 * The renderer has no per-vertex styling for node states, so the visible vertex
 * colouring is carried by the components channel: 1 while a vertex is on the
 * recursion stack, 0 once it has been backtracked out of, and unvisited
 * vertices left unmapped so they stay neutral. The teal run of vertices is
 * therefore exactly the current path.
 */

import { frame } from "../core/trace.js";

const GRAPH = {
  kind: "graph",
  nodes: [
    { id: "A", x: 0.06, y: 0.50 },
    { id: "B", x: 0.30, y: 0.14 },
    { id: "C", x: 0.30, y: 0.50 },
    { id: "D", x: 0.30, y: 0.86 },
    { id: "E", x: 0.56, y: 0.06 },
    { id: "F", x: 0.56, y: 0.42 },
    { id: "G", x: 0.56, y: 0.78 },
    { id: "H", x: 0.86, y: 0.42 },
  ],
  edges: [
    { u: "A", v: "B", w: 1 },
    { u: "A", v: "C", w: 1 },
    { u: "A", v: "D", w: 1 },
    { u: "B", v: "E", w: 1 },
    { u: "B", v: "F", w: 1 },
    { u: "C", v: "F", w: 1 },
    { u: "D", v: "G", w: 1 },
    { u: "E", v: "H", w: 1 },
    { u: "F", v: "H", w: 1 },
    { u: "G", v: "H", w: 1 },
    { u: "C", v: "G", w: 1 },
  ],
};

function* run(graph) {
  const ids = graph.nodes.map((n) => n.id);
  const indices = graph.edges.map((_, i) => i);
  const source = ids[0];

  const incident = (id) =>
    indices.filter((i) => graph.edges[i].u === id || graph.edges[i].v === id);

  const other = (i, id) => (graph.edges[i].u === id ? graph.edges[i].v : graph.edges[i].u);

  const visited = new Set();
  const finished = new Set();
  const treeEdges = new Set();
  const backEdges = new Set();
  const path = [];              // the recursion stack, root first

  const nodeMarks = () => {
    const out = {};
    for (const id of ids) {
      out[id] = finished.has(id) ? "visited" : visited.has(id) ? "frontier" : "idle";
    }
    return out;
  };

  const componentMarks = () => {
    const out = {};
    for (const id of ids) {
      if (finished.has(id)) out[id] = 0;
      else if (visited.has(id)) out[id] = 1;
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

  const metrics = () => [
    { label: "Visited", value: `${visited.size} / ${ids.length}` },
    { label: "Stack depth", value: String(path.length) },
    { label: "Tree edges", value: `${treeEdges.size} / ${ids.length - 1}` },
  ];

  const snapshot = (extra, examining) =>
    frame({
      marks: { edges: edgeMarks(examining), nodes: nodeMarks(), components: componentMarks() },
      metrics: metrics(),
      ...extra,
    });

  function* visit(id, viaEdge) {
    visited.add(id);
    path.push(id);

    yield snapshot(
      {
        phase: "Descend",
        note: viaEdge === undefined
          ? `Start at ${id} and go as deep as possible before looking at anything else.`
          : `Follow ${graph.edges[viaEdge].u}–${graph.edges[viaEdge].v} down to ${id}, now ${path.length - 1} edges deep.`,
        detail: `Path: ${path.join("–")}`,
      },
      viaEdge,
    );

    for (const i of incident(id)) {
      const nb = other(i, id);

      if (!visited.has(nb)) {
        treeEdges.add(i);
        yield* visit(nb, i);
        continue;
      }

      if (i === viaEdge) {
        yield snapshot(
          {
            phase: "Skip",
            note: `${id}–${nb} is the edge we arrived by, so there is nothing to follow.`,
            detail: `Path: ${path.join("–")}`,
          },
          i,
        );
        continue;
      }

      backEdges.add(i);
      const onPath = path.includes(nb);

      yield snapshot(
        {
          phase: "Skip",
          note: `${id}–${nb} reaches ${nb}, already visited. It closes a cycle instead of finding anything new.`,
          detail: onPath
            ? `${nb} is still on the current path, so ${id}–${nb} is a back edge and the cycle it closes is ${path.length - path.indexOf(nb)} vertices long.`
            : `${nb} was fully explored earlier. In an undirected graph this is still a back edge — seen from ${nb}'s side, ${id} was its descendant.`,
        },
        i,
      );
    }

    path.pop();
    finished.add(id);

    yield snapshot({
      phase: "Backtrack",
      note: `${id} has no unvisited neighbours left, so retreat from it.`,
      detail: path.length > 0
        ? `Back to ${path[path.length - 1]}. Path: ${path.join("–")}`
        : "The walk has unwound all the way to the start.",
    });
  }

  yield snapshot({
    phase: "Initialise",
    note: `Nothing visited yet. Depth-first search will commit to one direction and follow it to the end.`,
    detail: "Teal marks the vertices currently on the recursion stack; blue ones have been finished and left behind.",
  });

  for (const id of ids) {
    if (!visited.has(id)) yield* visit(id, undefined);
  }

  const deepest = treeEdges.size;

  yield snapshot({
    phase: "Done",
    note: `Every vertex visited: ${treeEdges.size} tree edges and ${backEdges.size} edges that closed cycles.`,
    detail: `The tree here is a single path ${deepest} edges long. Breadth-first search on this same graph reaches everything within 3 steps.`,
  });
}

export const dfs = {
  id: "traverse-dfs",
  section: "Algorithms",
  topic: "Traversal",
  title: "Depth-first search",
  blurb: "Commit to one direction and follow it as far as it goes, backtracking only when stuck",
  structure: GRAPH,
  run,

  explanation: [
    "Depth-first search explores a graph by committing. From the current vertex it picks an unvisited neighbour and goes there immediately, repeating until it reaches a vertex whose neighbours have all been seen; only then does it retreat one step and try the next option. Recursion supplies the stack for free, which is why the algorithm is usually five lines long. On this graph it walks A to B to E to H to F to C to G to D — a single path through all eight vertices — while breadth-first search from the same start reaches everything within three steps.",
    "On its own, visiting everything is not much of a claim; breadth-first search does that too. What makes depth-first search the more powerful of the two is the structure it leaves behind. Classify each edge as a tree edge, used to descend, or a non-tree edge, and then note this: in an undirected graph every non-tree edge joins a vertex to one of its own ancestors in the tree. There are no edges between separate branches. If there were such an edge, whichever endpoint the search reached first would have descended along it before finishing, making it a tree edge — a contradiction.",
    "That single fact is why so much rests on depth-first search. Because a non-tree edge always reaches an ancestor, one number per vertex — the shallowest depth reachable from its subtree — is enough to detect cycles, find bridges, and find articulation points, all in one pass. The directed case adds forward and cross edges and gives topological sorting and Tarjan's strongly connected components. In the animation, the teal vertices are exactly the current recursion stack, and a dashed edge to a teal vertex is a genuine back edge closing a cycle you can trace; a dashed edge to a blue vertex is the same edge seen later from the other end.",
    "The practical difficulty is the recursion. Depth can reach V, so on a long path — like this graph, which is nearly a worst case — a recursive implementation on a million-vertex graph will exhaust the call stack. Rewriting it iteratively is less mechanical than it looks: pushing bare vertices onto a stack reverses the order neighbours are tried and, more importantly, loses the information about when a vertex is finished, which is what the ancestor-based algorithms need. The honest iterative version stores a position in each vertex's neighbour list alongside the vertex, which is exactly what the recursive one keeps in its frames.",
  ],

  analysis: {
    time: "O(V + E) — each vertex entered once, each edge examined once from each end",
    space: "O(V) for the visited set, plus recursion depth which can itself reach V",
    notes: [
      "Each vertex is entered once and each undirected edge examined twice, once from each endpoint, so the traversal is O(V + E) and optimal. As with breadth-first search, an adjacency matrix pushes it to O(V²).",
      "Recursion depth equals the longest path the search takes, which can be V. A graph that is essentially a long chain will overflow a default stack somewhere around a hundred thousand to a million frames, and this graph is that shape in miniature — depth 7 out of 8 vertices.",
      "In an undirected graph the only edge kinds are tree edges and back edges to an ancestor; cross edges cannot occur. That is the structural fact behind single-pass bridge and articulation-point detection, and it fails for directed graphs, which also admit forward and cross edges.",
      "Depth-first search says nothing about shortest paths. The path it takes to a vertex can be arbitrarily longer than the shortest one — here its tree has depth 7 where breadth-first search proves everything is within 3.",
      "The naive iterative rewrite, pushing neighbours onto a stack, visits neighbours in reverse order and gives no hook for the moment a vertex is finished. Keeping an index into each vertex's adjacency list preserves both, at the cost of looking much more like the recursive version.",
      "Its uses are mostly the things breadth-first search cannot do: topological ordering, Tarjan's strongly connected components, bridges and articulation points, and cycle detection all fall out of one traversal in O(V + E).",
    ],
  },

  code: {
    lang: "cpp",
    source: `// Depth-first search over an undirected graph, O(V + E).
#include <vector>

// Builds the depth-first tree: "parent" is the vertex each was first reached
// from, "entered" the order it was first seen, "left" the order it was
// finished. Having both makes ancestry an O(1) test afterwards, which is what
// the cycle, bridge and articulation-point algorithms are built on.
struct Dfs {
    const std::vector<std::vector<int>>& adj;
    std::vector<int> parent, entered, left;
    int clock = 0;

    explicit Dfs(const std::vector<std::vector<int>>& g)
        : adj(g), parent(g.size(), -1),
          entered(g.size(), -1), left(g.size(), -1) {}

    void visit(int v) {
        entered[v] = clock++;

        for (const int to : adj[v]) {
            if (entered[to] == -1) {          // unseen: descend, a tree edge
                parent[to] = v;
                visit(to);
            }
            // Otherwise it is a back edge to an ancestor. In an undirected
            // graph that is the only other possibility — there are no cross
            // edges between branches, which is why one number per vertex is
            // enough to find cycles and bridges.
        }

        left[v] = clock++;
    }

    void run() {
        // A graph may be disconnected, so every vertex needs a chance to start
        // its own tree.
        for (int v = 0; v < (int)adj.size(); ++v) {
            if (entered[v] == -1) visit(v);
        }
    }
};`,
  },
};
