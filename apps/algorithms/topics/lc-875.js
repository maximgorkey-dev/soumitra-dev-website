/**
 * 875 Koko Eating Bananas: binary search on the answer (catalogue pattern B1).
 */

import { frame } from "../core/trace.js";
import { SEQUENCE, result } from "./seq-common.js";

const PILES = [3, 6, 7, 11];
const HOURS = 8;

const REFERENCE = `class Solution {
public:
    int minEatingSpeed(vector<int>& piles, int h) {
        int lo = 1, hi = *max_element(piles.begin(), piles.end());  // the answer is in [lo, hi]
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;
            long long hours = 0;
            for (int p : piles) hours += (p - 1) / mid + 1;  // ceil(p / mid) without overflow
            if (hours <= h) hi = mid;  // fast enough, so the answer is mid or slower
            else lo = mid + 1;         // too slow
        }
        return lo;
    }
};`;

const BRUTE = `class Solution {
public:
    // Try speeds 1, 2, 3, ... until one is fast enough: O(max(piles) * n).
    int minEatingSpeed(vector<int>& piles, int h) {
        for (int k = 1;; ++k) {
            long long hours = 0;
            for (int p : piles) hours += (p - 1) / k + 1;
            if (hours <= h) return k;
        }
    }
};`;

const STARTER = `class Solution {
public:
    int minEatingSpeed(vector<int>& piles, int h) {

    }
};`;

function* run() {
  const max = Math.max(...PILES);
  const speeds = Array.from({ length: max }, (_, i) => i + 1);
  let lo = 1;
  let hi = max;
  const hoursAt = (k) => PILES.map((p) => Math.ceil(p / k));

  const rows = ({ mid = 0, per = null, verdict = null } = {}) => [
    { name: "piles", values: PILES },
    { name: "hours", values: per || PILES.map(() => null), cells: per ? Object.fromEntries(per.map((_, i) => [i, "compared"])) : {} },
    {
      name: "speed", values: speeds,
      cells: Object.fromEntries(speeds.map((s, i) => [i, s < lo || s > hi ? "excluded" : s === mid ? (verdict === null ? "active" : verdict ? "found" : "pivot") : "idle"])),
      pointers: [{ name: "lo", at: lo - 1 }, { name: "hi", at: hi - 1 }, ...(mid ? [{ name: "mid", at: mid - 1 }] : [])],
      ranges: [{ from: lo - 1, to: hi - 1, label: "the answer is in here" }],
    },
  ];

  yield frame({
    phase: "Set up",
    note: `Koko has ${HOURS} hours for piles [${PILES.join(", ")}]. Find the slowest whole speed that finishes in time.`,
    detail: `Eating at speed k, a pile p takes ⌈p / k⌉ hours. Faster never takes longer, so "fast enough" is false, then true: a monotone predicate over 1…${max}.`,
    marks: { rows: rows() },
    metrics: [{ label: "h", value: String(HOURS) }],
  });

  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    const per = hoursAt(mid);
    const total = per.reduce((a, b) => a + b, 0);
    const ok = total <= HOURS;
    yield frame({
      phase: "Check",
      note: `Try speed ${mid}: the piles take ${per.join(" + ")} = ${total} hours.`,
      marks: { rows: rows({ mid, per }) },
      metrics: [{ label: "h", value: String(HOURS) }, { label: `hours at ${mid}`, value: String(total) }],
    });
    yield frame({
      phase: ok ? "Fast enough" : "Too slow",
      note: ok
        ? `${total} ≤ ${HOURS}: speed ${mid} works, so the answer is ${mid} or slower. hi = ${mid}.`
        : `${total} > ${HOURS}: speed ${mid} is too slow, and so is anything slower. lo = ${mid + 1}.`,
      marks: { rows: rows({ mid, per, verdict: ok }) },
      metrics: [{ label: "h", value: String(HOURS) }, { label: `hours at ${mid}`, value: String(total) }],
    });
    if (ok) hi = mid;
    else lo = mid + 1;
  }

  yield frame({
    phase: "Done",
    note: `lo and hi meet at ${lo}: the slowest speed that finishes in ${HOURS} hours.`,
    detail: `${Math.ceil(Math.log2(max))} checks of O(n) each, instead of trying all ${max} speeds.`,
    marks: { rows: rows({ mid: lo, per: hoursAt(lo), verdict: true }) },
    metrics: [{ label: "h", value: String(HOURS) }, result(lo)],
  });
}

