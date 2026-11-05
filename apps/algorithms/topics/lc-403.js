import { study } from "./leet-light.js";

export const lc403 = study({
  number: 403,
  title: "Frog Jump",
  slug: "frog-jump",
  difficulty: "H",
  pattern: "F8",
  topic: "F8 · Grid and DAG DP",
  themes: ["State = (position, last jump)", "Reachability DP", "Sparse states"],
  blurb: "Where the frog can jump next depends on where it is and on its last jump, so the state is the pair (stone, last jump). For each stone keep the set of jump sizes that can arrive there and push k − 1, k, k + 1 forward.",
  statement: [
    "Stones lie at increasing positions in a river, the first at 0. The frog starts on the first stone and its first jump must be 1 unit. If its last jump was k units, the next must be k − 1, k or k + 1 units, forward only, and it must land on a stone.",
    "Return whether the frog can reach the last stone. Up to 2000 stones, positions up to 2³¹ − 1. Example: [0, 1, 3, 5, 6, 8, 12, 17] is true; [0, 1, 2, 3, 4, 8, 9, 11] is false (the gap from 4 to 8 is too wide).",
  ],
  concepts: [
    "Choosing the state: position alone is not enough, because the allowed next jumps depend on the last jump. The pair (stone, last jump) captures everything the future needs.",
    "Forward reachability: from every reachable (stone, k), mark the stones reachable with jumps k − 1, k, k + 1.",
    "A DAG by position: jumps go forward, so processing stones left to right finishes every incoming state before a stone is expanded.",
    "Bounded jump sizes: the jump grows by at most 1 per stone, so at stone i the last jump is at most i. That bounds the states by n².",
    "Hash map from position to stone index: positions are huge and sparse.",
  ],
  hints: [
    "Is knowing which stone the frog is on enough to know where it can go next?",
    "No: it also needs its last jump. So the state is (stone, k).",
    "For each stone, which values of k can arrive there? Can you build those sets from left to right?",
    "From each (stone, k), try k − 1, k, k + 1 (positive only) and record the jump at the landing stone if it exists.",
  ],
  brute: [
    "Try every jump sequence by DFS: up to 3 choices per jump, so 3ⁿ sequences in the worst case.",
    "Many sequences land on the same stone with the same last jump, and from then on they are identical. There are at most n × n such pairs (the last jump at stone i is at most i), so recording each pair once gives O(n²).",
  ],
  invariant: "When stone i is processed, jumps[i] holds every jump size k such that the frog can land on stone i with a last jump of exactly k.",
  traps: [
    "A state of position only: [0, 1, 3, 6, 10, 15, 16, 21] needs a specific jump size at 15, and remembering only \"15 is reachable\" loses which jumps are possible next.",
    "Allowing a jump of 0: k − 1 can be 0 when k = 1, and that is not a move. Skip non-positive jumps.",
    "Forgetting that the first jump must be exactly 1: start with jump set {0} at stone 0, so the only positive option is 1, or seed stone 1 directly if it is at position 1.",
    "Searching positions with a linear scan: use a hash map from position to index (or binary search on the sorted positions).",
    "Integer overflow when computing position + k + 1 near 2³¹: use 64-bit or check before adding.",
  ],
  followUps: [
    "Quick rejection: if any gap between stone i and stone i + 1 exceeds i + 1, the answer is false, since the jump can be at most i + 1 by then.",
    "Fewest jumps to reach the end: BFS over (stone, k) states.",
    "Return one route: store a predecessor for each (stone, k) state.",
    "Allow backward jumps: the state graph is no longer a DAG by position; use BFS with a visited set on (stone, k).",
    "Similar \"state includes the last move\" problems: Jump Game V (1340) and VII (1871), Minimum Jumps to Reach Home (1654).",
  ],
  explanation: [
    { h: "What the table means" },
    "jumps[i] is the set of jump sizes k with which the frog can land on stone i. The answer is true if jumps for the last stone is non-empty.",
    { h: "Start" },
    "jumps[0] = {0}: the frog is standing on stone 0, and treating its last jump as 0 makes the next options −1, 0, 1, of which only 1 is a real jump. That enforces the first-jump rule.",
    { h: "Expanding one stone" },
    {
      list: [
        "Process stones in order of position. All jumps arriving at stone i come from earlier stones, so jumps[i] is complete when i is reached.",
        "For each k in jumps[i] and each step s in {k − 1, k, k + 1} with s > 0: if a stone sits at position[i] + s, add s to that stone's set.",
      ],
    },
    { code: "jumps[0] = {0}\nfor i in stone order:\n    for k in jumps[i]:\n        for s in {k-1, k, k+1} with s > 0:\n            if a stone j is at pos[i] + s: jumps[j].add(s)\nanswer = jumps[last] is non-empty" },
    { h: "A worked example: [0, 1, 3, 5, 6, 8, 12, 17]" },
    {
      table: {
        head: ["stone at", "jump sizes arriving", "jumps tried from here", "stones reached"],
        rows: [
          [0, "{0}", "1", "1"],
          [1, "{1}", "1, 2", "3 (by 2)"],
          [3, "{2}", "1, 2, 3", "5 (by 2), 6 (by 3)"],
          [5, "{2}", "1, 2, 3", "6 (by 1), 8 (by 3)"],
          [6, "{1, 3}", "1, 2; 2, 3, 4", "8 (by 2)"],
          [8, "{2, 3}", "1, 2, 3; 2, 3, 4", "12 (by 4)"],
          [12, "{4}", "3, 4, 5", "17 (by 5)"],
          [17, "**{5}**", "", "last stone reached"],
        ],
        caption: "Each stone's set of arriving jump sizes, built left to right. The last stone's set is non-empty, so the answer is true.",
      },
    },
    "Stone 8 is reached by jumps of 3 (from 5) and 2 (from 6). Only the 3 matters in the end: from 8 a jump of 4 lands on 12, and from 12 a jump of 5 lands on 17. A position-only DP would know that 8 is reachable but not that a 4-unit jump is possible from it.",
    { h: "Order and memory" },
    "At most n jump sizes per stone and 3 tries each, with O(1) hash lookups: O(n²) time and space in the worst case, usually far less.",
    { tip: "Signal: the allowed next move depends on the previous move. Put the previous move in the state." },
  ],
  analysis: {
    time: "O(n²)",
    space: "O(n²)",
    notes: ["The last jump at stone i is at most i, which bounds each set's size."],
  },
  solution: `class Solution {
public:
    bool canCross(vector<int>& stones) {
        int n = stones.size();
        unordered_map<long long, int> at;           // position -> stone index
        for (int i = 0; i < n; ++i) at[stones[i]] = i;

        // jumps[i]: every jump size with which the frog can land on stone i.
        // {0} at the start makes the only positive first jump equal to 1.
        vector<unordered_set<int>> jumps(n);
        jumps[0].insert(0);

        for (int i = 0; i < n; ++i) {               // left to right: a DAG by position
            for (int k : jumps[i]) {
                for (int s = k - 1; s <= k + 1; ++s) {
                    if (s <= 0) continue;           // must move forward
                    auto it = at.find((long long)stones[i] + s);
                    if (it != at.end()) jumps[it->second].insert(s);
                }
            }
        }
        return !jumps[n - 1].empty();
    }
};
`,
});
