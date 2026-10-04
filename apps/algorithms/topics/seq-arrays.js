/**
 * Array techniques on the sequence view: binary search (lower bound), two
 * pointers, prefix sums, and Kadane's maximum subarray.
 */

import { frame } from "../core/trace.js";
import { SEQUENCE, result, cpp, span } from "./seq-common.js";

/* ------------------------------------------------------------------ */
/* binary search                                                        */
/* ------------------------------------------------------------------ */

const BS_A = [2, 5, 8, 12, 23, 23, 23, 23, 38, 56, 72];
const BS_T = 23;

function* binarySearchRun() {
  const a = BS_A;
  let lo = 0;
  let hi = a.length;
  let comparisons = 0;

  const row = (cells, extra = []) => ({
    name: "a",
    values: a,
    cells,
    pointers: [{ name: "lo", at: lo }, { name: "hi", at: hi }, ...extra],
    ranges: lo < hi ? [{ from: lo, to: hi - 1, label: "answer is in here" }] : [],
  });
  const outside = () => {
    const c = {};
    a.forEach((_, i) => { if (i < lo || i >= hi) c[i] = "excluded"; });
    return c;
  };
  const metrics = () => [
    { label: "Comparisons", value: String(comparisons) },
    { label: "Candidates left", value: String(hi - lo) },
  ];

  yield frame({
    phase: "Set up",
    note: `Find the first position where ${BS_T} could go — the first element not less than ${BS_T}.`,
    detail: "The range is half-open: lo is a candidate, hi is one past the last candidate. Every index could be the answer, including n (\"insert at the end\").",
    marks: { rows: [row({})] },
    metrics: metrics(),
  });

  while (lo < hi) {
    const mid = lo + Math.floor((hi - lo) / 2);
    comparisons++;
    const less = a[mid] < BS_T;
    yield frame({
      phase: "Halve",
      note: `Look at the middle candidate, a[${mid}] = ${a[mid]}. Is it less than ${BS_T}?`,
      detail: `mid = lo + (hi − lo) / 2 = ${lo} + (${hi} − ${lo}) / 2 = ${mid}`,
      marks: { rows: [row({ ...outside(), [mid]: "compared" }, [{ name: "mid", at: mid }])] },
      metrics: metrics(),
    });
    if (less) {
      lo = mid + 1;
      yield frame({
        phase: "Halve",
        note: `${a[mid]} < ${BS_T}, so a[${mid}] and everything left of it are too small. Move lo to ${lo}.`,
        marks: { rows: [row(outside())] },
        metrics: metrics(),
      });
    } else {
      hi = mid;
      yield frame({
        phase: "Halve",
        note: a[mid] === BS_T
          ? `a[${mid}] equals ${BS_T} — but an earlier copy might exist, so keep it as the boundary and search left: hi = ${hi}.`
          : `${a[mid]} ≥ ${BS_T}, so the answer is at ${mid} or to its left. Move hi to ${hi}.`,
        detail: "hi = mid, not mid − 1: mid itself is still a candidate.",
        marks: { rows: [row(outside())] },
        metrics: metrics(),
      });
    }
  }

  const found = lo < a.length && a[lo] === BS_T;
  yield frame({
    phase: "Done",
    note: `lo = hi = ${lo}: one candidate left, so that is the answer. ${found ? `a[${lo}] = ${BS_T}, the first of its copies.` : `${BS_T} is not present; ${lo} is where it would be inserted.`}`,
    detail: `${comparisons} comparisons for ${a.length} elements — ⌈log₂(${a.length + 1})⌉ = ${Math.ceil(Math.log2(a.length + 1))} at most.`,
    marks: { rows: [{ name: "a", values: a, cells: { ...outside(), [lo]: "found" }, pointers: [{ name: "lo = hi", at: lo }] }] },
    metrics: [...metrics(), result(`lower_bound(${BS_T}) = ${lo}`)],
  });
}

