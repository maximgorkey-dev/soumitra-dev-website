/**
 * 84 Largest Rectangle in Histogram: monotonic stack (catalogue pattern A2).
 */

import { frame } from "../core/trace.js";
import { SEQUENCE, result, span } from "./seq-common.js";

const H = [2, 1, 5, 6, 2, 3];

const REFERENCE = `class Solution {
public:
    int largestRectangleArea(vector<int>& heights) {
        int n = heights.size(), best = 0;
        vector<int> st;  // indices; their heights never decrease bottom to top
        for (int i = 0; i <= n; ++i) {
            int h = i == n ? 0 : heights[i];  // the 0 at the end flushes the stack
            while (!st.empty() && heights[st.back()] >= h) {
                int top = st.back();
                st.pop_back();
                // i is the first bar to the right that is not taller; the new
                // top is the last one to the left that is shorter.
                int left = st.empty() ? -1 : st.back();
                best = max(best, heights[top] * (i - left - 1));
            }
            st.push_back(i);
        }
        return best;
    }
};`;

const BRUTE = `class Solution {
public:
    // Every left end, growing right while tracking the minimum: O(n^2).
    int largestRectangleArea(vector<int>& heights) {
        int n = heights.size(), best = 0;
        for (int l = 0; l < n; ++l) {
            int low = INT_MAX;
            for (int r = l; r < n; ++r) {
                low = min(low, heights[r]);
                best = max(best, low * (r - l + 1));
            }
        }
        return best;
    }
};`;

const STARTER = `class Solution {
public:
    int largestRectangleArea(vector<int>& heights) {

    }
};`;

function* run() {
  const n = H.length;
  const values = [...H, 0];
  const labels = [...H.map((_, i) => i), "end"];
  const st = [];
  let best = 0;
  let bestSpan = null;

  const rows = (i, cells = {}, ranges = []) => [
    {
      name: "heights",
      values,
      labels,
      cells: { [n]: "excluded", ...(i >= 0 && i <= n ? { [i]: "active" } : {}), ...cells },
      pointers: i >= 0 && i <= n ? [{ name: "i", at: i }] : [],
      ranges: [...ranges, ...(bestSpan ? [{ from: bestSpan[0], to: bestSpan[1], label: `best = ${best}`, state: "best" }] : [])],
    },
    { name: "stack", values: st.map((k) => H[k]), labels: st.map((k) => `#${k}`), cells: st.length ? { [st.length - 1]: "selected" } : {} },
  ];
  const metrics = (extra = []) => [{ label: "Best area", value: String(best) }, ...extra];

  yield frame({
    phase: "Set up",
    note: "Find the largest rectangle that fits under the bars [2, 1, 5, 6, 2, 3].",
    detail: "Every rectangle has a shortest bar. Measure each bar's widest rectangle at the moment we learn where it ends on both sides.",
    marks: { rows: rows(-1) },
    metrics: metrics(),
  });

  for (let i = 0; i <= n; i++) {
    const h = i === n ? 0 : H[i];
    if (i === n) {
      yield frame({
        phase: "Flush",
        note: "Past the last bar, pretend there is a bar of height 0. It is shorter than everything, so it pops every bar still waiting.",
        marks: { rows: rows(i) },
        metrics: metrics(),
      });
    }
    while (st.length && H[st[st.length - 1]] >= h) {
      const top = st.pop();
      const left = st.length ? st[st.length - 1] : -1;
      const width = i - left - 1;
      const area = H[top] * width;
      const improved = area > best;
      if (improved) {
        best = area;
        bestSpan = [left + 1, i - 1];
      }
      yield frame({
        phase: "Pop",
        note: `Bar ${top} (height ${H[top]}) is popped: bar ${i === n ? "end" : i} is not taller, so its rectangle stops before it, and ${left < 0 ? "nothing shorter is left of it, so it reaches index 0" : `bar ${left} below it on the stack is shorter, so it starts after ${left}`}.`,
        detail: `${H[top]} × (${i} − ${left} − 1) = ${H[top]} × ${width} = ${area}${improved ? ", a new best" : `, not better than ${best}`}.`,
        marks: { rows: rows(i, { ...span(left + 1, i - 1, "selected"), [top]: "pivot" }, [{ from: left + 1, to: i - 1, label: `${H[top]} × ${width} = ${area}` }]) },
        metrics: metrics(),
      });
    }
    if (i < n) {
      st.push(i);
      yield frame({
        phase: "Push",
        note: `Push bar ${i} (height ${h}). Every bar on the stack is now no taller than the one above it, so none of them has found its right edge yet.`,
        marks: { rows: rows(i) },
        metrics: metrics(),
      });
    }
  }

  yield frame({
    phase: "Done",
    note: `Every bar was pushed once and popped once. The largest rectangle has area ${best}.`,
    detail: `Bars ${bestSpan[0]} to ${bestSpan[1]}, height ${best / (bestSpan[1] - bestSpan[0] + 1)}.`,
    marks: { rows: rows(-1) },
    metrics: metrics([result(best)]),
  });
}

