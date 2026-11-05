import { study } from "./leet-light.js";

export const lc10 = study({
  number: 10,
  title: "Regular Expression Matching",
  slug: "regular-expression-matching",
  difficulty: "H",
  pattern: "F3",
  topic: "F3 · DP over two strings",
  themes: ["Prefix DP", "Pattern matching", "Star as zero or more"],
  blurb: "dp[i][j]: does s[0..i) match p[0..j)? A plain character or '.' must match the last character; \"x*\" either matches nothing (skip two pattern characters) or eats one more x from s.",
  statement: [
    "Implement full-string matching with '.' (any single character) and '*' (zero or more of the preceding element). Return whether the whole of s matches p.",
    "s up to 20 characters, p up to 20; every '*' follows a valid character.",
  ],
  concepts: [
    "Prefix DP over the text and the pattern.",
    "Treat \"x*\" as one unit with two choices: zero copies, or one more copy while staying on the same unit.",
    "Base row: an empty s matches only patterns like \"a*b*c*\".",
    "The same structure as an NFA simulation; the DP is its memo table.",
  ],
  traps: [
    "Treating '*' as a wildcard on its own (that is 44).",
    "Forgetting the empty-s row, where \"a*\" must match \"\".",
    "Using \"x*\" to consume a character of s that does not match x.",
  ],
  followUps: [
    "Add '+' (one or more): \"x+\" is \"xx*\".",
    "Top-down memoised recursion is often easier to get right in an interview.",
    "Compile the pattern to an NFA and simulate with a set of states.",
  ],
  explanation: [
    "dp[i][j] is true if s[0..i) matches p[0..j). dp[0][0] is true. With s empty, dp[0][j] is true only if p[j − 1] is '*' and dp[0][j − 2] is true.",
    "If p[j − 1] is a letter or '.', it must match s[i − 1], and then dp[i][j] = dp[i − 1][j − 1].",
    "If p[j − 1] is '*', the unit is p[j − 2] repeated. Zero copies: dp[i][j − 2]. One more copy: if p[j − 2] matches s[i − 1], then dp[i − 1][j], which stays on the same unit so it may eat more.",
    { tip: "Signal: matching with repetition operators. Prefix DP, with the repeat as \"zero more\" or \"one more and stay\"." },
  ],
  analysis: { time: "O(m · n)", space: "O(m · n)" },
  solution: `class Solution {
public:
    bool isMatch(string s, string p) {
        int m = s.size(), n = p.size();
        // dp[i][j]: does s[0..i) match p[0..j)?
        vector<vector<bool>> dp(m + 1, vector<bool>(n + 1, false));
        dp[0][0] = true;

        // Does pattern character pc match text character c?
        auto same = [](char c, char pc) { return pc == '.' || pc == c; };

        for (int i = 0; i <= m; ++i) {
            for (int j = 1; j <= n; ++j) {
                if (p[j - 1] == '*') {
                    // "x*" with x = p[j-2].
                    // Zero copies: ignore the unit entirely.
                    bool zero = dp[i][j - 2];
                    // One more copy: x matches s[i-1], and s[0..i-1) still matches "...x*".
                    bool more = i > 0 && same(s[i - 1], p[j - 2]) && dp[i - 1][j];
                    dp[i][j] = zero || more;
                } else {
                    // A letter or '.': it must match the last character of s.
                    dp[i][j] = i > 0 && same(s[i - 1], p[j - 1]) && dp[i - 1][j - 1];
                }
            }
        }
        return dp[m][n];
    }
};
`,
});