export const binarySearch = {
  id: "seq-binary-search",
  section: "Algorithms",
  topic: "Arrays",
  title: "Binary search (lower bound)",
  blurb: "Halve a sorted range until one candidate is left: the first element not less than the target",
  structure: SEQUENCE,
  run: binarySearchRun,
  explanation: [
    { tip: "**In one line:** keep a range that is guaranteed to contain the answer, and halve it with one comparison per step." },
    "Binary search is famous for being easy to explain and hard to write correctly. The fix is to stop thinking \"find the target\" and instead think **\"find the boundary\"**: the first index where a yes/no condition (`a[i] >= target`) turns from no to yes. In a sorted array that condition is false, false, …, true, true — and binary search finds where it flips.",
    { h: "The invariant that makes it correct" },
    { list: [
      "Everything **left of `lo`** is known to be too small (`a[i] < target`).",
      "Everything **at or right of `hi`** is known to be big enough.",
      "So the answer is always in **`[lo, hi)`** — and the loop ends when that range has one point, `lo == hi`.",
      "Each step keeps the invariant: `lo = mid + 1` when `a[mid]` is too small, `hi = mid` otherwise.",
    ] },
    { h: "Why this version" },
    { list: [
      "It handles **duplicates** — it finds the first copy, as the animation shows when it lands on a 23 and keeps going left.",
      "It handles **absent targets** — the result is the insertion point, and `n` means \"after everything\".",
      "It is exactly `std::lower_bound`. Change `<` to `<=` and you get `std::upper_bound`; their difference counts the copies.",
    ] },
    { h: "Bugs to avoid" },
    { list: [
      "`mid = (lo + hi) / 2` can **overflow** for huge indices; `lo + (hi - lo) / 2` cannot.",
      "Mixing a closed range `[lo, hi]` with `hi = mid` loops **forever** on two elements. Pick one convention and keep it.",
    ] },
    "The same pattern works on anything **monotonic**, not just arrays: the smallest speed that finishes in time, the first bad commit, the square root of a number. That is *binary search on the answer*.",
  ],
  analysis: {
    time: "O(log n) — the candidate range halves on every comparison",
    space: "O(1)",
    notes: [
      "11 elements need at most ⌈log₂ 12⌉ = 4 comparisons; a million need 20. That gap is why sorting once and searching many times pays off.",
      "It needs random access. On a linked list each \"jump to mid\" costs O(n), and the whole search becomes O(n).",
      "For many lookups in a fixed set, a hash table gives O(1) on average — but cannot answer \"first element ≥ x\" or range questions, which binary search can.",
    ],
  },
  code: cpp("lower_bound.cpp", `#include <cstdio>
#include <vector>

// First index i with a[i] >= target, or a.size() if there is none.
// Invariant: a[0..lo) < target <= a[hi..n).
int lowerBound(const std::vector<int>& a, int target) {
    int lo = 0, hi = static_cast<int>(a.size());
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;          // no overflow
        if (a[mid] < target) lo = mid + 1;     // mid is too small
        else                 hi = mid;         // mid is still a candidate
    }
    return lo;
}

int main() {
    std::vector<int> a{2, 5, 8, 12, 23, 23, 23, 23, 38, 56, 72};
    std::printf("lower_bound(23) = %d\\n", lowerBound(a, 23));
}
`),
};

/* ------------------------------------------------------------------ */
/* two pointers                                                         */
/* ------------------------------------------------------------------ */

const TP_A = [1, 2, 4, 6, 8, 11, 15];
const TP_T = 14;

