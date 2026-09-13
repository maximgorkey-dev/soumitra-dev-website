/**
 * Greedy graph colouring.
 *
 * The graph is the 3-cube: outer square A B C D, inner square E F G H, joined
 * by spokes. It is bipartite, so two colours suffice, and drawn this way the
 * alternation is obvious by eye — which makes it all the more striking that
 * greedy spends four.
 *
 * The cube is the same graph as the crown graph on eight vertices, K(4,4) with
 * a perfect matching removed, which is the textbook worst case for greedy. The
 * cube drawing is used because it is planar and needs no crossings, where the
 * two-column bipartite drawing of the same graph needs 28.
 *
 * The adversarial vertex order walks the cube's four long diagonals: A G, then
 * C E, then F D, then H B. Opposite corners are never adjacent, so each pair
 * shares a colour and forces the next pair onto a new one. Node declaration
 * order is what drives this, since greedy walks graph.nodes.
 *
 * The components channel is an honest fit here for once: the component index
 * is literally the colour, so what is rendered is the answer itself.
 */

import { frame } from "../core/trace.js";

const GRAPH = {
  kind: "graph",
  nodes: [
    { id: "A", x: 0.08, y: 0.10 },
    { id: "G", x: 0.68, y: 0.66 },
    { id: "C", x: 0.92, y: 0.90 },
    { id: "E", x: 0.32, y: 0.34 },
    { id: "F", x: 0.68, y: 0.34 },
    { id: "D", x: 0.08, y: 0.90 },
    { id: "H", x: 0.32, y: 0.66 },
    { id: "B", x: 0.92, y: 0.10 },
  ],
  edges: [
    { u: "A", v: "B", w: 1 },
    { u: "B", v: "C", w: 1 },
    { u: "C", v: "D", w: 1 },
    { u: "D", v: "A", w: 1 },
    { u: "E", v: "F", w: 1 },
    { u: "F", v: "G", w: 1 },
    { u: "G", v: "H", w: 1 },
    { u: "H", v: "E", w: 1 },
    { u: "A", v: "E", w: 1 },
    { u: "B", v: "F", w: 1 },
    { u: "C", v: "G", w: 1 },
    { u: "D", v: "H", w: 1 },
  ],
};

function* run(graph) {
  const ids = graph.nodes.map((n) => n.id);
  const indices = graph.edges.map((_, i) => i);

  const incident = (id) =>
    indices.filter((i) => graph.edges[i].u === id || graph.edges[i].v === id);

  const other = (i, id) => (graph.edges[i].u === id ? graph.edges[i].v : graph.edges[i].u);

  const colour = new Map();
  const maxDegree = Math.max(...ids.map((id) => incident(id).length));

  const nodeMarks = (active) => {
    const out = {};
    for (const id of ids) {
      out[id] = id === active ? "frontier" : colour.has(id) ? "visited" : "idle";
    }
    return out;
  };

  const componentMarks = () => {
    const out = {};
    for (const id of ids) {
      if (colour.has(id)) out[id] = colour.get(id);
    }
    return out;
  };

  const edgeMarks = (active) => {
    const out = {};
    for (const i of indices) {
      const { u, v } = graph.edges[i];
      const live = active !== undefined && (u === active || v === active);
      if (live) out[i] = "candidate";
      else if (colour.has(u) && colour.has(v)) out[i] = "accepted";
    }
    return out;
  };

  const used = () => new Set([...colour.values()]).size;

  const metrics = () => [
    { label: "Coloured", value: `${colour.size} / ${ids.length}` },
    { label: "Colours used", value: String(used()) },
    { label: "Greedy bound", value: `${maxDegree + 1}` },
  ];

  const snapshot = (extra, active) =>
    frame({
      marks: { edges: edgeMarks(active), nodes: nodeMarks(active), components: componentMarks() },
      metrics: metrics(),
      ...extra,
    });

  yield snapshot({
    phase: "Initialise",
    note: "Colour every vertex so that no edge joins two of the same colour, using as few colours as possible.",
    detail: `Greedy takes the vertices in a fixed order and gives each the smallest colour none of its neighbours already has. Maximum degree here is ${maxDegree}, so it can never need more than ${maxDegree + 1}.`,
  });

  for (const id of ids) {
    const neighbours = incident(id).map((i) => other(i, id));
    const forbidden = new Set(
      neighbours.filter((n) => colour.has(n)).map((n) => colour.get(n)),
    );

    const shown = neighbours
      .map((n) => (colour.has(n) ? `${n}=${colour.get(n)}` : `${n}=?`))
      .join(" ");

    yield snapshot(
      {
        phase: "Inspect",
        note: forbidden.size === 0
          ? `None of ${id}'s neighbours are coloured yet, so nothing is ruled out.`
          : `${id}'s coloured neighbours rule out ${[...forbidden].sort((a, b) => a - b).join(", ")}.`,
        detail: `Neighbours: ${shown}. Only already-coloured neighbours constrain the choice, so an order that colours a vertex early leaves its neighbours to work around it.`,
      },
      id,
    );

    let pick = 0;
    while (forbidden.has(pick)) pick += 1;

    const before = used();
    colour.set(id, pick);
    const opened = used() > before;

    yield snapshot(
      {
        phase: "Assign",
        note: `Give ${id} colour ${pick}, the smallest one available to it.`,
        detail: opened
          ? `That opens a new colour, bringing the total to ${used()}. Greedy never looks ahead, so it reaches for a fresh colour the moment every lower one is blocked.`
          : `Still ${used()} colour${used() === 1 ? "" : "s"} in use. Greedy commits immediately and never revises an earlier choice.`,
      },
      id,
    );
  }

  const total = used();
  const summary = ids.map((id) => `${id}=${colour.get(id)}`).join(" ");

  yield snapshot({
    phase: "Done",
    note: `Greedy used ${total} colours on a graph that needs only 2.`,
    detail: `Final assignment: ${summary}. This is a cube, so its corners alternate: A, C, F, H take one colour and B, D, E, G the other. The order above walks the cube's four long diagonals instead, and because opposite corners are never adjacent each diagonal shares a colour and pushes the next onto a new one — driving greedy to exactly its maximum-degree-plus-one worst case.`,
  });
}

