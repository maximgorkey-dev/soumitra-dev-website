import { light } from "./leet-light.js";

export const lc81 = light({
  number: 81,
  title: "Search in Rotated Sorted Array II",
  slug: "search-in-rotated-sorted-array-ii",
  difficulty: "M",
  pattern: "B3",
  topic: "B3 · Binary search on a partition",
  see: 4,
  themes: ["Rotated array", "Duplicates"],
  blurb: "As in 33, but when nums[lo] == nums[mid] == nums[hi] nothing can be decided: shrink both ends by one. Worst case O(n).",
  statement: [
    "A sorted array that may contain duplicates has been rotated at an unknown pivot. Return whether target is in it.",
    "Up to 5000 elements between −10⁴ and 10⁴.",
  ],
  hints: [
    "Apply 33's test. When does nums[lo] ≤ nums[mid] fail to prove the left half sorted?",
    "When nums[lo] == nums[mid]: [1, 3, 1, 1, 1] has the drop on the left.",
    "If nums[lo] == nums[mid] == nums[hi], drop lo and hi: neither can be the only copy of target, since nums[mid] equals them.",
    "That step is what makes the worst case O(n), and no algorithm can do better.",
  ],
  brute: "Linear scan: O(n), which matches the worst case of any algorithm here.",
  invariant: "If target is in the array, it is in nums[lo … hi].",
  traps: [
    "Using 33's code unchanged: [1, 0, 1, 1, 1] with target 0 goes the wrong way.",
    "Shrinking only one end when the three values are equal works too, but check both ends' logic carefully.",
  ],
  followUps: [
    "Why is O(log n) impossible? An array of all 1s with a single 0 hidden anywhere looks identical at every probe until you hit it.",
    "154: the minimum with duplicates, the same ambiguity.",
  ],
  explanation: [
    "The 33 logic decides which half is sorted by comparing nums[lo] with nums[mid]. With duplicates, equality no longer proves anything: in [1, 1, 1, 0, 1] and [1, 0, 1, 1, 1], the probes at lo, mid and hi all read 1.",
    "When nums[lo] == nums[mid] == nums[hi] (and the middle is not the target), the endpoints carry no information and cannot be the target either, since they equal nums[mid]. Drop both and continue. Otherwise, at least one of the comparisons is strict, and 33's reasoning applies.",
    "Most steps still halve the window, but an adversarial array forces the slow step every time: O(n) worst case, which is optimal.",
    { tip: "Duplicates break binary search when equality hides the structure. The standard fix is to shrink the window by one and accept a linear worst case." },
  ],
  analysis: {
    time: "O(log n) typically, O(n) worst case",
    space: "O(1)",
    notes: ["Interviewers often ask why the worst case cannot be improved."],
  },
  tests: {
    fn: "search",
    args: [{ type: "vector<int>", name: "nums" }, { type: "int", name: "target" }],
    starter: `class Solution {
public:
    bool search(vector<int>& nums, int target) {

    }
};`,
    reference: `class Solution {
public:
    bool search(vector<int>& nums, int target) {
        int lo = 0, hi = nums.size() - 1;
        while (lo <= hi) {
            int mid = lo + (hi - lo) / 2;
            if (nums[mid] == target) return true;
            if (nums[lo] == nums[mid] && nums[mid] == nums[hi]) { ++lo, --hi; continue; }  // no information
            if (nums[lo] <= nums[mid]) {
                if (nums[lo] <= target && target < nums[mid]) hi = mid - 1;
                else lo = mid + 1;
            } else {
                if (nums[mid] < target && target <= nums[hi]) lo = mid + 1;
                else hi = mid - 1;
            }
        }
        return false;
    }
};`,
    brute: `class Solution {
public:
    // Linear scan: O(n).
    bool search(vector<int>& nums, int target) {
        return find(nums.begin(), nums.end(), target) != nums.end();
    }
};`,
    cases: [
      { name: "example", args: ["{2, 5, 6, 0, 0, 1, 2}", "0"] },
      { name: "missing", args: ["{2, 5, 6, 0, 0, 1, 2}", "3"] },
      { name: "hidden on the left", args: ["{1, 0, 1, 1, 1}", "0"] },
      { name: "hidden on the right", args: ["{1, 1, 1, 0, 1}", "0"] },
      { name: "all equal", args: ["{3, 3, 3}", "2"] },
    ],
    random: { count: 400, gen: "{ int lt_n = rnd(1, 9); nums = rnd_sorted(lt_n, 0, 4); rotate(nums.begin(), nums.begin() + rnd(0, lt_n - 1), nums.end()); target = rnd(-1, 5); }" },
  },
});
