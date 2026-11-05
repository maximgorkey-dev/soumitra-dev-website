import { study } from "./leet-light.js";

export const lc730 = study({
  number: 730,
  title: "Count Different Palindromic Subsequences",
  slug: "count-different-palindromic-subsequences",
  difficulty: "H",
  pattern: "F4",
  topic: "F4 · Interval DP",
  see: 516,
  themes: ["Interval DP", "Counting distinct", "Inclusion–exclusion"],
  blurb: "dp[i][j] counts the distinct palindromic subsequences inside s[i..j]. Different ends use inclusion–exclusion. Equal ends c double the inner count (each inner palindrome with or without the c…c wrapper), then fix the overcount by looking at the first and last c strictly inside.",
  statement: [
    "s has up to 1000 characters, each one of 'a', 'b', 'c', 'd'. Count the different non-empty palindromic subsequences of s, as strings (the same string formed in two ways counts once), modulo 10⁹ + 7.",
    "Example: \"bccb\" gives 6: b, c, bb, cc, bcb and bccb. bcb appears twice as a subsequence but is counted once.",
  ],
  concepts: [
    "Interval DP over s[i..j], like 516, but counting instead of maximising.",
    "Inclusion–exclusion: palindromes in s[i + 1..j] and in s[i..j − 1] overlap in exactly those inside s[i + 1..j − 1].",
    "Counting distinct strings, not ways: every palindrome is either a single letter, or c + inner + c for some letter c. Organise the count by the outer letter to avoid double counting.",
    "The innermost matching pair: when the ends are c, the palindromes c…c that were already counted are exactly those using the first and last c strictly inside, so subtracting that region fixes the overcount.",
    "Modular subtraction: (a − b) mod M must be brought back into [0, M) before storing.",
  ],
  hints: [
    "Start from 516 (the longest palindromic subsequence). What changes when you must count distinct strings rather than find a longest one?",
    "If s[i] ≠ s[j], no palindrome uses both ends. Which two ranges cover all palindromes, and what do they share?",
    "If s[i] = s[j] = c, every palindrome inside s[i + 1..j − 1] can also be wrapped as c + p + c. That suggests 2 × inner. What about the strings \"c\" and \"cc\"?",
    "The doubling overcounts when c also appears inside the range. Find the first and last c strictly inside, low and high, and split into three cases: no c inside, one, or at least two.",
  ],
  brute: [
    "Enumerate all 2ⁿ subsequences, keep the palindromes in a hash set, and count the set. Hopeless beyond n ≈ 25; n is 1000.",
    "A memoised count of \"ways\" is easy but wrong, because the same string is formed by many index choices (bcb in bccb). The fix is to count each distinct palindrome once by its outermost letter, which is what the case analysis on low and high achieves, with O(n²) states.",
  ],
  invariant: "dp[i][j] is the number of distinct non-empty palindromic subsequences of s[i..j] (and 0 for an empty range).",
  traps: [
    "Counting index tuples instead of strings: \"bccb\" would give 9 (b, c and bcb each twice), not 6.",
    "Forgetting the three-way case split when the ends match: using 2 × inner + 2 every time double counts \"c\" and \"cc\" when c already occurs inside.",
    "Searching for low and high by scanning inside the double loop: O(n³) = 10⁹ at n = 1000. Precompute next and previous occurrence arrays.",
    "Negative values after subtraction: (2 × inner − dp[low + 1][high − 1]) can be negative mod M. Add M before taking the remainder.",
    "Reading dp[i + 1][j − 1] when i + 1 > j − 1: treat an empty range as 0.",
  ],
  followUps: [
    "Why the alphabet is small: it lets you precompute next and previous occurrences per letter in O(4n). For a general alphabet use a 3D formulation dp[c][i][j] (palindromes starting and ending with c), or per-letter occurrence lists with binary search.",
    "Count palindromic subsequences as index tuples (not distinct): dp[i][j] = dp[i + 1][j] + dp[i][j − 1] − dp[i + 1][j − 1], plus dp[i + 1][j − 1] + 1 when the ends match. Easier.",
    "Distinct palindromic substrings (contiguous): an eertree (palindromic tree) gives them in O(n).",
    "Distinct subsequences of any kind (940): a 1D DP that subtracts the count before the previous occurrence of the same letter, the same \"remove the earlier copy\" idea.",
    "Return the list for small n: DFS over (i, j) using the same case split, generating c + p + c.",
  ],
  explanation: [
    { h: "What the table means" },
    "dp[i][j] is the number of different palindromic strings that occur as subsequences of s[i..j]. Different means as strings: two choices of indices spelling the same word count once. The answer is dp[0][n − 1]; an empty range counts 0.",
    { h: "Base cases" },
    "A single letter has exactly one palindrome, itself: dp[i][i] = 1.",
    { h: "Filling one cell" },
    "When the ends differ, no palindrome uses both s[i] and s[j], so every palindrome lies in s[i + 1..j] or s[i..j − 1]. Those two sets overlap in the palindromes of s[i + 1..j − 1], so add both and subtract the overlap.",
    "When the ends are the same letter c, let inner = dp[i + 1][j − 1]. Each inner palindrome p appears twice in the new count: as p itself, and as c + p + c, which is new because it is strictly longer than anything inside. That gives 2 × inner, and then the strings \"c\" and \"cc\" need care. Let low and high be the first and last positions of c strictly between i and j.",
    {
      list: [
        "No c inside (low > high): \"c\" and \"cc\" are both new. dp = 2 × inner + 2.",
        "Exactly one c inside (low = high): \"c\" was already counted inside, \"cc\" is new. dp = 2 × inner + 1.",
        "Two or more c inside (low < high): both \"c\" and \"cc\" were already counted. Worse, c + p + c was already counted for every p inside s[low + 1..high − 1], using the inner pair low, high. Subtract those: dp = 2 × inner − dp[low + 1][high − 1].",
      ],
    },
    { code: "s[i] != s[j]:  dp[i][j] = dp[i+1][j] + dp[i][j-1] - dp[i+1][j-1]\ns[i] == s[j] == c, low/high = first/last c strictly inside:\n  low >  high:  dp[i][j] = 2*dp[i+1][j-1] + 2\n  low == high:  dp[i][j] = 2*dp[i+1][j-1] + 1\n  low <  high:  dp[i][j] = 2*dp[i+1][j-1] - dp[low+1][high-1]\n(all mod 1e9+7, empty ranges count 0)" },
    { h: "A worked example: \"bccb\"" },
    {
      table: {
        head: ["i \\ j", "0 (b)", "1 (c)", "2 (c)", "3 (b)"],
        rows: [
          ["0", 1, 2, 3, "**6**"],
          ["1", "", 1, 2, 3],
          ["2", "", "", 1, 2],
          ["3", "", "", "", 1],
        ],
        caption: "dp[i][j]: distinct palindromic subsequences of s[i..j]. The answer is dp[0][3] = 6.",
      },
    },
    "dp[1][2] = 2 (\"cc\"): the ends match, nothing is inside, so 2 × 0 + 2 counts c and cc. dp[0][2] = 3 (\"bcc\"): the ends differ, dp[1][2] + dp[0][1] − dp[1][1] = 2 + 2 − 1, which is b, c and cc. Subtracting 1 removes c, which both ranges contain.",
    "dp[0][3] = 6: the ends are b and there is no b inside, so 2 × dp[1][2] + 2 = 6. The inner palindromes c and cc, the wrapped bcb and bccb, and the new b and bb.",
    "The third case appears in \"aaaa\" with i = 0, j = 3. The inside \"aa\" has dp[1][2] = 2 (a, aa), and doubling gives a, aa, aaa, aaaa, four distinct strings. Here low = 1 < high = 2, so neither +1 nor +2 applies (a and aa are not new), and the subtracted range s[2..1] is empty, so dp = 2 × 2 − 0 = 4. With a longer inside, such as \"aabaa\" inside the ends, the subtraction removes the a + p + a strings that the inner pair low, high had already produced.",
    { h: "Fill order and memory" },
    "A cell reads strictly shorter ranges, so loop i from n − 1 down to 0 and j from i + 1 up. With next and previous occurrence arrays, low and high are O(1). O(n²) time and space; at n = 1000 that is a million cells.",
    { tip: "Signal: count distinct strings, not ways. Classify each string by its outermost structure (here, the outer letter) so it is produced exactly once." },
  ],
  analysis: {
    time: "O(n²)",
    space: "O(n²)",
    notes: ["Precomputed next and previous occurrence per letter keep each cell O(1)."],
  },
  solution: `class Solution {
public:
    int countPalindromicSubsequences(string s) {
        const long long MOD = 1'000'000'007;
        int n = s.size();

        // nxt[i][c]: first index >= i holding letter c (n if none).
        // prv[i][c]: last index <= i holding letter c (-1 if none).
        vector<array<int, 4>> nxt(n + 1), prv(n);
        nxt[n].fill(n);
        for (int i = n - 1; i >= 0; --i) {
            nxt[i] = nxt[i + 1];
            nxt[i][s[i] - 'a'] = i;
        }
        array<int, 4> last;
        last.fill(-1);
        for (int i = 0; i < n; ++i) {
            last[s[i] - 'a'] = i;
            prv[i] = last;
        }

        // dp[i][j]: distinct non-empty palindromic subsequences of s[i..j].
        vector<vector<int>> dp(n, vector<int>(n, 0));
        auto at = [&](int a, int b) -> long long { return a > b ? 0 : dp[a][b]; };

        for (int i = n - 1; i >= 0; --i) {
            dp[i][i] = 1;                       // the single letter
            for (int j = i + 1; j < n; ++j) {
                long long v;
                if (s[i] != s[j]) {
                    // No palindrome uses both ends: union of the two shorter
                    // ranges, minus their overlap.
                    v = at(i + 1, j) + at(i, j - 1) - at(i + 1, j - 1);
                } else {
                    int c = s[i] - 'a';
                    int lo = nxt[i + 1][c];     // first c strictly inside
                    int hi = prv[j - 1][c];     // last c strictly inside
                    // Each inner palindrome p counts as p and as c+p+c.
                    v = 2 * at(i + 1, j - 1);
                    if (lo > hi)       v += 2;  // no c inside: "c" and "cc" are new
                    else if (lo == hi) v += 1;  // one c inside: only "cc" is new
                    else               v -= at(lo + 1, hi - 1);  // c+p+c already
                                                // counted via the pair lo, hi
                }
                dp[i][j] = (int)(((v % MOD) + MOD) % MOD);
            }
        }
        return dp[0][n - 1];
    }
};
`,
});
