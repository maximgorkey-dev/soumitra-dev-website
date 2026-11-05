import { study } from "./leet-light.js";

export const lc97 = study({
  number: 97,
  title: "Interleaving String",
  slug: "interleaving-string",
  difficulty: "M",
  pattern: "F3",
  topic: "F3 · DP over two strings",
  themes: ["Prefix DP", "Boolean table"],
  blurb: "dp[i][j]: can the first i characters of s1 and the first j of s2 interleave into the first i + j of s3? The next character of s3 must come from s1 or from s2.",
  statement: [
    "Return whether s3 can be formed by interleaving s1 and s2: splitting both into pieces and merging them while keeping each string's order.",
    "s1 and s2 up to 100 characters; the follow-up asks for O(|s2|) extra memory.",
  ],
  concepts: [
    "Prefix DP over two strings where the third string's position is implied: k = i + j.",
    "A boolean table: reachability over a grid of (i, j) moving right or down.",
    "A quick length check: |s1| + |s2| must equal |s3|.",
  ],
  traps: [
    "Greedy matching from s1 first: with equal characters you must try both strings.",
    "Forgetting the length check, which makes the table answer the wrong question.",
  ],
  followUps: [
    "Return one interleaving (which characters come from s1).",
    "Three source strings: a 3D table.",
  ],
  explanation: [
    "dp[i][j] is true if s1[0..i) and s2[0..j) can interleave into s3[0..i + j). The empty prefixes trivially do.",
    "The last character of s3[0..i + j) came from one of the two: dp[i][j] = (dp[i − 1][j] and s1[i − 1] == s3[i + j − 1]) or (dp[i][j − 1] and s2[j − 1] == s3[i + j − 1]).",
    "Think of it as a path in a grid from (0, 0) to (m, n), moving down to use a character of s1 or right to use one of s2.",
    { tip: "Signal: merge two sequences in order to make a third. dp over prefix pairs, with the third index i + j." },
  ],
  analysis: { time: "O(m · n)", space: "O(n)" },
  solution: `class Solution {
public:
    bool isInterleave(string s1, string s2, string s3) {
        int m = s1.size(), n = s2.size();
        if (m + n != (int)s3.size()) return false;

        // dp[j]: can s1[0..i) and s2[0..j) interleave into s3[0..i+j)?
        vector<bool> dp(n + 1, false);
        for (int i = 0; i <= m; ++i) {
            for (int j = 0; j <= n; ++j) {
                if (i == 0 && j == 0) { dp[j] = true; continue; }  // empty + empty = empty
                bool fromS1 = i > 0 && dp[j] && s1[i - 1] == s3[i + j - 1];      // dp[j] is still row i-1
                bool fromS2 = j > 0 && dp[j - 1] && s2[j - 1] == s3[i + j - 1];  // dp[j-1] is already row i
                dp[j] = fromS1 || fromS2;
            }
        }
        return dp[n];
    }
};
`,
});
