import { study } from "./leet-light.js";

export const lc322 = study({
  number: 322,
  title: "Coin Change",
  slug: "coin-change",
  difficulty: "M",
  pattern: "F5",
  topic: "F5 · Knapsack and counting",
  themes: ["Unbounded knapsack", "Minimum count", "Greedy fails"],
  blurb: "dp[a] is the fewest coins that make amount a. The last coin used is some c, leaving a − c to be made optimally, so dp[a] = 1 + min over coins of dp[a − c]. Coins can repeat, so the table is filled upward.",
  statement: [
    "Given coin denominations (unlimited supply of each) and an amount, return the fewest coins that add up to the amount, or −1 if it cannot be made.",
    "Up to 12 denominations, amount up to 10⁴. Examples: coins [1, 2, 5], amount 11 gives 3 (5 + 5 + 1); coins [2], amount 3 gives −1; amount 0 gives 0.",
  ],
  concepts: [
    "Unbounded knapsack: every coin may be used any number of times, so a state may build on a state that already used the same coin.",
    "Optimal substructure on the last coin: an optimal way to make a, minus its last coin c, is an optimal way to make a − c.",
    "Unreachable as a sentinel: amounts that cannot be made hold a value larger than any real answer (amount + 1), so min ignores them.",
    "Why greedy fails: taking the largest coin first is optimal only for special coin systems (like 1, 2, 5, 10); with [1, 3, 4] and amount 6 it gives 4 + 1 + 1 instead of 3 + 3.",
    "Shortest path view: amounts are nodes, each coin is an edge of length 1, and the answer is a BFS distance from 0 to amount.",
  ],
  hints: [
    "Try greedy with coins [1, 3, 4] and amount 6. Why does it fail?",
    "Think about the last coin in an optimal answer. What is left to pay, and how should it be paid?",
    "Define dp[a] as the fewest coins making a. Write it in terms of smaller amounts.",
    "How do you mark amounts that cannot be made, so they never win a min?",
  ],
  brute: [
    "Recurse: fewest(a) = 1 + min over coins of fewest(a − c), with fewest(0) = 0. Without memo, the tree branches up to 12 ways per level and is as deep as amount / smallest coin: exponential, hopeless at 10⁴.",
    "The recursion only ever asks about amounts 0..amount, so there are amount + 1 distinct questions, each asked many times. Answer each once in a table and the cost is amount × coins = 1.2 × 10⁵.",
  ],
  invariant: "After filling dp[0..a], dp[x] for each x ≤ a is the fewest coins summing to exactly x, or the sentinel amount + 1 if x cannot be made.",
  traps: [
    "Greedy largest-first: wrong for general denominations, as [1, 3, 4] with 6 shows.",
    "Using INT_MAX as the sentinel and then computing dp[a − c] + 1: it overflows to a negative number and wins the min. Use amount + 1, which no real answer reaches.",
    "Returning the sentinel instead of −1 for unreachable amounts.",
    "Looping capacity downward as in 0/1 knapsack: that allows each coin at most once and gives wrong answers (for coins [5], amount 10 it reports −1).",
    "Forgetting amount 0: the answer is 0 coins, not −1.",
  ],
  followUps: [
    "Count the combinations instead (518): same table shape, + instead of min, and the loop order now matters.",
    "Return the coins used: store the coin that achieved each dp[a] and walk back from amount.",
    "BFS from 0 (or from amount): each level adds one coin; the first time amount is reached is the answer. Same complexity, sometimes faster in practice because it stops early.",
    "Each coin usable at most once: switch to a 0/1 knapsack (downward loop per coin).",
    "Very large amount with small coins: answers become periodic for large amounts (eventually use the best-ratio coin), a classic number-theory follow-up.",
  ],
  explanation: [
    { h: "What the table means" },
    "dp[a] is the fewest coins whose values add up to exactly a. Amounts that cannot be made store a sentinel, amount + 1, which is larger than any real answer (the most coins ever needed is amount, all 1s).",
    { h: "Base case" },
    "dp[0] = 0: zero coins make zero. Every other entry starts at the sentinel.",
    { h: "Filling one cell" },
    {
      list: [
        "Some coin c is the last one used. Removing it leaves a − c, which must itself be paid as cheaply as possible, or the whole thing could be improved.",
        "So dp[a] = 1 + min over coins c ≤ a of dp[a − c]. Unreachable a − c values hold the sentinel and lose the min.",
        "Since a − c < a, filling a from 0 upward means every value read is final. A coin may appear many times along the chain, which is what unlimited supply means.",
      ],
    },
    { code: "dp[0] = 0;  dp[a] = INF (= amount + 1) for a > 0\nfor a = 1 .. amount:\n    for each coin c <= a:\n        dp[a] = min(dp[a], dp[a - c] + 1)\nanswer = dp[amount] > amount ? -1 : dp[amount]" },
    { h: "A worked example: coins [1, 2, 5], amount 11" },
    {
      table: {
        head: ["a", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"],
        rows: [
          ["dp[a]", 0, 1, 1, 2, 2, 1, 2, 2, 3, 3, 2, "**3**"],
        ],
        caption: "dp[a]: fewest coins making a. The answer is dp[11] = 3.",
      },
    },
    "dp[7] = 2: try each last coin. 7 − 1 = 6 needs 2, 7 − 2 = 5 needs 1, 7 − 5 = 2 needs 1, so the best is 1 + 1 = 2 (for example 5 + 2). dp[11]: 11 − 1 = 10 needs 2 (5 + 5), 11 − 2 = 9 needs 3, 11 − 5 = 6 needs 2, so 1 + 2 = 3. Walking back: 11 with last coin 1 leaves 10, last coin 5 leaves 5, last coin 5 leaves 0, giving 1 + 5 + 5.",
    { h: "Fill order and memory" },
    "amount + 1 cells, each trying every coin: O(amount × coins) time, O(amount) space. Swapping the loops (coins outside) also works here, because a minimum does not care about the order coins are listed in.",
    { tip: "Signal: fewest items to hit a total, items reusable. Unbounded knapsack: dp over the total, filled upward, min over the last item." },
  ],
  analysis: {
    time: "O(amount × coins)",
    space: "O(amount)",
    notes: ["At most 10⁴ × 12 = 1.2 × 10⁵ steps."],
  },
  solution: `class Solution {
public:
    int coinChange(vector<int>& coins, int amount) {
        // dp[a]: fewest coins summing to exactly a. amount + 1 means "cannot
        // be made": no real answer is that large, and +1 on it cannot overflow.
        const int INF = amount + 1;
        vector<int> dp(amount + 1, INF);
        dp[0] = 0;                              // zero coins make zero

        for (int a = 1; a <= amount; ++a)
            for (int c : coins)
                // c is the last coin; the rest, a - c, is paid optimally.
                // Upward order: dp[a - c] is final and may itself use c again.
                if (c <= a) dp[a] = min(dp[a], dp[a - c] + 1);

        return dp[amount] >= INF ? -1 : dp[amount];
    }
};
`,
});
