import { light } from "./leet-light.js";

export const lc2040 = light({
  number: 2040,
  title: "Kth Smallest Product of Two Sorted Arrays",
  slug: "kth-smallest-product-of-two-sorted-arrays",
  difficulty: "H",
  pattern: "B2",
  topic: "B2 · Binary search on the value",
  see: 668,
  themes: ["Kth smallest", "Signs"],
  blurb: "Search the product value x; for each a in the first array, count b with a·b ≤ x by binary search, flipping the direction when a is negative.",
  statement: [
    "Two sorted integer arrays are given (values may be negative). Over all pairs (a, b) with a from the first and b from the second, return the kth smallest product a · b.",
    "Each array has up to 5·10⁴ elements between −10⁵ and 10⁵; 1 ≤ k ≤ n₁ · n₂.",
  ],
  hints: [
    "There are up to 2.5·10⁹ products. Can you count those ≤ x without listing them?",
    "For a fixed a > 0, a · b ≤ x is b ≤ x / a: a prefix of the sorted second array.",
    "For a < 0 the inequality flips: b ≥ x / a, a suffix. For a = 0 it is all or nothing.",
    "Binary search x in [−10¹⁰, 10¹⁰] with that count. Use floor and ceiling division carefully, or compare a · b directly in long long.",
  ],
  brute: "List all products and select: O(n₁ n₂) time and memory, 2.5·10⁹ products at the limit.",
  invariant: "count(lo − 1) < k ≤ count(hi), so the answer stays in [lo, hi].",
  traps: [
    "Integer division rounds toward zero in C++: x / a is not a floor for negative values. Comparing a · b ≤ x inside the binary search avoids it.",
    "The product range is ±10¹⁰: int overflows.",
    "Forgetting that the order of b reverses when a is negative.",
  ],
  followUps: [
    "668 and 719: the same search where all values are non-negative.",
    "An O((n₁ + n₂) log) count: split each array by sign and use two pointers on each sign combination.",
    "The kth largest instead.",
  ],
  explanation: [
    "count(x), the number of pairs with product ≤ x, never decreases with x, so the answer is the smallest x with count(x) ≥ k. Products lie in [−10¹⁰, 10¹⁰].",
    "For a fixed a from the first array, the bs with a · b ≤ x form a contiguous block of the sorted second array. If a > 0, the product grows with b, so the block is a prefix. If a < 0, the product shrinks as b grows, so the block is a suffix. If a = 0, every b counts when x ≥ 0 and none when x < 0. Each block is found by a binary search comparing a · b with x in 64-bit arithmetic.",
    "So a count is O(n₁ log n₂) and the whole search is about 35 counts.",
    { tip: "Signal: kth smallest product or ratio with mixed signs. Search the value and split the count by the sign of the fixed factor." },
  ],
  analysis: {
    time: "O(n₁ log n₂ log(range)), about 35 · 5·10⁴ · 16 steps",
    space: "O(1)",
    notes: ["The sign-split two-pointer count removes the inner log."],
  },
  tests: {
    fn: "kthSmallestProduct",
    args: [{ type: "vector<int>", name: "nums1" }, { type: "vector<int>", name: "nums2" }, { type: "long long", name: "k" }],
    starter: `class Solution {
public:
    long long kthSmallestProduct(vector<int>& nums1, vector<int>& nums2, long long k) {

    }
};`,
    reference: `class Solution {
public:
    long long kthSmallestProduct(vector<int>& nums1, vector<int>& nums2, long long k) {
        long long lo = -10000000000LL, hi = 10000000000LL;
        while (lo < hi) {
            long long x = lo + (hi - lo) / 2;  // hi - lo fits easily in 64 bits
            if (countAtMost(nums1, nums2, x) >= k) hi = x;
            else lo = x + 1;
        }
        return lo;
    }

private:
    long long countAtMost(const vector<int>& A, const vector<int>& B, long long x) {
        long long cnt = 0;
        int m = B.size();
        for (long long a : A) {
            if (a == 0) { if (x >= 0) cnt += m; continue; }
            int l = 0, r = m;  // find the boundary in B
            if (a > 0) {      // a*b grows with b: count the prefix with a*b <= x
                while (l < r) { int mid = (l + r) / 2; if (a * B[mid] <= x) l = mid + 1; else r = mid; }
                cnt += l;
            } else {          // a*b shrinks as b grows: count the suffix with a*b <= x
                while (l < r) { int mid = (l + r) / 2; if (a * B[mid] <= x) r = mid; else l = mid + 1; }
                cnt += m - l;
            }
        }
        return cnt;
    }
};`,
    brute: `class Solution {
public:
    // Every product, then select: O(n1 n2) time and memory.
    long long kthSmallestProduct(vector<int>& nums1, vector<int>& nums2, long long k) {
        vector<long long> p;
        for (long long a : nums1)
            for (long long b : nums2) p.push_back(a * b);
        nth_element(p.begin(), p.begin() + (k - 1), p.end());
        return p[k - 1];
    }
};`,
    cases: [
      { name: "example", args: ["{2, 5}", "{3, 4}", "2"] },
      { name: "example 2", args: ["{-4, -2, 0, 3}", "{2, 4}", "6"] },
      { name: "example 3", args: ["{-2, -1, 0, 1, 2}", "{-3, -1, 2, 4, 5}", "3"] },
      { name: "extremes", args: ["{-100000, 100000}", "{-100000, 100000}", "1"] },
      { name: "all zero", args: ["{0, 0}", "{-1, 1}", "3"] },
    ],
    random: { count: 400, gen: "nums1 = rnd_sorted(rnd(1, 6), -5, 5); nums2 = rnd_sorted(rnd(1, 6), -5, 5); k = rnd(1, nums1.size() * nums2.size());" },
    stress: { label: "5·10⁴ × 5·10⁴", gen: "nums1 = rnd_sorted(50000, -100000, 100000); nums2 = rnd_sorted(50000, -100000, 100000); k = 1250000000LL;" },
  },
});
