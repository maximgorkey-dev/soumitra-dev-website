/**
 * 41 First Missing Positive: use the array as its own hash table by cycling each
 * value v into slot v − 1 (catalogue pattern C4).
 */

import { frame } from "../core/trace.js";
import { SEQUENCE, result } from "./seq-common.js";

const NUMS = [3, 4, -1, 1, 7, 2, 9];

const REFERENCE = `class Solution {
public:
    int firstMissingPositive(vector<int>& nums) {
        int n = nums.size();
        for (int i = 0; i < n; ++i)
            // Send nums[i] to its home slot until slot i holds a misfit or its own value.
            while (nums[i] >= 1 && nums[i] <= n && nums[nums[i] - 1] != nums[i])
                swap(nums[i], nums[nums[i] - 1]);
        for (int i = 0; i < n; ++i)
            if (nums[i] != i + 1) return i + 1;
        return n + 1;
    }
};`;

const BRUTE = `class Solution {
public:
    // Check 1, 2, 3, ... with a linear scan each: O(n^2).
    int firstMissingPositive(vector<int>& nums) {
        for (int v = 1;; ++v)
            if (find(nums.begin(), nums.end(), v) == nums.end()) return v;
    }
};`;

const STARTER = `class Solution {
public:
    int firstMissingPositive(vector<int>& nums) {

    }
};`;

function* run() {
  const a = [...NUMS];
  const n = a.length;
  const home = (i) => a[i] === i + 1;
  const homeCells = (extra = {}) => {
    const cells = {};
    for (let i = 0; i < n; i++) cells[i] = home(i) ? "sorted" : a[i] < 1 || a[i] > n ? "excluded" : "idle";
    return Object.assign(cells, extra);
  };
  const rows = (cells, pointers = []) => [{ name: "nums", values: [...a], labels: a.map((_, i) => `slot ${i + 1}`), cells, pointers }];
  let swaps = 0;

  yield frame({
    phase: "Set up",
    note: `Find the smallest positive integer missing from [${NUMS.join(", ")}], in O(n) time and O(1) extra space.`,
    detail: `The answer is at most n + 1 = ${n + 1}, so only the values 1…${n} matter. Give value v the home slot v − 1, and use the array as its own set.`,
    marks: { rows: rows(homeCells()) },
    metrics: [{ label: "Swaps", value: "0" }],
  });

  for (let i = 0; i < n; i++) {
    while (a[i] >= 1 && a[i] <= n && a[a[i] - 1] !== a[i]) {
      const v = a[i];
      const j = v - 1;
      yield frame({
        phase: "Send home",
        note: `Slot ${i + 1} holds ${v}, whose home is slot ${v}. Swap it there; slot ${i + 1} receives ${a[j]}.`,
        detail: "Each swap puts one value in its home for good, so there are at most n swaps in total.",
        marks: { rows: rows(homeCells({ [i]: "active", [j]: "compared" }), [{ name: "i", at: i }]) },
        metrics: [{ label: "Swaps", value: String(swaps) }],
      });
      [a[i], a[j]] = [a[j], a[i]];
      swaps++;
    }
    const why = home(i) ? "it is already home" : a[i] < 1 || a[i] > n ? `${a[i]} is outside 1…${n}` : `${a[i]}'s home already holds a ${a[i]}`;
    yield frame({
      phase: "Next",
      note: `Slot ${i + 1} holds ${a[i]}: ${why}. Move on.`,
      marks: { rows: rows(homeCells({ [i]: home(i) ? "sorted" : "pivot" }), [{ name: "i", at: i }]) },
      metrics: [{ label: "Swaps", value: String(swaps) }],
    });
  }

  let ans = n + 1;
  for (let i = 0; i < n; i++) if (!home(i)) { ans = i + 1; break; }
  yield frame({
    phase: "Done",
    note: ans <= n
      ? `Scan for the first slot not holding its own number: slot ${ans} holds ${a[ans - 1]}, so ${ans} is missing.`
      : `Every slot holds its own number, so 1…${n} are all present and the answer is ${n + 1}.`,
    marks: { rows: rows(homeCells(ans <= n ? { [ans - 1]: "found" } : {})) },
    metrics: [{ label: "Swaps", value: String(swaps) }, result(ans)],
  });
}

