/**
 * Tree diameter, by two breadth-first sweeps.
 *
 * The tree is shaped so the second sweep ends in a genuine tie: D and H are
 * both at distance 5 from G. That is worth showing, because it makes the point
 * that the diameter is a distance and the endpoints need not be unique.
 *
 * The first sweep starts at A, which is not on any diameter path, so the
 * "start anywhere" claim is actually being exercised rather than assumed.
 *
 * Vertex highlighting uses the components channel, since the renderer has no
 * node-state styling.
 */

import { frame } from "../core/trace.js";

const GRAPH = {
  kind: "graph",
  nodes: [
    { id: "A", x: 0.06, y: 0.50 },
    { id: "B", x: 0.24, y: 0.50 },
    { id: "C", x: 0.46, y: 0.22 },
    { id: "D", x: 0.68, y: 0.08 },
    { id: "E", x: 0.46, y: 0.78 },
    { id: "F", x: 0.70, y: 0.78 },
    { id: "G", x: 0.92, y: 0.78 },
    { id: "H", x: 0.68, y: 0.34 },
  ],
  edges: [
    { u: "A", v: "B", w: 1 },
    { u: "B", v: "C", w: 1 },
    { u: "C", v: "D", w: 1 },
    { u: "B", v: "E", w: 1 },
    { u: "E", v: "F", w: 1 },
    { u: "F", v: "G", w: 1 },
    { u: "C", v: "H", w: 1 },
  ],
};

