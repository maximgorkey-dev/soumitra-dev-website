/**
 * 4 Median of Two Sorted Arrays: binary search on the partition (catalogue pattern B3).
 */

import { frame } from "../core/trace.js";
import { SEQUENCE, span } from "./seq-common.js";

const A = [1, 3, 8, 10, 15];
const B = [2, 7, 9, 12, 20, 25, 30];

const REFERENCE = `class Solution {
public:
    double findMedianSortedArrays(vector<int>& a, vector<int>& b) {
        if (a.size() > b.size()) return findMedianSortedArrays(b, a);  // search the shorter
        int m = a.size(), n = b.size(), half = (m + n + 1) / 2;
        int lo = 0, hi = m;
        while (lo <= hi) {
            // The left half takes i elements from a and j from b.
            int i = (lo + hi) / 2, j = half - i;
            int aL = i > 0 ? a[i - 1] : INT_MIN, aR = i < m ? a[i] : INT_MAX;
            int bL = j > 0 ? b[j - 1] : INT_MIN, bR = j < n ? b[j] : INT_MAX;
            if (aL > bR) hi = i - 1;       // too many from a
            else if (bL > aR) lo = i + 1;  // too few from a
            else {
                long long leftMax = max(aL, bL);
                if ((m + n) % 2) return leftMax;
                return (leftMax + min(aR, bR)) / 2.0;
            }
        }
        return 0;  // not reached when both inputs are sorted
    }
};`;

const BRUTE = `class Solution {
public:
    // Merge, then read the middle: O(m + n). Correct, but the problem asks for O(log(m + n)).
    double findMedianSortedArrays(vector<int>& a, vector<int>& b) {
        vector<int> all(a);
        all.insert(all.end(), b.begin(), b.end());
        sort(all.begin(), all.end());
        size_t t = all.size();
        return t % 2 ? all[t / 2] : (all[t / 2 - 1] + (long long)all[t / 2]) / 2.0;
    }
};`;

const STARTER = `class Solution {
public:
    double findMedianSortedArrays(vector<int>& nums1, vector<int>& nums2) {

    }
};`;

