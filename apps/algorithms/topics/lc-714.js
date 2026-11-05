import { study } from "./leet-light.js";

export const lc714 = study({
  number: 714,
  title: "Best Time to Buy and Sell Stock with Transaction Fee",
  slug: "best-time-to-buy-and-sell-stock-with-transaction-fee",
  difficulty: "M",
  pattern: "F1",
  topic: "F1 · State-machine DP",
  themes: ["Stocks", "Two states"],
  blurb: "Problem 122 with a fee charged on each sale: the same two states, and the fee subtracted on the sell transition.",
  statement: [
    "prices[i] is the price on day i. Unlimited transactions, one share at a time, but each completed transaction costs fee.",
    "Return the largest profit. Up to 5 · 10⁴ days.",
  ],
  concepts: [
    "State-machine DP with two states, cash and hold.",
    "A cost attached to one transition: put it on exactly one edge (sell, or buy, but not both).",
    "Why the greedy \"sum the rises\" fails: the fee makes merging small rises into one hold cheaper than paying many fees.",
  ],
  traps: [
    "Charging the fee on both buy and sell.",
    "Summing positive rises minus a fee each: splitting a long rise pays the fee many times.",
  ],
  followUps: [
    "Fee and cooldown together.",
    "Fee proportional to the price.",
  ],
  explanation: [
    "cash is the best profit with no share; hold is the best profit while holding. Each day: cash = max(cash, hold + p − fee) (sell, paying the fee), hold = max(hold, cash − p) (buy).",
    "The fee stops the simple greedy of 122: a rise of 3 then a rise of 3 is worth 6 − fee as one hold, but 6 − 2 · fee as two. The DP picks the right grouping automatically.",
    { tip: "Signal: a stock problem with a per-transaction cost. Put the cost on one transition of the two-state machine." },
  ],
  analysis: { time: "O(n)", space: "O(1)" },
  solution: `class Solution {
public:
    int maxProfit(vector<int>& prices, int fee) {
        // cash: best profit holding nothing; hold: best profit holding one share.
        int cash = 0, hold = -prices[0];

        for (size_t i = 1; i < prices.size(); ++i) {
            int p = prices[i];
            int prevCash = cash;
            cash = max(cash, hold + p - fee);  // sell today and pay the fee once
            hold = max(hold, prevCash - p);    // buy today
        }
        return cash;
    }
};
`,
});
