import { study } from "./leet-light.js";

export const lc44 = study({
  number: 44,
  title: "Wildcard Matching",
  slug: "wildcard-matching",
  difficulty: "H",
  pattern: "F3",
  topic: "F3 · DP over two strings",
  themes: ["Prefix DP", "Pattern matching", "Greedy backtracking"],
  blurb: "dp[i][j] asks whether the first i characters of s match the first j of p. '?' consumes one character. A '*' either matches nothing (move left in p) or swallows one more character of s and stays (move up in s).",
  statement: [
    "Match the whole of s against p, where '?' matches any single character and '*' matches any sequence of characters, including the empty one. Return whether they match.",
    "s and p have up to 2000 characters. Example: s = \"adceb\", p = `*a*b` matches (the first star is empty, the second matches \"dce\").",
  ],
  concepts: [
    "Prefix DP over text and pattern, as in 10, but '*' stands on its own instead of modifying the previous character.",
    "A star has two moves: match the empty string, or swallow one character and stay available.",
    "Rolling one row: the left neighbour is already in the new row and the upper neighbour is the old value in place.",
    "A greedy alternative: remember the last star and, on a mismatch, let it swallow one more character. O(1) memory.",
  ],
  hints: [
    "Without stars, how would you match? Character by character, '?' matching anything.",
    "Now think about a pattern ending in '*'. It matches some suffix of s, possibly empty. How can you express \"some suffix\" one character at a time?",
    "Either the star matches nothing, or it matches s's last character and possibly more before it.",
    "That gives dp[i][j] = dp[i][j − 1] or dp[i − 1][j] for a star. What does an empty s match?",
  ],
  brute: [
    "Backtracking: at each '*', try letting it match 0, 1, 2, … characters. With several stars and a pattern that almost matches, the recursion tries every way to split s among the stars: exponential (roughly |s|^(number of stars)).",
    "As in 10, it only ever asks whether a suffix of s matches a suffix of p. Caching the (|s| + 1)(|p| + 1) answers gives O(|s| · |p|), which is 4 · 10⁶ cells at the limits.",
  ],
  invariant: "dp[i][j] is true exactly when s[0..i) matches p[0..j) in full.",
  traps: [
    "Applying 10's rules: here '*' does not repeat the previous character, so there is no p[j − 2].",
    "Row 0: an empty s matches a pattern prefix only if it is all stars. dp[0][j] = dp[0][j − 1] && p[j − 1] == '*'.",
    "In the greedy version, forgetting to move the saved text position forward each time the star swallows another character, which loops forever.",
    "Leaving trailing stars unchecked in the greedy version: after s is consumed, the rest of p must be all stars.",
  ],
  followUps: [
    "O(1) extra memory: the greedy with a star backtrack point. Walk both strings; on '?' or equal characters advance both; on '*' remember its position and the current s position and advance p; on a mismatch, if a star was seen, let it swallow one more character (s position = saved + 1) and retry from just after the star. Worst case O(|s| · |p|), usually linear.",
    "Collapse runs of stars first: `a**b` is the same as `a*b`, which shrinks the table.",
    "Glob matching with character classes like [a-z]: replace the equality test.",
    "Match against millions of file names: compile the pattern into an automaton once.",
  ],
  explanation: [
    { h: "What the table means" },
    "Rows are prefixes of s and columns prefixes of p. The cell dp[i][j] answers: does s[0..i) match p[0..j) completely? The answer is dp[|s|][|p|].",
    { h: "Base cases" },
    "dp[0][0] is true. In row 0, dp[0][j] is true only while every pattern character so far is '*', because only stars can match nothing. In column 0, every cell with i > 0 is false: an empty pattern matches only the empty string.",
    { h: "Filling one cell" },
    {
      list: [
        "p[j − 1] is '?' or the same letter as s[i − 1]: both consume one character, so dp[i][j] = dp[i − 1][j − 1].",
        "p[j − 1] is '*': either it matches the empty string, so s[0..i) must match the pattern without it, dp[i][j − 1]; or it swallows s[i − 1] and may swallow more before it, so s[0..i − 1) must match the same pattern with the star still there, dp[i − 1][j].",
        "Otherwise the last characters disagree: false.",
      ],
    },
    { code: "if p[j-1] == '*':  dp[i][j] = dp[i][j-1] || dp[i-1][j]\nelse:              dp[i][j] = dp[i-1][j-1] && (p[j-1] == '?' || p[j-1] == s[i-1])" },
    { h: "A worked example: s = \"adceb\", p = `*a*b`" },
    {
      table: {
        head: ["", "\"\"", "*", "a", "*", "b"],
        rows: [
          ["\"\"", "T", "T", "F", "F", "F"],
          ["a", "F", "T", "T", "T", "F"],
          ["d", "F", "T", "F", "T", "F"],
          ["c", "F", "T", "F", "T", "F"],
          ["e", "F", "T", "F", "T", "F"],
          ["b", "F", "T", "F", "T", "**T**"],
        ],
        caption: "Rows are the characters of s added one at a time; columns are prefixes of p. T means a full match.",
      },
    },
    "The first '*' column is all T: a leading star matches any prefix of s.",
    "Row a, column a is T: 'a' matches 'a' and the diagonal (\"\" against the first star) is T. Rows d, c and e in that column are F, since none of them is an 'a'.",
    "Column of the second '*': from row a downwards it stays T because each row inherits T from the row above (the star swallows d, then c, then e).",
    "The corner: 'b' matches 'b', and the diagonal, \"adce\" against `*a*`, is T.",
    { h: "Fill order and memory" },
    "Row by row, left to right. A cell reads left (same row), up and the diagonal, so one row plus a saved diagonal value is enough.",
    { tip: "Signal: '*' that matches any run. Prefix DP with \"empty, or swallow one and stay\", or the greedy star-backtrack when memory matters." },
  ],
  analysis: {
    time: "O(|s| · |p|)",
    space: "O(|s| · |p|) as written; O(|p|) with one row; O(1) for the greedy",
    notes: [],
  },
  solution: `class Solution {
public:
    bool isMatch(string s, string p) {
        int m = s.size(), n = p.size();

        // dp[i][j]: does s[0..i) match p[0..j) completely?
        vector<vector<bool>> dp(m + 1, vector<bool>(n + 1, false));
        dp[0][0] = true;
        // An empty s matches a pattern prefix only if it is all stars.
        for (int j = 1; j <= n; ++j) dp[0][j] = dp[0][j - 1] && p[j - 1] == '*';
        // Column 0 (empty pattern, non-empty s) stays false.

        for (int i = 1; i <= m; ++i) {
            for (int j = 1; j <= n; ++j) {
                if (p[j - 1] == '*') {
                    dp[i][j] = dp[i][j - 1]    // the star matches the empty string
                            || dp[i - 1][j];   // the star swallows s[i-1] and stays available
                } else {
                    // '?' or a letter: one character each, and they must agree.
                    bool ok = p[j - 1] == '?' || p[j - 1] == s[i - 1];
                    dp[i][j] = ok && dp[i - 1][j - 1];
                }
            }
        }
        return dp[m][n];
    }
};

// The O(1)-memory greedy, for the follow-up:
//
//   int i = 0, j = 0, star = -1, mark = 0;
//   while (i < m) {
//       if (j < n && (p[j] == '?' || p[j] == s[i])) { ++i; ++j; }   // consume one each
//       else if (j < n && p[j] == '*') { star = j++; mark = i; }      // star matches empty for now
//       else if (star >= 0) { j = star + 1; i = ++mark; }             // let the star swallow one more
//       else return false;
//   }
//   while (j < n && p[j] == '*') ++j;                                // trailing stars match empty
//   return j == n;
`,
});
