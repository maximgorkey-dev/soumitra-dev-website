import { study } from "./leet-light.js";

export const lc122 = study({
  number: 122,
  title: "Best Time to Buy and Sell Stock II",
  slug: "best-time-to-buy-and-sell-stock-ii",
  difficulty: "M",
  pattern: "F1",
  topic: "F1 · State-machine DP",
  themes: ["Stocks", "Two states"],
  blurb: "Unlimited transactions, one share at a time: two states (holding, not holding), or simply sum every positive day-to-day rise.",
  statement: [
    "prices[i] is a stock's price on day i. You may buy and sell as many times as you like, but hold at most one share at a time (you may sell and buy again on the same day).",
    "Return the largest total profit.",
  ],
  concepts: [
    "State-machine DP: the state is what you hold at the end of the day (cash or share), and each day's actions are the transitions.",
    "Telescoping: any profitable hold from day a to day b equals the sum of the daily rises inside it, so summing every positive rise is optimal.",
    "Rolling variables: each state depends only on the previous day, so two numbers replace the table.",
  ],
  traps: [
    "Looking for local minima and maxima explicitly: correct but fiddly with plateaus; the sum of rises is the same answer.",
    "Initialising hold to 0: before any purchase, holding is impossible, so start at −prices[0].",
  ],
  followUps: [
    "At most k transactions: 188.",
    "A fee per sale: 714. A cooldown after selling: 309.",
  ],
  explanation: [
    "Keep two numbers after each day: cash, the best profit with no share in hand, and hold, the best profit while holding one. On a new day you either keep your state or switch: cash = max(cash, hold + price) sells; hold = max(hold, cash − price) buys.",
    "Because transactions are unlimited, the same answer comes from a simpler view: a hold from day a to day b earns prices[b] − prices[a], which telescopes into the sum of prices[i] − prices[i − 1] over the days in between. Taking every positive difference and skipping every negative one is the best you can do.",
    { tip: "Signal: buy/sell with unlimited transactions. Two states, or just add up the rises." },
  ],
  analysis: { time: "O(n)", space: "O(1)" },
  solution: `class Solution {
public:
    int maxProfit(vector<int>& prices) {
        // cash: best profit so far while holding nothing.
        // hold: best profit so far while holding one share.
        // Before day 0 nothing is held, and holding is only possible by buying on day 0.
        int cash = 0, hold = -prices[0];

        for (size_t i = 1; i < prices.size(); ++i) {
            int p = prices[i];
            // Both updates must read yesterday's values, so keep a copy of cash.
            int prevCash = cash;
            cash = max(cash, hold + p);      // rest, or sell today
            hold = max(hold, prevCash - p);  // rest, or buy today
        }
        // Ending with a share is never better than having sold it.
        return cash;
    }
};

// The equivalent greedy: every positive day-to-day rise is profit.
//   int profit = 0;
//   for (size_t i = 1; i < prices.size(); ++i) profit += max(0, prices[i] - prices[i - 1]);
`,
});
