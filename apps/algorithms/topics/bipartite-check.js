/**
 * Bipartite check by two-colouring.
 *
 * This graph is deliberately *not* bipartite. Returning "no" is the more
 * instructive outcome, because the algorithm does not merely fail — it hands
 * back an odd cycle as proof, and that certificate is the whole reason the
 * two-colouring argument works.
 *
 * The components channel carries the colouring directly, which is the one case
 * where it means exactly what the renderer's palette suggests: component 0 and
 * component 1 are the two sides. Uncoloured vertices are left unmapped so they
 * stay neutral.
 */

import { frame } from "../core/trace.js";

const GRAPH = {
  kind: "graph",
  nodes: [
    { id: "A", x: 0.06, y: 0.50 },
    { id: "B", x: 0.28, y: 0.20 },
    { id: "C", x: 0.28, y: 0.80 },
    { id: "D", x: 0.50, y: 0.50 },
    { id: "E", x: 0.50, y: 0.06 },
    { id: "F", x: 0.72, y: 0.30 },
    { id: "G", x: 0.50, y: 0.94 },
    { id: "H", x: 0.90, y: 0.66 },
  ],
  edges: [
    { u: "A", v: "B", w: 1 },
    { u: "A", v: "C", w: 1 },
    { u: "B", v: "D", w: 1 },
    { u: "C", v: "D", w: 1 },
    { u: "B", v: "E", w: 1 },
    { u: "D", v: "F", w: 1 },
    { u: "E", v: "F", w: 1 },
    { u: "C", v: "G", w: 1 },
    { u: "F", v: "H", w: 1 },
    { u: "G", v: "H", w: 1 },
  ],
};

