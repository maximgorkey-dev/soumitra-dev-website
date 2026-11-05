import { study } from "./leet-light.js";

export const lc2111 = study({
  number: 2111,
  title: "Minimum Operations to Make the Array K-Increasing",
  slug: "minimum-operations-to-make-the-array-k-increasing",
  difficulty: "H",
  pattern: "F7",
  topic: "F7 · DP sped up with a data structure (the LIS family)",
  see: 300,
  themes: ["Independent chains", "Fewest changes = longest kept", "Non-decreasing LIS"],
  blurb: "The condition arr[i − k] ≤ arr[i] only links indices with the same remainder mod k, so the array splits into k independent chains. Each chain must become non-decreasing; keep its longest non-decreasing subsequence and change the rest.",
  statement: [
    "An array is K-increasing if arr[i − k] ≤ arr[i] for every i ≥ k. In one operation you may change any element to any positive integer. Return the fewest operations that make arr K-increasing.",
    "Up to 10⁵ elements. Examples: [5, 4, 3, 2, 1] with k = 1 gives 4; [4, 1, 5, 2, 6, 2] with k = 2 gives 0; the same array with k = 3 gives 2.",
  ],
  concepts: [
    "Decomposing by residue: indices r, r + k, r + 2k, … form a chain, and the condition never compares elements from different chains.",
    "Fewest changes = longest kept: in each chain, the unchanged elements must already be non-decreasing; changed ones can be set freely to fit between them.",
    "Non-decreasing LIS: equal values are allowed, so use upper_bound in the tails array.",
    "Why free values always fit: a changed element can be set equal to the previous kept value (or to the next kept value, or 1 at the start), which keeps the chain non-decreasing and positive.",
  ],
  hints: [
    "Write out which pairs of indices the condition compares. Do index 0 and index 1 ever interact when k = 2?",
    "The array splits into k chains by i mod k. Solve each separately and add.",
    "In one chain, which elements can you leave untouched?",
    "Any non-decreasing subsequence can stay; everything else is changed. Maximise what stays.",
  ],
  brute: [
    "Choosing which elements to change by trying subsets is exponential.",
    "Within a chain, the O(m²) \"longest non-decreasing subsequence\" DP works but is 10¹⁰ for one chain of 10⁵ when k = 1. The tails array with upper_bound gives O(m log m) per chain, O(n log n) total.",
  ],
  invariant: "For each chain, the kept elements form a non-decreasing subsequence of maximum length, and the operations for that chain equal its length minus that maximum.",
  traps: [
    "lower_bound (strict LIS): the condition is ≤, so equal values may be kept. [2, 2, 2] with k = 1 needs 0 changes, not 2.",
    "Treating the whole array as one sequence: only same-residue elements are compared.",
    "Worrying that changed values must be integers between neighbours with no room: non-decreasing allows equality, so copying a neighbour's value always works.",
    "Allocating a new tails vector per chain inside a hot loop: fine here, but clearing and reusing one avoids k allocations when k is large.",
  ],
  followUps: [
    "Strictly increasing chains (arr[i − k] < arr[i]): changed values must fit strictly between kept neighbours, so the kept elements need gaps: keep elements whose value minus their chain index is non-decreasing (the classic \"make strictly increasing\" transform).",
    "Changes may only decrease elements: no longer free; this becomes a different greedy or DP.",
    "Minimum total change (sum of |new − old|) instead of count: slope trick or the median-based isotonic regression per chain.",
    "Report which indices to change: reconstruct each chain's LIS with parent links.",
  ],
  explanation: [
    { h: "Split into chains" },
    "The condition compares arr[i] only with arr[i − k], so it links i with i − k, i − 2k, and so on. For each remainder r in 0..k − 1, the chain arr[r], arr[r + k], arr[r + 2k], … must be non-decreasing, and chains are independent.",
    { h: "One chain" },
    "Elements left unchanged must already be in non-decreasing order, since nothing can fix them. Elements that are changed can be set to any positive integer, and setting each one equal to the nearest kept value before it (or 1 if none) keeps the chain non-decreasing. So the fewest changes is the chain length minus its longest non-decreasing subsequence.",
    { code: "ops = 0\nfor r in 0..k-1:\n    chain = arr[r], arr[r+k], arr[r+2k], ...\n    ops += len(chain) - LNDS(chain)          // upper_bound in tails\nanswer = ops" },
    { h: "A worked example: [4, 1, 5, 2, 6, 2], k = 3" },
    {
      table: {
        head: ["chain r", "indices", "values", "longest non-decreasing kept", "changes"],
        rows: [
          [0, "0, 3", "4, 2", "1 (4 or 2)", 1],
          [1, "1, 4", "1, 6", "2", 0],
          [2, "2, 5", "5, 2", "1", 1],
        ],
        caption: "Each chain is solved independently. The answer is 1 + 0 + 1 = 2.",
      },
    },
    "Chain 0 compares only arr[0] = 4 with arr[3] = 2, so one of them must change (for example set arr[3] to 4). Chain 1 is already fine. With k = 2 the chains are [4, 5, 6] and [1, 2, 2], both non-decreasing, so 0 changes.",
    { h: "Cost" },
    "Every element is in exactly one chain and costs one binary search: O(n log n) time, O(n / k) space for the tails array.",
    { tip: "Signal: a condition between i and i − k. Split by residue; each chain is its own one-dimensional problem." },
  ],
  analysis: {
    time: "O(n log n)",
    space: "O(n / k)",
    notes: ["upper_bound because equal values are allowed."],
  },
  solution: `class Solution {
public:
    int kIncreasing(vector<int>& arr, int k) {
        int n = arr.size(), ops = 0;
        vector<int> tails;
        // The condition only compares indices with the same remainder mod k,
        // so each chain r, r+k, r+2k, ... is solved on its own.
        for (int r = 0; r < k; ++r) {
            tails.clear();
            int len = 0;
            for (int i = r; i < n; i += k) {
                ++len;
                // Longest NON-DECREASING subsequence: upper_bound lets an
                // equal value extend the chain.
                auto it = upper_bound(tails.begin(), tails.end(), arr[i]);
                if (it == tails.end()) tails.push_back(arr[i]); else *it = arr[i];
            }
            // Keep the longest non-decreasing part; change everything else.
            ops += len - (int)tails.size();
        }
        return ops;
    }
};
`,
});
