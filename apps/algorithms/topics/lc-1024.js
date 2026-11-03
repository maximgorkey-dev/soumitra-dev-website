import { light } from "./leet-light.js";

export const lc1024 = light({
  number: 1024,
  title: "Video Stitching",
  slug: "video-stitching",
  difficulty: "M",
  pattern: "D1",
  topic: "D1 · Interval scheduling and covering",
  themes: ["Intervals", "Jump game"],
  blurb: "Covering a range: among clips that start within what is covered so far, take the one reaching furthest. It is Jump Game II with clips as jumps.",
  statement: [
    "Each clip covers the time span [start, end]. Clips can be cut into pieces freely. Return the least number of clips whose union covers [0, time], or −1 if it cannot be done.",
    "Up to 100 clips; time and endpoints at most 100.",
  ],
  hints: [
    "Some clip must start at 0. Which one should you pick?",
    "The one reaching furthest. Then, among clips starting within what you have covered, again pick the furthest reach.",
    "Precompute, for each start, the furthest end. Then it is Jump Game II.",
  ],
  brute: "Try every subset of clips and check whether its union covers [0, time]: O(2ⁿ · n log n).",
  invariant: "After using k clips, end is the furthest time any k clips can cover from 0, and next is the furthest reach of any clip starting at or before end.",
  traps: [
    "Clips that start after time still exist in the input; ignore them, or index out of range.",
    "A gap: if no clip starting at or before the current end reaches beyond it, return −1 rather than loop forever.",
    "time = 0 needs zero clips.",
  ],
  followUps: [
    "DP: dp[t] = fewest clips covering [0, t]. O(time · n), and handles weighted clips.",
    "1326 Taps: the same greedy once each tap becomes an interval.",
    "Return the clips used.",
  ],
  explanation: [
    "Cover [0, time] left to right. With [0, end] covered, any clip that starts at or before end can extend the cover, and the best one is the one reaching furthest: whatever another choice can reach next, this one covers at least as much.",
    "Precompute far[s], the furthest end of a clip starting at s. Scan t from 0 to time − 1 keeping next, the furthest reach seen so far. When t reaches end, you must take another clip: if next ≤ t there is a gap, so return −1; otherwise count a clip and move end to next.",
    "This is the breadth-first view of Jump Game II: each clip taken is one level of the search.",
    { tip: "Signal: fewest intervals to cover a range. Sort by start (or bucket by start) and always extend to the furthest reach." },
  ],
  analysis: {
    time: "O(n + time)",
    space: "O(time)",
    notes: ["Sorting by start and scanning gives O(n log n) without the bucket array."],
  },
  tests: {
    fn: "videoStitching",
    args: [{ type: "vector<vector<int>>", name: "clips" }, { type: "int", name: "time" }],
    starter: `class Solution {
public:
    int videoStitching(vector<vector<int>>& clips, int time) {

    }
};`,
    reference: `class Solution {
public:
    int videoStitching(vector<vector<int>>& clips, int time) {
        vector<int> far(time + 1, 0);
        for (auto& c : clips)
            if (c[0] <= time) far[c[0]] = max(far[c[0]], c[1]);
        int used = 0, end = 0, next = 0;
        for (int t = 0; t < time; ++t) {
            next = max(next, far[t]);
            if (t == end) {
                if (next <= t) return -1;  // nothing reaches past t
                ++used;
                end = next;
            }
        }
        return used;
    }
};`,
    brute: `class Solution {
public:
    // Every subset, checked by sweeping its clips by start: O(2^n * n log n).
    int videoStitching(vector<vector<int>>& clips, int time) {
        int n = clips.size(), best = INT_MAX;
        for (int mask = 0; mask < (1 << n); ++mask) {
            int k = __builtin_popcount(mask);
            if (k >= best) continue;
            vector<vector<int>> pick;
            for (int i = 0; i < n; ++i) if (mask >> i & 1) pick.push_back(clips[i]);
            sort(pick.begin(), pick.end());
            int reach = 0;
            for (auto& c : pick) if (c[0] <= reach) reach = max(reach, c[1]);
            if (reach >= time) best = k;
        }
        return best == INT_MAX ? -1 : best;
    }
};`,
    cases: [
      { name: "example", args: ["{{0, 2}, {4, 6}, {8, 10}, {1, 9}, {1, 5}, {5, 9}}", "10"] },
      { name: "example 2", args: ["{{0, 1}, {1, 2}}", "5"] },
      { name: "example 3", args: ["{{0, 1}, {6, 8}, {0, 2}, {5, 6}, {0, 4}, {0, 3}, {6, 7}, {1, 3}, {4, 7}, {1, 4}, {2, 5}, {2, 6}, {3, 4}, {4, 5}, {5, 7}, {6, 9}}", "9"] },
      { name: "time zero", args: ["{{1, 2}}", "0"] },
      { name: "nothing starts at 0", args: ["{{1, 5}}", "3"] },
      { name: "clip starts after time", args: ["{{0, 3}, {50, 60}}", "3"] },
    ],
    random: { count: 300, gen: "{ int lt_n = rnd(1, 10); clips.clear(); for (int i = 0; i < lt_n; ++i) { int lt_s = rnd(0, 10); clips.push_back({lt_s, lt_s + rnd(0, 5)}); } time = rnd(0, 12); }" },
    stress: { label: "100 clips", gen: "{ clips.clear(); for (int i = 0; i < 100; ++i) { int lt_s = rnd(0, 99); clips.push_back({lt_s, rnd(lt_s, 100)}); } time = 100; }" },
  },
});
