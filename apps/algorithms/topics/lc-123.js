import { study } from "./leet-light.js";

export const lc123 = study({
  number: 123,
  title: "Best Time to Buy and Sell Stock III",
  slug: "best-time-to-buy-and-sell-stock-iii",
  difficulty: "H",
  pattern: "F1",
  topic: "F1 · State-machine DP",
  themes: ["Stocks", "Four states"],
  blurb: "At most two transactions: walk four states in order (after the first buy, first sell, second buy, second sell), each updated from the one before it.",
  statement: [
    "prices[i] is a stock's price on day i. Complete at most two transactions (a buy followed by a sell), holding at most one share at a time.",
    "Return the largest profit. Up to 10⁵ days.",
  ],
  concepts: [
    "State-machine DP: the phases are a chain, buy1 → sell1 → buy2 → sell2; each phase is the best profit having just reached it.",
    "Updating in order within one day is safe: buying and selling on the same day gains nothing, so reading today's value of the previous phase never overcounts.",
    "Alternative split view: best one-transaction profit on the prefix plus on the suffix, maximised over the split day.",
  ],
  traps: [
    "Thinking two transactions means \"take the two biggest rises\": rises can merge into one longer hold.",
    "Initialising buy states to 0: they must start at −infinity or −prices[0].",
    "Splitting into prefix and suffix but letting both use the same day as a sell and a buy is fine; using one array for both is not.",
  ],
  followUps: [
    "Generalise to k transactions: 188, with 2k states.",
    "Return the actual days of the two transactions.",
  ],
  explanation: [
    "Track the best profit after each of four milestones: buy1 (bought the first share), sell1 (sold it), buy2 (bought the second), sell2 (sold it). Each day, a milestone either stays as it was or is reached today from the previous milestone: buy1 = max(buy1, −p), sell1 = max(sell1, buy1 + p), buy2 = max(buy2, sell1 − p), sell2 = max(sell2, buy2 + p).",
    "Updating them in this order on the same day uses today's value of the earlier milestone. That would mean buying and selling on the same day, which earns exactly zero, so it never produces a wrong answer.",
    "The answer is sell2: doing fewer than two transactions is covered because sell2 can equal sell1 (buy again and sell at the same price).",
    { tip: "Signal: at most k transactions with small k. Write a chain of 2k states, each fed by the previous one." },
  ],
  analysis: { time: "O(n)", space: "O(1)" },
  solution: `class Solution {
public:
    int maxProfit(vector<int>& prices) {
        // The best profit having just reached each milestone.
        // Buys start at -infinity: before day 0 nothing can have been bought.
        int buy1 = INT_MIN, sell1 = 0, buy2 = INT_MIN, sell2 = 0;

        for (int p : prices) {
            // Each milestone: keep it, or reach it today from the one before it.
            // Using today's updated value of the previous milestone means
            // buying and selling on the same day, which gains 0, so it is harmless.
            buy1  = max(buy1, -p);
            sell1 = max(sell1, buy1 + p);
            buy2  = max(buy2, sell1 - p);
            sell2 = max(sell2, buy2 + p);
        }
        // sell2 >= sell1 >= 0 always, so this also covers one or zero transactions.
        return sell2;
    }
};
`,
});
