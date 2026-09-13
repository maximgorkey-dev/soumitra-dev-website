/**
 * A* search.
 *
 * The graph is built so that the heuristic is provably sound rather than merely
 * plausible. With coordinates normalised to 0–1 and SCALE = 30, every edge
 * weight is ceil(SCALE · straight-line length) and the heuristic is
 * floor(SCALE · straight-line distance to the goal). Then for any u, v:
 *
 *   h(u) ≤ SCALE·d(u,H) ≤ SCALE·d(u,v) + SCALE·d(v,H) ≤ w(u,v) + h(v) + 1
 *
 * and because all three are integers, h(u) ≤ w(u,v) + h(v). So the heuristic is
 * consistent, hence admissible, which is what makes closing a vertex for good
 * safe. Both properties were checked exhaustively against true distances.
 *
 * The renderer has no per-vertex styling for node states, so vertex colouring
 * rides on the components channel: 0 expanded, 1 on the open list, 2 for the
 * goal while it is still out of reach, and untouched vertices left unmapped.
 */

import { frame } from "../core/trace.js";

const SCALE = 30;

const GRAPH = {
  kind: "graph",
  nodes: [
    { id: "A", x: 0.04, y: 0.50 },
    { id: "B", x: 0.24, y: 0.16 },
    { id: "C", x: 0.24, y: 0.84 },
    { id: "D", x: 0.46, y: 0.46 },
    { id: "E", x: 0.50, y: 0.08 },
    { id: "F", x: 0.52, y: 0.88 },
    { id: "G", x: 0.74, y: 0.28 },
    { id: "H", x: 0.94, y: 0.56 },
  ],
  edges: [
    { u: "A", v: "B", w: 12 },
    { u: "A", v: "C", w: 12 },
    { u: "B", v: "D", w: 12 },
    { u: "B", v: "E", w: 9 },
    { u: "C", v: "D", w: 14 },
    { u: "C", v: "F", w: 9 },
    { u: "D", v: "G", w: 10 },
    { u: "E", v: "G", w: 10 },
    { u: "F", v: "H", w: 16 },
    { u: "G", v: "H", w: 11 },
    { u: "D", v: "F", w: 13 },
  ],
};

