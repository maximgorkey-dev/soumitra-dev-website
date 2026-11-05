import { study } from "./leet-light.js";

export const lc300 = study({
  number: 300,
  title: "Longest Increasing Subsequence",
  slug: "longest-increasing-subsequence",
  difficulty: "M",
  pattern: "F7",
  topic: "F7 · DP sped up with a data structure (the LIS family)",
  themes: ["Patience sorting", "Binary search on tails", "O(n²) to O(n log n)"],
  blurb: "Keep tails[k], the smallest possible last value of an increasing subsequence of length k + 1. The array stays sorted, so each new number either extends the longest or replaces the first tail that is not smaller than it, found by binary search.",
  statement: [
    "Given an integer array nums, return the length of its longest strictly increasing subsequence (elements kept in order, others deleted).",
    "Up to 2500 elements. Example: [10, 9, 2, 5, 3, 7, 101, 18] gives 4 (for instance 2, 3, 7, 18).",
  ],
  concepts: [
    "The O(n²) DP: len[i] = 1 + max len[j] over j < i with nums[j] < nums[i]. Correct, and the baseline to improve.",
    "Dominance: among increasing subsequences of the same length, the one with the smallest last value is always at least as good for the future.",
    "tails array: tails[k] is that smallest last value for length k + 1. It is strictly increasing, which is what allows binary search.",
    "lower_bound for strict increase: replace the first tail ≥ x. Using upper_bound would allow equal neighbours and compute the non-decreasing version.",
    "tails is not itself a subsequence of nums: only its length is meaningful, unless you keep parent links.",
  ],
  hints: [
    "Start with the O(n²) DP over \"longest increasing subsequence ending at i\". Where does the time go?",
    "For each i you search all earlier j for the best one with a smaller value. Can you summarise the earlier elements better?",
    "For a fixed length, which ending value would you want to keep: the largest or the smallest?",
    "Keep, for every length, the smallest possible ending value. Show those values are sorted, then use binary search.",
  ],
  brute: [
    "Enumerate all 2ⁿ subsequences and keep the longest increasing one: impossible beyond n ≈ 30.",
    "The O(n²) DP (6 × 10⁶ steps at n = 2500) passes, but it scans every earlier j for each i. Most of those j are dominated: if two earlier subsequences have the same length, only the one ending lower matters. Keeping one value per length, sorted, turns the scan into a binary search: O(n log n).",
  ],
  invariant: "After processing nums[0..i], tails has one entry per achievable length, tails[k] is the smallest last value of any increasing subsequence of length k + 1 in nums[0..i], and tails is strictly increasing.",
  traps: [
    "upper_bound instead of lower_bound: with duplicates, [2, 2] would give 2, but strictly increasing allows only 1.",
    "Reading tails as the answer sequence: for [3, 4, 1] tails ends as [1, 4], which is not a subsequence. Only its length is the answer.",
    "Initialising the O(n²) DP's answer to 0 for an empty-ish case: the answer is at least 1 for a non-empty array.",
    "Thinking replacement loses information: replacing a tail never shortens any length; it only makes that length easier to extend.",
  ],
  followUps: [
    "Recover the sequence: store, for each index, the index of its tail slot and of the element before it (the tail one slot to the left at that moment), then walk back from the last slot.",
    "Count the number of longest increasing subsequences (673): O(n²) with counts, or O(n log n) with a Fenwick tree over values storing (length, count).",
    "Non-decreasing instead of strict: use upper_bound.",
    "2D version (354, Russian Doll Envelopes): sort by one dimension, then LIS on the other, with ties ordered carefully.",
    "Weighted (maximum sum increasing subsequence), or an extra limit such as \"next − previous ≤ k\" (2407): binary search no longer works; use a segment tree or Fenwick tree over values.",
  ],
  explanation: [
    { h: "The O(n²) starting point" },
    "len[i], the length of the longest increasing subsequence ending exactly at index i, is 1 + the largest len[j] over earlier j with nums[j] < nums[i] (or 1 if there is none). The answer is the largest len[i]. Each i scans all j: O(n²).",
    { h: "What the tails array means" },
    "tails[k] is the smallest value that can end an increasing subsequence of length k + 1 among the elements seen so far. Smaller is better, because any later number that could extend a subsequence ending in a larger value could also extend one ending in a smaller value.",
    "tails is strictly increasing. If tails[k + 1] ≤ tails[k], take the length k + 2 subsequence and drop its last element: you get a length k + 1 subsequence ending below tails[k + 1] ≤ tails[k], contradicting minimality.",
    { h: "Processing one number x" },
    {
      list: [
        "If x is larger than every tail, it extends the longest subsequence: append it. The answer grows by one.",
        "Otherwise find the first tail ≥ x (lower_bound) and replace it with x. The subsequence of the length just below ends below x, so x can follow it, and x is a smaller ending for that length.",
        "No other entry changes: x cannot improve shorter lengths (their tails are already smaller) and cannot extend longer ones (their predecessors' tails are ≥ x).",
      ],
    },
    { code: "for x in nums:\n    k = first index with tails[k] >= x     // lower_bound\n    if k == len(tails): tails.append(x)\n    else:               tails[k] = x\nanswer = len(tails)" },
    { h: "A worked example: [10, 9, 2, 5, 3, 7, 101, 18]" },
    {
      table: {
        head: ["x", "action", "tails after"],
        rows: [
          [10, "append", "10"],
          [9, "replace 10", "9"],
          [2, "replace 9", "2"],
          [5, "append", "2, 5"],
          [3, "replace 5", "2, 3"],
          [7, "append", "2, 3, 7"],
          [101, "append", "2, 3, 7, 101"],
          [18, "replace 101", "**2, 3, 7, 18**"],
        ],
        caption: "tails[k]: the smallest ending of an increasing subsequence of length k + 1 so far. The answer is the final length, 4.",
      },
    },
    "When 3 arrives, the best length-2 ending improves from 5 to 3 (2, 3 instead of 2, 5). That is why 7 can extend it next. When 18 replaces 101, the length-4 ending drops so that a later 20 could still extend it.",
    { h: "Cost" },
    "One binary search per element on an array of at most n entries: O(n log n) time, O(n) space.",
    { tip: "Signal: longest chain under an order, or \"fewest removals to make it sorted\". Think tails plus lower_bound." },
  ],
  analysis: {
    time: "O(n log n)",
    space: "O(n)",
    notes: ["The O(n²) DP also passes at n = 2500 and is worth stating first."],
  },
  solution: `class Solution {
public:
    int lengthOfLIS(vector<int>& nums) {
        // tails[k]: smallest last value of any strictly increasing subsequence
        // of length k + 1 seen so far. It is strictly increasing.
        vector<int> tails;
        for (int x : nums) {
            // First tail >= x. lower_bound (not upper_bound) keeps it strict:
            // an equal value cannot extend a subsequence ending in x.
            auto it = lower_bound(tails.begin(), tails.end(), x);
            if (it == tails.end())
                tails.push_back(x);   // extends the longest subsequence
            else
                *it = x;              // a smaller ending for that length
        }
        return tails.size();
    }
};

// O(n^2) version:
//   vector<int> len(n, 1);
//   for (int i = 0; i < n; ++i)
//       for (int j = 0; j < i; ++j)
//           if (nums[j] < nums[i]) len[i] = max(len[i], len[j] + 1);
//   return *max_element(len.begin(), len.end());
`,
});
