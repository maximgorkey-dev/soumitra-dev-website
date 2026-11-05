import { study } from "./leet-light.js";

export const lc714 = study({
  number: 714,
  title: "Best Time to Buy and Sell Stock with Transaction Fee",
  slug: "best-time-to-buy-and-sell-stock-with-transaction-fee",
  difficulty: "M",
  pattern: "F1",
  topic: "F1 · State-machine DP",
  themes: ["Stocks", "Two states", "Cost on one transition"],
  blurb: "The two states of 122, with the fee charged on the sell transition. The fee makes it better to ride a long rise as one trade than to split it, which the DP handles automatically.",
  statement: [
    "prices[i] is the price on day i. Unlimited transactions, one share at a time, but each completed transaction costs fee.",
    "Return the largest profit. Up to 5 · 10⁴ days. Example: prices [1, 3, 2, 8, 4, 9], fee 2 gives 8 (buy 1, sell 8; buy 4, sell 9: 5 + 3).",
  ],
  concepts: [
    "State-machine DP with two states, cash and hold.",
    "A cost attached to a transition: charge it on exactly one arrow per transaction (on the sell, or on the buy, but not both).",
    "Why the greedy of 122 fails: with a fee, small rises separated by small dips are worth more as one long trade.",
  ],
  hints: [
    "Start from the two-state solution of 122. Where does the fee belong?",
    "On the arrow from hold to cash (the sale), or equally on the purchase.",
    "Why does \"sum every positive daily rise\" no longer work?",
    "Each rise you take separately pays the fee again.",
  ],
  brute: [
    "Enumerate every pattern of buys and sells: about 2ⁿ plans, impossible for 5 · 10⁴ days.",
    "As in 122, plans that end a day in the same state have the same future, so only the best balance per state per day is needed.",
  ],
  invariant: "After day i, cash and hold are the best balances of any plan that ends day i holding nothing or holding one share, with every fee for completed trades paid.",
  traps: [
    "Charging the fee on both buy and sell.",
    "Applying the sum-of-rises greedy minus a fee per rise: it splits long rises and pays too many fees.",
    "Charging the fee on the buy but starting hold at −prices[0] without the fee: be consistent about which arrow pays.",
  ],
  followUps: [
    "A fee proportional to the price: subtract fee · price on the sale.",
    "A fee and a cooldown: three states (309) with the fee on the sell arrow.",
    "The \"alien trick\" for at most k trades uses exactly this problem as its inner step, with the fee as the penalty being searched.",
  ],
  explanation: [
    { h: "The states and transitions" },
    "cash is the best balance holding nothing, hold the best balance holding one share. Each day: stay, or switch. Selling now pays the fee:",
    { code: "cash_today = max(cash, hold + price - fee)   // wait, or sell and pay the fee\nhold_today = max(hold, cash - price)         // wait, or buy" },
    "Start with cash = 0 and hold = −prices[0]. The answer is the final cash.",
    { h: "Why the fee changes the plan" },
    "Without a fee, the prices 1 → 3 → 2 → 8 are worth (3 − 1) + (8 − 2) = 8 as two trades, more than 8 − 1 = 7 as one. With a fee of 2 the order flips: two trades give 8 − 4 = 4, one gives 7 − 2 = 5. The DP compares both automatically, because selling on day 1 and rebuying on day 2 is just another path through the two states.",
    { h: "A worked example: [1, 3, 2, 8, 4, 9], fee 2" },
    {
      table: {
        head: ["day", "price", "cash", "hold", "note"],
        rows: [
          [0, 1, 0, -1, "buy at 1"],
          [1, 3, 0, -1, "selling now nets 3 − 1 − 2 = 0, no gain"],
          [2, 2, 0, -1, "keep the share bought at 1"],
          [3, 8, 5, -1, "sell: −1 + 8 − 2"],
          [4, 4, 5, 1, "rebuy at 4: 5 − 4"],
          [5, 9, "**8**", 1, "sell: 1 + 9 − 2"],
        ],
        caption: "State values at the end of each day. The answer is the final cash, 8.",
      },
    },
    "On day 1 the DP declines to sell, because the fee eats the whole gain, and keeps the original share through the dip on day 2. That is exactly the \"merge small rises\" decision a greedy gets wrong.",
    { tip: "Signal: a stock problem with a per-transaction cost. The two-state machine with the cost on one arrow." },
  ],
  analysis: {
    time: "O(n)",
    space: "O(1)",
    notes: [],
  },
  solution: `class Solution {
public:
    int maxProfit(vector<int>& prices, int fee) {
        // cash: best balance holding nothing; hold: best balance holding one share.
        // The fee is charged once per trade, on the sale.
        int cash = 0, hold = -prices[0];

        for (size_t i = 1; i < prices.size(); ++i) {
            int p = prices[i];
            int prevCash = cash, prevHold = hold;
            cash = max(prevCash, prevHold + p - fee);  // wait, or sell and pay the fee
            hold = max(prevHold, prevCash - p);        // wait, or buy
        }
        return cash;
    }
};
`,
});
