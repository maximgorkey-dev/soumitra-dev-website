import { light } from "./leet-light.js";

export const lc410 = light({
  number: 410,
  title: "Split Array Largest Sum",
  slug: "split-array-largest-sum",
  difficulty: "H",
  pattern: "B1",
  topic: "B1 · Binary search on the answer",
  see: 875,
  themes: ["Minimise the maximum", "Greedy check", "Partition DP"],
  blurb: "Binary search the largest part sum; greedily count how many parts that cap forces. The DP is the brute force.",
  statement: [
    "Split an array of non-negative integers into exactly k non-empty contiguous parts so that the largest part sum is as small as possible. Return that sum.",
    "Up to 1000 elements, each up to 10⁶; 1 ≤ k ≤ min(50, n).",
  ],
  hints: [
    "Instead of choosing the split, guess the answer. Given a cap S, can you check whether k parts suffice?",
    "Greedily extend each part until adding the next element would exceed S; count parts.",
    "If at most k parts are needed, exactly k also works (split a part further, since elements are non-negative). So the check is monotone in S.",
    "Search S in [max element, total sum].",
  ],
  brute: "DP over (prefix, parts): dp[i][j] = min over the last cut of max(dp[cut][j − 1], sum(cut … i)). O(k · n²), 5·10⁷ at the limits: acceptable here but not for larger n.",
  invariant: "parts(lo − 1) > k ≥ parts(hi), where parts(S) is the greedy count, so the answer stays in [lo, hi].",
  traps: [
    "The sum can reach 10⁹; that fits in int, barely. Use long long for safety.",
    "Requiring the greedy count to equal k: at most k is the right test.",
    "A lower bound below the maximum element.",
  ],
  followUps: [
    "1011 Capacity To Ship Packages Within D Days: the same problem.",
    "Negative numbers allowed: the greedy check breaks; use the DP.",
    "1231 Divide Chocolate: maximise the minimum part, the mirror image.",
  ],
  explanation: [
    "Fix a candidate answer S. Can the array be cut into at most k parts, each summing to at most S? Scan left to right, adding elements to the current part, and start a new part whenever the next element would push it past S. This greedy uses as few parts as possible, since cutting later never hurts.",
    "If S needs at most k parts it also works with exactly k, because a part with two or more elements can be split without raising any sum. So feasibility is monotone in S, and the answer is the smallest feasible S, between the largest element and the total.",
    "That gives O(n log Σ). The DP over (prefix, number of parts) also solves it and generalises to negative values, at O(k n²).",
    { tip: "Signal: \"minimise the largest part\". Binary search the cap and count the parts it forces." },
  ],
  analysis: {
    time: "O(n log Σ), about 30 greedy passes",
    space: "O(1)",
    notes: ["The DP is O(k n²) time and O(n k) space."],
  },
  tests: {
    fn: "splitArray",
    args: [{ type: "vector<int>", name: "nums" }, { type: "int", name: "k" }],
    starter: `class Solution {
public:
    int splitArray(vector<int>& nums, int k) {

    }
};`,
    reference: `class Solution {
public:
    int splitArray(vector<int>& nums, int k) {
        long long lo = *max_element(nums.begin(), nums.end());
        long long hi = accumulate(nums.begin(), nums.end(), 0LL);
        while (lo < hi) {
            long long cap = lo + (hi - lo) / 2;
            int parts = 1;
            long long cur = 0;
            for (int x : nums) {
                if (cur + x > cap) ++parts, cur = 0;
                cur += x;
            }
            if (parts <= k) hi = cap;  // at most k parts: exactly k also works
            else lo = cap + 1;
        }
        return lo;
    }
};`,
    brute: `class Solution {
public:
    // DP over (prefix length, parts): O(k * n^2).
    int splitArray(vector<int>& nums, int k) {
        int n = nums.size();
        vector<long long> p(n + 1);
        for (int i = 0; i < n; ++i) p[i + 1] = p[i] + nums[i];
        const long long INF = LLONG_MAX;
        vector<vector<long long>> dp(k + 1, vector<long long>(n + 1, INF));
        dp[0][0] = 0;
        for (int j = 1; j <= k; ++j)
            for (int i = 1; i <= n; ++i)
                for (int c = j - 1; c < i; ++c)
                    if (dp[j - 1][c] != INF) dp[j][i] = min(dp[j][i], max(dp[j - 1][c], p[i] - p[c]));
        return dp[k][n];
    }
};`,
    cases: [
      { name: "example", args: ["{7, 2, 5, 10, 8}", "2"] },
      { name: "example 2", args: ["{1, 2, 3, 4, 5}", "2"] },
      { name: "k = n", args: ["{1, 4, 4}", "3"] },
      { name: "k = 1", args: ["{3, 1, 4}", "1"] },
      { name: "zeros", args: ["{0, 0, 0, 5}", "2"] },
      { name: "big values", args: ["{1000000, 1000000, 1000000}", "2"] },
    ],
    random: { count: 400, gen: "nums = rnd_vec(rnd(1, 8), 0, 9); k = rnd(1, nums.size());" },
    stress: { label: "5000 elements, k = 50 (above the limit)", gen: "nums = rnd_vec(5000, 0, 1000000); k = 50;" },
  },
});
