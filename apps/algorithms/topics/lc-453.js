/**
 * 453 Minimum Moves to Equal Array Elements: incrementing n − 1 elements is
 * decrementing one, relatively (catalogue pattern C2).
 */

import { frame } from "../core/trace.js";
import { SEQUENCE, result } from "./seq-common.js";

const NUMS = [3, 1, 4, 2];

const REFERENCE = `class Solution {
public:
    int minMoves(vector<int>& nums) {
        int lo = *min_element(nums.begin(), nums.end());
        long long moves = 0;
        for (int x : nums) moves += x - lo;  // each move lowers one element by 1, relatively
        return moves;
    }
};`;

const BRUTE = `class Solution {
public:
    // Simulate: raise everything except one maximum until all are equal.
    // O(answer * n).
    int minMoves(vector<int>& nums) {
        int moves = 0;
        while (true) {
            int hi = max_element(nums.begin(), nums.end()) - nums.begin();
            if (*min_element(nums.begin(), nums.end()) == nums[hi]) return moves;
            for (int i = 0; i < (int)nums.size(); ++i)
                if (i != hi) ++nums[i];
            ++moves;
        }
    }
};`;

const STARTER = `class Solution {
public:
    int minMoves(vector<int>& nums) {

    }
};`;

function* run() {
  const a = [...NUMS];
  const n = a.length;
  const lo = Math.min(...NUMS);
  const gaps = () => a.map((x) => x - Math.min(...a));
  const rows = (cells = {}, extra = {}) => [
    { name: "nums", values: [...a], cells },
    { name: "x − min", values: gaps(), cells: Object.fromEntries(gaps().map((g, i) => [i, g ? "idle" : "sorted"])), ...extra },
  ];
  let moves = 0;

  yield frame({
    phase: "Set up",
    note: `A move adds 1 to all but one element of [${NUMS.join(", ")}]. How many moves make them all equal?`,
    detail: "Only the differences between elements matter for \"all equal\". Watch the second row: the gaps above the minimum.",
    marks: { rows: rows() },
    metrics: [{ label: "Moves", value: "0" }],
  });

  for (let step = 0; step < 3; step++) {
    const hi = a.indexOf(Math.max(...a));
    const before = gaps();
    for (let i = 0; i < n; i++) if (i !== hi) a[i]++;
    moves++;
    const cells = Object.fromEntries(a.map((_, i) => [i, i === hi ? "pivot" : "active"]));
    yield frame({
      phase: "Simulate",
      note: `Raise everything except the largest (${a[hi]}): nums becomes [${a.join(", ")}].`,
      detail: `The gaps went from [${before.join(", ")}] to [${gaps().join(", ")}]: only the skipped element's gap shrank, by exactly 1. Raising n − 1 elements is lowering one.`,
      marks: { rows: rows(cells, { cells: { [hi]: "compared" } }) },
      metrics: [{ label: "Moves", value: String(moves) }],
    });
  }

  const total = NUMS.reduce((s, x) => s + x - lo, 0);
  yield frame({
    phase: "Reframe",
    note: `So the question is: lowering one element by 1 per move, how fast can everything reach the minimum? Each element x needs x − min moves.`,
    detail: `Here that is ${NUMS.map((x) => x - lo).join(" + ")} = ${total} in total, counted on the original array. Lowering never goes below the minimum, so no move is wasted.`,
    marks: { rows: [{ name: "nums", values: NUMS, cells: { [NUMS.indexOf(lo)]: "found" } }, { name: "x − min", values: NUMS.map((x) => x - lo) }] },
    metrics: [{ label: "Moves", value: String(total) }],
  });

  yield frame({
    phase: "Done",
    note: `${total} moves, with no simulation: Σ x − n · min.`,
    marks: { rows: [{ name: "nums", values: NUMS, cells: { [NUMS.indexOf(lo)]: "found" } }, { name: "x − min", values: NUMS.map((x) => x - lo), cells: Object.fromEntries(NUMS.map((_, i) => [i, "selected"])) }] },
    metrics: [result(total)],
  });
}

