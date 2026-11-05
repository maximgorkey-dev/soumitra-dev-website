import { study } from "./leet-light.js";

export const lc72 = study({
  number: 72,
  title: "Edit Distance",
  slug: "edit-distance",
  difficulty: "H",
  pattern: "F3",
  topic: "F3 · DP over two strings",
  themes: ["Prefix DP", "Insert, delete, replace", "Path reconstruction"],
  blurb: "dp[i][j] is the cheapest way to turn the first i characters of word1 into the first j of word2. Look only at the two last characters: if they match they cost nothing, otherwise one of three operations fixes them, and each operation points at a smaller cell.",
  statement: [
    "You may insert a character, delete a character, or replace one character by another, each at a cost of 1. Return the fewest operations that turn word1 into word2.",
    "Both strings have up to 500 lowercase letters. Example: \"horse\" → \"ros\" takes 3 (replace h by r, delete r, delete e).",
  ],
  concepts: [
    "Recursion on the last characters: any edit script can be reordered so that the last character of each string is settled by the final step. That reduces the problem to shorter prefixes.",
    "Overlapping subproblems: the recursion only ever asks about a prefix of word1 against a prefix of word2, so there are just (m + 1)(n + 1) distinct questions.",
    "Prefix DP table: one cell per pair of prefix lengths, filled so every cell's three neighbours are ready before it.",
    "Path reconstruction: walking back from the bottom-right cell, the neighbour that produced each value names the operation used.",
    "Rolling rows: each row reads only the row above, which cuts memory from O(m · n) to O(n).",
  ],
  hints: [
    "Do not think about the whole string. Look only at the last character of each word. What are the possible fates of word1's last character in an optimal edit?",
    "It is either kept and matched with word2's last character (free if equal, a replace if not), deleted, or left in place while a new character is inserted after it to match word2's last character.",
    "Each of those cases leaves a smaller problem on prefixes: which prefix of word1 against which prefix of word2?",
    "Define f(i, j) = the distance between the first i characters of word1 and the first j of word2. Write f(i, j) in terms of f(i − 1, j − 1), f(i − 1, j) and f(i, j − 1).",
    "What are f(i, 0) and f(0, j)? Then fill a table row by row.",
  ],
  brute: [
    "Write the recursion directly: f(i, j) = f(i − 1, j − 1) if the last characters are equal; otherwise 1 + min(f(i − 1, j − 1), f(i − 1, j), f(i, j − 1)). With no memo, every mismatch branches three ways and each branch shrinks i + j by only one or two, so the call tree has up to about 3^(m + n) leaves. Two 500-letter words are hopeless; even two 15-letter words take millions of calls.",
    "Where it breaks is repetition, not the recursion itself. f(i − 1, j − 1) is reached directly (replace), and also by delete-then-insert (f(i − 1, j) → f(i − 1, j − 1)) and by insert-then-delete. Every cell is recomputed exponentially many times, yet only (m + 1)(n + 1) distinct cells exist. Remembering each answer once (memoisation, or the bottom-up table below) brings it to O(m · n).",
  ],
  invariant: [
    "dp[i][j] is the minimum number of operations that turn word1[0..i) into word2[0..j). Every cell above and to the left of the one being filled already holds its final, correct value.",
  ],
  traps: [
    "Mixing up the meaning of the indices. dp[i][j] is about the first i and first j characters, so the characters being compared are word1[i − 1] and word2[j − 1]. Reading word1[i] is an off-by-one that sometimes still passes small tests.",
    "Forgetting the base row and column. dp[0][j] = j (insert all j characters) and dp[i][0] = i (delete all i). Leaving them at 0 makes every answer too small.",
    "Taking the match but also adding 1. When the last characters are equal, dp[i][j] = dp[i − 1][j − 1] with no cost. It is never worse than the other options, so you do not need to compare it against them.",
    "Rolling one row without saving the diagonal. In a single array, dp[j] is overwritten before the next cell needs the old value as its top-left neighbour. Keep it in a variable (diag) before overwriting.",
    "Assuming insert and delete are the same move. They are symmetric in cost, so the number is unaffected, but if you are asked to print the script, \"up\" means delete from word1 and \"left\" means insert into word1.",
  ],
  followUps: [
    "Print the edit script. Keep the full table, start at (m, n), and at each cell step to the neighbour that produced its value: the diagonal with equal characters is a match, the diagonal otherwise is a replace, up is a delete, left is an insert. The path has at most m + n steps.",
    "Different costs per operation (say insert 2, delete 3, replace 4). Same table, with those weights on the three transitions. Replace can be disallowed entirely by giving it cost ∞, in which case the answer is m + n − 2 · LCS (583).",
    "Only O(n) memory but you still need the script. Hirschberg's algorithm: compute the middle row's costs from both ends, choose the column where they sum to the optimum, and recurse on the two halves. It is O(m · n) time and O(n) space.",
    "Is the distance at most k? Only cells with |i − j| ≤ k can be ≤ k, so fill a diagonal band of width 2k + 1: O(k · min(m, n)). This is how spell-checkers and DNA aligners stay fast.",
    "Allow swapping two adjacent characters as one operation (Damerau–Levenshtein). Add a fourth transition: if the last two characters are crossed, dp[i − 2][j − 2] + 1.",
    "Find the dictionary word closest to a query, over millions of words. Use a BK-tree or a trie walked with one DP row per node, pruning when the row's minimum exceeds the best found.",
  ],
  explanation: [
    { h: "What the table means" },
    "Make a table with m + 1 rows and n + 1 columns, where m and n are the lengths of word1 and word2. Row i stands for the first i characters of word1, and column j for the first j characters of word2. Row 0 and column 0 stand for the empty string.",
    "The cell dp[i][j] answers one question: how many operations does it take to turn word1[0..i) into word2[0..j)? The whole answer is the bottom-right cell, dp[m][n], because that compares the full words.",
    { h: "The first row and column" },
    "dp[0][j] = j: turning the empty string into j characters needs exactly j insertions. dp[i][0] = i: turning i characters into the empty string needs exactly i deletions. These are the only cells that do not depend on other cells.",
    { h: "Filling one cell: look at the last characters" },
    "To fill dp[i][j], look at a = word1[i − 1] and b = word2[j − 1], the last characters of the two prefixes. In an optimal edit, one of four things happens to them:",
    {
      list: [
        "a == b: keep both, at no cost. What remains is turning word1[0..i − 1) into word2[0..j − 1), so dp[i][j] = dp[i − 1][j − 1]. That is the cell diagonally up and to the left.",
        "Replace a by b: cost 1, and again the rest is dp[i − 1][j − 1]. Diagonal, plus 1.",
        "Delete a: cost 1, and you still need to turn word1[0..i − 1) into all of word2[0..j). That is dp[i − 1][j], the cell directly above, plus 1.",
        "Insert b after a: cost 1. The inserted b matches word2's last character, and you still need to turn all of word1[0..i) into word2[0..j − 1). That is dp[i][j − 1], the cell to the left, plus 1.",
      ],
    },
    "So when a ≠ b, dp[i][j] = 1 + min(diagonal, above, left). When a == b, take the diagonal for free; it is never worse than the alternatives, because doing an extra operation can only cost more.",
    { code: "dp[i][j] = dp[i-1][j-1]                                   if word1[i-1] == word2[j-1]\n         = 1 + min(dp[i-1][j-1], dp[i-1][j], dp[i][j-1])     otherwise" },
    { h: "Why this is enough" },
    "Any sequence of operations can be rearranged so that the fate of the last characters is decided by its final step, without changing its length. So every optimal edit falls into one of the four cases, and each case is an optimal edit of smaller prefixes followed by that step. Taking the minimum over the cases therefore gives the true optimum. This is optimal substructure.",
    { h: "A worked example: \"horse\" → \"ros\"" },
    "Rows are prefixes of horse, columns prefixes of ros. Read any cell as \"the cost to turn this row's prefix into this column's prefix\". For example, the cell in row o, column o is 1: \"ho\" → \"ro\" needs one replace.",
    {
      table: {
        head: ["", "\"\"", "r", "o", "s"],
        rows: [
          ["\"\"", 0, 1, 2, 3],
          ["h", 1, 1, 2, 3],
          ["o", 2, 2, 1, 2],
          ["r", 3, 2, 2, 2],
          ["s", 4, 3, 3, 2],
          ["e", 5, 4, 4, "**3**"],
        ],
        caption: "dp[i][j] for word1 = horse (rows) and word2 = ros (columns). The answer is the bottom-right cell, 3.",
      },
    },
    "Take row r, column r. The last characters match, so the value copies the diagonal, row o, column \"\": 2. That means \"hor\" → \"r\" costs the same as \"ho\" → \"\", which is two deletions.",
    "Take row e, column s. e ≠ s, so the value is 1 + min(diagonal 3, above 2, left 4) = 3, and the minimum came from above, which is a delete of e.",
    "Walking back from the bottom-right corner gives the edit script: (e, s) up to (s, s): delete e. (s, s) matches, so go diagonally to (r, o). (r, o) came from above, (o, o): delete r. (o, o) matches, so go diagonally to (h, r). (h, r) came from the diagonal (\"\", \"\") = 0: replace h by r. That is three operations, as expected.",
    { h: "Fill order and memory" },
    "Every cell needs the cell above, the cell to the left and the cell diagonally above-left. Filling row by row, left to right, guarantees all three are ready.",
    "Since a row only reads the row above it, one array of n + 1 values is enough. Before overwriting dp[j], save its old value: that old value is the \"above\" for this cell and becomes the \"diagonal\" for the next cell. The solution keeps the full table for clarity, and the comment at the end shows the one-row version.",
    { tip: "Signal: two sequences and a cost to transform or align one into the other. Define dp over pairs of prefixes, decide on the last characters, and make each operation point to a smaller cell." },
  ],
  analysis: {
    time: "O(m · n): one constant-time step per cell",
    space: "O(m · n) for the full table, which is needed to print the edit script; O(min(m, n)) for the distance alone",
    notes: [
      "With m = n = 500 that is 251,001 cells, which is instant.",
      "Top-down memoisation has the same complexity but adds recursion depth up to m + n.",
    ],
  },
  solution: `class Solution {
public:
    int minDistance(string word1, string word2) {
        int m = word1.size(), n = word2.size();

        // dp[i][j] = fewest operations that turn word1[0..i) into word2[0..j).
        // Row i is the first i characters of word1, column j the first j of word2.
        vector<vector<int>> dp(m + 1, vector<int>(n + 1));

        // Base cases: against an empty string, the only option is to
        // insert everything (row 0) or delete everything (column 0).
        for (int j = 0; j <= n; ++j) dp[0][j] = j;
        for (int i = 0; i <= m; ++i) dp[i][0] = i;

        // Row by row, left to right: the cells above, to the left and
        // diagonally above-left are always filled before they are read.
        for (int i = 1; i <= m; ++i) {
            for (int j = 1; j <= n; ++j) {
                // The last characters of the two prefixes.
                char a = word1[i - 1], b = word2[j - 1];

                if (a == b) {
                    // They already match: keep both for free and solve the rest.
                    dp[i][j] = dp[i - 1][j - 1];
                } else {
                    int replace = dp[i - 1][j - 1];  // turn a into b, then solve both shorter prefixes
                    int remove  = dp[i - 1][j];      // delete a; word1 is shorter, word2 unchanged
                    int insert  = dp[i][j - 1];      // insert b after a; word2's last character is done
                    dp[i][j] = 1 + min({replace, remove, insert});
                }
            }
        }
        // The full words are the last row and column.
        return dp[m][n];
    }
};

// The same with one row of memory (enough when only the number is needed):
//
//   vector<int> dp(n + 1);
//   iota(dp.begin(), dp.end(), 0);        // row 0: 0, 1, ..., n
//   for (int i = 1; i <= m; ++i) {
//       int diag = dp[0];                 // dp[i-1][0], before it is overwritten
//       dp[0] = i;                        // dp[i][0]
//       for (int j = 1; j <= n; ++j) {
//           int up = dp[j];               // dp[i-1][j], before it is overwritten
//           dp[j] = word1[i - 1] == word2[j - 1] ? diag
//                                                : 1 + min({diag, up, dp[j - 1]});
//           diag = up;                    // the next cell's top-left neighbour
//       }
//   }
//   return dp[n];
`,
});
