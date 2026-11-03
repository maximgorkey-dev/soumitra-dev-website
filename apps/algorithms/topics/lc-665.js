import { light } from "./leet-light.js";

export const lc665 = light({
  number: 665,
  title: "Non-decreasing Array",
  slug: "non-decreasing-array",
  difficulty: "M",
  pattern: "D4",
  topic: "D4 · Fixing a single violation",
  themes: ["Single violation", "Local repair"],
  blurb: "Find the first drop nums[i] > nums[i + 1]. Fix it by lowering nums[i] if nums[i − 1] allows, otherwise raise nums[i + 1]; then a second drop means false.",
  statement: [
    "Return whether nums can become non-decreasing by changing at most one element to any value.",
    "Up to 10⁴ elements, values between −10⁵ and 10⁵.",
  ],
  hints: [
    "Count the places where nums[i] > nums[i + 1]. Two or more?",
    "Exactly one drop is not always fixable. Which element should change?",
    "Lowering nums[i] to nums[i + 1] is safest, unless that breaks nums[i − 1] ≤ nums[i]. Then raise nums[i + 1] instead.",
  ],
  brute: "Try changing each element to the value that suits its left neighbour and check the result: O(n²).",
  invariant: "When the scan passes i, the prefix through i + 1 is non-decreasing with the changes made so far, and nums[i + 1] is as small as it can be.",
  traps: [
    "Counting drops only: [3, 4, 2, 3] has one drop and is not fixable.",
    "Always raising nums[i + 1]: it can create a new drop with nums[i + 2] that lowering would avoid.",
    "Modifying the input permanently during an interview answer without saying so.",
  ],
  followUps: [
    "At most k changes: n minus the longest non-decreasing subsequence (O(n log n)).",
    "Remove one element instead of changing it: 1909.",
    "Strictly increasing with integer values: the slack between neighbours matters.",
  ],
  explanation: [
    "If nums has two or more drops, one change cannot fix it. With one drop at i (nums[i] > nums[i + 1]), the change must be at i or i + 1.",
    "Prefer lowering nums[i] to nums[i + 1]: a smaller value never hurts what follows. That works if i = 0 or nums[i − 1] ≤ nums[i + 1]. Otherwise the only option is raising nums[i + 1] to nums[i], which may still clash with nums[i + 2], so continue scanning and fail on another drop.",
    { tip: "Signal: \"with at most one change\". Locate the single violation and try the two local repairs, preferring the one that leaves later elements most room." },
  ],
  analysis: {
    time: "O(n)",
    space: "O(1)",
    notes: [],
  },
  tests: {
    fn: "checkPossibility",
    args: [{ type: "vector<int>", name: "nums" }],
    starter: `class Solution {
public:
    bool checkPossibility(vector<int>& nums) {

    }
};`,
    reference: `class Solution {
public:
    bool checkPossibility(vector<int>& nums) {
        bool changed = false;
        for (int i = 0; i + 1 < (int)nums.size(); ++i) {
            if (nums[i] <= nums[i + 1]) continue;
            if (changed) return false;
            changed = true;
            if (i == 0 || nums[i - 1] <= nums[i + 1]) nums[i] = nums[i + 1];  // lower the left one
            else nums[i + 1] = nums[i];                                        // or raise the right one
        }
        return true;
    }
};`,
    brute: `class Solution {
public:
    // Change each element to fit its left neighbour, then check: O(n^2).
    bool checkPossibility(vector<int>& nums) {
        int n = nums.size();
        auto sorted = [&] { return is_sorted(nums.begin(), nums.end()); };
        if (sorted()) return true;
        for (int i = 0; i < n; ++i) {
            int keep = nums[i];
            nums[i] = i > 0 ? nums[i - 1] : INT_MIN;
            bool ok = sorted();
            nums[i] = keep;
            if (ok) return true;
        }
        return false;
    }
};`,
    cases: [
      { name: "example", args: ["{4, 2, 3}"] },
      { name: "example 2", args: ["{4, 2, 1}"] },
      { name: "one drop, not fixable", args: ["{3, 4, 2, 3}"] },
      { name: "raise the right one", args: ["{5, 7, 1, 8}"] },
      { name: "one element", args: ["{1}"] },
    ],
    random: { count: 400, gen: "nums = rnd_vec(rnd(1, 8), -3, 3);" },
    stress: { label: "10⁴ elements", gen: "{ nums = rnd_sorted(10000, -100000, 100000); nums[5000] = -100000; }" },
  },
});