function* run() {
  const m = A.length;
  const n = B.length;
  const half = Math.floor((m + n + 1) / 2);
  let lo = 0;
  let hi = m;
  const fmt = (x) => (x === -Infinity ? "−∞" : x === Infinity ? "+∞" : String(x));

  const rows = (i, j, extraA = {}, extraB = {}) => [
    {
      name: "A (shorter)", values: A,
      cells: { ...(i > 0 ? span(0, i - 1, "selected") : {}), ...extraA },
      pointers: i >= 0 ? [{ name: `i=${i}`, at: i }] : [],
      ranges: [{ from: lo < m ? lo : m - 1, to: Math.max(lo < m ? lo : m - 1, Math.min(hi, m - 1)), label: `i can be ${lo}…${hi}` }],
    },
    {
      name: "B", values: B,
      cells: { ...(j > 0 ? span(0, j - 1, "selected") : {}), ...extraB },
      pointers: j >= 0 ? [{ name: `j=${j}`, at: j }] : [],
    },
  ];
  const metrics = (extra = []) => [{ label: "Left half size", value: String(half) }, ...extra];

  yield frame({
    phase: "Set up",
    note: `Find the median of the ${m + n} numbers in A and B without merging them.`,
    detail: `The median splits all ${m + n} numbers into a left half of ${half} and a right half, with everything on the left ≤ everything on the right.`,
    marks: { rows: rows(-1, -1) },
    metrics: metrics(),
  });
  yield frame({
    phase: "Set up",
    note: `A left half is fixed by one number: take i from A and the other ${half} − i from B. So binary search i over 0…${m}, on the shorter array.`,
    detail: "Searching the shorter array keeps j = half − i inside B for every i.",
    marks: { rows: rows(-1, -1) },
    metrics: metrics(),
  });

  let cuts = 0;
  while (lo <= hi) {
    cuts++;
    const i = Math.floor((lo + hi) / 2);
    const j = half - i;
    const aL = i > 0 ? A[i - 1] : -Infinity;
    const aR = i < m ? A[i] : Infinity;
    const bL = j > 0 ? B[j - 1] : -Infinity;
    const bR = j < n ? B[j] : Infinity;
    const mark = (arr, k, st) => (k >= 0 && k < arr.length ? { [k]: st } : {});

    yield frame({
      phase: "Cut",
      note: `Try i = ${i}: the left half is the first ${i} of A and the first ${j} of B (shaded).`,
      detail: `Across the cut, A has ${fmt(aL)} | ${fmt(aR)} and B has ${fmt(bL)} | ${fmt(bR)}.`,
      marks: { rows: rows(i, j, { ...mark(A, i - 1, "compared"), ...mark(A, i, "compared") }, { ...mark(B, j - 1, "compared"), ...mark(B, j, "compared") }) },
      metrics: metrics(),
    });

    if (aL > bR) {
      yield frame({
        phase: "Check",
        note: `A's last left element ${fmt(aL)} is bigger than B's first right element ${fmt(bR)}, so the left half took too many from A. Move i down.`,
        detail: `hi = i − 1 = ${i - 1}.`,
        marks: { rows: rows(i, j, mark(A, i - 1, "pivot"), mark(B, j, "pivot")) },
        metrics: metrics(),
      });
      hi = i - 1;
    } else if (bL > aR) {
      yield frame({
        phase: "Check",
        note: `B's last left element ${fmt(bL)} is bigger than A's first right element ${fmt(aR)}, so the left half took too few from A. Move i up.`,
        detail: `${fmt(aL)} ≤ ${fmt(bR)} holds, but ${fmt(bL)} > ${fmt(aR)}. lo = i + 1 = ${i + 1}.`,
        marks: { rows: rows(i, j, mark(A, i, "pivot"), mark(B, j - 1, "pivot")) },
        metrics: metrics(),
      });
      lo = i + 1;
    } else {
      const leftMax = Math.max(aL, bL);
      const rightMin = Math.min(aR, bR);
      const median = (m + n) % 2 ? leftMax : (leftMax + rightMin) / 2;
      yield frame({
        phase: "Check",
        note: `${fmt(aL)} ≤ ${fmt(bR)} and ${fmt(bL)} ≤ ${fmt(aR)}: every element on the left is ≤ every element on the right. This is the median cut.`,
        marks: { rows: rows(i, j, mark(A, i - 1, "found"), mark(B, j - 1, "found")) },
        metrics: metrics(),
      });
      yield frame({
        phase: "Done",
        note: (m + n) % 2
          ? `An odd total: the median is the largest on the left, ${leftMax}.`
          : `An even total: the median is the mean of the largest on the left (${leftMax}) and the smallest on the right (${rightMin}), ${median}.`,
        detail: `${cuts} cuts instead of reading all ${m + n} numbers: O(log min(m, n)).`,
        marks: { rows: rows(i, j, { ...mark(A, i - 1, "found"), ...mark(A, i, "found") }, { ...mark(B, j - 1, "found"), ...mark(B, j, "found") }) },
        metrics: metrics([{ label: "Result", value: median.toFixed(5) }]),
      });
      return;
    }
  }
}

