/**
 * 560 Subarray Sum Equals K: prefix sums with a hash map (catalogue pattern A1).
 */

import { frame } from "../core/trace.js";
import { SEQUENCE, result, span } from "./seq-common.js";

const NUMS = [1, 2, 1, -1, 2, 1, -2, 3];
const K = 3;

const REFERENCE = `class Solution {
public:
    int subarraySum(vector<int>& nums, int k) {
        unordered_map<int, int> seen{{0, 1}};  // prefix sum -> how often it occurred
        int prefix = 0, count = 0;
        for (int x : nums) {
            prefix += x;
            // A subarray ending here sums to k exactly when an earlier prefix
            // equals prefix - k.
            auto it = seen.find(prefix - k);
            if (it != seen.end()) count += it->second;
            ++seen[prefix];  // after the lookup, so k = 0 does not count the empty subarray
        }
        return count;
    }
};`;

const BRUTE = `class Solution {
public:
    // Every start, extending right with a running sum: O(n^2).
    int subarraySum(vector<int>& nums, int k) {
        int count = 0, n = nums.size();
        for (int l = 0; l < n; ++l) {
            int sum = 0;
            for (int r = l; r < n; ++r) count += (sum += nums[r]) == k;
        }
        return count;
    }
};`;

const STARTER = `class Solution {
public:
    int subarraySum(vector<int>& nums, int k) {

    }
};`;

function* run() {
  const n = NUMS.length;
  const prefix = [0];
  for (const x of NUMS) prefix.push(prefix[prefix.length - 1] + x);
  const seen = new Map([[0, 1]]);
  let count = 0;
  let found = [];

  const rows = (i, cells = {}, ranges = [], pcells = {}) => {
    const keys = [...seen.keys()].sort((a, b) => a - b);
    return [
      {
        name: "nums", values: NUMS,
        cells: { ...(i >= 0 ? { [i]: "active" } : {}), ...cells },
        pointers: i >= 0 ? [{ name: "i", at: i }] : [],
        ranges,
      },
      {
        name: "prefix", values: prefix.map((p, j) => (j <= i + 1 ? p : null)),
        labels: prefix.map((_, j) => (j === 0 ? "start" : `..${j - 1}`)),
        cells: pcells,
      },
      { name: "seen", values: keys.map((k) => seen.get(k)), labels: keys.map((k) => `p=${k}`) },
    ];
  };
  const metrics = (extra = []) => [{ label: "k", value: String(K) }, { label: "Count", value: String(count) }, ...extra];

  yield frame({
    phase: "Set up",
    note: `Count the subarrays of [${NUMS.join(", ")}] that sum to ${K}. Negatives are allowed, so a sliding window cannot work.`,
    detail: "sum(l..i) = prefix(i) − prefix(l − 1). So at each i, count the earlier prefixes equal to prefix(i) − k. The empty prefix 0 is seen once before we start.",
    marks: { rows: rows(-1) },
    metrics: metrics(),
  });

  for (let i = 0; i < n; i++) {
    const p = prefix[i + 1];
    const need = p - K;
    const hits = [];
    for (let j = 0; j <= i; j++) if (prefix[j] === need) hits.push(j);
    const c = seen.get(need) || 0;
    yield frame({
      phase: "Scan",
      note: `Add ${NUMS[i]}: the prefix is now ${p}. Look up ${p} − ${K} = ${need} in seen: ${c ? `it occurred ${c} time${c > 1 ? "s" : ""}` : "never seen"}.`,
      marks: { rows: rows(i, {}, [], { [i + 1]: "active", ...Object.fromEntries(hits.map((j) => [j, "compared"])) }) },
      metrics: metrics(),
    });
    if (c) {
      count += c;
      found = hits.map((j) => ({ from: j, to: i, label: `sum ${K}` }));
      yield frame({
        phase: "Match",
        note: `Each earlier prefix of ${need} starts a subarray ending at ${i} that sums to ${K}: ${hits.map((j) => `${j}..${i}`).join(" and ")}. Count += ${c}.`,
        detail: hits.map((j) => `[${NUMS.slice(j, i + 1).join(", ")}] = ${K}`).join(" · "),
        marks: { rows: rows(i, span(hits[0], i, "selected", { [i]: "active" }), found, { [i + 1]: "found", ...Object.fromEntries(hits.map((j) => [j, "found"])) }) },
        metrics: metrics(),
      });
    }
    seen.set(p, (seen.get(p) || 0) + 1);
  }

  yield frame({
    phase: "Done",
    note: `${count} subarrays sum to ${K}, found in one pass with one lookup per element.`,
    marks: { rows: rows(n - 1) },
    metrics: metrics([result(count)]),
  });
}

