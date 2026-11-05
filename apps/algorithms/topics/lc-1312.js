import { study } from "./leet-light.js";

export const lc1312 = study({
  number: 1312,
  title: "Minimum Insertion Steps to Make a String Palindrome",
  slug: "minimum-insertion-steps-to-make-a-string-palindrome",
  difficulty: "H",
  pattern: "F3",
  topic: "F3 · DP over two strings",
  themes: ["Interval DP", "LCS reframing", "Palindromes"],
  blurb: "dp[l][r] is the fewest insertions that make s[l..r] a palindrome. Equal ends cost nothing and leave the inside; unequal ends force one insertion to mirror one of them, leaving a shorter interval.",
  statement: [
    "In one step you may insert any character at any position of s. Return the fewest steps that make s a palindrome.",
    "s has up to 500 lowercase letters. Example: \"mbadm\" needs 2 (for instance \"mbdadbm\").",
  ],
  concepts: [
    "Interval DP on s[l..r], deciding on the two ends.",
    "Reframing as a complement: the characters you never pair with an insertion form a palindromic subsequence, so the answer is n minus the longest palindromic subsequence (516).",
    "Longest palindromic subsequence equals LCS(s, reverse(s)), which gives a second, two-string formulation (1143).",
  ],
  hints: [
    "Look at the two ends of s. If they are equal, do they need any insertion?",
    "No: they can be the outer pair, and only the inside needs work.",
    "If they differ, one end must get a new mirror character on the other side. Which smaller problem is left after mirroring s[l]?",
    "Inserting a copy of s[l] after s[r] pairs it, leaving s[l + 1..r]. Mirroring s[r] instead leaves s[l..r − 1]. Take the cheaper.",
  ],
  brute: [
    "Try inserting characters in every possible way, breadth first by number of insertions: the number of strings grows like (26 · n)^k for k insertions, hopeless even for short inputs.",
    "The recursion on the ends is the right idea, but without a memo it branches twice per mismatch and revisits the same inner intervals exponentially often. There are only n(n + 1) / 2 intervals; tabulating them gives O(n²).",
  ],
  invariant: "dp[l][r] is the fewest insertions that turn s[l..r] into a palindrome, and every interval strictly inside [l, r] is already final.",
  traps: [
    "Working from the outside in and always mirroring the left end: which end to mirror changes what is left inside, so both must be tried.",
    "Filling with l increasing, so dp[l + 1][…] is read before it is computed.",
    "Thinking deletions give a different answer: deleting the unpaired characters needs exactly the same number.",
  ],
  followUps: [
    "Return one shortest palindrome: walk the table from (0, n − 1); on equal ends keep both, otherwise follow the cheaper choice and emit the mirrored character.",
    "Only insertions at the front are allowed (214 Shortest Palindrome): find the longest palindromic prefix with KMP or rolling hashes, O(n).",
    "Each inserted letter has its own cost: the same table with weighted transitions.",
  ],
  explanation: [
    { h: "What the table means" },
    "dp[l][r] answers: what is the fewest insertions that make the substring s[l..r] a palindrome? Only l ≤ r is used. The answer is dp[0][n − 1].",
    { h: "Base cases" },
    "A single character, or an empty interval, is already a palindrome: dp[l][l] = 0.",
    { h: "Filling one cell" },
    {
      list: [
        "s[l] == s[r]: they already mirror each other, so only the inside needs fixing: dp[l][r] = dp[l + 1][r − 1].",
        "s[l] ≠ s[r]: in the final palindrome, the outermost characters are equal, so at least one of these two ends is matched by an inserted character. Insert a copy of s[l] just after s[r]: now s[l] is paired and s[l + 1..r] remains, costing 1 + dp[l + 1][r]. Or insert a copy of s[r] just before s[l]: 1 + dp[l][r − 1]. Take the smaller.",
      ],
    },
    { code: "dp[l][r] = dp[l+1][r-1]                          if s[l] == s[r]\n         = 1 + min(dp[l+1][r], dp[l][r-1])        otherwise" },
    { h: "A worked example: \"mbadm\"" },
    {
      table: {
        head: ["l \\ r", "0 m", "1 b", "2 a", "3 d", "4 m"],
        rows: [
          ["0 m", 0, 1, 2, 3, "**2**"],
          ["1 b", "", 0, 1, 2, 3],
          ["2 a", "", "", 0, 1, 2],
          ["3 d", "", "", "", 0, 1],
          ["4 m", "", "", "", "", 0],
        ],
        caption: "dp[l][r] for s = mbadm. The answer is the top-right cell.",
      },
    },
    "dp[1][3] (\"bad\"): b ≠ d, so 1 + min(dp[2][3] = 1, dp[1][2] = 1) = 2; for example \"badab\" or \"dbabd\".",
    "dp[0][4] (the whole string): the ends are both m, so it equals dp[1][3] = 2. The m's frame \"bad\", which needs two insertions: \"m\" + \"bdadb\" + \"m\".",
    "The other view gives the same number: the longest palindromic subsequence of \"mbadm\" has length 3 (\"mam\", \"mbm\" or \"mdm\"), and 5 − 3 = 2 characters need a partner.",
    { h: "Fill order" },
    "Each cell reads the cell below, the cell to the left and the one diagonally down-left, all shorter intervals. Fill l from n − 1 down to 0 and r from l + 1 upward.",
    { tip: "Signal: fewest insertions or deletions to reach a palindrome. Interval DP on the ends, or n minus the longest palindromic subsequence." },
  ],
  analysis: {
    time: "O(n²)",
    space: "O(n²) as written; O(n) with two rows",
    notes: [],
  },
  solution: `class Solution {
public:
    int minInsertions(string s) {
        int n = s.size();

        // dp[l][r] = fewest insertions that make s[l..r] a palindrome.
        // Single characters and empty intervals need none, so 0 is the default.
        vector<vector<int>> dp(n, vector<int>(n, 0));

        // l from right to left, so every interval inside [l, r] is ready.
        for (int l = n - 1; l >= 0; --l) {
            for (int r = l + 1; r < n; ++r) {
                if (s[l] == s[r]) {
                    // The ends mirror each other already; fix the inside.
                    // For r == l + 1 the inside is empty (dp[l+1][l] stays 0).
                    dp[l][r] = dp[l + 1][r - 1];
                } else {
                    // Pair one end with an inserted copy on the other side.
                    dp[l][r] = 1 + min(dp[l + 1][r],   // copy s[l] after s[r]
                                       dp[l][r - 1]);  // copy s[r] before s[l]
                }
            }
        }
        return dp[0][n - 1];
    }
};
`,
});