export const lc4 = {
  id: "lc-4",
  section: "Interview problems",
  topic: "B3 · Binary search on a partition",
  title: "4. Median of Two Sorted Arrays",
  blurb: "Binary search for where to cut the shorter array; the cut in the other array follows, and two comparisons say which way to move.",
  structure: SEQUENCE,
  run,
  explanation: [
    "The median is defined by a split: a left half of ⌈(m + n) / 2⌉ numbers, each ≤ every number in the right half. Any left half made of sorted prefixes takes some i elements from A and the remaining j = half − i from B, so the whole problem is choosing one number, i.",
    "Whether a cut is right is decided by the four elements next to it. It is valid exactly when A[i − 1] ≤ B[j] and B[j − 1] ≤ A[i]; the comparisons within each array hold already because they are sorted. If A[i − 1] > B[j], too much of A is on the left, so i must shrink. If B[j − 1] > A[i], too little is, so i must grow. That monotone yes or no is what makes binary search possible.",
    "Searching the shorter array keeps j in range for every i, and missing neighbours at the ends are treated as −∞ and +∞. When the cut is found, the median is the largest on the left for an odd total, or its mean with the smallest on the right for an even total.",
    { tip: "Signal: \"two sorted arrays\" with a logarithmic bound, or \"kth smallest of two sorted arrays\". Think about the cut, not about the elements. The same idea finds the kth element (set half = k)." },
  ],
  analysis: {
    time: "O(log min(m, n)): the search runs over the shorter array's cut positions",
    space: "O(1)",
    notes: [
      "Merging is O(m + n), and it passes LeetCode in practice; the problem statement asks for the logarithmic bound, and an interviewer will too.",
      "The alternative kth-element recursion (discard k/2 from one array per step) is O(log(m + n)) and is easier to derive but harder to get right at the edges.",
      "Using half = (m + n + 1) / 2 puts the extra element on the left for odd totals, so the odd case is just the left maximum.",
      "The mean of two values near the int range limit overflows in int: add them as long long, or as doubles.",
    ],
  },
  code: {
    lang: "cpp",
    files: [{
      name: "solution.cpp",
      note: "The LeetCode-shaped solution, plus a main over the animation's input that prints its Result.",
      source: `#include <algorithm>\n#include <climits>\n#include <cstdio>\n#include <vector>\nusing namespace std;\n\n${REFERENCE}\n\nint main() {\n    vector<int> a{${A.join(", ")}}, b{${B.join(", ")}};\n    printf("%.5f\\n", Solution().findMedianSortedArrays(a, b));\n}\n`,
      traced: true,
    }],
  },
  problem: {
    number: 4,
    slug: "median-of-two-sorted-arrays",
    difficulty: "H",
    tier: "core",
    pattern: "B3",
    themes: ["Kth smallest", "Median"],
    statement: [
      "Two arrays are each sorted in non-decreasing order. Return the median of all their elements taken together, in O(log(m + n)) time.",
      "Each array has up to 1000 elements (at least one element overall), with values between −10⁶ and 10⁶.",
    ],
    hints: [
      "Forget the elements for a moment. The median splits everything into a left half and a right half. What does a left half made of the two arrays look like?",
      "It is a prefix of A plus a prefix of B. If it takes i from A, it must take half − i from B, so one number, i, describes it.",
      "A cut is valid when A[i − 1] ≤ B[j] and B[j − 1] ≤ A[i]. If the first fails, i is too large; if the second fails, i is too small. Binary search i.",
      "Search over the shorter array so that j stays in range, and use −∞ and +∞ for the neighbours that fall off either end.",
    ],
    brute: "Merge the two arrays (or sort their concatenation) and read the middle: O(m + n). It is correct and LeetCode accepts it, but it ignores the required bound, and in an interview it is the answer to the warm-up, not to the question.",
    invariant: "A cut is right exactly when the largest element on the left is ≤ the smallest on the right. Only the four elements touching the cut can break that, and which one breaks it says which way to move.",
    traps: [
      "Searching the longer array: j = half − i can then go negative or past the end of the other array.",
      "Off-by-one in the bounds: i ranges over 0…m inclusive (m + 1 possible cuts), so the loop is lo ≤ hi with hi = m.",
      "Treating the missing neighbour at an end as 0 instead of −∞ or +∞.",
      "Integer overflow when averaging the two middle values; and returning an int division for an even total.",
    ],
    followUps: [
      "Kth smallest of two sorted arrays: the same search with the left half fixed at k.",
      "The median of k sorted arrays: binary search on the value, counting how many are ≤ x in each array with upper_bound (catalogue pattern B2).",
      "The numbers arrive as a stream: keep two heaps, a max-heap for the lower half and a min-heap for the upper (295 Find Median from Data Stream).",
      "The arrays live on two machines and only a few values may be sent per round. How many rounds does this algorithm need?",
    ],
    tests: {
      fn: "findMedianSortedArrays",
      args: [{ type: "vector<int>", name: "nums1" }, { type: "vector<int>", name: "nums2" }],
      starter: STARTER,
      reference: REFERENCE,
      brute: BRUTE,
      cases: [
        { name: "odd total", args: ["{1, 3}", "{2}"] },
        { name: "even total", args: ["{1, 2}", "{3, 4}"] },
        { name: "first empty", args: ["{}", "{5}"] },
        { name: "second empty", args: ["{1, 2, 3, 4}", "{}"] },
        { name: "disjoint ranges", args: ["{1, 2, 3}", "{10, 11, 12, 13}"] },
        { name: "duplicates", args: ["{2, 2, 2}", "{2, 2}"] },
        { name: "negatives", args: ["{-5, -3, -1}", "{-2}"] },
        { name: "extremes", args: ["{-1000000}", "{1000000}"] },
      ],
      random: { count: 500, gen: "nums1 = rnd_sorted(rnd(0, 8), -20, 20); nums2 = rnd_sorted(rnd(nums1.empty() ? 1 : 0, 8), -20, 20);" },
      stress: { label: "10⁶ elements", gen: "nums1 = rnd_sorted(400000, -1000000, 1000000); nums2 = rnd_sorted(600000, -1000000, 1000000);" },
    },
  },
};
