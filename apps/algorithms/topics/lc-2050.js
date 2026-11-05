import { study } from "./leet-light.js";

export const lc2050 = study({
  number: 2050,
  title: "Parallel Courses III",
  slug: "parallel-courses-iii",
  difficulty: "H",
  pattern: "F8",
  topic: "F8 · Grid and DAG DP",
  themes: ["Longest path in a DAG", "Topological order", "Critical path"],
  blurb: "With unlimited parallelism, a course can start as soon as its slowest prerequisite finishes. finish[v] = time[v] + max finish over its prerequisites, filled in topological order. The answer is the largest finish, the critical path.",
  statement: [
    "There are n courses with durations time[i], and relations [a, b] meaning a must be finished before b starts. Any number of courses may run at the same time. The prerequisite graph is a DAG.",
    "Return the fewest months to finish all courses. n up to 5 × 10⁴, relations up to 5 × 10⁴. Example: n = 5, relations [[1, 5], [2, 5], [3, 5], [3, 4], [4, 5]], time [1, 2, 3, 4, 5] gives 12.",
  ],
  concepts: [
    "Critical path: with unlimited parallelism, the total time is the longest chain of dependent courses, weighted by duration.",
    "Longest path in a DAG: easy with DP in topological order, unlike in general graphs.",
    "Kahn's algorithm: repeatedly take courses with no unfinished prerequisites; this is the topological order and also detects cycles.",
    "Earliest start = max finish of prerequisites: the max, not the sum, because prerequisites run in parallel.",
  ],
  hints: [
    "If there were no limit on how many courses run at once, when would a course start?",
    "The moment its last prerequisite finishes. So its finish is its own time plus the largest finish among its prerequisites.",
    "In what order can you evaluate that?",
    "Topological order. Kahn's algorithm with in-degrees gives it in O(n + m).",
  ],
  brute: [
    "Simulate month by month, starting every course whose prerequisites are done: up to the answer's number of months (5 × 10⁸) of steps, too slow.",
    "Recursing on finish(v) = time[v] + max finish(prerequisite) without memo re-explores shared prerequisites exponentially in a layered DAG. Each course's finish is a fixed number, so computing it once in topological order costs O(n + m).",
  ],
  invariant: "When course v is taken from the queue, start[v] is the largest finish time among all its prerequisites, so finish[v] = start[v] + time[v] is its true earliest finish.",
  traps: [
    "Summing prerequisite times: they run in parallel, so take the max.",
    "Indexing: courses are 1-based in relations and 0-based in time.",
    "Answering with the last course's finish: the answer is the largest finish over all courses, not the one taken last from the queue.",
    "Recursive DFS on a chain of 5 × 10⁴ courses: deep recursion; Kahn's queue avoids it.",
  ],
  followUps: [
    "At most k courses at a time (1494, Parallel Courses II): becomes NP-hard in general; for small n, a bitmask DP.",
    "Unit durations (1136, Parallel Courses): the number of BFS layers in Kahn's algorithm.",
    "Which courses are critical (any delay delays everything): compute latest start times backwards; critical courses have zero slack.",
    "Detect impossible input (a cycle): Kahn's algorithm finishes with fewer than n courses processed.",
  ],
  explanation: [
    { h: "What the numbers mean" },
    "finish[v] is the earliest month by which course v can be complete. Because any number of courses may run at once, v starts exactly when its slowest prerequisite finishes: start[v] = max finish over its prerequisites (0 if none), and finish[v] = start[v] + time[v].",
    { h: "Order" },
    "finish[v] needs every prerequisite's finish first, which is exactly a topological order. Kahn's algorithm: put all courses with in-degree 0 in a queue; when a course is taken out, push its finish to each dependent and decrement their in-degrees, enqueueing any that reach 0.",
    { code: "start[v] = 0 for all v\nqueue = courses with no prerequisites\nwhile queue: take u; finish = start[u] + time[u]\n    for each dependent v: start[v] = max(start[v], finish); if --indeg[v] == 0: push v\nanswer = max finish" },
    { h: "A worked example: relations 1→5, 2→5, 3→5, 3→4, 4→5; time [1, 2, 3, 4, 5]" },
    {
      table: {
        head: ["course", "time", "prerequisites (finish)", "start", "finish"],
        rows: [
          [1, 1, "none", 0, 1],
          [2, 2, "none", 0, 2],
          [3, 3, "none", 0, 3],
          [4, 4, "3 (3)", 3, 7],
          [5, 5, "1 (1), 2 (2), 3 (3), 4 (7)", 7, "**12**"],
        ],
        caption: "In topological order. Course 5 waits for its slowest prerequisite, course 4. The answer is 12.",
      },
    },
    "The critical path is 3 → 4 → 5: 3 + 4 + 5 = 12. Courses 1 and 2 have slack: they could start later without delaying anything.",
    { h: "Cost" },
    "Each course and each relation is handled once: O(n + m) time and space.",
    { tip: "Signal: tasks with dependencies, unlimited parallelism, minimise total time. Longest weighted path in the DAG, in topological order." },
  ],
  analysis: {
    time: "O(n + m)",
    space: "O(n + m)",
    notes: ["m is the number of relations. The longest finish fits in int (at most 5 × 10⁸)."],
  },
  solution: `class Solution {
public:
    int minimumTime(int n, vector<vector<int>>& relations, vector<int>& time) {
        vector<vector<int>> next(n);
        vector<int> indeg(n, 0);
        for (auto& r : relations) {               // 1-based in the input
            next[r[0] - 1].push_back(r[1] - 1);
            ++indeg[r[1] - 1];
        }

        // start[v]: earliest start of v = latest finish among its
        // prerequisites (they run in parallel, so max, not sum).
        vector<int> start(n, 0);
        queue<int> q;
        for (int v = 0; v < n; ++v)
            if (indeg[v] == 0) q.push(v);

        int answer = 0;
        while (!q.empty()) {                      // Kahn: topological order
            int u = q.front();
            q.pop();
            int finish = start[u] + time[u];
            answer = max(answer, finish);
            for (int v : next[u]) {
                start[v] = max(start[v], finish);
                if (--indeg[v] == 0) q.push(v);
            }
        }
        return answer;
    }
};
`,
});