function* twoPointersRun() {
  const a = TP_A;
  let i = 0;
  let j = a.length - 1;
  let steps = 0;
  const gone = new Set();

  const marks = (state) => {
    const cells = {};
    gone.forEach((k) => { cells[k] = "excluded"; });
    if (state) { cells[i] = state; cells[j] = state; }
    return { rows: [{ name: "a", values: a, cells, pointers: [{ name: "i", at: i }, { name: "j", at: j }] }] };
  };
  const metrics = (extra = []) => [{ label: "Pairs checked", value: String(steps) }, ...extra];

  yield frame({
    phase: "Set up",
    note: `Find two numbers that add up to ${TP_T}. The array is sorted, so start with the smallest (i) and the largest (j).`,
    detail: `Checking every pair would take ${a.length * (a.length - 1) / 2} sums. Sorting lets us throw away a whole row of pairs with each one.`,
    marks: marks(),
    metrics: metrics(),
  });

  while (i < j) {
    const s = a[i] + a[j];
    steps++;
    if (s === TP_T) {
      yield frame({
        phase: "Done",
        note: `${a[i]} + ${a[j]} = ${TP_T}. Found it after ${steps} sums.`,
        marks: marks("found"),
        metrics: metrics([result(`pair: a[${i}] + a[${j}] = ${a[i]} + ${a[j]} = ${TP_T}`)]),
      });
      return;
    }
    if (s < TP_T) {
      yield frame({
        phase: "Move a pointer",
        note: `${a[i]} + ${a[j]} = ${s} is too small. Even the largest partner can't rescue a[${i}] = ${a[i]}, so drop it: i moves right.`,
        detail: `Every pair (${i}, k) with k ≤ ${j} sums to at most ${s}. All of them are ruled out at once.`,
        marks: marks("compared"),
        metrics: metrics(),
      });
      gone.add(i);
      i++;
    } else {
      yield frame({
        phase: "Move a pointer",
        note: `${a[i]} + ${a[j]} = ${s} is too big. Even the smallest partner is too much for a[${j}] = ${a[j]}, so drop it: j moves left.`,
        detail: `Every pair (k, ${j}) with k ≥ ${i} sums to at least ${s}.`,
        marks: marks("compared"),
        metrics: metrics(),
      });
      gone.add(j);
      j--;
    }
  }
  yield frame({ phase: "Done", note: "The pointers met: no pair adds up to the target.", marks: marks(), metrics: metrics([result("no pair")]) });
}

export const twoPointers = {
  id: "seq-two-pointers",
  section: "Algorithms",
  topic: "Arrays",
  title: "Two pointers (pair sum)",
  blurb: "Walk inward from both ends of a sorted array, discarding one element per step",
  structure: SEQUENCE,
  run: twoPointersRun,
  explanation: [
    { tip: "**In one line:** two indices move towards each other, and each comparison proves one element can't be part of any answer." },
    "The brute force for \"find two numbers with sum *T*\" checks all *n²/2* pairs. On a **sorted** array you can do it in one pass, because every comparison tells you which pointer is useless.",
    { h: "Why moving a pointer is safe" },
    { list: [
      "If `a[i] + a[j] < T`: `a[j]` is the **largest** partner `a[i]` has left, and it's still too small. So `a[i]` can't pair with anything — **drop it** (`i++`).",
      "If `a[i] + a[j] > T`: `a[i]` is the **smallest** partner `a[j]` has left, and it's still too big. **Drop `a[j]`** (`j--`).",
      "Either way one element is eliminated, so the loop runs at most *n − 1* times.",
    ] },
    { h: "The same idea, other shapes" },
    { list: [
      "**Opposite ends:** pair sum, 3-sum (fix one, two-pointer the rest), container with most water, palindrome check.",
      "**Same direction (fast/slow):** remove duplicates in place, merge two sorted arrays, partition (as in quicksort).",
      "**Sliding window** is two same-direction pointers bounding a range — see the Stacks and windows topics.",
    ] },
    "What all of them need is **monotonicity**: moving a pointer must change the quantity in a predictable direction. Without sorting, the argument above falls apart and a hash set (O(n) memory) is the usual fallback.",
  ],
  analysis: {
    time: "O(n) after sorting — each step discards one element",
    space: "O(1)",
    notes: [
      "If the input is not sorted, sorting first costs O(n log n), which then dominates. A hash set solves unsorted pair-sum in O(n) time but O(n) memory.",
      "3-sum is O(n²) this way: n choices for the first element, then a linear two-pointer pass for the other two.",
      "This proof style — \"this element cannot be in any solution, so discard it\" — is the core of many greedy and linear-time algorithms.",
    ],
  },
  code: cpp("two_pointers.cpp", `#include <cstdio>
#include <vector>

int main() {
    std::vector<int> a{1, 2, 4, 6, 8, 11, 15};    // sorted
    const int target = 14;

    int i = 0, j = static_cast<int>(a.size()) - 1;
    while (i < j) {
        int s = a[i] + a[j];
        if (s == target) {
            std::printf("pair: a[%d] + a[%d] = %d + %d = %d\\n", i, j, a[i], a[j], target);
            return 0;
        }
        if (s < target) ++i;    // a[i] is too small even for the largest partner
        else            --j;    // a[j] is too big even for the smallest partner
    }
    std::puts("no pair");
}
`),
};

