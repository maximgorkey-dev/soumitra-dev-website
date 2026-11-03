import { light } from "./leet-light.js";

export const lc1541 = light({
  number: 1541,
  title: "Minimum Insertions to Balance a Parentheses String",
  slug: "minimum-insertions-to-balance-a-parentheses-string",
  difficulty: "M",
  pattern: "D5",
  topic: "D5 · Counting the balance",
  themes: ["Balance counter", "Parentheses"],
  blurb: "Count the ')' still needed. Each '(' needs two in a row, so a '(' arriving while one ')' is owed forces an insertion first.",
  statement: [
    "In this variant, each '(' must be closed by two consecutive '))'. Given a string of '(' and ')', return the fewest characters to insert anywhere to make it balanced.",
    "Up to 10⁵ characters.",
  ],
  hints: [
    "Track need, the number of ')' still owed. What does each '(' add?",
    "Two. What if a lone ')' is owed (need is odd) when a '(' arrives?",
    "The pair \"))\" must be consecutive, so that owed ')' must be inserted right now.",
    "A ')' with nothing owed needs a '(' inserted, which then owes one more ')'.",
  ],
  brute: "Shortest edit over states (position, unmatched '(', half a pair read), insertions as zero-length moves: O(n²).",
  invariant: "After each character, need is the number of ')' owed by the '(' seen and inserted so far, and inserted counts the characters added.",
  traps: [
    "Forgetting that \"))\" must be consecutive: \"()()\" owes only two ')' in total, yet needs two insertions, one after each ')'.",
    "Handling a stray ')' by inserting only '(': the inserted '(' still owes one more ')'.",
    "Adding need at the end but forgetting the insertions already counted.",
  ],
  followUps: [
    "Return the balanced string.",
    "Each '(' needs k consecutive ')'.",
    "Compare with 921, where one ')' closes one '('.",
  ],
  explanation: [
    "Keep need, the ')' still owed. A '(' adds two. But if need is odd when a '(' arrives, the last '(' got only one ')' so far, and its second ')' must come right away: insert it (need − 1, one insertion) before adding two.",
    "A ')' pays one off. If nothing was owed, this ')' belongs to a '(' that is not there: insert one, which owes two, and this ')' pays one, so need becomes 1.",
    "At the end, insert every ')' still owed: the answer is inserted + need.",
    { tip: "Signal: a bracket rule that is not one-to-one. Count what is still owed, and handle the cases where the order forces an insertion now." },
  ],
  analysis: {
    time: "O(n)",
    space: "O(1)",
    notes: [],
  },
  tests: {
    fn: "minInsertions",
    args: [{ type: "string", name: "s" }],
    starter: `class Solution {
public:
    int minInsertions(string s) {

    }
};`,
    reference: `class Solution {
public:
    int minInsertions(string s) {
        int inserted = 0, need = 0;
        for (char c : s) {
            if (c == '(') {
                if (need % 2 == 1) { ++inserted; --need; }  // finish the pending pair first
                need += 2;
            } else if (--need < 0) {
                ++inserted;  // a '(' was missing
                need = 1;
            }
        }
        return inserted + need;
    }
};`,
    brute: `class Solution {
public:
    // Shortest edit over (open, half): reading a character advances, inserting costs 1.
    int minInsertions(string s) {
        int n = s.size(), M = n + 2;
        const int INF = 1e9;
        using Grid = vector<array<int, 2>>;
        auto relax = [&](Grid& d) {
            for (bool changed = true; changed;) {
                changed = false;
                auto upd = [&](int& x, int v) { if (v < x) { x = v; changed = true; } };
                for (int o = 0; o <= M; ++o) {
                    if (d[o][0] < INF && o < M) upd(d[o + 1][0], d[o][0] + 1);
                    if (d[o][0] < INF && o > 0) upd(d[o - 1][1], d[o][0] + 1);
                    if (d[o][1] < INF) upd(d[o][0], d[o][1] + 1);
                }
            }
        };
        Grid cur(M + 1, {INF, INF});
        cur[0][0] = 0;
        relax(cur);
        for (char c : s) {
            Grid nxt(M + 1, {INF, INF});
            for (int o = 0; o <= M; ++o) {
                if (c == '(' && o < M && cur[o][0] < INF) nxt[o + 1][0] = min(nxt[o + 1][0], cur[o][0]);
                if (c == ')' && o > 0 && cur[o][0] < INF) nxt[o - 1][1] = min(nxt[o - 1][1], cur[o][0]);
                if (c == ')' && cur[o][1] < INF) nxt[o][0] = min(nxt[o][0], cur[o][1]);
            }
            cur = nxt;
            relax(cur);
        }
        return cur[0][0];
    }
};`,
    cases: [
      { name: "example", args: ["\"(()))\""] },
      { name: "example 2", args: ["\"())\""] },
      { name: "example 3", args: ["\"))())(\""] },
      { name: "pending pair", args: ["\"()()\""] },
      { name: "stray close", args: ["\")\""] },
    ],
    random: { count: 400, gen: "s = rnd_str(rnd(1, 12), \"()\");" },
    stress: { label: "10⁵ characters", gen: "s = rnd_str(100000, \"()\");" },
  },
});
