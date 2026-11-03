import { light } from "./leet-light.js";

export const lc1552 = light({
  number: 1552,
  title: "Magnetic Force Between Two Balls",
  slug: "magnetic-force-between-two-balls",
  difficulty: "M",
  pattern: "B1",
  topic: "B1 · Binary search on the answer",
  see: 875,
  themes: ["Maximise the minimum", "Greedy check"],
  blurb: "Maximise the minimum gap: search the gap, and greedily place each ball at the first position at least that far from the previous one.",
  statement: [
    "Baskets sit at distinct positions on a line. Place m balls in different baskets so that the smallest distance between any two balls is as large as possible, and return that distance.",
    "Up to 10⁵ baskets; positions up to 10⁹; 2 ≤ m ≤ n.",
  ],
  hints: [
    "Guess the answer d. Can you check whether a minimum gap of d is achievable?",
    "Sort, put the first ball in the first basket, then each next ball in the first basket at least d further on.",
    "If d is achievable, so is every smaller d. Search for the largest achievable d.",
    "Note the direction: you want the last true, so use mid = (lo + hi + 1) / 2.",
  ],
  brute: "Try every gap from the largest possible down, each with the greedy check: O(n · range), hopeless with positions up to 10⁹.",
  invariant: "fits(lo) is true and fits(hi + 1) is false, so the answer stays in [lo, hi].",
  traps: [
    "Forgetting to sort the positions.",
    "Infinite loop with mid = (lo + hi) / 2 when searching for the last true: round up.",
    "Upper bound overflow: (max − min) / (m − 1) is a tighter and safer bound.",
  ],
  followUps: [
    "2226 Maximum Candies Allocated to K Children: maximise the minimum share.",
    "1011 / 410: the mirror image, minimising the maximum.",
    "Return the positions chosen.",
  ],
  explanation: [
    "If the balls can be placed with every gap at least d, they can be placed with every gap at least d − 1 too. So the answer is the largest feasible d, found by binary search.",
    "Checking d is greedy on the sorted positions: put a ball in the first basket and, scanning right, put the next ball in the first basket at distance ≥ d from the last ball placed. Placing each ball as early as possible leaves the most room for the rest, so if this greedy cannot place m balls, nothing can.",
    "The largest possible answer is (last − first) / (m − 1), so search [1, that].",
    { tip: "Signal: \"maximise the minimum distance\". Binary search the distance; greedily place as early as allowed." },
  ],
  analysis: {
    time: "O(n log n) for the sort plus O(n log(range)) for the search",
    space: "O(1) extra",
    notes: ["About 30 greedy passes over 10⁵ positions."],
  },
  tests: {
    fn: "maxDistance",
    args: [{ type: "vector<int>", name: "position" }, { type: "int", name: "m" }],
    starter: `class Solution {
public:
    int maxDistance(vector<int>& position, int m) {

    }
};`,
    reference: `class Solution {
public:
    int maxDistance(vector<int>& position, int m) {
        sort(position.begin(), position.end());
        auto fits = [&](int d) {
            int placed = 1, last = position[0];
            for (int p : position)
                if (p - last >= d) ++placed, last = p;
            return placed >= m;
        };
        int lo = 1, hi = (position.back() - position[0]) / (m - 1);
        while (lo < hi) {
            int d = lo + (hi - lo + 1) / 2;  // round up: we want the last d that fits
            if (fits(d)) lo = d;
            else hi = d - 1;
        }
        return lo;
    }
};`,
    brute: `class Solution {
public:
    // Every gap from the largest possible downward: O(n * range).
    int maxDistance(vector<int>& position, int m) {
        sort(position.begin(), position.end());
        for (int d = (position.back() - position[0]) / (m - 1); d > 1; --d) {
            int placed = 1, last = position[0];
            for (int p : position)
                if (p - last >= d) ++placed, last = p;
            if (placed >= m) return d;
        }
        return 1;
    }
};`,
    cases: [
      { name: "example", args: ["{1, 2, 3, 4, 7}", "3"] },
      { name: "example 2", args: ["{5, 4, 3, 2, 1, 1000000000}", "2"] },
      { name: "all baskets", args: ["{1, 3, 6, 10}", "4"] },
      { name: "unsorted", args: ["{79, 74, 57, 22}", "4"] },
    ],
    random: { count: 400, gen: "{ set<int> lt_s; int lt_n = rnd(2, 8); while ((int)lt_s.size() < lt_n) lt_s.insert(rnd(1, 30)); position.assign(lt_s.begin(), lt_s.end()); for (int i = lt_n - 1; i > 0; --i) swap(position[i], position[rnd(0, i)]); m = rnd(2, lt_n); }" },
    stress: { label: "10⁵ baskets spread over 10⁹, m = 5·10⁴", gen: "position.resize(100000); for (int i = 0; i < 100000; ++i) position[i] = 1 + i * 10000 + rnd(0, 9999); m = 50000;" },
  },
});
