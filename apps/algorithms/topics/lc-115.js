import { study } from "./leet-light.js";

export const lc115 = study({
  number: 115,
  title: "Distinct Subsequences",
  slug: "distinct-subsequences",
  difficulty: "H",
  pattern: "F3",
  topic: "F3 · DP over two strings",
  themes: ["Counting DP", "Prefix DP", "Use or skip"],
  blurb: "dp[i][j] counts the ways to pick t's first j characters out of s's first i. Each new character of s is either skipped (dp[i − 1][j] ways) or, if it equals t[j − 1], used as that character (dp[i − 1][j − 1] more ways).",
  statement: [
    "Count the subsequences of s that equal t. Two subsequences are different if they use a different set of positions in s, even if they spell the same thing.",
    "s and t have up to 1000 characters. The answer fits in a 32-bit signed integer. Example: s = \"rabbbit\", t = \"rabbit\" gives 3 (choose which of the three b's to leave out).",
  ],
  concepts: [
    "Counting DP: instead of the best choice, add up the counts of all choices. The choices must be disjoint so nothing is counted twice.",
    "Use or skip on the longer string: the last character of s is either not used, or used to match the last character of t.",
    "Base case for counting: the empty t can be picked from any prefix of s in exactly one way (pick nothing).",
    "Overflow management: the final answer fits in 32 bits, but intermediate cells may not.",
  ],
  hints: [
    "Think about the last character of s. In a given way of picking t, is it used or not?",
    "If it is not used, the count is the same as for s without its last character.",
    "If it is used, it must be the last character of t, and the rest of t must come from the rest of s.",
    "The two groups do not overlap, so add them. What is the count for an empty t?",
  ],
  brute: [
    "Enumerate every subset of positions of s with |t| elements and check whether it spells t: C(|s|, |t|) subsets. For |s| = 1000 and |t| = 500 that is about 10²⁹⁹.",
    "A recursion count(i, j) that tries skip and use is exponential too, because count(i − 2, j − 1) is reached by \"skip then use\" and \"use then skip\". With a memo over the (|s| + 1)(|t| + 1) states, it becomes O(|s| · |t|).",
  ],
  invariant: "dp[i][j] is the number of ways to choose positions in s[0..i) that spell t[0..j).",
  traps: [
    "Overflow. Cells in the middle of the table can exceed 2³¹ even when the final answer does not (LeetCode adds such tests). Use unsigned long long and convert at the end; unsigned overflow wraps without undefined behaviour, and values that wrapped are never the answer.",
    "Forgetting dp[i][0] = 1, which makes every count 0.",
    "In the one-row version, iterating j left to right: the new dp[j − 1] would then be read, which uses the same character of s twice. Go right to left.",
    "Swapping the roles of s and t: t must be the one consumed fully.",
  ],
  followUps: [
    "Count the distinct strings among the subsequences of s (940): a different DP that subtracts the count from the previous occurrence of the same character.",
    "Return the count modulo 10⁹ + 7 for longer strings: the same table with a modulus.",
    "Check only whether t is a subsequence of s, for many t (392 follow-up): precompute next-occurrence tables or per-character position lists with binary search.",
  ],
  explanation: [
    { h: "What the table means" },
    "Rows are prefixes of s (i = 0..|s|) and columns are prefixes of t (j = 0..|t|). The cell dp[i][j] answers: in how many ways can positions be chosen from the first i characters of s so that they spell the first j characters of t?",
    "The answer is dp[|s|][|t|].",
    { h: "Base cases" },
    "dp[i][0] = 1 for every i: the empty t is spelled by choosing nothing, exactly once. dp[0][j] = 0 for j > 0: an empty s cannot spell a non-empty t.",
    { h: "Filling one cell" },
    "Split all the ways of spelling t[0..j) from s[0..i) by what happens to s[i − 1]:",
    {
      list: [
        "It is not used: the positions all come from s[0..i − 1). That is dp[i − 1][j] ways.",
        "It is used: then it must be the last character of t, so this needs s[i − 1] == t[j − 1], and the other j − 1 characters come from s[0..i − 1). That is dp[i − 1][j − 1] ways.",
      ],
    },
    "Every way falls into exactly one group, so the counts add.",
    { code: "dp[i][j] = dp[i-1][j] + (s[i-1] == t[j-1] ? dp[i-1][j-1] : 0)" },
    { h: "A worked example: s = \"babgbag\", t = \"bag\"" },
    {
      table: {
        head: ["", "\"\"", "b", "a", "g"],
        rows: [
          ["\"\"", 1, 0, 0, 0],
          ["b", 1, 1, 0, 0],
          ["a", 1, 1, 1, 0],
          ["b", 1, 2, 1, 0],
          ["g", 1, 2, 1, 1],
          ["b", 1, 3, 1, 1],
          ["a", 1, 3, 4, 1],
          ["g", 1, 3, 4, "**5**"],
        ],
        caption: "Rows are prefixes of s, columns prefixes of t. Each cell counts the ways to spell that prefix of t.",
      },
    },
    "Row 6 (the second 'a'), column a: skip it and keep the 1 way from the row above, or use it as t's 'a' after any of the 3 ways to pick \"b\" from \"babgb\": 1 + 3 = 4.",
    "The last row, column g: skip the final 'g' (1 way from above), or use it after any of the 4 ways to pick \"ba\": 1 + 4 = 5.",
    { h: "Fill order and memory" },
    "Each cell reads only the row above, so one array is enough. Process j from |t| down to 1, so that dp[j − 1] still holds the previous row's value when dp[j] reads it.",
    { tip: "Signal: count the ways one sequence appears inside another. Use-or-skip on the longer sequence, and add the disjoint counts." },
  ],
  analysis: {
    time: "O(|s| · |t|)",
    space: "O(|s| · |t|) as written; O(|t|) with one row",
    notes: ["About 10⁶ cells at the limits."],
  },
  solution: `class Solution {
public:
    int numDistinct(string s, string t) {
        int m = s.size(), n = t.size();

        // dp[i][j] = ways to choose positions in s[0..i) that spell t[0..j).
        // unsigned long long: middle cells can exceed 32 bits even though the
        // answer does not; unsigned overflow wraps harmlessly for those cells.
        vector<vector<unsigned long long>> dp(m + 1, vector<unsigned long long>(n + 1, 0));

        // The empty t is spelled once, by choosing nothing.
        for (int i = 0; i <= m; ++i) dp[i][0] = 1;

        for (int i = 1; i <= m; ++i) {
            for (int j = 1; j <= n; ++j) {
                // Ways that do not use s[i-1].
                dp[i][j] = dp[i - 1][j];
                // Ways that use s[i-1] as the last character of t[0..j).
                if (s[i - 1] == t[j - 1]) dp[i][j] += dp[i - 1][j - 1];
            }
        }
        return (int)dp[m][n];
    }
};

// One row: for (char c : s) for (int j = n; j >= 1; --j) if (t[j-1] == c) dp[j] += dp[j-1];
// Right to left, so dp[j-1] is still the previous row when it is read.
`,
});
