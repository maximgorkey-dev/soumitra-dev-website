import { light } from "./leet-light.js";

export const lc2386 = light({
  number: 2386,
  title: "Find the K-Sum of an Array",
  slug: "find-the-k-sum-of-an-array",
  difficulty: "H",
  pattern: "E2",
  topic: "E2 · Two heaps, or a k-way merge",
  themes: ["Heap over subsets", "Reframing"],
  blurb: "The largest sum takes every positive. Every other subsequence is that minus a subset of |nums|; enumerate those subset sums in increasing order with a heap that branches \"add the next\" or \"swap the last for the next\".",
  statement: [
    "The K-Sum of nums is the k-th largest sum over all subsequences (the empty one counts, with sum 0; equal sums count separately). Return it.",
    "Up to 10⁵ elements with values between −10⁹ and 10⁹; k ≤ min(2000, 2ⁿ).",
  ],
  hints: [
    "What is the largest subsequence sum?",
    "The sum of all positives. Any other sum is that minus something: dropping a positive or adding a negative both subtract |x|.",
    "So find the k-th smallest subset sum of the absolute values. Sort them.",
    "From subset ending at index i, two children: add a[i + 1], or replace a[i] by a[i + 1]. Every subset appears exactly once.",
  ],
  brute: "Enumerate all 2ⁿ subsequence sums and sort: O(2ⁿ · n).",
  invariant: "Pops come out in non-decreasing order of subset sum, and each non-empty subset of the sorted absolute values is pushed exactly once.",
  traps: [
    "Overflow: sums reach 10¹⁴; use long long.",
    "Forgetting the empty subset (sum 0 subtracted), which gives the maximum itself for k = 1.",
    "Trying to enumerate subsequences directly with mixed signs; take absolute values first.",
  ],
  followUps: [
    "Binary search the subtracted amount and count subset sums ≤ x with a pruned DFS (capped at k).",
    "The k smallest sums instead: the same heap, without the reframing.",
  ],
  explanation: [
    "Let best be the sum of all positive elements. Changing the choice for any element x costs |x|: leaving out a positive, or including a negative. So the k-th largest sum is best minus the k-th smallest subset sum of the values |x|, counting the empty subset first.",
    "Sort the absolute values a. Generate subsets as a tree: the root is {a[0]}; a subset whose largest index is i has two children, one that also takes a[i + 1] and one that swaps a[i] for a[i + 1]. Both children are no smaller, so a min-heap pops subset sums in increasing order.",
    "Pop k − 1 times (the empty subset is the first); the last popped sum is subtracted from best.",
    { tip: "Signal: k-th best over 2ⁿ combinations with small k. Find the best one, then enumerate the cheapest deviations with a heap whose moves never decrease the cost." },
  ],
  analysis: {
    time: "O(n log n + k log k)",
    space: "O(n + k)",
    notes: [],
  },
  tests: {
    fn: "kSum",
    args: [{ type: "vector<int>", name: "nums" }, { type: "int", name: "k" }],
    starter: `class Solution {
public:
    long long kSum(vector<int>& nums, int k) {

    }
};`,
    reference: `class Solution {
public:
    long long kSum(vector<int>& nums, int k) {
        long long best = 0;
        for (int& x : nums) { if (x > 0) best += x; x = abs(x); }
        sort(nums.begin(), nums.end());
        using P = pair<long long, int>;
        priority_queue<P, vector<P>, greater<P>> heap;
        heap.push({nums[0], 0});
        long long cut = 0;
        for (int n = nums.size(); --k > 0;) {
            auto [s, i] = heap.top();
            heap.pop();
            cut = s;
            if (i + 1 < n) {
                heap.push({s + nums[i + 1], i + 1});            // also take the next
                heap.push({s - nums[i] + nums[i + 1], i + 1});  // swap the last for the next
            }
        }
        return best - cut;
    }
};`,
    brute: `class Solution {
public:
    // Every subsequence sum, sorted: O(2^n * n).
    long long kSum(vector<int>& nums, int k) {
        int n = nums.size();
        vector<long long> sums;
        for (int mask = 0; mask < (1 << n); ++mask) {
            long long s = 0;
            for (int i = 0; i < n; ++i) if (mask >> i & 1) s += nums[i];
            sums.push_back(s);
        }
        sort(sums.rbegin(), sums.rend());
        return sums[k - 1];
    }
};`,
    cases: [
      { name: "example", args: ["{2, 4, -2}", "5"] },
      { name: "example 2", args: ["{1, -2, 3, 4, -10, 12}", "16"] },
      { name: "k = 1", args: ["{-5, -3}", "1"] },
      { name: "all subsets", args: ["{1, 2}", "4"] },
      { name: "large values", args: ["{1000000000, 1000000000, -1000000000}", "3"] },
    ],
    random: { count: 400, gen: "{ nums = rnd_vec(rnd(1, 10), -6, 6); k = rnd(1, min(2000, 1 << nums.size())); }" },
    stress: { label: "10⁵ elements, k = 2000", gen: "{ nums = rnd_vec(100000, -1000000000, 1000000000); k = 2000; }" },
  },
});
