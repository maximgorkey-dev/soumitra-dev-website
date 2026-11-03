import { light } from "./leet-light.js";

export const lc862 = light({
  number: 862,
  title: "Shortest Subarray with Sum at Least K",
  slug: "shortest-subarray-with-sum-at-least-k",
  difficulty: "H",
  pattern: "A3",
  topic: "A3 · Monotonic deque",
  see: 239,
  themes: ["Subarray sums", "Negative numbers"],
  blurb: "Negatives break the sliding window. Keep a deque of prefix sums with increasing values: pop the front while it completes a sum ≥ k, pop the back while it is no smaller than the new prefix.",
  statement: [
    "Return the length of the shortest non-empty contiguous subarray whose sum is at least k, or −1 if there is none. Elements may be negative.",
    "Up to 10⁵ elements between −10⁵ and 10⁵; 1 ≤ k ≤ 10⁹.",
  ],
  hints: [
    "Why does a two-pointer sliding window fail here?",
    "With negatives, shrinking the window can increase the sum. Work with prefix sums: you want j − i minimal with P[j] − P[i] ≥ k.",
    "If i < i′ and P[i] ≥ P[i′], start i is never better than i′ for any later j. Drop it.",
    "Keep candidate starts in a deque with increasing P. For each j, pop from the front while P[j] − P[front] ≥ k (recording lengths), then pop from the back while P[back] ≥ P[j], then push j.",
  ],
  brute: "Every pair of prefix sums: O(n²), 5·10⁹ at 10⁵ when there is no answer.",
  invariant: "The deque holds indices with strictly increasing prefix sums. Any start removed from the back is dominated by a later, lower prefix; any start removed from the front has found its best (shortest) end.",
  traps: [
    "Using a plain sliding window, which is only correct when all elements are non-negative (209).",
    "Prefix sums overflow int: 10⁵ · 10⁵ = 10¹⁰. Use long long.",
    "Forgetting the empty prefix P[−1] = 0 in the deque, so a subarray starting at index 0 is missed.",
    "Popping the front only once per j: several fronts may complete a sum ≥ k.",
  ],
  followUps: [
    "209 Minimum Size Subarray Sum: all positive, so a two-pointer window suffices.",
    "Longest subarray with sum at least k: keep the decreasing minima of prefixes and binary search, or scan from the right.",
    "1499 Max Value of Equation: the same deque over a window with a key yᵢ − xᵢ.",
  ],
  explanation: [
    "The usual window fails because a negative number makes the sum non-monotone in the window size. Rephrase with prefix sums P (with P[0] = 0 for the empty prefix): find the smallest j − i with P[j] − P[i] ≥ k.",
    "Two pruning rules make this linear. First, if a start i satisfies P[j] − P[i] ≥ k, then no later j can do better with this i, since it would only be longer, so record j − i and discard i. Second, if a newer start i′ has P[i′] ≤ P[i] for an older i, then i′ is better than i for every future j (closer and with a smaller prefix), so discard i.",
    "A deque implements both: starts that have matched come off the front, dominated starts come off the back. The surviving prefixes are increasing, so the front is always the smallest prefix, the most likely to complete k.",
    { tip: "Signal: \"shortest subarray with sum ≥ k\" and negative numbers. Prefix sums plus a monotonic deque of candidate starts." },
  ],
  analysis: {
    time: "O(n): every index enters and leaves the deque once",
    space: "O(n)",
    notes: [
      "An O(n log n) alternative keeps a map of prefix sums and searches it for P[j] − k.",
      "Store indices in the deque and read P through them.",
    ],
  },
  tests: {
    fn: "shortestSubarray",
    args: [{ type: "vector<int>", name: "nums" }, { type: "int", name: "k" }],
    starter: `class Solution {
public:
    int shortestSubarray(vector<int>& nums, int k) {

    }
};`,
    reference: `class Solution {
public:
    int shortestSubarray(vector<int>& nums, int k) {
        int n = nums.size(), best = n + 1;
        vector<long long> p(n + 1);
        for (int i = 0; i < n; ++i) p[i + 1] = p[i] + nums[i];
        deque<int> dq;  // starts with increasing p
        for (int j = 0; j <= n; ++j) {
            while (!dq.empty() && p[j] - p[dq.front()] >= k) best = min(best, j - dq.front()), dq.pop_front();
            while (!dq.empty() && p[dq.back()] >= p[j]) dq.pop_back();
            dq.push_back(j);
        }
        return best <= n ? best : -1;
    }
};`,
    brute: `class Solution {
public:
    // Every subarray: O(n^2).
    int shortestSubarray(vector<int>& nums, int k) {
        int n = nums.size(), best = n + 1;
        for (int i = 0; i < n; ++i) {
            long long s = 0;
            for (int j = i; j < n && j - i + 1 < best; ++j) {
                s += nums[j];
                if (s >= k) best = j - i + 1;
            }
        }
        return best <= n ? best : -1;
    }
};`,
    cases: [
      { name: "example", args: ["{1}", "1"] },
      { name: "none", args: ["{1, 2}", "4"] },
      { name: "negative in the middle", args: ["{2, -1, 2}", "3"] },
      { name: "negative resets", args: ["{84, -37, 32, 40, 95}", "167"] },
      { name: "big values", args: ["{100000, 100000, -100000, 100000}", "200000"] },
      { name: "all negative", args: ["{-5, -3, -1}", "1"] },
    ],
    random: { count: 400, gen: "nums = rnd_vec(rnd(1, 10), -5, 8); k = rnd(1, 15);" },
    stress: { label: "10⁵ elements, no answer", gen: "nums = rnd_vec(100000, -100000, 100000); for (int& x : nums) x = -abs(x); k = 1;" },
  },
});