function* run(graph) {
  const ids = graph.nodes.map((n) => n.id);
  const indices = graph.edges.map((_, i) => i);

  const incident = (id) =>
    indices.filter((i) => graph.edges[i].u === id || graph.edges[i].v === id);

  const other = (i, id) => (graph.edges[i].u === id ? graph.edges[i].v : graph.edges[i].u);

  let pass = 0;
  let source = null;
  let dist = new Map();
  let queue = [];
  let done = new Set();
  let treeEdge = new Map();  // vertex -> edge that discovered it
  let best = null;

  const nodeMarks = () => {
    const out = {};
    for (const id of ids) {
      if (done.has(id)) out[id] = "visited";
      else if (dist.has(id)) out[id] = "frontier";
      else out[id] = "idle";
    }
    return out;
  };

  const componentMarks = () => {
    const out = {};
    for (const id of ids) {
      if (id === source) out[id] = 2;
      else if (done.has(id)) out[id] = 0;
      else if (dist.has(id)) out[id] = 1;
    }
    return out;
  };

  const edgeMarks = () => {
    const out = {};
    for (const i of indices) {
      if ([...treeEdge.values()].includes(i)) out[i] = "accepted";
    }
    return out;
  };

  const metrics = () => [
    { label: "Pass", value: pass === 0 ? "—" : `${pass} of 2` },
    { label: "Visited", value: `${done.size} / ${ids.length}` },
    { label: "Farthest", value: best === null ? "—" : `${best.id} at ${best.d}` },
  ];

  const snapshot = (extra) =>
    frame({
      marks: { edges: edgeMarks(), nodes: nodeMarks(), components: componentMarks() },
      metrics: metrics(),
      ...extra,
    });

  // One breadth-first sweep, narrating each vertex as it leaves the queue.
  // Returns the farthest vertex, breaking ties by dequeue order.
  function* sweep(start, label) {
    source = start;
    dist = new Map([[start, 0]]);
    queue = [start];
    done = new Set();
    treeEdge = new Map();
    best = { id: start, d: 0 };

    yield snapshot({
      phase: "Sweep",
      note: label,
      detail: `Breadth-first from ${start}. In a tree there is exactly one path between any two vertices, so the first time we reach a vertex is the only way to reach it.`,
    });

    let ties = [];

    while (queue.length > 0) {
      const v = queue.shift();
      done.add(v);

      const d = dist.get(v);
      if (d > best.d) {
        best = { id: v, d };
        ties = [v];
      } else if (d === best.d && v !== start) {
        ties.push(v);
      }

      const discovered = [];
      for (const i of incident(v)) {
        const nb = other(i, v);
        if (dist.has(nb)) continue;
        dist.set(nb, d + 1);
        treeEdge.set(nb, i);
        queue.push(nb);
        discovered.push(nb);
      }

      yield snapshot({
        phase: "Visit",
        note: `${v} comes off the queue at distance ${d}${discovered.length ? `, adding ${discovered.join(", ")}` : ""}.`,
        detail: discovered.length
          ? `Queue now holds ${queue.join(", ")}. Every edge except the one we arrived by leads somewhere new, because a tree has no cycles to fold back on.`
          : `${v} is a leaf, or everything around it is already known. Furthest so far is ${best.id} at ${best.d}.`,
      });
    }

    const tied = ties.filter((id) => dist.get(id) === best.d);

    yield snapshot({
      phase: "Farthest",
      note: tied.length > 1
        ? `${tied.join(" and ")} are tied at distance ${best.d} from ${start}.`
        : `${best.id} is the farthest vertex from ${start}, at distance ${best.d}.`,
      detail: tied.length > 1
        ? `A tie is fine: the diameter is a distance, not a unique pair of endpoints. Taking ${best.id} gives one valid diameter path, and ${tied.filter((t) => t !== best.id).join(", ")} would give another of the same length.`
        : `In a tree, the vertex farthest from any starting point is always an endpoint of some longest path. That claim is what the second sweep relies on, and it is false in general graphs.`,
    });

    return best;
  }

  yield snapshot({
    phase: "Initialise",
    note: "The diameter is the longest path between any two vertices. Two breadth-first sweeps find it.",
    detail: `Checking all pairs would mean ${ids.length} separate traversals. Two suffice, because of a structural fact that holds in trees and nowhere else.`,
  });

  pass = 1;
  const first = yield* sweep(
    ids[0],
    `Sweep one, from ${ids[0]} — chosen arbitrarily, and not on a longest path as it turns out.`,
  );

  pass = 2;
  const second = yield* sweep(
    first.id,
    `Sweep two, from ${first.id}. This one measures the diameter itself.`,
  );

  // Walk the discovery edges back from the far endpoint to recover the path.
  const path = [second.id];
  const pathEdges = new Set();
  let cur = second.id;
  while (treeEdge.has(cur)) {
    const i = treeEdge.get(cur);
    pathEdges.add(i);
    cur = other(i, cur);
    path.push(cur);
  }

  const onPath = new Set(path);

  yield frame({
    phase: "Done",
    note: `The diameter is ${second.d}, along ${path.slice().reverse().join(" → ")}.`,
    detail: `The path runs from ${first.id} to ${second.id} through ${path.length - 2} intermediate vertices. Its midpoint is the tree's centre, and the radius is ${Math.ceil(second.d / 2)} — every vertex lies within that distance of the centre.`,
    marks: {
      edges: Object.fromEntries(
        indices.map((i) => [i, pathEdges.has(i) ? "accepted" : "rejected"]),
      ),
      nodes: Object.fromEntries(ids.map((id) => [id, onPath.has(id) ? "visited" : "idle"])),
      components: Object.fromEntries(
        ids.map((id) => [
          id,
          id === first.id || id === second.id ? 2 : onPath.has(id) ? 1 : 0,
        ]),
      ),
    },
    metrics: [
      { label: "Pass", value: "2 of 2" },
      { label: "Visited", value: `${ids.length} / ${ids.length}` },
      { label: "Farthest", value: `${second.id} at ${second.d}` },
    ],
  });
}

