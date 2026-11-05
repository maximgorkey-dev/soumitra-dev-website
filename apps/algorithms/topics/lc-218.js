import { light } from "./leet-light.js";

export const lc218 = light({
  number: 218,
  title: "The Skyline Problem",
  slug: "the-skyline-problem",
  difficulty: "H",
  pattern: "E1",
  topic: "E1 · Sweeping over events",
  themes: ["Sweep line", "Multiset of active heights"],
  blurb: "Sweep the x-axis over start and end events, keeping the heights of buildings in progress in a multiset; emit a key point whenever the maximum changes.",
  statement: [
    "Buildings are rectangles [left, right, height] standing on the ground, given sorted by left. Return the skyline: the list of key points [x, y] where the outline's height changes to y, sorted by x, with no two consecutive points at the same height. The last point has height 0.",
    "Up to 10⁴ buildings; coordinates and heights up to 2³¹ − 1.",
  ],
  hints: [
    "The outline can only change where some building starts or ends.",
    "At each such x, the height is the tallest building covering it. What structure gives the maximum while buildings come and go?",
    "A multiset (or a heap with lazy deletion). Order the events at the same x carefully.",
  ],
  brute: "For every left or right coordinate, scan all buildings for the tallest covering it: O(n²).",
  invariant: "After processing all events at x, the multiset holds exactly the heights of buildings with left ≤ x < right, plus a ground height of 0.",
  traps: [
    "Events at the same x: process starts before ends, taller starts first and shorter ends first, or you emit spurious points.",
    "Emitting a point when the maximum did not change: two adjacent buildings of the same height must merge.",
    "Erasing every copy of a height from a multiset with erase(value) instead of erase(find(value)).",
  ],
  followUps: [
    "Divide and conquer: merge two skylines like merge sort, O(n log n).",
    "A priority queue with lazy deletion instead of a multiset.",
    "Return the area under the skyline.",
  ],
  explanation: [
    "Turn each building into two events: a start at left with its height, and an end at right. Sort the events by x. Sweep, inserting a height at its start and removing one copy at its end, with a 0 always present for the ground.",
    "After each event, the current outline height is the largest height in the multiset. When it differs from the previous height, the outline changes here: emit [x, height].",
    "Encoding starts as negative heights makes one sort order them right: at the same x, starts come first, taller first; ends come after, shorter first. Then no intermediate height is ever emitted at a shared x.",
    { tip: "Signal: a union of intervals with values, and you need the outline. Sweep the events and keep the active values in an ordered structure." },
  ],
  analysis: {
    time: "O(n log n)",
    space: "O(n)",
    notes: [],
  },
  tests: {
    fn: "getSkyline",
    args: [{ type: "vector<vector<int>>", name: "buildings" }],
    starter: `class Solution {
public:
    vector<vector<int>> getSkyline(vector<vector<int>>& buildings) {

    }
};`,
    reference: `class Solution {
public:
    vector<vector<int>> getSkyline(vector<vector<int>>& buildings) {
        vector<pair<int, int>> events;
        for (auto& b : buildings) {
            events.push_back({b[0], -b[2]});  // start: negative, so it sorts first
            events.push_back({b[1], b[2]});
        }
        sort(events.begin(), events.end());
        multiset<int> live{0};
        vector<vector<int>> skyline;
        int prev = 0;
        for (auto [x, h] : events) {
            if (h < 0) live.insert(-h);
            else live.erase(live.find(h));
            int cur = *live.rbegin();
            if (cur != prev) { skyline.push_back({x, cur}); prev = cur; }
        }
        return skyline;
    }
};`,
    brute: `class Solution {
public:
    // Tallest covering building at every coordinate: O(n^2).
    vector<vector<int>> getSkyline(vector<vector<int>>& buildings) {
        vector<int> xs;
        for (auto& b : buildings) { xs.push_back(b[0]); xs.push_back(b[1]); }
        sort(xs.begin(), xs.end());
        xs.erase(unique(xs.begin(), xs.end()), xs.end());
        vector<vector<int>> skyline;
        int prev = 0;
        for (int x : xs) {
            int h = 0;
            for (auto& b : buildings) if (b[0] <= x && x < b[1]) h = max(h, b[2]);
            if (h != prev) { skyline.push_back({x, h}); prev = h; }
        }
        return skyline;
    }
};`,
    cases: [
      { name: "example", args: ["{{2, 9, 10}, {3, 7, 15}, {5, 12, 12}, {15, 20, 10}, {19, 24, 8}}"] },
      { name: "example 2", args: ["{{0, 2, 3}, {2, 5, 3}}"] },
      { name: "same start", args: ["{{1, 5, 3}, {1, 5, 7}}"] },
      { name: "end meets start, lower", args: ["{{1, 3, 5}, {3, 6, 2}}"] },
      { name: "nested", args: ["{{1, 10, 2}, {3, 4, 8}}"] },
      { name: "huge coordinates", args: ["{{0, INT_MAX, INT_MAX}}"] },
    ],
    random: { count: 400, gen: "{ int lt_n = rnd(1, 7); vector<int> lt_l = rnd_sorted(lt_n, 0, 10); buildings.clear(); for (int i = 0; i < lt_n; ++i) buildings.push_back({lt_l[i], lt_l[i] + rnd(1, 5), rnd(1, 5)}); }" },
    stress: { label: "10⁴ buildings", gen: "{ vector<int> lt_l = rnd_sorted(10000, 0, 1000000000); buildings.clear(); for (int i = 0; i < 10000; ++i) buildings.push_back({lt_l[i], lt_l[i] + rnd(1, 100000000), rnd(1, 1000000000)}); }" },
  },
});
