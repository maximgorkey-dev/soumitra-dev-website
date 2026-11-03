import { light } from "./leet-light.js";

export const lc2187 = light({
  number: 2187,
  title: "Minimum Time to Complete Trips",
  slug: "minimum-time-to-complete-trips",
  difficulty: "M",
  pattern: "B1",
  topic: "B1 · Binary search on the answer",
  see: 875,
  themes: ["Binary search on time", "Overflow"],
  blurb: "In time T, bus i completes ⌊T / time[i]⌋ trips. Binary search the smallest T whose total reaches the target, and stop summing early to avoid overflow.",
  statement: [
    "Each bus repeatedly makes trips, bus i taking time[i] per trip, all independently and in parallel. Return the least total time for all buses together to complete at least totalTrips trips.",
    "Up to 10⁵ buses; trip times and totalTrips up to 10⁷.",
  ],
  hints: [
    "In T units of time, how many trips does bus i finish?",
    "⌊T / time[i]⌋. The total only grows with T.",
    "What is a safe upper bound for T?",
    "The fastest bus alone: min(time) · totalTrips, up to 10¹⁴. Search in long long.",
  ],
  brute: "Advance time one unit at a time and recount: O(answer · n), up to 10¹⁹.",
  invariant: "trips(lo − 1) < totalTrips ≤ trips(hi).",
  traps: [
    "Overflow: T reaches 10¹⁴, and the trip sum can exceed even that. Cap the sum once it reaches totalTrips.",
    "Upper bound of max(time) · totalTrips: correct but needlessly large, 10¹⁴ either way.",
  ],
  followUps: [
    "2594 Minimum Time to Repair Cars: mechanic i takes rᵢ · c² minutes for c cars.",
    "1011 / 875: the same search with a different count.",
    "A priority queue simulating trip completions: O(totalTrips log n), too slow here.",
  ],
  explanation: [
    "By time T, bus i has finished ⌊T / time[i]⌋ trips, and the total over all buses never decreases as T grows. So the answer is the smallest T whose total reaches totalTrips, found by binary search.",
    "The upper bound min(time) · totalTrips suffices, since the fastest bus alone gets there. The count loop should stop as soon as the running total reaches totalTrips, both to save time and to keep the sum from overflowing.",
    { tip: "Signal: parallel workers with fixed rates and \"minimum time to finish N units\". Binary search time; count with floor divisions." },
  ],
  analysis: {
    time: "O(n log(min(time) · totalTrips)), about 47 passes",
    space: "O(1)",
    notes: ["The early exit in the count matters more for overflow than for speed."],
  },
  tests: {
    fn: "minimumTime",
    args: [{ type: "vector<int>", name: "time" }, { type: "int", name: "totalTrips" }],
    starter: `class Solution {
public:
    long long minimumTime(vector<int>& time, int totalTrips) {

    }
};`,
    reference: `class Solution {
public:
    long long minimumTime(vector<int>& time, int totalTrips) {
        long long lo = 1, hi = (long long)*min_element(time.begin(), time.end()) * totalTrips;
        while (lo < hi) {
            long long T = lo + (hi - lo) / 2;
            long long trips = 0;
            for (int t : time)
                if ((trips += T / t) >= totalTrips) break;  // enough; also avoids overflow
            if (trips >= totalTrips) hi = T;
            else lo = T + 1;
        }
        return lo;
    }
};`,
    brute: `class Solution {
public:
    // Advance time one unit at a time: O(answer * n).
    long long minimumTime(vector<int>& time, int totalTrips) {
        for (long long T = 1;; ++T) {
            long long trips = 0;
            for (int t : time) trips += T / t;
            if (trips >= totalTrips) return T;
        }
    }
};`,
    cases: [
      { name: "example", args: ["{1, 2, 3}", "5"] },
      { name: "example 2", args: ["{2}", "1"] },
      { name: "equal buses", args: ["{4, 4, 4}", "7"] },
        { name: "one slow bus", args: ["{10000000}", "3"] },
    ],
    random: { count: 400, gen: "time = rnd_vec(rnd(1, 6), 1, 9); totalTrips = rnd(1, 20);" },
    stress: { label: "10⁵ slow buses, 10⁷ trips", gen: "time = rnd_vec(100000, 9000000, 10000000); totalTrips = 10000000;" },
  },
});
