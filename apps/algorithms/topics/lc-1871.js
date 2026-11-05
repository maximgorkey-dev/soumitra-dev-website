import { study } from "./leet-light.js";

export const lc1871 = study({
  number: 1871,
  title: "Jump Game VII",
  slug: "jump-game-vii",
  difficulty: "M",
  pattern: "F8",
  topic: "F8 · Grid and DAG DP",
  themes: ["Reachability DP", "Sliding window count", "Range of predecessors"],
  blurb: "Index j is reachable if it holds '0' and some reachable index lies in the window [j − maxJump, j − minJump]. Keep a running count of reachable indices in that window as it slides, so each index is O(1).",
  statement: [
    "s is a binary string with s[0] = '0'. From index i you may jump to any j with i + minJump ≤ j ≤ min(i + maxJump, n − 1) and s[j] = '0'. Starting at index 0, return whether you can reach index n − 1.",
    "Up to 10⁵ characters. Example: s = \"011010\", minJump = 2, maxJump = 3 is true (0 → 3 → 5); s = \"01101110\", minJump = 2, maxJump = 3 is false.",
  ],
  concepts: [
    "Reachability DP over a line: reach[j] depends on earlier indices only, since jumps go forward.",
    "The predecessors of j form a window: i can jump to j exactly when j − maxJump ≤ i ≤ j − minJump.",
    "Sliding window count: as j grows by one, one index enters the window and one leaves; adjust a counter instead of rescanning.",
    "Equivalent tools: prefix sums of reach, or BFS with a pointer marking how far has been explored.",
  ],
  hints: [
    "Which earlier indices can jump to index j?",
    "Exactly those in [j − maxJump, j − minJump]. So reach[j] is \"s[j] is '0' and some reachable index is in that window\".",
    "Checking the whole window for each j is O(n × maxJump). What changes from j to j + 1?",
    "One index enters, one leaves. Keep a count of reachable indices in the window.",
  ],
  brute: [
    "BFS or DFS from 0, trying every jump length from minJump to maxJump: O(n × (maxJump − minJump)), up to 10¹⁰.",
    "Both versions look at the same windows again and again. Because the window of predecessors only slides right by one per index, a counter updated in O(1) replaces the scan, giving O(n).",
  ],
  invariant: "Before deciding index j, window equals the number of reachable indices i with j − maxJump ≤ i ≤ j − minJump.",
  traps: [
    "Updating the window boundaries off by one: the entering index is j − minJump, and the leaving one is j − maxJump − 1.",
    "Forgetting the '0' check at j: a reachable window does not help if s[j] is '1'.",
    "Plain BFS that re-scans ranges already covered: O(n × maxJump). If you use BFS, keep a pointer to the farthest index already enqueued.",
    "Returning early when s ends in '1': correct (unreachable), but make sure the general logic also gives false.",
  ],
  followUps: [
    "Fewest jumps: BFS with the farthest-explored pointer, O(n).",
    "Jumps allowed in both directions: no longer a DAG; BFS with a set of unvisited indices so each is removed once.",
    "Weighted jumps (cost per landing): sliding-window minimum with a monotonic deque (1696 Jump Game VI).",
    "Other members: 1340 (a DAG by height), 403 (the last jump is part of the state).",
  ],
  explanation: [
    { h: "What the table means" },
    "reach[j] is true when index j can be reached from 0. reach[0] is true. The answer is reach[n − 1].",
    { h: "Filling one entry" },
    {
      list: [
        "Index i can jump to j exactly when j − maxJump ≤ i ≤ j − minJump.",
        "So reach[j] = (s[j] == '0') and (some reachable index lies in that window).",
        "Keep window = the count of reachable indices in it. Moving from j − 1 to j, the index j − minJump enters and j − maxJump − 1 leaves.",
      ],
    },
    { code: "reach[0] = true; window = 0\nfor j = 1 .. n-1:\n    if j - minJump >= 0:     window += reach[j - minJump]\n    if j - maxJump - 1 >= 0: window -= reach[j - maxJump - 1]\n    reach[j] = s[j] == '0' and window > 0" },
    { h: "A worked example: s = \"011010\", minJump = 2, maxJump = 3" },
    {
      table: {
        head: ["j", "s[j]", "window of predecessors", "reachable in it", "reach[j]"],
        rows: [
          [0, "0", "start", "", "T"],
          [1, "1", "none yet", 0, "F"],
          [2, "1", "0..0", 1, "F (s is 1)"],
          [3, "0", "0..1", 1, "T"],
          [4, "1", "1..2", 0, "F"],
          [5, "0", "2..3", 1, "**T**"],
        ],
        caption: "The window for j is [j − 3, j − 2], clipped at 0. The answer reach[5] is true.",
      },
    },
    "Index 3 is reachable because index 0 is in its window [0, 1]. Index 5's window is [2, 3], and index 3 is reachable, so 0 → 3 → 5 works.",
    { h: "Order and memory" },
    "One pass: O(n) time, O(n) space for reach.",
    { tip: "Signal: reachability where the predecessors of j form a contiguous window. Slide a count (or prefix sums) instead of scanning the window." },
  ],
  analysis: {
    time: "O(n)",
    space: "O(n)",
    notes: ["Each index enters and leaves the window once."],
  },
  solution: `class Solution {
public:
    bool canReach(string s, int minJump, int maxJump) {
        int n = s.size();
        // reach[j]: index j can be reached from 0.
        vector<char> reach(n, 0);
        reach[0] = 1;
        // window: number of reachable i with j - maxJump <= i <= j - minJump,
        // exactly the indices that can jump to j.
        int window = 0;
        for (int j = 1; j < n; ++j) {
            if (j - minJump >= 0) window += reach[j - minJump];           // enters
            if (j - maxJump - 1 >= 0) window -= reach[j - maxJump - 1];   // leaves
            reach[j] = (s[j] == '0' && window > 0);
        }
        return reach[n - 1];
    }
};
`,
});
