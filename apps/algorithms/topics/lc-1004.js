import { light } from "./leet-light.js";

export const lc1004 = light({
  number: 1004,
  title: "Max Consecutive Ones III",
  slug: "max-consecutive-ones-iii",
  difficulty: "M",
  pattern: "A4",
  topic: "A4 · Variable sliding window",
  see: 76,
  themes: ["Sliding window", "Budget of changes"],
  blurb: "The longest window containing at most k zeros. Grow on the right; shrink on the left while there are too many zeros.",
  statement: [
    "In a binary array you may flip at most k zeros to ones. Return the length of the longest run of consecutive ones you can obtain.",
    "Up to 10⁵ elements; 0 ≤ k ≤ n.",
  ],
  hints: [
    "Which subarrays can become all ones?",
    "Exactly those with at most k zeros.",
    "\"At most k zeros\" survives shrinking, so a two-pointer window finds the longest one.",
    "Count zeros in the window; while the count exceeds k, move the left edge.",
  ],
  brute: "Every start, extended until a (k + 1)th zero: O(n²) when zeros are rare.",
  invariant: "After processing r, [l, r] is the longest window ending at r with at most k zeros.",
  traps: [
    "Actually flipping elements: the window just counts zeros.",
    "k = 0: the answer is the longest existing run of ones, possibly 0.",
  ],
  followUps: [
    "424 Longest Repeating Character Replacement: the budget is window length minus the most frequent letter.",
    "485 / 487: with k = 0 or k = 1.",
    "A stream where k is fixed but the array is infinite: keep a queue of the last k + 1 zero positions.",
  ],
  explanation: [
    "Flipping at most k zeros turns a subarray into all ones exactly when it contains at most k zeros, so the question is the longest such subarray.",
    "Shrinking a window never increases its zero count, so the longest valid window ending at r has a left edge that only moves right as r grows. Add nums[r]; while the window holds more than k zeros, remove nums[l] and advance l. Record r − l + 1.",
    { tip: "Signal: \"at most k changes\" to make a run uniform. A window that counts the changes it would need." },
  ],
  analysis: {
    time: "O(n)",
    space: "O(1)",
    notes: ["A non-shrinking variant moves l at most one step per r, since only longer windows matter after the best so far."],
  },
  tests: {
    fn: "longestOnes",
    args: [{ type: "vector<int>", name: "nums" }, { type: "int", name: "k" }],
    starter: `class Solution {
public:
    int longestOnes(vector<int>& nums, int k) {

    }
};`,
    reference: `class Solution {
public:
    int longestOnes(vector<int>& nums, int k) {
        int best = 0, zeros = 0;
        for (int l = 0, r = 0; r < (int)nums.size(); ++r) {
            zeros += nums[r] == 0;
            while (zeros > k) zeros -= nums[l++] == 0;
            best = max(best, r - l + 1);
        }
        return best;
    }
};`,
    brute: `class Solution {
public:
    // Every start, extended while at most k zeros: O(n^2).
    int longestOnes(vector<int>& nums, int k) {
        int n = nums.size(), best = 0;
        for (int i = 0; i < n; ++i) {
            int zeros = 0;
            for (int j = i; j < n; ++j) {
                zeros += nums[j] == 0;
                if (zeros > k) break;
                best = max(best, j - i + 1);
            }
        }
        return best;
    }
};`,
    cases: [
      { name: "example", args: ["{1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0}", "2"] },
      { name: "example 2", args: ["{0, 0, 1, 1, 0, 0, 1, 1, 1, 0, 1, 1, 0, 0, 0, 1, 1, 1, 1}", "3"] },
      { name: "k = 0", args: ["{0, 1, 1, 0, 1}", "0"] },
      { name: "all zeros", args: ["{0, 0, 0}", "0"] },
      { name: "flip everything", args: ["{0, 0, 0}", "3"] },
    ],
    random: { count: 400, gen: "nums = rnd_vec(rnd(1, 12), 0, 1); k = rnd(0, 3);" },
    stress: { label: "10⁵ ones", gen: "nums.assign(100000, 1); k = 0;" },
  },
});
