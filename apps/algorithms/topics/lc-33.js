import { light } from "./leet-light.js";

export const lc33 = light({
  number: 33,
  title: "Search in Rotated Sorted Array",
  slug: "search-in-rotated-sorted-array",
  difficulty: "M",
  pattern: "B3",
  topic: "B3 · Binary search on a partition",
  see: 4,
  themes: ["Rotated array"],
  blurb: "At every step one half of [lo, hi] is sorted. Decide which, then whether the target lies inside it.",
  statement: [
    "A sorted array of distinct integers has been rotated at an unknown pivot (for example [4, 5, 6, 7, 0, 1, 2]). Return the index of target, or −1, in O(log n) time.",
    "Up to 5000 elements between −10⁴ and 10⁴.",
  ],
  hints: [
    "Pick the middle. Compare nums[lo] and nums[mid]. What does that tell you?",
    "If nums[lo] ≤ nums[mid], the left half [lo, mid] is sorted; otherwise the right half is.",
    "Within the sorted half, a range check tells you whether target can be there.",
    "Go into that half if it can; otherwise go into the other.",
  ],
  brute: "Linear scan: O(n). Correct, but the problem asks for O(log n).",
  invariant: "If target is in the array, it is in nums[lo … hi].",
  traps: [
    "Using < instead of ≤ in nums[lo] ≤ nums[mid]: when lo == mid the left half is a single, sorted element.",
    "Range checks with the wrong strictness: target must satisfy nums[lo] ≤ target < nums[mid] for the left half.",
    "Finding the pivot first then searching is fine (two binary searches) but easy to get off by one.",
  ],
  followUps: [
    "81: duplicates allowed. When nums[lo] == nums[mid] == nums[hi], you cannot tell which side is sorted; shrink both ends.",
    "153 / 154: find the minimum, i.e. the rotation point.",
    "Return the rotation count.",
  ],
  explanation: [
    "A rotated sorted array is two sorted runs. Any window [lo, hi] cut at mid has at least one sorted half: if nums[lo] ≤ nums[mid], the left part contains no drop; otherwise the drop is on the left, so the right part is sorted.",
    "In a sorted half, deciding membership is a range check against its endpoints. If target lies within the sorted half's range, search there; otherwise it can only be in the other half. Each step halves the window.",
    { tip: "Signal: \"rotated sorted\". Determine which half is sorted from one comparison, then do a range check on that half." },
  ],
  analysis: {
    time: "O(log n)",
    space: "O(1)",
    notes: ["The two-pass version finds the minimum's index first, then binary searches the correct run."],
  },
  tests: {
    fn: "search",
    args: [{ type: "vector<int>", name: "nums" }, { type: "int", name: "target" }],
    starter: `class Solution {
public:
    int search(vector<int>& nums, int target) {

    }
};`,
    reference: `class Solution {
public:
    int search(vector<int>& nums, int target) {
        int lo = 0, hi = nums.size() - 1;
        while (lo <= hi) {
            int mid = lo + (hi - lo) / 2;
            if (nums[mid] == target) return mid;
            if (nums[lo] <= nums[mid]) {  // left half sorted
                if (nums[lo] <= target && target < nums[mid]) hi = mid - 1;
                else lo = mid + 1;
            } else {                      // right half sorted
                if (nums[mid] < target && target <= nums[hi]) lo = mid + 1;
                else hi = mid - 1;
            }
        }
        return -1;
    }
};`,
    brute: `class Solution {
public:
    // Linear scan: O(n).
    int search(vector<int>& nums, int target) {
        for (int i = 0; i < (int)nums.size(); ++i)
            if (nums[i] == target) return i;
        return -1;
    }
};`,
    cases: [
      { name: "example", args: ["{4, 5, 6, 7, 0, 1, 2}", "0"] },
      { name: "missing", args: ["{4, 5, 6, 7, 0, 1, 2}", "3"] },
      { name: "one element", args: ["{1}", "0"] },
      { name: "not rotated", args: ["{1, 3, 5}", "5"] },
      { name: "two elements", args: ["{3, 1}", "1"] },
    ],
    random: { count: 400, gen: "{ set<int> lt_s; int lt_n = rnd(1, 9); while ((int)lt_s.size() < lt_n) lt_s.insert(rnd(-10, 10)); nums.assign(lt_s.begin(), lt_s.end()); rotate(nums.begin(), nums.begin() + rnd(0, lt_n - 1), nums.end()); target = rnd(-11, 11); }" },
  },
});
