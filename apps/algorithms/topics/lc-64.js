import { study } from "./leet-light.js";

export const lc64 = study({
  number: 64,
  title: "Minimum Path Sum",
  slug: "minimum-path-sum",
  difficulty: "M",
  pattern: "F8",
  topic: "F8 · Grid and DAG DP",
  themes: ["Grid DP", "Moves form a DAG", "Rolling row"],
  blurb: "Moves go only right or down, so the cells form a DAG in row-major order. dp[r][c] is the cheapest path sum from the top-left to (r, c): the cell's own cost plus the cheaper of the cell above and the cell to the left.",
  statement: [
    "A grid of non-negative numbers. Starting at the top-left cell and moving only right or down, reach the bottom-right cell with the smallest sum of the numbers on the path (both ends included).",
    "Up to 200 × 200. Example: [[1, 3, 1], [1, 5, 1], [4, 2, 1]] gives 7 (1 → 3 → 1 → 1 → 1).",
  ],
  concepts: [
    "DAG DP: right and down moves can never return to a cell, so the cells have a topological order (row by row) and each cell can be finished before anything that depends on it.",
    "The last move: a path into (r, c) arrives from (r − 1, c) or (r, c − 1), and the part before it must itself be cheapest.",
    "Edges of the grid: the first row can only be reached from the left, the first column only from above.",
    "Rolling row: each row reads only the row above and itself, so one array of width C suffices.",
    "When the DAG property fails (moves in four directions), DP is invalid and Dijkstra is the tool (compare 1631).",
  ],
  hints: [
    "How can a path enter the bottom-right cell?",
    "From above or from the left. If you knew the best cost to each of those, what is the answer?",
    "Define dp[r][c] as the best cost to reach (r, c). In what order can you fill it?",
    "Row by row, left to right, because both dependencies are already done. Handle row 0 and column 0 separately, or pad with infinity.",
  ],
  brute: [
    "Enumerate every right/down path: C(R + C − 2, R − 1) paths, about 10¹¹⁸ for a 200 × 200 grid.",
    "Each path is a sequence of choices, but the best way to finish from a cell does not depend on how you got there. There are only R × C cells, so solving each once gives O(R × C).",
  ],
  invariant: "When cell (r, c) is filled, dp[r][c] is the smallest sum of any right/down path from (0, 0) to (r, c), including both ends.",
  traps: [
    "Greedy, stepping to the cheaper neighbour each time: on [[1, 1, 9], [5, 9, 9], [1, 1, 1]] it steps right onto the 1 and then must cross a 9, totalling 13, while going down first costs 1 + 5 + 1 + 1 + 1 = 9.",
    "Forgetting the first row and column have one way in: using min(above, left) with a missing neighbour treated as 0 makes them too cheap. Treat missing neighbours as infinity.",
    "Overwriting the grid in place when the caller expects it unchanged: fine on LeetCode, but say so in an interview.",
    "Moving in four directions: then a cell can depend on cells after it in row order and the DP is wrong. That is a shortest path problem.",
  ],
  followUps: [
    "Return the path: keep the full table and walk back from the corner, at each cell choosing the neighbour that achieved the min.",
    "Count paths instead (62, 63 with obstacles): replace min-plus with plus.",
    "Four-direction moves with non-negative costs: Dijkstra on the grid, O(RC log RC).",
    "Two walkers collecting a shared reward (741, Cherry Pickup): walk both at once with state (step, r1, r2).",
    "Very wide grid: roll over the shorter dimension to keep memory O(min(R, C)).",
  ],
  explanation: [
    { h: "What the table means" },
    "dp[r][c] is the cheapest total of a path from the top-left cell to (r, c), counting every cell on the path, (r, c) included. The answer is dp[R − 1][C − 1].",
    { h: "Base cases" },
    "dp[0][0] = grid[0][0]. Cells in the first row can only be reached from the left: dp[0][c] = dp[0][c − 1] + grid[0][c]. Cells in the first column only from above.",
    { h: "Filling one cell" },
    {
      list: [
        "The last move into (r, c) came from above or from the left.",
        "Whatever it was, the path up to that neighbour should be the cheapest one to it, or the whole path could be improved.",
        "So dp[r][c] = grid[r][c] + min(dp[r − 1][c], dp[r][c − 1]).",
      ],
    },
    { code: "dp[r][c] = grid[r][c] + min(dp[r-1][c], dp[r][c-1])     // missing neighbour = infinity\nanswer   = dp[R-1][C-1]" },
    { h: "A worked example: [[1, 3, 1], [1, 5, 1], [4, 2, 1]]" },
    {
      table: {
        head: ["", "c = 0", "c = 1", "c = 2"],
        rows: [
          ["r = 0", 1, 4, 5],
          ["r = 1", 2, 7, 6],
          ["r = 2", 6, 8, "**7**"],
        ],
        caption: "dp[r][c]: the cheapest path sum from the top-left to (r, c). The answer is 7.",
      },
    },
    "dp[1][1] = 5 + min(4, 2) = 7, entering from the left. dp[1][2] = 1 + min(5, 7) = 6, from above. dp[2][2] = 1 + min(6, 8) = 7. Walking back from the corner along the smaller neighbour: 7 ← 6 ← 5 ← 4 ← 1, the path 1 → 3 → 1 → 1 → 1.",
    { h: "Fill order and memory" },
    "Row by row, left to right. One row array suffices: before updating dp[c], it still holds the value from the row above, and dp[c − 1] already holds this row's value. O(R × C) time, O(C) space.",
    { tip: "Signal: a grid with only right and down moves. The moves form a DAG; dp over cells in row order." },
  ],
  analysis: {
    time: "O(R × C)",
    space: "O(C)",
    notes: ["One row is enough because each cell reads only above and left."],
  },
  solution: `class Solution {
public:
    int minPathSum(vector<vector<int>>& grid) {
        int R = grid.size(), C = grid[0].size();
        // dp[c] for the current row: cheapest path sum from (0,0) to (r,c).
        // Before it is updated, dp[c] still holds the row above.
        vector<int> dp(C, INT_MAX);
        dp[0] = 0;                     // so the first cell becomes grid[0][0]
        for (int r = 0; r < R; ++r) {
            for (int c = 0; c < C; ++c) {
                int fromAbove = dp[c];                    // INT_MAX in row 0 except c = 0
                int fromLeft = c > 0 ? dp[c - 1] : INT_MAX;
                // The last move came from above or from the left.
                dp[c] = grid[r][c] + min(fromAbove, fromLeft);
            }
        }
        return dp[C - 1];
    }
};
`,
});
