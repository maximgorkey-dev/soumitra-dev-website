/**
 * Windows and monotonic structures on the sequence view: longest substring
 * without repeats (variable sliding window), sliding window maximum
 * (monotonic deque), next greater element (monotonic stack).
 */

import { frame } from "../core/trace.js";
import { SEQUENCE, result, cpp, span } from "./seq-common.js";

/* ------------------------------------------------------------------ */
/* longest substring without repeating characters                       */
/* ------------------------------------------------------------------ */

const LS_S = "abcabcbb";

function* longestUniqueRun() {
  const s = [...LS_S];
  const letters = [...new Set(s)].sort();
  const last = new Map();
  let L = 0;
  let best = 0;
  let bl = 0;

  const rows = (R, extraCells = {}, to = R) => [
    {
      name: "s", values: s,
      cells: { ...(R >= 0 ? span(L, to, "selected") : {}), ...(R >= 0 ? { [R]: "active" } : {}), ...extraCells },
      pointers: R >= 0 ? [{ name: "L", at: L }, { name: "R", at: R }] : [],
      ranges: [
        ...(R >= 0 && to >= L ? [{ from: L, to, label: `window, length ${to - L + 1}` }] : []),
        ...(best ? [{ from: bl, to: bl + best - 1, label: `best = ${best}`, state: "best" }] : []),
      ],
    },
    { name: "last seen", values: letters.map((c) => (last.has(c) ? last.get(c) : "–")), labels: letters },
  ];
  const metrics = (extra = []) => [{ label: "Best length", value: String(best) }, ...extra];

  yield frame({
    phase: "Set up",
    note: `Find the longest stretch of "${LS_S}" with no repeated character.`,
    detail: "The window [L, R] always holds distinct characters. R moves right one step at a time; L only ever jumps right when a repeat appears.",
    marks: { rows: rows(-1) },
    metrics: metrics(),
  });

  for (let R = 0; R < s.length; R++) {
    const c = s[R];
    const prev = last.has(c) ? last.get(c) : -1;
    if (prev >= L) {
      yield frame({
        phase: "Shrink",
        note: `'${c}' is already in the window, at ${prev}. Every window containing both copies is invalid, so L jumps past it, to ${prev + 1}.`,
        detail: "L jumps straight there — no need to step one at a time, because 'last seen' remembers where the repeat was.",
        marks: { rows: rows(R, { [prev]: "pivot", [R]: "pivot" }, R - 1) },
        metrics: metrics(),
      });
      L = prev + 1;
    }
    last.set(c, R);
    const len = R - L + 1;
    const improved = len > best;
    if (improved) { best = len; bl = L; }
    yield frame({
      phase: "Grow",
      note: `Take '${c}' at ${R}. The window "${s.slice(L, R + 1).join("")}" has length ${len}${improved ? " — a new best." : "."}`,
      marks: { rows: rows(R) },
      metrics: metrics(),
    });
  }

  const word = s.slice(bl, bl + best).join("");
  yield frame({
    phase: "Done",
    note: `R has reached the end. The longest window was "${word}", length ${best}.`,
    detail: `Each character entered the window once and left it at most once: ${s.length} steps, not ${s.length * (s.length + 1) / 2} substrings.`,
    marks: { rows: [{ name: "s", values: s, cells: span(bl, bl + best - 1, "found"), ranges: [{ from: bl, to: bl + best - 1, label: `best = ${best}`, state: "best" }] }] },
    metrics: metrics([result(`longest = ${best} ("${word}")`)]),
  });
}

