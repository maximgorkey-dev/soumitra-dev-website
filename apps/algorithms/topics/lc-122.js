import { study } from "./leet-light.js";

export const lc122 = study({
  number: 122,
  title: "Best Time to Buy and Sell Stock II",
  slug: "best-time-to-buy-and-sell-stock-ii",
  difficulty: "M",
  pattern: "F1",
  topic: "F1 · State-machine DP",
  themes: ["Stocks", "Two states", "Telescoping greedy"],
  blurb: "Two states at the end of each day: holding nothing (cash) or holding one share (hold). Each day you stay or switch, and the best value of each state carries forward. Because transactions are unlimited, it also equals the sum of every positive daily rise.",
  statement: [
    "prices[i] is a stock's price on day i. You may buy and sell as many times as you like, holding at most one share at any moment; you may sell and buy on the same day.",
    "Return the largest total profit. Up to 3 · 10⁴ days. Example: [7, 1, 5, 3, 6, 4] gives 7 (buy at 1, sell at 5, buy at 3, sell at 6).",
  ],
  concepts: [
    "State-machine DP: the state is what you hold at the end of a day; buying and selling are the transitions between states, and doing nothing is a self-loop.",
    "Best value per state: for each state keep only the best profit that ends the day in it; the past beyond that never matters again.",
    "Telescoping: holding from day a to day b earns prices[b] − prices[a], which equals the sum of the daily changes in between. So the best plan collects exactly the positive changes.",
    "Rolling variables: each day reads only the previous day, so two numbers replace a whole table.",
  ],
  hints: [
    "What do you need to know about the past to decide what to do today?",
    "Only whether you currently hold a share, and the best profit so far in each case.",
    "Write how today's \"holding\" and \"not holding\" values come from yesterday's.",
    "Separately: is there a reason ever to skip a day on which the price goes up, if you can trade every day?",
  ],
  brute: [
    "Try every action on every day (buy, sell or wait, as allowed): up to 2ⁿ plans, each scored in O(n). With n = 3 · 10⁴ that is impossible; even n = 40 is a trillion plans.",
    "The waste is that many different pasts end in the same situation (\"holding a share on day i\"), and only the best of them can matter for the future. Keeping one number per (day, state) collapses the 2ⁿ plans into 2n values.",
  ],
  invariant: "After processing day i, cash is the best profit of any plan that holds nothing at the end of day i, and hold is the best profit (cash spent counted as negative) of any plan that holds one share at the end of day i.",
  traps: [
    "Starting hold at 0: before any purchase you cannot be holding. Start it at −prices[0] (bought on day 0) or −∞.",
    "Updating cash first and then using the new cash to compute hold on the same day. Here it is harmless (selling and rebuying on the same day earns 0), but in 309 the same habit is a bug; keep a copy of yesterday's values.",
    "Trying to find local minima and maxima explicitly: correct in principle, but plateaus and equal prices make it error-prone. The sum of rises is the same and has no edge cases.",
    "Returning hold or max(cash, hold): ending with a share is never better than selling it, so return cash.",
  ],
  followUps: [
    "At most one transaction (121): track the minimum price so far and the best price − minimum.",
    "At most two, or at most k transactions (123, 188): add the transaction count to the state.",
    "A cooldown day after each sale (309): add a third state. A fee per transaction (714): subtract it on one transition; the sum-of-rises greedy no longer works.",
    "Return the actual trades: buy at the start of each maximal rising run and sell at its end.",
    "Up to s shares may be held at once: the state becomes the number of shares held, 0..s.",
  ],
  explanation: [
    { h: "The states" },
    "At the end of each day you are in one of two states: holding nothing, or holding one share. For each state, keep one number, the best profit achievable by any plan that ends the day in that state. Call them cash and hold. In hold, the money spent on the share is already subtracted.",
    "Why one number per state is enough: two plans that both hold a share at the end of day i have exactly the same options from then on, so only the more profitable one can ever matter.",
    { h: "Start" },
    "Before trading, you hold nothing and have made nothing: cash = 0. Holding is only possible by buying on day 0: hold = −prices[0].",
    { h: "One day's transitions" },
    {
      list: [
        "To end today holding nothing: you held nothing yesterday and waited (cash), or you held a share and sold it today (hold + price).",
        "To end today holding a share: you held one and waited (hold), or you held nothing and bought today (cash − price).",
      ],
    },
    { code: "cash_today = max(cash, hold + price)   // wait, or sell\nhold_today = max(hold, cash - price)   // wait, or buy" },
    "The answer is cash after the last day.",
    { h: "A worked example: [7, 1, 5, 3, 6, 4]" },
    {
      table: {
        head: ["day", "price", "cash (holding nothing)", "hold (holding one)", "what happened"],
        rows: [
          [0, 7, 0, -7, "buy at 7 is the only way to hold"],
          [1, 1, 0, -1, "better to hold a share bought at 1"],
          [2, 5, 4, -1, "sell the share bought at 1: −1 + 5"],
          [3, 3, 4, 1, "rebuy at 3 with the 4 earned: 4 − 3"],
          [4, 6, "**7**", 1, "sell at 6: 1 + 6"],
          [5, 4, "**7**", 3, "selling at 4 would give only 5"],
        ],
        caption: "The two state values at the end of each day. The answer is the final cash, 7.",
      },
    },
    "Read the hold column as \"the best position if I must own a share tonight\". On day 3 it jumps from −1 to 1 because selling on day 2 and rebuying at 3 leaves you with more than keeping the share bought at 1.",
    { h: "The same answer, as a greedy" },
    "The two-state DP never loses a positive daily change and never takes a negative one. Directly: profit = sum of max(0, prices[i] − prices[i − 1]). On the example: (5 − 1) + (6 − 3) = 7. This works only because transactions are free and unlimited.",
    { tip: "Signal: buy/sell with a rule about what you may hold. Draw the states and arrows first, then write one max per state per day." },
  ],
  analysis: {
    time: "O(n)",
    space: "O(1)",
    notes: ["The greedy and the DP are both a single pass."],
  },
  solution: `class Solution {
public:
    int maxProfit(vector<int>& prices) {
        // cash: best profit of any plan that holds nothing at the end of the day.
        // hold: best profit of any plan that holds one share at the end of the day
        //       (the purchase price already subtracted).
        // Day 0: holding is only possible by buying today.
        int cash = 0, hold = -prices[0];

        for (size_t i = 1; i < prices.size(); ++i) {
            int p = prices[i];
            // Both new values must be computed from yesterday's values.
            int prevCash = cash, prevHold = hold;
            cash = max(prevCash, prevHold + p);  // wait, or sell the share today
            hold = max(prevHold, prevCash - p);  // wait, or buy a share today
        }
        // Holding a share at the end is never better than having sold it.
        return cash;
    }
};

// The same answer as a greedy, valid because trades are free and unlimited:
//   int profit = 0;
//   for (size_t i = 1; i < prices.size(); ++i)
//       profit += max(0, prices[i] - prices[i - 1]);   // collect every rise
//   return profit;
`,
});
