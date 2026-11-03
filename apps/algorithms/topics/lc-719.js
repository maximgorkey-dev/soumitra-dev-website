import { light } from "./leet-light.js";

export const lc719 = light({
  number: 719,
  title: "Find K-th Smallest Pair Distance",
  slug: "find-k-th-smallest-pair-distance",
  difficulty: "H",
  pattern: "B2",
  topic: "B2 · Binary search on the value",
  see: 668,
  themes: ["Kth smallest", "Two pointers count"],
  blurb: "Search the distance d; on the sorted array, count pairs with distance ≤ d using two pointers in O(n).",
  statement: [
    "The distance of a pair of positions i < j is |nums[i] − nums[j]|. Return the kth smallest distance among all pairs.",
    "Up to 10⁴ elements between 0 and 10⁶; 1 ≤ k ≤ n(n − 1) / 2.",
  ],
  hints: [
    "There are up to 5·10⁷ pairs. Can you count pairs with distance ≤ d without listing them?",
    "Sort. For each right end j, the left ends with nums[j] − nums[i] ≤ d form a suffix of [0, j).",
    "That suffix's start only moves right as j grows: two pointers, O(n) per count.",
    "Binary search the smallest d with count(d) ≥ k, over [0, max − min].",
  ],
  brute: "List all n(n − 1) / 2 distances and select the kth: O(n²) time and memory, 5·10⁷ values at the limit.",
  invariant: "count(lo − 1) < k ≤ count(hi), so the answer stays in [lo, hi], and it is an actual distance.",
  traps: [
    "Counting pairs per j with a binary search is O(n log n) per count: fine, but two pointers are simpler and faster.",
    "The count can reach 5·10⁷: fits in int, but long long is safer.",
    "Forgetting to sort first.",
  ],
  followUps: [
    "668 Kth Smallest Number in Multiplication Table: the same search with a formula count.",
    "Bucket counting when values are small: count distances by value directly in O(n · range) or with FFT.",
    "2040 Kth Smallest Product of Two Sorted Arrays: the count must handle signs.",
  ],
  explanation: [
    "count(d), the number of pairs at distance ≤ d, never decreases with d, so the kth smallest distance is the smallest d with count(d) ≥ k.",
    "On the sorted array, count with two pointers: for each j, advance i while nums[j] − nums[i] > d; then every index in [i, j) pairs with j, adding j − i. The left pointer never moves back, so a count is O(n).",
    "Binary search d over [0, max − min], with about 20 counts.",
    { tip: "Signal: kth smallest over all pairs. Search the value; count pairs with a sorted sweep." },
  ],
  analysis: {
    time: "O(n log n + n log(range))",
    space: "O(1) extra",
    notes: ["The brute force stores up to 5·10⁷ ints, 200 MB: it fails on memory before time."],
  },
  tests: {
    fn: "smallestDistancePair",
    args: [{ type: "vector<int>", name: "nums" }, { type: "int", name: "k" }],
    starter: `class Solution {
public:
    int smallestDistancePair(vector<int>& nums, int k) {

    }
};`,
    reference: `class Solution {
public:
    int smallestDistancePair(vector<int>& nums, int k) {
        sort(nums.begin(), nums.end());
        int lo = 0, hi = nums.back() - nums[0];
        while (lo < hi) {
            int d = lo + (hi - lo) / 2;
            long long cnt = 0;
            for (int i = 0, j = 0; j < (int)nums.size(); ++j) {
                while (nums[j] - nums[i] > d) ++i;
                cnt += j - i;  // pairs (i..j-1, j)
            }
            if (cnt >= k) hi = d;
            else lo = d + 1;
        }
        return lo;
    }
};`,
    brute: `class Solution {
public:
    // Every distance, then select: O(n^2) time and memory.
    int smallestDistancePair(vector<int>& nums, int k) {
        vector<int> d;
        for (size_t i = 0; i < nums.size(); ++i)
            for (size_t j = i + 1; j < nums.size(); ++j) d.push_back(abs(nums[i] - nums[j]));
        nth_element(d.begin(), d.begin() + (k - 1), d.end());
        return d[k - 1];
    }
};`,
    cases: [
      { name: "example", args: ["{1, 3, 1}", "1"] },
      { name: "example 2", args: ["{1, 1, 1}", "2"] },
      { name: "example 3", args: ["{1, 6, 1}", "3"] },
      { name: "largest", args: ["{0, 1000000, 5}", "3"] },
    ],
    random: { count: 400, gen: "nums = rnd_vec(rnd(2, 9), 0, 12); k = rnd(1, nums.size() * (nums.size() - 1) / 2);" },
    stress: { label: "2·10⁴ elements (twice the limit)", gen: "nums = rnd_vec(20000, 0, 1000000); k = 150000000;" },
  },
});
