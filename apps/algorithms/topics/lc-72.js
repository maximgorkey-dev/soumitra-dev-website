import { study } from "./leet-light.js";

export const lc72 = study({
  number: 72,
  title: "Edit Distance",
  slug: "edit-distance",
  difficulty: "H",
  pattern: "F3",
  topic: "F3 · DP over two strings",
  themes: ["Prefix DP", "Insert, delete, replace"],
  blurb: "dp[i][j] is the cost to turn the first i characters of word1 into the first j of word2. Matching last characters are free; otherwise take 1 + the cheapest of insert, delete and replace.",
  statement: [
    "Return the fewest single-character operations (insert, delete or replace) that turn word1 into word2.",
    "Both strings up to 500 characters.",
  ],
  concepts: [
    "Prefix DP over two strings: dp[i][j] describes word1[0..i) and word2[0..j).",
    "The last characters decide the transition: equal means free; otherwise each operation maps to one neighbour cell.",
    "Base cases are the empty prefixes: turning i characters into nothing costs i deletions.",
    "Rolling rows: each row only reads the row above and the cell to its left, so O(min(m, n)) memory works.",
  ],
  traps: [
    "Forgetting that a match still allows the other three options; it is simply never worse to take the match.",
    "Mixing up which neighbour is insert and which is delete; both cost 1, so the answer is the same, but the explanation should be right.",
    "Rolling a single row without saving the diagonal value before overwriting it.",
  ],
  followUps: [
    "Return the operations, by walking back through the table.",
    "Different costs per operation: the same DP with weights.",
    "Only insertions and deletions: m + n − 2 · LCS (1143, 583).",
  ],
  explanation: [
    "Let dp[i][j] be the edit distance between the first i characters of word1 and the first j of word2. dp[i][0] = i (delete everything) and dp[0][j] = j (insert everything).",
    "If word1[i − 1] == word2[j − 1], the last characters already match: dp[i][j] = dp[i − 1][j − 1]. Otherwise one operation fixes the last position: replace (dp[i − 1][j − 1] + 1), delete from word1 (dp[i − 1][j] + 1), or insert into word1 (dp[i][j − 1] + 1).",
    "Fill row by row; the answer is dp[m][n].",
    { tip: "Signal: two sequences and a cost of transforming or aligning them. dp over prefix pairs, deciding on the last characters." },
  ],
  analysis: { time: "O(m · n)", space: "O(n) with one rolling row" },
  solution: `class Solution {
public:
    int minDistance(string word1, string word2) {
        int m = word1.size(), n = word2.size();
        // dp[j] holds row i of the table: the distance between word1[0..i) and word2[0..j).
        // Row 0: turning "" into j characters takes j insertions.
        vector<int> dp(n + 1);
        iota(dp.begin(), dp.end(), 0);

        for (int i = 1; i <= m; ++i) {
            int diag = dp[0];  // dp[i-1][0], the top-left neighbour of dp[i][1]
            dp[0] = i;         // turning i characters into "" takes i deletions
            for (int j = 1; j <= n; ++j) {
                int up = dp[j];  // dp[i-1][j], saved before it is overwritten
                if (word1[i - 1] == word2[j - 1]) {
                    dp[j] = diag;  // last characters match: no operation needed
                } else {
                    dp[j] = 1 + min({diag,        // replace word1[i-1] by word2[j-1]
                                     up,          // delete word1[i-1]
                                     dp[j - 1]}); // insert word2[j-1]
                }
                diag = up;  // becomes the top-left neighbour of the next cell
            }
        }
        return dp[n];
    }
};
`,
});
