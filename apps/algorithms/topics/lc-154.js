import { light } from "./leet-light.js";

export const lc154 = light({
  number: 154,
  title: "Find Minimum in Rotated Sorted Array II",
  slug: "find-minimum-in-rotated-sorted-array-ii",
  difficulty: "H",
  pattern: "B3",
  topic: "B3 · Binary search on a partition",
  see: 4,
  themes: ["Rotated array", "Duplicates"],
  blurb: "Compare the middle with the right end: smaller means the minimum is at or left of mid, larger means right of it, equal means drop the right end.",
  statement: [
    "A sorted array that may contain duplicates has been rotated at an unknown pivot. Return its minimum element.",
    "Up to 5000 elements between −5000 and 5000.",
  ],
  hints: [
    "Compare nums[mid] with nums[hi], not nums[lo]. Why is the right end the better reference?",
    "If nums[mid] < nums[hi], mid … hi is sorted, so the minimum is at mid or to its left.",
    "If nums[mid] > nums[hi], the drop is to the right of mid.",
    "If they are equal, hi can go: nums[mid] is a copy of it, so the minimum survives.",
  ],
  brute: "Linear scan for the minimum: O(n), which is also the worst case of the binary search.",
  invariant: "The minimum value is always in nums[lo … hi].",
  traps: [
    "Comparing with nums[lo]: in a non-rotated array, nums[lo] ≤ nums[mid] holds and says nothing about where the minimum is.",
    "Setting hi = mid − 1 when nums[mid] < nums[hi]: mid itself may be the minimum.",
    "Moving lo when equal: that can skip the minimum.",
  ],
  followUps: [
    "153: distinct values, so the equal case never happens and the search is O(log n).",
    "Return the index of the rotation (the first minimum): the equal step needs care, since it can skip the true pivot.",
  ],
  explanation: [
    "Use the right end as the reference. If nums[mid] < nums[hi], the segment from mid to hi has no drop, so the minimum is at mid or before it: hi = mid. If nums[mid] > nums[hi], there is a drop somewhere after mid, and the minimum is after mid: lo = mid + 1.",
    "If nums[mid] == nums[hi], either side might hold the minimum ([3, 1, 3, 3] or [3, 3, 1, 3]). But removing hi is safe: its value also appears at mid, which stays in range. So hi = hi − 1.",
    "Each step either halves the range or removes one element: O(log n) usually, O(n) on adversarial inputs, which is unavoidable.",
    { tip: "For rotated arrays, compare with the right end when looking for the minimum; it gives a clean three-way decision." },
  ],
  analysis: {
    time: "O(log n) typically, O(n) worst case",
    space: "O(1)",
    notes: ["The equal step is the only change from 153."],
  },
  tests: {
    fn: "findMin",
    args: [{ type: "vector<int>", name: "nums" }],
    starter: `class Solution {
public:
    int findMin(vector<int>& nums) {

    }
};`,
    reference: `class Solution {
public:
    int findMin(vector<int>& nums) {
        int lo = 0, hi = nums.size() - 1;
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;
            if (nums[mid] < nums[hi]) hi = mid;          // mid..hi sorted: min at or left of mid
            else if (nums[mid] > nums[hi]) lo = mid + 1; // the drop is right of mid
            else --hi;                                   // nums[mid] keeps a copy of nums[hi]
        }
        return nums[lo];
    }
};`,
    brute: `class Solution {
public:
    // Linear scan: O(n).
    int findMin(vector<int>& nums) {
        return *min_element(nums.begin(), nums.end());
    }
};`,
    cases: [
      { name: "example", args: ["{1, 3, 5}"] },
      { name: "example 2", args: ["{2, 2, 2, 0, 1}"] },
      { name: "hidden left", args: ["{3, 1, 3, 3, 3}"] },
      { name: "hidden right", args: ["{3, 3, 3, 1, 3}"] },
      { name: "one element", args: ["{-7}"] },
      { name: "all equal", args: ["{4, 4, 4, 4}"] },
    ],
    random: { count: 400, gen: "{ int lt_n = rnd(1, 9); nums = rnd_sorted(lt_n, 0, 4); rotate(nums.begin(), nums.begin() + rnd(0, lt_n - 1), nums.end()); }" },
  },
});
