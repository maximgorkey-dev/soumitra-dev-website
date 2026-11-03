import { light } from "./leet-light.js";

export const lc1703 = light({
  number: 1703,
  title: "Minimum Adjacent Swaps for K Consecutive Ones",
  slug: "minimum-adjacent-swaps-for-k-consecutive-ones",
  difficulty: "H",
  pattern: "C1",
  topic: "C1 · The median lemma",
  see: 462,
  themes: ["Median", "Sliding window", "Prefix sums"],
  blurb: "Collect the positions of the 1s and subtract each one's rank: gathering k of them becomes moving k values to a common point, solved by the median in each window of k.",
  statement: [
    "A binary array is given. One move swaps two adjacent elements. Return the fewest moves that create k consecutive 1s somewhere.",
    "Up to 10⁵ elements; 1 ≤ k ≤ number of 1s.",
  ],
  hints: [
    "Only the positions of the 1s matter. Which k of them should be gathered?",
    "Some k consecutive ones in the list of positions p. The 1s keep their order.",
    "Gathering them into a block starting at s means pᵢ moves to s + (i − first). Subtract the rank: with qᵢ = pᵢ − i, every q in the window moves to the same value.",
    "So the cost of a window is Σ |qᵢ − median|, computable in O(1) per window with prefix sums of q.",
  ],
  brute: "For every window of k ones and every possible block start, sum the distances: O(m · k · n), or O(m · k) with the median trick and no prefix sums.",
  invariant: "For window [l, l + k − 1] of q, the median is q[l + k/2], and the cost is (sum of the upper half − mid · count) + (mid · count − sum of the lower half), each half read from prefix sums.",
  traps: [
    "Working with raw positions: the target block is not a single point. Subtracting the rank makes it one.",
    "Off-by-one in the halves for even k: the lower half has k/2 elements before the median, the upper half k − k/2 − 1 after.",
    "Overflow: prefix sums of positions reach 5·10⁹; use long long.",
  ],
  followUps: [
    "2134 Minimum Swaps to Group All 1's Together II: any swaps, circular. A fixed window counting zeros.",
    "1151: the same, non-circular.",
    "Return where the block ends up.",
  ],
  explanation: [
    "Let p be the positions of the 1s. Adjacent swaps never let 1s pass each other usefully, so some k consecutive entries of p are gathered, and entry i in the window moves to start + (its rank in the window). The cost is Σ |pᵢ − (start + i − l)|.",
    "Substitute qᵢ = pᵢ − i. Then the cost is Σ |qᵢ − (start − l)|: every q in the window moves to one common value. By the median lemma, the best common value is the window's median of q, and q is non-decreasing, so the median is simply the middle element.",
    "With prefix sums of q, the cost of a window is (sum of the elements above the median − median · their count) + (median · count below − their sum), O(1) per window. Slide over all m − k + 1 windows.",
    { tip: "Signal: gather items into a contiguous block with unit moves. Subtracting each item's rank turns \"a block\" into \"a point\", and the median lemma applies." },
  ],
  analysis: {
    time: "O(n)",
    space: "O(m) for the positions and prefix sums, m = number of 1s",
    notes: ["This is the hard part of the C1 family: the median lemma only appears after the rank transformation."],
  },
  tests: {
    fn: "minMoves",
    args: [{ type: "vector<int>", name: "nums" }, { type: "int", name: "k" }],
    starter: `class Solution {
public:
    int minMoves(vector<int>& nums, int k) {

    }
};`,
    reference: `class Solution {
public:
    int minMoves(vector<int>& nums, int k) {
        vector<long long> q;  // position of each 1 minus its rank
        for (int i = 0; i < (int)nums.size(); ++i)
            if (nums[i]) q.push_back(i - (long long)q.size());
        int m = q.size();
        vector<long long> pre(m + 1);
        for (int i = 0; i < m; ++i) pre[i + 1] = pre[i] + q[i];
        long long best = LLONG_MAX;
        for (int l = 0; l + k <= m; ++l) {
            int mid = l + k / 2, r = l + k;  // window q[l, r)
            long long med = q[mid];
            long long below = med * (mid - l) - (pre[mid] - pre[l]);
            long long above = (pre[r] - pre[mid + 1]) - med * (r - mid - 1);
            best = min(best, below + above);
        }
        return best;
    }
};`,
    brute: `class Solution {
public:
    // Every window of k ones and every block start: O(m * k * n).
    int minMoves(vector<int>& nums, int k) {
        vector<int> p;
        for (int i = 0; i < (int)nums.size(); ++i)
            if (nums[i]) p.push_back(i);
        int n = nums.size();
        long long best = LLONG_MAX;
        for (int l = 0; l + k <= (int)p.size(); ++l)
            for (int s = 0; s + k <= n; ++s) {
                long long c = 0;
                for (int i = 0; i < k; ++i) c += abs(p[l + i] - (s + i));
                best = min(best, c);
            }
        return best;
    }
};`,
    cases: [
      { name: "example", args: ["{1, 0, 0, 1, 0, 1}", "2"] },
      { name: "example 2", args: ["{1, 0, 0, 0, 0, 0, 1, 1}", "3"] },
      { name: "already together", args: ["{1, 1, 0, 1}", "2"] },
      { name: "k = 1", args: ["{0, 1, 0}", "1"] },
      { name: "even k", args: ["{1, 0, 1, 0, 1, 0, 0, 1}", "4"] },
    ],
    random: { count: 400, gen: "{ nums = rnd_vec(rnd(1, 10), 0, 1); nums[rnd(0, nums.size() - 1)] = 1; int lt_m = count(nums.begin(), nums.end(), 1); k = rnd(1, lt_m); }" },
    stress: { label: "10⁵ elements, k = 2·10⁴", gen: "nums = rnd_vec(100000, 0, 1); k = 20000;" },
  },
});
