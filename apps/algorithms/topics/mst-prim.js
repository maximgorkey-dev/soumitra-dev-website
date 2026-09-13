/**
 * Prim's minimum spanning tree.
 *
 * Deliberately drawn on the same graph as mst-kruskal, because the two
 * algorithms reach the same tree by completely different routes: Kruskal sorts
 * the whole edge list up front, Prim never looks further than the edges
 * touching the tree it has grown so far.
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

/** "B–C, C–E and F–G" — for narrating a batch of edges in one note. */
function joinNames(names) {
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

function* run(graph) {
  const ids = graph.nodes.map((n) => n.id);
  const start = ids[0];

  const inTree = new Set([start]);
  const edgeState = {};      // original edge index -> visual state
  const chosen = [];         // original edge indices, in the order taken
  let total = 0;

  const indices = graph.edges.map((_, i) => i);

  // The cut: edges with exactly one end inside the tree. This is the entire
  // set Prim ever chooses from, and the reason it needs no cycle test.
  const crossing = () =>
    indices.filter((i) => inTree.has(graph.edges[i].u) !== inTree.has(graph.edges[i].v));

  // Edges that have fallen wholly inside the tree without being chosen. They
  // can never be used again, which is worth saying out loud.
  const swallowed = () =>
    indices.filter((i) => {
      const e = graph.edges[i];
      const state = edgeState[i];
      return inTree.has(e.u) && inTree.has(e.v) && (!state || state === "idle");
    });

  const frontierOf = (cut) => {
    const out = new Set();
    for (const i of cut) {
      const e = graph.edges[i];
      out.add(inTree.has(e.u) ? e.v : e.u);
    }
    return out;
  };

  const nodeMarks = (frontier) => {
    const out = {};
    for (const id of ids) {
      out[id] = inTree.has(id) ? "visited" : frontier.has(id) ? "frontier" : "idle";
    }
    return out;
  };

  // Components of the chosen-edge subgraph: the tree is one colour and every
  // vertex not yet reached is its own. Same meaning as on the Kruskal page,
  // and the only channel the server-side runner can colour vertices through.
  const componentMarks = () => {
    const out = {};
    let next = 1;
    for (const id of ids) out[id] = inTree.has(id) ? 0 : next++;
    return out;
  };

  const metrics = () => [
    { label: "Vertices in tree", value: `${inTree.size} / ${ids.length}` },
    { label: "Edges in tree", value: `${chosen.length} / ${ids.length - 1}` },
    { label: "Total weight", value: String(total) },
  ];

  const snapshot = (extra, frontier = new Set()) =>
    frame({
      marks: { edges: { ...edgeState }, nodes: nodeMarks(frontier), components: componentMarks() },
      metrics: metrics(),
      ...extra,
    });

  yield snapshot(
    {
      phase: "Initialise",
      note: `Start from ${start}. The tree holds one vertex and no edges yet.`,
      detail: "Prim's rule: repeatedly take the lightest edge with exactly one end inside the tree.",
    },
    frontierOf(crossing()),
  );

  while (chosen.length < ids.length - 1) {
    const cut = crossing();
    if (cut.length === 0) break;   // disconnected: nothing left to reach

    // Show the whole cut, so the choice being made is visible rather than
    // implied. Non-chosen candidates go back to idle afterwards, because Prim
    // will genuinely reconsider them once the tree has grown.
    for (const i of cut) edgeState[i] = "candidate";
    yield snapshot(
      {
        phase: "Survey",
        note: `${cut.length} edge${cut.length === 1 ? "" : "s"} leave the tree; the lightest of them is the one to take.`,
        detail: cut.map((i) => `${graph.edges[i].u}${graph.edges[i].v}(${graph.edges[i].w})`).join("  "),
      },
      frontierOf(cut),
    );

    // Lightest edge across the cut, ties broken by the order the edges were
    // declared. Any consistent rule works; a fixed one keeps replay stable.
    let best = cut[0];
    for (const i of cut) if (graph.edges[i].w < graph.edges[best].w) best = i;
    const tied = cut.filter((i) => graph.edges[i].w === graph.edges[best].w).length > 1;

    const e = graph.edges[best];
    const joining = inTree.has(e.u) ? e.v : e.u;

    for (const i of cut) edgeState[i] = "idle";
    edgeState[best] = "accepted";
    inTree.add(joining);
    chosen.push(best);
    total += e.w;

    yield snapshot(
      {
        phase: "Choose",
        note: `Take ${e.u}–${e.v} at weight ${e.w}; ${joining} joins the tree.`,
        detail: tied
          ? `Two edges weigh ${e.w}; the tie goes to whichever was declared first, so the run is reproducible. Running weight ${total}.`
          : `Running weight ${total}.`,
      },
      frontierOf(crossing()),
    );

    const stale = swallowed();
    if (stale.length > 0) {
      const names = stale.map((i) => `${graph.edges[i].u}–${graph.edges[i].v}`);
      for (const i of stale) edgeState[i] = "rejected";
      yield snapshot(
        {
          phase: "Prune",
          note: stale.length === 1
            ? `${names[0]} now has both ends inside the tree, so it can never be used.`
            : `${joinNames(names)} now have both ends inside the tree, so they can never be used.`,
          detail: "Prim never tests for cycles: an edge is only ever a candidate while one end is still outside.",
        },
        frontierOf(crossing()),
      );
    }
  }

  yield snapshot({
    phase: "Done",
    note: `Spanning tree complete: ${chosen.length} edges, total weight ${total}.`,
    detail: `Grown in the order ${chosen.map((i) => `${graph.edges[i].u}${graph.edges[i].v}`).join(" → ")}.`,
  });
}

export const prim = {
  id: "mst-prim",
  section: "Algorithms",
  topic: "Minimum spanning tree",
  title: "Prim's algorithm",
  blurb: "Grow a single tree outward from one vertex, always taking the cheapest edge that leaves it",
  structure: GRAPH,
  run,

  explanation: [
    "Prim's algorithm finds a minimum spanning tree — the cheapest set of edges that connects every vertex without forming a cycle. Where Kruskal builds the tree out of fragments scattered across the graph, Prim keeps exactly one tree and grows it. Start at any vertex, then repeatedly look at every edge with one end inside the tree and one end outside, and take the lightest. Each such edge pulls in exactly one new vertex, so after V − 1 of them the tree spans the graph.",
    "Correctness follows from the cut property. Split the vertices into two non-empty groups; then the lightest edge crossing that split belongs to some minimum spanning tree. The argument is a swap: take any spanning tree that avoids that edge, add the edge, and the cycle it creates must leave the split again on some other, no-lighter edge; delete that one instead and you have a spanning tree no heavier than the one you started with. Prim's chosen edge is always the lightest across the split between the tree and everything else, so every step is safe and nothing ever needs revisiting.",
    "The same invariant is what makes Prim cheap to implement: because a candidate edge always has one end outside the tree, it can never close a cycle, so unlike Kruskal there is no disjoint-set structure and no cycle test at all. The real work is finding the lightest edge across the cut over and over. The visualisation makes that set explicit — the candidate edges lighting up each round are the cut — but a real implementation would never rebuild it from scratch. It keeps the cut in a priority queue, pushing an entry for each edge leaving a newly added vertex and discarding entries whose far end has since been absorbed. The frames marked Prune are those absorbed edges, dropping out of contention.",
    "This is the same graph as the Kruskal page, and it is worth comparing the two. Both end on the identical six edges for a total of 38, but the order differs completely: Kruskal takes A–G and C–D first because they are the two lightest edges anywhere, while Prim cannot touch C–D until the tree has already reached that side of the graph. The tree is the same because the minimum spanning tree here is unique, not because the algorithms agree step by step.",
  ],

  analysis: {
    time: "O(E log V) with a binary heap; O(V²) scanning the cut directly",
    space: "O(V) for the in-tree flags, plus O(E) for the heap when stale entries are left in it",
    notes: [
      "With a binary heap the pushes dominate: every edge is offered to the heap at most once, giving E pushes and E pops at O(log E) each. Since E ≤ V², log E ≤ 2 log V, so O(E log E) and the usual O(E log V) are the same bound.",
      "Leaving stale entries in the heap and skipping them on pop makes the heap O(E) rather than O(V), which is the trade every practical implementation makes: deleting or decreasing keys in place needs an index from vertex to heap position, and the bookkeeping costs more than the extra memory.",
      "On a dense graph the heap is the wrong structure. Keeping one best-known crossing weight per vertex and scanning all V of them each round is O(V²) with no log factor and no allocation, and wins outright once E approaches V². That array-scanning variant is what the animation shows.",
      "A Fibonacci heap brings the bound to O(E + V log V), which is asymptotically the best known, but the constant factors are bad enough that it is almost never the faster choice on real inputs.",
      "Against Kruskal: Prim needs no disjoint-set structure, because the cut invariant makes a cycle impossible by construction, and it only ever touches edges near the tree, which suits a graph too large to sort. Kruskal is the better fit when the edges arrive already sorted or the graph is sparse.",
      "Prim requires a connected graph to produce a spanning tree. On a disconnected one it stops with the minimum spanning tree of the start vertex's component only, whereas Kruskal falls out naturally as a minimum spanning forest; getting a forest from Prim means restarting it from each unreached vertex.",
    ],
  },

  /**
   * The server-side variant, written to be edited and run rather than read. It
   * narrates itself through viz::Trace with the same phases the generator above
   * emits. Trace has no per-vertex state channel, only component colouring, so
   * the growing tree is conveyed as component 0 — which is why the generator
   * above also emits componentMarks and not just node marks.
   *
   * Only the body of solve() is sent: the harness owns main(), reads the graph
   * and constructs the Trace, which is why there are no includes here and
   * nothing prints.
   */
  editable: {
    topic: "mst-prim",
    lang: "cpp",
    signature: "void solve(const viz::Graph& g, viz::Trace& t)",
    starter: `const int n = g.n;
const int m = static_cast<int>(g.edge_count());

std::vector<char> in_tree(n, 0);
std::vector<int> edge_state(m, 0);        // 0 idle, 1 accepted, 2 rejected
in_tree[0] = 1;

int tree_size = 1, chosen = 0;
long long total = 0;

// Components of the chosen-edge subgraph: the tree is one colour, every vertex
// not yet reached is its own. Two vertices sharing a colour are connected.
auto paint = [&] {
    std::vector<int> group(n);
    int next = 1;
    for (int v = 0; v < n; ++v) group[v] = in_tree[v] ? 0 : next++;
    t.components(group);
};

auto counters = [&] {
    t.metric("Vertices in tree", std::to_string(tree_size) + " / " + std::to_string(n));
    t.metric("Edges in tree", std::to_string(chosen) + " / " + std::to_string(n - 1));
    t.metric("Total weight", total);
};

// Frames are whole snapshots, so every edge is rewritten each time from the
// states that persist; the candidate highlight is layered on top of that.
auto restore = [&] {
    for (int i = 0; i < m; ++i) {
        t.edge(i, edge_state[i] == 1 ? viz::ACCEPTED
                : edge_state[i] == 2 ? viz::REJECTED
                                     : viz::IDLE);
    }
};

paint();
counters();
t.emit("Initialise", "Start from " + g.label(0) + ". The tree holds one vertex and no edges yet.",
       "Prim's rule: repeatedly take the lightest edge with exactly one end inside the tree.");

while (chosen < n - 1) {
    // The cut: edges with exactly one end inside the tree.
    std::vector<int> cut;
    for (int i = 0; i < m; ++i) {
        if (in_tree[g.edges[i].u] != in_tree[g.edges[i].v]) cut.push_back(i);
    }
    if (cut.empty()) break;               // disconnected: nothing left to reach

    restore();
    std::string listing;
    for (const int i : cut) {
        if (!listing.empty()) listing += "  ";
        listing += g.label(g.edges[i].u) + g.label(g.edges[i].v) +
                   "(" + std::to_string(g.edges[i].w) + ")";
        t.edge(i, viz::CANDIDATE);
    }
    counters();
    t.emit("Survey", std::to_string(cut.size()) +
                     " edges leave the tree; the lightest of them is the one to take.", listing);

    // Lightest across the cut, ties going to whichever was declared first.
    int best = cut[0];
    for (const int i : cut) {
        if (g.edges[i].w < g.edges[best].w) best = i;
    }

    const viz::Edge& e = g.edges[best];
    const int joining = in_tree[e.u] ? e.v : e.u;
    in_tree[joining] = 1;
    edge_state[best] = 1;
    ++tree_size;
    ++chosen;
    total += e.w;

    restore();
    paint();
    counters();
    t.emit("Choose", "Take " + g.label(e.u) + "-" + g.label(e.v) + " at weight " +
                     std::to_string(e.w) + "; " + g.label(joining) + " joins the tree.",
           "Running weight " + std::to_string(total) + ".");

    // Edges swallowed by the tree without being chosen are out of contention.
    std::vector<int> stale;
    for (int i = 0; i < m; ++i) {
        if (edge_state[i] == 0 && in_tree[g.edges[i].u] && in_tree[g.edges[i].v]) {
            stale.push_back(i);
        }
    }
    if (!stale.empty()) {
        std::string names;
        for (std::size_t k = 0; k < stale.size(); ++k) {
            if (k) names += (k + 1 == stale.size()) ? " and " : ", ";
            names += g.label(g.edges[stale[k]].u) + "-" + g.label(g.edges[stale[k]].v);
        }
        for (const int i : stale) edge_state[i] = 2;
        restore();
        counters();
        t.emit("Prune", names + (stale.size() == 1
                   ? " now has both ends inside the tree, so it can never be used."
                   : " now have both ends inside the tree, so they can never be used."),
               "Prim never tests for cycles: an edge is only a candidate while one end is outside.");
    }
}

counters();
t.emit("Done", "Spanning tree complete: " + std::to_string(chosen) +
               " edges, total weight " + std::to_string(total) + ".");
`,
  },

  code: {
    lang: "cpp",
    source: `// Prim's minimum spanning tree, O(E log V) with a binary heap.
#include <functional>
#include <queue>
#include <tuple>
#include <utility>
#include <vector>

struct Arc { int to, w; };   // adjacency entry: an edge seen from one end

// Returns the total weight of a minimum spanning tree and fills "tree" with the
// chosen edges as (from, to) pairs. Assumes the graph is connected; on a
// disconnected one this returns the tree of vertex 0's component only.
long long prim(const std::vector<std::vector<Arc>>& adj,
               std::vector<std::pair<int, int>>& tree) {
    const int n = static_cast<int>(adj.size());
    if (n == 0) return 0;

    std::vector<char> in_tree(n, 0);

    // (weight, vertex, came_from), lightest first. The heap holds the cut: the
    // edges with one end in the tree and one end outside. The renderer's
    // "candidate" edges are exactly this set.
    using Item = std::tuple<int, int, int>;
    std::priority_queue<Item, std::vector<Item>, std::greater<Item>> cut;

    cut.emplace(0, 0, -1);                 // start anywhere; vertex 0 will do
    long long total = 0;

    while (!cut.empty()) {
        const auto [w, v, from] = cut.top();
        cut.pop();

        // Stale entries are never removed when a vertex is absorbed, only
        // skipped here on the way out. That is what keeps the heap O(E) and
        // avoids maintaining a vertex-to-heap-position index; these skips are
        // the edges the animation marks rejected.
        if (in_tree[v]) continue;

        in_tree[v] = 1;
        total += w;
        if (from >= 0) tree.push_back({from, v});

        // Every edge leaving the new vertex joins the cut. No cycle test is
        // needed: an edge is only ever pushed while its far end is outside.
        for (const Arc& a : adj[v]) {
            if (!in_tree[a.to]) cut.emplace(a.w, a.to, v);
        }
    }
    return total;
}`,
  },
};
