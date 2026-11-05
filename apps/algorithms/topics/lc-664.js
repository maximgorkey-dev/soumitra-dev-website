import { study } from "./leet-light.js";

export const lc664 = study({
  number: 664,
  title: "Strange Printer",
  slug: "strange-printer",
  difficulty: "H",
  pattern: "F4",
  topic: "F4 · Interval DP",
  see: 312,
  themes: ["Interval DP", "Merge equal ends"],
  blurb: "dp[l][r] is the fewest turns for s[l..r]. Print s[l] alone (1 + dp[l + 1][r]), or let the same print also cover a later s[k] == s[l], splitting into dp[l][k − 1] + dp[k + 1][r].",
  statement: [
    "A printer prints one run of a single character per turn, anywhere, overwriting what is there. Return the fewest turns to print s.",
    "Up to 100 characters.",
  ],
  concepts: [
    "Interval DP where the first character's print can be extended to cover a matching character later in the range.",
    "Dropping consecutive duplicates first shrinks the input without changing the answer.",
    "\"The first print can stretch\" is the key exchange argument: some optimal plan prints s[l] first, as the bottom layer.",
  ],
  traps: [
    "Counting runs of distinct characters: \"aba\" needs 2, not 3.",
    "Merging with s[k] == s[l] but adding the turn twice.",
  ],
  followUps: [
    "Strange Printer II (1591): a 2D grid, which becomes cycle detection.",
    "Remove Boxes (546): interval DP with an extra count parameter.",
  ],
  explanation: [
    "dp[l][r] is the fewest turns to print s[l..r]. One character takes one turn.",
    "Some optimal plan prints s[l] first, as a bottom layer. Either that print covers only s[l]: 1 + dp[l + 1][r]. Or it stretches to also cover a later position k with s[k] == s[l], in which case s[k] costs nothing extra: dp[l][k − 1] + dp[k + 1][r], where dp[l][k − 1] already pays for the print of s[l].",
    "Take the minimum over all such k, filling by increasing length.",
    { tip: "Signal: operations that paint a range, later ones overwriting. Interval DP where the first element's operation is extended to a matching element." },
  ],
  analysis: { time: "O(n³)", space: "O(n²)" },
  solution: `class Solution {
public:
    int strangePrinter(string s) {
        // Consecutive duplicates never need an extra turn: "aab" prints like "ab".
        string t;
        for (char c : s) if (t.empty() || t.back() != c) t += c;
        int n = t.size();

        // dp[l][r]: fewest turns to print t[l..r]; an empty range (l > r) costs 0.
        vector<vector<int>> dp(n + 1, vector<int>(n + 1, 0));
        for (int l = n - 1; l >= 0; --l) {
            dp[l][l] = 1;
            for (int r = l + 1; r < n; ++r) {
                // Print t[l] by itself, then the rest.
                dp[l][r] = 1 + dp[l + 1][r];
                // Or stretch the print of t[l] to cover a later t[k] == t[l]:
                // t[k] is then free, and the two sides are solved separately.
                for (int k = l + 1; k <= r; ++k)
                    if (t[k] == t[l])
                        dp[l][r] = min(dp[l][r], dp[l][k - 1] + (k + 1 <= r ? dp[k + 1][r] : 0));
            }
        }
        return dp[0][n - 1];
    }
};
`,
});
