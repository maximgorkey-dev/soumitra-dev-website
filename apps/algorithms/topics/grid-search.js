/**
 * Search on the grid view: breadth-first search for a shortest path through a
 * maze. The grid is a graph whose edges are implicit — each open cell joins
 * its four neighbours — so the board itself is the drawing.
 */

import { frame } from "../core/trace.js";
import { result, cpp } from "./seq-common.js";

const GRID = { kind: "grid" };

const MAZE = [
  "S..#......",
  ".#.#.####.",
  ".#...#....",
  ".####.#.#.",
  "......#.#.",
  ".#.####.#.",
  "...#....#T",
];

/* Up, right, down, left: the same order as the C++, so parents and the path agree. */
const DIRS = [[-1, 0, "U"], [0, 1, "R"], [1, 0, "D"], [0, -1, "L"]];

function* bfsRun() {
  const R = MAZE.length;
  const C = MAZE[0].length;
  let start = null;
  let goal = null;
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    if (MAZE[r][c] === "S") start = [r, c];
    if (MAZE[r][c] === "T") goal = [r, c];
  }
  const dist = MAZE.map((row) => [...row].map(() => null));
  const from = MAZE.map((row) => [...row].map(() => -1));
  const wall = (r, c) => MAZE[r][c] === "#";
  const key = (r, c) => `${r},${c}`;
  const atGoal = (r, c) => r === goal[0] && c === goal[1];

  const values = () => MAZE.map((row, r) => [...row].map((ch, c) => {
    if (ch === "#") return null;
    if (ch === "S") return "S";
    if (ch === "T") return dist[r][c] === null ? "T" : dist[r][c];
    return dist[r][c];
  }));
  const cellsFor = (frontier = []) => {
    const out = {};
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      if (wall(r, c)) out[key(r, c)] = "wall";
      else if (dist[r][c] !== null) out[key(r, c)] = "visited";
    }
    for (const [r, c] of frontier) out[key(r, c)] = "frontier";
    if (dist[goal[0]][goal[1]] === null) out[key(...goal)] = "pivot";
    out[key(...start)] = "selected";
    return out;
  };
  const board = (cells, arrows = []) => ({ name: `${R} × ${C} maze, 4-connected`, values: values(), cells, arrows });
  const parentArrow = (r, c, state) => {
    const [dr, dc] = DIRS[from[r][c]];
    return { from: [r - dr, c - dc], to: [r, c], state };
  };

  let reached = 1;
  const metrics = (d, frontier, more = []) => [
    { label: "Distance", value: String(d) },
    { label: "Frontier", value: `${frontier} cells` },
    { label: "Reached", value: `${reached} cells` },
    ...more,
  ];

  dist[start[0]][start[1]] = 0;
  let frontier = [start];
  let d = 0;
  yield frame({
    phase: "Set up",
    note: "Find the shortest path from S to T, moving up, down, left or right through open cells.",
    detail: "Every move costs the same, so breadth-first search applies: it reaches cells in order of distance, and the first time it reaches T is the shortest way there.",
    marks: { grids: [board(cellsFor(frontier))] },
    metrics: metrics(0, 1),
  });

  while (frontier.length && dist[goal[0]][goal[1]] === null) {
    const next = [];
    let stuck = 0;
    for (const [r, c] of frontier) {
      let grew = false;
      DIRS.forEach(([dr, dc], k) => {
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nr >= R || nc < 0 || nc >= C || wall(nr, nc) || dist[nr][nc] !== null) return;
        dist[nr][nc] = d + 1;
        from[nr][nc] = k;
        next.push([nr, nc]);
        reached++;
        grew = true;
      });
      if (!grew) stuck++;
    }
    d++;
    frontier = next;
    const hit = next.some(([r, c]) => atGoal(r, c));
    const deadEnds = stuck ? ` ${stuck} of the previous ring had nowhere new to go.` : "";
    yield frame({
      phase: "Expand",
      note: hit
        ? `Ring ${d} reaches T. Nothing closer was missed: every cell at distance ${d - 1} or less was already found.`
        : next.length
          ? `Ring ${d}: ${next.length} new cell${next.length === 1 ? "" : "s"} at distance ${d}, each one step from the ring before.${deadEnds}`
          : `Ring ${d} is empty: every reachable cell is found, and T is not among them.`,
      detail: d === 1 ? "A queue does this one cell at a time; the animation shows a whole ring per step, which is the same order in bigger strides. The arrows record which cell found each new one." : "",
      marks: { grids: [board(cellsFor(next), next.map(([r, c]) => parentArrow(r, c, "active")))] },
      metrics: metrics(d, next.length),
    });
  }

  if (dist[goal[0]][goal[1]] === null) {
    yield frame({
      phase: "Done",
      note: "T is unreachable.",
      marks: { grids: [board(cellsFor())] },
      metrics: metrics(d, 0, [result("unreachable")]),
    });
    return;
  }

  // Follow the parent arrows back from T, then read them forwards.
  const path = [];
  const moves = [];
  for (let [r, c] = goal; from[r][c] >= 0;) {
    const [dr, dc, name] = DIRS[from[r][c]];
    path.push([r, c]);
    moves.push(name);
    r -= dr;
    c -= dc;
  }
  path.reverse();
  moves.reverse();
  const cells = cellsFor();
  for (const [r, c] of path) cells[key(r, c)] = "path";
  const arrows = path.map(([r, c]) => parentArrow(r, c, "path"));
  const word = moves.join("");
  yield frame({
    phase: "Path",
    note: `Follow the arrows back from T to S: ${path.length} steps. Each cell on the way is one closer to S, so no shorter route exists.`,
    detail: `Read forwards, the moves are ${word}.`,
    marks: { grids: [board(cells, arrows)] },
    metrics: metrics(d, 0),
  });

  yield frame({
    phase: "Done",
    note: `Shortest path: ${dist[goal[0]][goal[1]]} steps. BFS reached ${reached} of the open cells to prove it.`,
    detail: "The cells left blank are farther from S than T is, or cut off from it, so the search never needed them.",
    marks: { grids: [board(cells, arrows)] },
    metrics: metrics(d, 0, [
      result(`shortest = ${dist[goal[0]][goal[1]]} steps`),
      result(`path = ${word}`),
      result(`reached = ${reached} cells`),
    ]),
  });
}

