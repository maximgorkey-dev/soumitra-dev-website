import { study } from "./leet-light.js";

export const lc115 = study({
  number: 115,
  title: "Distinct Subsequences",
  slug: "distinct-subsequences",
  difficulty: "H",
  pattern: "F3",
  topic: "F3 · DP over two strings",
  themes: ["Counting DP", "Prefix DP"],
  blurb: "dp[i][j] counts the ways the first j characters of t appear as a subsequence of the first i of s. A matching s[i − 1] may be used for t[j − 1] or skipped.",
  statement: [
    "Return how many distinct subsequences of s (chosen by positions) equal t. The answer fits in a 32-bit integer.",
    "Both strings up to 1000 characters.",
  ],
  concepts: [
    "Counting DP over two prefixes: add the counts of disjoint choices.",
    "Use-or-skip on the longer string: s[i − 1] either matches t[j − 1] or is not used.",
    "Base case: the empty t appears exactly once in any prefix of s.",
    "Rolling one row, iterating j from right to left so row i − 1 values are still intact.",
  ],
  traps: [
    "Intermediate counts can exceed 32 bits even though the answer fits: use unsigned long long or a larger type.",
    "Iterating j left to right in the rolled array, which uses s[i − 1] twice.",
  ],
  followUps: [
    "Count distinct subsequence strings of s (940).",
    "Return the count modulo 10⁹ + 7 for longer strings.",
  ],
  explanation: [
    "dp[i][j] is the number of ways to pick t[0..j) as a subsequence of s[0..i). Every s prefix contains the empty t once: dp[i][0] = 1. With i = 0 and j > 0 there are no ways.",
    "Skipping s[i − 1] always contributes dp[i − 1][j]. If s[i − 1] == t[j − 1], using it for the last character of t adds dp[i − 1][j − 1]. The two sets of choices are disjoint, so the counts add.",
    "In one rolling row, go through j from high to low so that dp[j − 1] still holds the previous row's value.",
    { tip: "Signal: count the ways one string occurs inside another. Use-or-skip on the longer string; counts add." },
  ],
  analysis: { time: "O(m · n)", space: "O(n)" },
  solution: `class Solution {
public:
    int numDistinct(string s, string t) {
        int n = t.size();
        // dp[j]: ways to form t[0..j) from the prefix of s seen so far.
        // Intermediate counts may exceed 32 bits even when the answer does not;
        // unsigned arithmetic wraps harmlessly for values that are never returned.
        vector<unsigned long long> dp(n + 1, 0);
        dp[0] = 1;  // the empty t occurs once in any prefix

        for (char c : s) {
            // Right to left: dp[j-1] must still be the count before this character.
            for (int j = n; j >= 1; --j)
                if (t[j - 1] == c) dp[j] += dp[j - 1];  // use c as t[j-1]; skipping it keeps dp[j]
        }
        return (int)dp[n];
    }
};
`,
});