function* run(graph) {
  const ids = graph.nodes.map((n) => n.id);
  const indices = graph.edges.map((_, i) => i);

  const incident = (id) =>
    indices.filter((i) => graph.edges[i].u === id || graph.edges[i].v === id);

  const other = (i, id) => (graph.edges[i].u === id ? graph.edges[i].v : graph.edges[i].u);

  const colour = new Map();
  const parentEdge = new Map();
  const depth = new Map();
  const satisfied = new Set();
  let conflict = null;          // { edge, u, v, cycle }
  const checked = new Set();   // edge indices, so each edge counts once

  const nodeMarks = () => {
    const out = {};
    for (const id of ids) out[id] = colour.has(id) ? "visited" : "idle";
    return out;
  };

  const componentMarks = () => {
    const out = {};
    for (const id of ids) if (colour.has(id)) out[id] = colour.get(id);
    return out;
  };

  const edgeMarks = (examining) => {
    const out = {};
    for (const i of satisfied) out[i] = "accepted";
    if (conflict !== null) out[conflict.edge] = "rejected";
    if (examining !== undefined && examining !== conflict?.edge) out[examining] = "candidate";
    return out;
  };

  const metrics = () => [
    { label: "Coloured", value: `${colour.size} / ${ids.length}` },
    { label: "Edges checked", value: `${checked.size} / ${graph.edges.length}` },
    { label: "Conflicts", value: conflict === null ? "0" : "1" },
  ];

  const snapshot = (extra, examining) =>
    frame({
      marks: { edges: edgeMarks(examining), nodes: nodeMarks(), components: componentMarks() },
      metrics: metrics(),
      ...extra,
    });

  const sideName = (c) => (c === 0 ? "side 0" : "side 1");

  // Vertices from `id` up to the root of the search tree.
  const ancestry = (id) => {
    const out = [];
    let cur = id;
    while (cur !== undefined) {
      out.push(cur);
      const pe = parentEdge.get(cur);
      cur = pe === undefined ? undefined : other(pe, cur);
    }
    return out;
  };

  /** The odd cycle a conflicting edge closes: up from both ends to their meeting point. */
  const oddCycle = (u, v) => {
    const au = ancestry(u);
    const av = ancestry(v);
    const inAv = new Set(av);
    const meet = au.find((x) => inAv.has(x));
    const upU = au.slice(0, au.indexOf(meet) + 1);
    const upV = av.slice(0, av.indexOf(meet));
    return [...upU, ...upV.reverse()];
  };

  const source = ids[0];
  colour.set(source, 0);
  depth.set(source, 0);
  let queue = [source];

  yield snapshot({
    phase: "Initialise",
    note: `Put ${source} on ${sideName(0)}. Every neighbour must then land on the other side.`,
    detail: "A graph is bipartite exactly when this forced alternation never contradicts itself.",
  });

  while (queue.length > 0 && conflict === null) {
    const id = queue.shift();

    yield snapshot({
      phase: "Expand",
      note: `Expand ${id}, on ${sideName(colour.get(id))}. Each of its edges forces something.`,
      detail: queue.length > 0 ? `Queue: [${queue.join(" ")}]` : "Nothing else is waiting.",
    });

    for (const i of incident(id)) {
      const nb = other(i, id);
      const want = 1 - colour.get(id);

      if (!colour.has(nb)) {
        colour.set(nb, want);
        depth.set(nb, depth.get(id) + 1);
        parentEdge.set(nb, i);
        satisfied.add(i);
        checked.add(i);
        queue.push(nb);

        yield snapshot(
          {
            phase: "Colour",
            note: `${nb} is uncoloured, so ${id}–${nb} forces it onto ${sideName(want)}.`,
            detail: `Depth ${depth.get(nb)} from ${source}; the side is just that depth's parity.`,
          },
          i,
        );
        continue;
      }

      checked.add(i);

      if (colour.get(nb) !== colour.get(id)) {
        satisfied.add(i);
        yield snapshot(
          {
            phase: "Check",
            note: `${id}–${nb} already spans both sides, so it is satisfied.`,
            detail: `${id} is on ${sideName(colour.get(id))} and ${nb} on ${sideName(colour.get(nb))}.`,
          },
          i,
        );
        continue;
      }

      const cycle = oddCycle(id, nb);
      conflict = { edge: i, u: id, v: nb, cycle };

      yield snapshot(
        {
          phase: "Check",
          note: `${id}–${nb} joins two vertices already on ${sideName(colour.get(id))}. The graph is not bipartite.`,
          detail: `Both sit at depth ${depth.get(id)}, so the routes back to ${source} have equal length and this edge closes a cycle of odd length ${cycle.length}: ${cycle.join("–")}–${id}.`,
        },
        i,
      );
      break;
    }
  }

  if (conflict === null) {
    const side0 = ids.filter((id) => colour.get(id) === 0);
    const side1 = ids.filter((id) => colour.get(id) === 1);
    yield snapshot({
      phase: "Done",
      note: `Every edge spans the two sides: the graph is bipartite.`,
      detail: `{${side0.join(" ")}} on one side, {${side1.join(" ")}} on the other.`,
    });
  } else {
    yield snapshot({
      phase: "Done",
      note: `Not bipartite, and here is the proof: the odd cycle ${conflict.cycle.join("–")}–${conflict.u}.`,
      detail: `${conflict.cycle.length} edges. Two-colouring any odd cycle is impossible, so no amount of backtracking would have helped — the answer does not depend on the choices made along the way.`,
    });
  }
}

