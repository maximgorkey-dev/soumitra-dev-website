import { study } from "./leet-light.js";

export const lc664 = study({
  number: 664,
  title: "Strange Printer",
  slug: "strange-printer",
  difficulty: "H",
  pattern: "F4",
  topic: "F4 · Interval DP",
  see: 312,
  themes: ["Interval DP", "Merge equal ends", "Layering argument"],
  blurb: "dp[l][r] is the fewest turns to print s[l..r]. The print that covers s[l] can be the bottom layer and can stretch to any later position k with the same letter, making s[k] free and splitting the work into s[l..k − 1] and s[k + 1..r].",
  statement: [
    "A printer, on each turn, prints a run of one repeated character over any contiguous range, overwriting whatever is there. Starting from a blank line, return the fewest turns needed to produce s.",
    "s has up to 100 lowercase letters. Examples: \"aaabbb\" needs 2; \"aba\" needs 2 (print \"aaa\", then \"b\" in the middle).",
  ],
  concepts: [
    "Interval DP over s[l..r].",
    "A layering argument: some optimal plan prints s[l]'s character first, as the bottom layer, because whatever covers position l at the end must be that character, and printing it first never blocks anything.",
    "Merging equal characters: that bottom print can stretch over a later s[k] with the same letter, so s[k] costs nothing extra.",
    "Preprocessing: consecutive equal letters never need separate turns, so compress runs first (\"aaabbb\" → \"ab\").",
  ],
  hints: [
    "Count turns for \"aba\". Why is it 2, not 3?",
    "The first 'a' print can cover the whole string; the 'b' goes on top. One print served two positions.",
    "In s[l..r], the print that produces s[l] can be the first one, and it can stretch. Where is it worth stretching to?",
    "To a later k with s[k] == s[l]. Then s[k] is free, and the parts between and after are separate subproblems. Otherwise s[l] is printed alone.",
  ],
  brute: [
    "Search over sequences of prints: each turn chooses a character and a range, about 26 · n² options, so k turns give (26 · n²)^k sequences. Even with pruning this is far too slow for n = 100.",
    "Plain recursion on intervals without a memo recomputes the same s[a..b] from many different splits. There are O(n²) intervals and each tries O(n) split points, so tabulation gives O(n³) = 10⁶ for n = 100.",
  ],
  invariant: "dp[l][r] is the fewest turns that print exactly s[l..r] on a blank segment, and every shorter interval is already final.",
  traps: [
    "Counting runs of different letters: \"aba\" would give 3, but the answer is 2.",
    "Adding a turn for s[k] when the print of s[l] already covers it.",
    "Not compressing runs: the DP is still correct, just slower.",
    "Deciding greedily whether to stretch a print as far as possible: whether stretching helps depends on what lies between, so every matching k has to be tried.",
  ],
  followUps: [
    "Strange Printer II (1591): a 2D grid where each colour must be one rectangle; it becomes cycle detection in a \"must be printed before\" graph.",
    "Remove Boxes (546): interval DP with a third parameter, the number of equal boxes attached to the left end.",
    "Zuma Game (488): also intervals with merging of equal colours, with search on top.",
  ],
  explanation: [
    { h: "What the table means" },
    "dp[l][r] answers: how many turns does it take to print exactly s[l..r] on a blank stretch of paper? The answer is dp[0][n − 1]. Compress runs of equal letters first; it does not change the answer.",
    { h: "Base cases" },
    "A single character takes one turn: dp[l][l] = 1. An empty interval takes 0.",
    { h: "Filling one cell" },
    "Consider the print that puts down s[l]'s letter at position l. It is safe to assume it is the first print, the bottom layer: the final character there must be s[l], and any print made before it in that range would be covered anyway. Two cases:",
    {
      list: [
        "It covers only s[l] (or only positions that later get overwritten): 1 + dp[l + 1][r].",
        "It also produces some later s[k] with s[k] == s[l]. Then position k needs no extra turn. Everything strictly between l and k is printed on top, inside s[l..k − 1], and everything after k is independent: dp[l][k − 1] + dp[k + 1][r]. The term dp[l][k − 1] already pays for the print of s[l]; the stretch to k is free.",
      ],
    },
    { code: "dp[l][r] = min( 1 + dp[l+1][r],\n                 min over l < k <= r with s[k] == s[l] of  dp[l][k-1] + dp[k+1][r] )" },
    { h: "A worked example: \"abab\"" },
    {
      table: {
        head: ["l \\ r", "0 a", "1 b", "2 a", "3 b"],
        rows: [
          ["0 a", 1, 2, 2, "**3**"],
          ["1 b", "", 1, 2, 2],
          ["2 a", "", "", 1, 2],
          ["3 b", "", "", "", 1],
        ],
        caption: "dp[l][r] for s = abab. The answer is the top-right cell.",
      },
    },
    "dp[0][2] (\"aba\"): printing the first 'a' alone costs 1 + dp[1][2] = 3, but stretching it to the 'a' at k = 2 costs dp[0][1] + 0 = 2: print \"aaa\", then \"b\".",
    "dp[0][3] (\"abab\"): alone, 1 + dp[1][3] = 3; stretch to k = 2: dp[0][1] + dp[3][3] = 2 + 1 = 3. So 3, for example \"aaaa\", then \"b\" at position 1, then \"b\" at position 3.",
    { h: "Fill order" },
    "Every term reads a strictly shorter interval, so fill l from right to left and r from l upward (or by length).",
    { tip: "Signal: operations that paint a range, later ones overwriting earlier ones. Interval DP where the first element's operation is the bottom layer and can extend to an equal element." },
  ],
  analysis: {
    time: "O(n³)",
    space: "O(n²)",
    notes: ["n = 100 gives about 10⁶ steps; compressing runs often makes n much smaller."],
  },
  solution: `class Solution {
public:
    int strangePrinter(string s) {
        // Runs of the same letter never need separate turns: "aaabbb" prints like "ab".
        string t;
        for (char c : s) if (t.empty() || t.back() != c) t += c;
        int n = t.size();

        // dp[l][r] = fewest turns to print t[l..r]. The extra row and column
        // let dp[k+1][r] with k == r (an empty interval) read 0 safely.
        vector<vector<int>> dp(n + 1, vector<int>(n + 1, 0));

        for (int l = n - 1; l >= 0; --l) {
            dp[l][l] = 1;  // one character, one turn
            for (int r = l + 1; r < n; ++r) {
                // Case 1: the print of t[l] serves only position l.
                dp[l][r] = 1 + dp[l + 1][r];

                // Case 2: the print of t[l] is the bottom layer and stretches to a
                // later t[k] with the same letter, so t[k] costs nothing extra.
                // dp[l][k-1] already includes that print; t[k+1..r] is separate.
                for (int k = l + 1; k <= r; ++k) {
                    if (t[k] == t[l]) {
                        int after = (k + 1 <= r) ? dp[k + 1][r] : 0;
                        dp[l][r] = min(dp[l][r], dp[l][k - 1] + after);
                    }
                }
            }
        }
        return dp[0][n - 1];
    }
};
`,
});
