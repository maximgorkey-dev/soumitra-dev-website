/**
 * 76 Minimum Window Substring: variable sliding window (catalogue pattern A4).
 */

import { frame } from "../core/trace.js";
import { SEQUENCE, result, span } from "./seq-common.js";

const S = "ADOBECODEBANC";
const T = "ABC";

const REFERENCE = `class Solution {
public:
    string minWindow(string s, string t) {
        int need[128] = {}, missing = t.size();  // how many of t's characters the window still lacks
        for (char c : t) ++need[(int)c];
        int bestL = 0, bestLen = INT_MAX;
        for (int l = 0, r = 0; r < (int)s.size(); ++r) {
            if (need[(int)s[r]]-- > 0) --missing;  // s[r] was still wanted
            while (missing == 0) {                 // covered: shrink while it stays covered
                if (r - l + 1 < bestLen) bestL = l, bestLen = r - l + 1;
                if (++need[(int)s[l++]] > 0) ++missing;  // dropped a character we needed
            }
        }
        return bestLen == INT_MAX ? "" : s.substr(bestL, bestLen);
    }
};`;

const BRUTE = `class Solution {
public:
    // From every start, grow until covered: O(n^2).
    string minWindow(string s, string t) {
        int n = s.size(), bestL = 0, bestLen = INT_MAX;
        for (int l = 0; l < n; ++l) {
            int need[128] = {}, missing = t.size();
            for (char c : t) ++need[(int)c];
            for (int r = l; r < n && r - l + 1 < bestLen; ++r)
                if (need[(int)s[r]]-- > 0 && --missing == 0) { bestL = l, bestLen = r - l + 1; break; }
        }
        return bestLen == INT_MAX ? "" : s.substr(bestL, bestLen);
    }
};`;

const STARTER = `class Solution {
public:
    string minWindow(string s, string t) {

    }
};`;

/* Any shortest covering window is accepted, so answers are compared by length after a coverage check. */
const NORMALIZE = `[&](const string& w) {
    if (w.empty()) return string("no window");
    if (s.find(w) == string::npos) return "\\"" + w + "\\" is not a substring of s";
    int need[128] = {};
    for (char c : t) ++need[(int)c];
    for (char c : w) --need[(int)c];
    for (int x : need) if (x > 0) return "\\"" + w + "\\" does not contain all of t";
    return "a covering window of length " + to_string(w.size());
}`;

function* run() {
  const s = [...S];
  const need = new Map();
  for (const c of T) need.set(c, (need.get(c) || 0) + 1);
  let missing = T.length;
  let best = null;
  let l = 0;

  const letters = [...new Set(T)];
  const rows = (r, cells = {}) => [
    {
      name: "s", values: s,
      cells: { ...(r >= l ? span(l, r, "selected") : {}), ...cells },
      pointers: r >= 0 ? [{ name: "l", at: l }, { name: "r", at: r }] : [],
      ranges: [
        ...(r >= l ? [{ from: l, to: r, label: missing ? `missing ${missing}` : "covers t" }] : []),
        ...(best ? [{ from: best[0], to: best[1], label: `best: ${best[1] - best[0] + 1}`, state: "best" }] : []),
      ],
    },
    { name: "still need", values: letters.map((c) => need.get(c)), labels: letters },
  ];
  const metrics = (extra = []) => [{ label: "Best", value: best ? `"${S.slice(best[0], best[1] + 1)}"` : "none yet" }, ...extra];

  yield frame({
    phase: "Set up",
    note: `Find the shortest stretch of "${S}" that contains every letter of "${T}".`,
    detail: "\"still need\" counts what the window lacks; it goes negative for surplus copies. missing counts the letters of t not yet covered.",
    marks: { rows: rows(-1) },
    metrics: metrics(),
  });

  for (let r = 0; r < s.length; r++) {
    const c = s[r];
    const wanted = (need.get(c) ?? 0) > 0;
    need.set(c, (need.get(c) ?? 0) - 1);
    if (wanted) missing--;
    if (wanted || missing === 0) {
      yield frame({
        phase: "Grow",
        note: wanted
          ? `r takes '${c}', which the window still needed. ${missing ? `${missing} letter${missing > 1 ? "s" : ""} of t still missing.` : "Now every letter of t is covered."}`
          : `r takes '${c}', a surplus copy.`,
        marks: { rows: rows(r, { [r]: "active" }) },
        metrics: metrics(),
      });
    }
    while (missing === 0) {
      const improved = !best || r - l < best[1] - best[0];
      if (improved) best = [l, r];
      const d = s[l];
      need.set(d, (need.get(d) ?? 0) + 1);
      const lost = (need.get(d) ?? 0) > 0;
      if (lost) missing++;
      yield frame({
        phase: "Shrink",
        note: lost
          ? `"${S.slice(l, r + 1)}" covers t${improved ? ", the shortest so far" : ""}. Dropping '${d}' loses a needed letter, so growing resumes.`
          : `"${S.slice(l, r + 1)}" covers t${improved ? ", the shortest so far" : ""}, and still would without '${d}': drop it and keep shrinking.`,
        marks: { rows: rows(r, { [l]: lost ? "pivot" : "excluded" }) },
        metrics: metrics(),
      });
      l++;
    }
  }

  yield frame({
    phase: "Done",
    note: `The shortest window is "${S.slice(best[0], best[1] + 1)}". r passed each letter once and l never moved back, so the work was linear.`,
    marks: { rows: rows(-1) },
    metrics: metrics([result(S.slice(best[0], best[1] + 1))]),
  });
}