export const longestUnique = {
  id: "seq-longest-unique",
  section: "Algorithms",
  topic: "Stacks and windows",
  title: "Sliding window (longest unique substring)",
  blurb: "Grow a window on the right, shrink it on the left only when it breaks the rule",
  structure: SEQUENCE,
  run: longestUniqueRun,
  explanation: [
    { tip: "**In one line:** keep a window that always satisfies the rule; extend it on the right, and when it breaks, move the left edge just far enough to fix it." },
    "There are *n²/2* substrings, and checking each for repeats is slow. A **sliding window** reuses work: when the window moves one step, almost everything inside it is unchanged.",
    { h: "How it works" },
    { list: [
      "**R** advances one character per step and adds it to the window.",
      "If that character is already in the window, **L jumps** to just past its previous position — the earliest point where the window is valid again.",
      "A **last seen** table (the second row) makes the jump O(1): no scanning.",
      "After each step the window is valid, so its length is a candidate answer.",
    ] },
    { h: "Why it's linear" },
    "**L and R only move right.** Each index enters the window once and leaves at most once, so the total work is O(n) even though the loop looks like it might backtrack.",
    { h: "The template" },
    { list: [
      "**Longest window satisfying X:** grow R; while the window breaks X, advance L; record the length.",
      "**Shortest window satisfying X:** grow R; while the window satisfies X, record and advance L.",
      "Examples: at most *k* distinct characters, minimum window containing all of a pattern, longest run of 1s after *k* flips.",
      "It needs the rule to be **monotonic**: if a window breaks it, every larger window containing it does too.",
    ] },
  ],
  analysis: {
    time: "O(n) — L and R each move at most n times",
    space: "O(alphabet) for the last-seen table",
    notes: [
      "With a fixed alphabet (bytes), use an array of 256 ints instead of a hash map — faster and allocation-free.",
      "The jump `L = max(L, last[c] + 1)` needs the `max`: a character last seen *before* L is not in the window and must not move L backwards. The check `last[c] >= L` here does the same job.",
      "Fixed-size windows (k elements) are the simpler case: add the entering element, remove the leaving one.",
    ],
  },
  code: cpp("longest_unique.cpp", `#include <cstdio>
#include <string>
#include <vector>

int main() {
    std::string s = "abcabcbb";
    std::vector<int> last(256, -1);      // last index of each byte
    int L = 0, best = 0, bestL = 0;

    for (int R = 0; R < static_cast<int>(s.size()); ++R) {
        unsigned char c = s[R];
        if (last[c] >= L) L = last[c] + 1;   // repeat inside the window: jump past it
        last[c] = R;
        if (R - L + 1 > best) { best = R - L + 1; bestL = L; }
    }
    std::printf("longest = %d (\\"%s\\")\\n", best, s.substr(bestL, best).c_str());
}
`),
};

/* ------------------------------------------------------------------ */
/* sliding window maximum                                               */
/* ------------------------------------------------------------------ */

const SW_A = [1, 3, -1, -3, 5, 3, 6, 7];
const SW_K = 3;

function* windowMaxRun() {
  const a = SW_A;
  const k = SW_K;
  const out = Array(a.length - k + 1).fill(null);
  let dq = [];

  const rows = (i, dqCells = {}, aExtra = {}) => {
    const lo = Math.max(0, i - k + 1);
    return [
      {
        name: "a", values: a,
        cells: { ...(i >= 0 ? span(lo, i, "selected") : {}), ...aExtra },
        ranges: i >= 0 ? [{ from: lo, to: i, label: i >= k - 1 ? `window of ${k}` : "filling" }] : [],
        pointers: i >= 0 ? [{ name: "i", at: i }] : [],
      },
      { name: "deque", values: dq.map((j) => a[j]), labels: dq.map((j) => `#${j}`), cells: dqCells },
      { name: "max", values: [...out], labels: out.map((_, w) => `w${w}`) },
    ];
  };

  yield frame({
    phase: "Set up",
    note: `Report the maximum of every window of ${k} consecutive elements.`,
    detail: "The deque holds indices whose values are decreasing from front to back. The front is always the maximum of the current window.",
    marks: { rows: rows(-1) },
  });

  for (let i = 0; i < a.length; i++) {
    if (dq.length && dq[0] <= i - k) {
      const j = dq[0];
      yield frame({
        phase: "Expire",
        note: `Index ${j} has slid out of the window. Drop it from the front.`,
        marks: { rows: rows(i, { 0: "excluded" }, { [i]: "active" }) },
      });
      dq.shift();
    }
    while (dq.length && a[dq[dq.length - 1]] <= a[i]) {
      const j = dq[dq.length - 1];
      yield frame({
        phase: "Pop smaller",
        note: `a[${i}] = ${a[i]} ≥ a[${j}] = ${a[j]}. ${a[j]} is older and no bigger, so it can never be a window's maximum again. Pop it.`,
        detail: "This is what keeps the deque decreasing, and what makes the whole thing linear: every index is popped at most once.",
        marks: { rows: rows(i, { [dq.length - 1]: "excluded" }, { [i]: "active", [j]: "compared" }) },
      });
      dq.pop();
    }
    dq.push(i);
    const w = i - k + 1;
    if (w >= 0) out[w] = a[dq[0]];
    yield frame({
      phase: w >= 0 ? "Report" : "Fill",
      note: w >= 0
        ? `Push ${i}. The window a[${w}..${i}] is full; its maximum is the front of the deque, a[${dq[0]}] = ${a[dq[0]]}.`
        : `Push ${i}. The first window isn't full yet.`,
      marks: { rows: rows(i, { 0: w >= 0 ? "found" : "idle", [dq.length - 1]: "selected" }, { [i]: "active", ...(w >= 0 ? { [dq[0]]: "found" } : {}) }) },
    });
  }

  yield frame({
    phase: "Done",
    note: `All ${out.length} window maxima: ${out.join(", ")}.`,
    detail: `${a.length} pushes and at most ${a.length} pops in total — O(n), compared with O(n·k) for rescanning each window.`,
    marks: { rows: [{ name: "a", values: a }, { name: "max", values: out, labels: out.map((_, w) => `w${w}`), cells: span(0, out.length - 1, "found") }] },
    metrics: [result(out.join(" "))],
  });
}

