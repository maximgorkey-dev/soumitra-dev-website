import { study } from "./leet-light.js";

export const lc188 = study({
  number: 188,
  title: "Best Time to Buy and Sell Stock IV",
  slug: "best-time-to-buy-and-sell-stock-iv",
  difficulty: "H",
  pattern: "F1",
  topic: "F1 · State-machine DP",
  themes: ["Stocks", "2k states"],
  blurb: "At most k transactions: buy[j] and sell[j] for j = 1..k, each fed by the previous state. When k ≥ n / 2 the limit never binds, so sum every rise.",
  statement: [
    "prices[i] is the price on day i. Complete at most k transactions, holding at most one share at a time. Return the largest profit.",
    "k ≤ 100, up to 1000 days.",
  ],
  concepts: [
    "State-machine DP generalised: a chain of 2k states, buy[1], sell[1], …, buy[k], sell[k].",
    "Capacity bound: n days allow at most n / 2 useful transactions, so a larger k is unlimited (problem 122).",
    "Rolling arrays: each day updates the chain in place, in increasing j.",
  ],
  traps: [
    "Allocating O(n · k) when O(k) suffices.",
    "Huge k with a large n in other versions of the problem: the n / 2 shortcut avoids O(n · k) time.",
    "Starting buy[j] at 0 instead of −infinity.",
  ],
  followUps: [
    "Very large n and k: the \"alien trick\" (Lagrangian relaxation) binary searches a per-transaction penalty, O(n log P).",
    "A fee or cooldown on top of k.",
  ],
  explanation: [
    "Exactly as in 123, but with k pairs of milestones. buy[j] is the best profit after the j-th purchase, sell[j] after the j-th sale. Each day, for j from 1 to k: buy[j] = max(buy[j], sell[j − 1] − p) and sell[j] = max(sell[j], buy[j] + p), with sell[0] = 0.",
    "Going in increasing j within a day may chain a sell and a buy on the same day, which gains nothing and is harmless.",
    "If 2k ≥ n, the limit can never be reached, and the answer is the unlimited one: the sum of all positive daily rises.",
    { tip: "Signal: \"at most k\" of something along a sequence. Add the count to the state, and check whether k can ever bind." },
  ],
  analysis: { time: "O(n · k), or O(n) when k ≥ n / 2", space: "O(k)" },
  solution: `class Solution {
public:
    int maxProfit(int k, vector<int>& prices) {
        int n = prices.size();

        // With 2k >= n the transaction limit never binds:
        // take every positive day-to-day rise (problem 122).
        if (2 * k >= n) {
            int profit = 0;
            for (int i = 1; i < n; ++i) profit += max(0, prices[i] - prices[i - 1]);
            return profit;
        }

        // buy[j]:  best profit after the j-th purchase (holding a share).
        // sell[j]: best profit after the j-th sale (holding nothing).
        // sell[0] = 0 is the state before any transaction.
        vector<int> buy(k + 1, INT_MIN), sell(k + 1, 0);

        for (int p : prices) {
            for (int j = 1; j <= k; ++j) {
                // Buy the j-th share after the (j-1)-th sale, or keep the earlier best.
                buy[j] = max(buy[j], sell[j - 1] - p);
                // Sell the j-th share today, or keep the earlier best.
                sell[j] = max(sell[j], buy[j] + p);
            }
        }
        // sell[k] >= sell[j] for every j <= k, so it covers fewer transactions too.
        return sell[k];
    }
};
`,
});
