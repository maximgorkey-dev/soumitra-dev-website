import { study } from "./leet-light.js";

export const lc123 = study({
  number: 123,
  title: "Best Time to Buy and Sell Stock III",
  slug: "best-time-to-buy-and-sell-stock-iii",
  difficulty: "H",
  pattern: "F1",
  topic: "F1 · State-machine DP",
  themes: ["Stocks", "Four states", "Prefix and suffix split"],
  blurb: "At most two transactions means a chain of four milestones: first buy, first sell, second buy, second sell. Each milestone's best value either stays or is reached today from the milestone before it.",
  statement: [
    "prices[i] is the price on day i. Complete at most two transactions (each a buy followed later by a sell), holding at most one share at a time.",
    "Return the largest profit. Up to 10⁵ days. Example: [3, 3, 5, 0, 0, 3, 1, 4] gives 6 (buy 0, sell 3; buy 1, sell 4).",
  ],
  concepts: [
    "State-machine DP with a counter folded into the state: the states form a chain buy1 → sell1 → buy2 → sell2.",
    "Best value per milestone: buy1 is the best balance after the first purchase, sell1 after the first sale, and so on.",
    "Same-day chaining is harmless: buying and selling on the same day earns exactly 0, so updating milestones in order within a day never inflates the answer.",
    "An alternative split view: best single transaction ending by day i, plus best single transaction starting after day i, maximised over i.",
  ],
  hints: [
    "With unlimited trades you needed two states. What extra fact about the past matters now?",
    "How many transactions have been started or finished.",
    "List the milestones in order. For each, how can you be at it at the end of today?",
    "Either you were already there yesterday, or you reached it today from the previous milestone by one trade.",
  ],
  brute: [
    "Try every pair of disjoint intervals [buy1, sell1] and [buy2, sell2]: O(n⁴) pairs, or O(n²) with prefix maxima. For n = 10⁵, even O(n²) is 10¹⁰.",
    "The structure that is being wasted: the best plan for \"after the first sale, by day i\" does not depend on what happens after day i. Keeping that best value per milestone turns the search into one pass.",
  ],
  invariant: "After day i, buy1, sell1, buy2 and sell2 are the best balances of any plan that, by the end of day i, has reached that milestone (and no later one).",
  traps: [
    "Picking the two largest rises: two rises separated by a small dip are better merged into one transaction, freeing the second for elsewhere.",
    "Initialising buy1 and buy2 to 0, which pretends a share was bought for free. Use −∞ (or −prices[0]).",
    "Assuming the answer must use exactly two transactions: sell2 also covers one or zero, because the second trade can be a buy and sell on the same day.",
    "In the prefix-and-suffix version, letting both halves use the same transaction: they must be split at a day boundary.",
  ],
  followUps: [
    "Generalise to k transactions (188): 2k milestones, the same chain.",
    "Return the actual days: record, for each milestone, the day it was last improved, or rebuild from the split view.",
    "Explain the split view: left[i] = best one-transaction profit within days 0..i (min price so far), right[i] = best within days i..n − 1 (max price after); answer = max over i of left[i] + right[i]. Also O(n).",
    "What changes with a fee or cooldown? Add it to the relevant transitions, exactly as in 714 and 309.",
  ],
  explanation: [
    { h: "The states" },
    "Two transactions pass through four milestones in order: buy1 (holding the first share), sell1 (first trade done), buy2 (holding the second share), sell2 (both done). For each milestone keep the best balance of any plan that has reached it by the end of today. Purchases count as negative.",
    { h: "Start" },
    "Before day 0 no share has been bought, so buy1 and buy2 are −∞; sell1 and sell2 are 0 (doing nothing earns nothing).",
    { h: "One day's transitions" },
    "Each milestone is either kept from yesterday, or reached today from the previous one:",
    { code: "buy1  = max(buy1,  -price)        // first purchase today\nsell1 = max(sell1, buy1 + price)  // first sale today\nbuy2  = max(buy2,  sell1 - price) // second purchase today, using first profit\nsell2 = max(sell2, buy2 + price)  // second sale today" },
    "Updating them in this order means sell1 may use today's buy1, and so on. That corresponds to buying and selling on the same day, which earns 0, so it never makes an answer wrong.",
    "The answer is sell2. It also covers plans with fewer trades, because sell2 ≥ sell1 ≥ 0.",
    { h: "A worked example: [3, 3, 5, 0, 0, 3, 1, 4]" },
    {
      table: {
        head: ["day", "price", "buy1", "sell1", "buy2", "sell2"],
        rows: [
          [0, 3, -3, 0, -3, 0],
          [1, 3, -3, 0, -3, 0],
          [2, 5, -3, 2, -3, 2],
          [3, 0, 0, 2, 2, 2],
          [4, 0, 0, 2, 2, 2],
          [5, 3, 0, 3, 2, 5],
          [6, 1, 0, 3, 2, 5],
          [7, 4, 0, 4, 2, "**6**"],
        ],
        caption: "The four milestone values at the end of each day. The answer is the final sell2.",
      },
    },
    "Day 3: buy2 becomes 2, meaning \"sold the first share at 5 for +2, then bought a second share at 0\". Day 7: sell2 = buy2 + 4 = 6, which is that second share sold at 4 on top of the first profit of 2. Another plan reaching 6 is buy 0, sell 3, buy 1, sell 4; the table only stores the value, not which plan reached it.",
    { tip: "Signal: \"at most k\" transactions, intervals or operations, with small k. Put the count into the state as a chain of milestones." },
  ],
  analysis: {
    time: "O(n)",
    space: "O(1)",
    notes: [],
  },
  solution: `class Solution {
public:
    int maxProfit(vector<int>& prices) {
        // Best balance of any plan that has reached each milestone by today.
        // Purchases count as negative; no share can have been bought before day 0.
        int buy1 = INT_MIN, sell1 = 0, buy2 = INT_MIN, sell2 = 0;

        for (int p : prices) {
            // Each milestone: keep yesterday's best, or reach it today from the
            // previous milestone. Using today's updated value of the previous one
            // means buying and selling on the same day, which earns 0: harmless.
            buy1  = max(buy1, -p);          // first share bought today
            sell1 = max(sell1, buy1 + p);   // first share sold today
            buy2  = max(buy2, sell1 - p);   // second share bought with the first profit
            sell2 = max(sell2, buy2 + p);   // second share sold today
        }
        // sell2 >= sell1 >= 0, so fewer than two trades are covered too.
        return sell2;
    }
};
`,
});
