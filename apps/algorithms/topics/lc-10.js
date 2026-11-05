import { study } from "./leet-light.js";

export const lc10 = study({
  number: 10,
  title: "Regular Expression Matching",
  slug: "regular-expression-matching",
  difficulty: "H",
  pattern: "F3",
  topic: "F3 · DP over two strings",
  themes: ["Prefix DP", "Pattern matching", "Star as zero or more"],
  blurb: "dp[i][j] asks whether the first i characters of s match the first j of p. A letter or '.' must match s's last character. A starred unit either matches nothing (drop it from p) or eats one more character of s and stays available.",
  statement: [
    "Match the whole of s against a pattern p in which '.' matches any single character and `x*` matches zero or more copies of the character x (or of any characters, for `.*`). Return whether they match.",
    "s and p have up to 20 characters; every '*' follows a letter or '.'. Example: s = \"aab\", p = `c*a*b` matches (zero c's, two a's, one b).",
  ],
  concepts: [
    "Prefix DP over the text and the pattern.",
    "Treat `x*` as one unit with two moves: use it zero times, or use it once more and stay on the same unit (so it can be used again).",
    "The empty-text row: an empty s matches only patterns made entirely of starred units, like `a*b*`.",
    "This table is the memo of a backtracking matcher, and also a simulation of the pattern's nondeterministic automaton.",
  ],
  hints: [
    "Without '*', what is the condition for s[0..i) to match p[0..j)?",
    "The last characters must match (equal, or the pattern has '.'), and the shorter prefixes must match.",
    "Now let the pattern end in `x*`. List the two possibilities for how many copies of x it matches.",
    "Zero copies: drop the two pattern characters. At least one: x must match s's last character, and s without that character must still match the same pattern, star included.",
    "What does an empty s match?",
  ],
  brute: [
    "Backtracking: at each `x*`, try matching 0, 1, 2, … copies. Patterns like `a*a*a*a*a*c` against \"aaaaaaaaaaaaaaaaaaaab\" make the recursion try every way to split the a's among the stars, which is exponential in the number of stars.",
    "The work repeats because the recursion only ever asks \"does s[i..] match p[j..]?\", and there are just (|s| + 1)(|p| + 1) such questions. Caching the answers gives O(|s| · |p|).",
  ],
  invariant: "dp[i][j] is true exactly when s[0..i) matches p[0..j) in full.",
  traps: [
    "Treating '*' as a wildcard by itself, as in 44. Here it modifies the character before it, and `x*` must be handled as a unit.",
    "Forgetting the zero-copies case, which makes `c*` unable to match nothing.",
    "Forgetting row 0: dp[0][j] can be true (for `a*`, `a*b*` and so on), and those cells feed the rest of the table.",
    "Letting `x*` eat a character of s that x does not match.",
    "Reading p[j − 2] when j − 1 is 0. The input guarantees a '*' never comes first, which is what makes that index safe.",
  ],
  followUps: [
    "Add '+' (one or more): rewrite `x+` as `xx*` before matching.",
    "Write it top-down: a memoised match(i, j) is often easier to get right in an interview, and it skips unreachable states.",
    "Many strings against one pattern: compile the pattern once to an automaton (Thompson's construction) and simulate a set of states per character, O(|s| · |p|) with no table.",
    "Why do real regex engines blow up? Backtracking engines do not memoise, so nested quantifiers like (a+)+ cause catastrophic backtracking; automaton-based engines (RE2) avoid it.",
  ],
  explanation: [
    { h: "What the table means" },
    "Rows are prefixes of s (i = 0..|s|) and columns prefixes of p (j = 0..|p|). The cell dp[i][j] answers: does the first i characters of s match the first j characters of p, completely?",
    "The answer is dp[|s|][|p|].",
    { h: "Base cases" },
    "dp[0][0] is true: the empty pattern matches the empty string.",
    "Row 0 (an empty s): a plain letter or '.' needs a character, so it is false; a '*' at p[j − 1] lets its unit match nothing, so dp[0][j] = dp[0][j − 2]. That makes `a*`, `a*b*` and similar patterns match the empty string.",
    { h: "Filling one cell" },
    "Look at the last pattern character, p[j − 1].",
    {
      list: [
        "A letter or '.': it must match s[i − 1] (equal, or '.'), and the shorter prefixes must match: dp[i − 1][j − 1].",
        "A '*': the unit is `x*` with x = p[j − 2]. Zero copies: ignore the unit, dp[i][j − 2]. One more copy: x must match s[i − 1], and s[0..i − 1) must match the same pattern including the unit: dp[i − 1][j]. Staying in column j is what lets the star eat several characters, one row at a time.",
      ],
    },
    { code: "if p[j-1] == '*':\n    dp[i][j] = dp[i][j-2]                                  // zero copies\n            || (i > 0 && same(s[i-1], p[j-2]) && dp[i-1][j])  // one more copy\nelse:\n    dp[i][j] = i > 0 && same(s[i-1], p[j-1]) && dp[i-1][j-1]" },
    { h: "A worked example: s = \"aab\", p = `c*a*b`" },
    {
      table: {
        head: ["", "\"\"", "c", "*", "a", "*", "b"],
        rows: [
          ["\"\"", "T", "F", "T", "F", "T", "F"],
          ["a", "F", "F", "F", "T", "T", "F"],
          ["a", "F", "F", "F", "F", "T", "F"],
          ["b", "F", "F", "F", "F", "F", "**T**"],
        ],
        caption: "Rows are prefixes of s (\"\", a, aa, aab); columns are prefixes of p. T means the prefixes match completely.",
      },
    },
    "Row \"\": the column for `c*` is T because that unit matches nothing, and the column for `c*a*` is T for the same reason, via zero copies of a.",
    "Row aa, the second '*' column: zero copies would need row aa to match `c*`, which is F; one more copy needs 'a' to match x = 'a' and the row above, \"a\" against `c*a*`, which is T. So T: the star has eaten two a's, one per row.",
    "The corner: 'b' matches 'b', and the diagonal (\"aa\" against `c*a*`) is T.",
    { h: "Fill order" },
    "Cells read the same row (j − 2), the row above (j), and the diagonal, so filling row by row from row 0 works. Row 0 must be filled too, not just initialised.",
    { tip: "Signal: matching with a repetition operator. Prefix DP where the repeated unit either disappears or consumes one character and stays." },
  ],
  analysis: {
    time: "O(|s| · |p|)",
    space: "O(|s| · |p|); two rows suffice",
    notes: ["At most 21 × 21 cells here; the point is avoiding exponential backtracking."],
  },
  solution: `class Solution {
public:
    bool isMatch(string s, string p) {
        int m = s.size(), n = p.size();

        // dp[i][j]: does s[0..i) match p[0..j) completely?
        vector<vector<bool>> dp(m + 1, vector<bool>(n + 1, false));
        dp[0][0] = true;  // empty pattern, empty string

        // Does one pattern character pc match one text character c?
        auto same = [](char c, char pc) { return pc == '.' || pc == c; };

        // i starts at 0: row 0 (empty s) must be computed, because
        // starred units can match nothing.
        for (int i = 0; i <= m; ++i) {
            for (int j = 1; j <= n; ++j) {
                if (p[j - 1] == '*') {
                    // The unit is "x*" with x = p[j-2] (a '*' never comes first).
                    bool zero = dp[i][j - 2];  // use the unit zero times
                    // Use it once more: x matches s[i-1], and the shorter s still
                    // matches the same pattern, so the unit stays available.
                    bool more = i > 0 && same(s[i - 1], p[j - 2]) && dp[i - 1][j];
                    dp[i][j] = zero || more;
                } else {
                    // A letter or '.': consume one character of each.
                    dp[i][j] = i > 0 && same(s[i - 1], p[j - 1]) && dp[i - 1][j - 1];
                }
            }
        }
        return dp[m][n];
    }
};
`,
});
