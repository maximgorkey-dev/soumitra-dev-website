import { light } from "./leet-light.js";

export const lc1438 = light({
  number: 1438,
  title: "Longest Continuous Subarray With Absolute Diff Less Than or Equal to Limit",
  slug: "longest-continuous-subarray-with-absolute-diff-less-than-or-equal-to-limit",
  difficulty: "M",
  pattern: "A3",
  topic: "A3 · Monotonic deque",
  see: 239,
  themes: ["Sliding window", "Window max and min"],
  blurb: "A sliding window whose condition is max − min ≤ limit. Two monotonic deques give the window's max and min in O(1).",
  statement: [
    "Return the length of the longest contiguous subarray in which the difference between any two elements is at most limit.",
    "Up to 10⁵ elements, each up to 10⁹; limit up to 10⁹.",
  ],
  hints: [
    "\"Any two elements differ by at most limit\" is the same as max − min ≤ limit.",
    "If a window satisfies it, so does every window inside it. That makes a two-pointer window work.",
    "The window needs its max and min as it grows and shrinks. How do you keep both in O(1)?",
    "One deque decreasing (front = max), one increasing (front = min). When max − min > limit, advance the left edge and drop fronts that fall out.",
  ],
  brute: "Every start, extended while tracking the running max and min: O(n²), 5·10⁹ steps when the whole array is one long valid window.",
  invariant: "After processing r, [l, r] is the longest valid window ending at r; the decreasing deque holds candidates for its maximum, the increasing deque for its minimum.",
  traps: [
    "Using a multiset is fine (O(n log n)) but deleting by value erases all copies: use erase(find(x)).",
    "Popping the deque fronts by value instead of by index when l moves past them, when values repeat.",
    "max − min can be 10⁹, which fits in int, but be careful if you add.",
  ],
  followUps: [
    "2762 Continuous Subarrays: count the valid subarrays (limit 2) instead of the longest.",
    "239 Sliding Window Maximum: fixed-size version with one deque.",
    "Return the subarray itself.",
  ],
  explanation: [
    "Every pair within limit means max − min ≤ limit. A sub-window of a valid window is valid, so the longest window ending at r can be found by growing r and moving l right only while the window is invalid: two pointers, O(n) moves.",
    "The window needs its max and min under both kinds of move. Keep two deques of indices: in one, values decrease from front to back, so the front is the max; in the other they increase, so the front is the min. Adding r pops dominated entries from the backs. When max − min > limit, increment l and pop any front whose index is now < l.",
    "Each index enters and leaves each deque once, so the scan is linear. Record r − l + 1 at every step.",
    { tip: "Signal: a sliding window whose condition depends on the window's max or min. Pair two pointers with monotonic deques (or a multiset)." },
  ],
  analysis: {
    time: "O(n)",
    space: "O(n) for the deques",
    notes: [
      "The multiset version is O(n log n) and simpler to get right in an interview.",
      "Because the answer only grows, a variant moves l at most one step per r and never shrinks the window, which is slightly simpler still.",
    ],
  },
  tests: {
    fn: "longestSubarray",
    args: [{ type: "vector<int>", name: "nums" }, { type: "int", name: "limit" }],
    starter: `class Solution {
public:
    int longestSubarray(vector<int>& nums, int limit) {

    }
};`,
    reference: `class Solution {
public:
    int longestSubarray(vector<int>& nums, int limit) {
        deque<int> hi, lo;  // indices: values decreasing in hi, increasing in lo
        int best = 0;
        for (int l = 0, r = 0; r < (int)nums.size(); ++r) {
            while (!hi.empty() && nums[hi.back()] <= nums[r]) hi.pop_back();
            while (!lo.empty() && nums[lo.back()] >= nums[r]) lo.pop_back();
            hi.push_back(r), lo.push_back(r);
            while (nums[hi.front()] - nums[lo.front()] > limit) {
                ++l;
                if (hi.front() < l) hi.pop_front();
                if (lo.front() < l) lo.pop_front();
            }
            best = max(best, r - l + 1);
        }
        return best;
    }
};`,
    brute: `class Solution {
public:
    // Every start, extended while the running max - min stays within limit: O(n^2).
    int longestSubarray(vector<int>& nums, int limit) {
        int n = nums.size(), best = 0;
        for (int i = 0; i < n; ++i) {
            int mx = nums[i], mn = nums[i];
            for (int j = i; j < n; ++j) {
                mx = max(mx, nums[j]), mn = min(mn, nums[j]);
                if (mx - mn > limit) break;
                best = max(best, j - i + 1);
            }
        }
        return best;
    }
};`,
    cases: [
      { name: "example", args: ["{8, 2, 4, 7}", "4"] },
      { name: "example 2", args: ["{10, 1, 2, 4, 7, 2}", "5"] },
      { name: "example 3", args: ["{4, 2, 2, 2, 4, 4, 2, 2}", "0"] },
      { name: "one element", args: ["{5}", "0"] },
      { name: "big values", args: ["{1000000000, 1, 1000000000}", "999999999"] },
    ],
    random: { count: 400, gen: "nums = rnd_vec(rnd(1, 10), 1, 9); limit = rnd(0, 6);" },
    stress: { label: "10⁵ elements, one long valid window", gen: "nums = rnd_vec(100000, 1, 1000); limit = 1000;" },
  },
});
