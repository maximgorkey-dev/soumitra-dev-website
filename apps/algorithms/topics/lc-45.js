import { light } from "./leet-light.js";

export const lc45 = light({
  number: 45,
  title: "Jump Game II",
  slug: "jump-game-ii",
  difficulty: "M",
  pattern: "D1",
  topic: "D1 · Interval scheduling and covering",
  themes: ["Reach", "Implicit BFS"],
  blurb: "A breadth-first search without a queue: each jump covers a window of indices, and the next window ends at the furthest reach from the current one.",
  statement: [
    "From index i of nums you may jump forward by up to nums[i]. The last index is always reachable. Return the fewest jumps from index 0 to the last index.",
    "Up to 10⁴ elements, each between 0 and 1000.",
  ],
  hints: [
    "Group indices by the number of jumps needed to reach them. What shape does each group have?",
    "Each group is a contiguous window, starting right after the previous one.",
    "The next window ends at the furthest i + nums[i] over the current window.",
  ],
  brute: "DP: dp[j] = min(dp[i] + 1) over every i that reaches j: O(n · max jump).",
  invariant: "When i reaches end, jumps is the fewest needed to reach any index in the current window, and next is the furthest index reachable with one more.",
  traps: [
    "Counting a jump at the last index: loop to n − 2, not n − 1.",
    "Jumping as far as possible each time: the longest jump can land on a short one.",
    "A single element needs zero jumps.",
  ],
  followUps: [
    "The end may be unreachable: return −1 when next does not move past end.",
    "1024 Video Stitching and 1326 Taps are this greedy with intervals.",
    "Return the indices jumped to.",
  ],
  explanation: [
    "Think of breadth-first search from index 0. Indices reachable in k jumps form a window, and the window for k + 1 jumps starts right after it and ends at the furthest i + nums[i] over the window for k. There is no need for a queue.",
    "Scan i from 0 to n − 2, keeping next = max(next, i + nums[i]). When i hits end, the edge of the current window, you must jump: count it and set end = next.",
    "Choosing the furthest landing point is wrong; choosing the furthest next window is right, and that is what the scan does.",
    { tip: "Signal: fewest jumps or steps where each position offers a range. Scan with two boundaries: current window end and next window end." },
  ],
  analysis: {
    time: "O(n)",
    space: "O(1)",
    notes: [],
  },
  tests: {
    fn: "jump",
    args: [{ type: "vector<int>", name: "nums" }],
    starter: `class Solution {
public:
    int jump(vector<int>& nums) {

    }
};`,
    reference: `class Solution {
public:
    int jump(vector<int>& nums) {
        int jumps = 0, end = 0, next = 0;
        for (int i = 0; i + 1 < (int)nums.size(); ++i) {
            next = max(next, i + nums[i]);
            if (i == end) { ++jumps; end = next; }
        }
        return jumps;
    }
};`,
    brute: `class Solution {
public:
    // DP over every jump: O(n * max jump).
    int jump(vector<int>& nums) {
        int n = nums.size();
        vector<int> dp(n, INT_MAX);
        dp[0] = 0;
        for (int i = 0; i < n; ++i)
            if (dp[i] != INT_MAX)
                for (int j = 1; j <= nums[i] && i + j < n; ++j) dp[i + j] = min(dp[i + j], dp[i] + 1);
        return dp[n - 1];
    }
};`,
    cases: [
      { name: "example", args: ["{2, 3, 1, 1, 4}"] },
      { name: "example 2", args: ["{2, 3, 0, 1, 4}"] },
      { name: "one element", args: ["{0}"] },
      { name: "longest jump is wrong", args: ["{3, 1, 1, 5, 1, 1, 1, 1}"] },
      { name: "steps of one", args: ["{1, 1, 1, 1}"] },
    ],
    random: { count: 400, gen: "{ int lt_n = rnd(1, 10); nums = rnd_vec(lt_n, 1, 3); }" },
    stress: { label: "10⁴ elements", gen: "nums = rnd_vec(10000, 1, 1000);" },
  },
});
