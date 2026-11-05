import { study } from "./leet-light.js";

export const lc1340 = study({
  number: 1340,
  title: "Jump Game V",
  slug: "jump-game-v",
  difficulty: "H",
  pattern: "F8",
  topic: "F8 · Grid and DAG DP",
  see: 329,
  themes: ["Implicit DAG by value", "Memoised DFS", "Scan until blocked"],
  blurb: "Every jump goes to a strictly lower bar, so the jumps form a DAG. visits[i] = 1 + max visits[j] over the bars reachable from i, found by scanning left and right up to d steps and stopping at the first bar that is not lower.",
  statement: [
    "arr holds bar heights and d is the jump limit. From index i you may jump to j if 1 ≤ |i − j| ≤ d, arr[j] < arr[i], and every bar strictly between i and j is also lower than arr[i]. You may start anywhere.",
    "Return the most indices you can visit. Up to 1000 bars, d ≤ n. Example: arr = [6, 4, 14, 6, 8, 13, 9, 7, 10, 6, 12], d = 2 gives 4 (12 → 10 → 9 → 7).",
  ],
  concepts: [
    "A DAG from the values: every jump lands on a strictly lower bar, so no index can be revisited, and the longest path can be found by DP.",
    "Memoised DFS: visits(i) depends only on lower bars; cache it.",
    "Blocking: the first bar in a direction that is at least arr[i] blocks everything beyond it, so the scan stops there.",
    "Alternative order: sort indices by height ascending and fill visits in that order; every target is lower, so already done.",
    "Cost O(n × d): each index scans at most d bars each way.",
  ],
  hints: [
    "Can a sequence of jumps ever return to an index?",
    "No: each jump goes strictly lower. So what kind of graph do the jumps form?",
    "A DAG. Define visits(i) as the most indices visited starting from i. What does it depend on?",
    "Scan left and right up to d bars, stopping at the first bar that is not lower than arr[i].",
  ],
  brute: [
    "DFS from each index over all jump sequences without caching: the same suffix of jumps is explored from many starts, exponential in the worst case.",
    "visits(i) is the same however i was reached, so it can be computed once. n values, each scanning at most 2d bars: O(n × d), at most 10⁶.",
  ],
  invariant: "Once computed, visits[i] is the largest number of indices on a valid jump sequence starting at i (including i).",
  traps: [
    "Not stopping at a blocking bar: a taller or equal bar between i and j forbids the jump to j and to everything beyond it.",
    "Allowing equal heights: the target must be strictly lower, and an equal bar also blocks.",
    "Starting only from the tallest bar: the best start can be any index; take the max over all.",
    "Dijkstra or BFS for a longest path: unnecessary; the DAG makes it a simple DP.",
  ],
  followUps: [
    "O(n log n) or O(n): monotonic stacks find, for each i, the bars it can reach in each direction without scanning, useful when d is large.",
    "Count the number of longest sequences: sum counts along the DAG.",
    "Jump Game IV (1345, jump to equal values) is a BFS with no DAG; VII (1871) is reachability with a sliding window.",
    "329 is the same idea on a grid: strictly increasing values make the moves a DAG.",
  ],
  explanation: [
    { h: "Why DP works" },
    "A jump always lands on a strictly lower bar, so heights strictly decrease along any sequence and nothing repeats. The jumps form a DAG, and the longest path from each index can be computed once.",
    { h: "What the table means" },
    "visits[i] is the most indices you can visit starting at i, counting i. The answer is the largest visits[i].",
    { h: "Filling one entry" },
    {
      list: [
        "Scan j = i + 1, i + 2, … up to i + d. Stop at the first bar with arr[j] ≥ arr[i]: it blocks that bar and every bar beyond it.",
        "Every bar before the block is lower and reachable: candidate 1 + visits[j].",
        "Do the same to the left. visits[i] is the best candidate, or 1 if there is none.",
      ],
    },
    { code: "visits(i) = 1 + max(visits(j) for j reachable from i), default 0\n  reachable: scan each direction up to d steps, stop at the first arr[j] >= arr[i]\nanswer = max over i of visits(i)" },
    { h: "A worked example: arr = [6, 4, 14, 6, 8, 13, 9, 7, 10, 6, 12], d = 2" },
    {
      table: {
        head: ["index", "height", "reachable (visits)", "visits"],
        rows: [
          [1, 4, "none (6 and 14 block)", 1],
          [0, 6, "1 (1)", 2],
          [3, 6, "none", 1],
          [9, 6, "none", 1],
          [7, 7, "none", 1],
          [4, 8, "3 (1)", 2],
          [6, 9, "7 (1)", 2],
          [8, 10, "7 (1), 6 (2), 9 (1)", 3],
          [10, 12, "9 (1), 8 (3)", "**4**"],
          [5, 13, "4 (2), 3 (1), 6 (2), 7 (1)", 3],
          [2, 14, "1 (1), 0 (2), 3 (1), 4 (2)", 3],
        ],
        caption: "Listed in increasing height, so every reachable bar is already done. The answer is 4, starting at index 10.",
      },
    },
    "From index 8 (height 10), the bars two to the left are 7 and 9, both lower, so both are reachable; index 6 gives 1 + 2 = 3. To the right, 6 is reachable, then 12 blocks. From index 10 (height 12), going left reaches 6 and 10, and 10 is worth 3, so visits = 4: 12 → 10 → 9 → 7.",
    { h: "Order and memory" },
    "Memoised DFS or increasing-height order: O(n × d) time, O(n) space.",
    { tip: "Signal: moves that always decrease (or increase) a value. That is a DAG; memoise the longest path from each node." },
  ],
  analysis: {
    time: "O(n × d)",
    space: "O(n)",
    notes: ["Monotonic stacks reduce the scanning when d is large."],
  },
  solution: `class Solution {
    vector<int> memo;                       // 0 = not computed

    int visits(const vector<int>& arr, int d, int i) {
        if (memo[i]) return memo[i];
        int n = arr.size(), best = 0;
        // To the right: every lower bar is reachable until the first bar that
        // is not lower, which blocks it and everything beyond.
        for (int j = i + 1; j <= min(n - 1, i + d) && arr[j] < arr[i]; ++j)
            best = max(best, visits(arr, d, j));
        // To the left, the same.
        for (int j = i - 1; j >= max(0, i - d) && arr[j] < arr[i]; --j)
            best = max(best, visits(arr, d, j));
        // Targets are strictly lower, so the recursion always ends.
        return memo[i] = 1 + best;
    }

public:
    int maxJumps(vector<int>& arr, int d) {
        memo.assign(arr.size(), 0);
        int answer = 0;
        for (int i = 0; i < (int)arr.size(); ++i) answer = max(answer, visits(arr, d, i));
        return answer;
    }
};
`,
});
