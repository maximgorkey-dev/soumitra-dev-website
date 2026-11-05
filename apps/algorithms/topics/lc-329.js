import { study } from "./leet-light.js";

export const lc329 = study({
  number: 329,
  title: "Longest Increasing Path in a Matrix",
  slug: "longest-increasing-path-in-a-matrix",
  difficulty: "H",
  pattern: "F8",
  topic: "F8 · Grid and DAG DP",
  see: 64,
  themes: ["Implicit DAG", "Memoised DFS", "Topological order by value"],
  blurb: "Moving to a strictly larger neighbour can never cycle, so the cells form a DAG even though moves go in four directions. len[r][c] = 1 + max len over larger neighbours, computed by memoised DFS (or by processing cells in decreasing value).",
  statement: [
    "Given an integer matrix, return the length of the longest path that moves up, down, left or right and visits strictly increasing values. No diagonal moves, no wrapping.",
    "Up to 200 × 200. Example: [[9, 9, 4], [6, 6, 8], [2, 1, 1]] gives 4 (1 → 2 → 6 → 9).",
  ],
  concepts: [
    "Strict increase makes a DAG: a path can never come back to a cell, because values only go up. So DP is valid even with four-direction moves.",
    "Memoised DFS: len(cell) depends on larger neighbours only; compute each once and cache.",
    "No visited set needed: the strict increase already prevents revisits within a path.",
    "Alternative topological order: sort cells by value descending (or peel from local maxima with in-degrees, Kahn style) and fill len in that order.",
    "Contrast with 64: there the DAG comes from the move directions; here it comes from the values.",
  ],
  hints: [
    "A plain DFS from every cell is exponential in the worst case. What does each DFS recompute?",
    "The longest path starting at a cell does not depend on where you came from. Cache it.",
    "Why can't the cache be wrong because of cycles?",
    "Values strictly increase along a path, so no cycles exist: the dependencies form a DAG.",
  ],
  brute: [
    "DFS from every cell exploring all increasing paths: in a grid with many long paths, the same suffixes are explored over and over, exponential in the worst case.",
    "The longest increasing path from a cell is a fixed number, the same however the cell was reached. So memoise it: R × C cells, each looking at four neighbours once, O(R × C).",
  ],
  invariant: "Once computed, len[r][c] is the number of cells on the longest strictly increasing path starting at (r, c).",
  traps: [
    "Allowing equal values: \"increasing\" is strict, and allowing equality would create cycles (two equal neighbours) and break the DP.",
    "Adding a visited set and backtracking: unnecessary and turns the memo into something that depends on the path, which is wrong.",
    "Recursion depth: a snake-shaped increasing path can be 4 × 10⁴ long. Usually fine; the topological-sort version avoids recursion.",
    "Running Dijkstra or BFS for the longest path: longest path is hard in general graphs; here it is easy only because the graph is a DAG.",
  ],
  followUps: [
    "Return the path: from the cell with the largest len, step to a neighbour whose len is one less and whose value is larger.",
    "Count the number of increasing paths (2328): the same DAG, sum instead of max, modulo a prime.",
    "Non-decreasing paths: equal neighbours form plateaus with cycles; contract each plateau (connected equal cells) into one node first, then it is a DAG again.",
    "Kahn-style layering: start from cells with no larger neighbour, peel layer by layer; the number of layers is the answer, with no recursion at all.",
  ],
  explanation: [
    { h: "Why DP works with four directions" },
    "Each step goes to a strictly larger value, so no path can return to a cell it has left. The cells with the \"go to a larger neighbour\" edges form a DAG, and on a DAG the longest path can be found by DP.",
    { h: "What the table means" },
    "len[r][c] is the number of cells on the longest strictly increasing path that starts at (r, c). The answer is the largest len over all cells.",
    { h: "Base case" },
    "A cell with no larger neighbour (a local maximum) has len = 1: the path is just itself.",
    { h: "Filling one cell" },
    {
      list: [
        "Look at the four neighbours. Only those with a strictly larger value can be next on the path.",
        "len[r][c] = 1 + the largest len among them, or 1 if there are none.",
        "Compute a neighbour's len recursively if it is not cached yet. Its value is larger, so the recursion always goes uphill and ends.",
      ],
    },
    { code: "len(r, c) = 1 + max(len(nr, nc) for neighbours with grid[nr][nc] > grid[r][c]), default 0\nanswer    = max over all cells of len(r, c)" },
    { h: "A worked example: [[9, 9, 4], [6, 6, 8], [2, 1, 1]]" },
    {
      table: {
        head: ["", "c = 0", "c = 1", "c = 2"],
        rows: [
          ["r = 0", "1 (9)", "1 (9)", "2 (4)"],
          ["r = 1", "2 (6)", "2 (6)", "1 (8)"],
          ["r = 2", "3 (2)", "**4** (1)", "2 (1)"],
        ],
        caption: "len[r][c] with the cell's value in brackets: the longest increasing path starting there. The answer is 4.",
      },
    },
    "The 8 has neighbours 4, 6 and 1, all smaller, so len = 1. The 4 can step to 9 or to 8, both len 1, so len = 2. The 1 in the middle of the bottom row can step to 2 (len 3) or 6 (len 2), so len = 4: 1 → 2 → 6 → 9. The two 6s cannot step to each other, because the path must be strictly increasing.",
    { h: "Order and memory" },
    "Each cell is computed once and looks at four neighbours: O(R × C) time and space. Without recursion, sort cells by value descending and fill len in that order, since a cell's larger neighbours always come first.",
    { tip: "Signal: longest path where each step must increase a value. The values give a DAG; memoised DFS." },
  ],
  analysis: {
    time: "O(R × C)",
    space: "O(R × C)",
    notes: ["The recursion stack can reach R × C on a snake-shaped path."],
  },
  solution: `class Solution {
    vector<vector<int>> len;                    // 0 = not computed yet
    int R = 0, C = 0;

    int dfs(const vector<vector<int>>& g, int r, int c) {
        if (len[r][c]) return len[r][c];
        static const int dr[4] = {1, -1, 0, 0}, dc[4] = {0, 0, 1, -1};
        int best = 0;
        for (int d = 0; d < 4; ++d) {
            int nr = r + dr[d], nc = c + dc[d];
            // Only strictly larger neighbours: this is what rules out cycles,
            // so the cached value never depends on how we got here.
            if (nr >= 0 && nr < R && nc >= 0 && nc < C && g[nr][nc] > g[r][c])
                best = max(best, dfs(g, nr, nc));
        }
        return len[r][c] = 1 + best;
    }

public:
    int longestIncreasingPath(vector<vector<int>>& matrix) {
        R = matrix.size();
        C = matrix[0].size();
        len.assign(R, vector<int>(C, 0));
        int answer = 0;
        for (int r = 0; r < R; ++r)
            for (int c = 0; c < C; ++c)
                answer = max(answer, dfs(matrix, r, c));
        return answer;
    }
};
`,
});
