/**
 * 229 Majority Element II: Boyer–Moore voting with two candidates, then a
 * verification pass (catalogue pattern C3).
 */

import { frame } from "../core/trace.js";
import { SEQUENCE, result } from "./seq-common.js";

const NUMS = [2, 1, 2, 3, 1, 2, 1, 3, 2];

const REFERENCE = `class Solution {
public:
    vector<int> majorityElement(vector<int>& nums) {
        // Distinct starting candidates, both with zero votes.
        int c1 = 0, c2 = 1, n1 = 0, n2 = 0;
        for (int x : nums) {
            if (x == c1) ++n1;
            else if (x == c2) ++n2;
            else if (n1 == 0) c1 = x, n1 = 1;
            else if (n2 == 0) c2 = x, n2 = 1;
            else --n1, --n2;  // x cancels one vote of each: three distinct values removed
        }
        // Survivors are only candidates; count them for real.
        int k1 = 0, k2 = 0;
        for (int x : nums) k1 += x == c1, k2 += x == c2;
        vector<int> out;
        int n = nums.size();
        if (k1 > n / 3) out.push_back(c1);
        if (k2 > n / 3) out.push_back(c2);
        return out;
    }
};`;

const BRUTE = `class Solution {
public:
    // Count every element with a full scan: O(n^2).
    vector<int> majorityElement(vector<int>& nums) {
        int n = nums.size();
        vector<int> out;
        for (int i = 0; i < n; ++i) {
            int k = count(nums.begin(), nums.end(), nums[i]);
            if (k > n / 3 && find(out.begin(), out.end(), nums[i]) == out.end()) out.push_back(nums[i]);
        }
        return out;
    }
};`;

const STARTER = `class Solution {
public:
    vector<int> majorityElement(vector<int>& nums) {

    }
};`;

const NORMALIZE = `[](vector<int> v) { sort(v.begin(), v.end()); return v; }`;

function* run() {
  const n = NUMS.length;
  let c1 = 0, c2 = 1, n1 = 0, n2 = 0;
  const done = {};
  const rows = (i, extra = {}) => [{ name: "nums", values: NUMS, cells: { ...done, ...(i >= 0 ? { [i]: "active" } : {}), ...extra }, pointers: i >= 0 ? [{ name: "x", at: i }] : [] }];
  const votes = () => [
    { label: "Candidate 1", value: n1 ? `${c1} × ${n1}` : "none" },
    { label: "Candidate 2", value: n2 ? `${c2} × ${n2}` : "none" },
  ];

  yield frame({
    phase: "Set up",
    note: `Find every value in [${NUMS.join(", ")}] that appears more than n / 3 = ${Math.floor(n / 3)} times, in O(n) time and O(1) space.`,
    detail: "At most two values can each exceed n / 3. Keep two candidates with vote counts.",
    marks: { rows: rows(-1) },
    metrics: votes(),
  });

  for (let i = 0; i < n; i++) {
    const x = NUMS[i];
    let what;
    if (x === c1 && n1 > 0) { n1++; what = `${x} is candidate 1: its votes rise to ${n1}.`; }
    else if (x === c2 && n2 > 0) { n2++; what = `${x} is candidate 2: its votes rise to ${n2}.`; }
    else if (x === c1) { n1++; what = `${x} takes the empty slot 1.`; }
    else if (x === c2) { n2++; what = `${x} takes the empty slot 2.`; }
    else if (n1 === 0) { c1 = x; n1 = 1; what = `Slot 1 is empty: ${x} becomes candidate 1.`; }
    else if (n2 === 0) { c2 = x; n2 = 1; what = `Slot 2 is empty: ${x} becomes candidate 2.`; }
    else { n1--; n2--; done[i] = "excluded"; what = `${x} differs from both candidates. Cancel it against one vote of each: three distinct values thrown away together.`; }
    yield frame({
      phase: done[i] ? "Cancel" : "Vote",
      note: what,
      detail: done[i] ? "A value with more than n / 3 copies cannot be wiped out: every cancellation removes three elements, at most one of them its copy." : undefined,
      marks: { rows: rows(i) },
      metrics: votes(),
    });
    if (!done[i]) done[i] = "compared";
  }

  const k1 = NUMS.filter((x) => x === c1).length;
  const k2 = NUMS.filter((x) => x === c2).length;
  const out = [];
  if (k1 > Math.floor(n / 3)) out.push(c1);
  if (k2 > Math.floor(n / 3)) out.push(c2);
  const mark = Object.fromEntries(NUMS.map((x, i) => [i, x === c1 ? (k1 > n / 3 ? "found" : "excluded") : x === c2 ? (k2 > n / 3 ? "found" : "excluded") : "idle"]));
  yield frame({
    phase: "Verify",
    note: `The survivors are only candidates. Count them: ${c1} appears ${k1} times, ${c2} appears ${k2} times; the bar is more than ${Math.floor(n / 3)}.`,
    detail: `${[[c1, k1], [c2, k2]].filter(([, k]) => k <= n / 3).map(([c]) => `${c} survived the voting but is not a majority`).join("; ") || "Both pass."}. The second pass is not optional.`,
    marks: { rows: [{ name: "nums", values: NUMS, cells: mark }] },
    metrics: votes(),
  });

  yield frame({
    phase: "Done",
    note: `More than n / 3: [${out.join(", ")}].`,
    marks: { rows: [{ name: "nums", values: NUMS, cells: Object.fromEntries(NUMS.map((x, i) => [i, out.includes(x) ? "found" : "idle"])) }] },
    metrics: [result(`[${out.join(",")}]`)],
  });
}