export const bipartite = {
  id: "bipartite-check",
  section: "Algorithms",
  topic: "Graph properties",
  title: "Bipartite check",
  blurb: "Two-colour the graph by alternating layers, and report the odd cycle if that ever contradicts itself",
  structure: GRAPH,
  run,

  explanation: [
    "A graph is bipartite if its vertices can be split into two groups such that every edge has one end in each — equivalently, if it can be properly coloured with two colours. Testing this needs no search over colourings at all. Pick any vertex, put it on side 0, and then every choice is forced: its neighbours must be on side 1, theirs back on side 0, and so on. One breadth-first sweep assigns every vertex the parity of its depth. The only question is whether any edge ends up with both ends on the same side.",
    "That works because of a clean equivalence: a graph is bipartite if and only if it contains no cycle of odd length. One direction is easy — walking round a cycle alternates sides at every step, so returning to the start requires an even number of steps. The other direction is what the algorithm proves constructively. If the parity colouring survives every edge, it is by construction a valid two-colouring. If some edge joins two vertices of equal depth, then the two tree routes from those vertices back to their common ancestor have the same length, and together with that edge they form a cycle of odd length. So a failure is never ambiguous, and never an artefact of a bad guess.",
    "The implementation point that matters is that checking the tree edges is not enough. Colouring a vertex when you first reach it can never conflict, since it is uncoloured; every conflict lives on a non-tree edge, so the algorithm has to examine every edge, including the ones that reach an already-coloured vertex. On this graph nine edges are satisfied and the tenth, F–H, is not: both F and H sit at depth 3, both got side 1, and the odd cycle they close runs F–D–B–A–C–G–H, seven edges long. The animation marks satisfied edges green and that single failing edge dashed red.",
    "The reason this is worth its own page rather than being a footnote to breadth-first search is the cliff just past it. Deciding two-colourability is linear time; deciding three-colourability is NP-complete. There is no gentle degradation between them. Bipartiteness also unlocks a great deal of structure: maximum matching becomes tractable via Hopcroft–Karp in O(E√V), König's theorem ties maximum matching to minimum vertex cover, and both fail immediately on graphs with odd cycles.",
  ],

  analysis: {
    time: "O(V + E) — one traversal, with every edge examined",
    space: "O(V) for the colouring, the queue and the parent links",
    notes: [
      "It is a single breadth-first or depth-first sweep, so O(V + E). No backtracking is ever needed, because the first vertex's colour is free and everything after it is forced; the two possible colourings of a connected component are mirror images.",
      "A disconnected graph needs the sweep restarted from every uncoloured vertex, and each component is independent. A graph is bipartite exactly when all of its components are, so one odd cycle anywhere settles it.",
      "The odd cycle is a certificate, which makes the algorithm self-verifying: a caller can check the answer in O(V) without trusting the implementation. That is a rarer property than it sounds and is why this is the standard example of a good negative witness.",
      "The cycle found is the shortest odd cycle through that particular edge, but not necessarily the graph's shortest odd cycle. Finding the odd girth is a genuinely harder problem needing a sweep from every vertex.",
      "Depth-first search works just as well and is often preferred for the recursive one-liner, but breadth-first gives the depth parity directly and makes the certificate easier to extract, since both ends of a conflicting edge are at equal depth.",
      "Two colours are easy and three are NP-complete, with nothing in between. The reason is exactly the forcing used here: with two colours one choice determines all the rest, and with three it does not, so the search space stops collapsing.",
    ],
  },

  code: {
    lang: "cpp",
    source: `// Bipartite check by two-colouring, O(V + E).
#include <queue>
#include <vector>

// Returns true if the graph is bipartite, filling "side" with 0/1 per vertex.
// On failure "side" holds the partial colouring and the conflicting edge is
// (conflict_u, conflict_v) — the pair that closes an odd cycle.
bool is_bipartite(const std::vector<std::vector<int>>& adj,
                  std::vector<int>& side,
                  int& conflict_u, int& conflict_v) {
    const int n = static_cast<int>(adj.size());
    side.assign(n, -1);
    conflict_u = conflict_v = -1;

    // A disconnected graph is bipartite only if every component is, so each
    // uncoloured vertex gets to start its own sweep.
    for (int start = 0; start < n; ++start) {
        if (side[start] != -1) continue;

        side[start] = 0;                    // free choice; the rest is forced
        std::queue<int> q;
        q.push(start);

        while (!q.empty()) {
            const int v = q.front();
            q.pop();

            for (const int to : adj[v]) {
                if (side[to] == -1) {
                    side[to] = 1 - side[v];
                    q.push(to);
                } else if (side[to] == side[v]) {
                    // Both ends at the same depth parity. Walking up the two
                    // tree routes to their common ancestor and back along this
                    // edge gives an odd cycle, which is why no colouring exists.
                    conflict_u = v;
                    conflict_v = to;
                    return false;
                }
            }
        }
    }
    return true;
}`,
  },
};
