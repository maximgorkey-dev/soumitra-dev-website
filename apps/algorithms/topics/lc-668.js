/**
 * 668 Kth Smallest Number in Multiplication Table: binary search on the value,
 * counting entries ≤ x (catalogue pattern B2).
 */

import { frame } from "../core/trace.js";
import { result } from "./seq-common.js";

const M = 3;
const N = 4;
const K = 7;

const REFERENCE = `class Solution {
public:
    int findKthNumber(int m, int n, int k) {
        int lo = 1, hi = m * n;
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;
            int count = 0;  // entries <= mid; row i holds i, 2i, ..., n*i
            for (int i = 1; i <= m; ++i) count += min(mid / i, n);
            if (count >= k) hi = mid;  // the kth is mid or smaller
            else lo = mid + 1;
        }
        return lo;  // the smallest value with at least k entries <= it, so it is in the table
    }
};`;

const BRUTE = `class Solution {
public:
    // Write out the table and select: O(mn) time and memory.
    int findKthNumber(int m, int n, int k) {
        vector<int> all;
        all.reserve((size_t)m * n);
        for (int i = 1; i <= m; ++i)
            for (int j = 1; j <= n; ++j) all.push_back(i * j);
        nth_element(all.begin(), all.begin() + (k - 1), all.end());
        return all[k - 1];
    }
};`;

const STARTER = `class Solution {
public:
    int findKthNumber(int m, int n, int k) {

    }
};`;

function* run() {
  const table = Array.from({ length: M }, (_, i) => Array.from({ length: N }, (_, j) => (i + 1) * (j + 1)));
  let lo = 1;
  let hi = M * N;

  const grids = (mid = 0, verdict = null) => {
    const cells = {};
    if (mid) {
      for (let i = 0; i < M; i++) for (let j = 0; j < N; j++) {
        if (table[i][j] <= mid) cells[`${i},${j}`] = verdict === null ? "selected" : verdict ? "found" : "compared";
      }
    }
    const counts = table.map((row, i) => (mid ? Math.min(Math.floor(mid / (i + 1)), N) : null));
    return [{
      name: mid ? `entries ≤ ${mid}, row by row` : "the table",
      values: table,
      rowLabels: table.map((_, i) => (mid ? `${i + 1}× · ${counts[i]}` : `${i + 1}×`)),
      colLabels: Array.from({ length: N }, (_, j) => `×${j + 1}`),
      cells,
    }];
  };
  const count = (x) => table.reduce((s, _, i) => s + Math.min(Math.floor(x / (i + 1)), N), 0);

  yield frame({
    phase: "Set up",
    note: `Find the ${K}th smallest entry of the ${M} × ${N} multiplication table without sorting it.`,
    detail: `count(x) = how many entries are ≤ x. It only grows with x, so the answer is the smallest x with count(x) ≥ ${K}. Search x in 1…${M * N}.`,
    marks: { grids: grids() },
    metrics: [{ label: "k", value: String(K) }, { label: "Range", value: `${lo}…${hi}` }],
  });

  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    const c = count(mid);
    const ok = c >= K;
    yield frame({
      phase: "Count",
      note: `Guess ${mid}. Row i contributes min(${mid} / i, ${N}) entries: ${table.map((_, i) => Math.min(Math.floor(mid / (i + 1)), N)).join(" + ")} = ${c}.`,
      detail: "No row needs scanning: row i is i, 2i, 3i, …, so the count is a division.",
      marks: { grids: grids(mid) },
      metrics: [{ label: "k", value: String(K) }, { label: "Range", value: `${lo}…${hi}` }, { label: `count(${mid})`, value: String(c) }],
    });
    yield frame({
      phase: ok ? "Enough" : "Too few",
      note: ok
        ? `${c} ≥ ${K}: the ${K}th smallest is ${mid} or less. hi = ${mid}.`
        : `${c} < ${K}: fewer than ${K} entries are ≤ ${mid}, so the answer is bigger. lo = ${mid + 1}.`,
      marks: { grids: grids(mid, ok) },
      metrics: [{ label: "k", value: String(K) }, { label: "Range", value: `${ok ? lo : mid + 1}…${ok ? mid : hi}` }, { label: `count(${mid})`, value: String(c) }],
    });
    if (ok) hi = mid;
    else lo = mid + 1;
  }

  yield frame({
    phase: "Done",
    note: `The search ends at ${lo}. It is the smallest value with at least ${K} entries ≤ it, so it must itself be in the table.`,
    marks: { grids: grids(lo, true) },
    metrics: [{ label: "k", value: String(K) }, result(lo)],
  });
}

