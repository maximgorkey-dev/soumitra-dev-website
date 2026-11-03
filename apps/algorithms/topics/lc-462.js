/**
 * 462 Minimum Moves to Equal Array Elements II: the median minimises the sum of
 * absolute distances (catalogue pattern C1).
 */

import { frame } from "../core/trace.js";
import { SEQUENCE, result, span } from "./seq-common.js";

const NUMS = [1, 10, 2, 9, 3];

const REFERENCE = `class Solution {
public:
    int minMoves2(vector<int>& nums) {
        int n = nums.size();
        // Any median works; nth_element finds one in O(n) on average.
        nth_element(nums.begin(), nums.begin() + n / 2, nums.end());
        long long med = nums[n / 2], moves = 0;
        for (int x : nums) moves += llabs(x - med);
        return moves;
    }
};`;

const BRUTE = `class Solution {
public:
    // Try every element as the target: O(n^2).
    int minMoves2(vector<int>& nums) {
        long long best = LLONG_MAX;
        for (int t : nums) {
            long long moves = 0;
            for (int x : nums) moves += llabs((long long)x - t);
            best = min(best, moves);
        }
        return best;
    }
};`;

const STARTER = `class Solution {
public:
    int minMoves2(vector<int>& nums) {

    }
};`;

function* run() {
  const sorted = [...NUMS].sort((a, b) => a - b);
  const n = sorted.length;
  const cost = (t) => sorted.reduce((s, x) => s + Math.abs(x - t), 0);
  const costs = sorted.map(() => null);
  const mid = Math.floor(n / 2);

  const rows = (cells = {}, ptr = -1, ranges = []) => [
    { name: "nums", values: NUMS },
    { name: "sorted", values: sorted, cells, pointers: ptr >= 0 ? [{ name: "target", at: ptr }] : [], ranges },
    { name: "cost", values: [...costs], cells: Object.fromEntries(costs.map((c, i) => [i, c === null ? "idle" : c === Math.min(...costs.filter((x) => x !== null)) ? "found" : "compared"])) },
  ];

  yield frame({
    phase: "Set up",
    note: `Make every element of [${NUMS.join(", ")}] equal, moving one element by ±1 per step. Which common value is cheapest?`,
    detail: "Turning everything into t costs Σ |x − t|. Sort first so the effect of moving t is easy to see.",
    marks: { rows: rows() },
    metrics: [],
  });

  for (let i = 0; i < n; i++) {
    costs[i] = cost(sorted[i]);
    yield frame({
      phase: "Try",
      note: `Target ${sorted[i]}: the cost is ${sorted.map((x) => `|${x} − ${sorted[i]}|`).join(" + ")} = ${costs[i]}.`,
      detail: `Moving the target right by 1 makes the ${i + 1} element${i ? "s" : ""} at or left of it 1 costlier and the ${n - i - 1} to its right 1 cheaper.`,
      marks: { rows: rows({ [i]: "active" }, i) },
      metrics: [{ label: "Cheapest so far", value: String(Math.min(...costs.filter((x) => x !== null))) }],
    });
  }

  yield frame({
    phase: "Why the median",
    note: `The cost falls while more elements are right of the target than left of it, and rises after. It bottoms out at the middle element, ${sorted[mid]}.`,
    detail: "So the answer needs only the median, which nth_element finds in O(n) without a full sort.",
    marks: { rows: rows({ ...span(0, mid - 1, "compared"), [mid]: "found", ...span(mid + 1, n - 1, "compared") }, mid, [{ from: 0, to: mid - 1, label: `${mid} below` }, { from: mid + 1, to: n - 1, label: `${n - mid - 1} above` }]) },
    metrics: [{ label: "Cheapest so far", value: String(costs[mid]) }],
  });

  yield frame({
    phase: "Done",
    note: `Move everything to the median ${sorted[mid]}: ${costs[mid]} moves.`,
    marks: { rows: rows({ [mid]: "found" }, mid) },
    metrics: [result(costs[mid])],
  });
}

