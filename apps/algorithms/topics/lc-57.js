import { light } from "./leet-light.js";

export const lc57 = light({
  number: 57,
  title: "Insert Interval",
  slug: "insert-interval",
  difficulty: "M",
  pattern: "E3",
  topic: "E3 · Intervals in an ordered set",
  themes: ["Intervals", "Three phases"],
  blurb: "Copy the intervals that end before the new one, swallow every interval that overlaps it, then copy the rest. One pass, no sort.",
  statement: [
    "intervals is sorted by start and has no overlaps. Insert newInterval and merge where needed, so the result is still sorted and non-overlapping. Intervals that touch, like [1, 2] and [2, 3], merge.",
    "Up to 10⁴ intervals, endpoints up to 10⁵.",
  ],
  hints: [
    "The input is already sorted and disjoint. Which intervals are untouched?",
    "Those ending before newInterval starts, and those starting after it ends.",
    "Everything in between merges into one interval: the min of the starts and the max of the ends.",
  ],
  brute: "Append the new interval, sort, and run the general merge: O(n log n).",
  invariant: "After phase one, every copied interval ends strictly before newInterval starts; during phase two, newInterval covers every interval absorbed so far.",
  traps: [
    "Touching counts as overlap here: use end < newStart to skip, not end ≤ newStart.",
    "Forgetting the case where newInterval goes at the very end, or into an empty list.",
    "Mutating the input while iterating over it.",
  ],
  followUps: [
    "Many inserts online: keep a map from start to end and merge neighbours (352, 715).",
    "Remove an interval instead (1272).",
    "Binary search the two boundaries to find the merge range in O(log n), though copying stays O(n).",
  ],
  explanation: [
    "Three phases over the sorted list. First, copy every interval whose end is before newInterval's start: they are strictly to its left. Second, while an interval's start is at most newInterval's end, it overlaps: widen newInterval to cover it. Push the widened interval. Third, copy the rest.",
    "Each interval is looked at once, so it is linear.",
    { tip: "Signal: insert into a sorted, disjoint list. Skip the left part, merge the middle, copy the right part." },
  ],
  analysis: {
    time: "O(n)",
    space: "O(n) for the output",
    notes: [],
  },
  tests: {
    fn: "insert",
    args: [{ type: "vector<vector<int>>", name: "intervals" }, { type: "vector<int>", name: "newInterval" }],
    starter: `class Solution {
public:
    vector<vector<int>> insert(vector<vector<int>>& intervals, vector<int>& newInterval) {

    }
};`,
    reference: `class Solution {
public:
    vector<vector<int>> insert(vector<vector<int>>& intervals, vector<int>& newInterval) {
        vector<vector<int>> res;
        size_t i = 0, n = intervals.size();
        while (i < n && intervals[i][1] < newInterval[0]) res.push_back(intervals[i++]);
        while (i < n && intervals[i][0] <= newInterval[1]) {  // overlaps or touches
            newInterval[0] = min(newInterval[0], intervals[i][0]);
            newInterval[1] = max(newInterval[1], intervals[i][1]);
            ++i;
        }
        res.push_back(newInterval);
        while (i < n) res.push_back(intervals[i++]);
        return res;
    }
};`,
    brute: `class Solution {
public:
    // Append, sort, merge: O(n log n).
    vector<vector<int>> insert(vector<vector<int>>& intervals, vector<int>& newInterval) {
        auto all = intervals;
        all.push_back(newInterval);
        sort(all.begin(), all.end());
        vector<vector<int>> res;
        for (auto& iv : all) {
            if (!res.empty() && iv[0] <= res.back()[1]) res.back()[1] = max(res.back()[1], iv[1]);
            else res.push_back(iv);
        }
        return res;
    }
};`,
    cases: [
      { name: "example", args: ["{{1, 3}, {6, 9}}", "{2, 5}"] },
      { name: "example 2", args: ["{{1, 2}, {3, 5}, {6, 7}, {8, 10}, {12, 16}}", "{4, 8}"] },
      { name: "empty list", args: ["{}", "{5, 7}"] },
      { name: "at the end", args: ["{{1, 5}}", "{6, 8}"] },
      { name: "touching", args: ["{{1, 2}, {5, 6}}", "{2, 5}"] },
      { name: "covers everything", args: ["{{3, 4}, {6, 7}}", "{0, 10}"] },
    ],
    random: { count: 400, gen: "{ int lt_n = rnd(0, 5), lt_x = 0; intervals.clear(); for (int i = 0; i < lt_n; ++i) { int lt_s = lt_x + rnd(1, 3), lt_e = lt_s + rnd(0, 3); intervals.push_back({lt_s, lt_e}); lt_x = lt_e; } int lt_a = rnd(0, 25); newInterval = {lt_a, lt_a + rnd(0, 6)}; }" },
    stress: { label: "10⁴ intervals", gen: "{ intervals.clear(); for (int i = 0; i < 10000; ++i) intervals.push_back({10 * i, 10 * i + 5}); newInterval = {30000, 70000}; }" },
  },
});
