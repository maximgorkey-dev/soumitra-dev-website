import { study } from "./leet-light.js";

export const lc1143 = study({
  number: 1143,
  title: "Longest Common Subsequence",
  slug: "longest-common-subsequence",
  difficulty: "M",
  pattern: "F3",
  topic: "F3 · DP over two strings",
  themes: ["Prefix DP", "LCS"],
  blurb: "dp[i][j] is the LCS of the two prefixes. Equal last characters extend the diagonal by one; otherwise drop the last character of one string or the other.",
  statement: [
    "Return the length of the longest subsequence common to text1 and text2 (0 if none).",
    "Both strings up to 1000 characters.",
  ],
  concepts: [
    "Prefix DP over two strings, deciding on the last characters.",
    "An exchange argument justifies taking a match: if the last characters are equal, some optimal LCS uses them both.",
    "Rolling rows for O(min(m, n)) memory.",
    "LCS is the core of many problems: shortest common supersequence, deletions to make equal, and diff tools.",
  ],
  traps: [
    "Confusing subsequence (gaps allowed) with substring (contiguous): longest common substring resets to 0 on a mismatch.",
    "Off-by-one when indexing characters from dp indices.",
  ],
  followUps: [
    "Reconstruct the subsequence.",
    "One string has distinct characters: reduce to LIS in O(n log n) (1713).",
    "Three strings: dp over triples.",
  ],
  explanation: [
    "dp[i][j] is the LCS length of text1[0..i) and text2[0..j). If text1[i − 1] == text2[j − 1], pairing them is safe, so dp[i][j] = dp[i − 1][j − 1] + 1. Otherwise at least one of the two last characters is unused: dp[i][j] = max(dp[i − 1][j], dp[i][j − 1]).",
    "Empty prefixes give 0. The answer is dp[m][n].",
    { tip: "Signal: \"common\", \"subsequence\", two strings. The LCS table, possibly as a building block." },
  ],
  analysis: { time: "O(m · n)", space: "O(n) with one rolling row" },
  solution: `class Solution {
public:
    int longestCommonSubsequence(string text1, string text2) {
        int m = text1.size(), n = text2.size();
        // dp[j]: LCS of text1[0..i) and text2[0..j), for the current i.
        vector<int> dp(n + 1, 0);

        for (int i = 1; i <= m; ++i) {
            int diag = 0;  // dp[i-1][j-1]; for j = 1 that is dp[i-1][0] = 0
            for (int j = 1; j <= n; ++j) {
                int up = dp[j];  // dp[i-1][j]
                if (text1[i - 1] == text2[j - 1])
                    dp[j] = diag + 1;             // use both last characters
                else
                    dp[j] = max(up, dp[j - 1]);   // drop the last of text1, or of text2
                diag = up;
            }
        }
        return dp[n];
    }
};
`,
});
