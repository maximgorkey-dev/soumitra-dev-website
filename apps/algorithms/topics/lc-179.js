/**
 * 179 Largest Number: an exchange argument gives the sort key a + b > b + a
 * (catalogue pattern C5).
 */

import { frame } from "../core/trace.js";
import { SEQUENCE, result } from "./seq-common.js";

const NUMS = [3, 30, 34, 5, 9];

const REFERENCE = `class Solution {
public:
    string largestNumber(vector<int>& nums) {
        vector<string> s;
        for (int x : nums) s.push_back(to_string(x));
        // a goes first exactly when a then b beats b then a.
        sort(s.begin(), s.end(), [](const string& a, const string& b) { return a + b > b + a; });
        if (s[0] == "0") return "0";  // all zeros
        string out;
        for (const string& t : s) out += t;
        return out;
    }
};`;

const BRUTE = `class Solution {
public:
    // Try every order: O(n! * total length).
    string largestNumber(vector<int>& nums) {
        vector<string> s;
        for (int x : nums) s.push_back(to_string(x));
        sort(s.begin(), s.end());
        string best;
        do {
            string cur;
            for (const string& t : s) cur += t;
            best = max(best, cur);  // every order has the same length
        } while (next_permutation(s.begin(), s.end()));
        return best[0] == '0' ? "0" : best;
    }
};`;

const STARTER = `class Solution {
public:
    string largestNumber(vector<int>& nums) {

    }
};`;

function* run() {
  const s = NUMS.map(String);
  const before = (a, b) => a + b > b + a;
  let comparisons = 0;
  const rows = (cells = {}, pointers = [], ranges = []) => [{ name: "order", values: [...s], cells, pointers, ranges }];

  yield frame({
    phase: "Set up",
    note: `Arrange [${NUMS.join(", ")}] so that their concatenation is as large as possible.`,
    detail: "Sorting by value or as plain strings fails: 3 must come before 30, but 34 before 3. Compare two pieces directly: put a first exactly when a + b > b + a as strings.",
    marks: { rows: rows() },
    metrics: [{ label: "Comparisons", value: "0" }],
  });

  for (let i = 1; i < s.length; i++) {
    let j = i;
    while (j > 0) {
      const a = s[j], b = s[j - 1];
      const swap = before(a, b);
      comparisons++;
      yield frame({
        phase: swap ? "Swap" : "Keep",
        note: `${a} or ${b} first? "${a}${b}" ${swap ? ">" : "<"} "${b}${a}", so ${swap ? `${a} moves ahead of ${b}` : `${b} stays ahead`}.`,
        detail: comparisons === 1 ? "Swapping two adjacent pieces changes only their joint stretch of digits; the rest of the number is untouched. So the better local order is better globally: an exchange argument." : undefined,
        marks: { rows: rows({ [j]: "active", [j - 1]: "compared" }, [{ name: "i", at: i }], i > 1 ? [{ from: 0, to: i - 1, label: "ordered so far" }] : []) },
        metrics: [{ label: "Comparisons", value: String(comparisons) }],
      });
      if (!swap) break;
      [s[j], s[j - 1]] = [s[j - 1], s[j]];
      j--;
    }
  }

  const out = s[0] === "0" ? "0" : s.join("");
  yield frame({
    phase: "Done",
    note: `Concatenate in this order: ${out}.`,
    detail: "The comparison is transitive (a + b > b + a compares a and b as infinite repetitions), so any sort produces the same answer. One edge case: if the first piece is \"0\", everything is zero and the answer is \"0\", not \"000\".",
    marks: { rows: rows(Object.fromEntries(s.map((_, i) => [i, "sorted"]))) },
    metrics: [{ label: "Comparisons", value: String(comparisons) }, result(out)],
  });
}

