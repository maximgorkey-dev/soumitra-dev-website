import { study } from "./leet-light.js";

export const lc1463 = study({
  number: 1463,
  title: "Cherry Pickup II",
  slug: "cherry-pickup-ii",
  difficulty: "H",
  pattern: "F8",
  topic: "F8 · Grid and DAG DP",
  see: 741,
  themes: ["Two walkers, one row at a time", "State (row, c1, c2)", "Nine transitions"],
  blurb: "Both robots move down exactly one row per step, so the row is the shared clock and the state is (row, c1, c2). From each state both robots choose a column shift of −1, 0 or +1: nine transitions, with a shared cell counted once.",
  statement: [
    "A rows × cols grid holds cherries. Robot 1 starts at (0, 0), robot 2 at (0, cols − 1). Each step, each robot moves to the next row, in the same column or one to the left or right, staying inside the grid. Each cell's cherries are collected once, even if both robots pass it.",
    "Return the most cherries collected when both reach the bottom row. Up to 70 × 70. Example: [[3, 1, 1], [2, 5, 1], [1, 5, 5], [2, 1, 1]] gives 24.",
  ],
  concepts: [
    "A shared clock: both robots are always on the same row, so the row index replaces 741's step count, and (c1, c2) is the rest of the state.",
    "Joint DP, not two passes: running the best path for robot 1 and then robot 2 on what is left can lose, because the first path may take cherries the second needed more.",
    "Nine transitions: each robot shifts by −1, 0 or +1.",
    "Shared cell: when c1 = c2, add the cell once.",
    "Rolling layers: row r reads only row r − 1, so two cols × cols layers suffice.",
  ],
  hints: [
    "Why not route the robots one at a time?",
    "Both robots are always on the same row. What do you need to know to describe them both?",
    "(row, c1, c2). How many ways are there to reach a state from the row above?",
    "Nine. Count the cell once if both stand on it.",
  ],
  brute: [
    "Each robot has up to 3 choices per row, so 9 per row together: 9^(rows − 1), about 10⁶⁶ for 70 rows.",
    "Two pairs of paths that reach the same (row, c1, c2) have the same future. Keeping only the best total per state gives rows × cols² ≈ 3.4 × 10⁵ states with 9 transitions each.",
  ],
  invariant: "dp[c1][c2] after row r is the most cherries collected in rows 0..r with robot 1 at column c1 and robot 2 at column c2 (shared cells counted once), or −∞ if that pair of columns is unreachable.",
  traps: [
    "Two independent greedy paths: robot 1's best path may grab cherries in a column robot 2 could only reach, leaving both worse off than a joint plan.",
    "Counting a shared cell twice when c1 = c2.",
    "Starting every state at 0: columns unreachable from the starting corners in the first rows would look valid. Start at −∞ except (0, cols − 1).",
    "Leaving the grid: check 0 ≤ column < cols for each robot's move.",
  ],
  followUps: [
    "Symmetry: an optimal plan never needs the robots to cross, so you may restrict to c1 ≤ c2, halving the states.",
    "741 (one walker, round trip): reverse the return path to get two walkers with a shared step count.",
    "k robots: cols^k states per row; for larger k, a min-cost flow on a layered graph.",
    "Return the two paths: keep the best predecessor of each state.",
  ],
  explanation: [
    { h: "The state" },
    "Both robots go down one row per step, so after r steps both are on row r. All that matters for the future is their two columns. dp[c1][c2] holds the best total for rows 0..r with robot 1 at column c1 and robot 2 at column c2.",
    { h: "Start" },
    "Row 0: only (0, cols − 1) is reachable, with grid[0][0] + grid[0][cols − 1] (one of them if cols = 1). Every other pair is −∞.",
    { h: "One row down" },
    {
      list: [
        "For each new pair (c1, c2), the robots came from (c1 + d1, c2 + d2) in the row above with d1, d2 ∈ {−1, 0, +1}, staying inside the grid.",
        "Take the best of those nine states.",
        "Add grid[r][c1] + grid[r][c2], or just grid[r][c1] if c1 = c2.",
      ],
    },
    { code: "dp_r[c1][c2] = max over d1, d2 in {-1, 0, 1} of dp_{r-1}[c1+d1][c2+d2]\n               + grid[r][c1] + (c1 != c2 ? grid[r][c2] : 0)\nanswer = max over all (c1, c2) in the last row" },
    { h: "A worked example: [[3, 1, 1], [2, 5, 1], [1, 5, 5], [2, 1, 1]]" },
    {
      table: {
        head: ["row", "cells", "best pair (c1, c2)", "best total", "how"],
        rows: [
          [0, "3, 1, 1", "(0, 2)", 4, "3 + 1 at the start corners"],
          [1, "2, 5, 1", "(0, 1)", 11, "4 + 2 + 5"],
          [2, "1, 5, 5", "(1, 2)", 21, "11 + 5 + 5"],
          [3, "2, 1, 1", "(0, 1) or (0, 2)", "**24**", "21 + 2 + 1"],
        ],
        caption: "The best state per row (other states exist but are worse). The answer is 24.",
      },
    },
    "On row 1, the pair (1, 1) would put both robots on the 5 and collect it only once: 4 + 5 = 9, worse than splitting onto 2 and 5 for 11. On row 2 they split onto the two 5s. Every row's best state is reachable from the previous best because each robot moves at most one column.",
    { h: "Fill order and memory" },
    "Row by row with two layers of cols × cols: O(rows × cols² × 9) time, O(cols²) space.",
    { tip: "Signal: two agents moving in lockstep and sharing rewards. Put both positions in the state, with the shared clock as the outer loop." },
  ],
  analysis: {
    time: "O(rows × cols² × 9)",
    space: "O(cols²)",
    notes: ["About 3 × 10⁶ steps for a 70 × 70 grid."],
  },
  solution: `class Solution {
public:
    int cherryPickup(vector<vector<int>>& grid) {
        int R = grid.size(), C = grid[0].size();
        const int NEG = INT_MIN / 2;
        // dp[c1][c2]: best total so far with robot 1 in column c1 and robot 2
        // in column c2 on the current row (shared cells counted once).
        vector<vector<int>> dp(C, vector<int>(C, NEG)), nx;
        dp[0][C - 1] = grid[0][0] + (C > 1 ? grid[0][C - 1] : 0);

        for (int r = 1; r < R; ++r) {
            nx.assign(C, vector<int>(C, NEG));
            for (int c1 = 0; c1 < C; ++c1)
                for (int c2 = 0; c2 < C; ++c2) {
                    // Both robots came from the row above, each shifted by
                    // -1, 0 or +1 columns: nine predecessor states.
                    int best = NEG;
                    for (int d1 = -1; d1 <= 1; ++d1)
                        for (int d2 = -1; d2 <= 1; ++d2) {
                            int p1 = c1 + d1, p2 = c2 + d2;
                            if (p1 >= 0 && p1 < C && p2 >= 0 && p2 < C)
                                best = max(best, dp[p1][p2]);
                        }
                    if (best == NEG) continue;              // unreachable
                    int gain = grid[r][c1] + (c1 != c2 ? grid[r][c2] : 0);
                    nx[c1][c2] = best + gain;
                }
            dp.swap(nx);
        }

        int answer = 0;
        for (auto& row : dp)
            for (int v : row) answer = max(answer, v);
        return answer;
    }
};
`,
});
