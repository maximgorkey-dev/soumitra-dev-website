/**
 * Eulerian circuit, by Hierholzer's algorithm.
 *
 * The stack formulation rather than the textbook "walk, then splice sub-tours"
 * one: they produce the same answer, but the stack version needs no list
 * surgery and is what anyone would actually implement. The circuit comes out
 * of the pop order, reversed.
 *
 * Degrees here are 4,4,2,4,2,2 — all even, and the graph is connected, so a
 * circuit is guaranteed to exist before we start looking.
 *
 * Vertex highlighting uses the components channel because the renderer has no
 * node-state styling: 2 for the walker's current position, 1 for the rest of
 * the stack, 0 for vertices already committed to the circuit.
 */

import { frame } from "../core/trace.js";

const GRAPH = {
  kind: "graph",
  nodes: [
    { id: "A", x: 0.46, y: 0.50 },
    { id: "B", x: 0.72, y: 0.20 },
    { id: "C", x: 0.20, y: 0.14 },
    { id: "D", x: 0.72, y: 0.80 },
    { id: "E", x: 0.14, y: 0.72 },
    { id: "F", x: 0.94, y: 0.50 },
  ],
  edges: [
    { u: "A", v: "B", w: 1 },
    { u: "A", v: "C", w: 1 },
    { u: "A", v: "D", w: 1 },
    { u: "A", v: "E", w: 1 },
    { u: "B", v: "C", w: 1 },
    { u: "B", v: "D", w: 1 },
    { u: "B", v: "F", w: 1 },
    { u: "D", v: "E", w: 1 },
    { u: "D", v: "F", w: 1 },
  ],
};

function* run(graph) {
  const ids = graph.nodes.map((n) => n.id);
  const indices = graph.edges.map((_, i) => i);

  const incident = (id) =>
    indices.filter((i) => graph.edges[i].u === id || graph.edges[i].v === id);

  const other = (i, id) => (graph.edges[i].u === id ? graph.edges[i].v : graph.edges[i].u);

  const degree = new Map(ids.map((id) => [id, incident(id).length]));
  const used = new Set();
  const stack = [ids[0]];
  const circuit = [];
  const touched = new Set([ids[0]]);

  const nodeMarks = (done) => {
    const out = {};
    for (const id of ids) {
      if (done) out[id] = "visited";
      else if (stack.includes(id)) out[id] = "frontier";
      else out[id] = touched.has(id) ? "visited" : "idle";
    }
    return out;
  };

  const componentMarks = (done) => {
    const out = {};
    if (done) {
      for (const id of ids) out[id] = id === ids[0] ? 2 : 1;
      return out;
    }
    const top = stack[stack.length - 1];
    for (const id of ids) {
      // A vertex can sit on the stack more than once, so being in the circuit
      // must not override still being on the stack.
      if (id === top) out[id] = 2;
      else if (stack.includes(id)) out[id] = 1;
      else if (touched.has(id)) out[id] = 0;
    }
    return out;
  };

  const edgeMarks = (examining) => {
    const out = {};
    for (const i of indices) {
      if (used.has(i)) out[i] = "accepted";
    }
    if (examining !== undefined) out[examining] = "candidate";
    return out;
  };

  const metrics = () => [
    { label: "Edges used", value: `${used.size} / ${graph.edges.length}` },
    { label: "Stack depth", value: String(stack.length) },
    { label: "Circuit length", value: String(circuit.length) },
  ];

  const snapshot = (extra, examining, done) =>
    frame({
      marks: {
        edges: edgeMarks(examining),
        nodes: nodeMarks(done),
        components: componentMarks(done),
      },
      metrics: metrics(),
      ...extra,
    });

  yield snapshot({
    phase: "Initialise",
    note: "An Eulerian circuit uses every edge exactly once and returns to its start.",
    detail: "Hierholzer walks along unused edges until stuck, then unwinds; the vertices come off the stack in reverse circuit order.",
  });

  const degreeList = ids.map((id) => `${id}:${degree.get(id)}`).join(" ");

  yield snapshot({
    phase: "Check",
    note: "Every degree is even and the graph is connected, so a circuit must exist. Nothing below can fail.",
    detail: `Degrees are ${degreeList}. Euler's condition is not a heuristic but an exact characterisation, so this check is a proof, not a guess.`,
  });

  while (stack.length > 0) {
    const v = stack[stack.length - 1];
    const next = incident(v).find((i) => !used.has(i));

    if (next !== undefined) {
      const nb = other(next, v);
      used.add(next);
      stack.push(nb);
      touched.add(nb);

      yield snapshot(
        {
          phase: "Advance",
          note: `Take the unused edge ${v}–${nb} and move to ${nb}.`,
          detail: `Edge ${used.size} of ${graph.edges.length}. Which unused edge we pick never matters — an even-degree graph cannot be walked into a dead end except back at the start.`,
        },
        next,
      );
      continue;
    }

    stack.pop();
    circuit.push(v);
    const remaining = stack.length > 0 ? stack[stack.length - 1] : null;

    yield snapshot({
      phase: "Retreat",
      note: `${v} has no unused edges left, so it joins the circuit and we step back${remaining ? ` to ${remaining}` : ""}.`,
      detail: `Circuit so far, in pop order: ${circuit.join(" ")}. Reversing this at the end is what turns the unwinding into a single closed walk.`,
    });
  }

  const tour = [...circuit].reverse();

  yield snapshot(
    {
      phase: "Done",
      note: `One closed circuit through all ${graph.edges.length} edges: ${tour.join(" → ")}.`,
      detail: `It leaves and returns to ${ids[0]}, and visits D three times and A three times — an Eulerian circuit repeats vertices freely, and only edges are rationed.`,
    },
    undefined,
    true,
  );
}