function* run(graph) {
  const ids = graph.nodes.map((n) => n.id);
  const indices = graph.edges.map((_, i) => i);
  const start = ids[0];
  const goal = ids[ids.length - 1];

  const nodeAt = (id) => graph.nodes.find((n) => n.id === id);

  // Straight-line distance to the goal, rounded down so it can never exceed
  // the true remaining cost. Derived from the coordinates the renderer draws.
  const heuristic = (id) => {
    const a = nodeAt(id);
    const b = nodeAt(goal);
    return Math.floor(SCALE * Math.hypot(a.x - b.x, a.y - b.y));
  };

  const h = new Map(ids.map((id) => [id, heuristic(id)]));

  const incident = (id) =>
    indices.filter((i) => graph.edges[i].u === id || graph.edges[i].v === id);

  const other = (i, id) => (graph.edges[i].u === id ? graph.edges[i].v : graph.edges[i].u);

  const g = new Map(ids.map((id) => [id, Infinity]));
  const parent = new Map();
  const open = new Set([start]);
  const closed = new Set();
  const tested = new Set();
  g.set(start, 0);

  const show = (v) => (v === Infinity ? "∞" : String(v));
  const f = (id) => (g.get(id) === Infinity ? Infinity : g.get(id) + h.get(id));

  const claimant = (i) => ids.find((id) => parent.get(id) === i);

  const edgeMarks = (examining, pathOnly) => {
    const out = {};
    for (const i of indices) {
      if (!tested.has(i)) continue;
      if (pathOnly !== undefined) {
        out[i] = pathOnly.has(i) ? "accepted" : "rejected";
        continue;
      }
      const owner = claimant(i);
      if (owner === undefined) out[i] = "rejected";
      else out[i] = closed.has(owner) ? "accepted" : "candidate";
    }
    if (examining !== undefined) out[examining] = "candidate";
    return out;
  };

  const nodeMarks = () => {
    const out = {};
    for (const id of ids) {
      out[id] = closed.has(id) ? "visited" : open.has(id) ? "frontier" : "idle";
    }
    return out;
  };

  const componentMarks = () => {
    const out = {};
    for (const id of ids) {
      if (closed.has(id)) out[id] = 0;
      else if (id === goal) out[id] = 2;      // keep the target visible
      else if (open.has(id)) out[id] = 1;
    }
    return out;
  };

  const openTable = () =>
    ids
      .filter((id) => open.has(id))
      .sort((a, b) => f(a) - f(b))
      .map((id) => `${id}: ${g.get(id)}+${h.get(id)}=${f(id)}`)
      .join("   ");

  const metrics = () => [
    { label: "Expanded", value: `${closed.size} / ${ids.length}` },
    { label: "On the open list", value: String(open.size) },
    { label: `Best route to ${goal}`, value: show(g.get(goal)) },
  ];

  const snapshot = (extra, examining, pathOnly) =>
    frame({
      marks: {
        edges: edgeMarks(examining, pathOnly),
        nodes: nodeMarks(),
        components: componentMarks(),
      },
      metrics: metrics(),
      ...extra,
    });

  yield snapshot({
    phase: "Initialise",
    note: `Search from ${start} to ${goal}. Each vertex is ranked by f = g + h, not by g alone.`,
    detail: `h is the straight-line distance to ${goal}, scaled and rounded down so it can never overestimate: ${ids.map((id) => `${id}=${h.get(id)}`).join("  ")}`,
  });

  let reached = false;

  while (open.size > 0) {
    // Lowest f wins; ties go to declaration order.
    let pick = null;
    for (const id of ids) {
      if (!open.has(id)) continue;
      if (pick === null || f(id) < f(pick)) pick = id;
    }

    open.delete(pick);
    closed.add(pick);

    if (pick === goal) {
      yield snapshot({
        phase: "Select",
        note: `${goal} comes off the open list with f = ${f(goal)}. Because h never overestimates, this route is optimal.`,
        detail: `Nothing still open has f below ${f(goal)}, so no undiscovered route can beat ${g.get(goal)}.`,
      });
      reached = true;
      break;
    }

    yield snapshot({
      phase: "Select",
      note: `Expand ${pick}: f = ${g.get(pick)} + ${h.get(pick)} = ${f(pick)}, the smallest on the open list.`,
      detail: open.size > 0 ? `Still open — ${openTable()}` : "The open list is empty apart from this one.",
    });

    for (const i of incident(pick)) {
      const target = other(i, pick);
      const e = graph.edges[i];

      // Consistency is what makes this dismissal safe rather than a shortcut.
      if (closed.has(target)) {
        yield snapshot(
          {
            phase: "Relax",
            note: `${e.u}–${e.v} leads back to ${target}, which has already been expanded, so its cost is settled.`,
            detail: "Because h is consistent, f never falls along a route, and nothing discovered later can undercut a vertex that has already come off the open list.",
          },
          i,
        );
        continue;
      }

      const offer = g.get(pick) + e.w;
      const current = g.get(target);
      const improves = offer < current;

      tested.add(i);
      if (improves) {
        g.set(target, offer);
        parent.set(target, i);
        open.add(target);
      }

      yield snapshot(
        {
          phase: "Relax",
          note: improves
            ? `${e.u}–${e.v}: ${target} now costs ${offer} to reach, with f = ${offer} + ${h.get(target)} = ${offer + h.get(target)}.`
            : `${e.u}–${e.v}: ${offer} is no better than ${show(current)}, so ${target} keeps what it had.`,
          detail: improves
            ? `${g.get(pick)} + ${e.w} = ${offer}, an improvement on ${show(current)}. A large h pushes ${target} down the list even when g is small.`
            : `${g.get(pick)} + ${e.w} = ${offer}, against ${show(current)} already recorded.`,
        },
        i,
      );
    }
  }

  const pathEdges = new Set();
  const pathNodes = [];
  if (reached) {
    let cur = goal;
    while (cur !== undefined) {
      pathNodes.unshift(cur);
      const pe = parent.get(cur);
      if (pe === undefined) break;
      pathEdges.add(pe);
      cur = other(pe, cur);
    }
  }

  yield snapshot(
    {
      phase: "Done",
      note: reached
        ? `Cheapest route is ${pathNodes.join("–")} at cost ${g.get(goal)}, found after expanding ${closed.size} of ${ids.length} vertices.`
        : `${goal} is unreachable from ${start}.`,
      detail: reached
        ? `Plain Dijkstra is this same search with h = 0, and on this graph it has to expand all ${ids.length} vertices before ${goal} comes off the queue. The heuristic saved ${ids.length - closed.size} expansions without changing the answer.`
        : "The open list drained before the goal was ever reached.",
    },
    undefined,
    reached ? pathEdges : undefined,
  );
}