export const diameter = {
  id: "tree-diameter",
  section: "Algorithms",
  topic: "Trees",
  title: "Tree diameter",
  blurb: "Find the longest path in a tree with two breadth-first sweeps instead of one per vertex",
  structure: GRAPH,
  run,

  explanation: [
    "The diameter of a tree is the number of edges on the longest path between any two of its vertices. The direct approach runs a breadth-first search from every vertex and takes the largest distance seen, costing O(V·(V+E)), which in a tree is O(V²). Two sweeps are enough instead, and the reason is a structural property of trees that does not survive generalisation.",
    "The claim is this: for any starting vertex s, the vertex farthest from s is an endpoint of some longest path. Given that, the algorithm writes itself — sweep from anywhere to find a farthest vertex u, then sweep from u, and the greatest distance found in the second sweep is the diameter. The proof of the claim is a short contradiction argument. Suppose the farthest vertex u from s is not a diameter endpoint, and let x–y be a genuine diameter path. Because a tree has a unique path between any two vertices, the path from s to u and the path x–y either meet or they do not; if they do not, the connecting path between them can be spliced to build something longer than x–y, and if they do meet at some vertex m, then dist(m,u) is at least dist(m,x) and dist(m,y) by the choice of u, so swapping u in for whichever endpoint is nearer gives a path at least as long. Either way a diameter path ending at u exists.",
    "The essential caveat is that this fails on general graphs. The argument leans on the uniqueness of paths in a tree, and once cycles exist the farthest vertex from an arbitrary start can easily fail to be a diameter endpoint — a cycle with a short spur attached is enough to break it. Applying double breadth-first search to a general graph gives a lower bound on the diameter, not the diameter, and this is a common source of quietly wrong code. Computing graph diameter exactly still requires all-pairs distances in general.",
    "The tree here starts its first sweep at A, which is deliberately not on any longest path, so the sweep has to do real work to reach G. The second sweep then ends in a tie: D and H are both five edges from G. That is not a defect. The diameter is a distance, and there can be many pairs realising it, so either endpoint gives a valid answer. One useful by-product falls out of the path itself — its midpoint is the centre of the tree, and the radius is the diameter halved and rounded up, which is why centring a tree is no harder than measuring it.",
  ],

  analysis: {
    time: "O(V) — two breadth-first sweeps over a tree, which has exactly V−1 edges",
    space: "O(V) for the distance map, queue and discovery edges",
    notes: [
      "Two sweeps replace the V sweeps of the naive all-pairs approach, dropping O(V²) to O(V). The saving rests entirely on the farthest vertex from any start being a diameter endpoint.",
      "That property is specific to trees and depends on paths being unique. On a general graph the same procedure yields only a lower bound, and using it as if it were exact is a frequent bug.",
      "The endpoints need not be unique, as the tie between D and H here shows. Only the distance is well defined, so implementations should not assume a single answer or compare endpoint identities across runs.",
      "The alternative is a single post-order traversal that, at each vertex, combines the two deepest downward paths through it and keeps the best total. It is one pass rather than two and extends naturally to weighted trees, but is less obvious to justify.",
      "For weighted trees with non-negative weights, replace breadth-first search with depth-first search accumulating weights, since breadth-first order no longer corresponds to distance order. With negative weights the double-sweep property breaks down entirely.",
      "The centre of the tree is the midpoint of any diameter path, and the radius is the diameter halved and rounded up. A tree has either one centre vertex, when the diameter is even, or two adjacent ones when it is odd.",
      "On a forest the procedure must be run per component, and the largest diameter across components is usually what is wanted; a single pair of sweeps started in one component says nothing about the others.",
    ],
  },

  code: {
    lang: "cpp",
    source: `// Tree diameter by two breadth-first sweeps, O(V).
// Correct for trees only. On a graph with cycles this returns a lower bound
// on the diameter, not the diameter.
#include <queue>
#include <utility>
#include <vector>

// Returns {farthest vertex, its distance} from src.
std::pair<int, int> farthest(const std::vector<std::vector<int>>& adj, int src) {
    std::vector<int> dist(adj.size(), -1);
    std::queue<int> q;
    dist[src] = 0;
    q.push(src);

    int best = src;
    while (!q.empty()) {
        int v = q.front();
        q.pop();
        if (dist[v] > dist[best]) best = v;

        for (int u : adj[v]) {
            if (dist[u] != -1) continue;
            dist[u] = dist[v] + 1;
            q.push(u);
        }
    }
    return {best, dist[best]};
}

int tree_diameter(const std::vector<std::vector<int>>& adj) {
    if (adj.empty()) return 0;

    // Any start will do: the farthest vertex from it is always an endpoint of
    // some longest path. That holds because tree paths are unique, and it is
    // exactly what fails once the graph has a cycle.
    int u = farthest(adj, 0).first;
    return farthest(adj, u).second;
}`,
  },
};
