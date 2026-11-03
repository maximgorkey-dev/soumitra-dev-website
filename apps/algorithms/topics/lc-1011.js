import { light } from "./leet-light.js";

export const lc1011 = light({
  number: 1011,
  title: "Capacity To Ship Packages Within D Days",
  slug: "capacity-to-ship-packages-within-d-days",
  difficulty: "M",
  pattern: "B1",
  topic: "B1 · Binary search on the answer",
  see: 875,
  themes: ["Minimise the maximum", "Greedy check"],
  blurb: "Search the capacity between the heaviest package and the total; a greedy pass counts the days a capacity needs.",
  statement: [
    "Packages must be shipped in the given order, a contiguous group per day, and a day's load may not exceed the ship's capacity. Return the smallest capacity that ships everything within the given number of days.",
    "Up to 5·10⁴ packages, each weighing 1 to 500; days between 1 and the number of packages.",
  ],
  hints: [
    "If a capacity works, does every larger capacity work?",
    "Yes, so the answer is the smallest capacity that works. What range can it be in?",
    "At least the heaviest package, at most the total weight.",
    "For a candidate capacity, fill each day greedily until the next package would overflow, and count days.",
  ],
  brute: "Try capacities upward from the heaviest package, each checked greedily: O(n · total), about 10¹¹ steps at the limit.",
  invariant: "days(lo − 1) > D ≥ days(hi) throughout, so the answer stays in [lo, hi].",
  traps: [
    "Starting the search at 1: capacities below the heaviest package can never ship it, and the greedy check may loop or miscount.",
    "Counting days as the number of splits rather than splits + 1.",
    "Using > instead of ≥ in the feasibility test.",
  ],
  followUps: [
    "410 Split Array Largest Sum: the same problem, phrased as splitting into k parts.",
    "Packages may be reordered: now it is bin packing, NP-hard.",
    "Return the actual split, not just the capacity.",
  ],
  explanation: [
    "A larger ship never needs more days, so feasibility is monotone in the capacity, and the answer is the smallest feasible capacity. It lies between max(weights), since every package must fit, and sum(weights), which ships everything in one day.",
    "To test a capacity, simulate: load packages in order onto the current day until the next one would exceed the capacity, then start a new day. Greedy loading is optimal for a fixed capacity, because sending a package later never helps.",
    "Binary search the capacity with this O(n) check: O(n log(sum)).",
    { tip: "Signal: \"minimum capacity, speed or largest part such that it can be done within D\". Binary search the answer; the check is a greedy pass." },
  ],
  analysis: {
    time: "O(n log(Σw)), about 25 passes",
    space: "O(1)",
    notes: ["The total weight is at most 2.5·10⁷, so int is enough."],
  },
  tests: {
    fn: "shipWithinDays",
    args: [{ type: "vector<int>", name: "weights" }, { type: "int", name: "days" }],
    starter: `class Solution {
public:
    int shipWithinDays(vector<int>& weights, int days) {

    }
};`,
    reference: `class Solution {
public:
    int shipWithinDays(vector<int>& weights, int days) {
        int lo = *max_element(weights.begin(), weights.end());
        int hi = accumulate(weights.begin(), weights.end(), 0);
        while (lo < hi) {
            int cap = lo + (hi - lo) / 2;
            if (daysNeeded(weights, cap) <= days) hi = cap;
            else lo = cap + 1;
        }
        return lo;
    }

private:
    int daysNeeded(const vector<int>& w, int cap) {
        int d = 1, load = 0;
        for (int x : w) {
            if (load + x > cap) ++d, load = 0;
            load += x;
        }
        return d;
    }
};`,
    brute: `class Solution {
public:
    // Every capacity from the heaviest package upward: O(n * total).
    int shipWithinDays(vector<int>& weights, int days) {
        for (int cap = *max_element(weights.begin(), weights.end());; ++cap) {
            int d = 1, load = 0;
            for (int x : weights) {
                if (load + x > cap) ++d, load = 0;
                load += x;
            }
            if (d <= days) return cap;
        }
    }
};`,
    cases: [
      { name: "example", args: ["{1, 2, 3, 4, 5, 6, 7, 8, 9, 10}", "5"] },
      { name: "example 2", args: ["{3, 2, 2, 4, 1, 4}", "3"] },
      { name: "example 3", args: ["{1, 2, 3, 1, 1}", "4"] },
      { name: "one day", args: ["{5, 5, 5}", "1"] },
      { name: "a day per package", args: ["{7, 2, 9}", "3"] },
    ],
    random: { count: 400, gen: "weights = rnd_vec(rnd(1, 8), 1, 9); days = rnd(1, weights.size());" },
    stress: { label: "5·10⁴ packages, 2 days", gen: "weights = rnd_vec(50000, 1, 500); days = 2;" },
  },
});
