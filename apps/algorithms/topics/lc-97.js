import { study } from "./leet-light.js";

export const lc97 = study({
  number: 97,
  title: "Interleaving String",
  slug: "interleaving-string",
  difficulty: "M",
  pattern: "F3",
  topic: "F3 · DP over two strings",
  themes: ["Prefix DP", "Boolean table", "Grid path"],
  blurb: "dp[i][j] asks whether the first i characters of s1 and the first j of s2 can be merged into the first i + j of s3. The last character of that piece of s3 came from s1 or from s2; check both.",
  statement: [
    "s3 is an interleaving of s1 and s2 if you can merge all characters of s1 and s2 into s3, keeping each string's own order. Return whether s3 is an interleaving of s1 and s2.",
    "s1 and s2 have up to 100 characters each. The follow-up asks for O(|s2|) extra memory.",
  ],
  concepts: [
    "A third index for free: after using i characters of s1 and j of s2, exactly i + j characters of s3 are placed, so the state is only (i, j).",
    "Boolean prefix DP: each cell is true or false, and is true if either predecessor is true and supplies the right character.",
    "Grid-path view: a path from the top-left to the bottom-right corner, stepping down to use a character of s1 or right to use one of s2.",
    "A cheap first check: |s1| + |s2| must equal |s3|.",
  ],
  hints: [
    "Try a greedy: always take the next character from s1 if it matches. Find an input where that fails.",
    "s1 = \"ab\", s2 = \"ac\", s3 = \"acab\": the first 'a' must come from s2. You have to try both strings when they offer the same character.",
    "Once you have used i characters of s1 and j of s2, which position of s3 is next?",
    "Position i + j. So the state is just (i, j). Write the condition for dp[i][j] from dp[i − 1][j] and dp[i][j − 1].",
  ],
  brute: [
    "Recursively try both options whenever both strings offer the next character of s3. With many equal characters (s1 = \"aaaa…\", s2 = \"aaaa…\"), every step branches, giving up to C(m + n, m) paths: about 9 · 10⁵⁸ for two strings of 100.",
    "It breaks because the same state (i, j) is reached along many paths: using \"a from s1, then a from s2\" or the reverse lands in the same place. There are only (m + 1)(n + 1) states, so caching each one makes it O(m · n).",
  ],
  invariant: "dp[i][j] is true exactly when s1[0..i) and s2[0..j) can interleave into s3[0..i + j).",
  traps: [
    "Skipping the length check: without it, the table may say true while characters of s3 are left over.",
    "Greedy matching from one string first, which fails when both strings offer the same character.",
    "Using index i + j instead of i + j − 1 for the last character of the s3 prefix.",
    "In the rolling-row version, dp[j] still holds the row above when read, and dp[j − 1] already holds the current row: getting that backwards mixes rows.",
  ],
  followUps: [
    "O(|s2|) memory: keep one row, as in the solution's comment; dp[j] is \"from above\" and dp[j − 1] is \"from the left\".",
    "Return which characters come from s1: keep the full table and walk back from (m, n), choosing a true predecessor that supplied the character.",
    "Three source strings: a 3D table over (i, j, k), O(m · n · p).",
    "Count the number of ways to interleave: replace or with +, modulo a prime.",
  ],
  explanation: [
    { h: "What the table means" },
    "Make a table with m + 1 rows for prefixes of s1 and n + 1 columns for prefixes of s2. The cell dp[i][j] answers: can the first i characters of s1 and the first j of s2 be merged, in order, into the first i + j characters of s3?",
    "There is no separate index for s3: after using i and j characters, exactly i + j characters of s3 have been produced. The answer is dp[m][n].",
    { h: "Base cases" },
    "dp[0][0] is true: two empty prefixes make the empty prefix. Row 0 uses only s2, so dp[0][j] is true while s2 and s3 agree on the first j characters; column 0 is the same for s1.",
    { h: "Filling one cell" },
    "The last character of s3[0..i + j), at index i + j − 1, came from one of the two strings:",
    {
      list: [
        "From s1: then s1[i − 1] must equal s3[i + j − 1], and the rest must already work: dp[i − 1][j].",
        "From s2: then s2[j − 1] must equal s3[i + j − 1], and dp[i][j − 1] must be true.",
      ],
    },
    { code: "dp[i][j] = (dp[i-1][j] && s1[i-1] == s3[i+j-1])\n        || (dp[i][j-1] && s2[j-1] == s3[i+j-1])" },
    { h: "A worked example: s1 = \"ab\", s2 = \"ac\", s3 = \"acab\"" },
    {
      table: {
        head: ["", "\"\"", "a", "c"],
        rows: [
          ["\"\"", "T", "T", "T"],
          ["a", "T", "F", "T"],
          ["b", "F", "F", "**T**"],
        ],
        caption: "Rows are prefixes of s1, columns prefixes of s2. T means that pair of prefixes can make the matching prefix of s3.",
      },
    },
    "Row a, column a is F: \"a\" and \"a\" would make s3's first two characters, \"ac\", but the last one, 'c', is neither s1[0] nor s2[0].",
    "Row a, column c is T: the last character of \"aca\" is 'a', which s1[0] supplies, and the cell above (\"\" with \"ac\") is T.",
    "The corner is T, reached by right, right, down, down: take \"ac\" from s2, then \"ab\" from s1. A greedy that starts with s1's 'a' would have been stuck in row a, column \"\", needing a 'c'.",
    { h: "Fill order and memory" },
    "Fill row by row. Each cell reads the cell above and the cell to the left, so one row of booleans is enough for the follow-up.",
    { tip: "Signal: build a third sequence by merging two in order. dp over the two prefixes, with the third index equal to i + j." },
  ],
  analysis: {
    time: "O(m · n)",
    space: "O(m · n) as written; O(n) with one row",
    notes: [],
  },
  solution: `class Solution {
public:
    bool isInterleave(string s1, string s2, string s3) {
        int m = s1.size(), n = s2.size();
        // Every character of s1 and s2 must be used exactly once.
        if (m + n != (int)s3.size()) return false;

        // dp[i][j]: can s1[0..i) and s2[0..j) interleave into s3[0..i+j)?
        vector<vector<bool>> dp(m + 1, vector<bool>(n + 1, false));
        dp[0][0] = true;  // empty + empty = empty

        for (int i = 0; i <= m; ++i) {
            for (int j = 0; j <= n; ++j) {
                if (i == 0 && j == 0) continue;
                char want = s3[i + j - 1];  // the last character of this prefix of s3
                // It came from s1 (step down from the row above) ...
                bool fromS1 = i > 0 && dp[i - 1][j] && s1[i - 1] == want;
                // ... or from s2 (step right from the cell to the left).
                bool fromS2 = j > 0 && dp[i][j - 1] && s2[j - 1] == want;
                dp[i][j] = fromS1 || fromS2;
            }
        }
        return dp[m][n];
    }
};

// O(n) memory: keep one row. When dp[j] is read it still holds row i-1
// ("from above"), and dp[j-1] already holds row i ("from the left").
`,
});
