import { light } from "./leet-light.js";

export const lc1499 = light({
  number: 1499,
  title: "Max Value of Equation",
  slug: "max-value-of-equation",
  difficulty: "H",
  pattern: "A3",
  topic: "A3 · Monotonic deque",
  see: 239,
  themes: ["Sliding window", "Separate the variables"],
  blurb: "yᵢ + yⱼ + |xᵢ − xⱼ| with xᵢ < xⱼ splits into (yᵢ − xᵢ) + (yⱼ + xⱼ). Keep the window maximum of yᵢ − xᵢ over the last k units of x in a deque.",
  statement: [
    "Points (x, y) are given sorted by strictly increasing x. Over all pairs i < j with xⱼ − xᵢ ≤ k, return the maximum of yᵢ + yⱼ + |xᵢ − xⱼ|. At least one such pair exists.",
    "Up to 10⁵ points; coordinates between −10⁸ and 10⁸; k up to 2·10⁸.",
  ],
  hints: [
    "Since x is increasing and i < j, |xᵢ − xⱼ| = xⱼ − xᵢ. Rewrite the expression.",
    "(yᵢ − xᵢ) + (yⱼ + xⱼ). For a fixed j, you want the largest yᵢ − xᵢ among earlier points within k.",
    "The allowed i form a window that slides right as j does.",
    "A deque with decreasing yᵢ − xᵢ: drop fronts with xⱼ − xᵢ > k, read the front, then push j after dropping smaller backs.",
  ],
  brute: "Every pair within distance k: O(n²) when k covers everything, 5·10⁹ pairs at 10⁵.",
  invariant: "Before handling j, the deque holds earlier points with xⱼ − xᵢ ≤ k in increasing x and strictly decreasing yᵢ − xᵢ; its front is the best partner for j.",
  traps: [
    "Reading the front before evicting points that are more than k away.",
    "Pushing j before reading the front, which pairs j with itself.",
    "Overflow: y + y + x differences reach 4·10⁸, fine in int, but use long long to be safe.",
  ],
  followUps: [
    "The points are not sorted: sort by x first.",
    "Minimise instead: keep the window minimum.",
    "A max-heap of (y − x, x) with lazy eviction: O(n log n).",
  ],
  explanation: [
    "With xᵢ < xⱼ the absolute value opens up: yᵢ + yⱼ + xⱼ − xᵢ = (yᵢ − xᵢ) + (yⱼ + xⱼ). The second bracket depends only on j, so for each j the task is to find the largest yᵢ − xᵢ among earlier points with xᵢ ≥ xⱼ − k.",
    "Those candidates form a sliding window over the sorted points. Keep a deque of earlier indices whose yᵢ − xᵢ values decrease from front to back. For each j: pop fronts that are too far left; if anything remains, the front gives a candidate answer; then pop backs whose value is ≤ yⱼ − xⱼ and push j.",
    "Every point enters and leaves the deque once: O(n).",
    { tip: "Signal: maximise f(i) + g(j) over pairs in a window. Separate the variables, then it is a sliding-window maximum of f." },
  ],
  analysis: {
    time: "O(n)",
    space: "O(n) for the deque",
    notes: ["The heap version is O(n log n) and simpler to argue about, since stale entries are skipped when they surface."],
  },
  tests: {
    fn: "findMaxValueOfEquation",
    args: [{ type: "vector<vector<int>>", name: "points" }, { type: "int", name: "k" }],
    starter: `class Solution {
public:
    int findMaxValueOfEquation(vector<vector<int>>& points, int k) {

    }
};`,
    reference: `class Solution {
public:
    int findMaxValueOfEquation(vector<vector<int>>& points, int k) {
        deque<int> dq;  // indices, y - x decreasing from front to back
        long long best = LLONG_MIN;
        auto key = [&](int i) { return (long long)points[i][1] - points[i][0]; };
        for (int j = 0; j < (int)points.size(); ++j) {
            while (!dq.empty() && points[j][0] - points[dq.front()][0] > k) dq.pop_front();
            if (!dq.empty()) best = max(best, key(dq.front()) + points[j][1] + points[j][0]);
            while (!dq.empty() && key(dq.back()) <= key(j)) dq.pop_back();
            dq.push_back(j);
        }
        return best;
    }
};`,
    brute: `class Solution {
public:
    // Every pair within distance k: O(n^2).
    int findMaxValueOfEquation(vector<vector<int>>& points, int k) {
        long long best = LLONG_MIN;
        int n = points.size();
        for (int i = 0; i < n; ++i)
            for (int j = i + 1; j < n && points[j][0] - points[i][0] <= k; ++j)
                best = max(best, (long long)points[i][1] + points[j][1] + points[j][0] - points[i][0]);
        return best;
    }
};`,
    cases: [
      { name: "example", args: ["{{1, 3}, {2, 0}, {5, 10}, {6, -10}}", "1"] },
      { name: "example 2", args: ["{{0, 0}, {3, 0}, {9, 2}}", "3"] },
      { name: "two points", args: ["{{-5, 4}, {5, -2}}", "10"] },
      { name: "far partner wins", args: ["{{0, 10}, {1, -10}, {2, -10}, {3, 0}}", "3"] },
    ],
    random: { count: 400, gen: "{ int lt_n = rnd(2, 8), lt_x = rnd(-5, 5); points.clear(); for (int i = 0; i < lt_n; ++i) { lt_x += rnd(1, 3); points.push_back({lt_x, rnd(-6, 6)}); } k = rnd(3, 12); }" },
    stress: { label: "10⁵ points, k covers all", gen: "points.clear(); for (int i = 0; i < 100000; ++i) points.push_back({i * 1000 - 50000000, rnd(-100000000, 100000000)}); k = 200000000;" },
  },
});
