/**
 * Maximum bipartite matching, by Kuhn's augmenting-path algorithm.
 *
 * The graph is chosen so both interesting things happen. B's search has to
 * displace A onto a different partner rather than just taking a free vertex,
 * which is the whole mechanic of an augmenting path. C's search then fails
 * outright, and the reason is a Hall violator: A, B and C between them touch
 * only E and F, so one of the three must go unmatched. Maximum matching is 3,
 * not 4, and the algorithm proves it rather than giving up.
 *
 * Vertex highlighting uses the components channel, as the renderer has no
 * node-state styling.
 */

import { frame } from "../core/trace.js";

const LEFT = ["A", "B", "C", "D"];

const GRAPH = {
  kind: "graph",
  nodes: [
    { id: "A", x: 0.16, y: 0.12 },
    { id: "B", x: 0.16, y: 0.38 },
    { id: "C", x: 0.16, y: 0.64 },
    { id: "D", x: 0.16, y: 0.90 },
    { id: "E", x: 0.84, y: 0.12 },
    { id: "F", x: 0.84, y: 0.38 },
    { id: "G", x: 0.84, y: 0.64 },
    { id: "H", x: 0.84, y: 0.90 },
  ],
  edges: [
    { u: "A", v: "E", w: 1 },
    { u: "A", v: "F", w: 1 },
    { u: "B", v: "E", w: 1 },
    { u: "B", v: "F", w: 1 },
    { u: "C", v: "E", w: 1 },
    { u: "C", v: "F", w: 1 },
    { u: "D", v: "G", w: 1 },
    { u: "D", v: "H", w: 1 },
    { u: "D", v: "E", w: 1 },
  ],
};

