import { light } from "./leet-light.js";

export const lc1696 = light({
  number: 1696,
  title: "Jump Game VI",
  slug: "jump-game-vi",
  difficulty: "M",
  pattern: "A3",
  topic: "A3 · Monotonic deque",
  see: 239,
  themes: ["DP over a window"],
  blurb: "dp[i] = nums[i] + max of the previous k dp values. That max is a sliding-window maximum, so keep a monotonic deque of dp indices.",
  statement: [
    "Start at index 0 of an array. From index i you may jump to any of i + 1 … i + k. Your score is the sum of the values at the indices you visit, including the first and the last. Return the maximum score on reaching the last index.",
    "Up to 10⁵ elements between −10⁴ and 10⁴; 1 ≤ k ≤ 10⁵.",
  ],
  hints: [
    "Let dp[i] be the best score that ends at i. What is its recurrence?",
    "dp[i] = nums[i] + max(dp[i − k], …, dp[i − 1]). Computed naively, that is O(nk).",
    "The max is over a window that slides by one each step. Which structure gives a sliding-window maximum in O(1) amortised?",
    "A deque of indices with decreasing dp values: drop the front when it leaves the window, drop the back while it is ≤ the new dp.",
  ],
  brute: "The DP with a loop over the previous k values: O(nk), 10¹⁰ steps when n = k = 10⁵.",
  invariant: "Before computing dp[i], the deque holds indices from the window [i − k, i − 1] with strictly decreasing dp values, and its front is the window's maximum.",
  traps: [
    "Greedy jumps (always to the best nearby value) fail; negative values must sometimes be taken.",
    "Removing the front only when it is far outside the window: check front < i − k before reading it.",
    "Popping the back with < instead of ≤ works too, but leaves more entries.",
  ],
  followUps: [
    "1425 Constrained Subsequence Sum: the same deque, but you may also start fresh (max with 0).",
    "239 Sliding Window Maximum: the underlying structure.",
    "Return the path, not just the score: store the argmax index for each dp.",
  ],
  explanation: [
    "The best score ending at i is nums[i] plus the best score at any index you could have jumped from, i − k … i − 1. That is a DP whose transition takes the maximum over the last k values.",
    "The window of k previous dp values slides right by one each step, so the maximum is a sliding-window maximum (239). Keep a deque of indices whose dp values decrease from front to back. Before computing dp[i], pop the front while it is older than i − k. The front is then the window's maximum. After computing dp[i], pop from the back every index with dp ≤ dp[i], since they are older and no better, and push i.",
    "Each index enters and leaves the deque once, so the DP runs in O(n).",
    { tip: "Signal: dp[i] = f(i) + max or min of dp over a sliding window of earlier states. Use a monotonic deque. A heap works too, in O(n log n)." },
  ],
  analysis: {
    time: "O(n)",
    space: "O(n) for dp; the deque holds at most k indices",
    notes: [
      "dp can reach 10⁹ in absolute value; int is enough, long long is safe.",
      "A max-heap of (dp, index) with lazy deletion is O(n log n) and also accepted.",
    ],
  },
  tests: {
    fn: "maxResult",
    args: [{ type: "vector<int>", name: "nums" }, { type: "int", name: "k" }],
    starter: `class Solution {
public:
    int maxResult(vector<int>& nums, int k) {

    }
};`,
    reference: `class Solution {
public:
    int maxResult(vector<int>& nums, int k) {
        int n = nums.size();
        vector<long long> dp(n);
        deque<int> dq;  // indices, dp decreasing from front to back
        for (int i = 0; i < n; ++i) {
            while (!dq.empty() && dq.front() < i - k) dq.pop_front();
            dp[i] = nums[i] + (dq.empty() ? 0 : dp[dq.front()]);
            while (!dq.empty() && dp[dq.back()] <= dp[i]) dq.pop_back();
            dq.push_back(i);
        }
        return dp[n - 1];
    }
};`,
    brute: `class Solution {
public:
    // The DP with an explicit scan of the window: O(nk).
    int maxResult(vector<int>& nums, int k) {
        int n = nums.size();
        vector<long long> dp(n, LLONG_MIN);
        dp[0] = nums[0];
        for (int i = 1; i < n; ++i)
            for (int j = max(0, i - k); j < i; ++j) dp[i] = max(dp[i], dp[j] + nums[i]);
        return dp[n - 1];
    }
};`,
    cases: [
      { name: "example", args: ["{1, -1, -2, 4, -7, 3}", "2"] },
      { name: "example 2", args: ["{10, -5, -2, 4, 0, 3}", "3"] },
      { name: "example 3", args: ["{1, -5, -20, 4, -1, 3, -6, -3}", "2"] },
      { name: "one element", args: ["{-4}", "1"] },
      { name: "k = 1 takes everything", args: ["{3, -1, -1, 2}", "1"] },
    ],
    random: { count: 400, gen: "nums = rnd_vec(rnd(1, 10), -8, 8); k = rnd(1, 5);" },
    stress: { label: "n = k = 10⁵", gen: "nums = rnd_vec(100000, -10000, 10000); k = 100000;" },
  },
});
