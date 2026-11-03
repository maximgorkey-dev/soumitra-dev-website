import { light } from "./leet-light.js";

export const lc1551 = light({
  number: 1551,
  title: "Minimum Operations to Make Array Equal",
  slug: "minimum-operations-to-make-array-equal",
  difficulty: "M",
  pattern: "C2",
  topic: "C2 · Reframing the operation",
  see: 453,
  themes: ["Make the array", "Closed form"],
  blurb: "The sum is preserved, so everything ends at the mean n. Each operation closes one unit of gap on each side: the answer is Σ (n − aᵢ) over the lower half, which is ⌊n² / 4⌋.",
  statement: [
    "The array has arr[i] = 2i + 1 for i = 0 … n − 1. One operation subtracts 1 from one element and adds 1 to another. Return the fewest operations that make all elements equal.",
    "1 ≤ n ≤ 10⁴.",
  ],
  hints: [
    "What does an operation never change?",
    "The sum. So the final common value is the mean, which here is n.",
    "Each operation can raise one low element by 1 and lower one high element by 1, so count the deficit of the low half.",
    "Σ over i < n/2 of (n − (2i + 1)) = ⌊n² / 4⌋.",
  ],
  brute: "Simulate: repeatedly move one unit from the largest element to the smallest: O(answer · n), 2.5·10⁷ operations of O(n) each at the limit.",
  invariant: "Every operation keeps the sum and lowers the total deficit below the mean by at most 1, so the answer is exactly that total deficit.",
  traps: [
    "Thinking the target might not be the mean: with the sum fixed and all equal, it must be.",
    "Off-by-one for odd n: the middle element is already at the mean.",
  ],
  followUps: [
    "453: add 1 to n − 1 elements, another reframing.",
    "A general array: the answer is Σ max(0, mean − aᵢ), if the mean is an integer, otherwise impossible.",
    "2033 / 462: unit moves on single elements, without the transfer, where the median wins.",
  ],
  explanation: [
    "An operation moves one unit from one element to another, so the sum n² never changes, and when all elements are equal each one is n² / n = n.",
    "Elements below n must gain exactly their deficits, and each operation adds 1 to just one element. So the answer is at least the total deficit, and it is achievable by pairing each unit of deficit with a unit of surplus. For arr[i] = 2i + 1, the deficits are n − 1, n − 3, … over the lower half, which sum to ⌊n² / 4⌋.",
    { tip: "Look for a conserved quantity first. It often pins the final state, and the count becomes a sum of gaps." },
  ],
  analysis: {
    time: "O(1)",
    space: "O(1)",
    notes: ["The O(n) loop over the lower half is equally acceptable in an interview."],
  },
  tests: {
    fn: "minOperations",
    args: [{ type: "int", name: "n" }],
    starter: `class Solution {
public:
    int minOperations(int n) {

    }
};`,
    reference: `class Solution {
public:
    int minOperations(int n) {
        return n * n / 4;  // the deficit of the lower half below the mean n
    }
};`,
    brute: `class Solution {
public:
    // Simulate: move one unit from the largest to the smallest each time.
    int minOperations(int n) {
        vector<int> a(n);
        for (int i = 0; i < n; ++i) a[i] = 2 * i + 1;
        int ops = 0;
        while (true) {
            auto [lo, hi] = minmax_element(a.begin(), a.end());
            if (*lo == *hi) return ops;
            ++*lo, --*hi, ++ops;
        }
    }
};`,
    cases: [
      { name: "example", args: ["3"] },
      { name: "example 2", args: ["6"] },
      { name: "n = 1", args: ["1"] },
      { name: "n = 2", args: ["2"] },
    ],
    random: { count: 200, gen: "n = rnd(1, 60);" },
    stress: { label: "n = 10⁴", gen: "n = 10000;" },
  },
});
