import { light } from "./leet-light.js";

export const lc881 = light({
  number: 881,
  title: "Boats to Save People",
  slug: "boats-to-save-people",
  difficulty: "M",
  pattern: "A5",
  topic: "A5 · Two pointers",
  see: 42,
  themes: ["Greedy pairing", "Sorting"],
  blurb: "Sort; the heaviest person always takes a boat, and rides with the lightest if they fit together.",
  statement: [
    "Each boat carries at most two people with total weight at most limit. Every person weighs at most limit. Return the fewest boats that carry everyone.",
    "Up to 5·10⁴ people; weights and limit up to 3·10⁴.",
  ],
  hints: [
    "Who is hardest to place?",
    "The heaviest person. Who should share their boat, if anyone?",
    "The lightest: if even the lightest does not fit, nobody does.",
    "Sort, then two pointers: always send the heaviest; also send the lightest when they fit.",
  ],
  brute: "Try every way to pair people up, as a bitmask DP over who is already placed: O(2ⁿ · n), fine for ten people and impossible for fifty. (The brute force here gives up and returns −1 above 22 people.)",
  invariant: "After each step, the people between the pointers are exactly those not yet placed, and the boats used so far are as few as any solution for the people already placed.",
  traps: [
    "Pairing the heaviest with the heaviest partner that fits is correct but slower; the lightest suffices.",
    "Forgetting the case l == r: one last person alone.",
  ],
  followUps: [
    "Boats carry any number of people up to the limit: bin packing, NP-hard.",
    "2410 Maximum Matching of Players With Trainers: the same two-pointer pairing.",
    "Minimise the maximum pair sum (1877): pair smallest with largest.",
  ],
  explanation: [
    "Sort the weights. The heaviest person needs a boat no matter what. If the lightest person fits with them, pairing them is safe: an exchange argument shows any optimal solution can be rearranged so that the lightest rides with the heaviest, since the lightest fits with anyone the heaviest's partner would. If the lightest does not fit, the heaviest rides alone.",
    "Two pointers implement this: r at the heaviest, l at the lightest. Each step uses one boat, moves r left, and moves l right when the pair fits.",
    { tip: "Signal: pair items under a sum limit to minimise groups. Sort, then match the extremes." },
  ],
  analysis: {
    time: "O(n log n) for the sort; counting sort makes it O(n + limit)",
    space: "O(1) extra",
    notes: ["Weights are at most 3·10⁴, so a counting sort is a real option."],
  },
  tests: {
    fn: "numRescueBoats",
    args: [{ type: "vector<int>", name: "people" }, { type: "int", name: "limit" }],
    starter: `class Solution {
public:
    int numRescueBoats(vector<int>& people, int limit) {

    }
};`,
    reference: `class Solution {
public:
    int numRescueBoats(vector<int>& people, int limit) {
        sort(people.begin(), people.end());
        int boats = 0;
        for (int l = 0, r = people.size() - 1; l <= r; --r, ++boats)
            if (people[l] + people[r] <= limit) ++l;  // the lightest rides along
        return boats;
    }
};`,
    brute: `class Solution {
public:
    // Try every way of pairing people up (bitmask DP over who is placed): O(2^n * n).
    int numRescueBoats(vector<int>& people, int limit) {
        int n = people.size();
        if (n > 22) return -1;  // 2^n states will not fit
        vector<int> dp(1 << n, INT_MAX);
        dp[0] = 0;
        for (int mask = 0; mask < (1 << n); ++mask) {
            if (dp[mask] == INT_MAX) continue;
            int i = 0;
            while (mask >> i & 1) ++i;  // the first person not yet placed
            if (i == n) continue;
            int m1 = mask | 1 << i;
            dp[m1] = min(dp[m1], dp[mask] + 1);
            for (int j = i + 1; j < n; ++j)
                if (!(mask >> j & 1) && people[i] + people[j] <= limit)
                    dp[m1 | 1 << j] = min(dp[m1 | 1 << j], dp[mask] + 1);
        }
        return dp[(1 << n) - 1];
    }
};`,
    cases: [
      { name: "example", args: ["{1, 2}", "3"] },
      { name: "example 2", args: ["{3, 2, 2, 1}", "3"] },
      { name: "example 3", args: ["{3, 5, 3, 4}", "5"] },
      { name: "one person", args: ["{7}", "7"] },
      { name: "everyone pairs", args: ["{1, 1, 1, 1}", "2"] },
    ],
    random: { count: 300, gen: "limit = rnd(3, 10); people = rnd_vec(rnd(1, 10), 1, limit);" },
    stress: { label: "5·10⁴ people", gen: "limit = 30000; people = rnd_vec(50000, 1, 30000);" },
  },
});
