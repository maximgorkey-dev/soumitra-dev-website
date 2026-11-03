import { light } from "./leet-light.js";

export const lc435 = light({
  number: 435,
  title: "Non-overlapping Intervals",
  slug: "non-overlapping-intervals",
  difficulty: "M",
  pattern: "D1",
  topic: "D1 · Interval scheduling and covering",
  themes: ["Intervals", "Sort by end"],
  blurb: "Removing the fewest is keeping the most. Sort by end and keep every interval that starts at or after the last kept end.",
  statement: [
    "Given intervals [start, end), return the least number to remove so that the rest do not overlap. Intervals that only touch, like [1, 2] and [2, 3], do not overlap.",
    "Up to 10⁵ intervals, endpoints between −5 · 10⁴ and 5 · 10⁴.",
  ],
  hints: [
    "Turn it around: what is the largest set of intervals you can keep?",
    "Which interval should the first one you keep be?",
    "The one that ends earliest: it leaves the most room for everything else.",
  ],
  brute: "Try every subset and keep the largest one with no overlap: O(2ⁿ · n log n).",
  invariant: "After scanning intervals in order of end, the kept set is a largest non-overlapping subset of those scanned, and among such sets it has the earliest last end.",
  traps: [
    "Sorting by start: one long interval that starts first blocks many short ones.",
    "Treating touching intervals as overlapping: the test is start ≥ lastEnd, not start > lastEnd.",
    "Initialising lastEnd to 0 when endpoints can be negative; use the first interval or INT_MIN.",
  ],
  followUps: [
    "Sort by start instead: on an overlap, drop the one with the later end. Same answer.",
    "Weighted intervals: maximise total weight kept. That needs DP with binary search (1235).",
    "452 is the same scan with closed intervals: count groups instead of removals.",
  ],
  explanation: [
    "Removing the fewest intervals is the same as keeping the most. Classic interval scheduling: among all intervals, the one that ends first is safe to keep. Any optimal set can swap its first interval for this one without creating an overlap, because this one ends no later.",
    "So sort by end. Keep the first interval; then for each next interval, keep it if it starts at or after the end of the last kept one, and count it as removed otherwise.",
    "The answer is n minus the number kept.",
    { tip: "Signal: keep the most non-overlapping intervals. Sort by end, take greedily. To cover a range instead, sort by start and extend reach." },
  ],
  analysis: {
    time: "O(n log n)",
    space: "O(1) beyond the sort",
    notes: ["The greedy also gives the largest kept set itself, not only its size."],
  },
  tests: {
    fn: "eraseOverlapIntervals",
    args: [{ type: "vector<vector<int>>", name: "intervals" }],
    starter: `class Solution {
public:
    int eraseOverlapIntervals(vector<vector<int>>& intervals) {

    }
};`,
    reference: `class Solution {
public:
    int eraseOverlapIntervals(vector<vector<int>>& intervals) {
        sort(intervals.begin(), intervals.end(), [](const vector<int>& a, const vector<int>& b) {
            return a[1] < b[1];
        });
        int removed = 0, lastEnd = INT_MIN;
        for (auto& iv : intervals) {
            if (iv[0] >= lastEnd) lastEnd = iv[1];
            else ++removed;
        }
        return removed;
    }
};`,
    brute: `class Solution {
public:
    // Largest subset with no overlap: O(2^n * n log n).
    int eraseOverlapIntervals(vector<vector<int>>& intervals) {
        int n = intervals.size(), best = 0;
        for (int mask = 0; mask < (1 << n); ++mask) {
            vector<vector<int>> pick;
            for (int i = 0; i < n; ++i) if (mask >> i & 1) pick.push_back(intervals[i]);
            sort(pick.begin(), pick.end());
            bool ok = true;
            for (size_t i = 1; i < pick.size() && ok; ++i) ok = pick[i][0] >= pick[i - 1][1];
            if (ok) best = max(best, (int)pick.size());
        }
        return n - best;
    }
};`,
    cases: [
      { name: "example", args: ["{{1, 2}, {2, 3}, {3, 4}, {1, 3}}"] },
      { name: "example 2", args: ["{{1, 2}, {1, 2}, {1, 2}}"] },
      { name: "touching only", args: ["{{1, 2}, {2, 3}}"] },
      { name: "one long blocks many", args: ["{{0, 10}, {1, 2}, {3, 4}, {5, 6}}"] },
      { name: "negative endpoints", args: ["{{-50000, -40000}, {-45000, 0}, {0, 50000}}"] },
    ],
    random: { count: 300, gen: "{ int lt_n = rnd(1, 10); intervals.clear(); for (int i = 0; i < lt_n; ++i) { int lt_s = rnd(-5, 8); intervals.push_back({lt_s, lt_s + rnd(1, 5)}); } }" },
    stress: { label: "10⁵ intervals", gen: "{ intervals.clear(); for (int i = 0; i < 100000; ++i) { int lt_s = rnd(-50000, 49999); intervals.push_back({lt_s, rnd(lt_s + 1, 50000)}); } }" },
  },
});