export const lc875 = {
  id: "lc-875",
  section: "Interview problems",
  topic: "B1 · Binary search on the answer",
  title: "875. Koko Eating Bananas",
  blurb: "\"Fast enough\" is monotone in the speed, so binary search the speed and check each guess greedily in O(n).",
  structure: SEQUENCE,
  run,
  explanation: [
    "The question asks for a minimum over answers, not over the input. The key observation is monotonicity: if Koko finishes in time at speed k, she also finishes at any speed above k. So the predicate \"speed k is fast enough\" is false for small k and true from some point on, and binary search finds that point.",
    "Each guess is checked directly: the hours at speed k are the sum of ⌈p / k⌉ over the piles, O(n). The search runs over speeds 1 to max(piles), since eating faster than the biggest pile never helps. That is O(n log max) in total.",
    "The loop keeps the answer inside [lo, hi]. A speed that works moves hi down to it, because it could be the answer; a speed that fails moves lo past it. When they meet, that is the slowest working speed. The animation greys out the speeds that have been ruled out.",
    { tip: "Signal: \"the minimum speed, capacity, time or largest part such that…\" (minimise the maximum), or \"maximise the minimum distance\". Write feasible(x) first, then search x. Siblings: 1011, 410, 1482, 2064, 1552." },
  ],
  analysis: {
    time: "O(n log max(piles))",
    space: "O(1)",
    notes: [
      "With 10⁴ piles of up to 10⁹, that is about 30 checks of 10⁴ each, against 10⁹ × 10⁴ for trying every speed.",
      "The hours can exceed int: 10⁴ piles of 10⁹ at speed 1 is 10¹³, so accumulate in long long.",
      "(p + k − 1) / k overflows int when p and k are both near 10⁹; (p − 1) / k + 1 does not.",
      "The same loop shape (while lo < hi, hi = mid on success) is the template for every \"smallest x such that\" search.",
    ],
  },
  code: {
    lang: "cpp",
    files: [{
      name: "solution.cpp",
      note: "The LeetCode-shaped solution, plus a main over the animation's input that prints its Result.",
      source: `#include <algorithm>\n#include <cstdio>\n#include <vector>\nusing namespace std;\n\n${REFERENCE}\n\nint main() {\n    vector<int> piles{${PILES.join(", ")}};\n    printf("%d\\n", Solution().minEatingSpeed(piles, ${HOURS}));\n}\n`,
      traced: true,
    }],
  },
  problem: {
    number: 875,
    slug: "koko-eating-bananas",
    difficulty: "M",
    tier: "core",
    pattern: "B1",
    themes: ["Koko-style"],
    statement: [
      "There are piles of bananas, and h hours. Each hour Koko picks one pile and eats k bananas from it, or the whole pile if it has fewer, and does nothing else that hour. Return the smallest whole k that lets her finish every pile within h hours.",
      "Up to 10⁴ piles of up to 10⁹ bananas, and n ≤ h ≤ 10⁹.",
    ],
    hints: [
      "If a speed works, does every faster speed work too?",
      "So the answers that work form a range [answer, ∞). You need the left end of a monotone yes or no: binary search.",
      "For a guess k, the time is the sum of ⌈p / k⌉ over the piles. What are the smallest and largest speeds worth trying?",
      "Search 1 … max(piles). On success set hi = mid, otherwise lo = mid + 1, until lo = hi.",
    ],
    brute: "Try k = 1, 2, 3, … until one is fast enough: O(max(piles) · n), up to 10¹³ steps. The stress case needs a speed in the hundreds of millions.",
    invariant: "The slowest working speed is always in [lo, hi]: everything below lo has been shown too slow, and hi itself has been shown to work (or is max(piles), which always works since h ≥ n).",
    traps: [
      "Summing the hours in int: it overflows long before the answer is found.",
      "Computing the ceiling as (p + k − 1) / k in int, which overflows for p and k near 10⁹.",
      "Mixing loop templates: lo ≤ hi with hi = mid loops forever. Pair lo < hi with hi = mid.",
    ],
    followUps: [
      "1011 Capacity To Ship Packages Within D Days and 410 Split Array Largest Sum: the same search, with a greedy check that cuts the array into pieces.",
      "Real-valued answers (774 Minimize Max Distance to Gas Station): iterate a fixed number of times instead of until lo = hi.",
      "The check itself costs O(n). Can it be made sublinear if the piles are sorted and you have prefix sums?",
      "Several eaters share the piles. Does the predicate stay monotone, and what does the check become?",
    ],
    tests: {
      fn: "minEatingSpeed",
      args: [{ type: "vector<int>", name: "piles" }, { type: "int", name: "h" }],
      starter: STARTER,
      reference: REFERENCE,
      brute: BRUTE,
      cases: [
        { name: "example", args: ["{3, 6, 7, 11}", "8"] },
        { name: "h = n", args: ["{30, 11, 23, 4, 20}", "5"] },
        { name: "plenty of time", args: ["{30, 11, 23, 4, 20}", "6"] },
        { name: "one huge pile, h = pile", args: ["{1000000000}", "1000000000"] },
        { name: "hour total overflows int", args: ["{1000000000, 1000000000, 1000000000}", "1000000000"] },
      ],
      random: { count: 400, gen: "piles = rnd_vec(rnd(1, 6), 1, 20); h = rnd(piles.size(), 40);" },
      stress: { label: "10⁴ piles up to 10⁹", gen: "piles = rnd_vec(10000, 1, 1000000000); h = 20000;" },
    },
  },
};
