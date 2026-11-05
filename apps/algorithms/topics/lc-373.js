import { light } from "./leet-light.js";

export const lc373 = light({
  number: 373,
  title: "Find K Pairs with Smallest Sums",
  slug: "find-k-pairs-with-smallest-sums",
  difficulty: "M",
  pattern: "E2",
  topic: "E2 · Two heaps, or a k-way merge",
  themes: ["K-way merge", "Heap"],
  blurb: "Treat each nums1[i] as the head of a sorted list nums1[i] + nums2[j]; merge the lists with a min-heap and stop after k pops.",
  statement: [
    "Given two sorted arrays nums1 and nums2 and k, return k pairs (u from nums1, v from nums2) with the smallest sums u + v. Any order, and any choice among equal sums, is accepted.",
    "Up to 10⁵ elements each, values between −10⁹ and 10⁹, k up to 10⁴ (and at most the number of pairs).",
  ],
  hints: [
    "For a fixed i, the sums nums1[i] + nums2[j] are sorted in j. How many sorted lists is that?",
    "n sorted lists: a k-way merge with a min-heap.",
    "You only need the first k heads to start: no list beyond index k − 1 can contribute.",
  ],
  brute: "Form every pair and sort by sum: O(n · m log(n · m)).",
  invariant: "The heap holds, for each list started, its next unpopped pair; the next smallest pair overall is always the heap's top.",
  traps: [
    "Pushing both (i + 1, j) and (i, j + 1) from each pop without a visited set: duplicates.",
    "Overflow: sums reach ±2 · 10⁹; compare as long long.",
    "Seeding the heap with all n heads when k is small: only min(n, k) are needed.",
  ],
  followUps: [
    "Binary search the k-th sum, then count pairs below it with two pointers.",
    "Three arrays: merge two, keep k, merge the third (as in 1439).",
    "378 and 786 are the same merge over a matrix and over fractions.",
  ],
  explanation: [
    "Row i is the sorted list nums1[i] + nums2[0], nums1[i] + nums2[1], and so on. The answer is the first k elements of the merge of all rows.",
    "Seed a min-heap with (i, 0) for i < min(n, k). Pop the smallest, record its pair, and push (i, j + 1) from the same row. Each row advances only through its own pointer, so no pair is pushed twice.",
    { tip: "Signal: k smallest of a sorted grid or of combinations of sorted lists. A k-way merge with a heap of row heads." },
  ],
  analysis: {
    time: "O(k log min(n, k))",
    space: "O(min(n, k))",
    notes: [],
  },
  tests: {
    fn: "kSmallestPairs",
    args: [{ type: "vector<int>", name: "nums1" }, { type: "vector<int>", name: "nums2" }, { type: "int", name: "k" }],
    normalize: `[&](const vector<vector<int>>& p) {
    vector<long long> sums;
    for (auto& q : p) {
        if (q.size() != 2 || !binary_search(nums1.begin(), nums1.end(), q[0]) || !binary_search(nums2.begin(), nums2.end(), q[1]))
            return vector<long long>{LLONG_MIN};
        sums.push_back((long long)q[0] + q[1]);
    }
    sort(sums.begin(), sums.end());
    return sums;
}`,
    starter: `class Solution {
public:
    vector<vector<int>> kSmallestPairs(vector<int>& nums1, vector<int>& nums2, int k) {

    }
};`,
    reference: `class Solution {
public:
    vector<vector<int>> kSmallestPairs(vector<int>& nums1, vector<int>& nums2, int k) {
        using T = tuple<long long, int, int>;
        priority_queue<T, vector<T>, greater<T>> heap;
        for (int i = 0; i < (int)nums1.size() && i < k; ++i) heap.push({(long long)nums1[i] + nums2[0], i, 0});
        vector<vector<int>> res;
        while (k-- > 0 && !heap.empty()) {
            auto [s, i, j] = heap.top();
            heap.pop();
            res.push_back({nums1[i], nums2[j]});
            if (j + 1 < (int)nums2.size()) heap.push({(long long)nums1[i] + nums2[j + 1], i, j + 1});
        }
        return res;
    }
};`,
    brute: `class Solution {
public:
    // Every pair, sorted by sum: O(nm log nm).
    vector<vector<int>> kSmallestPairs(vector<int>& nums1, vector<int>& nums2, int k) {
        vector<vector<int>> all;
        for (int u : nums1) for (int v : nums2) all.push_back({u, v});
        sort(all.begin(), all.end(), [](auto& a, auto& b) { return (long long)a[0] + a[1] < (long long)b[0] + b[1]; });
        all.resize(min((size_t)k, all.size()));
        return all;
    }
};`,
    cases: [
      { name: "example", args: ["{1, 7, 11}", "{2, 4, 6}", "3"] },
      { name: "example 2", args: ["{1, 1, 2}", "{1, 2, 3}", "2"] },
      { name: "all pairs", args: ["{1, 2}", "{3}", "2"] },
      { name: "extremes", args: ["{-1000000000, 1000000000}", "{-1000000000, 1000000000}", "4"] },
    ],
    random: { count: 400, gen: "{ nums1 = rnd_sorted(rnd(1, 6), -5, 5); nums2 = rnd_sorted(rnd(1, 6), -5, 5); k = rnd(1, nums1.size() * nums2.size()); }" },
    stress: { label: "10⁵ each, k = 10⁴", gen: "{ nums1 = rnd_sorted(100000, -1000000000, 1000000000); nums2 = rnd_sorted(100000, -1000000000, 1000000000); k = 10000; }" },
  },
});
