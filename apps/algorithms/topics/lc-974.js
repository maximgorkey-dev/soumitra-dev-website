import { light } from "./leet-light.js";

export const lc974 = light({
  number: 974,
  title: "Subarray Sums Divisible by K",
  slug: "subarray-sums-divisible-by-k",
  difficulty: "M",
  pattern: "A1",
  topic: "A1 · Prefix sums with a hash map",
  see: 560,
  themes: ["Subarray sums", "Modular arithmetic"],
  blurb: "Count pairs of prefix sums with equal remainders mod k, taking care that remainders of negative sums are made non-negative.",
  statement: [
    "Count the non-empty contiguous subarrays whose sum is divisible by k.",
    "Up to 3·10⁴ elements between −10⁴ and 10⁴; 2 ≤ k ≤ 10⁴.",
  ],
  hints: [
    "A subarray sum is P[j] − P[i] for two prefix sums. When is it divisible by k?",
    "When P[j] and P[i] have the same remainder mod k.",
    "So count, for each prefix, how many earlier prefixes share its remainder. Start with remainder 0 seen once.",
    "In C++, −7 % 5 is −2, not 3. Normalise.",
  ],
  brute: "Sum every subarray, extending each start one element at a time: O(n²), 4.5·10⁸ steps at the limit and too slow beyond it.",
  invariant: "Before processing j, cnt[r] is the number of prefixes P[−1], …, P[j − 1] with remainder r, so cnt[P[j] mod k] is the number of good subarrays ending at j.",
  traps: [
    "Negative remainders: ((s % k) + k) % k, otherwise −2 and 3 land in different buckets though they are equal mod 5.",
    "Forgetting the empty prefix (cnt[0] = 1 at the start): subarrays that start at index 0 are missed.",
    "The count can exceed 2³¹ for n near 10⁵ (n(n + 1) / 2). Here n ≤ 3·10⁴ keeps it below, but long long costs nothing.",
  ],
  followUps: [
    "523 Continuous Subarray Sum: existence with length at least 2; store the first index per remainder.",
    "Count subarrays whose sum is divisible by k and whose length is even.",
    "1590 Make Sum Divisible by P: the shortest subarray to remove.",
  ],
  explanation: [
    "Subarray i + 1 … j sums to P[j] − P[i], which is divisible by k exactly when P[j] ≡ P[i] (mod k). So the answer is the number of pairs of prefixes, including the empty prefix, with the same remainder.",
    "Keep an array cnt of size k. Walk the array with a running remainder r; before counting, add cnt[r] to the answer (each earlier prefix with remainder r closes a good subarray at j), then increment cnt[r].",
    "Since k ≤ 10⁴, a plain array beats a hash map. Make the remainder non-negative: in C++ the sign of % follows the dividend.",
    { tip: "Equivalent: the answer is Σ over remainders of C(cnt[r], 2), computed after the scan." },
  ],
  analysis: {
    time: "O(n + k)",
    space: "O(k)",
    notes: [
      "The running remainder stays in [0, k), so no overflow even though prefix sums can reach 3·10⁸.",
      "A hash map works too and is O(min(n, k)) space.",
    ],
  },
  tests: {
    fn: "subarraysDivByK",
    args: [{ type: "vector<int>", name: "nums" }, { type: "int", name: "k" }],
    starter: `class Solution {
public:
    int subarraysDivByK(vector<int>& nums, int k) {

    }
};`,
    reference: `class Solution {
public:
    int subarraysDivByK(vector<int>& nums, int k) {
        vector<int> cnt(k);
        cnt[0] = 1;  // the empty prefix
        long long ans = 0;
        int r = 0;
        for (int x : nums) {
            r = ((r + x) % k + k) % k;  // C++ % can be negative
            ans += cnt[r]++;
        }
        return ans;
    }
};`,
    brute: `class Solution {
public:
    // Every subarray: O(n^2).
    int subarraysDivByK(vector<int>& nums, int k) {
        int n = nums.size(), ans = 0;
        for (int i = 0; i < n; ++i) {
            long long s = 0;
            for (int j = i; j < n; ++j) {
                s += nums[j];
                if (s % k == 0) ++ans;
            }
        }
        return ans;
    }
};`,
    cases: [
      { name: "example", args: ["{4, 5, 0, -2, -3, 1}", "5"] },
      { name: "none", args: ["{5}", "9"] },
      { name: "negatives", args: ["{-1, 2, 9}", "2"] },
      { name: "all zeros", args: ["{0, 0, 0}", "3"] },
      { name: "negative remainder", args: ["{-7, 2}", "5"] },
    ],
    random: { count: 400, gen: "nums = rnd_vec(rnd(1, 10), -6, 6); k = rnd(2, 6);" },
    stress: { label: "10⁵ elements (above the limit)", gen: "nums = rnd_vec(100000, -10000, 10000); k = 9973;" },
  },
});