export const lc41 = {
  id: "lc-41",
  section: "Interview problems",
  topic: "C4 · Cyclic placement",
  title: "41. First Missing Positive",
  blurb: "Only 1…n can matter, so the array itself is the hash set: swap each value into its home slot, then scan for the first slot that is wrong.",
  structure: SEQUENCE,
  run,
  explanation: [
    "With n numbers, the answer is between 1 and n + 1: n numbers cannot cover all of 1…n + 1. So values ≤ 0 or > n are irrelevant, and a set over 1…n would solve it. The O(1)-space requirement rules out a separate set, but the array has exactly n slots, one per possible value.",
    "Give value v the home slot v − 1. Walk the array; while slot i holds a value v in 1…n that is not yet at home, swap it into slot v − 1. That brings a new value into slot i, so repeat. Stop when slot i holds a misfit (out of range, or a duplicate whose home is taken) or its own value.",
    "Each swap puts one value permanently in its home, so there are at most n swaps in total, and the nested loop is O(n) overall. A final scan returns the first slot i whose value is not i + 1, or n + 1 if every slot is right. The animation colours values that are home green and out-of-range values grey.",
    { tip: "Signal: values in 1…n (or 0…n − 1) plus a demand for O(1) space. Cyclic swaps give 268, 442, 448 and 645. A variant marks presence by flipping the sign of nums[v − 1] instead of swapping." },
  ],
  analysis: {
    time: "O(n): at most n swaps, plus two linear passes",
    space: "O(1) extra; the input is reordered",
    notes: [
      "The while condition must test nums[nums[i] − 1] != nums[i], not nums[i] != i + 1. With duplicates, the second version swaps two equal values forever.",
      "A hash set or a boolean array of size n + 1 is the obvious O(n)-space solution and is worth stating first in an interview.",
      "Sorting gives O(n log n) and O(1) space but misses the required bound.",
      "The sign-marking variant first replaces every value outside 1…n by n + 1, then marks v as present by making nums[v − 1] negative.",
    ],
  },
  code: {
    lang: "cpp",
    files: [{
      name: "solution.cpp",
      note: "The LeetCode-shaped solution, plus a main over the animation's input that prints its Result.",
      source: `#include <cstdio>\n#include <utility>\n#include <vector>\nusing namespace std;\n\n${REFERENCE}\n\nint main() {\n    vector<int> nums{${NUMS.join(", ")}};\n    printf("%d\\n", Solution().firstMissingPositive(nums));\n}\n`,
      traced: true,
    }],
  },
  problem: {
    number: 41,
    slug: "first-missing-positive",
    difficulty: "H",
    tier: "core",
    pattern: "C4",
    themes: ["In-place", "O(1) space"],
    statement: [
      "Given an unsorted integer array, return the smallest positive integer that does not appear in it. Your algorithm must run in O(n) time and use O(1) auxiliary space.",
      "Up to 10⁵ elements, each between −2³¹ and 2³¹ − 1.",
    ],
    hints: [
      "With n elements, what is the largest the answer can be?",
      "n + 1. So only the values 1…n matter. Where could you record which of them are present, without extra memory?",
      "In the array itself: value v belongs in slot v − 1. Swap each value towards its slot.",
      "Loop while nums[i] is in range and nums[nums[i] − 1] != nums[i]. Then the first slot i with nums[i] != i + 1 gives the answer.",
    ],
    brute: "Try 1, 2, 3, … and scan the whole array for each: O(n²) when the array is a permutation of 1…n, 10¹⁰ steps at 10⁵. The stress case is exactly that.",
    invariant: "After processing slot i, every value in 1…n that has been seen so far is in its home slot, or a copy of it already is. Each swap fixes one home permanently, so the total work is O(n).",
    traps: [
      "Looping on nums[i] != i + 1: with duplicates the swap exchanges two equal values and never terminates.",
      "Advancing i after one swap instead of looping: the value swapped into slot i also needs placing.",
      "Returning n instead of n + 1 when 1…n are all present.",
      "nums[i] − 1 as an index when nums[i] is INT_MIN: check the range first.",
    ],
    followUps: [
      "268 Missing Number and 448 Find All Numbers Disappeared in an Array: the same placement on 0…n or 1…n.",
      "442 Find All Duplicates in an Array: after placement, every slot holding the wrong value holds a duplicate.",
      "You may not modify the input. Is O(1) space still possible? (No, not in O(n) time.)",
      "Find the kth missing positive (1539), where the array is sorted: binary search on arr[i] − (i + 1).",
    ],
    tests: {
      fn: "firstMissingPositive",
      args: [{ type: "vector<int>", name: "nums" }],
      starter: STARTER,
      reference: REFERENCE,
      brute: BRUTE,
      cases: [
        { name: "example", args: ["{1, 2, 0}"] },
        { name: "example 2", args: ["{3, 4, -1, 1}"] },
        { name: "example 3", args: ["{7, 8, 9, 11, 12}"] },
        { name: "permutation", args: ["{2, 3, 1}"] },
        { name: "duplicates", args: ["{1, 1, 2, 2}"] },
        { name: "extremes", args: ["{INT_MIN, INT_MAX, 1}"] },
        { name: "one element", args: ["{1}"] },
      ],
      random: { count: 400, gen: "nums = rnd_vec(rnd(1, 8), -2, 9);" },
      stress: { label: "a shuffled 1…10⁵", gen: "nums.resize(100000); for (int i = 0; i < 100000; ++i) nums[i] = i + 1; for (int i = 99999; i > 0; --i) swap(nums[i], nums[rnd(0, i)]);" },
    },
  },
};
