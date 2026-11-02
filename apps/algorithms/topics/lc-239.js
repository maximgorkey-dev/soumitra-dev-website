/**
 * 239 Sliding Window Maximum: monotonic deque (catalogue pattern A3).
 */

import { frame } from "../core/trace.js";
import { SEQUENCE, result } from "./seq-common.js";

const NUMS = [1, 3, -1, -3, 5, 3, 6, 7];
const K = 3;

const REFERENCE = `class Solution {
public:
    vector<int> maxSlidingWindow(vector<int>& nums, int k) {
        deque<int> dq;  // indices; their values strictly decrease from front to back
        vector<int> out;
        for (int i = 0; i < (int)nums.size(); ++i) {
            if (!dq.empty() && dq.front() <= i - k) dq.pop_front();  // slid out of the window
            // Anything not bigger than nums[i] leaves before it and is never bigger: drop it.
            while (!dq.empty() && nums[dq.back()] <= nums[i]) dq.pop_back();
            dq.push_back(i);
            if (i >= k - 1) out.push_back(nums[dq.front()]);
        }
        return out;
    }
};`;

const BRUTE = `class Solution {
public:
    // Scan every window for its maximum: O(n k).
    vector<int> maxSlidingWindow(vector<int>& nums, int k) {
        vector<int> out;
        for (size_t i = 0; i + k <= nums.size(); ++i)
            out.push_back(*max_element(nums.begin() + i, nums.begin() + i + k));
        return out;
    }
};`;

const STARTER = `class Solution {
public:
    vector<int> maxSlidingWindow(vector<int>& nums, int k) {

    }
};`;

function* run() {
  const n = NUMS.length;
  const dq = [];
  const out = [];

  const rows = (i, cells = {}) => [
    {
      name: "nums", values: NUMS,
      cells: { ...(i >= 0 ? { [i]: "active" } : {}), ...cells },
      pointers: i >= 0 ? [{ name: "i", at: i }] : [],
      ranges: i >= 0 ? [{ from: Math.max(0, i - K + 1), to: i, label: i >= K - 1 ? `window` : "filling" }] : [],
    },
    { name: "deque", values: dq.map((j) => NUMS[j]), labels: dq.map((j) => `#${j}`), cells: dq.length ? { 0: "found" } : {} },
    { name: "maxima", values: [...out] },
  ];
  const fmt = () => `[${out.join(",")}]`;

  yield frame({
    phase: "Set up",
    note: `Report the maximum of every window of ${K} in [${NUMS.join(", ")}].`,
    detail: "The deque keeps indices whose values strictly decrease from front to back. The front is always the window's maximum.",
    marks: { rows: rows(-1) },
    metrics: [],
  });

  for (let i = 0; i < n; i++) {
    if (dq.length && dq[0] <= i - K) {
      const gone = dq.shift();
      yield frame({
        phase: "Expire",
        note: `Index ${gone} (value ${NUMS[gone]}) has slid out of the window, so it leaves from the front.`,
        marks: { rows: rows(i, { [gone]: "excluded" }) },
        metrics: [{ label: "Output", value: fmt() }],
      });
    }
    const popped = [];
    while (dq.length && NUMS[dq[dq.length - 1]] <= NUMS[i]) popped.push(dq.pop());
    if (popped.length) {
      yield frame({
        phase: "Drop",
        note: `${NUMS[i]} arrives. ${popped.map((j) => NUMS[j]).join(" and ")} ${popped.length > 1 ? "are" : "is"} not bigger and will leave the window first, so ${popped.length > 1 ? "they" : "it"} can never be a maximum again: drop from the back.`,
        detail: "This is why the deque stays decreasing, and why each index is popped at most once overall.",
        marks: { rows: rows(i, Object.fromEntries(popped.map((j) => [j, "excluded"]))) },
        metrics: [{ label: "Output", value: fmt() }],
      });
    }
    dq.push(i);
    if (i >= K - 1) out.push(NUMS[dq[0]]);
    yield frame({
      phase: i >= K - 1 ? "Report" : "Fill",
      note: i >= K - 1
        ? `Push ${NUMS[i]}. The window ${i - K + 1}..${i} has its maximum at the front of the deque: ${NUMS[dq[0]]}.`
        : `Push ${NUMS[i]}. The first window is not full yet.`,
      marks: { rows: rows(i, { [dq[0]]: "found" }) },
      metrics: [{ label: "Output", value: fmt() }],
    });
  }

  yield frame({
    phase: "Done",
    note: `All ${n - K + 1} window maxima in one pass: each index entered and left the deque at most once.`,
    marks: { rows: rows(-1) },
    metrics: [result(fmt())],
  });
}

