import { study } from "./leet-light.js";

export const lc213 = study({
  number: 213,
  title: "House Robber II",
  slug: "house-robber-ii",
  difficulty: "M",
  pattern: "F1",
  topic: "F1 · State-machine DP",
  themes: ["Take or skip", "Break the cycle"],
  blurb: "Houses in a circle: the first and last cannot both be robbed, so solve the line twice, once without the first house and once without the last.",
  statement: [
    "As in 198, but the houses form a circle, so the first and last houses are adjacent. Return the most you can rob.",
    "Up to 100 houses.",
  ],
  concepts: [
    "Breaking a cycle by cases: some house is not robbed, so cut there; one of two cuts always suffices.",
    "Reuse of a linear DP (198) on two ranges.",
  ],
  traps: [
    "A single house: both ranges would be empty; return nums[0].",
    "Trying to carry a \"first house taken\" flag through one pass works but is easy to get wrong; two passes is clearer.",
  ],
  followUps: [
    "A circular version of any linear DP: fix the state of one element and solve the line.",
    "337 House Robber III on a tree.",
  ],
  explanation: [
    "In any valid plan, the first and the last house are not both robbed. So either the first house is skipped, and the answer is the line problem on houses 1..n − 1, or the last is skipped, and it is the line problem on 0..n − 2. Take the larger.",
    "Each is a plain 198 pass.",
    { tip: "Signal: a linear DP, but on a circle. Fix one element's choice to break the cycle, and run the line DP once per case." },
  ],
  analysis: { time: "O(n)", space: "O(1)" },
  solution: `class Solution {
    // Problem 198 on nums[lo..hi], inclusive.
    int robLine(const vector<int>& nums, int lo, int hi) {
        int prev2 = 0, prev1 = 0;
        for (int i = lo; i <= hi; ++i) {
            int cur = max(prev1, prev2 + nums[i]);  // skip house i, or rob it
            prev2 = prev1;
            prev1 = cur;
        }
        return prev1;
    }

public:
    int rob(vector<int>& nums) {
        int n = nums.size();
        if (n == 1) return nums[0];  // both cuts below would be empty
        // First and last are neighbours, so at least one is skipped:
        // drop the last house, or drop the first.
        return max(robLine(nums, 0, n - 2), robLine(nums, 1, n - 1));
    }
};
`,
});
