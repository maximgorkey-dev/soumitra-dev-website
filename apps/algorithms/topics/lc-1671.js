import { study } from "./leet-light.js";

export const lc1671 = study({
  number: 1671,
  title: "Minimum Number of Removals to Make Mountain Array",
  slug: "minimum-number-of-removals-to-make-mountain-array",
  difficulty: "H",
  pattern: "F7",
  topic: "F7 · DP sped up with a data structure (the LIS family)",
  see: 300,
  themes: ["LIS from both sides", "Fix the peak", "Fewest removals = longest kept"],
  blurb: "Fewest removals means longest kept mountain. Fix the peak i: the left side is an increasing subsequence ending at i and the right side a decreasing one starting at i. Compute both lengths for every i with LIS, and require each side to have at least one other element.",
  statement: [
    "A mountain array has length at least 3 and a peak index i (not at either end) with strictly increasing values up to i and strictly decreasing values after it. Return the fewest elements to remove from nums to make it a mountain; it is guaranteed possible.",
    "Up to 1000 elements. Example: [2, 1, 1, 5, 6, 2, 3, 1] gives 3 (keep, for instance, 1, 5, 6, 3, 1).",
  ],
  concepts: [
    "Complement: removing the fewest elements is keeping the longest mountain subsequence.",
    "Fixing the split point: once the peak index is fixed, the left and right halves are independent problems.",
    "LIS ending at each index: up[i] from a left-to-right pass; with tails and lower_bound, up[i] is the slot where nums[i] lands, plus one.",
    "LDS starting at each index: the same pass run right to left (an increasing subsequence read backwards).",
    "Validity of the peak: both sides must be non-trivial, up[i] ≥ 2 and down[i] ≥ 2, or it is not a mountain.",
  ],
  hints: [
    "Turn \"fewest removed\" into \"longest kept\". What does a kept mountain look like?",
    "It has a peak. Suppose you fix the peak at index i. What is the best left part, and the best right part?",
    "The longest increasing subsequence ending at i, and the longest decreasing subsequence starting at i. Compute both for every i.",
    "The peak is counted in both, and neither side may be just the peak.",
  ],
  brute: [
    "Try every subset of elements to keep and check whether it is a mountain: 2ⁿ.",
    "Fixing each peak and running a fresh LIS on each side is O(n² log n) or O(n³) with the quadratic LIS. But the LIS ending at i, for every i at once, falls out of a single pass, and so does the reverse one. Two passes give everything: O(n log n).",
  ],
  invariant: "up[i] is the length of the longest strictly increasing subsequence of nums[0..i] that ends at index i; down[i] is the length of the longest strictly decreasing subsequence of nums[i..n − 1] that starts at index i.",
  traps: [
    "Allowing a peak with up[i] = 1 or down[i] = 1: that is a purely decreasing or increasing array, not a mountain. [1, 2, 3] has up[2] = 3 but down[2] = 1.",
    "Counting the peak twice: the kept length is up[i] + down[i] − 1.",
    "Using the final length of tails as up[i]: up[i] is the position where nums[i] lands in tails at that moment, plus one, not the current length.",
    "Non-strict comparisons: the mountain needs strict increase and decrease, so equal values cannot sit next to each other. Use lower_bound.",
  ],
  followUps: [
    "Why lower_bound's position gives up[i]: after placing nums[i] at slot k, there is an increasing subsequence of length k + 1 ending exactly with nums[i], and none longer, because tails[k] was the smallest possible ending for length k + 1.",
    "Return the kept mountain: keep parent links in both passes and splice them at the best peak.",
    "Longest bitonic subsequence (increase then decrease, sides may be empty): the same without the ≥ 2 checks.",
    "Contiguous mountain (845, Longest Mountain in Array): a single pass with up and down run lengths, O(n), no LIS.",
    "Minimum removals to make the array strictly increasing: n − LIS.",
  ],
  explanation: [
    { h: "Longest kept mountain" },
    "Removing the fewest elements is the same as keeping the longest subsequence that is a mountain. Fix the peak at index i. The kept part to its left must be strictly increasing and end at i; the kept part to its right must be strictly decreasing and start at i. The two sides do not interact, so take the longest of each.",
    { h: "What the arrays mean" },
    "up[i] is the length of the longest strictly increasing subsequence ending at index i. down[i] is the length of the longest strictly decreasing subsequence starting at i. Both include nums[i] itself.",
    { h: "Computing them" },
    {
      list: [
        "Left to right with the tails array from 300. When nums[i] lands at slot k (by lower_bound), up[i] = k + 1.",
        "Right to left with a fresh tails array. A decreasing subsequence starting at i, read backwards, is increasing and ends at i, so down[i] is the slot plus one in this reverse pass.",
        "For each i with up[i] ≥ 2 and down[i] ≥ 2, the mountain peaking at i keeps up[i] + down[i] − 1 elements.",
      ],
    },
    { code: "up[i]   = 1 + slot of nums[i] in tails, scanning left to right\ndown[i] = 1 + slot of nums[i] in tails, scanning right to left\nkeep    = max over i with up[i] >= 2 and down[i] >= 2 of up[i] + down[i] - 1\nanswer  = n - keep" },
    { h: "A worked example: [2, 1, 1, 5, 6, 2, 3, 1]" },
    {
      table: {
        head: ["i", "nums", "up (increasing, ends here)", "down (decreasing, starts here)", "mountain kept"],
        rows: [
          [0, 2, 1, 2, "no (up = 1)"],
          [1, 1, 1, 1, "no"],
          [2, 1, 1, 1, "no"],
          [3, 5, 2, 3, 4],
          [4, 6, 3, 3, "**5**"],
          [5, 2, 2, 2, 3],
          [6, 3, 3, 2, 4],
          [7, 1, 1, 1, "no"],
        ],
        caption: "The best peak is index 4 (value 6), keeping 3 + 3 − 1 = 5 elements, so the answer is 8 − 5 = 3.",
      },
    },
    "At the peak 6: up = 3 from 1, 5, 6 (or 2, 5, 6), and down = 3 from 6, 3, 1 (or 6, 2, 1). The peak is counted once, so the mountain 1, 5, 6, 3, 1 has 5 elements, and 3 are removed. Index 0 cannot be a peak: nothing smaller comes before it.",
    { h: "Cost" },
    "Two LIS passes with binary search: O(n log n) time, O(n) space. The O(n²) versions of the passes are fine for n = 1000 too.",
    { tip: "Signal: a shape with one turning point (mountain, valley, bitonic). Fix the turning point, solve each side independently with one pass from each end." },
  ],
  analysis: {
    time: "O(n log n)",
    space: "O(n)",
    notes: ["Each side's length per index comes from the slot found by lower_bound."],
  },
  solution: `class Solution {
public:
    int minimumMountainRemovals(vector<int>& nums) {
        int n = nums.size();
        vector<int> up(n), down(n), tails;

        // up[i]: longest strictly increasing subsequence ending at i.
        // nums[i] lands in slot k of tails, so a length k+1 chain ends with it.
        for (int i = 0; i < n; ++i) {
            auto it = lower_bound(tails.begin(), tails.end(), nums[i]);
            up[i] = (it - tails.begin()) + 1;
            if (it == tails.end()) tails.push_back(nums[i]); else *it = nums[i];
        }

        // down[i]: longest strictly decreasing subsequence starting at i,
        // which is an increasing one when read from the right.
        tails.clear();
        for (int i = n - 1; i >= 0; --i) {
            auto it = lower_bound(tails.begin(), tails.end(), nums[i]);
            down[i] = (it - tails.begin()) + 1;
            if (it == tails.end()) tails.push_back(nums[i]); else *it = nums[i];
        }

        // A real peak needs at least one element on each side.
        int keep = 0;
        for (int i = 0; i < n; ++i)
            if (up[i] >= 2 && down[i] >= 2)
                keep = max(keep, up[i] + down[i] - 1);   // peak counted once
        return n - keep;
    }
};
`,
});