export const astar = {
  id: "sp-astar",
  section: "Algorithms",
  topic: "Shortest path",
  title: "A* search",
  blurb: "Dijkstra aimed at a target: rank vertices by cost so far plus an optimistic guess at the cost remaining",
  structure: GRAPH,
  run,

  explanation: [
    "A* finds the cheapest route between two particular vertices. Dijkstra's algorithm, given the same job, spreads outward in every direction equally, because the only thing it knows about a vertex is how far it is from the source. A* adds a second number: an estimate h of the cost still remaining to the goal. Vertices are then taken in order of f = g + h, cost already paid plus cost still guessed, which biases the search towards the target instead of treating all directions alike. On this graph that is the difference between expanding five vertices and expanding all eight.",
    "The estimate cannot be arbitrary. A* is optimal precisely when h is admissible, meaning it never overestimates the true remaining cost. The reason is visible in the last frame: when the goal is taken off the open list with f = 37, every other candidate has f of 37 or more, and since each of those f values is a lower bound on the best route through that vertex, none of them can lead anywhere cheaper. Break admissibility and that argument collapses — A* will still terminate, still return a route quickly, and that route may simply not be the cheapest. Fast and confidently wrong is the characteristic A* failure.",
    "A slightly stronger property matters for the implementation. Here h is consistent, meaning h(u) ≤ w(u,v) + h(v) for every edge, which guarantees that f never decreases along a path and so a vertex's cost is final the first time it is expanded. That is what makes it safe to close a vertex permanently, exactly as Dijkstra does. With a heuristic that is admissible but not consistent, a shorter route to an already-closed vertex can appear later and the implementation has to be willing to reopen it. This graph avoids the whole question by construction: edge weights are the straight-line distances rounded up, and h is the straight-line distance to the goal rounded down, so consistency follows from the triangle inequality and both properties were verified against true distances rather than assumed.",
    "The heuristic is the entire design space. With h = 0, A* is Dijkstra's algorithm exactly. With a perfect h equal to the true remaining cost, it walks straight down the optimal path and expands nothing else. Everything useful lives between those poles, and a stronger admissible heuristic always expands no more vertices than a weaker one. This is why grid pathfinding is careful to match the heuristic to the movement rules — Manhattan distance where only four directions are allowed, octile where eight are — and why using Euclidean distance on a grid that forbids diagonal movement is a classic way to be admissible but weak. Watch the animation choose C over B even though both cost 12 to reach: C is simply pointed the right way.",
  ],

  analysis: {
    time: "O(E log V) in the worst case, the same as Dijkstra; a good heuristic changes the constant, not the bound",
    space: "O(V) for the open and closed sets, plus O(E) for the queue with lazy entries",
    notes: [
      "A* is Dijkstra's algorithm with the queue keyed on g + h instead of g, so with h = 0 the two are identical, and the worst-case bound is therefore also identical. An adversarial graph can render any heuristic useless.",
      "Admissibility — h never overestimating — is what buys optimality. Consistency, the stronger condition h(u) ≤ w(u,v) + h(v), is what allows a vertex to be closed permanently; with only admissibility an implementation must be prepared to reopen closed vertices when a cheaper route surfaces.",
      "Between two admissible heuristics, the larger one never expands more vertices. That gives a clean way to compare them, and it means the practical work in A* is almost entirely about finding the strongest lower bound you can compute cheaply.",
      "Weighted A*, ranking by g + εh with ε above 1, is no longer admissible but returns a route within a factor ε of optimal, usually far faster. That trade is standard in games and robotics, where a route 10% long that arrives in time beats an optimal one that does not.",
      "The heuristic has to be a lower bound in the same units as the edge weights, and mixing units is the most common bug in practice: metres against seconds, or Euclidean distance against grid steps. Here the two are locked together deliberately, weights being ceil(30·length) and h being floor(30·distance).",
      "On this graph A* expands 5 of 8 vertices to prove the route A–C–F–H at cost 37, where Dijkstra must expand all 8 because the goal is the last vertex to settle. That ratio is what A* buys, and it grows with graph size rather than staying fixed.",
    ],
  },

  code: {
    lang: "cpp",
    source: `// A* shortest route between two vertices, O(E log V) worst case.
#include <cmath>
#include <limits>
#include <queue>
#include <utility>
#include <vector>

struct Arc { int to, w; };
struct Point { double x, y; };

constexpr long long INF = std::numeric_limits<long long>::max();

// A lower bound on the cost still to be paid. It must never overestimate, or
// the route returned may not be the cheapest; rounding down guarantees that
// when the edge weights are the same distances rounded up.
long long heuristic(const Point& from, const Point& goal, double scale) {
    const double dx = from.x - goal.x;
    const double dy = from.y - goal.y;
    return static_cast<long long>(std::floor(scale * std::hypot(dx, dy)));
}

// Returns the cost of the cheapest route from "start" to "goal", or INF, and
// fills "parent" so the route can be walked back. Assumes the heuristic is
// consistent, which is what makes the "closed" check below safe.
long long astar(const std::vector<std::vector<Arc>>& adj,
                const std::vector<Point>& pos, double scale,
                int start, int goal, std::vector<int>& parent) {
    const int n = static_cast<int>(adj.size());
    std::vector<long long> g(n, INF);
    std::vector<char> closed(n, 0);
    parent.assign(n, -1);

    // (f, vertex) with f = g + h, smallest first.
    using Item = std::pair<long long, int>;
    std::priority_queue<Item, std::vector<Item>, std::greater<Item>> open;

    g[start] = 0;
    open.emplace(heuristic(pos[start], pos[goal], scale), start);

    while (!open.empty()) {
        const auto [fv, v] = open.top();
        open.pop();

        if (closed[v]) continue;           // a stale entry from an earlier push
        closed[v] = 1;
        if (v == goal) return g[v];        // nothing open can be cheaper

        for (const Arc& a : adj[v]) {
            if (closed[a.to]) continue;
            const long long offer = g[v] + a.w;
            if (offer >= g[a.to]) continue;

            g[a.to] = offer;
            parent[a.to] = v;
            open.emplace(offer + heuristic(pos[a.to], pos[goal], scale), a.to);
        }
    }
    return INF;                            // the goal is unreachable
}`,
  },
};
