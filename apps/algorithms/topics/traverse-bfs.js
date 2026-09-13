/**
 * Breadth-first search.
 *
 * Shares its graph with traverse-dfs, because the whole point of meeting these
 * two together is that the same graph and the same start vertex produce two
 * completely different trees: a shallow bush here, a single long path there.
 *
 * The problem is unweighted, so every edge carries weight 1 — the renderer
 * always draws a weight chip, and 1 is the honest value for "one step".
 *
 * The renderer has no per-vertex styling for node states, so the visible vertex
 * colouring is carried by the components channel: 0 once a vertex has been
 * taken off the queue, 1 while it is waiting on the queue, and undiscovered
 * vertices left unmapped so they stay neutral.
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

  const discovered = new Set([source]);   // seen, so never to be queued again
  const visited = new Set();              // taken off the queue
  const depth = new Map([[source, 0]]);
  const treeEdges = new Set();
  const crossEdges = new Set();
  let queue = [source];

  const nodeMarks = () => {
    const out = {};
    for (const id of ids) {
      out[id] = visited.has(id) ? "visited" : discovered.has(id) ? "frontier" : "idle";
    }
    return out;
  };

  const componentMarks = () => {
    const out = {};
    for (const id of ids) {
      if (visited.has(id)) out[id] = 0;
      else if (discovered.has(id)) out[id] = 1;
    }
    return out;
  };

  const edgeMarks = (examining) => {
    const out = {};
    for (const i of indices) {
      if (treeEdges.has(i)) out[i] = "accepted";
      else if (crossEdges.has(i)) out[i] = "rejected";
    }
    if (examining !== undefined) out[examining] = "candidate";
    return out;
  };

  const metrics = () => [
    { label: "Visited", value: `${visited.size} / ${ids.length}` },
    { label: "On the queue", value: String(queue.length) },
    { label: "Tree edges", value: `${treeEdges.size} / ${ids.length - 1}` },
  ];

  const snapshot = (extra, examining) =>
    frame({
      marks: { edges: edgeMarks(examining), nodes: nodeMarks(), components: componentMarks() },
      metrics: metrics(),
      ...extra,
    });

  yield snapshot({
    phase: "Initialise",
    note: `Start from ${source}, the only vertex discovered so far, and put it on the queue.`,
    detail: "A vertex is marked the moment it is queued, not when it is taken off — that is what stops it being queued twice.",
  });

  while (queue.length > 0) {
    const id = queue.shift();
    visited.add(id);

    yield snapshot({
      phase: "Visit",
      note: `Take ${id} off the front of the queue. It is ${depth.get(id)} step${depth.get(id) === 1 ? "" : "s"} from ${source}.`,
      detail: queue.length > 0
        ? `Queue: [${queue.join(" ")}]`
        : "Queue is empty after this one.",
    });

    for (const i of incident(id)) {
      const nb = other(i, id);

      if (!discovered.has(nb)) {
        discovered.add(nb);
        depth.set(nb, depth.get(id) + 1);
        treeEdges.add(i);
        queue.push(nb);

        yield snapshot(
          {
            phase: "Discover",
            note: `${id}–${nb} reaches ${nb} for the first time, at depth ${depth.get(nb)}. Queue it.`,
            detail: `Queue: [${queue.join(" ")}]`,
          },
          i,
        );
      } else {
        crossEdges.add(i);

        yield snapshot(
          {
            phase: "Discover",
            note: `${id}–${nb} leads to ${nb}, already discovered at depth ${depth.get(nb)}. Skip it.`,
            detail: depth.get(nb) === depth.get(id)
              ? `${id} and ${nb} are the same distance from ${source}, so this edge runs along a layer rather than between two.`
              : `${nb} was found by a route of length ${depth.get(nb)}; going via ${id} would take ${depth.get(id) + 1}, which is no shorter.`,
          },
          i,
        );
      }
    }
  }

  const missed = ids.filter((id) => !visited.has(id));
  const deepest = Math.max(...ids.filter((id) => depth.has(id)).map((id) => depth.get(id)));

  yield snapshot({
    phase: "Done",
    note: `Queue empty: ${visited.size} vertices reached, none more than ${deepest} steps from ${source}.`,
    detail: missed.length > 0
      ? `${missed.join(", ")} were never reached, so they are in a different component.`
      : `Layers from ${source}: ${[...Array(deepest + 1).keys()].map((d) => `${d}:{${ids.filter((id) => depth.get(id) === d).join(" ")}}`).join("  ")}`,
  });
}

export const bfs = {
  id: "traverse-bfs",
  section: "Algorithms",
  topic: "Traversal",
  title: "Breadth-first search",
  blurb: "Explore outward one whole layer at a time, using a queue to hold the frontier",
  structure: GRAPH,
  run,

  explanation: [
    "Breadth-first search visits a graph in order of distance from a start vertex: first the start, then everything one step away, then everything two steps away, and so on. The mechanism is a queue. Take a vertex off the front, look at each of its neighbours, and push any you have not seen before onto the back. Because the queue is first-in-first-out, vertices come off it in non-decreasing order of depth, and the layers stay separated without any explicit bookkeeping.",
    "That ordering is what makes the algorithm useful rather than merely systematic: the depth at which breadth-first search first reaches a vertex is the length of the shortest path to it. The argument is short. When a vertex is taken off the queue at depth d, everything still on the queue is at depth d or d+1, so any route discovered later has length at least d. Nothing found afterwards can beat a route already recorded. This holds only because every edge counts the same — one step. Give the edges different weights and the queue no longer comes off in distance order, which is precisely the gap Dijkstra's algorithm fills.",
    "The implementation trap is where a vertex gets marked. It has to be marked when it is pushed onto the queue, not when it is popped off. If you mark on pop, a vertex with three neighbours already in the frontier gets pushed three times, and the queue can grow exponentially on a dense graph. The animation makes the distinction visible: teal vertices are discovered and waiting on the queue, blue ones have come off it, and the skipped edges are the ones that reached an already-discovered vertex. Four of the eleven edges here are skipped, and every one of them either runs along a layer or points backwards.",
    "Compare this with the depth-first page, which uses the same graph and the same start vertex. Breadth-first search produces a wide, shallow tree of depth 3 with A holding three children immediately. Depth-first produces a single path seven edges long that happens to touch every vertex. Same graph, same edges, same starting point — the only difference is queue versus stack, and it changes the shape of the result completely.",
  ],

  analysis: {
    time: "O(V + E) — each vertex is queued once and each edge examined twice",
    space: "O(V) for the queue and the discovered set",
    notes: [
      "Every vertex enters the queue at most once, and each undirected edge is examined once from each end, giving O(V + E). That is optimal for a problem that must at least look at the input.",
      "The bound assumes adjacency lists. With an adjacency matrix, finding a vertex's neighbours costs O(V) whether or not they exist, so the whole traversal becomes O(V²) — a real penalty on sparse graphs.",
      "Marking on enqueue rather than dequeue is a correctness matter, not a tidiness one. Marking on dequeue lets the same vertex be pushed once per incoming edge, so the queue can hold O(E) entries and the same vertex is expanded repeatedly.",
      "Breadth-first search gives shortest paths only when every edge costs the same. If weights are 0 or 1 a deque works, pushing zero-weight neighbours to the front and unit-weight ones to the back; beyond that it takes a priority queue, which is Dijkstra.",
      "Its memory is the frontier, which on a wide graph can hold O(V) vertices at once — much worse than depth-first search's O(depth). That is why iterative deepening is preferred when a search tree is too large to hold a whole layer of.",
      "Running it from every vertex in turn gives all-pairs shortest paths on an unweighted graph in O(V·(V + E)), which beats Floyd–Warshall's O(V³) on any graph sparse enough that E is well under V².",
    ],
  },

  code: {
    lang: "cpp",
    source: `// Breadth-first search from one source, O(V + E).
#include <queue>
#include <vector>

// Fills "depth" with the number of edges on the shortest route from "source"
// to each vertex, and "parent" with the vertex it was first reached from.
// Unreachable vertices keep depth -1.
void bfs(const std::vector<std::vector<int>>& adj, int source,
         std::vector<int>& depth, std::vector<int>& parent) {
    const int n = static_cast<int>(adj.size());
    depth.assign(n, -1);
    parent.assign(n, -1);

    std::queue<int> q;

    // Marked on the way in, not on the way out. If a vertex were only marked
    // when popped, every edge pointing at it could push it again, and the
    // queue would grow to O(E) entries holding duplicates.
    depth[source] = 0;
    q.push(source);

    while (!q.empty()) {
        const int v = q.front();
        q.pop();

        for (const int to : adj[v]) {
            if (depth[to] != -1) continue;     // already discovered
            depth[to] = depth[v] + 1;
            parent[to] = v;
            q.push(to);
        }
    }
}`,
  },
};