export const lc239 = {
  id: "lc-239",
  section: "Interview problems",
  topic: "A3 · Monotonic deque",
  title: "239. Sliding Window Maximum",
  blurb: "Keep only the elements that could still become a window maximum; they form a decreasing deque whose front is the answer.",
  structure: SEQUENCE,
  run,
  explanation: [
    "When a new value arrives, every older value that is not bigger becomes useless: it leaves the window before the newcomer does, and while both are inside, the newcomer is at least as big. So those older values can be thrown away for good.",
    "What survives is a run of indices whose values strictly decrease from oldest to newest. The oldest survivor, at the front, is the maximum of the window. The only other event is the front sliding out of the window, which is checked against its index.",
    "Pushes and pops happen at both ends, so the structure is a deque. Each index is pushed once and popped at most once, so the whole pass is O(n) even with the inner loop.",
    { tip: "Signal: a maximum or minimum over a sliding window, or a DP whose transition takes the best of the last k states (1696 Jump Game VI, 1425 Constrained Subsequence Sum). 862 Shortest Subarray with Sum at Least K runs the same deque over prefix sums." },
  ],
  analysis: {
    time: "O(n): every index is pushed and popped at most once",
    space: "O(k) for the deque, plus the output",
    notes: [
      "A max-heap with lazy deletion also works, in O(n log n). It is the answer interviewers expect you to improve on.",
      "A balanced tree or a multiset gives O(n log k) and handles a window maximum and minimum at once, which is useful when both are needed (1438).",
      "Popping on ≤ rather than < keeps the deque strictly decreasing and smaller. Either is correct.",
      "Storing indices, not values, is what makes the expiry check possible.",
    ],
  },
  code: {
    lang: "cpp",
    files: [{
      name: "solution.cpp",
      note: "The LeetCode-shaped solution, plus a main over the animation's input that prints its Result.",
      source: `#include <cstdio>\n#include <deque>\n#include <vector>\nusing namespace std;\n\n${REFERENCE}\n\nint main() {\n    vector<int> nums{${NUMS.join(", ")}};\n    vector<int> out = Solution().maxSlidingWindow(nums, ${K});\n    printf("[");\n    for (size_t i = 0; i < out.size(); ++i) printf(i ? ",%d" : "%d", out[i]);\n    printf("]\\n");\n}\n`,
      traced: true,
    }],
  },
  problem: {
    number: 239,
    slug: "sliding-window-maximum",
    difficulty: "H",
    tier: "core",
    pattern: "A3",
    themes: ["Subarray"],
    statement: [
      "A window of size k slides across an integer array from left to right, one position at a time. Return the maximum inside the window at each position.",
      "Up to 10⁵ elements between −10⁴ and 10⁴, and 1 ≤ k ≤ n.",
    ],
    hints: [
      "A heap gives O(n log n). What makes an element useless as a future maximum?",
      "If a newer element is at least as big as an older one, the older one can never be the maximum again.",
      "The useful elements then form a decreasing sequence. Keep their indices in a deque: drop smaller ones from the back when a value arrives, and drop the front when it leaves the window.",
      "The front of the deque is the answer for the current window.",
    ],
    brute: "Take the maximum of each window directly: O(n·k), up to 5·10⁹ steps when k = n / 2. The stress case does exactly that.",
    invariant: "The deque holds, in order, the indices in the current window that are bigger than everything after them in the window. Their values strictly decrease, so the front is the maximum.",
    traps: [
      "Storing values instead of indices: you can no longer tell when the front has left the window.",
      "Checking expiry with < instead of ≤: index i − k is already outside the window ending at i.",
      "Recording an answer before the first window is full (i < k − 1).",
    ],
    followUps: [
      "Both the maximum and the minimum of every window: keep two deques (1438 asks for the longest window where max − min ≤ limit).",
      "1696 Jump Game VI: dp[i] = nums[i] + the best dp in the last k. This deque makes it O(n).",
      "The window is defined by time, not count (the last 60 seconds of a stream). What changes in the expiry rule?",
      "The stream is too fast for one machine. Can windows be split across workers and merged?",
    ],
    tests: {
      fn: "maxSlidingWindow",
      args: [{ type: "vector<int>", name: "nums" }, { type: "int", name: "k" }],
      starter: STARTER,
      reference: REFERENCE,
      brute: BRUTE,
      cases: [
        { name: "example", args: ["{1, 3, -1, -3, 5, 3, 6, 7}", "3"] },
        { name: "k = 1", args: ["{4, -2, 9}", "1"] },
        { name: "k = n", args: ["{2, 7, 1, 8}", "4"] },
        { name: "decreasing", args: ["{9, 8, 7, 6, 5}", "2"] },
        { name: "equal values", args: ["{3, 3, 3, 3}", "2"] },
      ],
      random: { count: 400, gen: "nums = rnd_vec(rnd(1, 12), -5, 5); k = rnd(1, nums.size());" },
      stress: { label: "10⁵ elements, k = 5·10⁴", gen: "nums = rnd_vec(100000, -10000, 10000); k = 50000;" },
    },
  },
};
