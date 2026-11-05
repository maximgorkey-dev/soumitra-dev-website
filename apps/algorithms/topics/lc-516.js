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
  blurb: "dp[l][r] is the longest palindromic subsequence inside s[l..r]. If the two ends are equal they wrap the best answer inside; otherwise one end is unused, so drop it.",
  statement: [
    "Return the length of the longest subsequence of s (characters kept in order, gaps allowed) that reads the same forwards and backwards.",
    "s has up to 1000 lowercase letters. Example: \"bbbab\" gives 4 (\"bbbb\").",
  ],
  concepts: [
    "Interval DP: the state is a substring s[l..r], and each state depends only on strictly shorter substrings inside it.",
    "Decide on the two ends: a palindrome's first and last characters are equal, so either s[l] and s[r] are that outer pair, or one of them is not used.",
    "Fill order: by increasing length, or by l from right to left with r increasing, so the inner and shorter intervals are ready.",
    "The same number as LCS(s, reverse(s)), but the interval view generalises to problems the LCS trick does not cover (730, 1312).",
  ],
  hints: [
    "A palindrome is decided by its outermost pair. Look at the two ends of s.",
    "If s[0] == s[n − 1], is it safe to use both as the outer pair?",
    "Yes: any palindrome inside s[1..n − 2] can be wrapped by them. If they differ, which end can you discard?",
    "At least one of them is not in the palindrome, so try dropping each. Define f(l, r) over substrings.",
  ],
  brute: [
    "Check every subsequence: 2ⁿ of them, each tested in O(n). n = 30 is already 3 · 10¹⁰ steps.",
    "The recursion on the ends, without memo, branches twice on every mismatch: f(l + 1, r) and f(l, r − 1) both reach f(l + 1, r − 1), and so on, so it is exponential. There are only n(n + 1) / 2 substrings, so a memo or a table makes it O(n²).",
  ],
  invariant: "dp[l][r] is the length of the longest palindromic subsequence of s[l..r], and every interval strictly inside [l, r] is already final.",
  traps: [
    "Filling with l increasing: dp[l][r] needs dp[l + 1][…], which would not be computed yet.",
    "The case r = l + 1 with equal characters: the inside is empty, worth 0, so the answer is 2. Guard against reading dp[l + 1][r − 1] with l + 1 > r − 1 if the table does not hold zeros there.",
    "Confusing this with the longest palindromic substring (5), where the characters must be contiguous and a mismatch scores 0.",
  ],
  followUps: [
    "Print one longest palindromic subsequence: walk the table from (0, n − 1), taking both ends on a match and moving towards the larger neighbour otherwise; build the two halves and mirror.",
    "Fewest insertions (or deletions) to make s a palindrome: n − dp[0][n − 1] (1312).",
    "Count distinct palindromic subsequences (730): the same intervals, counting instead of maximising, with care for repeated letters.",
    "O(n) memory: keep two rows, for l and l + 1.",
  ],
  explanation: [
    { h: "What the table means" },
    "The table has a row for each start l and a column for each end r, and only cells with l ≤ r are used. The cell dp[l][r] answers: how long is the longest palindromic subsequence of the substring s[l..r]?",
    "The answer is dp[0][n − 1], the whole string.",
    { h: "Base cases" },
    "dp[l][l] = 1: one character is a palindrome. An empty interval (l > r) counts as 0.",
    { h: "Filling one cell" },
    {
      list: [
        "s[l] == s[r]: use them as the outer pair around the best palindrome strictly inside: dp[l][r] = dp[l + 1][r − 1] + 2. This is safe: given any palindrome in s[l..r] that does not use both ends, replace its outer pair with s[l] and s[r] and it stays valid and no shorter.",
        "s[l] ≠ s[r]: they cannot both be the outer pair, so at least one is unused. dp[l][r] = max(dp[l + 1][r], dp[l][r − 1]).",
      ],
    },
    { code: "dp[l][r] = dp[l+1][r-1] + 2                 if s[l] == s[r]\n         = max(dp[l+1][r], dp[l][r-1])       otherwise" },
    { h: "A worked example: \"bbbab\"" },
    {
      table: {
        head: ["l \\ r", "0 b", "1 b", "2 b", "3 a", "4 b"],
        rows: [
          ["0 b", 1, 2, 3, 3, "**4**"],
          ["1 b", "", 1, 2, 2, 3],
          ["2 b", "", "", 1, 1, 3],
          ["3 a", "", "", "", 1, 1],
          ["4 b", "", "", "", "", 1],
        ],
        caption: "dp[l][r] for s = bbbab. Only the upper triangle is used; the answer is the top-right cell.",
      },
    },
    "dp[2][4] (\"bab\"): the ends match, so 2 + dp[3][3] = 3.",
    "dp[1][3] (\"bba\"): b ≠ a, so max(dp[2][3] = 1, dp[1][2] = 2) = 2.",
    "dp[0][4] (the whole string): b == b, so 2 + dp[1][3] = 4, the palindrome \"bbbb\".",
    { h: "Fill order" },
    "Each cell reads the cell below it (l + 1), the cell to its left (r − 1), and the one diagonally down-left. Going l from n − 1 down to 0 and r from l + 1 up to n − 1 guarantees all three are ready. Equivalently, fill diagonal by diagonal, by interval length.",
    { tip: "Signal: an answer about a substring that depends on what happens at its two ends. Interval DP over [l, r], from short intervals to long." },
  ],
  analysis: {
    time: "O(n²)",
    space: "O(n²) as written; O(n) with two rows",
    notes: ["n = 1000 gives about 5 · 10⁵ cells."],
  },
  solution: `class Solution {
public:
    int longestPalindromeSubseq(string s) {
        int n = s.size();

        // dp[l][r] = longest palindromic subsequence of s[l..r] (l <= r).
        // Cells with l > r are empty intervals and stay 0.
        vector<vector<int>> dp(n, vector<int>(n, 0));

        // l goes right to left so that dp[l+1][...] is ready before dp[l][...].
        for (int l = n - 1; l >= 0; --l) {
            dp[l][l] = 1;  // a single character
            for (int r = l + 1; r < n; ++r) {
                if (s[l] == s[r]) {
                    // The ends are the outer pair; add the best strictly inside.
                    // For r == l + 1 the inside is empty: dp[l+1][l] is 0.
                    dp[l][r] = dp[l + 1][r - 1] + 2;
                } else {
                    // One end is unused: drop s[l] or drop s[r].
                    dp[l][r] = max(dp[l + 1][r], dp[l][r - 1]);
                }
            }
        }
        return dp[0][n - 1];
    }
};
`,
});