export const gridBfs = {
  id: "grid-bfs",
  section: "Algorithms",
  topic: "Grid search",
  title: "Shortest path in a maze (BFS)",
  blurb: "Spread outwards from the start one ring at a time; the first ring to touch the goal gives the shortest path",
  structure: GRID,
  run: bfsRun,
  explanation: [
    { tip: "**In one line:** a grid is a graph with implicit edges, and when every move costs the same, breadth-first search finds shortest paths in one sweep." },
    "Each open cell is a vertex joined to its open neighbours. Nothing needs building: the neighbours of (r, c) are computed on the spot, which is why grid problems rarely store an adjacency list.",
    { h: "How it works" },
    { list: [
      "Start with S at distance 0 in a **queue**.",
      "Take the oldest cell out, and give every unvisited open neighbour distance + 1 and an arrow back to it.",
      "Mark cells **when they are discovered**, not when they are taken out; otherwise a cell can enter the queue several times.",
      "Stop as soon as T is discovered, then follow the arrows back for the route.",
    ] },
    { h: "Why the first arrival is the shortest" },
    "The queue holds cells in order of distance, at most two neighbouring distances at a time, so all cells at distance d come out before any at d + 1. That is what the rings show. When T first appears, every cell closer to S has already been found, so no shorter path to T can exist.",
    { h: "Where it stops working" },
    "If moves have different costs — mud, diagonals worth √2 — rings no longer line up with cost, and you need Dijkstra's algorithm, or A* with a distance heuristic toward T. If the costs are only 0 or 1, a deque gives the same result as Dijkstra in linear time (0-1 BFS).",
  ],
  analysis: {
    time: "O(R·C) — each cell enters the queue at most once and checks four neighbours",
    space: "O(R·C) for the distances and parent arrows",
    notes: [
      "Multi-source BFS starts with several cells in the queue at distance 0. That is the standard way to get every cell's distance to its nearest exit or fire, or to rot every orange.",
      "Flood fill and island counting are the same traversal without distances; DFS works there too, because only reachability matters.",
      "Searching from both ends and meeting in the middle explores about two discs of radius d/2 instead of one of radius d, which is a large saving on open maps.",
      "A blank cell on the final board is farther from S than T is. BFS has no sense of direction, so on open ground it explores a whole diamond around S; A* is what adds the direction.",
    ],
  },
  code: cpp("maze_bfs.cpp", `#include <algorithm>
#include <cstdio>
#include <string>
#include <utility>
#include <vector>

int main() {
    const std::vector<std::string> maze = {
        "S..#......",
        ".#.#.####.",
        ".#...#....",
        ".####.#.#.",
        "......#.#.",
        ".#.####.#.",
        "...#....#T",
    };
    const int R = maze.size(), C = maze[0].size();
    int sr = 0, sc = 0, tr = 0, tc = 0;
    for (int r = 0; r < R; ++r)
        for (int c = 0; c < C; ++c) {
            if (maze[r][c] == 'S') { sr = r; sc = c; }
            if (maze[r][c] == 'T') { tr = r; tc = c; }
        }

    const int dr[] = {-1, 0, 1, 0}, dc[] = {0, 1, 0, -1};   // up, right, down, left
    const char name[] = "URDL";
    std::vector<std::vector<int>> dist(R, std::vector<int>(C, -1));
    std::vector<std::vector<int>> from(R, std::vector<int>(C, -1));  // move that first reached the cell

    // Ring by ring: every cell in 'frontier' is at the same distance.
    dist[sr][sc] = 0;
    std::vector<std::pair<int, int>> frontier = {{sr, sc}};
    int reached = 1;
    while (!frontier.empty() && dist[tr][tc] < 0) {
        std::vector<std::pair<int, int>> next;
        for (auto [r, c] : frontier)
            for (int k = 0; k < 4; ++k) {
                const int nr = r + dr[k], nc = c + dc[k];
                if (nr < 0 || nr >= R || nc < 0 || nc >= C) continue;
                if (maze[nr][nc] == '#' || dist[nr][nc] >= 0) continue;   // wall, or already found
                dist[nr][nc] = dist[r][c] + 1;                            // mark on discovery
                from[nr][nc] = k;
                next.push_back({nr, nc});
                ++reached;
            }
        frontier = std::move(next);
    }
    if (dist[tr][tc] < 0) { std::printf("unreachable\\n"); return 0; }

    // Follow the moves back from T, then reverse them.
    std::string path;
    for (int r = tr, c = tc; from[r][c] >= 0;) {
        const int k = from[r][c];
        path += name[k];
        r -= dr[k];
        c -= dc[k];
    }
    std::reverse(path.begin(), path.end());

    std::printf("shortest = %d steps\\n", dist[tr][tc]);
    std::printf("path = %s\\n", path.c_str());
    std::printf("reached = %d cells\\n", reached);
}
`),
};
