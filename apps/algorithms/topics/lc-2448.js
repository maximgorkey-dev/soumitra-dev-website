import { light } from "./leet-light.js";

export const lc2448 = light({
  number: 2448,
  title: "Minimum Cost to Make Array Equal",
  slug: "minimum-cost-to-make-array-equal",
  difficulty: "H",
  pattern: "C1",
  topic: "C1 · The median lemma",
  see: 462,
  themes: ["Make the array", "Weighted median"],
  blurb: "Element i costs cost[i] per unit move. The cheapest common target is a weighted median: where half the total cost weight lies on each side.",
  statement: [
    "Changing nums[i] by 1 costs cost[i]. Return the minimum total cost to make every element equal.",
    "Up to 10⁵ elements; values and costs up to 10⁶. The answer fits in 64 bits.",
  ],
  hints: [
    "Think of element i as cost[i] copies of nums[i]. What does that make the problem?",
    "462 on the expanded multiset: the median of the copies is optimal.",
    "You do not need to expand: sort by value and walk until the accumulated cost reaches half the total.",
    "Alternatively, the cost is convex in the target, so a ternary or binary search on the slope works.",
  ],
  brute: "Try every element's value as the target: O(n²), 10¹⁰ at the limit.",
  invariant: "f(t) = Σ cost[i] · |nums[i] − t| is convex and piecewise linear; its slope at t is (weight ≤ t) − (weight > t), which crosses zero at the weighted median.",
  traps: [
    "Overflow: the answer can reach 10¹⁷. Use long long everywhere, including the total weight.",
    "Choosing the ordinary median: weights change the answer.",
    "Ties at exactly half the weight: any target between the two middle values is optimal.",
  ],
  followUps: [
    "462: all costs 1.",
    "296 Best Meeting Point: weighted medians separately in each axis.",
    "Costs that grow quadratically with distance: the weighted mean, not the median.",
  ],
  explanation: [
    "Moving element i by one unit costs cost[i], which is the same as having cost[i] identical copies of nums[i], each moved at cost 1. In the expanded problem the median minimises the total distance (462), and the median of the copies is the weighted median.",
    "To find it, sort the pairs by value, compute the total weight W, and walk from the smallest until the accumulated weight reaches at least W / 2. That value is the target. One more pass sums cost[i] · |nums[i] − target|.",
    { tip: "Signal: \"make all equal\" with a per-element cost per unit. The weighted median is optimal; sort and accumulate to half the total weight." },
  ],
  analysis: {
    time: "O(n log n)",
    space: "O(n) for the sorted pairs",
    notes: ["A binary search on the target comparing f(t) and f(t + 1) also works, at O(n log(range))."],
  },
  tests: {
    fn: "minCost",
    args: [{ type: "vector<int>", name: "nums" }, { type: "vector<int>", name: "cost" }],
    starter: `class Solution {
public:
    long long minCost(vector<int>& nums, vector<int>& cost) {

    }
};`,
    reference: `class Solution {
public:
    long long minCost(vector<int>& nums, vector<int>& cost) {
        int n = nums.size();
        vector<pair<int, int>> p(n);
        long long total = 0;
        for (int i = 0; i < n; ++i) p[i] = {nums[i], cost[i]}, total += cost[i];
        sort(p.begin(), p.end());
        long long acc = 0;
        int target = p.back().first;
        for (auto [v, c] : p)
            if ((acc += c) * 2 >= total) { target = v; break; }  // the weighted median
        long long ans = 0;
        for (auto [v, c] : p) ans += (long long)c * abs(v - target);
        return ans;
    }
};`,
    brute: `class Solution {
public:
    // Every element's value as the target: O(n^2).
    long long minCost(vector<int>& nums, vector<int>& cost) {
        long long best = LLONG_MAX;
        for (int t : nums) {
            long long s = 0;
            for (size_t i = 0; i < nums.size(); ++i) s += (long long)cost[i] * abs(nums[i] - t);
            best = min(best, s);
        }
        return best;
    }
};`,
    cases: [
      { name: "example", args: ["{1, 3, 5, 2}", "{2, 3, 1, 14}"] },
      { name: "example 2", args: ["{2, 2, 2, 2, 2}", "{4, 2, 8, 1, 3}"] },
      { name: "one element", args: ["{9}", "{100}"] },
      { name: "heavy outlier", args: ["{1, 2, 1000000}", "{1, 1, 1000000}"] },
    ],
    random: { count: 400, gen: "{ int lt_n = rnd(1, 8); nums = rnd_vec(lt_n, 1, 12); cost = rnd_vec(lt_n, 1, 9); }" },
    stress: { label: "10⁵ elements of up to 10⁶", gen: "nums = rnd_vec(100000, 1, 1000000); cost = rnd_vec(100000, 1, 1000000);" },
  },
});
