/**
 * 42 Trapping Rain Water: two pointers moving the lower side (catalogue pattern A5).
 */

import { frame } from "../core/trace.js";
import { SEQUENCE, result } from "./seq-common.js";

const H = [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1];

const REFERENCE = `class Solution {
public:
    int trap(vector<int>& height) {
        int l = 0, r = (int)height.size() - 1, leftMax = 0, rightMax = 0, water = 0;
        while (l < r) {
            // The lower side is settled: its level is capped by its own max,
            // because the other side already has a wall at least that tall.
            if (height[l] < height[r]) {
                leftMax = max(leftMax, height[l]);
                water += leftMax - height[l++];
            } else {
                rightMax = max(rightMax, height[r]);
                water += rightMax - height[r--];
            }
        }
        return water;
    }
};`;

const BRUTE = `class Solution {
public:
    // For every bar, scan both sides for the tallest wall: O(n^2).
    int trap(vector<int>& height) {
        int n = height.size(), water = 0;
        for (int i = 0; i < n; ++i) {
            int lm = 0, rm = 0;
            for (int j = 0; j <= i; ++j) lm = max(lm, height[j]);
            for (int j = i; j < n; ++j) rm = max(rm, height[j]);
            water += min(lm, rm) - height[i];
        }
        return water;
    }
};`;

const STARTER = `class Solution {
public:
    int trap(vector<int>& height) {

    }
};`;

function* run() {
  const n = H.length;
  const water = Array(n).fill(null);
  let l = 0;
  let r = n - 1;
  let lm = 0;
  let rm = 0;
  let total = 0;

  const rows = (cells = {}) => [
    {
      name: "height", values: H,
      cells: { ...Object.fromEntries(water.map((w, i) => [i, w === null ? "idle" : "sorted"]).filter(([, s]) => s !== "idle")), ...cells },
      pointers: l <= r ? [{ name: "l", at: l }, { name: "r", at: r }] : [],
    },
    { name: "water", values: water.map((w) => (w === null ? null : w)), cells: Object.fromEntries(water.map((w, i) => [i, w ? "found" : "idle"])) },
  ];
  const metrics = () => [{ label: "leftMax", value: String(lm) }, { label: "rightMax", value: String(rm) }, { label: "Water", value: String(total) }];

  yield frame({
    phase: "Set up",
    note: "How much rain stays on top of these bars? Over a bar, water rises to the lower of the tallest wall on its left and the tallest on its right.",
    detail: "Two pointers start at the ends. Whichever side is lower can be settled now.",
    marks: { rows: rows() },
    metrics: metrics(),
  });

  while (l < r) {
    if (H[l] < H[r]) {
      lm = Math.max(lm, H[l]);
      const w = lm - H[l];
      water[l] = w;
      total += w;
      yield frame({
        phase: "Left",
        note: `height[l] = ${H[l]} < height[r] = ${H[r]}, so the left side is lower. Bar ${l} holds leftMax − height = ${lm} − ${H[l]} = ${w}.`,
        detail: `The right side already has a wall of ${H[r]} > ${H[l]}, so the right wall cannot be what limits bar ${l}: only leftMax can.`,
        marks: { rows: rows({ [l]: "active", [r]: "compared" }) },
        metrics: metrics(),
      });
      l++;
    } else {
      rm = Math.max(rm, H[r]);
      const w = rm - H[r];
      water[r] = w;
      total += w;
      yield frame({
        phase: "Right",
        note: `height[r] = ${H[r]} ≤ height[l] = ${H[l]}, so settle the right side. Bar ${r} holds rightMax − height = ${rm} − ${H[r]} = ${w}.`,
        marks: { rows: rows({ [r]: "active", [l]: "compared" }) },
        metrics: metrics(),
      });
      r--;
    }
  }
  water[l] = 0;

  yield frame({
    phase: "Done",
    note: `The pointers meet at the tallest bar, which holds nothing. ${total} units of water in total.`,
    marks: { rows: rows() },
    metrics: [...metrics(), result(total)],
  });
}

