import { study } from "./leet-light.js";

export const lc416 = study({
  number: 416,
  title: "Partition Equal Subset Sum",
  slug: "partition-equal-subset-sum",
  difficulty: "M",
  pattern: "F5",
  topic: "F5 · Knapsack and counting",
  themes: ["0/1 knapsack", "Reachable sums", "Bitset"],
  blurb: "Splitting into two equal halves means finding a subset that sums to half the total. Track which sums are reachable using the items seen so far; each item either joins or not, so iterate the sums downward to use it at most once.",
  statement: [
    "Given positive integers nums, decide whether they can be split into two groups with equal sums (every number in exactly one group).",
    "Up to 200 numbers, each at most 100. Example: [1, 5, 11, 5] is true ({11} and {1, 5, 5}); [1, 2, 3, 5] is false (total 11 is odd).",
  ],
  concepts: [
    "Reduction: two equal halves exist exactly when some subset sums to total / 2. If the total is odd, the answer is immediately false.",
    "0/1 knapsack as reachability: can[s] says whether some subset of the items seen so far sums to s.",
    "Bounded value range: sums never exceed 100 × 200 / 2 = 10⁴, so a table over sums is small, although the number of subsets is 2²⁰⁰.",
    "Iterating capacity downward: updating can[s] from can[s − x] with s decreasing ensures each item is used at most once.",
    "Bitset speed-up: the whole row update is a shift and an OR, can |= can << x.",
  ],
  hints: [
    "If the two groups are equal, what does each one sum to?",
    "So the question is whether some subset hits a fixed target T. What would you need to know after looking at the first i numbers?",
    "Which sums up to T are reachable with those numbers. How does the set change when number x arrives?",
    "Every old reachable sum s also gives s + x. Update a boolean array in place, but in which direction so that x is not used twice?",
  ],
  brute: [
    "Try all 2ⁿ subsets and check whether one sums to T. With n = 200 that is about 10⁶⁰.",
    "Different subsets often hit the same sum, and from then on they are interchangeable: only the fact that the sum is reachable matters. There are at most T + 1 ≤ 10⁴ + 1 distinct sums, so tracking reachable sums replaces 2ⁿ subsets with n × T work.",
  ],
  invariant: "After processing the first i numbers, can[s] is true exactly when some subset of those i numbers sums to s (for 0 ≤ s ≤ T).",
  traps: [
    "Looping s upward: then can[s − x] may already include x itself, so x gets used two or more times. [1, 5] with T = 3 would wrongly report true, using the 1 three times.",
    "Forgetting the odd-total check: T = total / 2 rounds down, and the DP might find that rounded target.",
    "Using the total instead of the half as the capacity: correct but twice the work, and it invites off-by-one errors in the final lookup.",
    "Greedy (sort descending, add to the lighter group): [3, 3, 2, 2, 2] has the partition {3, 3} and {2, 2, 2}, which this greedy misses.",
    "Not stopping early: once can[T] is true you can return, which matters when this is a subroutine.",
  ],
  followUps: [
    "Bitset version: bitset<10001> b; b[0] = 1; for each x, b |= b << x; return b[T]. About 64 times faster in practice.",
    "Return the two groups: keep a 2D table (or the item that first made each sum reachable) and walk back from T.",
    "Split into k equal groups (698): no longer a sum DP; use a bitmask DP or backtracking with pruning, because the groups interact.",
    "Minimise the difference instead (1049, Last Stone Weight II): the same reachable-sums table, then the largest reachable s ≤ total / 2.",
    "Values up to 10⁹ with n ≤ 40: the table is too big. Meet in the middle, enumerate each half's subset sums and match with sorting or a hash set.",
  ],
  explanation: [
    { h: "Reducing to a target sum" },
    "If the numbers split into two groups with equal sums, each group sums to total / 2. Conversely, if any subset sums to total / 2, its complement sums to the same. So the question becomes: does some subset hit T = total / 2? An odd total cannot be halved, answer false.",
    { h: "What the table means" },
    "can[s], for 0 ≤ s ≤ T, is true when some subset of the numbers processed so far adds up to exactly s. It is one row of the classic knapsack table, reused in place.",
    { h: "Base case" },
    "Before any number, only the empty subset exists, so can[0] = true and every other entry is false.",
    { h: "Adding one number x" },
    {
      list: [
        "Every subset reachable before stays reachable (leave x out).",
        "Every reachable sum s − x also gives s with x added (put x in).",
        "Go through s from T down to x. Going down means can[s − x] still holds the value from before x was added, so x is used at most once.",
      ],
    },
    { code: "can[0] = true\nfor each x:\n    for s = T down to x:\n        can[s] = can[s] or can[s - x]\nanswer = can[T]" },
    { h: "A worked example: [1, 5, 11, 5], T = 11" },
    {
      table: {
        head: ["after", "reachable sums (≤ 11)", "new this step"],
        rows: [
          ["start", "0", ""],
          ["1", "0, 1", "1"],
          ["5", "0, 1, 5, 6", "5, 6"],
          ["11", "0, 1, 5, 6, **11**", "11"],
          ["5", "0, 1, 5, 6, 10, **11**", "10 (and 11 again)"],
        ],
        caption: "The set of sums that some subset of the numbers so far can make. T = 11 becomes reachable at the third number, so the answer is true.",
      },
    },
    "After the first 5, sum 6 appears because 1 was reachable and 1 + 5 = 6. When the second 5 arrives, the downward loop reaches s = 10 while can[5] still means \"5 from the first two numbers\", so 10 = 5 + 5 uses two different fives. Had the loop gone upward, can[5] would also flip 10 and then 15 on a single five.",
    { h: "Fill order and memory" },
    "n passes over at most T + 1 entries: O(n × T) time with T ≤ 10⁴, so at most 2 × 10⁶ steps, and O(T) space.",
    { tip: "Signal: choose a subset to hit a sum, with small values. Track reachable sums; loop capacity downward for use-once items." },
  ],
  analysis: {
    time: "O(n × total)",
    space: "O(total)",
    notes: ["The bitset form does the same work 64 sums at a time."],
  },
  solution: `class Solution {
public:
    bool canPartition(vector<int>& nums) {
        int total = accumulate(nums.begin(), nums.end(), 0);
        if (total % 2 != 0) return false;   // an odd total cannot be halved
        int target = total / 2;

        // can[s]: some subset of the numbers seen so far sums to exactly s.
        vector<char> can(target + 1, 0);
        can[0] = 1;                         // the empty subset

        for (int x : nums) {
            // Downward, so can[s - x] still describes the subsets WITHOUT x
            // and each number is used at most once.
            for (int s = target; s >= x; --s)
                if (can[s - x]) can[s] = 1;
            if (can[target]) return true;   // no need to look further
        }
        return can[target];
    }
};

// Bitset version: bit s is set when sum s is reachable.
//   bitset<10001> b;  b[0] = 1;
//   for (int x : nums) b |= b << x;    // every reachable s also gives s + x
//   return b[target];
`,
});