function* run(graph) {
  const ids = graph.nodes.map((n) => n.id);
  const indices = graph.edges.map((_, i) => i);

  // Every edge is declared left-to-right, so u is always the left endpoint.
  const edgesOf = (id) => indices.filter((i) => graph.edges[i].u === id);

  const partner = new Map();   // right vertex -> left vertex it is matched to
  const matchedEdge = new Map(); // left vertex -> edge index
  let visited = new Set();     // right vertices tried in the current search
  const chain = [];            // left vertices on the current recursion chain
  let root = null;
  let tried = new Set();       // edges rejected during the current search

  const nodeMarks = () => {
    const out = {};
    for (const id of ids) {
      if (chain.includes(id)) out[id] = "frontier";
      else if (matchedEdge.has(id) || partner.has(id)) out[id] = "visited";
      else out[id] = "idle";
    }
    return out;
  };

  const componentMarks = () => {
    const out = {};
    for (const id of ids) {
      if (id === root) out[id] = 2;
      else if (chain.includes(id) || visited.has(id)) out[id] = 1;
      else if (matchedEdge.has(id) || partner.has(id)) out[id] = 0;
    }
    return out;
  };

  const edgeMarks = (examining) => {
    const out = {};
    for (const i of indices) {
      if (matchedEdge.get(graph.edges[i].u) === i) out[i] = "accepted";
      else if (tried.has(i)) out[i] = "rejected";
    }
    if (examining !== undefined) out[examining] = "candidate";
    return out;
  };

  const metrics = () => [
    { label: "Matched", value: `${partner.size} / ${LEFT.length}` },
    { label: "Chain depth", value: String(chain.length) },
    { label: "Right used", value: `${partner.size} / ${ids.length - LEFT.length}` },
  ];

  const snapshot = (extra, examining) =>
    frame({
      marks: { edges: edgeMarks(examining), nodes: nodeMarks(), components: componentMarks() },
      metrics: metrics(),
      ...extra,
    });

  // Returns true if an augmenting path was found starting at `left`, in which
  // case the matching along it has already been flipped.
  function* augment(left) {
    chain.push(left);

    for (const i of edgesOf(left)) {
      const right = graph.edges[i].v;

      if (visited.has(right)) {
        tried.add(i);
        yield snapshot(
          {
            phase: "Skip",
            note: `${right} was already tried earlier in this search, so ${left} gains nothing by asking again.`,
            detail: "Marking each right vertex once per search is what keeps a single augmenting search O(V + E) instead of exponential.",
          },
          i,
        );
        continue;
      }

      visited.add(right);

      if (!partner.has(right)) {
        partner.set(right, left);
        matchedEdge.set(left, i);
        yield snapshot(
          {
            phase: "Augment",
            note: `${right} is free, so ${left}–${right} joins the matching and the path is complete.`,
            detail: `The augmenting path ends here. Every displaced vertex further back up the chain has already been rehoused, so the matching grows by exactly one.`,
          },
          i,
        );
        chain.pop();
        return true;
      }

      const holder = partner.get(right);

      yield snapshot(
        {
          phase: "Displace",
          note: `${right} is taken by ${holder}. Ask ${holder} whether it can move elsewhere.`,
          detail: `This is the step that makes the algorithm work: rather than refusing ${left}, we test whether ${holder} has an alternative. If it does, both end up matched.`,
        },
        i,
      );

      const moved = yield* augment(holder);

      if (moved) {
        partner.set(right, left);
        matchedEdge.set(left, i);
        yield snapshot(
          {
            phase: "Augment",
            note: `${holder} found somewhere else to go, so ${right} is now free for ${left}.`,
            detail: `Matched edges and unmatched edges swapped roles all along the path. The total matched count rises by one, never more.`,
          },
          i,
        );
        chain.pop();
        return true;
      }

      tried.add(i);
      yield snapshot(
        {
          phase: "Blocked",
          note: `${holder} has nowhere else to go, so ${right} stays with ${holder}.`,
          detail: `Nothing was changed. A failed search leaves the matching untouched, which is why trying the left vertices in any order still ends at a maximum matching.`,
        },
        i,
      );
    }

    chain.pop();
    return false;
  }

  yield snapshot({
    phase: "Initialise",
    note: "A matching pairs up vertices so no vertex is used twice. We want the largest one.",
    detail: "Kuhn's method adds one left vertex at a time, and when it finds a partner already taken, it asks the current holder to move rather than backing off.",
  });

  for (const left of LEFT) {
    root = left;
    visited = new Set();
    tried = new Set();

    yield snapshot({
      phase: "Search",
      note: `Look for an augmenting path from ${left}, the next unmatched left vertex.`,
      detail: `Its options are ${edgesOf(left).map((i) => graph.edges[i].v).join(", ")}. Each right vertex may be examined at most once during this search.`,
    });

    const ok = yield* augment(left);

    yield snapshot({
      phase: ok ? "Augment" : "Blocked",
      note: ok
        ? `The search from ${left} succeeded, so the matching is now size ${partner.size}.`
        : `No augmenting path exists from ${left}, so it stays unmatched — permanently.`,
      detail: ok
        ? "Each successful search adds exactly one edge, so at most V searches are ever needed."
        : `Berge's theorem says a matching is maximum exactly when no augmenting path exists, so failing here is a proof about ${left}, not a missed opportunity to revisit later.`,
    });
  }

  root = null;
  visited = new Set();
  tried = new Set();

  const pairs = LEFT.filter((l) => matchedEdge.has(l)).map(
    (l) => `${l}–${graph.edges[matchedEdge.get(l)].v}`,
  );
  const unmatched = LEFT.filter((l) => !matchedEdge.has(l));

  yield frame({
    phase: "Done",
    note: `Maximum matching has ${pairs.length} edges: ${pairs.join(", ")}. ${unmatched.join(", ")} cannot be matched.`,
    detail: `The obstruction is visible: A, B and C between them touch only E and F. Three vertices competing for two partners means one must lose, whatever order we try. Hall's condition fails on exactly this set, and the deficiency of 1 is why the answer is 3 rather than 4.`,
    marks: {
      edges: Object.fromEntries(
        indices.map((i) => [i, matchedEdge.get(graph.edges[i].u) === i ? "accepted" : "rejected"]),
      ),
      nodes: Object.fromEntries(
        ids.map((id) => [id, matchedEdge.has(id) || partner.has(id) ? "visited" : "idle"]),
      ),
      // Highlight the Hall violator and its neighbourhood, which is the reason
      // the answer stops at 3.
      components: { A: 2, B: 2, C: 2, E: 1, F: 1, D: 0, G: 0, H: 0 },
    },
    metrics: [
      { label: "Matched", value: `${partner.size} / ${LEFT.length}` },
      { label: "Chain depth", value: "0" },
      { label: "Right used", value: `${partner.size} / ${ids.length - LEFT.length}` },
    ],
  });
}

