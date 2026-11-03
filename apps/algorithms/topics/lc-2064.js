import { light } from "./leet-light.js";

export const lc2064 = light({
  number: 2064,
  title: "Minimized Maximum of Products Distributed to Any Store",
  slug: "minimized-maximum-of-products-distributed-to-any-store",
  difficulty: "M",
  pattern: "B1",
  topic: "B1 · Binary search on the answer",
  see: 875,
  themes: ["Minimise the maximum", "Ceiling division"],
  blurb: "Search the cap x; product type i needs ⌈q / x⌉ stores. Feasible when the total is at most n.",
  statement: [
    "There are n stores and several product types with given quantities. Each store gets at most one product type (possibly none), any amount of it, and every unit must be placed. Minimise the largest amount any store receives.",
    "Up to 10⁵ product types and stores (types ≤ n); quantities up to 10⁵.",
  ],
  hints: [
    "With a cap of x per store, how many stores does a type with quantity q need?",
    "⌈q / x⌉.",
    "Feasible when Σ ⌈qᵢ / x⌉ ≤ n. A larger cap needs fewer stores.",
    "Binary search x in [1, max q].",
  ],
  brute: "Try every cap upward from 1: O(m · max q), 10¹⁰ steps.",
  invariant: "stores(lo − 1) > n ≥ stores(hi).",
  traps: [
    "Ceiling division without floating point: (q + x − 1) / x.",
    "A store may hold only one type; that is what makes the count a sum of ceilings.",
  ],
  followUps: [
    "A heap that repeatedly gives one more store to the type with the largest current share: O(n log m), also correct.",
    "1870 Minimum Speed to Arrive on Time: ceilings again, with a fractional last leg.",
  ],
  explanation: [
    "Fix a cap x. Each type must be spread over enough stores that none gets more than x, which takes ⌈q / x⌉ stores, and types cannot share a store. So x works exactly when Σ ⌈qᵢ / x⌉ ≤ n.",
    "That count falls as x grows, so binary search the smallest x that works, between 1 and the largest quantity.",
    { tip: "Signal: \"minimise the maximum load\" with indivisible bins per item type. Search the cap; count bins with ceiling division." },
  ],
  analysis: {
    time: "O(m log(max q))",
    space: "O(1)",
    notes: ["About 17 passes."],
  },
  tests: {
    fn: "minimizedMaximum",
    args: [{ type: "int", name: "n" }, { type: "vector<int>", name: "quantities" }],
    starter: `class Solution {
public:
    int minimizedMaximum(int n, vector<int>& quantities) {

    }
};`,
    reference: `class Solution {
public:
    int minimizedMaximum(int n, vector<int>& quantities) {
        int lo = 1, hi = *max_element(quantities.begin(), quantities.end());
        while (lo < hi) {
            int x = lo + (hi - lo) / 2;
            long long stores = 0;
            for (int q : quantities) stores += (q + x - 1) / x;  // ceil(q / x)
            if (stores <= n) hi = x;
            else lo = x + 1;
        }
        return lo;
    }
};`,
    brute: `class Solution {
public:
    // Every cap from 1 upward: O(m * max q).
    int minimizedMaximum(int n, vector<int>& quantities) {
        for (int x = 1;; ++x) {
            long long stores = 0;
            for (int q : quantities) stores += (q + x - 1) / x;
            if (stores <= n) return x;
        }
    }
};`,
    cases: [
      { name: "example", args: ["6", "{11, 6}"] },
      { name: "example 2", args: ["7", "{15, 10, 10}"] },
      { name: "example 3", args: ["1", "{100000}"] },
      { name: "a store per unit", args: ["5", "{2, 3}"] },
    ],
    random: { count: 400, gen: "quantities = rnd_vec(rnd(1, 5), 1, 12); n = rnd(quantities.size(), 12);" },
    stress: { label: "10⁵ types, one store each", gen: "quantities = rnd_vec(100000, 1, 100000); n = 100000;" },
  },
});