export const lc76 = {
  id: "lc-76",
  section: "Interview problems",
  topic: "A4 · Variable sliding window",
  title: "76. Minimum Window Substring",
  blurb: "Grow the right edge until the window covers t, then shrink the left edge while it still does; one counter says when.",
  structure: SEQUENCE,
  run,
  explanation: [
    "Covering t is monotone in the window: if s[l..r] contains every letter of t, so does any window containing it. That is what licenses a sliding window. For each right edge, the best left edge only ever moves right, so the two pointers together do O(n) work.",
    "The bookkeeping is one count per character of what the window still needs (negative for surplus) and a single number, missing, for how many letters of t are not yet covered. Adding s[r] decrements missing only if that letter was still needed; removing s[l] increments it only if the count goes back above zero. So checking \"does the window cover t?\" is O(1), not a scan over the alphabet.",
    "While missing is 0 the window is valid: record it if it is the shortest, then drop the left character. The animation shows the window growing until it covers \"ABC\", then shrinking until it loses a needed letter.",
    { tip: "Signal: the shortest or longest substring or subarray satisfying an \"at least\" or \"at most\" condition on counts, with a monotone constraint. \"Exactly k\" problems reduce to at-most(k) − at-most(k − 1)." },
  ],
  analysis: {
    time: "O(|s| + |t|): each pointer crosses s once",
    space: "O(alphabet): one count per character",
    notes: [
      "The missing counter is what makes the validity check O(1); comparing two count arrays each step would be O(52) per step, still linear but slower.",
      "For a large alphabet, replace the array with a hash map, or filter s to the characters of t first.",
      "The brute force (grow from every start) is O(|s|²) in the worst case even with an early break.",
      "When the answer is not unique, any shortest window is correct; LeetCode guarantees uniqueness, and the tests here accept any shortest covering window.",
    ],
  },
  code: {
    lang: "cpp",
    files: [{
      name: "solution.cpp",
      note: "The LeetCode-shaped solution, plus a main over the animation's input that prints its Result.",
      source: `#include <climits>\n#include <cstdio>\n#include <string>\nusing namespace std;\n\n${REFERENCE}\n\nint main() {\n    printf("%s\\n", Solution().minWindow("${S}", "${T}").c_str());\n}\n`,
      traced: true,
    }],
  },
  problem: {
    number: 76,
    slug: "minimum-window-substring",
    difficulty: "H",
    tier: "core",
    pattern: "A4",
    themes: ["Substring"],
    statement: [
      "Given strings s and t, return the shortest substring of s that contains every character of t, counting duplicates. Return an empty string if there is none.",
      "Both strings have up to 10⁵ English letters; aim for O(|s| + |t|).",
    ],
    hints: [
      "If a window covers t, does every larger window containing it also cover t? What does that let you do?",
      "Move a right pointer until the window covers t, then move a left pointer as far as it can go while it still covers t.",
      "Keep a count per character of what the window still needs, allowing negatives for surplus.",
      "Keep one more number: how many characters of t are still missing. It changes only when a count crosses zero, so the coverage check is O(1).",
    ],
    brute: "From every start, extend to the right until the window covers t: O(|s|²). With |s| = 10⁵ and a t that needs most of s, that is about 5·10⁹ steps; the stress case is built that way.",
    invariant: "need[c] = (copies of c in t) − (copies in the window), and missing = the number of characters of t the window lacks, i.e. the sum of the positive need[c]. The window covers t exactly when missing is 0.",
    traps: [
      "Decrementing missing for every character added, including surplus copies: only count it when need[c] was positive.",
      "Recording the best window after shrinking instead of before: the last valid window is the one just before the needed letter is dropped.",
      "Characters outside t: their counts go negative and come back to zero, and must never change missing.",
    ],
    followUps: [
      "Return the window's start and length instead of copying the substring (the copy is O(answer)).",
      "727 Minimum Window Subsequence: t must appear in order. The window no longer works; use next-occurrence tables or a DP.",
      "s is a stream and t is fixed: report the shortest covering window seen so far after each character.",
      "Many queries t₁, t₂, … over the same s: what can you precompute?",
    ],
    tests: {
      fn: "minWindow",
      args: [{ type: "string", name: "s" }, { type: "string", name: "t" }],
      starter: STARTER,
      reference: REFERENCE,
      brute: BRUTE,
      normalize: NORMALIZE,
      cases: [
        { name: "example", args: ['"ADOBECODEBANC"', '"ABC"'] },
        { name: "whole string", args: ['"a"', '"a"'] },
        { name: "impossible", args: ['"a"', '"aa"'] },
        { name: "duplicates in t", args: ['"aaflslflsldkalskaaa"', '"aaa"'] },
        { name: "case matters", args: ['"aA"', '"A"'] },
      ],
      random: { count: 400, gen: 's = rnd_str(rnd(1, 14), "abc"); t = rnd_str(rnd(1, 4), "abc");' },
      stress: { label: "|s| = 10⁵", gen: 's = string(50000, \'a\') + rnd_str(50000, "ab") + "c"; t = string(100, \'a\') + "c";' },
    },
  },
};
