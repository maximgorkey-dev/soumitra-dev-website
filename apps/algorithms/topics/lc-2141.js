import { light } from "./leet-light.js";

export const lc2141 = light({
  number: 2141,
  title: "Maximum Running Time of N Computers",
  slug: "maximum-running-time-of-n-computers",
  difficulty: "H",
  pattern: "B1",
  topic: "B1 · Binary search on the answer",
  see: 875,
  themes: ["Maximise the minimum", "Capped sums"],
  blurb: "n computers can run for T minutes exactly when Σ min(battery, T) ≥ n · T. Binary search T.",
  statement: [
    "You have n computers and some batteries with given charges in minutes. Each computer needs one battery at a time; batteries can be swapped freely and instantly, but one battery cannot power two computers at once. Return the longest time all n computers can run simultaneously.",
    "1 ≤ n ≤ number of batteries ≤ 10⁵; charges up to 10⁹.",
  ],
  hints: [
    "For a target time T, a battery with charge ≥ T is as good as exactly T. Why?",
    "It can power one computer for the whole time but cannot be split across two computers at the same moment.",
    "Claim: T is achievable exactly when Σ min(bᵢ, T) ≥ n · T.",
    "That test is monotone in T. Binary search up to Σ b / n.",
  ],
  brute: "Simulate minute by minute, always using the n fullest batteries: O(answer · m log m), impossible with charges of 10⁹.",
  invariant: "feasible(lo) holds and feasible(hi + 1) fails, where feasible(T) is Σ min(bᵢ, T) ≥ n · T.",
  traps: [
    "Overflow: n · T and the sum reach 10¹⁴. Use long long throughout.",
    "Summing raw charges without the cap: a single huge battery cannot run two computers.",
    "Searching for the first true instead of the last true.",
  ],
  followUps: [
    "Prove the condition is sufficient: arrange the capped charges in a strip of n columns of height T (a wrap-around schedule).",
    "A greedy O(m log m) solution: sort, drop the largest batteries that exceed the average of the rest, one computer at a time.",
    "Batteries can only be swapped at integer minutes: the same answer.",
  ],
  explanation: [
    "Fix a target T. Over T minutes, a battery can contribute at most min(bᵢ, T) minutes of power, because it can serve only one computer at any instant. The computers need n · T minutes in total, so Σ min(bᵢ, T) ≥ n · T is necessary.",
    "It is also sufficient: lay the capped charges end to end and cut the line into n segments of length T, one per computer. Since no capped battery is longer than T, a battery split across two neighbouring segments is used at disjoint times (end of one computer's period, start of the next), so no battery powers two computers at once.",
    "The condition gets harder as T grows, so binary search for the largest T that satisfies it, between 0 and Σ b / n.",
    { tip: "Signal: \"run n things simultaneously from shared resources\" with swapping. Cap each resource at the target and compare total supply with demand." },
  ],
  analysis: {
    time: "O(m log(Σ b / n))",
    space: "O(1)",
    notes: ["The greedy alternative sorts and repeatedly removes the largest battery while it exceeds the average of the rest."],
  },
  tests: {
    fn: "maxRunTime",
    args: [{ type: "int", name: "n" }, { type: "vector<int>", name: "batteries" }],
    starter: `class Solution {
public:
    long long maxRunTime(int n, vector<int>& batteries) {

    }
};`,
    reference: `class Solution {
public:
    long long maxRunTime(int n, vector<int>& batteries) {
        long long lo = 0, hi = accumulate(batteries.begin(), batteries.end(), 0LL) / n;
        while (lo < hi) {
            long long t = lo + (hi - lo + 1) / 2;
            long long supply = 0;
            for (int b : batteries) supply += min<long long>(b, t);  // one battery, one computer at a time
            if (supply >= (long long)n * t) lo = t;
            else hi = t - 1;
        }
        return lo;
    }
};`,
    brute: `class Solution {
public:
    // Minute by minute, run the n fullest batteries: O(answer * m log m).
    long long maxRunTime(int n, vector<int>& batteries) {
        priority_queue<long long> pq(batteries.begin(), batteries.end());
        long long t = 0;
        while (true) {
            vector<long long> used;
            for (int i = 0; i < n; ++i) {
                if (pq.empty() || pq.top() == 0) return t;
                used.push_back(pq.top() - 1);
                pq.pop();
            }
            for (long long x : used) pq.push(x);
            ++t;
        }
    }
};`,
    cases: [
      { name: "example", args: ["2", "{3, 3, 3}"] },
      { name: "example 2", args: ["2", "{1, 1, 1, 1}"] },
      { name: "one computer", args: ["1", "{5, 2}"] },
      { name: "one huge battery", args: ["2", "{100, 1, 1}"] },
      { name: "as many batteries as computers", args: ["3", "{4, 9, 6}"] },
    ],
    random: { count: 400, gen: "n = rnd(1, 4); batteries = rnd_vec(rnd(n, 7), 1, 8);" },
    stress: { label: "10⁵ batteries of up to 10⁹", gen: "n = 1000; batteries = rnd_vec(100000, 1, 1000000000);" },
  },
});
