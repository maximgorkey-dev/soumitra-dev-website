import { study } from "./leet-light.js";

export const lc188 = study({
  number: 188,
  title: "Best Time to Buy and Sell Stock IV",
  slug: "best-time-to-buy-and-sell-stock-iv",
  difficulty: "H",
  pattern: "F1",
  topic: "F1 · State-machine DP",
  themes: ["Stocks", "2k states", "Bound that never binds"],
  blurb: "At most k transactions: the chain of 123 extended to k pairs, buy[j] and sell[j]. If 2k ≥ n the limit cannot bind, and the answer is the unlimited one, the sum of all rises.",
  statement: [
    "prices[i] is the price on day i. Complete at most k transactions, holding at most one share at a time. Return the largest profit.",
    "k up to 100, up to 1000 days. Example: k = 2, prices [3, 2, 6, 5, 0, 3] gives 7 (buy 2, sell 6; buy 0, sell 3).",
  ],
  concepts: [
    "State-machine DP with a transaction counter: states buy[j] (holding the j-th share) and sell[j] (j trades completed), for j = 1..k.",
    "Each state is fed only by the previous one in the chain: buy[j] from sell[j − 1], sell[j] from buy[j].",
    "Capacity argument: a profitable transaction needs at least two days, so with n days at most n / 2 trades are useful. If k ≥ n / 2, the limit is irrelevant.",
    "Rolling over days: one array of size k per state, updated in place each day.",
  ],
  hints: [
    "Solve k = 2 first (123). What grows when k grows?",
    "The number of milestones: two per transaction.",
    "Store them in arrays indexed by the transaction number j. Write buy[j] and sell[j] in terms of the previous milestone.",
    "What happens when k is very large compared with n?",
  ],
  brute: [
    "Choose up to k disjoint buy/sell intervals: the number of choices is about C(n, 2k), astronomical for n = 1000 and k = 100.",
    "A recursion f(day, transactions left, holding) has only n · k · 2 distinct arguments; without a memo it re-solves them exponentially often. Tabulating gives O(n · k).",
  ],
  invariant: "After day i, buy[j] and sell[j] are the best balances of any plan that, by the end of day i, has bought its j-th share (still holding it) or completed j trades.",
  traps: [
    "O(n · k) memory when O(k) is enough: the day dimension can be rolled.",
    "Forgetting the large-k shortcut: in versions of the problem with big k, O(n · k) times out while the greedy is O(n).",
    "Starting buy[j] at 0 instead of −∞.",
    "Iterating j downwards and reading sell[j − 1] from yesterday is also correct; mixing the two styles by accident is not.",
  ],
  followUps: [
    "n and k both up to 10⁵: the \"alien trick\" (Lagrangian relaxation). Charge a penalty λ per transaction and solve the unlimited problem with that fee (714), counting trades; binary search λ so that the count is k. O(n log P).",
    "Return the trades themselves: store argmax choices per (day, j), or rebuild from the final values.",
    "A fee or cooldown in addition to k: put the fee on the sell transition; for a cooldown, buy[j] reads sell[j − 1] from two days ago.",
  ],
  explanation: [
    { h: "The states" },
    "For j = 1..k: buy[j] is the best balance of any plan that has bought its j-th share and is still holding it, and sell[j] is the best balance after completing exactly j trades (or fewer, which is never worse). sell[0] = 0 represents \"no trades yet\".",
    { h: "Start" },
    "buy[j] = −∞ for every j (nothing bought yet); sell[j] = 0.",
    { h: "One day's transitions" },
    { code: "for j = 1..k:\n    buy[j]  = max(buy[j],  sell[j-1] - price)   // j-th purchase today\n    sell[j] = max(sell[j], buy[j]   + price)    // j-th sale today" },
    "As in 123, processing j upwards within a day can chain a sale and a purchase on the same day, which earns 0 and is harmless.",
    { h: "When the limit never binds" },
    "Every profitable trade uses at least two distinct days, and trades do not overlap, so at most n / 2 trades are possible. If 2k ≥ n, solve the unlimited problem: the sum of all positive daily rises (122).",
    { h: "A worked example: k = 2, prices [3, 2, 6, 5, 0, 3]" },
    {
      table: {
        head: ["day", "price", "buy[1]", "sell[1]", "buy[2]", "sell[2]"],
        rows: [
          [0, 3, -3, 0, -3, 0],
          [1, 2, -2, 0, -2, 0],
          [2, 6, -2, 4, -2, 4],
          [3, 5, -2, 4, -1, 4],
          [4, 0, 0, 4, 4, 4],
          [5, 3, 0, 4, 4, "**7**"],
        ],
        caption: "Values at the end of each day. n = 6 and 2k = 4 < 6, so the DP is needed.",
      },
    },
    "Day 4: buy[2] = sell[1] − 0 = 4, the first profit (bought at 2, sold at 6) carried into a second share bought at 0. Day 5: sell[2] = 4 + 3 = 7.",
    { tip: "Signal: a limit on how many times you may act. Add the count to the state, and first check whether the limit can ever be reached." },
  ],
  analysis: {
    time: "O(n · k), or O(n) when 2k ≥ n",
    space: "O(k)",
    notes: ["n = 1000 and k = 100 is 10⁵ updates."],
  },
  solution: `class Solution {
public:
    int maxProfit(int k, vector<int>& prices) {
        int n = prices.size();

        // At most n/2 trades can be useful, so a larger k never binds:
        // collect every positive day-to-day rise (problem 122).
        if (2 * k >= n) {
            int profit = 0;
            for (int i = 1; i < n; ++i) profit += max(0, prices[i] - prices[i - 1]);
            return profit;
        }

        // buy[j]:  best balance holding the j-th share.
        // sell[j]: best balance after j completed trades; sell[0] = 0 is "none yet".
        vector<int> buy(k + 1, INT_MIN), sell(k + 1, 0);

        for (int p : prices) {
            for (int j = 1; j <= k; ++j) {
                // The j-th purchase uses the profit of j-1 trades.
                buy[j] = max(buy[j], sell[j - 1] - p);
                // The j-th sale closes the j-th share.
                sell[j] = max(sell[j], buy[j] + p);
            }
        }
        // sell[k] is at least sell[j] for every j <= k.
        return sell[k];
    }
};
`,
});