export const lc84 = {
  id: "lc-84",
  section: "Interview problems",
  topic: "A2 · Monotonic stack",
  title: "84. Largest Rectangle in Histogram",
  blurb: "Each bar is the shortest bar of exactly one candidate rectangle; a stack finds both of its edges in one pass.",
  structure: SEQUENCE,
  run,
  explanation: [
    "Any rectangle under the histogram is limited by its shortest bar. So instead of enumerating rectangles, enumerate that bar: for each bar t, the best rectangle in which t is the shortest stretches left until the first shorter bar and right until the first shorter bar. The answer is the largest of those n rectangles.",
    "That turns the problem into **previous smaller** and **next smaller** for every bar, which one stack pass gives together. The stack holds indices whose heights never decrease from bottom to top. When bar i is not taller than the top, the top's right edge has just been found (it is i), and its left edge is whatever sits below it on the stack, since everything between those two was popped earlier for being taller.",
    "Each index is pushed once and popped once, so the pass is linear even though there is a loop inside a loop. A bar of height 0 placed after the end pops whatever is left; without it, an increasing histogram would never measure anything.",
    { tip: "Signal: \"largest rectangle\", \"minimum times width\", or any score of the form min(range) × length. The same stack also solves 85 Maximal Rectangle, one row at a time." },
  ],
  analysis: {
    time: "O(n): every index is pushed and popped exactly once",
    space: "O(n) for the stack, which holds the whole input when it is increasing",
    notes: [
      "The inner while loop does not make this quadratic: its total work across the whole pass is bounded by the number of pushes.",
      "Popping on ≥ rather than > is also correct. With equal heights the earlier bar is measured too narrow, but the later equal bar, popped afterwards, covers the full span.",
      "The divide-and-conquer alternative (split at the minimum) is O(n log n) on average but O(n²) on sorted input unless the minimum comes from a segment tree.",
      "Heights up to 10⁴ and n up to 10⁵ keep the area below 2³¹. Variants with larger bounds need long long.",
    ],
  },
  code: {
    lang: "cpp",
    files: [{
      name: "solution.cpp",
      note: "The LeetCode-shaped solution, plus a main over the animation's input that prints its Result.",
      source: `#include <algorithm>\n#include <cstdio>\n#include <vector>\nusing namespace std;\n\n${REFERENCE}\n\nint main() {\n    vector<int> heights{${H.join(", ")}};\n    printf("%d\\n", Solution().largestRectangleArea(heights));\n}\n`,
      traced: true,
    }],
  },
  problem: {
    number: 84,
    slug: "largest-rectangle-in-histogram",
    difficulty: "H",
    tier: "core",
    pattern: "A2",
    themes: ["Monotonic stack"],
    statement: [
      "A histogram is given as a list of bar heights. Every bar is one unit wide and the bars stand side by side. Return the area of the largest rectangle that fits entirely inside the histogram.",
      "Up to 10⁵ bars; each height is between 0 and 10⁴.",
    ],
    hints: [
      "Fix the bar that sets the rectangle's height. If bar t is the shortest bar inside a rectangle, how far can that rectangle stretch?",
      "It stretches left to just after the nearest shorter bar, and right to just before the next shorter bar. So you need \"previous smaller\" and \"next smaller\" for every bar.",
      "Both come out of one pass with a stack of indices whose heights increase. A bar is popped exactly when its next smaller bar arrives, and the bar beneath it on the stack is its previous smaller.",
      "Add a height-0 bar after the end so that every bar still on the stack gets popped and measured.",
    ],
    brute: "For every left end, grow right while tracking the minimum height: O(n²), about 5 × 10⁹ steps at n = 10⁵. Load it in the Solve tab to watch the stress case run out of time.",
    invariant: "The stack holds indices with non-decreasing heights. When bar i pops bar t, i is t's first not-taller bar to the right and the new top is its last shorter bar to the left, so t's widest rectangle is heights[t] × (i − newTop − 1).",
    traps: [
      "If the stack is empty after the pop, the rectangle reaches index 0: use −1 as the left boundary, not 0.",
      "Without the final flush, bars that never meet a shorter bar (an increasing histogram) are never measured.",
      "Using the popped bar's own index for the left edge measures too narrow a rectangle; the left edge comes from the bar below it on the stack.",
    ],
    followUps: [
      "85 Maximal Rectangle: run this on each row of a binary matrix, where a cell's height is the run of 1s above it. O(rows × cols).",
      "Bars arrive as a stream and you must report the best area after each one. Which bars are still unresolved, and what does each query cost?",
      "1793 Maximum Score of a Good Subarray has the same min × width score, but the window must contain index k. Two pointers growing out from k replace the stack. Why is greedy safe there?",
      "The bars are split across machines. Each chunk can resolve its own interior bars; what must be exchanged at the seams?",
    ],
    tests: {
      fn: "largestRectangleArea",
      args: [{ type: "vector<int>", name: "heights" }],
      starter: STARTER,
      reference: REFERENCE,
      brute: BRUTE,
      cases: [
        { name: "example", args: ["{2, 1, 5, 6, 2, 3}"] },
        { name: "one bar", args: ["{4}"] },
        { name: "all zero", args: ["{0, 0, 0}"] },
        { name: "increasing", args: ["{1, 2, 3, 4, 5}"] },
        { name: "decreasing", args: ["{5, 4, 3, 2, 1}"] },
        { name: "all equal", args: ["{3, 3, 3, 3}"] },
        { name: "valley", args: ["{6, 1, 6}"] },
      ],
      random: { count: 400, gen: "heights = rnd_vec(rnd(1, 12), 0, 8);" },
      stress: { label: "10⁵ bars", gen: "heights = rnd_vec(100000, 0, 10000);" },
    },
  },
};
