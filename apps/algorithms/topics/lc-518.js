import { study } from "./leet-light.js";

export const lc518 = study({
  number: 518,
  title: "Coin Change II",
  slug: "coin-change-ii",
  difficulty: "M",
  pattern: "F5",
  topic: "F5 · Knapsack and counting",
  see: 322,
  themes: ["Counting combinations", "Loop order", "Unbounded knapsack"],
  blurb: "ways[a] counts the multisets of coins summing to a. Process the coins one at a time in the outer loop, so every combination is built in coin order and counted once; looping the amount outside would count orderings instead.",
  statement: [
    "Given an amount and coin denominations (unlimited supply of each), return the number of combinations of coins that make the amount. Combinations ignore order: 1 + 2 and 2 + 1 are the same. The answer fits in a signed 32-bit integer.",
    "Up to 300 denominations, amount up to 5000. Example: amount 5, coins [1, 2, 5] gives 4: 5, 2 + 2 + 1, 2 + 1 + 1 + 1, 1 + 1 + 1 + 1 + 1.",
  ],
  concepts: [
    "Counting combinations, not sequences: a combination is a multiset of coins, so each must be produced in exactly one canonical order.",
    "Canonical order by loop structure: with coins in the outer loop, the table after coin j counts combinations using only the first j coin types, so every combination is built type by type.",
    "Unbounded knapsack: within one coin's pass, the amount goes upward so the same coin can be added again and again.",
    "Contrast with 377 (Combination Sum IV): amount outside and coins inside counts ordered sequences instead.",
    "Intermediate overflow: some intermediate counts can exceed 32 bits even though the final answer does not, so use a wide unsigned type.",
  ],
  hints: [
    "Write the obvious dp[a] = sum over coins of dp[a − c]. Check it on amount 3, coins [1, 2]. Do you get 2 or 3?",
    "It counts 1 + 2 and 2 + 1 separately. You need each multiset once. How can you force one particular order?",
    "Decide all the 1s first, then all the 2s, then the 5s. What does the table mean after finishing coin type j?",
    "Then swap the loops: coins outer, amounts inner (upward).",
  ],
  brute: [
    "Recurse over coin types: for type j, choose how many copies to use (0, 1, 2, … while the total fits), then move to type j + 1. Exponential without memo: the count of choices multiplies across types.",
    "Its state is (coin type, remaining amount), only coins × amount = 1.5 × 10⁶ distinct states. Filling them as a table gives ways[j][a] = ways[j − 1][a] + ways[j][a − c_j] (skip this type entirely, or use one more copy), and that collapses to a single row reused in place.",
  ],
  invariant: "After processing the first j coin types, ways[a] is the number of multisets of those j types (any number of copies each) summing to a.",
  traps: [
    "Amount in the outer loop and coins in the inner: counts ordered sequences (permutations). For amount 5 with [1, 2, 5] it returns 9 instead of 4.",
    "Looping the amount downward inside a coin's pass: that limits each coin to one copy (0/1 knapsack). For amount 5 with [1, 2, 5] it returns 1, counting only {5}.",
    "Starting ways[0] at 0: the empty combination is the one way to make 0, and every count builds on it.",
    "32-bit overflow in intermediate entries: ways[a] for amounts below the target can be far larger than the final answer. Use unsigned 64-bit; wrap-around is well defined and the true answer fits.",
  ],
  followUps: [
    "Counting ordered sequences (377): swap the loops. Explain why in one sentence: with amounts outside, the last coin can be any type, so different orders are different paths.",
    "Each coin type at most once: loop the amount downward inside each coin, as in 494.",
    "Limited copies per type (bounded knapsack): either split into powers of two (binary splitting) or use a sliding window sum per residue class.",
    "Count ways modulo a prime when the answer is huge: same table, reduce after each addition.",
    "Fewest coins instead of count: 322, where the loop order does not matter because min is order-insensitive.",
  ],
  explanation: [
    { h: "Why the order of loops matters" },
    "A combination like {2, 2, 1} can be written as six sequences. If the DP lets the \"last coin\" be any type at any time, it counts sequences. To count each multiset once, fix an order on coin types and build every combination in that order: first decide how many 1s, then how many 2s, then how many 5s.",
    { h: "What the table means" },
    "After processing coin types c₁, …, cⱼ, ways[a] is the number of multisets made from only those types that sum to a. The answer is ways[amount] after the last type.",
    { h: "Base case" },
    "ways[0] = 1 (the empty combination), every other entry 0, before any coin type.",
    { h: "Adding one coin type c" },
    {
      list: [
        "Combinations that use no c are already counted in ways[a] from earlier types.",
        "Combinations that use c at least once: remove one copy, leaving a combination for a − c that may still contain c. That is the current (already updated) ways[a − c].",
        "So loop a upward from c: ways[a] += ways[a − c]. Upward is what lets c repeat.",
      ],
    },
    { code: "ways[0] = 1\nfor each coin c:              // outer: coin types, in a fixed order\n    for a = c .. amount:      // inner: upward, so c may repeat\n        ways[a] += ways[a - c]\nanswer = ways[amount]" },
    { h: "A worked example: amount 5, coins [1, 2, 5]" },
    {
      table: {
        head: ["after", "0", "1", "2", "3", "4", "5"],
        rows: [
          ["start", 1, 0, 0, 0, 0, 0],
          ["coin 1", 1, 1, 1, 1, 1, 1],
          ["coin 2", 1, 1, 2, 2, 3, 3],
          ["coin 5", 1, 1, 2, 2, 3, "**4**"],
        ],
        caption: "ways[a]: combinations of the coin types so far summing to a. The answer is 4.",
      },
    },
    "After coin 1, every amount has exactly one combination (all 1s). With coin 2, ways[4] = 1 + ways[2] = 1 + 2 = 3: the old {1, 1, 1, 1} plus those with at least one 2, which are {2} + a combination of 2, namely {2, 1, 1} and {2, 2}. With coin 5, ways[5] = 3 + ways[0] = 4, adding {5}.",
    "For contrast, the amount-outer version computes 1, 1, 2, 3, 5, 9, so it returns 9: it treats 2 + 2 + 1, 2 + 1 + 2 and 1 + 2 + 2 as three answers.",
    { h: "Fill order and memory" },
    "coins × amount updates: O(coins × amount) time, O(amount) space.",
    { tip: "Signal: \"number of combinations\" with reusable items. Items outer, capacity inner and upward. If the question says order matters, swap the loops." },
  ],
  analysis: {
    time: "O(coins × amount)",
    space: "O(amount)",
    notes: ["At most 300 × 5000 = 1.5 × 10⁶ updates."],
  },
  solution: `class Solution {
public:
    int change(int amount, vector<int>& coins) {
        // ways[a]: multisets of the coin types processed so far summing to a.
        // Unsigned 64-bit: intermediate entries can exceed 32 bits even though
        // the final answer fits; unsigned wrap-around is well defined.
        vector<unsigned long long> ways(amount + 1, 0);
        ways[0] = 1;                    // the empty combination

        // Coin types in the OUTER loop: every combination is built type by
        // type, so each multiset is counted once (not once per ordering).
        for (int c : coins)
            // Upward: ways[a - c] already includes copies of c, so c can repeat.
            for (int a = c; a <= amount; ++a)
                ways[a] += ways[a - c];

        return (int)ways[amount];
    }
};
`,
});