export const windowMax = {
  id: "seq-window-max",
  section: "Algorithms",
  topic: "Stacks and windows",
  title: "Sliding window maximum (monotonic deque)",
  blurb: "Keep only the elements that could still be a maximum, in decreasing order",
  structure: SEQUENCE,
  run: windowMaxRun,
  explanation: [
    { tip: "**In one line:** a deque of indices with decreasing values — new elements evict smaller ones from the back, expired ones leave from the front, and the front is the answer." },
    "Rescanning each window of *k* costs O(n·k). A heap gets O(n log n). A **monotonic deque** gets **O(n)**, by never storing an element that can't matter.",
    { h: "The key observation" },
    "If a newer element is **at least as big** as an older one, the older one is useless: it leaves the window first and is never larger. So it can be thrown away **immediately**.",
    { h: "The three moves, every step" },
    { list: [
      "**Expire:** if the front index has slid out of the window, pop it from the front.",
      "**Evict:** while the back value is ≤ the new value, pop it from the back.",
      "**Push** the new index at the back. Once the window is full, the **front is its maximum**.",
    ] },
    { h: "Why it's linear" },
    "Each index is pushed **once** and popped **at most once**, so the total work across the whole array is O(n), even though the inner `while` can pop several at a time.",
    { h: "Where else" },
    { list: [
      "Sliding window **minimum** — flip the comparison.",
      "**DP optimisation**: `dp[i] = max(dp[j]) + cost` over a sliding range of *j* (e.g. jump game with a maximum jump of *k*).",
      "Shortest subarray with sum at least K (deque over prefix sums).",
    ] },
  ],
  analysis: {
    time: "O(n) — every index enters and leaves the deque at most once",
    space: "O(k) — the deque never holds more than one window",
    notes: [
      "Store indices, not values: the index is what tells you an element has expired.",
      "Using `<=` when evicting (rather than `<`) drops equal older values too, which keeps the deque strictly decreasing and smaller.",
      "A max-heap with lazy deletion also works, in O(n log n), and is easier to adapt to non-sliding ranges.",
    ],
  },
  code: cpp("window_max.cpp", `#include <cstdio>
#include <deque>
#include <vector>

int main() {
    std::vector<int> a{1, 3, -1, -3, 5, 3, 6, 7};
    const int k = 3;

    std::deque<int> dq;                 // indices; a[dq] is decreasing
    std::vector<int> out;
    for (int i = 0; i < static_cast<int>(a.size()); ++i) {
        if (!dq.empty() && dq.front() <= i - k) dq.pop_front();       // expired
        while (!dq.empty() && a[dq.back()] <= a[i]) dq.pop_back();    // can never win again
        dq.push_back(i);
        if (i >= k - 1) out.push_back(a[dq.front()]);
    }
    for (std::size_t w = 0; w < out.size(); ++w) std::printf(w ? " %d" : "%d", out[w]);
    std::printf("\\n");
}
`),
};

/* ------------------------------------------------------------------ */
/* next greater element                                                 */
/* ------------------------------------------------------------------ */

const NG_A = [2, 1, 2, 4, 3];