/* ------------------------------------------------------------------ */
/* prefix sums                                                          */
/* ------------------------------------------------------------------ */

const PS_A = [3, 1, 4, 1, 5, 9, 2, 6];
const PS_Q = [2, 5];

function* prefixSumsRun() {
  const a = PS_A;
  const p = Array(a.length + 1).fill(null);
  p[0] = 0;
  const rows = (aCells = {}, pCells = {}, aRanges = []) => [
    { name: "a", values: a, cells: aCells, ranges: aRanges },
    { name: "prefix", values: [...p], cells: pCells, labels: p.map((_, i) => `P${i}`) },
  ];

  yield frame({
    phase: "Build",
    note: "P[i] will hold the sum of the first i elements. P[0] = 0: the sum of nothing.",
    detail: "The prefix array has one more slot than the input, which removes every special case at the left edge.",
    marks: { rows: rows({}, { 0: "found" }) },
  });

  for (let i = 0; i < a.length; i++) {
    p[i + 1] = p[i] + a[i];
    yield frame({
      phase: "Build",
      note: `P[${i + 1}] = P[${i}] + a[${i}] = ${p[i]} + ${a[i]} = ${p[i + 1]}.`,
      marks: { rows: rows({ [i]: "active" }, { [i]: "compared", [i + 1]: "selected" }) },
    });
  }

  const [l, r] = PS_Q;
  const sum = p[r + 1] - p[l];
  yield frame({
    phase: "Query",
    note: `Now any range sum is one subtraction. Sum of a[${l}..${r}]?`,
    detail: `P[${r + 1}] covers a[0..${r}]; P[${l}] covers a[0..${l - 1}]. Their difference is exactly a[${l}..${r}].`,
    marks: { rows: rows(span(l, r, "active"), { [r + 1]: "selected", [l]: "compared" }, [{ from: l, to: r, label: `a[${l}..${r}]` }]) },
  });
  yield frame({
    phase: "Query",
    note: `P[${r + 1}] − P[${l}] = ${p[r + 1]} − ${p[l]} = ${sum}, without touching a single element of the range.`,
    detail: `Check: ${a.slice(l, r + 1).join(" + ")} = ${sum}.`,
    marks: { rows: rows(span(l, r, "found"), { [r + 1]: "selected", [l]: "compared" }, [{ from: l, to: r, label: `sum = ${sum}`, state: "best" }]) },
    metrics: [result(`sum(a[${l}..${r}]) = ${sum}`)],
  });
}