export const lc453 = {
  id: "lc-453",
  section: "Interview problems",
  topic: "C2 · Reframing the operation",
  title: "453. Minimum Moves to Equal Array Elements",
  blurb: "Adding 1 to n − 1 elements changes the differences exactly like subtracting 1 from the one left out. Then the answer is Σ (x − min).",
  structure: SEQUENCE,
  run,
  explanation: [
    "The operation looks awkward: add 1 to every element but one. But the goal, \"all equal\", depends only on the differences between elements, and adding the same amount to everyone does not change them. Adding 1 to n − 1 elements is adding 1 to all n (which changes nothing that matters) and then subtracting 1 from the one left out.",
    "So the problem is: one element drops by 1 per move; how many moves until all are equal? Dropping below the minimum never helps, so everything should drop to the minimum, and element x needs x − min moves. The total is Σ (x − min) = Σ x − n · min.",
    "The animation simulates three moves and tracks the gaps above the minimum: each move shrinks exactly one gap by 1. Then it skips the simulation and adds the gaps up.",
    { tip: "Signal: a strange operation and \"minimum number of operations\". Ask what the operation does to an invariant (differences, parity, sum, sortedness) and solve the restated problem. Compare 462, where any element can move either way, and the median replaces the minimum." },
  ],
  analysis: {
    time: "O(n)",
    space: "O(1)",
    notes: [
      "Simulation is O(answer · n), and the answer can be around 10⁹.",
      "Σ x can reach 10¹⁴, so compute Σ (x − min) or use long long, even though the answer fits in an int.",
      "Why raise everything except a maximum, in the simulation? Any other choice also works but is never better, which is the same statement as \"never lower below the minimum\".",
    ],
  },
  code: {
    lang: "cpp",
    files: [{
      name: "solution.cpp",
      note: "The LeetCode-shaped solution, plus a main over the animation's input that prints its Result.",
      source: `#include <algorithm>\n#include <cstdio>\n#include <vector>\nusing namespace std;\n\n${REFERENCE}\n\nint main() {\n    vector<int> nums{${NUMS.join(", ")}};\n    printf("%d\\n", Solution().minMoves(nums));\n}\n`,
      traced: true,
    }],
  },
  problem: {
    number: 453,
    slug: "minimum-moves-to-equal-array-elements",
    difficulty: "M",
    tier: "core",
    pattern: "C2",
    themes: ["Make the array", "Reframing"],
    statement: [
      "In one move you add 1 to exactly n − 1 of the n elements (every element except one of your choice). Return the fewest moves that make all elements equal.",
      "Up to 10⁵ elements between −10⁹ and 10⁹; the answer fits in a 32-bit int.",
    ],
    hints: [
      "Does adding the same number to every element change whether they are all equal?",
      "Then what is the move's effect on the differences between elements?",
      "It is the same as subtracting 1 from the one element left out. Now how many subtractions does each element need?",
      "Everything drops to the minimum: Σ (x − min).",
    ],
    brute: "Simulate, raising all but a maximum each move, until everything is equal. It is O(answer · n): fine for tiny inputs, hopeless when the answer is around 10⁹.",
    invariant: "After any sequence of moves, the gaps x − min shrink by exactly 1 in total per move, if the skipped element is a maximum. The process ends when the total is 0.",
    traps: [
      "Overflow in Σ x − n · min: Σ x can exceed 2³¹. Sum the differences.",
      "Thinking the final common value is the maximum: everything else grows too, so the final value is min + answer.",
    ],
    followUps: [
      "462: one element moves by ±1 per step. Now the target is the median.",
      "1551 Minimum Operations to Make Array Equal: a closed form once you see what each operation preserves.",
      "The move adds 1 to exactly k elements, for a fixed k. When is equalising possible at all?",
    ],
    tests: {
      fn: "minMoves",
      args: [{ type: "vector<int>", name: "nums" }],
      starter: STARTER,
      reference: REFERENCE,
      brute: BRUTE,
      cases: [
        { name: "example", args: ["{1, 2, 3}"] },
        { name: "already equal", args: ["{1, 1, 1}"] },
        { name: "one element", args: ["{5}"] },
        { name: "negatives", args: ["{-3, 0, 2}"] },
        { name: "two minima", args: ["{-10, -10, 0, 7}"] },
      ],
      random: { count: 400, gen: "nums = rnd_vec(rnd(1, 7), -4, 6);" },
      stress: { label: "10⁵ elements, answer near 10⁹", gen: "nums = rnd_vec(100000, 0, 20000);" },
    },
  },
};
