import { light } from "./leet-light.js";

export const lc2233 = light({
  number: 2233,
  title: "Maximum Product After K Increments",
  slug: "maximum-product-after-k-increments",
  difficulty: "M",
  pattern: "D2",
  topic: "D2 · Greedy with a heap and regret",
  themes: ["Heap", "Balancing"],
  blurb: "Each +1 should go to the current minimum: raising a smaller factor multiplies the product by more. A min-heap does it k times.",
  statement: [
    "Given non-negative integers nums and k, you may add 1 to any element, k times in total. Return the largest possible product, modulo 10⁹ + 7.",
    "Up to 10⁵ elements and k up to 10⁵; values up to 10⁶.",
  ],
  hints: [
    "Adding 1 to x multiplies the product by (x + 1) / x. Which x gives the biggest factor?",
    "The smallest one.",
    "Repeat k times with a min-heap. Take the modulus only at the end, after choosing.",
  ],
  brute: "Try every way to split the k increments among the elements: O(C(n + k, k) · n).",
  invariant: "After j increments, the multiset is the one with the largest product among all ways to spend j increments.",
  traps: [
    "Comparing products after taking the modulus: you cannot pick a maximum of residues.",
    "A zero: incrementing it is always the best move, and the heap handles it naturally.",
    "Overflow in the final product: multiply in long long and reduce each step.",
  ],
  followUps: [
    "k up to 10⁹: sort, then level the smallest elements in bulk instead of one at a time.",
    "Decrements instead, minimising the product.",
    "Same idea, other measures: 1962 Remove Stones, 2208 Halve Array Sum.",
  ],
  explanation: [
    "One increment turns x into x + 1, which multiplies the product by 1 + 1/x. That factor is largest when x is smallest, and an exchange argument shows it stays optimal across all k steps: the final multiset is as level as possible.",
    "So pop the minimum, push it back plus one, k times. Then multiply everything modulo 10⁹ + 7.",
    { tip: "Signal: spend k unit upgrades to maximise a product or minimise a maximum. Always upgrade the current worst element, using a heap." },
  ],
  analysis: {
    time: "O((n + k) log n)",
    space: "O(n)",
    notes: [],
  },
  tests: {
    fn: "maximumProduct",
    args: [{ type: "vector<int>", name: "nums" }, { type: "int", name: "k" }],
    starter: `class Solution {
public:
    int maximumProduct(vector<int>& nums, int k) {

    }
};`,
    reference: `class Solution {
public:
    int maximumProduct(vector<int>& nums, int k) {
        const long long MOD = 1000000007;
        priority_queue<int, vector<int>, greater<int>> heap(nums.begin(), nums.end());
        while (k-- > 0) {
            int x = heap.top();
            heap.pop();
            heap.push(x + 1);
        }
        long long product = 1;
        while (!heap.empty()) { product = product * heap.top() % MOD; heap.pop(); }
        return product;
    }
};`,
    brute: `class Solution {
public:
    // Every split of k among the elements, exact products: exponential.
    long long best = -1;
    void go(vector<int>& nums, size_t i, int k) {
        if (i + 1 == nums.size()) {
            nums[i] += k;
            long long p = 1;
            for (int x : nums) p *= x;
            best = max(best, p);
            nums[i] -= k;
            return;
        }
        for (int t = 0; t <= k; ++t) { nums[i] += t; go(nums, i + 1, k - t); nums[i] -= t; }
    }
    int maximumProduct(vector<int>& nums, int k) {
        best = -1;
        go(nums, 0, k);
        return best % 1000000007;
    }
};`,
    cases: [
      { name: "example", args: ["{0, 4}", "5"] },
      { name: "example 2", args: ["{6, 3, 3, 2}", "2"] },
      { name: "one element", args: ["{7}", "3"] },
      { name: "all zeros", args: ["{0, 0, 0}", "2"] },
    ],
    random: { count: 400, gen: "{ nums = rnd_vec(rnd(1, 4), 0, 6); k = rnd(1, 6); }" },
    stress: { label: "10⁵ elements, k = 10⁵", gen: "{ nums = rnd_vec(100000, 0, 1000000); k = 100000; }" },
  },
});
