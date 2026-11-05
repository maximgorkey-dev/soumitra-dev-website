import { study } from "./leet-light.js";

export const lc494 = study({
  number: 494,
  title: "Target Sum",
  slug: "target-sum",
  difficulty: "M",
  pattern: "F5",
  topic: "F5 · Knapsack and counting",
  see: 416,
  themes: ["Counting subsets", "Algebraic reduction", "0/1 knapsack"],
  blurb: "Putting + on a set P and − on the rest gives sum(P) − (total − sum(P)) = target, so sum(P) = (total + target) / 2. Count the subsets with that sum using a 0/1 knapsack that adds counts instead of OR-ing booleans.",
  statement: [
    "Given non-negative integers nums and an integer target, put a + or a − in front of every number. Return how many sign assignments make the expression equal target.",
    "Up to 20 numbers, each at most 1000, with total at most 1000. Example: [1, 1, 1, 1, 1] with target 3 gives 5 (choose which single 1 is negative).",
  ],
  concepts: [
    "Algebraic reduction: if P is the set with plus signs, sum(P) − (total − sum(P)) = target, so sum(P) = (total + target) / 2. Each assignment is exactly one subset P.",
    "Feasibility from parity: (total + target) must be even and |target| ≤ total, or the count is 0.",
    "Counting knapsack: ways[s] is the number of subsets summing to s. It is 416's reachability table with + in place of OR.",
    "Downward capacity loop: each number joins P at most once.",
    "Zeros count twice automatically: with x = 0 the update ways[s] += ways[s] doubles every entry, which is right because +0 and −0 are different assignments.",
  ],
  hints: [
    "With n ≤ 20, 2ⁿ is about a million, so plain recursion passes. Write it, then look for the faster idea.",
    "Call P the numbers that get a plus sign. Write the final value in terms of sum(P) and the total.",
    "So you need the number of subsets with one specific sum. How is that like 416?",
    "Same table, but store counts. Check the cases where the target sum is not an integer or is out of range.",
  ],
  brute: [
    "Recurse over the numbers, adding or subtracting each, and count the ends equal to target: 2ⁿ leaves, about 10⁶ for n = 20, which passes here but doubles with every extra number.",
    "The memoised version over (index, running sum) has n × (2 × total + 1) states, about 40 000, and is a fine answer. The subset-sum reduction halves the range and makes it a one-dimensional table.",
  ],
  invariant: "After processing the first i numbers, ways[s] is the number of subsets of those i numbers (as index sets) whose sum is s, for 0 ≤ s ≤ P.",
  traps: [
    "Not checking |target| ≤ total: (total + target) / 2 can be negative, and indexing a vector with it crashes.",
    "Not checking parity: (total + target) odd means no assignment works, but integer division would silently round.",
    "Looping s upward: a number would be counted in P several times.",
    "Special-casing zeros: unnecessary, since the update at x = 0 doubles each count, which is exactly the two signs of 0. Adding extra handling double-doubles.",
    "Memo keyed on the running sum without an offset: sums range from −total to total, so shift by total before indexing an array.",
  ],
  followUps: [
    "Why the bijection is exact: an assignment determines P (the plus positions), and P determines the assignment. So counting subsets with the right sum counts assignments.",
    "Return one assignment: keep the 2D table and walk back from (n, P).",
    "Larger n with small values: the same O(n × total) DP. Larger values with n ≤ 40: meet in the middle, count the sums of each half and match.",
    "Allow multiplication or concatenation between digits (282, Expression Add Operators): no longer a subset sum; backtracking with the last term tracked.",
    "Count assignments with result at most target: prefix-sum the final ways array over the valid parities.",
  ],
  explanation: [
    { h: "From signs to a subset" },
    "Let P be the numbers that get +, and N the rest. Then sum(P) − sum(N) = target and sum(P) + sum(N) = total. Adding the two equations: sum(P) = (total + target) / 2. Every sign assignment is one choice of P, so the answer is the number of subsets summing to that value, call it S.",
    "If total + target is odd, or |target| > total, no subset fits and the answer is 0.",
    { h: "What the table means" },
    "ways[s] counts the subsets of the numbers processed so far whose sum is exactly s. Subsets are sets of positions, so two equal numbers in different positions give different subsets, as the problem wants.",
    { h: "Base case" },
    "Before any number, only the empty subset exists: ways[0] = 1, everything else 0.",
    { h: "Adding one number x" },
    {
      list: [
        "Subsets without x keep their sums: ways[s] stays.",
        "Subsets with x add x to a subset of the earlier numbers: they contribute ways[s − x] (the old value).",
        "Loop s from S down to x so ways[s − x] is still the old value.",
      ],
    },
    { code: "ways[0] = 1\nfor each x:\n    for s = S down to x:\n        ways[s] += ways[s - x]\nanswer = ways[S],  S = (total + target) / 2" },
    { h: "A worked example: [1, 1, 1, 1, 1], target 3" },
    "total = 5, so S = (5 + 3) / 2 = 4: choose which four 1s get a plus sign.",
    {
      table: {
        head: ["after", "ways[0]", "ways[1]", "ways[2]", "ways[3]", "ways[4]"],
        rows: [
          ["start", 1, 0, 0, 0, 0],
          ["1st 1", 1, 1, 0, 0, 0],
          ["2nd 1", 1, 2, 1, 0, 0],
          ["3rd 1", 1, 3, 3, 1, 0],
          ["4th 1", 1, 4, 6, 4, 1],
          ["5th 1", 1, 5, 10, 10, "**5**"],
        ],
        caption: "ways[s]: subsets of the ones so far with sum s. Each row is Pascal's triangle, because ways[s] += ways[s − 1]. The answer is ways[4] = 5.",
      },
    },
    "After the third 1, ways[2] = 3: the subsets {1st, 2nd}, {1st, 3rd}, {2nd, 3rd}. The last row's ways[4] = 5 matches the five choices of which 1 gets the minus sign.",
    { h: "Fill order and memory" },
    "n passes over S + 1 entries: O(n × total) time, O(total) space.",
    { tip: "Signal: assign + or − to each number. Rewrite as \"choose the plus set\", which is a subset-sum count." },
  ],
  analysis: {
    time: "O(n × total)",
    space: "O(total)",
    notes: ["Counts here stay below 2²⁰, so int is enough."],
  },
  solution: `class Solution {
public:
    int findTargetSumWays(vector<int>& nums, int target) {
        int total = accumulate(nums.begin(), nums.end(), 0);
        // With P the plus set: sum(P) - (total - sum(P)) = target,
        // so sum(P) = (total + target) / 2 must be a whole number in range.
        if (abs(target) > total || (total + target) % 2 != 0) return 0;
        int need = (total + target) / 2;

        // ways[s]: number of subsets (by position) of the numbers so far
        // whose sum is exactly s.
        vector<int> ways(need + 1, 0);
        ways[0] = 1;                                // the empty subset

        for (int x : nums)
            // Downward: ways[s - x] still counts subsets without x.
            // For x == 0 this doubles every entry, i.e. +0 and -0.
            for (int s = need; s >= x; --s)
                ways[s] += ways[s - x];

        return ways[need];
    }
};
`,
});
