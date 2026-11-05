import { study } from "./leet-light.js";

export const lc552 = study({
  number: 552,
  title: "Student Attendance Record II",
  slug: "student-attendance-record-ii",
  difficulty: "H",
  pattern: "F1",
  topic: "F1 · State-machine DP",
  themes: ["Counting", "Six states", "Automaton"],
  blurb: "Count records day by day with a state of (absences so far: 0 or 1, current run of lates: 0, 1 or 2). Each day adds P, A or L and moves between six states; sum them at the end, modulo 10⁹ + 7.",
  statement: [
    "An attendance record is a string over P (present), A (absent) and L (late). It earns an award if it has fewer than 2 A's in total and never 3 or more L's in a row.",
    "Given n, count the award-eligible records of length n, modulo 10⁹ + 7. n up to 10⁵. Example: n = 2 gives 8 (all 9 strings except AA); n = 3 gives 19.",
  ],
  concepts: [
    "Counting DP: instead of the best value per state, keep the number of strings that end in each state.",
    "A finite automaton: the rules only need two facts about the prefix, the number of A's so far (0 or 1) and the length of the trailing L run (0, 1 or 2). That gives 6 states.",
    "Transitions as letters: each state has at most three outgoing arrows (P, A, L), and an arrow that would break a rule simply does not exist.",
    "Modular arithmetic: counts grow like 3ⁿ, so reduce after every addition and use 64-bit sums.",
    "Matrix power (follow-up): a fixed linear transition can be raised to the n-th power in O(log n) steps.",
  ],
  hints: [
    "Think of writing the record one day at a time. What must you remember about what you have written to know which letters are still allowed?",
    "Two things: whether an A was used already, and how many L's end the string right now.",
    "Name the states (a, l) with a ∈ {0, 1} and l ∈ {0, 1, 2}. Where does each letter send each state?",
    "P resets l to 0. L increases l (forbidden at l = 2). A sets a = 1 and l = 0 (forbidden at a = 1).",
    "Count strings per state per day, starting from the empty string in state (0, 0).",
  ],
  brute: [
    "Generate all 3ⁿ strings and test each: 3²⁰ is already 3.5 billion, and n goes to 10⁵.",
    "Most of that work is repeated: every prefix in the same state, say \"one A used, ends in a single L\", has exactly the same set of valid continuations. So the strings can be grouped by state and counted, never listed; 6 numbers per day replace 3ⁿ strings.",
  ],
  invariant: "After day d, dp[a][l] is the number of valid records of length d that contain exactly a absences and end in exactly l consecutive lates.",
  traps: [
    "Forgetting that A and P both reset the L run: an A breaks a run of lates just like a P.",
    "Tracking the total number of L's rather than the trailing run: the rule is about consecutive lates only.",
    "Overflow: three counts near 10⁹ add to about 3 × 10⁹, past a 32-bit int. Use long long, or reduce after each addition.",
    "Reading the new day's counts from the array being written. Build a fresh 2 × 3 array each day.",
    "Off by one in days: start with the empty string (one string in state (0, 0)) and apply n steps, or start at day 1 with the three single letters. Do not do both.",
  ],
  followUps: [
    "n up to 10¹⁸: the transition is a fixed 6 × 6 matrix M, and the counts after n days are M to the n-th power times the start vector. Square-and-multiply takes O(6³ log n).",
    "Without the A rule, a closed form: f(n) = f(n − 1) + f(n − 2) + f(n − 3) counts P/L strings with no LLL. With at most one A, the answer is f(n) + the sum over the A's position i of f(i) × f(n − 1 − i).",
    "Checking one record (551): count A's and look for \"LLL\".",
    "Up to k absences and no m lates in a row: (k + 1) × m states, same method.",
    "Count strings avoiding any fixed set of forbidden substrings: build an Aho–Corasick automaton and run the same counting DP over its states.",
  ],
  explanation: [
    { h: "What the six states mean" },
    "Write the record left to right. To decide which letter may come next you need exactly two facts: a, the number of A's so far (0 or 1, since 2 would already be invalid), and l, how many L's end the string right now (0, 1 or 2). The cell dp[a][l] counts the valid strings of the current length that are in that state.",
    "Why grouping is allowed: two prefixes in the same state accept exactly the same continuations. So the number of ways to finish depends only on the state, and counting prefixes per state loses nothing.",
    { h: "Start" },
    "The empty string uses no A and ends in no L: dp[0][0] = 1, all others 0. Then apply one step per day.",
    { h: "One day's transitions" },
    {
      list: [
        "P from any state (a, l) goes to (a, 0). P is always allowed.",
        "L from (a, l) goes to (a, l + 1), but only if l < 2. A third L in a row is forbidden.",
        "A from (0, l) goes to (1, 0). From a = 1 it is forbidden, since that would be the second A.",
      ],
    },
    { code: "new[a][0]   += dp[a][l]   for all l          // P\nnew[a][l+1] += dp[a][l]   for l < 2          // L\nnew[1][0]   += dp[0][l]   for all l          // A\nanswer = sum of all six cells after n days, mod 1e9+7" },
    { h: "A worked example: the first three days" },
    {
      table: {
        head: ["day", "(0,0)", "(0,1)", "(0,2)", "(1,0)", "(1,1)", "(1,2)", "total"],
        rows: [
          [0, 1, 0, 0, 0, 0, 0, 1],
          [1, 1, 1, 0, 1, 0, 0, 3],
          [2, 2, 1, 1, 3, 1, 0, 8],
          [3, 4, 2, 1, 8, 3, 1, "**19**"],
        ],
        caption: "Each column is a state (absences so far, trailing lates). Each row is one more day. The answer for n = 3 is 19.",
      },
    },
    "Day 2, state (1, 0) = 3: an A added to any of the 2 strings with no A so far (P, L becomes PA, LA), plus a P added to the 1 string already holding an A (A becomes AP). Day 3, state (0, 2) = 1: only PLL, an L added to the single day-2 string in (0, 1), which is PL.",
    "Missing from day 3 are the 7 strings with two or more A's (AAP, APA, …, AAA) and LLL: 27 − 8 = 19, matching the total.",
    { h: "Fill order and memory" },
    "Each day reads only the previous day's 6 counts: O(n) time with a constant of about 12 additions, O(1) space.",
    { tip: "Signal: count strings under rules about \"so far\" and \"in a row\". Each rule becomes a small counter in the state; the counting DP runs over the product of those counters." },
  ],
  analysis: {
    time: "O(n)",
    space: "O(1)",
    notes: ["6 states and at most 3 transitions each per day. Matrix power gives O(log n) for very large n."],
  },
  solution: `class Solution {
public:
    int checkRecord(int n) {
        const long long MOD = 1'000'000'007;
        // dp[a][l]: number of valid records of the current length with
        //   a = absences so far (0 or 1), l = trailing consecutive lates (0..2).
        long long dp[2][3] = {{1, 0, 0}, {0, 0, 0}};   // the empty string

        for (int day = 0; day < n; ++day) {
            long long nx[2][3] = {};
            for (int a = 0; a < 2; ++a)
                for (int l = 0; l < 3; ++l) {
                    long long c = dp[a][l];
                    if (!c) continue;
                    // P: always allowed, ends any run of lates.
                    nx[a][0] = (nx[a][0] + c) % MOD;
                    // L: extends the run; a third L in a row is forbidden.
                    if (l < 2) nx[a][l + 1] = (nx[a][l + 1] + c) % MOD;
                    // A: only if no absence yet; also ends the run of lates.
                    if (a == 0) nx[1][0] = (nx[1][0] + c) % MOD;
                }
            memcpy(dp, nx, sizeof dp);
        }

        long long total = 0;
        for (int a = 0; a < 2; ++a)
            for (int l = 0; l < 3; ++l) total = (total + dp[a][l]) % MOD;
        return (int)total;
    }
};
`,
});
