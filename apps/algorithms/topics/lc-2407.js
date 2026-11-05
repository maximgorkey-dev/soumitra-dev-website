import { study } from "./leet-light.js";

export const lc2407 = study({
  number: 2407,
  title: "Longest Increasing Subsequence II",
  slug: "longest-increasing-subsequence-ii",
  difficulty: "H",
  pattern: "F7",
  tier: "stretch",
  topic: "F7 · DP sped up with a data structure (the LIS family)",
  see: 300,
  themes: ["DP indexed by value", "Segment tree range max", "Windowed predecessor"],
  blurb: "best[v] is the longest valid subsequence ending with value v. A new x extends the best one ending at any value in [x − k, x − 1], a range maximum. A segment tree over values answers that query and the point update in O(log V) each.",
  statement: [
    "Given nums and k, find the longest subsequence that is strictly increasing and in which each pair of adjacent elements differs by at most k. Return its length.",
    "Up to 10⁵ elements, values and k up to 10⁵. Example: nums = [4, 2, 1, 4, 3, 4, 5, 8, 15], k = 3 gives 5 (1, 3, 4, 5, 8).",
  ],
  concepts: [
    "Index the DP by value, not position: process nums left to right, and keep best[v] = the longest valid subsequence seen so far that ends with the value v.",
    "Windowed predecessor: the element before x must lie in [x − k, x − 1], so the transition is a maximum over a value range.",
    "Segment tree (or any range-max structure with point updates): O(log V) per query and update, V the largest value.",
    "Why 300's tails trick fails here: tails keeps the smallest ending per length, but the difference limit means a smaller ending can be too far below x to precede it.",
    "Left-to-right order enforces the subsequence order: the tree only contains elements that appear earlier.",
  ],
  hints: [
    "Write the O(n²) DP with the extra condition nums[i] − nums[j] ≤ k. Where does the time go?",
    "For each i you want the best len[j] among earlier j whose value lies in a window below nums[i]. Index by value instead of by j.",
    "Keep best[v] for every value v. The transition is a range maximum over [x − k, x − 1]. Which data structure does range max plus point update?",
    "Process left to right so only earlier elements are in the structure.",
  ],
  brute: [
    "The O(n²) DP, len[i] = 1 + max len[j] over j < i with 0 < nums[i] − nums[j] ≤ k, is 10¹⁰ steps at n = 10⁵.",
    "The inner loop is really \"maximum over earlier elements with value in a window\". Keyed by value, the earlier elements live in one array best[1..V], and the window is a contiguous range. A segment tree answers it in O(log V), so the total is O(n log V).",
  ],
  invariant: "After processing nums[0..i], best[v] is the length of the longest valid subsequence of nums[0..i] that ends with value v (0 if none), and the segment tree stores these values.",
  traps: [
    "Using the tails array from 300: it ignores the difference limit. For [1, 5] with k = 3 it reports 2, but 5 − 1 = 4 > 3, so the answer is 1.",
    "Including x itself in the window: the subsequence is strictly increasing, so the range is [x − k, x − 1], not up to x.",
    "Overwriting best[x] with a smaller value: x may appear several times; keep the maximum.",
    "A window that starts below 1: clamp the lower end at 0 or 1.",
    "Coordinate compression breaks the window: a value window must be measured on real values. With values up to 10⁵ none is needed; with larger values, compress and binary search the window's ends.",
  ],
  followUps: [
    "Values up to 10⁹: compress the values, find the window's compressed ends with lower_bound, and query the same tree.",
    "Window on the index (adjacent elements at most d positions apart) instead of value: a sliding-window structure over positions, or a monotone deque when there is no value condition.",
    "Count the number of such longest subsequences: store (length, count) in the tree and merge counts on ties.",
    "Maximum sum instead of length: store sums in the tree; same shape.",
    "A Fenwick tree only handles prefix maximums, and the window [x − k, x − 1] is not a prefix, so the segment tree (or a sparse structure supporting ranges) is the natural fit here.",
  ],
  explanation: [
    { h: "What the table means" },
    "Walk through nums left to right. best[v] is the length of the longest valid subsequence among the elements seen so far that ends with the value v. Valid means strictly increasing with adjacent differences at most k.",
    { h: "Processing one element x" },
    {
      list: [
        "The element before x in the subsequence must have a value in [x − k, x − 1] and appear earlier, which is exactly what best holds.",
        "So the longest subsequence ending with this x is 1 + max(best[v] for v in [x − k, x − 1]), or 1 if the window is empty.",
        "Set best[x] to the larger of its old value and that length.",
      ],
    },
    { code: "for x in nums (left to right):\n    len     = 1 + rangeMax(best, max(1, x - k), x - 1)\n    best[x] = max(best[x], len)\nanswer = max over all len" },
    "A segment tree over the values 1..V stores best and answers rangeMax and the point update in O(log V).",
    { h: "A worked example: [4, 2, 1, 4, 3, 4, 5, 8, 15], k = 3" },
    {
      table: {
        head: ["x", "window", "best in window", "new best[x]"],
        rows: [
          [4, "1..3", 0, 1],
          [2, "1..1", 0, 1],
          [1, "empty", 0, 1],
          [4, "1..3", "1 (from 1 or 2)", 2],
          [3, "1..2", 1, 2],
          [4, "1..3", "2 (from 3)", 3],
          [5, "2..4", "3 (from 4)", 4],
          [8, "5..7", "4 (from 5)", "**5**"],
          [15, "12..14", 0, 1],
        ],
        caption: "Each element extends the best subsequence ending at a value in its window. The answer is 5.",
      },
    },
    "The second 4 sees best[1] = best[2] = 1 and becomes 2 (for example 2, 4). The third 4 sees best[3] = 2 (1, 3) and becomes 3 (1, 3, 4). Then 5 extends that to 4, and 8 extends it to 5: 1, 3, 4, 5, 8. 15 is more than 3 above everything before it, so it starts fresh.",
    { h: "Cost" },
    "n queries and updates on a tree over V values: O(n log V) time, O(V) space.",
    { tip: "Signal: an LIS whose predecessor must satisfy a value-range condition. Index the DP by value and use a range-max segment tree." },
  ],
  analysis: {
    time: "O(n log V)",
    space: "O(V)",
    notes: ["V is the largest value, at most 10⁵ here."],
  },
  solution: `class Solution {
public:
    int lengthOfLIS(vector<int>& nums, int k) {
        int V = *max_element(nums.begin(), nums.end()) + 1;
        int size = 1;
        while (size < V) size <<= 1;
        // Iterative segment tree over values; leaf v holds best[v], the longest
        // valid subsequence so far ending with value v.
        vector<int> tree(2 * size, 0);

        auto query = [&](int lo, int hi) {          // max over values [lo, hi]
            int res = 0;
            for (lo += size, hi += size + 1; lo < hi; lo >>= 1, hi >>= 1) {
                if (lo & 1) res = max(res, tree[lo++]);
                if (hi & 1) res = max(res, tree[--hi]);
            }
            return res;
        };
        auto update = [&](int v, int len) {         // best[v] = max(best[v], len)
            int i = v + size;
            tree[i] = max(tree[i], len);
            for (i >>= 1; i >= 1; i >>= 1) tree[i] = max(tree[2 * i], tree[2 * i + 1]);
        };

        int answer = 0;
        for (int x : nums) {
            // The previous element must be strictly smaller and at most k below.
            int lo = max(0, x - k), hi = x - 1;
            int len = 1 + (lo <= hi ? query(lo, hi) : 0);
            update(x, len);
            answer = max(answer, len);
        }
        return answer;
    }
};
`,
});