export const euler = {
  id: "euler-circuit",
  section: "Algorithms",
  topic: "Euler tours",
  title: "Eulerian circuit",
  blurb: "Walk every edge exactly once and return to the start, in linear time",
  structure: GRAPH,
  run,

  explanation: [
    "This is the problem graph theory started with. In 1736 Euler asked whether the seven bridges of Königsberg could all be crossed exactly once in a single walk, and proved they could not — not by trying every route, but by noticing that each time you pass through a landmass you use up two of its bridges, one in and one out. So every intermediate vertex must have even degree. That argument gives a complete characterisation: a connected graph has a closed walk using every edge exactly once precisely when every vertex has even degree, and it has an open one precisely when exactly two vertices have odd degree, in which case the walk must start at one and finish at the other.",
    "What makes this remarkable is that the condition is checkable in linear time by just counting degrees. Contrast it with the Hamiltonian circuit, which asks for a closed walk visiting every vertex exactly once. The two questions look like mirror images — edges versus vertices — but Hamiltonicity is NP-complete, with no known efficient test and no simple characterisation. There is no deeper reason for the asymmetry visible from the problem statements; it is one of the sharpest reminders that small changes in what you ask for can move a problem across the tractability boundary.",
    "Hierholzer's algorithm turns the existence proof into a construction. The version shown keeps a stack of vertices. At each step it looks at the vertex on top: if an unused edge remains there, it marks that edge used and pushes the far endpoint; otherwise it pops the vertex and appends it to an output list. Reversing the output at the end gives the circuit. The subtle part is why the arbitrary edge choice never causes trouble. Walking from an even-degree graph can only get stuck at the vertex you started from, because entering any other vertex leaves it with odd unused degree and therefore at least one way out. When the walk does close, the popping phase reinserts any side loops at exactly the point they branch off, which is what the reversal accomplishes.",
    "The naive alternative, Fleury's algorithm, avoids getting stuck by checking before each step that the edge it is about to take is not a bridge of the remaining graph. That works, but each check costs a traversal, giving O(E²) or worse. Hierholzer needs no such lookahead: it lets itself get stuck and repairs the result afterwards, which is why it runs in O(V + E). The graph here has degrees 4, 4, 2, 4, 2, 2, so the circuit is guaranteed before the walk begins, and it ends up passing through both A and D three times each.",
  ],

  analysis: {
    time: "O(V + E) — each edge is used once, and each vertex is popped once per visit",
    space: "O(V + E) for the stack and the output circuit",
    notes: [
      "Euler's condition is exact rather than approximate: connected with all degrees even is equivalent to having a closed tour, and exactly two odd degrees is equivalent to having an open one. Both are testable in O(V + E) by counting.",
      "The contrast with Hamiltonian circuits is the point worth carrying away. Covering every edge is linear; covering every vertex is NP-complete, despite the near-identical problem statements.",
      "The arbitrary edge choice is safe because an even-degree graph can only trap a walk at its starting vertex. That is what lets Hierholzer skip Fleury's bridge test and drop from O(E²) to O(V + E).",
      "Efficiency depends on never rescanning used edges. Keeping a per-vertex iterator into the adjacency list, advanced and never reset, is what keeps the total edge work linear; restarting the scan each visit makes it quadratic.",
      "Isolated vertices must be excluded from the connectivity requirement, since a vertex with no edges cannot be part of any tour but does not prevent one existing.",
      "The directed version needs in-degree equal to out-degree at every vertex plus connectivity of the underlying graph, and underpins de Bruijn sequence construction and genome assembly, where reads become edges and the assembly is an Eulerian path.",
      "When odd-degree vertices exist and you must still cover every edge, the cheapest repeated-edge solution is the route inspection problem, solved by minimum-weight perfect matching on the odd vertices and then taking an Eulerian tour of the augmented graph.",
    ],
  },

  code: {
    lang: "cpp",
    source: `// Eulerian circuit by Hierholzer's algorithm, O(V + E).
// Assumes the graph is connected and every degree is even.
#include <vector>

struct Arc { int to, id; };

std::vector<int> euler_circuit(const std::vector<std::vector<Arc>>& adj,
                               int edge_count, int start) {
    std::vector<char> used(edge_count, 0);

    // One cursor per vertex, advanced and never reset. Rescanning adjacency
    // lists from the front on every visit is what makes naive versions
    // quadratic; this keeps the total edge work linear.
    std::vector<std::size_t> cursor(adj.size(), 0);

    std::vector<int> stack{start}, circuit;

    while (!stack.empty()) {
        int v = stack.back();

        while (cursor[v] < adj[v].size() && used[adj[v][cursor[v]].id]) {
            ++cursor[v];
        }

        if (cursor[v] == adj[v].size()) {
            // Stuck here, so v is committed. Any side loop branching off v was
            // already walked, and will land before v once we reverse.
            circuit.push_back(v);
            stack.pop_back();
        } else {
            const Arc& a = adj[v][cursor[v]];
            used[a.id] = 1;
            stack.push_back(a.to);
        }
    }

    // Pop order is the circuit backwards.
    return {circuit.rbegin(), circuit.rend()};
}`,
  },
};
