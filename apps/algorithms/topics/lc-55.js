import { light } from "./leet-light.js";

export const lc55 = light({
  number: 55,
  title: "Jump Game",
  slug: "jump-game",
  difficulty: "M",
  pattern: "D1",
  topic: "D1 · Interval scheduling and covering",
  themes: ["Reach", "Greedy"],
  blurb: "Keep the furthest index reachable so far; if the scan ever passes it, you are stuck.",
  statement: [
    "You start at index 0 of nums; from index i you may jump forward by up to nums[i]. Return whether you can reach the last index.",
    "Up to 10⁴ elements, each between 0 and 10⁵.",
  ],
  hints: [
    "Do you need to know which jumps you took, or only how far you could get?",
    "Every index up to the furthest reachable one is reachable.",
    "Scan once, extending reach = max(reach, i + nums[i]) while i ≤ reach.",
  ],
  brute: "Depth-first search over jumps without memo: exponential. With memo, O(n · max jump).",
  invariant: "Before index i, reach is the furthest index reachable using only positions before i; every index ≤ reach is reachable.",
  traps: [
    "Stopping at a zero: a zero is only a trap if nothing jumps over it.",
    "Checking reach ≥ n instead of reach ≥ n − 1.",
    "A single element is already at the end.",
  ],
  followUps: [
    "Fewest jumps: 45 Jump Game II.",
    "Jump forward or backward by exactly nums[i]: 1306, a breadth-first search.",
    "Scan from the right, moving the goal left whenever i + nums[i] reaches it.",
  ],
  explanation: [
    "The reachable indices always form a prefix: if you can reach j, you can reach every index before it, because some jump crossed them. So the whole state is one number, the furthest reachable index.",
    "Scan left to right. If i is beyond reach, nothing gets you to i, and the answer is false. Otherwise extend reach to i + nums[i]. Reaching n − 1 means true.",
    { tip: "Signal: can I reach the end, with jumps of up to some length. Track only the furthest reach." },
  ],
  analysis: {
    time: "O(n)",
    space: "O(1)",
    notes: [],
  },
  tests: {
    fn: "canJump",
    args: [{ type: "vector<int>", name: "nums" }],
    starter: `class Solution {
public:
    bool canJump(vector<int>& nums) {

    }
};`,
    reference: `class Solution {
public:
    bool canJump(vector<int>& nums) {
        int reach = 0, n = nums.size();
        for (int i = 0; i < n && i <= reach; ++i) reach = max(reach, i + nums[i]);
        return reach >= n - 1;
    }
};`,
    brute: `class Solution {
public:
    // Mark every index each reachable index can jump to: O(n * max jump).
    bool canJump(vector<int>& nums) {
        int n = nums.size();
        vector<bool> ok(n, false);
        ok[0] = true;
        for (int i = 0; i < n; ++i)
            if (ok[i])
                for (int j = 1; j <= nums[i] && i + j < n; ++j) ok[i + j] = true;
        return ok[n - 1];
    }
};`,
    cases: [
      { name: "example", args: ["{2, 3, 1, 1, 4}"] },
      { name: "example 2", args: ["{3, 2, 1, 0, 4}"] },
      { name: "one element", args: ["{0}"] },
      { name: "jump over a zero", args: ["{2, 0, 0}"] },
      { name: "stuck at start", args: ["{0, 1}"] },
    ],
    random: { count: 400, gen: "nums = rnd_vec(rnd(1, 10), 0, 3);" },
    stress: { label: "10⁴ elements", gen: "{ nums = rnd_vec(10000, 0, 3); nums[0] = 100000; }" },
  },
});
