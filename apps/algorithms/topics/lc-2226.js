import { light } from "./leet-light.js";

export const lc2226 = light({
  number: 2226,
  title: "Maximum Candies Allocated to K Children",
  slug: "maximum-candies-allocated-to-k-children",
  difficulty: "M",
  pattern: "B1",
  topic: "B1 · Binary search on the answer",
  see: 875,
  themes: ["Maximise the minimum", "Overflow"],
  blurb: "Search the share x: piles can be split but not merged, so pile i yields ⌊candies[i] / x⌋ shares. Find the largest x giving k shares.",
  statement: [
    "Piles of candies can be split into smaller piles but never merged. Give each of k children one pile, all the same size. Return the largest possible size; leftover candy is allowed. If even size 1 is impossible, return 0.",
    "Up to 10⁵ piles of up to 10⁷ candies; k up to 10¹².",
  ],
  hints: [
    "If every child can get x candies, can they all get x − 1?",
    "Yes. So search the largest feasible x.",
    "How many children can receive x from pile i?",
    "⌊candies[i] / x⌋. Sum it (in long long, since k is huge) and compare with k.",
  ],
  brute: "Try every share size from the largest pile downward: O(n · max pile), 10¹² steps.",
  invariant: "shares(lo) ≥ k and shares(hi + 1) < k, with shares(0) treated as infinite.",
  traps: [
    "k up to 10¹²: the share count must be long long.",
    "Returning 1 when even that is impossible: the answer is 0 when the total is below k.",
    "Searching for the first true instead of the last: round mid up.",
  ],
  followUps: [
    "1552 Magnetic Force Between Two Balls: the same \"maximise the minimum\" search.",
    "Piles may also be merged: then the answer is just ⌊total / k⌋.",
  ],
  explanation: [
    "A share size x is feasible when Σ ⌊candies[i] / x⌋ ≥ k: each pile splits into that many piles of x (with leftover). Smaller x is always at least as feasible, so search for the largest feasible x.",
    "Search [0, max pile], with 0 standing for \"impossible\". Use mid rounded up, since the search moves lo up to mid on success.",
    { tip: "Signal: \"maximise the equal share\" with splitting allowed. Search the share; count with floor division." },
  ],
  analysis: {
    time: "O(n log(max pile))",
    space: "O(1)",
    notes: ["About 24 passes."],
  },
  tests: {
    fn: "maximumCandies",
    args: [{ type: "vector<int>", name: "candies" }, { type: "long long", name: "k" }],
    starter: `class Solution {
public:
    int maximumCandies(vector<int>& candies, long long k) {

    }
};`,
    reference: `class Solution {
public:
    int maximumCandies(vector<int>& candies, long long k) {
        int lo = 0, hi = *max_element(candies.begin(), candies.end());
        while (lo < hi) {
            int x = lo + (hi - lo + 1) / 2;  // round up: lo moves to x on success
            long long shares = 0;
            for (int c : candies) shares += c / x;
            if (shares >= k) lo = x;
            else hi = x - 1;
        }
        return lo;
    }
};`,
    brute: `class Solution {
public:
    // Every share size from the largest downward: O(n * max pile).
    int maximumCandies(vector<int>& candies, long long k) {
        for (int x = *max_element(candies.begin(), candies.end()); x > 0; --x) {
            long long shares = 0;
            for (int c : candies) shares += c / x;
            if (shares >= k) return x;
        }
        return 0;
    }
};`,
    cases: [
      { name: "example", args: ["{5, 8, 6}", "3"] },
      { name: "impossible", args: ["{2, 5}", "11"] },
      { name: "one child", args: ["{4, 7, 5}", "1"] },
      { name: "huge k", args: ["{10000000}", "1000000000000"] },
    ],
    random: { count: 400, gen: "candies = rnd_vec(rnd(1, 6), 1, 12); k = rnd(1, 20);" },
    stress: { label: "10⁵ piles, two children", gen: "candies = rnd_vec(100000, 1, 10000000); k = 2;" },
  },
});
