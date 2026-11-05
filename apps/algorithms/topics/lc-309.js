import { study } from "./leet-light.js";

export const lc309 = study({
  number: 309,
  title: "Best Time to Buy and Sell Stock with Cooldown",
  slug: "best-time-to-buy-and-sell-stock-with-cooldown",
  difficulty: "M",
  pattern: "F1",
  topic: "F1 · State-machine DP",
  themes: ["Stocks", "Three states"],
  blurb: "Three states: holding, just sold (cooling down), and free to buy. Selling moves you into the cooldown state, from which only resting is allowed.",
  statement: [
    "prices[i] is the price on day i. Unlimited transactions, one share at a time, but after selling you must wait one full day before buying again.",
    "Return the largest profit. Up to 5000 days.",
  ],
  concepts: [
    "State-machine DP: draw the automaton first. hold → (sell) → cooldown → (rest) → free → (buy) → hold, with self-loops on hold and free.",
    "One recurrence per state, all read from yesterday's values.",
  ],
  traps: [
    "Using only two states and buying from yesterday's cash: that allows buying the day after selling.",
    "Updating states in place without copies, so today's sale feeds today's buy.",
  ],
  followUps: [
    "A cooldown of c days: c cooldown states, or buy from cash c + 1 days ago.",
    "Combine with a fee (714).",
  ],
  explanation: [
    "Three states at the end of each day. hold: you own a share. sold: you sold today, so tomorrow is a cooldown. rest: you own nothing and may buy tomorrow.",
    "Transitions: hold = max(hold, rest − p) (keep, or buy today from a free state); sold = hold + p (sell what you held yesterday); rest = max(rest, sold) (stay free, or finish yesterday's cooldown). All three read yesterday's values.",
    "The answer is max(sold, rest) on the last day.",
    { tip: "Signal: a rule like \"after X you must wait\". Add a state for the waiting phase and draw the arrows before writing code." },
  ],
  analysis: { time: "O(n)", space: "O(1)" },
  solution: `class Solution {
public:
    int maxProfit(vector<int>& prices) {
        // State at the end of each day:
        //   hold: owning one share
        //   sold: sold today, so tomorrow is a forced rest
        //   rest: owning nothing and free to buy tomorrow
        int hold = INT_MIN / 2, sold = INT_MIN / 2, rest = 0;  // /2 avoids overflow on + p

        for (int p : prices) {
            int h = hold, s = sold, r = rest;  // yesterday's values
            hold = max(h, r - p);  // keep holding, or buy from a free state
            sold = h + p;          // sell the share held yesterday
            rest = max(r, s);      // stay free, or come off yesterday's cooldown
        }
        // Holding at the end is never best; the last state is sold or rest.
        return max(sold, rest);
    }
};
`,
});
