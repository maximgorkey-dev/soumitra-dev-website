import { study } from "./leet-light.js";

export const lc552 = study({
  number: 552,
  title: "Student Attendance Record II",
  slug: "student-attendance-record-ii",
  difficulty: "H",
  pattern: "F1",
  topic: "F1 · State-machine DP",
  themes: ["Counting", "Six states"],
  blurb: "Count strings with a state of (absences so far: 0 or 1, current run of lates: 0, 1 or 2). Six states, one step per day, all modulo 10⁹ + 7.",
  statement: [
    "An attendance record is a string over 'A' (absent), 'L' (late) and 'P' (present). It is eligible for an award if it has fewer than 2 absences and never 3 consecutive lates.",
    "Return how many records of length n are eligible, modulo 10⁹ + 7. n up to 10⁵.",
  ],
  concepts: [
    "Counting with a state machine: count the paths of length n through the automaton, not the strings themselves.",
    "The state holds exactly what the rules need: absences (0..1) and trailing lates (0..2).",
    "Modular arithmetic: reduce after every addition; sums of up to 6 terms fit in long long.",
    "For huge n, the same transition is a 6 × 6 matrix: fast matrix power in O(log n).",
  ],
  traps: [
    "Counting \"no 3 lates anywhere\" instead of consecutive: P and A reset the run.",
    "Forgetting that A also resets the late run.",
    "Overflow when summing several states before the modulus.",
  ],
  followUps: [
    "n up to 10¹⁸: matrix exponentiation.",
    "Allow up to k absences and m consecutive lates: (k + 1) · m states.",
  ],
  explanation: [
    "dp[a][l] is the number of valid records so far with a absences and a trailing run of l lates. Appending P: any state goes to [a][0]. Appending L: [a][l] goes to [a][l + 1] if l < 2. Appending A: [0][l] goes to [1][0].",
    "Start from dp[0][0] = 1 for the empty record, apply n steps, and sum all six states.",
    { tip: "Signal: count strings that avoid some patterns. Build the automaton of what you must remember, then count paths through it." },
  ],
  analysis: { time: "O(n), or O(log n) with a matrix power", space: "O(1)" },
  solution: `class Solution {
public:
    int checkRecord(int n) {
        const long long MOD = 1'000'000'007;
        // dp[a][l]: records so far with a absences (0 or 1)
        // and a trailing run of l consecutive lates (0, 1 or 2).
        long long dp[2][3] = {{1, 0, 0}, {0, 0, 0}};  // the empty record

        for (int day = 0; day < n; ++day) {
            long long nd[2][3] = {};
            for (int a = 0; a < 2; ++a) {
                for (int l = 0; l < 3; ++l) {
                    long long c = dp[a][l];
                    if (!c) continue;
                    nd[a][0] = (nd[a][0] + c) % MOD;                    // 'P': resets the late run
                    if (l < 2) nd[a][l + 1] = (nd[a][l + 1] + c) % MOD; // 'L': extends the run, at most 2
                    if (a == 0) nd[1][0] = (nd[1][0] + c) % MOD;        // 'A': only one allowed, resets the run
                }
            }
            memcpy(dp, nd, sizeof dp);
        }

        long long total = 0;
        for (auto& row : dp) for (long long c : row) total = (total + c) % MOD;
        return total;
    }
};
`,
});
