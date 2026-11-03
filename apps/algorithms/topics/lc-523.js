import { light } from "./leet-light.js";

export const lc523 = light({
  number: 523,
  title: "Continuous Subarray Sum",
  slug: "continuous-subarray-sum",
  difficulty: "M",
  pattern: "A1",
  topic: "A1 · Prefix sums with a hash map",
  see: 560,
  themes: ["Subarray sums", "Modular arithmetic"],
  blurb: "A subarray sum is a multiple of k exactly when two prefix sums agree mod k. Remember where each remainder first appeared.",
  statement: [
    "Given non-negative integers and a positive k, decide whether some contiguous subarray of length at least 2 has a sum that is a multiple of k (0 counts as a multiple).",
    "Up to 10⁵ elements, each up to 10⁹; 1 ≤ k ≤ 2³¹ − 1.",
  ],
  hints: [
    "Write the subarray sum from i + 1 to j as a difference of two prefix sums.",
    "P[j] − P[i] is a multiple of k exactly when P[j] and P[i] have the same remainder mod k.",
    "Store the first index at which each remainder appeared. Why the first?",
    "The length condition is j − i ≥ 2. Seed remainder 0 at index −1 so that a prefix starting at 0 counts.",
  ],
  brute: "Try every pair of endpoints with prefix sums: O(n²), 5·10⁹ pairs at 10⁵. Correct, and too slow when no answer exists, because it cannot stop early.",
  invariant: "After processing index j, first[r] holds the smallest prefix index whose sum is r mod k, so the longest subarray ending at j with a sum divisible by k starts right after first[P[j] mod k].",
  traps: [
    "Storing the latest index for each remainder instead of the first: a later index can make the length too short, while an earlier one would have worked.",
    "Forgetting the seed first[0] = −1: [2, 4] with k = 6 is a whole-array answer.",
    "Length 1 does not count: [0] is false, but [0, 0] is true for any k.",
    "Summing in int: prefix sums reach 10¹⁴. Keep only the remainder.",
  ],
  followUps: [
    "974 Subarray Sums Divisible by K: count the subarrays instead. Count each remainder; negative numbers need a non-negative mod.",
    "Return the longest such subarray.",
    "k can be 0 or negative in an older version of this problem. What changes?",
    "1590 Make Sum Divisible by P: remove the shortest subarray so the rest is divisible. Look up the remainder you need, keeping the latest index.",
  ],
  explanation: [
    "Let P[j] be the sum of the first j + 1 elements, and P[−1] = 0. The subarray from i + 1 to j sums to P[j] − P[i], which is a multiple of k exactly when P[j] ≡ P[i] (mod k). So the question becomes: are there two prefix indices with the same remainder, at least two apart?",
    "Scan once, keeping a map from remainder to the first index where it appeared, seeded with remainder 0 at index −1. At each j, if P[j] mod k is already in the map at index i and j − i ≥ 2, answer true. Otherwise, insert it only if it is new: keeping the earliest index gives the longest candidate for every later j.",
    "Only remainders are stored, so the running sum can be kept mod k and never overflows.",
    { tip: "Same pattern as 560, with \"equal remainders\" in place of \"prefix minus k\". When the condition is about divisibility, hash the prefix sum mod k." },
  ],
  analysis: {
    time: "O(n)",
    space: "O(min(n, k)) for the remainder map",
    notes: [
      "The pigeonhole principle gives a shortcut: if n > k, two of the n + 1 prefixes share a remainder, though not necessarily two apart.",
      "An unordered_map is fine; a vector of size k is not when k is near 2³¹.",
    ],
  },
  tests: {
    fn: "checkSubarraySum",
    args: [{ type: "vector<int>", name: "nums" }, { type: "int", name: "k" }],
    starter: `class Solution {
public:
    bool checkSubarraySum(vector<int>& nums, int k) {

    }
};`,
    reference: `class Solution {
public:
    bool checkSubarraySum(vector<int>& nums, int k) {
        unordered_map<int, int> first{{0, -1}};  // remainder -> earliest prefix index
        int r = 0;
        for (int j = 0; j < (int)nums.size(); ++j) {
            r = (int)(((long long)r + nums[j]) % k);
            auto it = first.find(r);
            if (it == first.end()) first[r] = j;
            else if (j - it->second >= 2) return true;
        }
        return false;
    }
};`,
    brute: `class Solution {
public:
    // Every pair of endpoints: O(n^2).
    bool checkSubarraySum(vector<int>& nums, int k) {
        int n = nums.size();
        vector<long long> p(n + 1);
        for (int i = 0; i < n; ++i) p[i + 1] = p[i] + nums[i];
        for (int i = 0; i < n; ++i)
            for (int j = i + 2; j <= n; ++j)
                if ((p[j] - p[i]) % k == 0) return true;
        return false;
    }
};`,
    cases: [
      { name: "example", args: ["{23, 2, 4, 6, 7}", "6"] },
      { name: "whole array", args: ["{23, 2, 6, 4, 7}", "6"] },
      { name: "no answer", args: ["{23, 2, 6, 4, 7}", "13"] },
      { name: "single zero", args: ["{0}", "1"] },
      { name: "two zeros", args: ["{0, 0}", "7"] },
      { name: "prefix from the start", args: ["{2, 4}", "6"] },
      { name: "same remainder, adjacent", args: ["{5, 0, 0, 0}", "3"] },
      { name: "huge k", args: ["{1000000000, 1000000000}", "2147483647"] },
    ],
    random: { count: 400, gen: "nums = rnd_vec(rnd(1, 8), 0, 9); k = rnd(1, 10);" },
    stress: { label: "10⁵ ones, k = 2³¹ − 1 (no answer)", gen: "nums.assign(100000, 1); k = 2147483647;" },
  },
});
