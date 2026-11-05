import { study } from "./leet-light.js";

export const lc198 = study({
  number: 198,
  title: "House Robber",
  slug: "house-robber",
  difficulty: "M",
  pattern: "F1",
  topic: "F1 · State-machine DP",
  themes: ["Take or skip", "Two states", "No two adjacent"],
  blurb: "Walk the houses left to right keeping two numbers: the best total if this house is robbed, and the best if it is not. Robbing needs the previous house skipped; skipping takes the better of both.",
  statement: [
    "Houses stand in a row and house i holds nums[i] ≥ 0 money. Robbing two adjacent houses triggers an alarm, so no two chosen houses may be neighbours.",
    "Return the largest total you can rob. Up to 100 houses. Example: [2, 7, 9, 3, 1] gives 12 (houses 0, 2 and 4: 2 + 9 + 1).",
  ],
  concepts: [
    "Take-or-skip decisions: each house is either in the plan or not, and the only rule links a house to its immediate neighbour.",
    "State-machine DP: the state after house i is just \"was house i robbed?\". That single bit is all the future needs to know.",
    "Best value per state: among all plans that end in the same state, only the largest total can matter later.",
    "Folding states: the two states collapse into one recurrence, best[i] = max(best[i − 1], best[i − 2] + nums[i]).",
    "Rolling variables: each step reads only the previous one or two values, so O(1) space.",
  ],
  hints: [
    "Look at the last house. Either it is robbed or it is not. What does each case say about the rest?",
    "If it is not robbed, the answer is the best for the first n − 1 houses. If it is robbed, house n − 2 must be skipped.",
    "So define best[i] as the most you can rob from houses 0..i, and write best[i] from best[i − 1] and best[i − 2].",
    "You only ever look two steps back. Replace the array with two variables.",
  ],
  brute: [
    "Try every subset of houses with no two adjacent and keep the best sum. The number of such subsets grows like the Fibonacci numbers, about 1.618ⁿ; for n = 100 that is around 10²⁰ subsets.",
    "The recursive form, rob(i) = max(rob(i + 1), nums[i] + rob(i + 2)), has the same blow-up because rob(i + 2) is reached both directly and via rob(i + 1). There are only n distinct calls, so remembering each answer once turns 1.618ⁿ into n.",
  ],
  invariant: "After processing house i, take is the best total of any valid plan over houses 0..i that robs house i, and skip is the best total of any valid plan over houses 0..i that does not.",
  traps: [
    "Alternating greedy (all even positions or all odd positions): [2, 1, 1, 2] is best as 2 + 2 using positions 0 and 3, which are neither both even nor both odd.",
    "Greedy by largest value first: [2, 3, 2] picks 3 and loses to 2 + 2 = 4. A big house can block two medium ones.",
    "Special-casing one or two houses with array indexing (best[1] = max(nums[0], nums[1])) and then crashing when n = 1. Starting both rolling values at 0 handles every n with no special case.",
    "Overwriting prev1 before using it to compute the new value. Compute cur first, then shift.",
  ],
  followUps: [
    "Houses in a circle, so the first and last are neighbours (213): run this twice, once without the last house and once without the first, and take the better.",
    "Houses on a binary tree, parent and child may not both be robbed (337): the same take/skip pair, computed bottom-up for each node.",
    "Return which houses to rob: keep the full best array, then walk back from the end. If best[i] == best[i − 1], house i was skipped; otherwise it was robbed and jump to i − 2.",
    "At least k houses apart instead of 2: best[i] = max(best[i − 1], best[i − k] + nums[i]).",
    "Negative values allowed: the recurrence still works, since skipping a house is always an option.",
    "Delete and Earn (740) reduces to this: bucket the values, then values v and v + 1 are adjacent houses.",
  ],
  explanation: [
    { h: "The states" },
    "After deciding house i there are only two situations that matter for the future: house i was robbed (so house i + 1 is off limits), or it was not (so house i + 1 is free). For each, keep the best total so far: take and skip.",
    "Two different plans that both skip house i have exactly the same options for houses i + 1 onwards. So only the richer of them can ever be part of an optimal answer, and one number per state is enough.",
    { h: "Start" },
    "Before the first house nothing is robbed: skip = 0. take does not exist yet; treating it as 0 is safe because the first house's take reads only skip.",
    { h: "One house's transitions" },
    {
      list: [
        "To rob house i, house i − 1 must have been skipped: take_new = skip + nums[i].",
        "To skip house i, house i − 1 may be either: skip_new = max(take, skip).",
      ],
    },
    { code: "take_new = skip + nums[i]          // rob it: the previous must be skipped\nskip_new = max(take, skip)          // leave it: the previous is free\nanswer   = max(take, skip) after the last house" },
    "Folding: max(take, skip) after house i is just best[i], and skip after house i is best[i − 1]. Substituting gives best[i] = max(best[i − 1], best[i − 2] + nums[i]), which is what the solution code uses.",
    { h: "A worked example: [2, 7, 9, 3, 1]" },
    {
      table: {
        head: ["house", "nums", "skip (not robbed)", "take (robbed)", "best so far"],
        rows: [
          [0, 2, 0, 2, 2],
          [1, 7, 2, 7, 7],
          [2, 9, 7, 11, 11],
          [3, 3, 11, 10, 11],
          [4, 1, 11, "**12**", "**12**"],
        ],
        caption: "take = previous skip + nums[i]; skip = previous best. The answer is the last best, 12.",
      },
    },
    "House 2: take = 2 + 9 = 11 uses the skip of house 1, which is 2, the best total that leaves house 1 alone (rob house 0 only). House 3: take is only 7 + 3 = 10, worse than skipping it with 11 in hand. House 4: take = 11 + 1 = 12 extends the plan {0, 2}.",
    "Reconstructing: best rose at house 4 through take, so house 4 is robbed; jump to house 2, where best rose through take again; jump to house 0. Plan {0, 2, 4}.",
    { h: "Fill order and memory" },
    "Each house reads only the previous house's two values, so a left-to-right pass with two variables suffices: O(n) time, O(1) space.",
    { tip: "Signal: choose a subset where neighbours conflict. The state is whether the last item was taken." },
  ],
  analysis: {
    time: "O(n)",
    space: "O(1)",
    notes: ["Keep the full best array only if you need to reconstruct the chosen houses."],
  },
  solution: `class Solution {
public:
    int rob(vector<int>& nums) {
        // prev2 = best total over houses 0..i-2, prev1 = best over houses 0..i-1.
        // Both start at 0 (no houses yet), which also handles n = 1 and n = 2.
        int prev2 = 0, prev1 = 0;
        for (int x : nums) {
            // Skip this house: keep prev1.
            // Rob it: house i-1 must be skipped, so add x to the best up to i-2.
            int cur = max(prev1, prev2 + x);
            prev2 = prev1;   // shift the window by one house
            prev1 = cur;
        }
        return prev1;
    }
};

// The same thing with explicit states:
//   int take = 0, skip = 0;
//   for (int x : nums) {
//       int t = skip + x;            // rob: previous skipped
//       skip = max(take, skip);      // leave: previous either way
//       take = t;
//   }
//   return max(take, skip);
`,
});
