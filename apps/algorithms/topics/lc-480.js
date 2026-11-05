import { light } from "./leet-light.js";

export const lc480 = light({
  number: 480,
  title: "Sliding Window Median",
  slug: "sliding-window-median",
  difficulty: "H",
  pattern: "E2",
  topic: "E2 · Two heaps, or a k-way merge",
  themes: ["Sliding window", "Order statistics"],
  blurb: "Keep the window in a multiset with an iterator parked on the median; each slide moves the iterator at most one step for the insert and one for the erase.",
  statement: [
    "Given nums and a window size k, return the median of every window of k consecutive elements, from left to right. For even k the median is the mean of the two middle values.",
    "Up to 10⁵ elements; values span the full 32-bit int range. Answers within 10⁻⁵ are accepted.",
  ],
  hints: [
    "Two heaps give the median of a stream. What goes wrong when elements must also leave?",
    "Heaps cannot erase an arbitrary element cheaply. Lazy deletion fixes it, or use a balanced tree.",
    "With a multiset, keep an iterator at index k / 2 and nudge it after each insert and erase.",
  ],
  brute: "Copy and sort every window: O(n · k log k).",
  invariant: "Before each answer, mid points at the element of rank k / 2 (0-based) in the window's sorted order.",
  traps: [
    "Overflow when averaging two middles near ±2³¹: convert to double before adding.",
    "Erasing by value from a multiset removes every copy; erase one iterator from lower_bound.",
    "Erasing the element mid points to before moving mid: the iterator is invalidated.",
  ],
  followUps: [
    "Two heaps with lazy deletion (a hash map of pending removals), the classic interview answer.",
    "Window of the k-th smallest instead of the median: an order-statistics tree.",
    "Values are small: a Fenwick tree over values with a binary-search descent.",
  ],
  explanation: [
    "Put the first k elements in a multiset and point mid at rank k / 2. The median is *mid for odd k, and the mean of *mid and its predecessor for even k.",
    "To slide, insert the incoming value: if it is smaller than *mid, it lands before mid and the rank of mid grows, so step mid back. Then remove the outgoing value: if it is ≤ *mid, it was at or before mid, so step mid forward first, and only then erase one copy found with lower_bound. Doing the step before the erase keeps mid valid.",
    { tip: "Signal: an order statistic of a moving window. A balanced tree with a tracked iterator, or two heaps with lazy deletion." },
  ],
  analysis: {
    time: "O(n log k)",
    space: "O(k)",
    notes: [],
  },
  tests: {
    fn: "medianSlidingWindow",
    args: [{ type: "vector<int>", name: "nums" }, { type: "int", name: "k" }],
    starter: `class Solution {
public:
    vector<double> medianSlidingWindow(vector<int>& nums, int k) {

    }
};`,
    reference: `class Solution {
public:
    vector<double> medianSlidingWindow(vector<int>& nums, int k) {
        int n = nums.size();
        multiset<int> window(nums.begin(), nums.begin() + k);
        auto mid = next(window.begin(), k / 2);
        vector<double> res;
        for (int i = k;; ++i) {
            res.push_back(((double)*mid + *prev(mid, 1 - k % 2)) / 2);
            if (i == n) break;
            window.insert(nums[i]);
            if (nums[i] < *mid) --mid;
            if (nums[i - k] <= *mid) ++mid;  // step off before erasing
            window.erase(window.lower_bound(nums[i - k]));
        }
        return res;
    }
};`,
    brute: `class Solution {
public:
    // Sort every window: O(n * k log k).
    vector<double> medianSlidingWindow(vector<int>& nums, int k) {
        vector<double> res;
        for (int i = 0; i + k <= (int)nums.size(); ++i) {
            vector<int> w(nums.begin() + i, nums.begin() + i + k);
            sort(w.begin(), w.end());
            res.push_back(((double)w[(k - 1) / 2] + w[k / 2]) / 2);
        }
        return res;
    }
};`,
    cases: [
      { name: "example", args: ["{1, 3, -1, -3, 5, 3, 6, 7}", "3"] },
      { name: "example 2", args: ["{1, 2, 3, 4, 2, 3, 1, 4, 2}", "3"] },
      { name: "k = 1", args: ["{5, -2, 7}", "1"] },
      { name: "int extremes", args: ["{INT_MAX, INT_MAX, INT_MIN, INT_MIN}", "2"] },
      { name: "duplicates leave", args: ["{2, 2, 2, 1, 1, 1}", "4"] },
    ],
    random: { count: 400, gen: "{ nums = rnd_vec(rnd(1, 10), -4, 4); k = rnd(1, nums.size()); }" },
    stress: { label: "10⁵ elements, k = 5 · 10⁴", gen: "{ nums = rnd_vec(100000, INT_MIN / 2, INT_MAX / 2); k = 50000; }" },
  },
});
