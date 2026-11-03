import { light } from "./leet-light.js";

export const lc189 = light({
  number: 189,
  title: "Rotate Array",
  slug: "rotate-array",
  difficulty: "M",
  pattern: "A6",
  topic: "A6 · Rotation",
  themes: ["In-place", "O(1) space"],
  blurb: "Rotating right by k in place is three reversals: the whole array, then the first k, then the rest.",
  statement: [
    "Rotate an array to the right by k steps in place: the last k elements move to the front, in order. Return the rotated array (LeetCode's version returns nothing and checks the array).",
    "Up to 10⁵ elements; k up to 10⁵, possibly larger than n.",
  ],
  hints: [
    "What if k ≥ n?",
    "Rotating by n changes nothing, so use k mod n.",
    "Reverse the whole array. Where do the last k elements end up, and in what order?",
    "At the front, reversed. Reverse the first k and the last n − k back.",
  ],
  brute: "Rotate by one step, k times: O(n · k), 10¹⁰ steps when both are 10⁵.",
  invariant: "After the full reversal, the first k positions hold exactly the elements that belong there, in reverse order; the second and third reversals fix the order within each block.",
  traps: [
    "Forgetting k %= n: reversing a block of length k > n reads past the end.",
    "Rotating left instead of right: the right rotation reverses the first k after the whole.",
    "Using an extra array when O(1) space is asked for.",
  ],
  followUps: [
    "The cyclic-replacement method: follow each cycle of i → (i + k) mod n; there are gcd(n, k) cycles.",
    "Rotate a linked list (61).",
    "Rotate a matrix by 90° (48): transpose, then reverse each row.",
  ],
  explanation: [
    "Write the array as A B, where B is the last k elements. The goal is B A. Reversing the whole array gives rev(B) rev(A): the right blocks in the right places, each backwards. Reversing each block again gives B A.",
    "Three reversals, each a pass of swaps from the ends inward: O(n) time and no extra memory. Reduce k mod n first.",
    { tip: "Signal: \"rotate in place\". Three reversals, or cycles of length n / gcd(n, k)." },
  ],
  analysis: {
    time: "O(n)",
    space: "O(1)",
    notes: ["std::rotate does the same job; interviewers want the reversal argument."],
  },
  tests: {
    fn: "rotate",
    args: [{ type: "vector<int>", name: "nums" }, { type: "int", name: "k" }],
    starter: `class Solution {
public:
    vector<int> rotate(vector<int>& nums, int k) {

        return nums;
    }
};`,
    reference: `class Solution {
public:
    vector<int> rotate(vector<int>& nums, int k) {
        int n = nums.size();
        k %= n;
        reverse(nums.begin(), nums.end());          // rev(B) rev(A)
        reverse(nums.begin(), nums.begin() + k);    // B rev(A)
        reverse(nums.begin() + k, nums.end());      // B A
        return nums;
    }
};`,
    brute: `class Solution {
public:
    // One step at a time: O(n * k).
    vector<int> rotate(vector<int>& nums, int k) {
        for (int s = 0; s < k; ++s) {
            int last = nums.back();
            for (int i = nums.size() - 1; i > 0; --i) nums[i] = nums[i - 1];
            nums[0] = last;
        }
        return nums;
    }
};`,
    cases: [
      { name: "example", args: ["{1, 2, 3, 4, 5, 6, 7}", "3"] },
      { name: "example 2", args: ["{-1, -100, 3, 99}", "2"] },
      { name: "k = 0", args: ["{1, 2}", "0"] },
      { name: "k > n", args: ["{1, 2, 3}", "7"] },
      { name: "one element", args: ["{9}", "5"] },
    ],
    random: { count: 400, gen: "nums = rnd_vec(rnd(1, 9), -9, 9); k = rnd(0, 20);" },
    stress: { label: "n = k − 1 = 10⁵ − 1", gen: "nums = rnd_vec(99999, -1000, 1000); k = 100000;" },
  },
});
