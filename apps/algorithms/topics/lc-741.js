import { study } from "./leet-light.js";

export const lc741 = study({
  number: 741,
  title: "Cherry Pickup",
  slug: "cherry-pickup",
  difficulty: "H",
  pattern: "F8",
  topic: "F8 · Grid and DAG DP",
  see: 64,
  themes: ["Two walkers at once", "Shared step count", "Greedy fails"],
  blurb: "A round trip equals two walkers going from the start to the end together. After t steps both lie on the anti-diagonal r + c = t, so the state is (t, r1, r2). Each step, both move right or down, collecting cherries, once if they share a cell.",
  statement: [
    "An n × n grid has 1 (a cherry), 0 (empty) or −1 (a thorn, impassable). Walk from (0, 0) to (n − 1, n − 1) moving right or down, then back to (0, 0) moving left or up, picking every cherry you pass (a picked cell becomes empty).",
    "Return the most cherries collected, or 0 if there is no valid path. n ≤ 50. Example: [[0, 1, −1], [1, 0, −1], [1, 1, 1]] gives 5.",
  ],
  concepts: [
    "Reversing the return trip: a path back from the end to the start, reversed, is just another right/down path from the start. So the round trip is two forward paths.",
    "Walking both at once: if both walkers take one step at a time, after t steps each is on the anti-diagonal r + c = t. Their positions are given by (r1, r2), and a shared cell is detected as r1 = r2.",
    "Why not two separate passes: the greedy of taking the best path, clearing it and taking the best again can lose; the two paths must be chosen jointly.",
    "State (t, r1, r2) with four transitions (each walker came from above or from the left): O(n³) states and time.",
    "Symmetry: swapping the two walkers changes nothing, so r1 ≤ r2 is enough.",
  ],
  hints: [
    "Try the greedy: best path there, remove its cherries, best path back. Find a grid where it loses.",
    "Turn the return trip around. What does it become?",
    "Now there are two right/down paths. If you move them in lockstep, what do their positions have in common after t steps?",
    "Both satisfy r + c = t, so (t, r1, r2) describes both. When do they stand on the same cell, and how should cherries be counted then?",
  ],
  brute: [
    "Enumerate pairs of right/down paths: the number of paths is C(2n − 2, n − 1), about 10²⁸ for n = 50, and pairs square that.",
    "Moving the two walkers in lockstep collapses all path pairs to positions on one anti-diagonal. Two pairs that reach the same (t, r1, r2) have the same future, so only the best total matters: n × n × 2n ≈ 2.5 × 10⁵ states, each with four predecessors.",
  ],
  invariant: "dp[r1][r2] after step t is the most cherries two walkers can collect moving right/down from (0, 0) to (r1, t − r1) and (r2, t − r2), counting a shared cell once, or −∞ if either position is unreachable.",
  traps: [
    "Two greedy passes: [[1, 1, 1, 1, 0, 0, 0], [0, 0, 0, 1, 0, 0, 0], [0, 0, 0, 1, 0, 0, 1], [1, 0, 0, 1, 0, 0, 0], [0, 0, 0, 1, 0, 0, 0], [0, 0, 0, 1, 0, 0, 0], [0, 0, 0, 1, 1, 1, 1]] is a known case where the best first path strands cherries the second cannot reach together.",
    "Counting a shared cell twice: when r1 = r2 (so c1 = c2), add the cell once.",
    "Returning a negative number when no path exists: the answer is 0 then.",
    "Starting unreachable states at 0: a state behind a thorn would look valid. Use −∞.",
    "Independent positions without the shared step: four free coordinates is O(n⁴) states and makes shared-cell detection awkward.",
  ],
  followUps: [
    "Cherry Pickup II (1463): two robots start at the top corners and move down one row per step; the state is (row, c1, c2), the same idea.",
    "k walkers: state (t, r1, …, rk), O(n^(k+1)); for general k it is a min-cost flow with node capacities (split each cell into in and out with one profitable unit edge).",
    "Return the two paths: keep the argmax predecessor per state and walk back.",
    "Weighted cells instead of 0/1 cherries: same DP, add the weight.",
    "Why it is a DAG: the step count t strictly increases, so states never repeat.",
  ],
  explanation: [
    { h: "Two walkers instead of a round trip" },
    "Reverse the return trip and it is a right/down path from (0, 0) to the corner. Picking a cherry once and finding the cell empty the second time is the same as counting a shared cell once. So the problem is: two right/down paths from start to end, maximise the cherries on their union.",
    { h: "What the state means" },
    "Move both walkers one step at a time. After t steps, walker 1 is at (r1, t − r1) and walker 2 at (r2, t − r2). dp[r1][r2] for step t is the most cherries collected so far by such a pair, counting shared cells once, or −∞ if one of them would stand on a thorn or off the grid. Keep r1 ≤ r2, since the walkers are interchangeable.",
    { h: "Start" },
    "t = 0: both at (0, 0), dp[0][0] = grid[0][0].",
    { h: "One step" },
    {
      list: [
        "Each walker arrived from above (row − 1) or from the left (same row), so there are four predecessor states (r1 or r1 − 1, r2 or r2 − 1) from step t − 1.",
        "Take the best of them; if all are −∞, this state is unreachable.",
        "Add grid at walker 1's cell, plus grid at walker 2's cell if r1 ≠ r2. Skip states where either cell is a thorn.",
      ],
    },
    { code: "dp_t[r1][r2] = max over (a in {r1-1, r1}, b in {r2-1, r2}) of dp_{t-1}[a][b]\n               + grid[r1][t-r1] + (r1 != r2 ? grid[r2][t-r2] : 0)\nanswer = max(0, dp_{2n-2}[n-1][n-1])" },
    { h: "A worked example: [[0, 1, −1], [1, 0, −1], [1, 1, 1]]" },
    {
      table: {
        head: ["step t", "cells on the diagonal", "best states (walker cells → total)"],
        rows: [
          [0, "(0,0)", "both at (0,0) → 0"],
          [1, "(0,1)=1, (1,0)=1", "split: (0,1) and (1,0) → 2"],
          [2, "(0,2) thorn, (1,1)=0, (2,0)=1", "(1,1) and (2,0) → 3"],
          [3, "(1,2) thorn, (2,1)=1", "both at (2,1) → 4"],
          [4, "(2,2)=1", "both at (2,2) → **5**"],
        ],
        caption: "The best pair of walker positions after each step. Thorn cells are never entered. The answer is 5.",
      },
    },
    "At step 1 the walkers split to collect both cherries next to the start. At step 2 the only open cells are (1, 1) and (2, 0); the best state puts one walker on each, picking the cherry at (2, 0) for 3. From step 3 both must share the single open cell, so each later cherry counts once: 4, then 5. As a round trip: go down, down, right, right, then come back up through (1, 1) and (0, 1).",
    { h: "Fill order and memory" },
    "t from 1 to 2n − 2, with a fresh n × n layer per step: O(n³) time, O(n²) space.",
    { tip: "Signal: a round trip or two paths sharing rewards. Move both walkers together on a shared step count; detect shared cells by equal rows." },
  ],
  analysis: {
    time: "O(n³)",
    space: "O(n²)",
    notes: ["About 2n × n² / 2 states with four predecessors each: under a million steps for n = 50."],
  },
  solution: `class Solution {
public:
    int cherryPickup(vector<vector<int>>& grid) {
        int n = grid.size();
        const int NEG = INT_MIN / 2;                 // unreachable
        // dp[r1][r2] (r1 <= r2) after t steps: best cherries for walkers at
        // (r1, t - r1) and (r2, t - r2), shared cells counted once.
        vector<vector<int>> dp(n, vector<int>(n, NEG)), nx;
        dp[0][0] = grid[0][0];

        for (int t = 1; t <= 2 * (n - 1); ++t) {
            nx.assign(n, vector<int>(n, NEG));
            int lo = max(0, t - (n - 1)), hi = min(n - 1, t);   // rows on this diagonal
            for (int r1 = lo; r1 <= hi; ++r1) {
                int c1 = t - r1;
                if (grid[r1][c1] < 0) continue;      // thorn
                for (int r2 = r1; r2 <= hi; ++r2) {
                    int c2 = t - r2;
                    if (grid[r2][c2] < 0) continue;
                    // Each walker came from above (row - 1) or from the left.
                    int best = NEG;
                    for (int a = r1 - 1; a <= r1; ++a)
                        for (int b = r2 - 1; b <= r2; ++b)
                            if (a >= 0 && b >= 0)
                                best = max(best, dp[min(a, b)][max(a, b)]);
                    if (best == NEG) continue;
                    // A shared cell's cherry is picked once.
                    int gain = grid[r1][c1] + (r1 != r2 ? grid[r2][c2] : 0);
                    nx[r1][r2] = best + gain;
                }
            }
            dp.swap(nx);
        }
        return max(0, dp[n - 1][n - 1]);
    }
};
`,
});
