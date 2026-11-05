import { study } from "./leet-light.js";

export const lc213 = study({
  number: 213,
  title: "House Robber II",
  slug: "house-robber-ii",
  difficulty: "M",
  pattern: "F1",
  topic: "F1 · State-machine DP",
  see: 198,
  themes: ["Breaking a cycle", "Take or skip", "Case split"],
  blurb: "In a circle the first and last houses are neighbours, so at least one of them is skipped. Run the straight-line House Robber twice, once without the last house and once without the first, and take the better.",
  statement: [
    "Houses stand in a circle and house i holds nums[i] ≥ 0 money. No two adjacent houses may both be robbed, and house 0 is adjacent to house n − 1.",
    "Return the largest total. Up to 100 houses. Example: [2, 7, 9, 3, 1] gives 11 (houses 0 and 2, or 1 and 3); 2 + 9 + 1 = 12 is no longer allowed because houses 0 and 4 touch.",
  ],
  concepts: [
    "Breaking a cycle by cases: a constraint that wraps around is removed by fixing a decision on one element and solving a line for each case.",
    "The case split must cover every valid plan: every plan skips house 0 or skips house n − 1 (or both), so the two lines together miss nothing.",
    "Reusing the line solution (198): best[i] = max(best[i − 1], best[i − 2] + nums[i]) over a subarray.",
    "Overlap is harmless for a maximum: a plan skipping both ends is counted in both runs, which does not change the max.",
  ],
  hints: [
    "Solve the straight-line version first. What is the only new constraint the circle adds?",
    "Houses 0 and n − 1 cannot both be robbed. So in any valid plan, at least one of them is left alone.",
    "If house n − 1 is left alone, the problem is a line over houses 0..n − 2. If house 0 is left alone, a line over 1..n − 1.",
    "Mind n = 1: both subarrays are empty, but the single house can be robbed.",
  ],
  brute: [
    "Try every subset with no two adjacent around the circle: still about 1.618ⁿ subsets, around 10²⁰ for n = 100.",
    "Adding a \"was house 0 robbed?\" flag to the line DP also works, but the cleaner observation is that the flag only matters at the last house, so splitting into two independent line problems is the same thing with less bookkeeping.",
  ],
  invariant: "The answer is max(line(0..n − 2), line(1..n − 1)), because every valid circular plan is a valid line plan in at least one of those ranges, and every line plan in either range is a valid circular plan.",
  traps: [
    "Returning 0 for n = 1: both ranges are empty, but the answer is nums[0]. Special-case it.",
    "Running the line DP on the whole array and then subtracting something when both ends were taken: there is no simple correction, because removing an end may change the best choice for its neighbours too.",
    "Splitting into \"rob house 0\" and \"do not rob house 0\" but forgetting that robbing house 0 also forbids house n − 1 and house 1. The skip-an-end split avoids that.",
    "Copying the subarrays (O(n) extra each): pass index bounds to the helper instead.",
  ],
  followUps: [
    "Why the split is complete: if a plan robs house 0, it cannot rob house n − 1, so it lives in range 0..n − 2. Otherwise it skips house 0 and lives in range 1..n − 1.",
    "Houses on a tree (337): no cycle there, a take/skip pair per node computed bottom-up.",
    "A general cycle trick: for any circular DP, fix the state of one element (here, an endpoint), solve the line, and combine over the few possible fixed states.",
    "Return the houses: run the reconstruction from 198 on whichever range won, then offset the indices.",
    "Circle with a gap of k (no two robbed within k houses): fix which of the first k houses is the first robbed, or split on the first and last k − 1 houses.",
  ],
  explanation: [
    { h: "Why the circle is the only difficulty" },
    "Inside the row, the rule is exactly 198's. The only extra pair of neighbours is (0, n − 1). A line DP has no way to know, when it reaches the last house, whether house 0 was robbed, unless we tell it.",
    { h: "Splitting into two lines" },
    {
      list: [
        "Case A, house n − 1 is not robbed: then the wrap-around pair is safe, and the rest is a line over houses 0..n − 2.",
        "Case B, house 0 is not robbed: a line over houses 1..n − 1.",
      ],
    },
    "Every valid plan falls into case A or case B (plans skipping both ends fall into both). Every plan from either line is valid around the circle, because its range excludes one of the two endpoints. So the answer is the larger of the two lines.",
    { code: "if n == 1: return nums[0]\nanswer = max(line(0, n - 2), line(1, n - 1))\nline(lo, hi): best[i] = max(best[i - 1], best[i - 2] + nums[i]) for i in lo..hi" },
    { h: "A worked example: [2, 7, 9, 3, 1]" },
    {
      table: {
        head: ["range", "houses", "best after each house", "result"],
        rows: [
          ["A: without the last", "[2, 7, 9, 3]", "2, 7, 11, 11", "**11**"],
          ["B: without the first", "[7, 9, 3, 1]", "7, 9, 10, 10", 10],
        ],
        caption: "The straight-line DP from 198 on each range. The answer is max(11, 10) = 11.",
      },
    },
    "Range A reaches 11 with houses 0 and 2 (2 + 9). Range B tops out at 10 with houses 2 and 4 (9 + 1) or 1 and 3 (7 + 3). The plan 2 + 9 + 1 = 12 from 198 needs both ends, which neither range allows.",
    { h: "Fill order and memory" },
    "Two left-to-right passes with two rolling variables each: O(n) time, O(1) space.",
    { tip: "Signal: a line problem bent into a circle. Fix one endpoint's choice, solve the line for each case, combine." },
  ],
  analysis: {
    time: "O(n)",
    space: "O(1)",
    notes: ["Two passes of the 198 recurrence over index ranges, no copies."],
  },
  solution: `class Solution {
    // House Robber on the straight line nums[lo..hi] (inclusive).
    int line(const vector<int>& nums, int lo, int hi) {
        int prev2 = 0, prev1 = 0;   // best up to i-2, best up to i-1
        for (int i = lo; i <= hi; ++i) {
            int cur = max(prev1, prev2 + nums[i]);   // skip i, or rob i
            prev2 = prev1;
            prev1 = cur;
        }
        return prev1;
    }

public:
    int rob(vector<int>& nums) {
        int n = nums.size();
        // One house: both ranges below would be empty, but it can be robbed.
        if (n == 1) return nums[0];
        // Houses 0 and n-1 are neighbours, so at least one is skipped:
        //   case A skips the last house, case B skips the first.
        return max(line(nums, 0, n - 2), line(nums, 1, n - 1));
    }
};
`,
});
