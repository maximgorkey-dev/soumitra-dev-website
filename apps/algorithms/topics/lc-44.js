import { study } from "./leet-light.js";

export const lc44 = study({
  number: 44,
  title: "Wildcard Matching",
  slug: "wildcard-matching",
  difficulty: "H",
  pattern: "F3",
  topic: "F3 · DP over two strings",
  themes: ["Prefix DP", "Pattern matching", "Greedy backtracking"],
  blurb: "dp[i][j] for s[0..i) against p[0..j): '?' matches one character, '*' matches the empty string (dp[i][j − 1]) or one more character (dp[i − 1][j]).",
  statement: [
    "Implement full-string matching where '?' matches any one character and '*' matches any sequence, including the empty one.",
    "s and p up to 2000 characters.",
  ],
  concepts: [
    "Prefix DP over text and pattern, like 10, but '*' stands alone.",
    "\"Empty or one more and stay\" for the star.",
    "A greedy alternative: remember the last '*' and backtrack to it on a mismatch, O(m · n) worst case but O(1) space and fast in practice.",
  ],
  traps: [
    "Confusing this with 10, where '*' modifies the preceding character.",
    "The empty-s row: a prefix of p matches \"\" only if it is all stars.",
    "Not collapsing consecutive stars in the greedy version is fine, but forgetting to reset the backtrack point is not.",
  ],
  followUps: [
    "O(1) extra memory: the greedy two-pointer with a star backtrack point.",
    "Case-insensitive or character classes.",
  ],
  explanation: [
    "dp[i][j] is true if s[0..i) matches p[0..j). dp[0][0] is true, and dp[0][j] is true while p[0..j) is all '*'.",
    "If p[j − 1] is '*', it matches nothing (dp[i][j − 1]) or swallows s[i − 1] and may continue (dp[i − 1][j]). If it is '?' or the same letter as s[i − 1], dp[i][j] = dp[i − 1][j − 1]. Otherwise false.",
    "One rolling row is enough: dp[i][j − 1] is already in the current row and dp[i − 1][j] is the old value in place.",
    { tip: "Signal: '*' that matches anything. Prefix DP, or the greedy star-backtrack for O(1) memory." },
  ],
  analysis: { time: "O(m · n)", space: "O(n)" },
  solution: `class Solution {
public:
    bool isMatch(string s, string p) {
        int m = s.size(), n = p.size();
        // dp[j] holds row i: does s[0..i) match p[0..j)?
        vector<bool> dp(n + 1, false);
        dp[0] = true;
        for (int j = 1; j <= n; ++j) dp[j] = dp[j - 1] && p[j - 1] == '*';  // "" matches only stars

        for (int i = 1; i <= m; ++i) {
            bool diag = dp[0];  // row i-1, column 0
            dp[0] = false;      // a non-empty s never matches an empty pattern
            for (int j = 1; j <= n; ++j) {
                bool up = dp[j];  // row i-1, column j
                if (p[j - 1] == '*')
                    dp[j] = dp[j - 1]  // '*' matches the empty string
                         || up;        // '*' swallows s[i-1] and stays available
                else
                    dp[j] = diag && (p[j - 1] == '?' || p[j - 1] == s[i - 1]);  // one character each
                diag = up;
            }
        }
        return dp[n];
    }
};
`,
});