export const lc668 = {
  id: "lc-668",
  section: "Interview problems",
  topic: "B2 · Binary search on the value",
  title: "668. Kth Smallest Number in Multiplication Table",
  blurb: "Don't search positions, search values: count the entries ≤ x one row at a time, and binary search the smallest x with count ≥ k.",
  structure: { kind: "grid" },
  run,
  explanation: [
    "The table has up to 9·10⁸ entries, so it cannot be written out, let alone sorted. But one question about it is cheap: how many entries are ≤ x? Row i is i, 2i, …, n·i, so it holds min(x / i, n) of them, and the whole count is O(m).",
    "That count never decreases as x grows, so the kth smallest is the smallest x with count(x) ≥ k: a binary search over values, not positions. Each step halves the value range with one O(m) count.",
    "Why is the answer an actual entry of the table? If x were not in the table, count(x − 1) would equal count(x), so x − 1 would also satisfy the condition, and x would not be the smallest. The animation shades the entries ≤ each guess and writes each row's count beside it.",
    { tip: "Signal: \"kth smallest\" over a structure you can count but not list, such as a sorted matrix (378), pair distances (719), fractions (786) or products of two sorted arrays (2040). Search the value; count with a formula or two pointers." },
  ],
  analysis: {
    time: "O(m log(mn)), or O(min(m, n) log(mn)) after swapping so m is the smaller side",
    space: "O(1)",
    notes: [
      "About 30 counts of at most 3·10⁴ each, against writing out 9·10⁸ entries.",
      "The count can be done in O(√x) by grouping rows with equal x / i, but O(m) is already fast enough here.",
      "A heap of row heads (k-way merge) is O(k log m): fine when k is small, hopeless when k is near mn.",
      "The same \"smallest x with count ≥ k\" search also gives the kth largest, with count(≥ x).",
    ],
  },
  code: {
    lang: "cpp",
    files: [{
      name: "solution.cpp",
      note: "The LeetCode-shaped solution, plus a main over the animation's input that prints its Result.",
      source: `#include <algorithm>\n#include <cstdio>\nusing namespace std;\n\n${REFERENCE}\n\nint main() {\n    printf("%d\\n", Solution().findKthNumber(${M}, ${N}, ${K}));\n}\n`,
      traced: true,
    }],
  },
  problem: {
    number: 668,
    slug: "kth-smallest-number-in-multiplication-table",
    difficulty: "H",
    tier: "core",
    pattern: "B2",
    themes: ["Kth smallest", "Sorted matrix"],
    statement: [
      "The m × n multiplication table has i × j in row i and column j (both counted from 1). Return the kth smallest number in it, counting duplicates.",
      "1 ≤ m, n ≤ 3·10⁴ and 1 ≤ k ≤ m·n.",
    ],
    hints: [
      "The table can have 9·10⁸ entries. What can you compute about it without listing them?",
      "For a value x, how many entries of row i are ≤ x?",
      "count(x) = Σ min(x / i, n). It is monotone in x, so binary search for the smallest x with count(x) ≥ k.",
      "You do not need to check that the result is in the table: the smallest such x always is.",
    ],
    brute: "List every product and select the kth: O(mn) time and memory, which is 9·10⁸ ints, 3.6 GB. The stress case runs out of memory long before it runs out of time.",
    invariant: "count(lo − 1) < k ≤ count(hi) throughout, so the answer, the smallest x with count(x) ≥ k, stays in [lo, hi].",
    traps: [
      "Searching positions instead of values: there is no array to index.",
      "Using count(mid) > k, or count(mid) == k as a stopping test: with duplicates, several values can share a count, and the condition must be ≥ k.",
      "Forgetting the min(…, n) cap: for small i, x / i can exceed the row length.",
    ],
    followUps: [
      "378 Kth Smallest Element in a Sorted Matrix: the same search, counting with a staircase walk from a corner.",
      "719 Find K-th Smallest Pair Distance: search the distance, count pairs with two pointers on the sorted array.",
      "2040 Kth Smallest Product of Two Sorted Arrays: the count must handle negative numbers, which flip the inequality.",
      "Return the kth and also how many times it appears in the table.",
    ],
    tests: {
      fn: "findKthNumber",
      args: [{ type: "int", name: "m" }, { type: "int", name: "n" }, { type: "int", name: "k" }],
      starter: STARTER,
      reference: REFERENCE,
      brute: BRUTE,
      cases: [
        { name: "example", args: ["3", "3", "5"] },
        { name: "example 2", args: ["2", "3", "6"] },
        { name: "1 × 1", args: ["1", "1", "1"] },
        { name: "one row", args: ["1", "10", "7"] },
        { name: "k = 1", args: ["45", "12", "1"] },
      ],
      random: { count: 400, gen: "m = rnd(1, 8); n = rnd(1, 8); k = rnd(1, m * n);" },
      stress: { label: "3·10⁴ × 3·10⁴", gen: "m = 30000; n = 30000; k = 450000000;" },
    },
  },
};
