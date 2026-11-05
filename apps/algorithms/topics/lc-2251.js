import { light } from "./leet-light.js";

export const lc2251 = light({
  number: 2251,
  title: "Number of Flowers in Full Bloom",
  slug: "number-of-flowers-in-full-bloom",
  difficulty: "H",
  pattern: "E1",
  topic: "E1 · Sweeping over events",
  themes: ["Sweep line", "Binary search on sorted events"],
  blurb: "Flowers blooming at time t = starts ≤ t minus ends < t. Sort starts and ends separately and answer each person with two binary searches.",
  statement: [
    "Flower i blooms over the inclusive range [start, end]. For each person's arrival time, return how many flowers are in bloom at that moment.",
    "Up to 5 · 10⁴ flowers and 5 · 10⁴ people; times up to 10⁹.",
  ],
  hints: [
    "A flower is in bloom at t if it has started and not yet ended.",
    "Count flowers with start ≤ t, then subtract those with end < t. Do the two need to stay paired?",
    "No: sort starts and ends independently and binary search each.",
  ],
  brute: "Check every flower for every person: O(n · m).",
  invariant: "For any t, (number of starts ≤ t) − (number of ends < t) is exactly the number of flowers with start ≤ t ≤ end, since every flower that ended has also started.",
  traps: [
    "Inclusive ends: a flower ending at t still counts, so subtract ends < t (lower_bound), not ends ≤ t.",
    "Sorting the people and losing their original order; keep indices, or avoid sorting them.",
    "A difference array over times up to 10⁹ needs coordinate compression.",
  ],
  followUps: [
    "Sort the people too and sweep both lists with two pointers.",
    "A map of +1 / −1 events with prefix sums (an ordered-map sweep).",
    "Online queries with flowers being added: a Fenwick tree over compressed times.",
  ],
  explanation: [
    "Every flower that has ended has also started, so the bloom count at t is (starts ≤ t) − (ends < t). The two counts do not care which start goes with which end.",
    "Sort all starts and all ends. For each person, upper_bound on starts counts starts ≤ t, and lower_bound on ends counts ends < t.",
    { tip: "Signal: many point queries over many intervals. Count started minus finished, with two sorted arrays." },
  ],
  analysis: {
    time: "O((n + m) log n)",
    space: "O(n)",
    notes: [],
  },
  tests: {
    fn: "fullBloomFlowers",
    args: [{ type: "vector<vector<int>>", name: "flowers" }, { type: "vector<int>", name: "people" }],
    starter: `class Solution {
public:
    vector<int> fullBloomFlowers(vector<vector<int>>& flowers, vector<int>& people) {

    }
};`,
    reference: `class Solution {
public:
    vector<int> fullBloomFlowers(vector<vector<int>>& flowers, vector<int>& people) {
        vector<int> starts, ends;
        for (auto& f : flowers) { starts.push_back(f[0]); ends.push_back(f[1]); }
        sort(starts.begin(), starts.end());
        sort(ends.begin(), ends.end());
        vector<int> res;
        for (int t : people) {
            int started = upper_bound(starts.begin(), starts.end(), t) - starts.begin();
            int ended = lower_bound(ends.begin(), ends.end(), t) - ends.begin();  // end < t
            res.push_back(started - ended);
        }
        return res;
    }
};`,
    brute: `class Solution {
public:
    // Every flower for every person: O(n * m).
    vector<int> fullBloomFlowers(vector<vector<int>>& flowers, vector<int>& people) {
        vector<int> res;
        for (int t : people) {
            int c = 0;
            for (auto& f : flowers) c += f[0] <= t && t <= f[1];
            res.push_back(c);
        }
        return res;
    }
};`,
    cases: [
      { name: "example", args: ["{{1, 6}, {3, 7}, {9, 12}, {4, 13}}", "{2, 3, 7, 11}"] },
      { name: "example 2", args: ["{{1, 10}, {3, 3}}", "{3, 3, 2}"] },
      { name: "at the end exactly", args: ["{{1, 5}}", "{5, 6, 0, 1}"] },
      { name: "large times", args: ["{{1, 1000000000}}", "{1000000000}"] },
    ],
    random: { count: 400, gen: "{ int lt_n = rnd(1, 8); flowers.clear(); for (int i = 0; i < lt_n; ++i) { int lt_s = rnd(1, 12); flowers.push_back({lt_s, lt_s + rnd(0, 5)}); } people = rnd_vec(rnd(1, 6), 1, 18); }" },
    stress: { label: "5 · 10⁴ flowers and people", gen: "{ flowers.clear(); for (int i = 0; i < 50000; ++i) { int lt_s = rnd(1, 999999999); flowers.push_back({lt_s, rnd(lt_s, 1000000000)}); } people = rnd_vec(50000, 1, 1000000000); }" },
  },
});
