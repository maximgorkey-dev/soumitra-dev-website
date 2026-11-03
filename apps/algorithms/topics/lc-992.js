import { light } from "./leet-light.js";

export const lc992 = light({
  number: 992,
  title: "Subarrays with K Different Integers",
  slug: "subarrays-with-k-different-integers",
  difficulty: "H",
  pattern: "A4",
  topic: "A4 · Variable sliding window",
  see: 76,
  themes: ["Counting subarrays", "Exactly K"],
  blurb: "\"Exactly k distinct\" is not monotone, but \"at most k\" is. Count with a window for at most k and subtract at most k − 1.",
  statement: [
    "Count the contiguous subarrays that contain exactly k distinct values.",
    "Up to 2·10⁴ elements, each between 1 and n; 1 ≤ k ≤ n.",
  ],
  hints: [
    "Try a sliding window for \"exactly k\". Why does shrinking or growing go wrong?",
    "For a fixed right end, the valid left ends for \"exactly k\" form a range in the middle, not a prefix.",
    "\"At most k distinct\" is monotone: for each right end, every left end from some point on works. How many subarrays end at r?",
    "exactly(k) = atMost(k) − atMost(k − 1).",
  ],
  brute: "Fix each start and extend, tracking the number of distinct values: O(n²), 2·10⁸ at the limit and too slow just beyond it.",
  invariant: "In atMost(k), after processing r, the window [l, r] is the longest one ending at r with at most k distinct values, so it contributes r − l + 1 subarrays.",
  traps: [
    "Counting only the longest window per right end: every left end in [l, r] gives a subarray.",
    "atMost(0) must be 0 (handle k − 1 = 0).",
    "The count can exceed 2³¹ for larger n: n(n + 1) / 2. Use long long inside.",
  ],
  followUps: [
    "1248 Count Number of Nice Subarrays: exactly k odd numbers, the same subtraction.",
    "930 Binary Subarrays With Sum: exactly a sum, by at-most subtraction or prefix counts.",
    "Do it in one pass with two left pointers (the near and far edge of the valid range).",
  ],
  explanation: [
    "A sliding window needs a condition that only gets harder as the window grows. \"At most k distinct values\" is like that: adding an element can only raise the count. \"Exactly k\" is not: it can be too few, then right, then too many.",
    "So count the monotone version. For atMost(k): move r right, add nums[r] to a frequency table, and while the window has more than k distinct values, move l right. Every left end from l to r now gives a valid subarray ending at r, so add r − l + 1.",
    "Subarrays with exactly k distinct values are those with at most k minus those with at most k − 1. Two passes of the same function, O(n) each.",
    { tip: "Signal: \"exactly K\" of something over subarrays, where \"at most K\" is a sliding window. Subtract two at-most counts." },
  ],
  analysis: {
    time: "O(n): two window passes",
    space: "O(n) for the counts (values are at most n, so an array works)",
    notes: [
      "The one-pass version keeps two left pointers, for at most k and at most k − 1, and adds their difference at every r.",
    ],
  },
  tests: {
    fn: "subarraysWithKDistinct",
    args: [{ type: "vector<int>", name: "nums" }, { type: "int", name: "k" }],
    starter: `class Solution {
public:
    int subarraysWithKDistinct(vector<int>& nums, int k) {

    }
};`,
    reference: `class Solution {
public:
    int subarraysWithKDistinct(vector<int>& nums, int k) {
        return atMost(nums, k) - atMost(nums, k - 1);
    }

private:
    long long atMost(const vector<int>& a, int k) {
        if (k <= 0) return 0;
        vector<int> cnt(a.size() + 1);
        long long total = 0;
        int distinct = 0;
        for (int l = 0, r = 0; r < (int)a.size(); ++r) {
            if (cnt[a[r]]++ == 0) ++distinct;
            while (distinct > k)
                if (--cnt[a[l++]] == 0) --distinct;
            total += r - l + 1;  // every start in [l, r]
        }
        return total;
    }
};`,
    brute: `class Solution {
public:
    // Every start, extended one element at a time: O(n^2).
    int subarraysWithKDistinct(vector<int>& nums, int k) {
        int n = nums.size(), ans = 0;
        for (int i = 0; i < n; ++i) {
            vector<int> cnt(n + 1);
            int distinct = 0;
            for (int j = i; j < n; ++j) {
                if (cnt[nums[j]]++ == 0) ++distinct;
                if (distinct == k) ++ans;
                else if (distinct > k) break;
            }
        }
        return ans;
    }
};`,
    cases: [
      { name: "example", args: ["{1, 2, 1, 2, 3}", "2"] },
      { name: "example 2", args: ["{1, 2, 1, 3, 4}", "3"] },
      { name: "k = 1", args: ["{1, 1, 1}", "1"] },
      { name: "k = n", args: ["{1, 2, 3}", "3"] },
      { name: "too many needed", args: ["{1, 1, 2}", "3"] },
    ],
    random: { count: 400, gen: "{ int lt_n = rnd(1, 9); nums = rnd_vec(lt_n, 1, min(lt_n, 4)); k = rnd(1, lt_n); }" },
    stress: { label: "10⁵ elements (five times the limit)", gen: "nums = rnd_vec(100000, 1, 50); k = 50;" },
  },
});
