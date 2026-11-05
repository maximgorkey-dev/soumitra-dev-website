import { light } from "./leet-light.js";

export const lc786 = light({
  number: 786,
  title: "K-th Smallest Prime Fraction",
  slug: "k-th-smallest-prime-fraction",
  difficulty: "M",
  pattern: "E2",
  topic: "E2 · Two heaps, or a k-way merge",
  themes: ["K-way merge", "Binary search on the value"],
  blurb: "For each denominator, the fractions arr[i] / arr[j] are sorted in i: merge those lists with a min-heap and pop k times, comparing by cross-multiplication.",
  statement: [
    "arr is sorted and holds 1 and distinct primes. Among all fractions arr[i] / arr[j] with i < j, return the k-th smallest as [arr[i], arr[j]].",
    "Up to 1000 elements, values up to 3 · 10⁴.",
  ],
  hints: [
    "Fix the denominator arr[j]. In what order are arr[0] / arr[j], arr[1] / arr[j], …?",
    "Increasing. So there are n − 1 sorted lists to merge.",
    "Compare fractions without division: a / b < c / d exactly when a · d < c · b.",
  ],
  brute: "Generate all n(n − 1) / 2 fractions and sort: O(n² log n).",
  invariant: "The heap holds the next unpopped fraction of each denominator's list; the top is the smallest fraction not yet popped.",
  traps: [
    "Comparing doubles: fine here, but cross-multiplication is exact; use long long products.",
    "Seeding numerators instead of denominators and walking the wrong way through a list.",
    "An O(n²) brute force with n = 1000 is 5 · 10⁵ fractions, which passes; the point is the merge or the binary search.",
  ],
  followUps: [
    "Binary search on the fraction value, counting fractions ≤ x with two pointers: O(n log W).",
    "Same merge: 373 K Smallest Pairs, 378 Kth Smallest in a Sorted Matrix.",
  ],
  explanation: [
    "For each j, the fractions with denominator arr[j] increase with the numerator. Seed a min-heap with arr[0] / arr[j] for every j ≥ 1.",
    "Pop k − 1 times; each time, push the next fraction from the same list, (i + 1, j), if i + 1 < j. The top after that is the answer.",
    "Order the heap by cross-multiplying, so no floating point is needed.",
    { tip: "Signal: k-th smallest among values with a sorted structure in each row. Merge the rows with a heap, or binary search the value and count." },
  ],
  analysis: {
    time: "O(k log n)",
    space: "O(n)",
    notes: ["All fractions are distinct because the values are distinct primes and 1."],
  },
  tests: {
    fn: "kthSmallestPrimeFraction",
    args: [{ type: "vector<int>", name: "arr" }, { type: "int", name: "k" }],
    starter: `class Solution {
public:
    vector<int> kthSmallestPrimeFraction(vector<int>& arr, int k) {

    }
};`,
    reference: `class Solution {
public:
    vector<int> kthSmallestPrimeFraction(vector<int>& arr, int k) {
        auto bigger = [&](pair<int, int> a, pair<int, int> b) {  // arr[a.first]/arr[a.second] > arr[b.first]/arr[b.second]
            return (long long)arr[a.first] * arr[b.second] > (long long)arr[b.first] * arr[a.second];
        };
        priority_queue<pair<int, int>, vector<pair<int, int>>, decltype(bigger)> heap(bigger);
        for (int j = 1; j < (int)arr.size(); ++j) heap.push({0, j});
        while (--k > 0) {
            auto [i, j] = heap.top();
            heap.pop();
            if (i + 1 < j) heap.push({i + 1, j});
        }
        return {arr[heap.top().first], arr[heap.top().second]};
    }
};`,
    brute: `class Solution {
public:
    // Every fraction, sorted: O(n^2 log n).
    vector<int> kthSmallestPrimeFraction(vector<int>& arr, int k) {
        vector<pair<int, int>> f;
        for (size_t i = 0; i < arr.size(); ++i)
            for (size_t j = i + 1; j < arr.size(); ++j) f.push_back({arr[i], arr[j]});
        sort(f.begin(), f.end(), [](auto a, auto b) { return (long long)a.first * b.second < (long long)b.first * a.second; });
        return {f[k - 1].first, f[k - 1].second};
    }
};`,
    cases: [
      { name: "example", args: ["{1, 2, 3, 5}", "3"] },
      { name: "example 2", args: ["{1, 7}", "1"] },
      { name: "largest fraction", args: ["{1, 2, 3, 5, 7}", "10"] },
    ],
    random: { count: 400, gen: "{ const int lt_p[] = {2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37}; arr = {1}; for (int lt_x : lt_p) if (rnd(0, 1)) arr.push_back(lt_x); if (arr.size() < 2) arr.push_back(2); int lt_n = arr.size(); k = rnd(1, lt_n * (lt_n - 1) / 2); }" },
    stress: { label: "1000 values", gen: "{ vector<bool> lt_c(30001, false); arr = {1}; for (int i = 2; i <= 30000 && arr.size() < 1000; ++i) if (!lt_c[i]) { arr.push_back(i); for (long long j = (long long)i * i; j <= 30000; j += i) lt_c[j] = true; } k = 1000 * 999 / 4; }" },
  },
});
