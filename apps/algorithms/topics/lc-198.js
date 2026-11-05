import { study } from "./leet-light.js";

export const lc198 = study({
  number: 198,
  title: "House Robber",
  slug: "house-robber",
  difficulty: "M",
  pattern: "F1",
  topic: "F1 · State-machine DP",
  themes: ["Take or skip", "Two states"],
  blurb: "Two states per house: robbed it, or did not. Robbing requires the previous house skipped; skipping takes the best of either.",
  statement: [
    "Houses in a row hold nums[i] money. You cannot rob two adjacent houses. Return the most you can rob.",
    "Up to 100 houses.",
  ],
  concepts: [
    "State-machine DP: the state is whether the last house was taken.",
    "Equivalent one-line recurrence: best[i] = max(best[i − 1], best[i − 2] + nums[i]).",
    "Rolling variables: only the last two values matter.",
  ],
  traps: [
    "Greedy on even or odd positions: [2, 1, 1, 2] takes the two ends.",
    "Off-by-one with one or two houses.",
  ],
  followUps: [
    "Houses in a circle: 213.",
    "Houses on a tree: 337.",
    "Return which houses to rob.",
  ],
  explanation: [
    "After house i, keep take (best total if house i is robbed) and skip (best if it is not). take = skip_prev + nums[i], because the previous house must be skipped; skip = max(take_prev, skip_prev).",
    "Folded together, this is best[i] = max(best[i − 1], best[i − 2] + nums[i]): either skip house i, or rob it and add the best up to i − 2.",
    { tip: "Signal: choose elements with no two adjacent. A take/skip pair of states." },
  ],
  analysis: { time: "O(n)", space: "O(1)" },
  solution: `class Solution {
public:
    int rob(vector<int>& nums) {
        // prev2: best total up to house i-2; prev1: best total up to house i-1.
        int prev2 = 0, prev1 = 0;
        for (int x : nums) {
            // Either skip this house (keep prev1), or rob it (prev2 + x),
            // which requires that house i-1 was not robbed.
            int cur = max(prev1, prev2 + x);
            prev2 = prev1;
            prev1 = cur;
        }
        return prev1;
    }
};
`,
});
