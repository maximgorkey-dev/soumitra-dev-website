import { study } from "./leet-light.js";

export const lc309 = study({
  number: 309,
  title: "Best Time to Buy and Sell Stock with Cooldown",
  slug: "best-time-to-buy-and-sell-stock-with-cooldown",
  difficulty: "M",
  pattern: "F1",
  topic: "F1 · State-machine DP",
  themes: ["Stocks", "Three states", "Draw the automaton"],
  blurb: "Three states at the end of each day: holding a share, just sold (so tomorrow is forced rest), and free to buy. Selling leads into the cooldown state, which can only move on to free.",
  statement: [
    "prices[i] is the price on day i. Unlimited transactions, one share at a time, but after you sell you must wait one full day before buying again.",
    "Return the largest profit. Up to 5000 days. Example: [1, 2, 3, 0, 2] gives 3 (buy 1, sell 3, cool down, buy 0, sell 2).",
  ],
  concepts: [
    "State-machine DP: draw the automaton before writing code. hold —sell→ sold —rest→ free —buy→ hold, with self-loops on hold and free.",
    "One recurrence per state, each reading only yesterday's values.",
    "The cooldown is just a state you must pass through, not a special case in the code.",
  ],
  hints: [
    "Two states (holding, not holding) are not enough. What extra fact do you need to know about yesterday to decide whether you may buy today?",
    "Whether you sold yesterday.",
    "Split \"not holding\" into \"sold today\" and \"resting, free to buy tomorrow\". Draw the arrows between the three states.",
    "Write today's value of each state from yesterday's values of the states with arrows into it.",
  ],
  brute: [
    "Try every action on every day: each day you may buy, sell or wait where allowed, up to about 2ⁿ plans. n = 5000 is far beyond reach.",
    "Many plans end a day in the same state (say \"sold today\") and have identical futures, so only the best of them matters. Three numbers per day replace all the plans.",
  ],
  invariant: "After day i, hold, sold and rest are the best profits of any valid plan that ends day i holding a share, having sold that day, or holding nothing without a sale that day.",
  traps: [
    "Using two states and buying from yesterday's cash: that allows buying the day after a sale.",
    "Updating in place without copies, so today's sale feeds today's rest and today's purchase.",
    "Returning hold, or forgetting that the last day may end in sold.",
    "Thinking the cooldown blocks selling: it only blocks the next purchase.",
  ],
  followUps: [
    "A cooldown of c days: c cooldown states in a chain, or buy from the cash value c + 1 days ago.",
    "Cooldown and a fee together: add the fee on the sell arrow.",
    "At most k transactions with a cooldown: multiply the states by the transaction counter.",
  ],
  explanation: [
    { h: "The states" },
    {
      list: [
        "hold: you own a share at the end of today.",
        "sold: you sold today, so tomorrow you may not buy.",
        "rest: you own nothing and did not sell today, so tomorrow you may buy.",
      ],
    },
    "Arrows: hold stays hold or sells into sold; sold must move to rest; rest stays rest or buys into hold.",
    { h: "Start" },
    "Before day 0: rest = 0; hold and sold are impossible, so −∞ (in code, a large negative number that cannot overflow when a price is added).",
    { h: "One day's transitions" },
    { code: "hold_today = max(hold, rest - price)   // keep, or buy from a free state\nsold_today = hold + price              // sell the share held yesterday\nrest_today = max(rest, sold)           // stay free, or finish yesterday's cooldown" },
    "All three read yesterday's values. The answer is max(sold, rest) after the last day.",
    { h: "A worked example: [1, 2, 3, 0, 2]" },
    {
      table: {
        head: ["day", "price", "hold", "sold", "rest"],
        rows: [
          [0, 1, -1, "−∞", 0],
          [1, 2, -1, 1, 0],
          [2, 3, -1, 2, 1],
          [3, 0, 1, -1, 2],
          [4, 2, 1, "**3**", 2],
        ],
        caption: "State values at the end of each day. The answer is max(sold, rest) on the last day: 3.",
      },
    },
    "Day 3: hold becomes yesterday's rest minus the price, 1 − 0 = 1. That rest of 1 came from the sale on day 1 (sold = 1) passing through its cooldown on day 2. So the plan is: buy at 1, sell at 2, rest, buy at 0, and on day 4 sell at 2 for a total of 1 + 2 = 3.",
    "The cooldown is visible in the table: the better first sale on day 2 (sold = 2) reaches rest only on day 3, one day too late to feed the purchase at 0 on day 3. Without the cooldown, that plan would give 2 + 2 = 4.",
    { tip: "Signal: a rule like \"after X you must wait\". Add a state for the waiting phase and draw the arrows before writing any code." },
  ],
  analysis: {
    time: "O(n)",
    space: "O(1)",
    notes: [],
  },
  solution: `class Solution {
public:
    int maxProfit(vector<int>& prices) {
        // State at the end of a day:
        //   hold: own one share
        //   sold: sold today, so tomorrow is a forced rest
        //   rest: own nothing and did not sell today; free to buy tomorrow
        // hold and sold are impossible before day 0. INT_MIN / 2 stands for
        // minus infinity without overflowing when a price is added.
        int hold = INT_MIN / 2, sold = INT_MIN / 2, rest = 0;

        for (int p : prices) {
            int h = hold, s = sold, r = rest;  // yesterday's values
            hold = max(h, r - p);  // keep the share, or buy from a free state
            sold = h + p;          // sell the share held yesterday
            rest = max(r, s);      // stay free, or come off yesterday's cooldown
        }
        // Ending while holding is never best.
        return max(sold, rest);
    }
};
`,
});