export const matching = {
  id: "bipartite-matching",
  section: "Algorithms",
  topic: "Matching",
  title: "Bipartite matching",
  blurb: "Pair up the two sides as far as possible, by repeatedly finding augmenting paths",
  structure: GRAPH,
  run,

  explanation: [
    "A matching is a set of edges with no shared endpoints — a pairing where nobody is used twice. Finding the largest matching in a bipartite graph is the abstract form of assigning workers to jobs, students to projects, or slots to requests, and it is one of the few genuinely combinatorial optimisation problems that admits a short, exact, polynomial algorithm.",
    "The naive greedy approach fails, and understanding why is the point. Take edges in any order, keeping each one that does not conflict with those already chosen, and you can easily strand a vertex whose only remaining option was taken by someone with alternatives. What rescues the situation is the augmenting path: a path that starts at an unmatched left vertex, alternates unmatched and matched edges, and ends at an unmatched right vertex. Swapping the roles of the edges along such a path leaves every previously matched vertex still matched while adding one new pair, so the matching grows by exactly one. Berge's theorem makes this the complete answer — a matching is maximum if and only if no augmenting path exists — which is what lets the algorithm stop with a proof rather than a guess.",
    "Kuhn's implementation searches for these paths with a depth-first traversal that reads recursively. To match left vertex u, try each of its neighbours in turn. If a neighbour is unmatched, take it. If it is already held by some other left vertex x, ask x to relocate; if x succeeds, the vertex is freed and u takes it. That recursive request is the augmenting path being built backwards. The one essential detail is the visited set over right vertices, reset before each new search but shared across the whole recursion within it: without it the same vertex is asked repeatedly and the search can blow up exponentially, and with it each search costs O(V + E).",
    "Both behaviours are on display here. B's search cannot simply take E, which A already holds, so it displaces A onto F — the matching does not merely grow, it rearranges. C's search then fails completely, and the failure is informative rather than accidental. A, B and C between them have only E and F as neighbours, so three vertices are competing for two partners. Hall's marriage theorem says a perfect matching on the left exists exactly when every subset S of the left has at least |S| neighbours, and this set violates it with a deficiency of one. The maximum matching is therefore 3, and no ordering of the vertices could have done better.",
  ],

  analysis: {
    time: "O(V·E) — at most V augmenting searches, each O(V + E)",
    space: "O(V) for the partner map and the visited set, plus recursion depth",
    notes: [
      "The visited set over right vertices is not an optimisation but a correctness-critical bound. It must be reset for each new search and shared throughout that search's recursion; omitting it allows the same vertex to be asked repeatedly and the search to become exponential.",
      "Berge's theorem is what makes a failed search final. Since a matching is maximum exactly when no augmenting path exists, a left vertex that fails can never be revisited profitably, so the outer loop needs only one pass.",
      "Hall's marriage theorem characterises when the left side can be matched completely: every subset S must have at least |S| neighbours. The set {A, B, C} here has neighbourhood {E, F}, so the deficiency is 1 and the maximum matching is one short of perfect.",
      "König's theorem gives the dual: in a bipartite graph the maximum matching equals the minimum vertex cover. {E, F} together with one of D's neighbours covers every edge here with 3 vertices, matching the matching size exactly.",
      "Hopcroft–Karp improves the bound to O(E·√V) by finding a maximal set of shortest augmenting paths per phase rather than one path at a time, and only O(√V) phases are needed. It is the standard choice for large instances.",
      "Bipartite matching is a special case of maximum flow with unit capacities, and running Dinic's algorithm on that network reproduces the Hopcroft–Karp bound. The direct formulation is preferred mainly because it avoids building the flow network.",
      "General non-bipartite matching cannot use this method directly, because odd cycles create augmenting paths that a naive depth-first search mishandles. Edmonds' blossom algorithm contracts those cycles and is substantially harder to implement.",
    ],
  },

  code: {
    lang: "cpp",
    source: `// Maximum bipartite matching by Kuhn's algorithm, O(V * E).
#include <algorithm>
#include <vector>

struct Matching {
    const std::vector<std::vector<int>>& adj;  // left vertex -> right vertices
    std::vector<int> partner;                  // right vertex -> left, or -1
    std::vector<char> seen;                    // right vertices tried this search

    Matching(const std::vector<std::vector<int>>& g, int right_count)
        : adj(g), partner(right_count, -1), seen(right_count, 0) {}

    bool augment(int u) {
        for (int v : adj[u]) {
            if (seen[v]) continue;   // asked already in this search
            seen[v] = 1;

            // Either v is free, or its holder can be rehoused. Both cases end
            // with v available, and the flip has already happened deeper down.
            if (partner[v] == -1 || augment(partner[v])) {
                partner[v] = u;
                return true;
            }
        }
        return false;
    }

    int run() {
        int size = 0;
        for (int u = 0; u < (int)adj.size(); ++u) {
            // Reset per search, but shared across its whole recursion. Without
            // this the search can revisit vertices and blow up exponentially.
            std::fill(seen.begin(), seen.end(), 0);
            if (augment(u)) ++size;
        }
        return size;
    }
};`,
  },
};
