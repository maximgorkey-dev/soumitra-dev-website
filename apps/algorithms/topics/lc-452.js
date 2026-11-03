import { light } from "./leet-light.js";

export const lc452 = light({
  number: 452,
  title: "Minimum Number of Arrows to Burst Balloons",
  slug: "minimum-number-of-arrows-to-burst-balloons",
  difficulty: "M",
  pattern: "D1",
  topic: "D1 · Interval scheduling and covering",
  themes: ["Intervals", "Sort by end"],
  blurb: "Sort balloons by right end and shoot at the first right end; every balloon starting at or before it bursts too. A new arrow is needed only when a balloon starts after the last shot.",
  statement: [
    "Each balloon spans the closed interval [xstart, xend] on a line. An arrow shot at x bursts every balloon with xstart ≤ x ≤ xend.",
    "Return the least number of arrows that burst every balloon. Up to 10⁵ balloons; coordinates span the full 32-bit int range.",
  ],
  hints: [
    "Where should the arrow that bursts the balloon ending first go?",
    "As far right as it can: exactly at that balloon's end.",
    "Coordinates reach ±2³¹. Check your comparator.",
  ],
  brute: "An optimal arrow can always move to some balloon's right end, so try every subset of right ends: O(2ⁿ · n²).",
  invariant: "After scanning balloons by right end, the arrows so far burst all of them, and the last arrow sits at the rightmost position that still bursts its group.",
  traps: [
    "A comparator written as a[1] - b[1] overflows when coordinates span the full int range. Compare with <.",
    "Using > where ≥ is needed: touching balloons share a point and one arrow bursts both.",
    "Sorting by start and keeping the start as the shot: a later balloon nested inside can end earlier.",
  ],
  followUps: [
    "Return the arrow positions, not only the count.",
    "Arrows travel along a 2D direction: a different (harder) problem.",
    "Compare with 435: the same scan, with closed intervals and a count of groups.",
  ],
  explanation: [
    "Look at the balloon that ends first. Some arrow must burst it, at or before its right end. Moving that arrow right up to the end only helps: every balloon it burst before still contains the new point, since they all end no earlier. So shoot at the smallest right end.",
    "Every balloon whose start is at or before that point now bursts. Sort by right end, keep the position of the last arrow, and fire a new one at the current balloon's end only when the balloon starts strictly after the last arrow.",
    "This is interval scheduling in disguise: the arrows equal the largest set of pairwise-disjoint balloons.",
    { tip: "Signal: fewest points that stab every interval. Sort by end, stab at the end, skip everything already stabbed." },
  ],
  analysis: {
    time: "O(n log n)",
    space: "O(1) beyond the sort",
    notes: ["Compare coordinates directly or as long long; never subtract ints."],
  },
  tests: {
    fn: "findMinArrowShots",
    args: [{ type: "vector<vector<int>>", name: "points" }],
    starter: `class Solution {
public:
    int findMinArrowShots(vector<vector<int>>& points) {

    }
};`,
    reference: `class Solution {
public:
    int findMinArrowShots(vector<vector<int>>& points) {
        sort(points.begin(), points.end(), [](const vector<int>& a, const vector<int>& b) {
            return a[1] < b[1];  // a[1] - b[1] would overflow
        });
        int arrows = 1;
        long long shot = points[0][1];
        for (auto& p : points)
            if (p[0] > shot) { ++arrows; shot = p[1]; }
        return arrows;
    }
};`,
    brute: `class Solution {
public:
    // Every subset of right ends as arrow positions: O(2^n * n^2).
    int findMinArrowShots(vector<vector<int>>& points) {
        int n = points.size(), best = n;
        for (int mask = 1; mask < (1 << n); ++mask) {
            if (__builtin_popcount(mask) >= best) continue;
            bool ok = true;
            for (int i = 0; i < n && ok; ++i) {
                bool hit = false;
                for (int j = 0; j < n && !hit; ++j)
                    hit = (mask >> j & 1) && points[i][0] <= points[j][1] && points[j][1] <= points[i][1];
                ok = hit;
            }
            if (ok) best = __builtin_popcount(mask);
        }
        return best;
    }
};`,
    cases: [
      { name: "example", args: ["{{10, 16}, {2, 8}, {1, 6}, {7, 12}}"] },
      { name: "example 2", args: ["{{1, 2}, {3, 4}, {5, 6}, {7, 8}}"] },
      { name: "touching", args: ["{{1, 2}, {2, 3}, {3, 4}, {4, 5}}"] },
      { name: "one balloon", args: ["{{5, 5}}"] },
      { name: "full int range", args: ["{{INT_MIN, INT_MAX}, {INT_MAX, INT_MAX}, {INT_MIN, INT_MIN}}"] },
      { name: "nested ends earlier", args: ["{{1, 10}, {2, 3}, {4, 5}}"] },
    ],
    random: { count: 300, gen: "{ int lt_n = rnd(1, 10); points.clear(); for (int i = 0; i < lt_n; ++i) { int lt_s = rnd(-5, 8); points.push_back({lt_s, lt_s + rnd(0, 5)}); } }" },
    stress: { label: "10⁵ balloons", gen: "{ points.clear(); for (int i = 0; i < 100000; ++i) { int lt_s = rnd(-1000000000, 999999999); points.push_back({lt_s, rnd(lt_s, 1000000000)}); } }" },
  },
});
