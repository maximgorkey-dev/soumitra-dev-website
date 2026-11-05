import { study } from "./leet-light.js";

export const lc174 = study({
  number: 174,
  title: "Dungeon Game",
  slug: "dungeon-game",
  difficulty: "H",
  pattern: "F8",
  topic: "F8 · Grid and DAG DP",
  see: 64,
  themes: ["DP run backwards", "Minimum requirement", "Clamp at 1"],
  blurb: "Forward DP fails because the best path so far is not the safest to continue. Run it from the princess backwards: need[r][c] is the least health on entering (r, c) that still survives to the end, max(1, min(need below, need right) − dungeon[r][c]).",
  statement: [
    "A knight starts at the top-left of a grid and must reach the princess at the bottom-right, moving only right or down. Each cell changes his health by its value (negative is damage, positive heals); the first and last cells count too. If his health drops to 0 or below at any point he dies.",
    "Return the minimum starting health that lets him reach the princess. Up to 200 × 200. Example: [[−2, −3, 3], [−5, −10, 1], [10, 30, −5]] gives 7 (path right, right, down, down).",
  ],
  concepts: [
    "Why forward DP fails: two quantities matter going forward (current health and the lowest point so far), and neither alone decides which path is better.",
    "Backward DP: from a cell onward, the only question is \"what is the least health I need on entering here\". That is one number, and it depends only on the cells after it.",
    "Clamping at 1: health must stay at least 1 at every moment, so a big heal cannot bank negative need; need = max(1, …).",
    "Grid DAG order reversed: fill from the bottom-right corner up and left.",
    "Binary search alternative: guess the starting health and check with a forward max-health DP; O(RC log H). Correct, but the backward DP is cleaner.",
  ],
  hints: [
    "Try a forward DP on \"most health remaining\". Find a grid where the path with more health at some cell is still the wrong one.",
    "The minimum health along the path matters, not only the final health. Instead of looking forward from the start, ask what is needed at each cell to finish.",
    "At the princess's cell, what health must you enter with?",
    "From any cell you go right or down, so choose the cheaper requirement, subtract this cell's effect, and never let it drop below 1.",
  ],
  brute: [
    "Enumerate every right/down path and, for each, compute the minimum starting health it needs; take the smallest. The number of paths is exponential (about 10¹¹⁸ for 200 × 200).",
    "A forward DP storing one number per cell cannot work, because which path into a cell is better depends on what comes after. Backwards, the requirement to finish from a cell is a single number, so the R × C table is enough.",
  ],
  invariant: "need[r][c] is the minimum health the knight must have when entering cell (r, c), before its effect is applied, to reach the princess alive from there.",
  traps: [
    "Forward DP on remaining health: it can prefer a path that ends richer but dipped lower in between, and dies in the dip.",
    "Forgetting the clamp: a cell with +30 would make the need negative, which would let the knight enter with 0 or less health. need is never below 1.",
    "Using max instead of min over the next cells: the knight chooses the easier way forward, so take the smaller requirement.",
    "Forgetting that the princess's own cell can hurt: need at the corner is max(1, 1 − dungeon[R − 1][C − 1]).",
    "Padding the outside with 0 instead of infinity: then cells on the edge think they can walk off the grid.",
  ],
  followUps: [
    "Return the path: keep the table and walk forward from (0, 0), always moving to the neighbour with the smaller need.",
    "Four-direction moves: the requirement is no longer a DAG DP; binary search the starting health and run BFS or Dijkstra on max health.",
    "Maximum health cap (healing beyond H is lost): the backward DP no longer suffices directly; binary search plus a forward simulation with the cap.",
    "Two walkers or two trips (741): different structure, forward with a shared step count.",
  ],
  explanation: [
    { h: "Why go backwards" },
    "Going forward, a cell can be reached with lots of health along a dangerous route, or less health along a safe one, and which is better depends on the rest of the path. Going backward, the future is all that is left, and the future asks one question: how much health do I need when I walk into this cell?",
    { h: "What the table means" },
    "need[r][c] is the least health on entering (r, c), before applying its value, that lets the knight survive every remaining cell and reach the princess. The answer is need[0][0].",
    { h: "Base case" },
    "At the princess's cell he must end with at least 1 after its effect: need = max(1, 1 − dungeon[R − 1][C − 1]). Cells outside the grid count as infinite need so they are never chosen.",
    { h: "Filling one cell" },
    {
      list: [
        "After this cell he moves right or down and picks the easier one: next = min(need below, need right).",
        "He must have at least next after this cell's effect, so on entry he needs next − dungeon[r][c].",
        "He must also be alive right after this cell, at least 1, so take max(1, next − dungeon[r][c]).",
      ],
    },
    { code: "need[r][c] = max(1, min(need[r+1][c], need[r][c+1]) - dungeon[r][c])\n             (outside the grid = infinity, except the corner's base case)\nanswer     = need[0][0]" },
    { h: "A worked example: [[−2, −3, 3], [−5, −10, 1], [10, 30, −5]]" },
    {
      table: {
        head: ["", "c = 0", "c = 1", "c = 2"],
        rows: [
          ["r = 0", "**7**", 5, 2],
          ["r = 1", 6, 11, 5],
          ["r = 2", 1, 1, 6],
        ],
        caption: "need[r][c]: least health on entering (r, c) that survives to the princess. Filled from the bottom-right corner. The answer is 7.",
      },
    },
    "The corner holds −5, so he must enter with 6. Cell (2, 1) has +30: 6 − 30 is negative, so its need clamps to 1. Cell (1, 1) has −10 and its easier next step is down (need 1), so it needs 1 + 10 = 11. At the start, −2 with the easier step right (need 5) gives 7: enter with 7, drop to 5, then 2, heal to 5, then 6, then 1 at the princess.",
    { h: "Fill order and memory" },
    "From the last row up, each row right to left. One row array suffices. O(R × C) time, O(C) space.",
    { tip: "Signal: a minimum starting resource that must stay positive along the way. Compute the requirement backwards from the goal and clamp it." },
  ],
  analysis: {
    time: "O(R × C)",
    space: "O(C)",
    notes: ["The backward direction is the whole insight."],
  },
  solution: `class Solution {
public:
    int calculateMinimumHP(vector<vector<int>>& dungeon) {
        int R = dungeon.size(), C = dungeon[0].size();
        // need[c] for the current row: least health on ENTERING (r, c) that
        // survives to the princess. Index C is outside the grid.
        vector<int> need(C + 1, INT_MAX);
        for (int r = R - 1; r >= 0; --r) {
            for (int c = C - 1; c >= 0; --c) {
                int next;
                if (r == R - 1 && c == C - 1)
                    next = 1;                                 // must end alive
                else
                    next = min(need[c], need[c + 1]);         // below, right
                // Enter with enough to have 'next' afterwards, and never
                // drop below 1 inside this cell.
                need[c] = max(1, next - dungeon[r][c]);
            }
        }
        return need[0];
    }
};
`,
});