export const lc42 = {
  id: "lc-42",
  section: "Interview problems",
  topic: "A5 · Two pointers",
  title: "42. Trapping Rain Water",
  blurb: "Water over a bar is capped by the lower of its two tallest walls; move inward from whichever side is lower, which is already decided.",
  structure: SEQUENCE,
  run,
  explanation: [
    "The water above bar i is min(tallest on its left, tallest on its right) − height[i]. Precomputing both maxima as arrays gives an O(n)-space solution, and is a perfectly good first answer in an interview.",
    "Two pointers remove the arrays. Always moving the lower pointer keeps one fact true: every bar either pointer has passed is no taller than the taller of the two current bars. So when height[l] < height[r], leftMax ≤ height[r], and bar r is a right wall at least as tall as anything on the left. Bar l's water is therefore leftMax − height[l], whatever lies between l and r, and l can move.",
    "The symmetric case settles the right side. Each step settles one bar, so the pass is O(n) time and O(1) extra space. The animation shades each bar as it is settled and writes its water underneath.",
    { tip: "Signal: water held between bars, or any quantity limited by the smaller of a prefix maximum and a suffix maximum. 407 Trapping Rain Water II is the 2D version: a min-heap over the boundary replaces the two pointers." },
  ],
  analysis: {
    time: "O(n): each bar is settled once",
    space: "O(1) beyond the input",
    notes: [
      "The prefix- and suffix-maximum arrays version is O(n) space and easier to prove; mention it first, then improve.",
      "A monotonic stack also works, filling water layer by layer between a bar and the next taller bar. It is O(n) too, and generalises less well.",
      "Ties go to the right side here (≤); either choice is correct because the two sides are equal.",
      "The total fits in int: at most 2·10⁴ bars × 10⁵ height.",
    ],
  },
  code: {
    lang: "cpp",
    files: [{
      name: "solution.cpp",
      note: "The LeetCode-shaped solution, plus a main over the animation's input that prints its Result.",
      source: `#include <algorithm>\n#include <cstdio>\n#include <vector>\nusing namespace std;\n\n${REFERENCE}\n\nint main() {\n    vector<int> height{${H.join(", ")}};\n    printf("%d\\n", Solution().trap(height));\n}\n`,
      traced: true,
    }],
  },
  problem: {
    number: 42,
    slug: "trapping-rain-water",
    difficulty: "H",
    tier: "core",
    pattern: "A5",
    themes: [],
    statement: [
      "Bars of width 1 stand side by side with the given heights. After rain, water collects in the dips between them. Return how many units of water are trapped.",
      "Up to 2·10⁴ bars, each between 0 and 10⁵ high.",
    ],
    hints: [
      "Think about one bar. How high does the water above it rise?",
      "To the lower of the tallest bar on its left and the tallest bar on its right. That gives an O(n) solution with two precomputed arrays.",
      "To drop the arrays, walk two pointers in from the ends. If height[l] < height[r], what do you already know about bar l's right wall?",
      "It is at least height[r], so bar l is limited by leftMax alone. Settle it and move l; otherwise settle r.",
    ],
    brute: "For every bar, scan left and right for the tallest walls: O(n²). The stress case uses 2·10⁵ bars, ten times LeetCode's limit, so the quadratic scan runs out of time.",
    invariant: "Every bar already passed is no taller than max(height[l], height[r]). So if height[l] < height[r], then leftMax ≤ height[r]: the left wall is the lower one for bar l, and its water is leftMax − height[l]. Mirrored for r.",
    traps: [
      "Updating leftMax after computing the water instead of before: with the update first, the water is never negative.",
      "Moving the taller side instead of the lower one: then neither bound is known.",
      "Looping while l ≤ r is harmless here but unnecessary: the bar where the pointers meet is the tallest seen, so it holds no water.",
    ],
    followUps: [
      "407 Trapping Rain Water II (a 2D height map): push the border into a min-heap and flood inwards from the lowest wall.",
      "11 Container With Most Water looks similar but asks for one pair of walls; the same \"move the lower side\" argument proves it.",
      "Return the water level above every bar, not just the total.",
      "Bars arrive as a stream from the left. What can you report before the stream ends?",
    ],
    tests: {
      fn: "trap",
      args: [{ type: "vector<int>", name: "height" }],
      starter: STARTER,
      reference: REFERENCE,
      brute: BRUTE,
      cases: [
        { name: "example", args: ["{0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1}"] },
        { name: "example 2", args: ["{4, 2, 0, 3, 2, 5}"] },
        { name: "one bar", args: ["{5}"] },
        { name: "increasing", args: ["{1, 2, 3, 4}"] },
        { name: "valley", args: ["{5, 0, 5}"] },
        { name: "plateau", args: ["{3, 3, 3}"] },
      ],
      random: { count: 400, gen: "height = rnd_vec(rnd(1, 12), 0, 6);" },
      stress: { label: "2·10⁵ bars", gen: "height = rnd_vec(200000, 0, 100000);" },
    },
  },
};