export const colouring = {
  id: "graph-colouring",
  section: "Algorithms",
  topic: "Colouring",
  title: "Greedy colouring",
  blurb: "Colour vertices one at a time, and watch the vertex order decide how badly it does",
  structure: GRAPH,
  run,

  explanation: [
    "A proper colouring assigns each vertex a colour so that no edge joins two vertices of the same colour, and the chromatic number χ(G) is the fewest colours that allow it. The applications are all conflict avoidance: register allocation in compilers, frequency assignment in radio networks, scheduling exams so that no student sits two at once. Deciding χ(G) is NP-hard and even approximating it well is hard, so practice relies on heuristics — and the greedy one is the first anybody reaches for.",
    "Greedy is as simple as it sounds. Fix an order on the vertices, walk it, and give each vertex the smallest colour that none of its already-coloured neighbours is using. It is always correct, in that it always produces a proper colouring, and it comes with an immediate bound: a vertex of degree d has at most d coloured neighbours, so some colour among the first d+1 must be free, and greedy therefore never exceeds Δ+1 colours where Δ is the maximum degree. Brooks' theorem sharpens the truth considerably — for connected graphs other than complete graphs and odd cycles, χ(G) is at most Δ — but a single greedy pass does not achieve that.",
    "The catch is that the output depends entirely on the order, and not mildly. This page runs greedy on the 3-cube, which is bipartite: its corners alternate, so two colours suffice and the drawing makes that plain. The order used here is adversarial. It walks the cube's four long diagonals, taking A and its opposite corner G, then C and E, then F and D, then H and B. Opposite corners of a cube are never adjacent, so each pair happily shares a colour — and each pair then blocks one more colour for everything that follows. A and G take 0, C and E are pushed to 1, F and D to 2, H and B to 3. Four colours, where two would do, hitting Δ+1 exactly.",
    "This is not a contrived one-off. The cube is the same graph as the crown graph on eight vertices, K(4,4) with a perfect matching deleted, and the construction generalises: on the 2n-vertex crown graph the paired order costs n colours against a chromatic number of 2, so the ratio is unbounded. Better orderings help in practice — largest-degree-first, as in the Welsh–Powell heuristic, or smallest-degree-last — but none is optimal in general, because a perfect ordering would solve the NP-hard problem. Some graph classes do have one: chordal graphs admit a perfect elimination ordering, found by maximum cardinality search, on which greedy always achieves χ exactly. That is the lesson worth carrying away, that greedy is only ever as good as the order it is handed.",
  ],

  analysis: {
    time: "O(V + E) — each vertex inspects its own neighbours once",
    space: "O(V) for the colour assignment, plus O(Δ) for the forbidden set at each step",
    notes: [
      "Greedy never exceeds Δ+1 colours, since a vertex of degree d sees at most d distinct neighbour colours and one of the first d+1 must be free. The cube shows the bound is tight, using 4 against Δ = 3.",
      "The result depends entirely on the vertex order and the gap can be unbounded. On the 2n-vertex crown graph, of which this cube is the n = 4 case, the adversarial order costs n colours against a chromatic number of 2.",
      "An optimal order always exists — take the vertices grouped by colour class of some optimal colouring — but finding it is as hard as colouring itself, so no ordering heuristic can be optimal in general.",
      "Brooks' theorem gives χ ≤ Δ for connected graphs that are neither complete graphs nor odd cycles, strictly better than greedy's Δ+1 guarantee. Reaching it needs more than one greedy pass.",
      "Chordal graphs have a perfect elimination ordering, obtainable by maximum cardinality search or lexicographic breadth-first search, on which greedy is exactly optimal. Interval graphs are the familiar special case, which is why interval scheduling comes out easy.",
      "Welsh–Powell orders by descending degree, which cannot help on a regular graph like this one where every degree is 3, but does reduce colour counts on irregular graphs. Smallest-degree-last, the degeneracy ordering, gives the tighter bound of degeneracy plus one.",
      "For bipartite graphs specifically, never use greedy: a breadth-first 2-colouring is exact and linear, which is what the bipartite check page does. Greedy is for when χ is genuinely unknown.",
    ],
  },

  code: {
    lang: "cpp",
    source: `// Greedy vertex colouring in the given vertex order, O(V + E).
// Never uses more than max_degree + 1 colours, but the order decides how
// close to that bound it lands.
#include <vector>

std::vector<int> greedy_colour(const std::vector<std::vector<int>>& adj,
                               const std::vector<int>& order) {
    std::vector<int> colour(adj.size(), -1);

    // Reused across iterations to avoid an O(V) clear at every step. Stamped
    // with the current vertex rather than reset, so each lookup stays
    // proportional to that vertex's degree.
    std::vector<int> blocked_by(adj.size() + 1, -1);

    for (int v : order) {
        for (int u : adj[v]) {
            if (colour[u] != -1) blocked_by[colour[u]] = v;
        }

        int pick = 0;
        while (blocked_by[pick] == v) ++pick;
        colour[v] = pick;
    }

    return colour;
}`,
  },
};
