import { study } from "./leet-light.js";

export const lc516 = study({
  number: 516,
  title: "Longest Palindromic Subsequence",
  slug: "longest-palindromic-subsequence",
  difficulty: "M",
  pattern: "F4",
  topic: "F4 · Interval DP",
  see: 312,
  themes: ["Interval DP", "Palindromes"],
  blurb: "dp[l][r] is the answer for s[l..r]. Equal ends wrap the inside: 2 + dp[l + 1][r − 1]; otherwise drop one end.",
  statement: [
    "Return the length of the longest subsequence of s that reads the same forwards and backwards.",
    "Up to 1000 characters.",
  ],
  concepts: [
    "Interval DP: the state is a substring s[l..r], solved from shorter intervals to longer.",
    "Decide on the two ends: either they pair up, or at least one is unused.",
    "Fill order: l from right to left, r from l upward, so dp[l + 1][…] is ready.",
    "Same answer as LCS(s, reverse(s)).",
  ],
  traps: [
    "Filling by increasing l, which reads dp[l + 1][…] before it is computed.",
    "Single characters: dp[i][i] = 1.",
  ],
  followUps: [
    "Count distinct palindromic subsequences (730).",
    "Fewest insertions to make a palindrome: n − LPS (1312).",
  ],
  explanation: [
    "dp[l][r] is the longest palindromic subsequence inside s[l..r]. A single character is a palindrome of length 1.",
    "If s[l] == s[r], they can be the outer pair: dp[l][r] = dp[l + 1][r − 1] + 2. Otherwise one of them is not used: dp[l][r] = max(dp[l + 1][r], dp[l][r − 1]).",
    "Process l from n − 1 down to 0 and r from l + 1 up, keeping one row for l + 1 and one for l.",
    { tip: "Signal: an answer about a substring that depends on its two ends. Interval DP over [l, r]." },
  ],
  analysis: { time: "O(n²)", space: "O(n)" },
  solution: `class Solution {
public:
    int longestPalindromeSubseq(string s) {
        int n = s.size();
        // next[r] = dp[l+1][r], cur[r] = dp[l][r].
        vector<int> next(n, 0), cur(n, 0);

        for (int l = n - 1; l >= 0; --l) {
            cur[l] = 1;  // a single character
            for (int r = l + 1; r < n; ++r) {
                if (s[l] == s[r])
                    // Both ends pair up around the best inside s[l+1..r-1] (empty when r == l+1).
                    cur[r] = (r - 1 >= l + 1 ? next[r - 1] : 0) + 2;
                else
                    // At least one end is unused: drop s[l] or drop s[r].
                    cur[r] = max(next[r], cur[r - 1]);
            }
            swap(next, cur);
        }
        return next[n - 1];  // after the last swap, next holds row l = 0
    }
};
`,
});