export const lc462 = {
  id: "lc-462",
  section: "Interview problems",
  topic: "C1 · The median lemma",
  title: "462. Minimum Moves to Equal Array Elements II",
  blurb: "Σ|x − t| is smallest when t is a median: moving t towards the side with more elements always pays.",
  structure: SEQUENCE,
  run,
  explanation: [
    "If every element becomes t, the cost is Σ |x − t|. As a function of t this is piecewise linear. Moving t one step right makes it one step further from every element at or left of it and one step closer to every element right of it, so the slope is (elements left) − (elements right).",
    "That slope is negative while most elements are to the right, and positive once most are to the left. The minimum is where it crosses zero: at a median. For an odd count that is the middle element; for an even count, any t between the two middle elements is optimal.",
    "So the problem is really \"find the median\". Sorting gives O(n log n); nth_element (quickselect) gives O(n) on average. The animation tries every element as the target, and the costs fall and then rise, bottoming out at the middle.",
    { tip: "Signal: minimise a sum of absolute differences, distances on a line, or moves by ±1. The median works separately in each coordinate for Manhattan distance (296 Best Meeting Point). If the step size is fixed, as in 2033, check divisibility first. The mean minimises squared distances, not absolute ones." },
  ],
  analysis: {
    time: "O(n) on average with nth_element, O(n log n) with a sort",
    space: "O(1) extra (nth_element works in place)",
    notes: [
      "The brute force that tries every element as the target is O(n²). It is correct, because the optimum is always at an element.",
      "The answer can be just under 2³¹, and a running sum in int has no margin. Accumulate in long long.",
      "The common wrong answer is the mean. It minimises Σ (x − t)², which is a different objective.",
      "For a weighted version (each element has a cost per move), the weighted median, where half the total weight is on each side, is optimal.",
    ],
  },
  code: {
    lang: "cpp",
    files: [{
      name: "solution.cpp",
      note: "The LeetCode-shaped solution, plus a main over the animation's input that prints its Result.",
      source: `#include <algorithm>\n#include <cstdio>\n#include <cstdlib>\n#include <vector>\nusing namespace std;\n\n${REFERENCE}\n\nint main() {\n    vector<int> nums{${NUMS.join(", ")}};\n    printf("%d\\n", Solution().minMoves2(nums));\n}\n`,
      traced: true,
    }],
  },
  problem: {
    number: 462,
    slug: "minimum-moves-to-equal-array-elements-ii",
    difficulty: "M",
    tier: "core",
    pattern: "C1",
    themes: ["Make the array", "Median"],
    statement: [
      "In one move you may add 1 to, or subtract 1 from, any single element. Return the fewest moves that make every element of the array equal.",
      "Up to 10⁵ elements between −10⁹ and 10⁹; the answer fits in a 32-bit int.",
    ],
    hints: [
      "If everything ends up equal to t, what does that cost, as a formula in t?",
      "Σ |x − t|. How does it change when t moves one step to the right?",
      "It changes by (number of elements ≤ t) − (number of elements > t). When is that zero?",
      "At a median. Find it with nth_element in O(n), or by sorting.",
    ],
    brute: "Try every element as the common target and sum the distances: O(n²), 10¹⁰ steps at n = 10⁵. It is correct, since the best target is always one of the elements, but it times out on the stress case.",
    invariant: "For t between the ith and (i + 1)th smallest elements, the cost's slope is i − (n − i). It is ≤ 0 up to the median and ≥ 0 after it, so the median is a global minimum.",
    traps: [
      "Using the mean instead of the median.",
      "Overflow: in an O(n log n) sort-and-try-each-split variant, prefix sums reach 10¹⁴. Use long long throughout.",
      "Thinking an even-length array needs the average of the two middle values: any value between them is optimal, including either one.",
    ],
    followUps: [
      "296 Best Meeting Point: Manhattan distance on a grid separates into rows and columns, so take the median of each.",
      "2033 Minimum Operations to Make a Uni-Value Grid: moves are ±x, so first check that all values are congruent mod x, then use the median.",
      "2448 Minimum Cost to Make Array Equal: each element has its own cost per move. Use the weighted median.",
      "The numbers arrive as a stream and you must report the answer after each one. Two heaps keep the median; how do you keep the sum of distances?",
    ],
    tests: {
      fn: "minMoves2",
      args: [{ type: "vector<int>", name: "nums" }],
      starter: STARTER,
      reference: REFERENCE,
      brute: BRUTE,
      cases: [
        { name: "example", args: ["{1, 2, 3}"] },
        { name: "example 2", args: ["{1, 10, 2, 9}"] },
        { name: "one element", args: ["{7}"] },
        { name: "already equal", args: ["{4, 4, 4}"] },
        { name: "near the int limit", args: ["{-1000000000, -999999999, 1000000000}"] },
        { name: "negatives", args: ["{-5, -1, -3, 2}"] },
      ],
      random: { count: 400, gen: "nums = rnd_vec(rnd(1, 10), -10, 10);" },
      stress: { label: "10⁵ elements", gen: "nums = rnd_vec(100000, -5000, 5000);" },
    },
  },
};