export const prefixSums = {
  id: "seq-prefix-sums",
  section: "Algorithms",
  topic: "Arrays",
  title: "Prefix sums",
  blurb: "Spend one pass building running totals, then answer any range sum with a single subtraction",
  structure: SEQUENCE,
  run: prefixSumsRun,
  explanation: [
    { tip: "**In one line:** `P[i]` is the sum of the first *i* elements, so `sum(a[l..r]) = P[r+1] − P[l]`." },
    "If you need the sum of many different ranges, adding up each one costs O(length) every time. Prefix sums **precompute once** in O(n) and then answer each query in **O(1)**.",
    { h: "How it works" },
    { list: [
      "`P[0] = 0`, and `P[i+1] = P[i] + a[i]` — one pass.",
      "`P[r+1]` is the sum of `a[0..r]`; `P[l]` is the sum of `a[0..l−1]`.",
      "Subtracting cancels the shared part, leaving **exactly `a[l..r]`**.",
      "Using *n + 1* slots with `P[0] = 0` means `l = 0` needs **no special case**.",
    ] },
    { h: "Where it shows up" },
    { list: [
      "**Subarray sum equals K**: count pairs with `P[j] − P[i] = K` using a hash map of prefix values — O(n).",
      "**2D prefix sums**: rectangle sums in O(1) by inclusion–exclusion over four corners.",
      "**Difference arrays** — the inverse: add *v* to a whole range in O(1), then one prefix pass applies all the updates.",
      "Anything with an **inverse operation** works: sums, XOR, counts. Max and min do not — they need a sparse table or segment tree.",
    ] },
  ],
  analysis: {
    time: "O(n) to build, O(1) per query",
    space: "O(n) for the prefix array",
    notes: [
      "With q queries the total is O(n + q) instead of O(n·q).",
      "If the array changes between queries, each update invalidates O(n) prefix entries. A Fenwick (binary indexed) tree supports both in O(log n).",
      "Watch for overflow: the prefix of many large values can exceed `int` even when every range you ask about fits. Use `long long`.",
    ],
  },
  code: cpp("prefix_sums.cpp", `#include <cstdio>
#include <vector>

int main() {
    std::vector<long long> a{3, 1, 4, 1, 5, 9, 2, 6};

    // p[i] = a[0] + ... + a[i-1]; p[0] = 0.
    std::vector<long long> p(a.size() + 1, 0);
    for (std::size_t i = 0; i < a.size(); ++i) p[i + 1] = p[i] + a[i];

    int l = 2, r = 5;
    std::printf("sum(a[%d..%d]) = %lld\\n", l, r, p[r + 1] - p[l]);
}
`),
};

/* ------------------------------------------------------------------ */
/* Kadane                                                               */
/* ------------------------------------------------------------------ */

const KD_A = [-2, 1, -3, 4, -1, 2, 1, -5, 4];

function* kadaneRun() {
  const a = KD_A;
  const best_here = Array(a.length).fill(null);
  let cur = 0;
  let start = 0;
  let best = -Infinity;
  let bl = 0;
  let br = 0;

  const rows = (i, note) => {
    const ranges = [];
    if (i >= 0) ranges.push({ from: start, to: i, label: `current run = ${cur}` });
    if (best > -Infinity) ranges.push({ from: bl, to: br, label: `best = ${best}`, state: "best" });
    return [
      { name: "a", values: a, cells: i >= 0 ? { [i]: "active" } : {}, ranges },
      { name: "ends here", values: [...best_here], cells: i >= 0 ? { [i]: note } : {} },
    ];
  };
  const metrics = (extra = []) => [
    { label: "Current run", value: String(cur) },
    { label: "Best so far", value: best === -Infinity ? "—" : String(best) },
    ...extra,
  ];

  yield frame({
    phase: "Set up",
    note: "For each position, ask one question: what is the best sum of a subarray that ends exactly here?",
    detail: "The answer to the whole problem is the largest of those.",
    marks: { rows: rows(-1) },
    metrics: metrics(),
  });

  for (let i = 0; i < a.length; i++) {
    const extend = cur + a[i];
    const fresh = i === 0 || a[i] > extend;
    if (fresh) { cur = a[i]; start = i; } else cur = extend;
    best_here[i] = cur;
    const improved = cur > best;
    if (improved) { best = cur; bl = start; br = i; }
    yield frame({
      phase: "Scan",
      note: i === 0
        ? `a[0] = ${a[0]} is the only subarray ending here.`
        : fresh
          ? `Extending would give ${extend - a[i]} + ${a[i]} = ${extend}, worse than ${a[i]} alone. The old run is a burden — start a new one at ${i}.`
          : `Extending the run gives ${extend - a[i]} + ${a[i]} = ${cur}, better than ${a[i]} alone. Keep going.`,
      detail: improved ? `${cur} is a new best: a[${bl}..${br}].` : `Best is still ${best}, a[${bl}..${br}].`,
      marks: { rows: rows(i, improved ? "found" : "selected") },
      metrics: metrics(),
    });
  }

  yield frame({
    phase: "Done",
    note: `The largest "best ending here" is ${best}, for a[${bl}..${br}] = ${a.slice(bl, br + 1).join(", ")}.`,
    marks: { rows: [
      { name: "a", values: a, cells: span(bl, br, "found"), ranges: [{ from: bl, to: br, label: `best = ${best}`, state: "best" }] },
      { name: "ends here", values: best_here, cells: { [br]: "found" } },
    ] },
    metrics: metrics([result(`max subarray sum = ${best} (a[${bl}..${br}])`)]),
  });
}

