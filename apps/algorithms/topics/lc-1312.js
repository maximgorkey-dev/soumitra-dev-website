import { study } from "./leet-light.js";

export const lc1312 = study({
  number: 1312,
  title: "Minimum Insertion Steps to Make a String Palindrome",
  slug: "minimum-insertion-steps-to-make-a-string-palindrome",
  difficulty: "H",
  pattern: "F3",
  topic: "F3 · DP over two strings",
  themes: ["LCS reframing", "Palindromes"],
  blurb: "The characters you keep form the longest palindromic subsequence; every other character needs a partner inserted. So the answer is n − LPS, and LPS is the LCS of s and its reverse.",
  statement: [
    "In one step you may insert any character anywhere in s. Return the fewest steps that make s a palindrome.",
    "Up to 500 characters.",
  ],
  concepts: [
    "Reframing: characters left unpaired each need one insertion, so minimise them by maximising the palindromic subsequence kept.",
    "Longest palindromic subsequence = LCS(s, reverse(s)).",
    "Equivalent interval DP: dp[l][r] = dp[l + 1][r − 1] if s[l] == s[r], else 1 + min(dp[l + 1][r], dp[l][r − 1]).",
  ],
  traps: [
    "Counting mismatched pairs from the ends greedily: the choice of which side to pad matters.",
    "Confusing subsequence (gaps allowed) with substring.",
  ],
  followUps: [
    "Return one shortest palindrome you can build.",
    "Deletions instead of insertions: the same number.",
    "516 Longest Palindromic Subsequence directly.",
  ],
  explanation: [
    "Whatever palindrome you end with, the original characters that pair with other original characters form a palindromic subsequence of s; each remaining character needs one inserted mirror. So the answer is n − LPS(s).",
    "A subsequence is a palindrome exactly when it reads the same forwards and backwards, so the longest one is the longest common subsequence of s and its reverse. Run the LCS table (1143).",
    { tip: "Signal: fewest insertions or deletions to reach a palindrome. n minus the longest palindromic subsequence." },
  ],
  analysis: { time: "O(n²)", space: "O(n)" },
  solution: `class Solution {
public:
    int minInsertions(string s) {
        int n = s.size();
        string r(s.rbegin(), s.rend());

        // LCS of s and its reverse = the longest palindromic subsequence.
        // dp[j]: LCS of s[0..i) and r[0..j), one rolling row.
        vector<int> dp(n + 1, 0);
        for (int i = 1; i <= n; ++i) {
            int diag = 0;
            for (int j = 1; j <= n; ++j) {
                int up = dp[j];
                dp[j] = s[i - 1] == r[j - 1] ? diag + 1 : max(up, dp[j - 1]);
                diag = up;
            }
        }
        // Every character outside that subsequence needs one inserted partner.
        return n - dp[n];
    }
};
`,
});
