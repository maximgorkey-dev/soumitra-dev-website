/**
 * 3551 Minimum Swaps to Sort by Digit Sum: the fewest swaps reaching a target
 * permutation is n minus its number of cycles (catalogue pattern C7).
 */

import { frame } from "../core/trace.js";
import { SEQUENCE, result } from "./seq-common.js";

const NUMS = [18, 43, 7, 25, 9, 40];

const REFERENCE = `class Solution {
public:
    int minSwaps(vector<int>& nums) {
        int n = nums.size();
        vector<pair<int, int>> key(n);  // (digit sum, value): the target order
        for (int i = 0; i < n; ++i) {
            int s = 0;
            for (int x = nums[i]; x; x /= 10) s += x % 10;
            key[i] = {s, nums[i]};
        }
        vector<int> from(n);  // from[k] = current index of the element that belongs at k
        iota(from.begin(), from.end(), 0);
        sort(from.begin(), from.end(), [&](int a, int b) { return key[a] < key[b]; });
        vector<bool> seen(n);
        int swaps = 0;
        for (int i = 0; i < n; ++i) {
            int len = 0;
            for (int j = i; !seen[j]; j = from[j]) seen[j] = true, ++len;
            if (len) swaps += len - 1;  // a cycle of length L needs L - 1 swaps
        }
        return swaps;
    }
};`;

const BRUTE = `class Solution {
public:
    // Selection sort by (digit sum, value), counting the swaps that move something: O(n^2).
    int minSwaps(vector<int>& nums) {
        auto ds = [](int x) { int s = 0; for (; x; x /= 10) s += x % 10; return s; };
        auto before = [&](int a, int b) { return make_pair(ds(a), a) < make_pair(ds(b), b); };
        int n = nums.size(), swaps = 0;
        for (int i = 0; i < n; ++i) {
            int m = i;
            for (int j = i + 1; j < n; ++j)
                if (before(nums[j], nums[m])) m = j;
            if (m != i) swap(nums[i], nums[m]), ++swaps;
        }
        return swaps;
    }
};`;

const STARTER = `class Solution {
public:
    int minSwaps(vector<int>& nums) {

    }
};`;

const CYCLE_STATES = ["active", "pivot", "selected", "compared"];

function* run() {
  const n = NUMS.length;
  const ds = (x) => String(x).split("").reduce((s, d) => s + Number(d), 0);
  const order = NUMS.map((_, i) => i).sort((a, b) => ds(NUMS[a]) - ds(NUMS[b]) || NUMS[a] - NUMS[b]);
  const target = order.map((i) => NUMS[i]);
  const dest = Array(n);
  order.forEach((i, k) => { dest[i] = k; });
  const rows = (cells = {}, extra = []) => [
    { name: "nums", values: NUMS, cells },
    { name: "digit sum", values: NUMS.map(ds) },
    { name: "goes to", values: dest.map((k) => k + 1), cells },
    ...extra,
  ];

  yield frame({
    phase: "Set up",
    note: `Sort [${NUMS.join(", ")}] by digit sum, breaking ties by value, using the fewest swaps of any two elements.`,
    detail: `Work out where each element must end up first. The target order is [${target.join(", ")}].`,
    marks: { rows: rows({}, [{ name: "target", values: target }]) },
    metrics: [],
  });

  yield frame({
    phase: "Destinations",
    note: `Read "goes to" as arrows: element at slot i must move to slot dest(i). Following arrows from any slot always returns to it.`,
    detail: "That is a permutation, and a permutation splits into disjoint cycles.",
    marks: { rows: rows() },
    metrics: [],
  });

  const seen = Array(n).fill(false);
  const cells = {};
  let cycles = 0;
  let swaps = 0;
  for (let i = 0; i < n; i++) {
    if (seen[i]) continue;
    const cyc = [];
    for (let j = i; !seen[j]; j = dest[j]) { seen[j] = true; cyc.push(j); }
    const state = cyc.length === 1 ? "sorted" : CYCLE_STATES[cycles % CYCLE_STATES.length];
    cyc.forEach((j) => { cells[j] = state; });
    cycles++;
    swaps += cyc.length - 1;
    yield frame({
      phase: cyc.length === 1 ? "Fixed point" : "Cycle",
      note: cyc.length === 1
        ? `${NUMS[i]} at slot ${i + 1} is already in place: a cycle of length 1, no swaps.`
        : `Cycle ${cyc.map((j) => `slot ${j + 1}`).join(" → ")} → slot ${i + 1}, length ${cyc.length}: ${cyc.length - 1} swap${cyc.length > 2 ? "s" : ""}.`,
      detail: cyc.length > 1 ? "Each swap within a cycle can put at most one more element home and split the cycle in two; a cycle of length L needs exactly L − 1." : undefined,
      marks: { rows: rows({ ...cells }) },
      metrics: [{ label: "Cycles", value: String(cycles) }, { label: "Swaps", value: String(swaps) }],
    });
  }

  yield frame({
    phase: "Done",
    note: `n − cycles = ${n} − ${cycles} = ${swaps} swaps.`,
    marks: { rows: rows({ ...cells }, [{ name: "target", values: target, cells: Object.fromEntries(target.map((_, k) => [k, "found"])) }]) },
    metrics: [{ label: "Cycles", value: String(cycles) }, result(swaps)],
  });
}