export const lc179 = {
  id: "lc-179",
  section: "Interview problems",
  topic: "C5 · Exchange argument",
  title: "179. Largest Number",
  blurb: "Ask which of two adjacent pieces should come first: a before b exactly when a + b > b + a. That comparison is the sort key.",
  structure: SEQUENCE,
  run,
  explanation: [
    "The numbers are pieces of digits to be concatenated. Numeric order fails at once (9 must beat 30). Descending string order is closer but still wrong: it puts \"30\" before \"3\", giving 303 instead of 330. The right question is local: for two neighbours a and b, which order is better?",
    "Swapping two adjacent pieces changes only their joint stretch of digits, and that stretch has the same length either way. So a should precede b exactly when the string a + b is larger than b + a. If a final order had a neighbouring pair in the wrong order, swapping them would give a larger number, so the best order has every pair right: it is sorted by this comparison.",
    "For std::sort the comparison must be a strict weak ordering. It is: a + b > b + a is the same as comparing the infinite repetitions aaa… and bbb…, which is transitive. The animation runs an insertion sort so every comparison is visible.",
    { tip: "Signal: \"arrange to maximise or minimise\", where the cost of an order depends on neighbouring pairs. Write the cost of a·b vs b·a, simplify, and sort by it. Other examples: 406 Queue Reconstruction by Height, 1665 Minimum Initial Energy (sort by minimum − actual), and scheduling jobs by weight / time." },
  ],
  analysis: {
    time: "O(n log n · L), where L ≤ 10 digits per number",
    space: "O(n · L) for the strings",
    notes: [
      "Every comparison builds two strings of up to 20 characters. Comparing the numbers with arithmetic, as a · 10^len(b) + b vs b · 10^len(a) + a in 64 bits, avoids the allocation.",
      "Trying every order is O(n!): at n = 10 that is already 3.6 million orders.",
      "The comparison must be strict (>), not ≥: std::sort with a non-strict comparator is undefined behaviour and can crash.",
    ],
  },
  code: {
    lang: "cpp",
    files: [{
      name: "solution.cpp",
      note: "The LeetCode-shaped solution, plus a main over the animation's input that prints its Result.",
      source: `#include <algorithm>\n#include <cstdio>\n#include <string>\n#include <vector>\nusing namespace std;\n\n${REFERENCE}\n\nint main() {\n    vector<int> nums{${NUMS.join(", ")}};\n    printf("%s\\n", Solution().largestNumber(nums).c_str());\n}\n`,
      traced: true,
    }],
  },
  problem: {
    number: 179,
    slug: "largest-number",
    difficulty: "M",
    tier: "core",
    pattern: "C5",
    themes: ["Custom sort", "Strings"],
    statement: [
      "Given non-negative integers, arrange them so that writing them one after another forms the largest possible number, and return that number as a string.",
      "Up to 100 numbers, each between 0 and 10⁹.",
    ],
    hints: [
      "Why does plain string sorting fail? Try 3 and 30, then 3 and 34.",
      "Look at just two neighbours a and b. What decides which should come first?",
      "Compare the strings a + b and b + a. Sort with that comparison.",
      "What should [0, 0] return?",
    ],
    brute: "Try every order and keep the largest string: O(n!), fine for six numbers and impossible for 100.",
    invariant: "In the output, every adjacent pair satisfies a + b ≥ b + a; otherwise swapping them would give a larger number.",
    traps: [
      "Sorting numerically, or as plain strings in descending order: \"30\" > \"3\" puts 30 first, giving 303 instead of 330.",
      "Returning \"00\" for [0, 0].",
      "A non-strict comparator (>=) in std::sort, which is undefined behaviour.",
    ],
    followUps: [
      "The smallest number instead (with leading zeros disallowed): flip the comparison, then deal with zeros.",
      "Prove the comparison is transitive.",
      "406 Queue Reconstruction by Height and 1665 Minimum Initial Energy to Finish Tasks: the same exchange argument, different keys.",
      "321 Create Maximum Number: digits from two arrays, keeping relative order. A different technique (monotonic stack and merge), but the merge uses the same lexicographic comparison of suffixes.",
    ],
    tests: {
      fn: "largestNumber",
      args: [{ type: "vector<int>", name: "nums" }],
      starter: STARTER,
      reference: REFERENCE,
      brute: BRUTE,
      cases: [
        { name: "example", args: ["{10, 2}"] },
        { name: "example 2", args: ["{3, 30, 34, 5, 9}"] },
        { name: "all zeros", args: ["{0, 0}"] },
        { name: "one number", args: ["{1000000000}"] },
        { name: "close call", args: ["{9, 91, 919}"] },
        { name: "shared prefix", args: ["{121, 12}"] },
      ],
      random: { count: 400, gen: "nums = rnd_vec(rnd(1, 6), 0, 130);" },
      stress: { label: "100 numbers", gen: "nums = rnd_vec(100, 0, 1000000000);" },
    },
  },
};