export const lc229 = {
  id: "lc-229",
  section: "Interview problems",
  topic: "C3 · Majority vote (Boyer–Moore)",
  title: "229. Majority Element II",
  blurb: "Two candidates, two counters: a value that matches neither cancels one vote of each. Anything above n / 3 survives; then verify.",
  structure: SEQUENCE,
  run,
  explanation: [
    "At most two values can each appear more than n / 3 times, since three of them would need more than n elements. So keep two candidate slots, each with a vote count, and scan once.",
    "A value equal to a candidate adds a vote. A value that fits an empty slot takes it. A value that matches neither candidate, when both slots are full, cancels one vote from each: in effect, three distinct values are thrown away together. A value with more than n / 3 copies cannot be thrown away completely, because each cancellation removes at most one of its copies along with two other elements, and there are fewer than n / 3 cancellations' worth of other elements.",
    "So every real answer survives as a candidate, but a survivor need not be an answer: in the animation's input, 1 survives with only 3 of 9. A second pass counts both candidates and keeps those above n / 3.",
    { tip: "Signal: \"appears more than n / k times\" with O(1) space. Keep k − 1 candidates (169 is k = 2). The same cancellation idea underlies the Misra–Gries heavy-hitters sketch for streams." },
  ],
  analysis: {
    time: "O(n): two passes",
    space: "O(1)",
    notes: [
      "A hash map of counts is O(n) time and O(n) space, and is the right first answer if space does not matter.",
      "Sorting and scanning runs is O(n log n) time and O(1) extra.",
      "For general k the voting keeps k − 1 counters, costing O(nk) time.",
      "The order of the tests matters: check both candidates before using an empty slot, or one value can occupy both slots.",
    ],
  },
  code: {
    lang: "cpp",
    files: [{
      name: "solution.cpp",
      note: "The LeetCode-shaped solution, plus a main over the animation's input that prints its Result.",
      source: `#include <cstdio>\n#include <vector>\nusing namespace std;\n\n${REFERENCE}\n\nint main() {\n    vector<int> nums{${NUMS.join(", ")}};\n    vector<int> out = Solution().majorityElement(nums);\n    printf("[");\n    for (size_t i = 0; i < out.size(); ++i) printf("%s%d", i ? "," : "", out[i]);\n    printf("]\\n");\n}\n`,
      traced: true,
    }],
  },
  problem: {
    number: 229,
    slug: "majority-element-ii",
    difficulty: "M",
    tier: "core",
    pattern: "C3",
    themes: ["Counting", "O(1) space"],
    statement: [
      "Return every value that appears more than ⌊n / 3⌋ times in an integer array of length n, in any order. Aim for linear time and constant extra space.",
      "Up to 5·10⁴ elements between −10⁹ and 10⁹.",
    ],
    hints: [
      "How many different values can each appear more than n / 3 times?",
      "At most two. Can you keep two candidates and update them in one pass?",
      "If an element matches neither candidate and both have votes, decrement both. Why does that never eliminate a true answer?",
      "The survivors may still be wrong. Count them in a second pass.",
    ],
    brute: "For every element, count its occurrences with a full scan: O(n²). It also misses the space-saving point, though a hash map would fix the time.",
    invariant: "Each cancellation discards three distinct values, so a value with more than n / 3 copies always keeps at least one vote, and ends as a candidate.",
    traps: [
      "Skipping the verification pass: [1, 2, 3] leaves candidates but has no answer.",
      "Testing \"slot empty\" before \"matches a candidate\": the same value can take both slots, and a second value is lost.",
      "Starting both candidates at the same value, such as 0 and 0: with zeros in the input, both slots fill with 0.",
      "Returning a candidate twice.",
    ],
    followUps: [
      "169 Majority Element: one candidate, more than n / 2.",
      "More than n / k times for a general k: k − 1 candidates in a map.",
      "1157 Online Majority Element In Subarray: answer many range queries. Random sampling or a segment tree of voting summaries.",
      "A stream too long to pass twice: the voting gives candidates and upper bounds on error, not exact answers.",
    ],
    tests: {
      fn: "majorityElement",
      args: [{ type: "vector<int>", name: "nums" }],
      starter: STARTER,
      reference: REFERENCE,
      brute: BRUTE,
      normalize: NORMALIZE,
      cases: [
        { name: "example", args: ["{3, 2, 3}"] },
        { name: "one element", args: ["{1}"] },
        { name: "two answers", args: ["{1, 2}"] },
        { name: "no answer", args: ["{1, 2, 3}"] },
        { name: "zeros", args: ["{0, 0, 0, 1, 2}"] },
        { name: "survivor is not a majority", args: ["{2, 1, 2, 3, 1, 2, 1, 3, 2}"] },
      ],
      random: { count: 400, gen: "nums = rnd_vec(rnd(1, 10), 0, 3);" },
      stress: { label: "10⁵ elements (twice the limit), one heavy value", gen: "nums = rnd_vec(100000, 1, 1000000000); for (int i = 0; i < 40000; ++i) nums[rnd(0, 99999)] = 7;" },
    },
  },
};
