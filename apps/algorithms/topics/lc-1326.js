import { light } from "./leet-light.js";

export const lc1326 = light({
  number: 1326,
  title: "Minimum Number of Taps to Open to Water a Garden",
  slug: "minimum-number-of-taps-to-open-to-water-a-garden",
  difficulty: "H",
  pattern: "D1",
  topic: "D1 · Interval scheduling and covering",
  themes: ["Intervals", "Jump game"],
  blurb: "Each tap waters an interval; turn them into \"from this start, reach this far\" and run the Jump Game II greedy over the garden.",
  statement: [
    "A garden runs from 0 to n. There are n + 1 taps at points 0..n, and tap i with range r waters [i − r, i + r]. Return the least number of taps that water the whole garden, or −1 if it cannot be done.",
    "n up to 10⁴, each range up to 100.",
  ],
  hints: [
    "Clip each tap's interval to [0, n]. What problem is this now?",
    "Covering a segment with the fewest intervals: 1024 Video Stitching.",
    "Store, for each left end, the furthest right end, and jump greedily.",
  ],
  brute: "Try every subset of taps and check whether its union covers [0, n]: O(2ⁿ · n log n).",
  invariant: "After opening k taps, end is the furthest point any k taps can water continuously from 0, and next is the furthest reach of any tap whose interval starts at or before end.",
  traps: [
    "A tap with range 0 waters a single point and never helps bridge a gap.",
    "Forgetting to clip i − r at 0, which indexes before the array.",
    "Thinking the tap at i must cover point i to be useful: it is the whole interval that matters.",
  ],
  followUps: [
    "DP: dp[x] = fewest taps watering [0, x]. O(n · r), easier to extend to costs per tap.",
    "Taps have different costs: minimise the total cost (shortest path over positions).",
    "Return which taps to open.",
  ],
  explanation: [
    "Tap i waters [max(0, i − r), i + r]. Watering the garden means covering [0, n] with as few of these intervals as possible, which is exactly the covering greedy.",
    "Build far[l], the furthest right end of an interval starting at l. Scan x from 0 to n − 1, keeping next, the furthest reach seen. When x reaches end, another tap is needed: if next ≤ x the point just after x cannot be watered, so return −1; otherwise open a tap and set end = next.",
    "Each position is visited once, so it is linear after building far.",
    { tip: "Signal: points with a radius, cover a line. Convert each to an interval and reuse the cover-a-range greedy." },
  ],
  analysis: {
    time: "O(n)",
    space: "O(n)",
    notes: ["The answer is at most n + 1, and −1 when some gap is never covered."],
  },
  tests: {
    fn: "minTaps",
    args: [{ type: "int", name: "n" }, { type: "vector<int>", name: "ranges" }],
    starter: `class Solution {
public:
    int minTaps(int n, vector<int>& ranges) {

    }
};`,
    reference: `class Solution {
public:
    int minTaps(int n, vector<int>& ranges) {
        vector<int> far(n + 1, 0);
        for (int i = 0; i <= n; ++i) {
            int l = max(0, i - ranges[i]);
            far[l] = max(far[l], i + ranges[i]);
        }
        int taps = 0, end = 0, next = 0;
        for (int x = 0; x < n; ++x) {
            next = max(next, far[x]);
            if (x == end) {
                if (next <= x) return -1;  // nothing waters past x
                ++taps;
                end = next;
            }
        }
        return taps;
    }
};`,
    brute: `class Solution {
public:
    // Every subset of taps, checked by sweeping: O(2^n * n log n).
    int minTaps(int n, vector<int>& ranges) {
        int best = INT_MAX;
        for (int mask = 0; mask < (1 << (n + 1)); ++mask) {
            int k = __builtin_popcount(mask);
            if (k >= best) continue;
            vector<pair<int, int>> pick;
            for (int i = 0; i <= n; ++i)
                if (mask >> i & 1) pick.push_back({i - ranges[i], i + ranges[i]});
            sort(pick.begin(), pick.end());
            int reach = 0;
            for (auto& [l, r] : pick) if (l <= reach) reach = max(reach, r);
            if (reach >= n) best = k;
        }
        return best == INT_MAX ? -1 : best;
    }
};`,
    cases: [
      { name: "example", args: ["5", "{3, 4, 1, 1, 0, 0}"] },
      { name: "example 2", args: ["3", "{0, 0, 0, 0}"] },
      { name: "one tap covers all", args: ["7", "{1, 2, 1, 0, 2, 1, 0, 1}"] },
      { name: "gap in the middle", args: ["4", "{1, 0, 0, 0, 1}"] },
      { name: "range far past the ends", args: ["3", "{0, 100, 0, 0}"] },
    ],
    random: { count: 300, gen: "{ n = rnd(1, 10); ranges = rnd_vec(n + 1, 0, 3); }" },
    stress: { label: "n = 10⁴", gen: "{ n = 10000; ranges = rnd_vec(n + 1, 0, 100); }" },
  },
});
