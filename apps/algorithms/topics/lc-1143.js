import { study } from "./leet-light.js";

export const lc1143 = study({
  number: 1143,
  title: "Longest Common Subsequence",
  slug: "longest-common-subsequence",
  difficulty: "M",
  pattern: "F3",
  topic: "F3 · DP over two strings",
  themes: ["Prefix DP", "LCS", "Exchange argument"],
  blurb: "dp[i][j] is the LCS of the first i characters of text1 and the first j of text2. Equal last characters extend the diagonal by one; otherwise one of the two last characters is useless, so drop it.",
  statement: [
    "A subsequence keeps some characters of a string in their original order, possibly with gaps. Return the length of the longest string that is a subsequence of both text1 and text2 (0 if there is none).",
    "Both strings have up to 1000 lowercase letters. Example: \"abcde\" and \"ace\" share \"ace\", length 3.",
  ],
  concepts: [
    "Decide on the last characters: they either pair with each other, or at least one of them is not in the common subsequence.",
    "Exchange argument: when the last characters are equal, some optimal LCS uses both of them, so taking the match is safe.",
    "Prefix DP table over two strings, filled row by row.",
    "Reconstruction: walk back from the corner, following the diagonal on matches and the larger neighbour otherwise.",
    "LCS is a building block: deletions to make two strings equal (583), shortest common supersequence (1092), palindromic subsequences (516), and diff tools.",
  ],
  hints: [
    "Compare only the last character of each string. If they are equal, should the LCS use them?",
    "Yes: any common subsequence that does not end with this pair can be changed to end with it without getting shorter.",
    "If they differ, they cannot both be the last character of the common subsequence. What does that leave?",
    "Either text1's last character is unused or text2's is. Try both.",
    "Define f(i, j) for prefixes of lengths i and j, and fill a table. What is f(i, 0)?",
  ],
  brute: [
    "Enumerate the 2ᵐ subsequences of text1 and check each against text2 in O(n): O(2ᵐ · n). Even m = 40 is about a trillion subsequences.",
    "The plain recursion is better but still exponential: on a mismatch, f(i, j) calls both f(i − 1, j) and f(i, j − 1), and both of those call f(i − 1, j − 1). The same cell is reached along exponentially many paths. Only (m + 1)(n + 1) distinct cells exist, so remembering each one gives O(m · n).",
  ],
  invariant: "dp[i][j] is the length of the longest common subsequence of text1[0..i) and text2[0..j), and every cell above or to the left of the current one is final.",
  traps: [
    "Confusing subsequence with substring. For the longest common substring, a mismatch resets the cell to 0 and the answer is the largest cell anywhere; here a mismatch keeps the best of the neighbours, and the answer is the corner.",
    "Adding 1 on a match but also taking a max with the neighbours: harmless here, since the diagonal + 1 is never smaller, but it hides the reasoning.",
    "Indexing characters with i and j instead of i − 1 and j − 1.",
    "Rolling to one row and losing the diagonal: save dp[j] before overwriting it.",
  ],
  followUps: [
    "Print one LCS. Keep the table; from (m, n), on a match step diagonally and emit the character, otherwise step towards the larger of above and left. Reverse at the end.",
    "Strings of 10⁵ characters where one has all-distinct characters (1713). Map each character of the distinct string to its index; the other string becomes a sequence of indices, and the LCS is the longest increasing subsequence of that sequence, O(n log n).",
    "LCS of three strings: a 3D table over three prefixes, O(m · n · p).",
    "Only memory is tight but you need the subsequence: Hirschberg's divide and conquer, O(m · n) time and O(n) space.",
    "Count how many distinct LCS strings exist: a second table of counts, careful not to double count when above and left are equal.",
  ],
  explanation: [
    { h: "What the table means" },
    "Make a table with m + 1 rows (prefixes of text1, from the empty one to the whole string) and n + 1 columns (prefixes of text2). The cell dp[i][j] answers: how long is the longest common subsequence of the first i characters of text1 and the first j characters of text2?",
    "The answer is the bottom-right cell, dp[m][n].",
    { h: "Base cases" },
    "Row 0 and column 0 are all 0: an empty string has no non-empty subsequence in common with anything.",
    { h: "Filling one cell" },
    "Let a = text1[i − 1] and b = text2[j − 1], the last characters of the two prefixes.",
    {
      list: [
        "a == b: pair them. Take any common subsequence of the shorter prefixes and append this character, so dp[i][j] = dp[i − 1][j − 1] + 1. Using the pair is safe: if an optimal answer did not end with it, swapping its last character for this pair keeps it valid and just as long.",
        "a ≠ b: they cannot both be the final character of a common subsequence, so at least one is unused. Drop a: dp[i − 1][j]. Or drop b: dp[i][j − 1]. Take the larger.",
      ],
    },
    { code: "dp[i][j] = dp[i-1][j-1] + 1                 if text1[i-1] == text2[j-1]\n         = max(dp[i-1][j], dp[i][j-1])       otherwise" },
    { h: "A worked example: \"abcde\" and \"ace\"" },
    {
      table: {
        head: ["", "\"\"", "a", "c", "e"],
        rows: [
          ["\"\"", 0, 0, 0, 0],
          ["a", 0, 1, 1, 1],
          ["b", 0, 1, 1, 1],
          ["c", 0, 1, 2, 2],
          ["d", 0, 1, 2, 2],
          ["e", 0, 1, 2, "**3**"],
        ],
        caption: "dp[i][j] for text1 = abcde (rows) and text2 = ace (columns).",
      },
    },
    "Row c, column c: the characters match, so the value is the diagonal (row b, column a) plus one: 1 + 1 = 2, meaning \"abc\" and \"ac\" share a subsequence of length 2.",
    "Row d, column e: d ≠ e, so take the larger of above (row c, 2) and left (row d, column c, 2): still 2.",
    "Walking back from the corner: (e, e) matches, emit e and go diagonally; (d, c) differs, move to a neighbour with the same value, (c, c); that matches, emit c; (b, a) differs, move up to (a, a); match, emit a. Reversed: \"ace\".",
    { h: "Fill order and memory" },
    "Each cell reads above, left and the diagonal, so fill row by row, left to right. Only the previous row is ever read, so one array plus a saved diagonal value is enough when you only need the length.",
    { tip: "Signal: two sequences, \"common\", order preserved, gaps allowed. The LCS table, often as a step inside another problem." },
  ],
  analysis: {
    time: "O(m · n)",
    space: "O(m · n) with the full table (needed to print the subsequence); O(min(m, n)) for the length",
    notes: ["With m = n = 1000, about a million cells."],
  },
  solution: `class Solution {
public:
    int longestCommonSubsequence(string text1, string text2) {
        int m = text1.size(), n = text2.size();

        // dp[i][j] = length of the LCS of text1[0..i) and text2[0..j).
        // Row 0 and column 0 (an empty prefix) stay 0.
        vector<vector<int>> dp(m + 1, vector<int>(n + 1, 0));

        for (int i = 1; i <= m; ++i) {
            for (int j = 1; j <= n; ++j) {
                if (text1[i - 1] == text2[j - 1]) {
                    // The last characters match: pair them and extend the
                    // best answer for both shorter prefixes.
                    dp[i][j] = dp[i - 1][j - 1] + 1;
                } else {
                    // They cannot both end the subsequence: drop one of them.
                    dp[i][j] = max(dp[i - 1][j],   // text1's last character unused
                                   dp[i][j - 1]);  // text2's last character unused
                }
            }
        }
        return dp[m][n];
    }
};
`,
});
