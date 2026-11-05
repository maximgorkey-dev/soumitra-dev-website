import { light } from "./leet-light.js";

export const lc1439 = light({
  number: 1439,
  title: "Find the Kth Smallest Sum of a Matrix With Sorted Rows",
  slug: "find-the-kth-smallest-sum-of-a-matrix-with-sorted-rows",
  difficulty: "H",
  pattern: "E2",
  topic: "E2 · Two heaps, or a k-way merge",
  themes: ["K-way merge", "Keep only k"],
  blurb: "Fold the rows in one at a time, keeping only the k smallest partial sums: anything beyond the k-th can never become one of the k smallest final sums.",
  statement: [
    "An m × n matrix has every row sorted. Choose one element from each row; the sum of the choices is an array sum. Return the k-th smallest array sum.",
    "m, n ≤ 40; values up to 5000; k ≤ min(200, nᵐ).",
  ],
  hints: [
    "With two rows, this is 373: the k smallest pair sums.",
    "After combining two rows, do you need more than the k smallest partial sums?",
    "No: any partial sum ranked beyond k has at least k smaller ones, each extendable the same way. Fold row by row.",
  ],
  brute: "Enumerate all nᵐ choices: exponential.",
  invariant: "After folding in rows 0..r, the list holds the k smallest sums choosing one element from each of those rows (or all of them, if fewer).",
  traps: [
    "Keeping all partial sums: nᵐ explodes.",
    "Forgetting the min with the total count: on the first rows there may be fewer than k sums.",
  ],
  followUps: [
    "Merge each fold with a heap (373) instead of sorting n · k sums: O(m · k log k).",
    "Binary search the answer and count sums ≤ x with a pruned DFS.",
    "2386 Find the K-Sum of an Array: a heap over subsets.",
  ],
  explanation: [
    "Start with the partial sums {0}. For each row, form every partial sum plus every element, sort, and keep only the k smallest.",
    "Pruning to k is safe: if a partial sum s has k smaller partial sums, then for any completion, those k sums with the same completion are all smaller, so s can never be among the k smallest final sums.",
    "After the last row, the answer is the k-th element.",
    { tip: "Signal: k-th smallest over a product of choices. Combine one dimension at a time and truncate to k after each." },
  ],
  analysis: {
    time: "O(m · n · k log(n · k))",
    space: "O(n · k)",
    notes: ["With k ≤ 200 and n ≤ 40 each fold sorts at most 8000 sums."],
  },
  tests: {
    fn: "kthSmallest",
    args: [{ type: "vector<vector<int>>", name: "mat" }, { type: "int", name: "k" }],
    starter: `class Solution {
public:
    int kthSmallest(vector<vector<int>>& mat, int k) {

    }
};`,
    reference: `class Solution {
public:
    int kthSmallest(vector<vector<int>>& mat, int k) {
        vector<int> sums{0};
        for (auto& row : mat) {
            vector<int> next;
            for (int s : sums) for (int x : row) next.push_back(s + x);
            sort(next.begin(), next.end());
            if ((int)next.size() > k) next.resize(k);  // the rest can never rank in the top k
            sums = move(next);
        }
        return sums[k - 1];
    }
};`,
    brute: `class Solution {
public:
    // Every choice of one element per row: O(n^m).
    int kthSmallest(vector<vector<int>>& mat, int k) {
        vector<int> sums{0};
        for (auto& row : mat) {
            vector<int> next;
            for (int s : sums) for (int x : row) next.push_back(s + x);
            sums = move(next);
        }
        sort(sums.begin(), sums.end());
        return sums[k - 1];
    }
};`,
    cases: [
      { name: "example", args: ["{{1, 3, 11}, {2, 4, 6}}", "5"] },
      { name: "example 2", args: ["{{1, 3, 11}, {2, 4, 6}}", "9"] },
      { name: "example 3", args: ["{{1, 10, 10}, {1, 4, 5}, {2, 3, 6}}", "7"] },
      { name: "one row", args: ["{{4, 5, 9}}", "2"] },
    ],
    random: { count: 400, gen: "{ int lt_m = rnd(1, 4), lt_n = rnd(1, 4); mat.clear(); for (int i = 0; i < lt_m; ++i) mat.push_back(rnd_sorted(lt_n, 1, 9)); int lt_t = 1; for (int i = 0; i < lt_m; ++i) lt_t *= lt_n; k = rnd(1, min(200, lt_t)); }" },
    stress: { label: "40 × 40, k = 200", gen: "{ mat.clear(); for (int i = 0; i < 40; ++i) mat.push_back(rnd_sorted(40, 1, 5000)); k = 200; }" },
  },
});
