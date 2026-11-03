import { light } from "./leet-light.js";

export const lc1482 = light({
  number: 1482,
  title: "Minimum Number of Days to Make m Bouquets",
  slug: "minimum-number-of-days-to-make-m-bouquets",
  difficulty: "M",
  pattern: "B1",
  topic: "B1 · Binary search on the answer",
  see: 875,
  themes: ["Binary search on time", "Greedy check"],
  blurb: "Search the day; on a given day, count runs of bloomed adjacent flowers and how many bouquets of k they make.",
  statement: [
    "Flower i blooms on day bloomDay[i] and stays bloomed. A bouquet takes k adjacent bloomed flowers, and each flower can be used once. Return the earliest day on which m bouquets can be made, or −1 if it is impossible.",
    "Up to 10⁵ flowers; bloom days up to 10⁹; m up to 10⁶ and k up to n.",
  ],
  hints: [
    "When is it impossible regardless of the day?",
    "When m · k > n (careful: m · k can overflow int).",
    "On a fixed day, how many bouquets can you make? Scan for runs of bloomed flowers.",
    "More days never hurt, so binary search the day between the smallest and largest bloom day.",
  ],
  brute: "Try every distinct bloom day in increasing order with the linear check: O(n²) when all bloom days differ.",
  invariant: "bouquets(lo − 1) < m ≤ bouquets(hi) for the search range [lo, hi].",
  traps: [
    "m · k overflows int: 10⁶ · 10⁵. Check in long long.",
    "Counting a run of length L as one bouquet instead of ⌊L / k⌋; the greedy takes them left to right.",
    "Searching from day 0 or 1 is fine but wastes steps; the answer is always one of the bloom days.",
  ],
  followUps: [
    "Binary search over the sorted distinct bloom days instead of the value range.",
    "Flowers wilt after w days: the check becomes a window.",
    "1552 Magnetic Force Between Two Balls: maximise the minimum, the same shape of search.",
  ],
  explanation: [
    "If m bouquets can be made on day d, they can be made on any later day, since flowers stay bloomed. So the answer is the smallest feasible day, which binary search finds. If m · k exceeds the number of flowers, no day works.",
    "Checking a day is a single scan: walk the flowers, extending a run while bloomDay[i] ≤ d. Each time the run reaches k, count a bouquet and reset it; an unbloomed flower also resets it. Taking bouquets as early as possible in each run is optimal.",
    "The search range is the bloom days themselves, from the minimum to the maximum: O(n log(max day)).",
    { tip: "Signal: \"earliest time such that\" with a monotone condition. Binary search on time with a linear check." },
  ],
  analysis: {
    time: "O(n log(max day)), about 30 scans",
    space: "O(1)",
    notes: ["Searching over the sorted distinct days gives O(n log n) and avoids the value range."],
  },
  tests: {
    fn: "minDays",
    args: [{ type: "vector<int>", name: "bloomDay" }, { type: "int", name: "m" }, { type: "int", name: "k" }],
    starter: `class Solution {
public:
    int minDays(vector<int>& bloomDay, int m, int k) {

    }
};`,
    reference: `class Solution {
public:
    int minDays(vector<int>& bloomDay, int m, int k) {
        if ((long long)m * k > (long long)bloomDay.size()) return -1;
        int lo = *min_element(bloomDay.begin(), bloomDay.end());
        int hi = *max_element(bloomDay.begin(), bloomDay.end());
        while (lo < hi) {
            int d = lo + (hi - lo) / 2;
            if (bouquets(bloomDay, d, k) >= m) hi = d;
            else lo = d + 1;
        }
        return lo;
    }

private:
    int bouquets(const vector<int>& b, int day, int k) {
        int made = 0, run = 0;
        for (int x : b) {
            run = x <= day ? run + 1 : 0;
            if (run == k) ++made, run = 0;
        }
        return made;
    }
};`,
    brute: `class Solution {
public:
    // Every bloom day in increasing order: O(n^2) with distinct days.
    int minDays(vector<int>& bloomDay, int m, int k) {
        if ((long long)m * k > (long long)bloomDay.size()) return -1;
        vector<int> days(bloomDay);
        sort(days.begin(), days.end());
        days.erase(unique(days.begin(), days.end()), days.end());
        for (int d : days) {
            int made = 0, run = 0;
            for (int x : bloomDay) {
                run = x <= d ? run + 1 : 0;
                if (run == k) ++made, run = 0;
            }
            if (made >= m) return d;
        }
        return -1;
    }
};`,
    cases: [
      { name: "example", args: ["{1, 10, 3, 10, 2}", "3", "1"] },
      { name: "impossible", args: ["{1, 10, 3, 10, 2}", "3", "2"] },
      { name: "example 3", args: ["{7, 7, 7, 7, 12, 7, 7}", "2", "3"] },
      { name: "overflowing m · k", args: ["{1, 2}", "1000000", "100000"] },
      { name: "late bloomer in the middle", args: ["{1, 1, 9, 1, 1}", "1", "5"] },
    ],
    random: { count: 400, gen: "bloomDay = rnd_vec(rnd(1, 9), 1, 9); m = rnd(1, 4); k = rnd(1, 3);" },
    stress: { label: "10⁵ flowers, distinct days", gen: "bloomDay.resize(100000); for (int i = 0; i < 100000; ++i) bloomDay[i] = 1 + (int)((long long)i * 7919 % 100000) * 10000; m = 1; k = 100000;" },
  },
});