function* nextGreaterRun() {
  const a = NG_A;
  const ans = Array(a.length).fill(null);
  const st = [];

  const rows = (aCells = {}, stCells = {}, ansCells = {}) => [
    { name: "a", values: a, cells: aCells },
    { name: "stack", values: st.map((j) => a[j]), labels: st.map((j) => `#${j}`), cells: stCells },
    { name: "answer", values: [...ans], cells: ansCells },
  ];

  yield frame({
    phase: "Set up",
    note: "For each element, find the first element to its right that is bigger.",
    detail: "The stack holds the indices still waiting for an answer. Their values only decrease from bottom to top.",
    marks: { rows: rows() },
  });

  for (let i = 0; i < a.length; i++) {
    while (st.length && a[st[st.length - 1]] < a[i]) {
      const j = st[st.length - 1];
      ans[j] = a[i];
      yield frame({
        phase: "Resolve",
        note: `a[${i}] = ${a[i]} is bigger than a[${j}] = ${a[j]} on top of the stack, and it's the first such element after ${j}. So answer[${j}] = ${a[i]}. Pop.`,
        marks: { rows: rows({ [i]: "active", [j]: "compared" }, { [st.length - 1]: "found" }, { [j]: "found" }) },
      });
      st.pop();
    }
    st.push(i);
    yield frame({
      phase: "Push",
      note: st.length > 1
        ? `a[${i}] = ${a[i]} is not bigger than the top (${a[st[st.length - 2]]}). Push ${i}; it waits for its own answer.`
        : `Push ${i}. It waits for something bigger to arrive.`,
      marks: { rows: rows({ [i]: "active" }, { [st.length - 1]: "selected" }) },
    });
  }

  const left = [...st];
  for (const j of left) ans[j] = -1;
  st.length = 0;
  yield frame({
    phase: "Done",
    note: `The scan is over. ${left.length ? `Indices ${left.join(", ")} never met anything bigger, so their answer is −1.` : "Every element found an answer."}`,
    detail: `Each index was pushed once and popped at most once: ${a.length} pushes, ${a.length - left.length} pops.`,
    marks: { rows: rows({}, {}, span(0, a.length - 1, "found")) },
    metrics: [result(ans.join(" "))],
  });
}

export const nextGreater = {
  id: "seq-next-greater",
  section: "Algorithms",
  topic: "Stacks and windows",
  title: "Next greater element (monotonic stack)",
  blurb: "Elements wait on a stack until something bigger arrives and answers them all",
  structure: SEQUENCE,
  run: nextGreaterRun,
  explanation: [
    { tip: "**In one line:** scan left to right with a stack of unanswered indices; each new element pops — and answers — every smaller one on top." },
    "Looking right from every element is O(n²). A **monotonic stack** answers all of them in **one pass**, because the moment a bigger element arrives it is the answer for *every* smaller element still waiting.",
    { h: "How it works" },
    { list: [
      "The stack holds indices **still waiting** for a bigger element.",
      "When `a[i]` arrives, **pop** every index whose value is smaller — `a[i]` is the first bigger thing each of them has seen.",
      "Then **push** `i`: it waits for its own answer.",
      "Whatever is left at the end has **no** greater element (−1).",
    ] },
    { h: "Why the stack is decreasing" },
    "Anything smaller than `a[i]` was just popped, so after the push the values from bottom to top are **non-increasing**. That's why only the top ever needs checking: if the top isn't smaller than `a[i]`, nothing below it is either.",
    { h: "Same tool, other problems" },
    { list: [
      "**Daily temperatures** — store the distance `i − j` instead of the value.",
      "**Largest rectangle in a histogram** — the classic hard one; each bar's extent is bounded by the nearest smaller bars on both sides.",
      "**Stock span**, **trapping rain water**, **remove k digits** to make the smallest number.",
      "Flip `<` to `>` for next *smaller*; scan right to left for *previous* greater.",
    ] },
  ],
  analysis: {
    time: "O(n) — each index is pushed once and popped at most once",
    space: "O(n) — the stack, in the worst case of a decreasing array",
    notes: [
      "The nested `while` inside the `for` looks quadratic, but the total number of pops over the whole run can't exceed the number of pushes, which is n. This is amortised analysis.",
      "Circular arrays: scan the array twice (indices 0..2n−1, using i mod n) and only push during the first pass.",
      "Use `<` or `<=` deliberately: it decides whether an equal element counts as \"greater\".",
    ],
  },
  code: cpp("next_greater.cpp", `#include <cstdio>
#include <stack>
#include <vector>

int main() {
    std::vector<int> a{2, 1, 2, 4, 3};
    std::vector<int> ans(a.size(), -1);
    std::stack<int> st;                    // indices still waiting; values decrease upwards

    for (int i = 0; i < static_cast<int>(a.size()); ++i) {
        while (!st.empty() && a[st.top()] < a[i]) {
            ans[st.top()] = a[i];          // a[i] is the first bigger element after it
            st.pop();
        }
        st.push(i);
    }
    for (std::size_t i = 0; i < ans.size(); ++i) std::printf(i ? " %d" : "%d", ans[i]);
    std::printf("\\n");
}
`),
};