export const kadane = {
  id: "seq-kadane",
  section: "Algorithms",
  topic: "Arrays",
  title: "Maximum subarray (Kadane)",
  blurb: "One pass, one decision per element: extend the current run or start again",
  structure: SEQUENCE,
  run: kadaneRun,
  explanation: [
    { tip: "**In one line:** the best subarray ending at *i* is either `a[i]` alone or `a[i]` added to the best one ending at *i − 1* — whichever is bigger." },
    "There are *n²/2* subarrays, so trying them all is O(n²). Kadane's algorithm gets O(n) by asking a **smaller question** at each position, and is the friendliest introduction to **dynamic programming** there is.",
    { h: "The recurrence" },
    { list: [
      "`best_here[i] = max(a[i], best_here[i−1] + a[i])` — the second row in the animation.",
      "If the run so far is **negative**, it only drags `a[i]` down, so **start fresh** at *i*.",
      "The answer is `max` over all `best_here[i]`, tracked as we go.",
      "Only the previous value is ever needed, so the table collapses to **one variable** (`cur`).",
    ] },
    { h: "Why it's dynamic programming" },
    { list: [
      "**State:** the best sum of a subarray *ending exactly at i* — the \"ending exactly here\" is what makes the recurrence possible.",
      "**Transition:** extend or restart.",
      "**Answer:** the best over all states.",
      "The same \"ending here\" trick solves longest increasing subsequence, maximum product subarray, and many more.",
    ] },
    { h: "Edge cases" },
    "If every element is negative, the answer is the **largest single element**, not 0. Initialising `best` to the first element (or −∞), as here, gets that right; initialising it to 0 silently allows the empty subarray.",
  ],
  analysis: {
    time: "O(n) — one pass",
    space: "O(1) — only the current run and the best so far",
    notes: [
      "The brute force over all subarrays is O(n²) with prefix sums, O(n³) without.",
      "Divide and conquer also works, in O(n log n): the best subarray is in the left half, the right half, or crosses the middle.",
      "For a circular array, the answer is the larger of the normal Kadane result and the total minus the minimum subarray (unless all elements are negative).",
    ],
  },
  code: cpp("kadane.cpp", `#include <cstdio>
#include <vector>

int main() {
    std::vector<int> a{-2, 1, -3, 4, -1, 2, 1, -5, 4};

    int cur = a[0], best = a[0];
    int start = 0, bestL = 0, bestR = 0;
    for (int i = 1; i < static_cast<int>(a.size()); ++i) {
        if (a[i] > cur + a[i]) { cur = a[i]; start = i; }   // restart
        else                   cur += a[i];                  // extend
        if (cur > best) { best = cur; bestL = start; bestR = i; }
    }
    std::printf("max subarray sum = %d (a[%d..%d])\\n", best, bestL, bestR);
}
`),
};