export const lc3551 = {
  id: "lc-3551",
  section: "Interview problems",
  topic: "C7 · Permutation cycles",
  title: "3551. Minimum Swaps to Sort by Digit Sum",
  blurb: "Map each element to its target slot; that permutation splits into cycles, and a cycle of length L costs L − 1 swaps. The answer is n − cycles.",
  structure: SEQUENCE,
  run,
  explanation: [
    "The values are distinct, so the target order is fully determined: sort by (digit sum, value). That gives every element a destination slot, and \"slot i's element goes to slot dest(i)\" is a permutation.",
    "A permutation is a set of disjoint cycles. A swap of two elements in the same cycle splits it into two; a swap across two cycles merges them. Sorting means reaching n cycles of length 1. Each swap adds at most one cycle, so at least n − c swaps are needed, where c is the starting number of cycles, and swapping each misplaced element straight to its destination achieves exactly that.",
    "So the work is: compute the target order, then count cycles with a visited array. The animation colours each cycle; fixed points are cycles of length 1.",
    { tip: "Signal: \"minimum swaps (any two positions) to sort\" or to reach a given arrangement, with distinct keys. Map to target positions, then count cycles. Compare 2471 (sort each tree level) and 765 Couples Holding Hands. Adjacent swaps are a different problem: that count is the number of inversions." },
  ],
  analysis: {
    time: "O(n log n) for the sort; the cycle count is O(n)",
    space: "O(n)",
    notes: [
      "Selection sort that counts the swaps it makes gives the same number (each swap puts one element home), but in O(n²).",
      "Distinct values matter: with duplicates, the target positions are not unique, and the problem becomes much harder.",
      "Computing digit sums once, not inside the comparator, saves a factor of about 10 in the sort.",
    ],
  },
  code: {
    lang: "cpp",
    files: [{
      name: "solution.cpp",
      note: "The LeetCode-shaped solution, plus a main over the animation's input that prints its Result.",
      source: `#include <algorithm>\n#include <cstdio>\n#include <numeric>\n#include <utility>\n#include <vector>\nusing namespace std;\n\n${REFERENCE}\n\nint main() {\n    vector<int> nums{${NUMS.join(", ")}};\n    printf("%d\\n", Solution().minSwaps(nums));\n}\n`,
      traced: true,
    }],
  },
  problem: {
    number: 3551,
    slug: "minimum-swaps-to-sort-by-digit-sum",
    difficulty: "M",
    tier: "core",
    pattern: "C7",
    themes: ["Sorting", "Permutations"],
    statement: [
      "You are given distinct positive integers. The desired order sorts them by the sum of their decimal digits, and among equal digit sums, by value. A swap exchanges any two elements. Return the fewest swaps that put the array into the desired order.",
      "Up to 10⁵ elements, each up to 10⁹.",
    ],
    hints: [
      "Since the values are distinct, where must each element end up?",
      "Draw an arrow from each slot to its element's destination. What shape do the arrows form?",
      "Disjoint cycles. How many swaps does a cycle of length L need?",
      "L − 1, so the answer is n minus the number of cycles.",
    ],
    brute: "Selection sort by the desired order, counting the swaps that move something: correct, because every such swap puts one element home, but O(n²) comparisons with digit sums, too slow at 10⁵.",
    invariant: "Every swap changes the number of cycles by exactly one, up or down. The sorted state has n cycles, so at least n − c swaps are needed, and swapping elements home achieves it.",
    traps: [
      "Counting misplaced elements instead of cycles: two elements that trade places are 2 misplaced but 1 swap.",
      "Forgetting the tie-break by value, which makes the target ambiguous.",
      "Computing the digit sum inside the comparator for every comparison: correct but about 10 times slower.",
    ],
    followUps: [
      "Only adjacent swaps are allowed: count inversions with merge sort or a Fenwick tree.",
      "2471 Minimum Number of Operations to Sort a Binary Tree by Level: the same count, once per level.",
      "765 Couples Holding Hands: cycles over couples instead of elements.",
      "Return the swaps themselves, not just their number.",
    ],
    tests: {
      fn: "minSwaps",
      args: [{ type: "vector<int>", name: "nums" }],
      starter: STARTER,
      reference: REFERENCE,
      brute: BRUTE,
      cases: [
        { name: "example", args: ["{37, 100}"] },
        { name: "already sorted", args: ["{1, 2, 3, 4}"] },
        { name: "ties by value", args: ["{22, 13, 31, 4}"] },
        { name: "one element", args: ["{5}"] },
        { name: "three-cycle", args: ["{3, 1, 2}"] },
      ],
      random: { count: 400, gen: "{ set<int> lt_s; int lt_n = rnd(1, 8); while ((int)lt_s.size() < lt_n) lt_s.insert(rnd(1, 60)); nums.assign(lt_s.begin(), lt_s.end()); for (int i = (int)nums.size() - 1; i > 0; --i) swap(nums[i], nums[rnd(0, i)]); }" },
      stress: { label: "10⁵ distinct values", gen: "nums.resize(100000); for (int i = 0; i < 100000; ++i) nums[i] = 1 + i * 9973 % 1000000007; for (int i = 99999; i > 0; --i) swap(nums[i], nums[rnd(0, i)]);" },
    },
  },
};