export const lc560 = {
  id: "lc-560",
  section: "Interview problems",
  topic: "A1 · Prefix sums with a hash map",
  title: "560. Subarray Sum Equals K",
  blurb: "A subarray sum is a difference of two prefix sums, so count the earlier prefixes that complete k.",
  structure: SEQUENCE,
  run,
  explanation: [
    "Any subarray sum is a difference of two prefix sums: sum(l..i) = prefix(i) − prefix(l − 1). Fixing the right end i, a subarray ending there sums to k exactly when some earlier prefix equals prefix(i) − k. So the question becomes: how many earlier prefixes have that value? A hash map from prefix value to count answers it in O(1).",
    "The map starts with the empty prefix, 0, counted once. Without it, subarrays that start at index 0 are missed. Each step looks up first and records its own prefix second; the other order would count an empty subarray whenever k = 0.",
    "A sliding window is the tempting wrong answer. It needs the window sum to move monotonically with its size, which fails as soon as negative numbers appear. Here the input has a −1 and a −2, and four of the eight answers include one of them.",
    { tip: "Signal: count or find subarrays whose sum, or sum mod k, or balance, equals something, with negatives allowed. The same map keyed by sum mod k solves 974 and 523; mapping 0 to −1 solves 525." },
  ],
  analysis: {
    time: "O(n) expected: one hash lookup and one insert per element",
    space: "O(n) for the map, one entry per distinct prefix",
    notes: [
      "The brute force is O(n²), which LeetCode's n ≤ 2·10⁴ only just tolerates; the stress test here uses 2·10⁵ to separate the two.",
      "With an adversarial input, unordered_map can degrade towards O(n) per operation. A sorted map gives a guaranteed O(n log n).",
      "The prefix stays within int here (2·10⁴ × 1000); larger bounds need long long keys.",
      "For the longest subarray with sum k, store each prefix's first index instead of its count.",
    ],
  },
  code: {
    lang: "cpp",
    files: [{
      name: "solution.cpp",
      note: "The LeetCode-shaped solution, plus a main over the animation's input that prints its Result.",
      source: `#include <cstdio>\n#include <unordered_map>\n#include <vector>\nusing namespace std;\n\n${REFERENCE}\n\nint main() {\n    vector<int> nums{${NUMS.join(", ")}};\n    printf("%d\\n", Solution().subarraySum(nums, ${K}));\n}\n`,
      traced: true,
    }],
  },
  problem: {
    number: 560,
    slug: "subarray-sum-equals-k",
    difficulty: "M",
    tier: "core",
    pattern: "A1",
    themes: ["Subarray"],
    statement: [
      "Given an integer array and an integer k, return how many contiguous, non-empty subarrays sum to exactly k.",
      "Up to 2·10⁴ elements between −1000 and 1000; k is between −10⁷ and 10⁷.",
    ],
    hints: [
      "The numbers can be negative. Why does that rule out a sliding window?",
      "Write sum(l..r) using prefix sums. What has to be true of the prefix before l?",
      "Walking left to right, keep a hash map from each prefix value seen so far to how many times it occurred. At each index, add the count for prefix − k.",
      "Seed the map with the empty prefix, and look up before you insert.",
    ],
    brute: "Try every start and extend to the right with a running sum: O(n²). It survives LeetCode's limit of 2·10⁴, barely, and times out on the stress case here, which uses 2·10⁵ elements.",
    invariant: "Before processing index i, the map holds every prefix(j) for j < i, with multiplicity. The subarrays ending at i that sum to k are in one-to-one correspondence with the entries equal to prefix(i) − k.",
    traps: [
      "Forgetting the initial {0: 1}: every subarray that starts at index 0 is missed.",
      "Inserting the current prefix before the lookup: with k = 0, each element then matches itself, counting an empty subarray.",
      "Reaching for two pointers: the window sum is not monotone once negative numbers appear.",
    ],
    followUps: [
      "974 Subarray Sums Divisible by K: key the map by prefix mod k, normalised to be non-negative in C++.",
      "Return the longest such subarray instead of the count: keep the first index of each prefix.",
      "1074 Number of Submatrices That Sum to Target: fix a pair of rows, collapse the columns, and run this on the resulting array. O(rows² × cols).",
      "The array is a stream too large to store. The map is all the state you need; what bounds its size?",
    ],
    tests: {
      fn: "subarraySum",
      args: [{ type: "vector<int>", name: "nums" }, { type: "int", name: "k" }],
      starter: STARTER,
      reference: REFERENCE,
      brute: BRUTE,
      cases: [
        { name: "example", args: ["{1, 1, 1}", "2"] },
        { name: "example 2", args: ["{1, 2, 3}", "3"] },
        { name: "negatives", args: ["{1, -1, 0}", "0"] },
        { name: "k = 0 with zeros", args: ["{0, 0, 0}", "0"] },
        { name: "single, no match", args: ["{5}", "3"] },
        { name: "negative k", args: ["{-1, -1, 1}", "-1"] },
      ],
      random: { count: 400, gen: "nums = rnd_vec(rnd(1, 10), -3, 3); k = rnd(-4, 4);" },
      stress: { label: "2·10⁵ elements", gen: "nums = rnd_vec(200000, -1000, 1000); k = 7;" },
    },
  },
};
