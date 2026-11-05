import { study } from "./leet-light.js";

export const lc879 = study({
  number: 879,
  title: "Profitable Schemes",
  slug: "profitable-schemes",
  difficulty: "H",
  pattern: "F5",
  topic: "F5 · Knapsack and counting",
  see: 494,
  themes: ["Two-dimensional knapsack", "Capped dimension", "Counting subsets"],
  blurb: "Count subsets of crimes with two budgets: members used (at most n) and profit earned (at least minProfit). Profit beyond minProfit is all the same, so cap it there, and the table is dp[members][capped profit], updated like a 0/1 knapsack.",
  statement: [
    "A gang has n members. Crime i needs group[i] members and earns profit[i]; a member can take part in at most one crime. A scheme is any subset of crimes whose total members is at most n and whose total profit is at least minProfit.",
    "Count the schemes modulo 10⁹ + 7. n ≤ 100, minProfit ≤ 100, up to 100 crimes. Example: n = 5, minProfit = 3, group = [2, 2], profit = [2, 3] gives 2 (crime 1 alone, or both crimes).",
  ],
  concepts: [
    "0/1 knapsack with two dimensions: each crime is an item with two weights (members, profit), and both must be tracked.",
    "Capping a \"at least\" dimension: once profit reaches minProfit, any extra profit is irrelevant, so store min(profit, minProfit). That keeps the dimension at minProfit + 1 values.",
    "Exactly versus at most: the members dimension counts exactly m members used, and the answer sums over m ≤ n.",
    "Downward in-place update: members run from n down to the crime's group size so each crime is used at most once.",
    "Modular counting: the number of subsets is up to 2¹⁰⁰, so reduce after each addition.",
  ],
  hints: [
    "Each crime is in or out of the scheme. Which two quantities about a partial scheme decide whether it can still be completed into a valid one?",
    "Members used so far and profit so far. That gives a table over (members, profit).",
    "Profit can be as large as 100 × 100. Does the exact value matter once it reaches minProfit?",
    "Cap profit at minProfit. Then the answer is the sum of dp[m][minProfit] over all m ≤ n.",
  ],
  brute: [
    "Enumerate all 2^k subsets of the k crimes and check both totals: 2¹⁰⁰ subsets.",
    "Subsets with the same members used and the same capped profit behave identically from then on, so they can be counted together. That leaves (n + 1) × (minProfit + 1) ≤ 10 201 states, updated once per crime: about 10⁶ steps.",
  ],
  invariant: "After processing the first i crimes, dp[m][p] is the number of subsets of those crimes that use exactly m members and whose profit, capped at minProfit, equals p.",
  traps: [
    "Not capping profit: the table needs 10⁴ profit columns, 100 times more work, and the answer must then sum over all columns ≥ minProfit.",
    "Iterating members upward: a crime would be counted more than once in the same scheme.",
    "Answering with dp[n][minProfit] only: schemes may use fewer than n members, so sum over every m.",
    "minProfit = 0: the empty scheme counts. With dp[0][0] = 1 and profit capped at 0, every subset that fits lands in column 0, including the empty one, which is correct.",
    "Overflow: two counts near 10⁹ add past 2³¹; add then reduce, using long long or careful int arithmetic.",
  ],
  followUps: [
    "Why capping is valid: the scheme's validity only asks profit ≥ minProfit, so two partial schemes whose profits are both at least minProfit have exactly the same valid completions.",
    "At most one dimension: drop members and it is 494-style counting; drop profit and it is subsets with total weight ≤ n.",
    "Maximise profit with at most n members: the standard 0/1 knapsack with a max instead of a count.",
    "Several resource limits (members, vehicles, time): one dimension per limit; cap every \"at least\" constraint.",
    "Large n with small minProfit: swap roles, count by profit and track the fewest members, or cap members too when the limit is loose.",
  ],
  explanation: [
    { h: "What the table means" },
    "dp[m][p] is the number of subsets of the crimes processed so far that use exactly m members and earn capped profit p, where capped means min(actual profit, minProfit). Column minProfit therefore collects every subset that already meets the target.",
    "Why capping loses nothing: once a scheme has profit at least minProfit, adding more crimes only needs members, never more profit. So all such schemes have the same future, and one column holds them all.",
    { h: "Base case" },
    "Before any crime, only the empty scheme exists: dp[0][0] = 1.",
    { h: "Adding one crime (g members, profit q)" },
    {
      list: [
        "Schemes without this crime keep their cell.",
        "Schemes with it come from a scheme of the earlier crimes in cell (m − g, p) and land in (m, min(minProfit, p + q)).",
        "Loop m from n down to g, so dp[m − g][·] still describes schemes without this crime.",
      ],
    },
    { code: "dp[0][0] = 1\nfor each crime (g, q):\n    for m = n down to g:\n        for p = 0 .. minProfit:\n            dp[m][min(minProfit, p + q)] += dp[m - g][p]\nanswer = sum over m = 0..n of dp[m][minProfit]" },
    { h: "A worked example: n = 5, minProfit = 3, group = [2, 2], profit = [2, 3]" },
    {
      table: {
        head: ["members m", "p = 0", "p = 1", "p = 2", "p = 3 (target met)"],
        rows: [
          [0, 1, 0, 0, 0],
          [1, 0, 0, 0, 0],
          [2, 0, 0, 1, "**1**"],
          [3, 0, 0, 0, 0],
          [4, 0, 0, 0, "**1**"],
          [5, 0, 0, 0, 0],
        ],
        caption: "dp[m][p] after both crimes: subsets using exactly m members with capped profit p. The answer is the last column's sum, 1 + 1 = 2.",
      },
    },
    "Crime 0 (2 members, profit 2) moves the empty scheme from (0, 0) to (2, 2): that cell is \"crime 0 alone\". Crime 1 (2 members, profit 3) then adds two schemes: from (0, 0) to (2, 3), which is crime 1 alone, and from (2, 2) to (4, min(3, 5)) = (4, 3), which is both crimes with profit 5 capped to 3.",
    "Crime 0 alone sits in column 2, below the target, so it is not counted. The empty scheme in (0, 0) is also not counted because minProfit is 3.",
    { h: "Fill order and memory" },
    "Each crime touches every (m, p) cell once: O(k × n × minProfit) ≈ 10⁶ steps, and O(n × minProfit) memory.",
    { tip: "Signal: count subsets under a budget (at most) and a target (at least). Two knapsack dimensions, with the target dimension capped at the target." },
  ],
  analysis: {
    time: "O(crimes × n × minProfit)",
    space: "O(n × minProfit)",
    notes: ["Capping profit at minProfit is what keeps the table small."],
  },
  solution: `class Solution {
public:
    int profitableSchemes(int n, int minProfit, vector<int>& group, vector<int>& profit) {
        const int MOD = 1'000'000'007;
        // dp[m][p]: subsets of the crimes so far using exactly m members whose
        // profit, capped at minProfit, is p. Extra profit beyond the target
        // does not change anything, so it is folded into column minProfit.
        vector<vector<int>> dp(n + 1, vector<int>(minProfit + 1, 0));
        dp[0][0] = 1;                                   // the empty scheme

        for (size_t k = 0; k < group.size(); ++k) {
            int g = group[k], q = profit[k];
            // Members downward: dp[m - g] still excludes this crime,
            // so each crime is used at most once.
            for (int m = n; m >= g; --m)
                for (int p = 0; p <= minProfit; ++p) {
                    int np = min(minProfit, p + q);
                    dp[m][np] = (dp[m][np] + dp[m - g][p]) % MOD;
                }
        }

        // Any number of members up to n; profit must have reached the target.
        int total = 0;
        for (int m = 0; m <= n; ++m) total = (total + dp[m][minProfit]) % MOD;
        return total;
    }
};
`,
});
