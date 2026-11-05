import { study } from "./leet-light.js";

export const lc1235 = study({
  number: 1235,
  title: "Maximum Profit in Job Scheduling",
  slug: "maximum-profit-in-job-scheduling",
  difficulty: "H",
  pattern: "F7",
  topic: "F7 · DP sped up with a data structure (the LIS family)",
  themes: ["Weighted interval scheduling", "Binary search for the predecessor", "Take or skip"],
  blurb: "Sort jobs by end time. best[k] is the most profit from the first k jobs. Job k is either skipped (best[k − 1]) or taken, adding its profit to the best over jobs that end by its start, found by binary search on the sorted end times.",
  statement: [
    "Job i runs from startTime[i] to endTime[i] and earns profit[i]. Choose jobs with no overlapping time ranges (a job may start exactly when another ends) to maximise the total profit.",
    "Up to 5 × 10⁴ jobs, times up to 10⁹. Example: start [1, 2, 3, 3], end [3, 4, 5, 6], profit [50, 10, 40, 70] gives 120 (jobs 1 and 4).",
  ],
  concepts: [
    "Weighted interval scheduling: unlike the unweighted version (greedy by earliest end), weights force a DP.",
    "Sorting by end time gives a natural order: the jobs compatible with job k and ending before it form a prefix of the sorted list.",
    "Take or skip: best[k] = max(best[k − 1], profit + best[p]), where p counts the jobs that end by job k's start.",
    "Binary search for the predecessor: upper_bound on the sorted end times finds p in O(log n).",
    "Large times, few jobs: never index by time; work with job indices and binary search.",
  ],
  hints: [
    "Greedy by earliest end works without profits. Find a small case where it fails with profits.",
    "Sort jobs by end time. For the last job, either it is in the best plan or it is not.",
    "If it is, which earlier jobs can still be used? Show they form a prefix of the sorted order.",
    "Find the length of that prefix with binary search on end times.",
  ],
  brute: [
    "Try every subset of jobs and check for overlaps: 2ⁿ.",
    "The recursion \"take or skip the latest-ending job\" has only n + 1 distinct subproblems, the prefixes of the sorted list, because taking a job always jumps to a prefix. Memoising those prefixes gives O(n) states, each with one binary search: O(n log n).",
  ],
  invariant: "With jobs sorted by end time, best[k] is the largest total profit using only the first k jobs with no overlaps.",
  traps: [
    "Greedy by earliest end: on the example it takes jobs 1 and 3 for 90 instead of 120. Greedy by largest profit: with jobs (1, 10, 60), (1, 5, 50), (5, 10, 50) it takes the 60 and blocks the other two, which make 100.",
    "lower_bound instead of upper_bound on end times: a job ending exactly at the start time is compatible, so it must be counted in the prefix.",
    "Searching the whole end array instead of the first k entries: harmless here because later jobs end at or after job k's end, which is past its start, but bounding the search makes the reasoning explicit.",
    "Indexing a DP by time: times go to 10⁹. Compress, or work by job index as here.",
    "Sorting the three arrays separately: they must move together. Sort an index array.",
  ],
  followUps: [
    "Why the compatible jobs form a prefix: sorted by end, the jobs ending by job k's start come first, and every one of them ends before job k begins.",
    "Return the chosen jobs: walk back from best[n]; if best[k] == best[k − 1] the job was skipped, otherwise it was taken and jump to p.",
    "Unweighted (most jobs): greedy by earliest end, as in 435.",
    "At most k jobs: add a count dimension, best[j][k], O(n × k log n).",
    "Jobs can be done by m workers in parallel: no longer a simple DP; it becomes a min-cost flow, or a greedy with a multiset for the unweighted case.",
    "Online version, jobs arriving by end time: keep (end, best) pairs in a monotone list and binary search the same way.",
  ],
  explanation: [
    { h: "Order the jobs" },
    "Sort jobs by end time and number them 1..n in that order. For job k, the jobs that end at or before its start time are exactly the ones that can come before it in a plan. Because end times are sorted, they are the first p jobs for some p.",
    { h: "What the table means" },
    "best[k] is the most profit from jobs 1..k alone. best[0] = 0.",
    { h: "Filling one cell" },
    {
      list: [
        "Skip job k: best[k − 1].",
        "Take job k: its profit plus the best over jobs that end by its start, best[p], where p = the number of jobs among the first k − 1 with end ≤ start of job k. upper_bound on the sorted end times gives p.",
        "best[k] = the larger of the two.",
      ],
    },
    { code: "sort jobs by end\nbest[0] = 0\nfor k = 1..n:\n    p = number of jobs among the first k-1 with end <= start_k     // upper_bound\n    best[k] = max(best[k-1], best[p] + profit_k)\nanswer = best[n]" },
    { h: "A worked example: start [1, 2, 3, 3], end [3, 4, 5, 6], profit [50, 10, 40, 70]" },
    {
      table: {
        head: ["k", "job (start, end, profit)", "p (jobs ending by start)", "take = best[p] + profit", "skip = best[k − 1]", "best[k]"],
        rows: [
          [1, "(1, 3, 50)", 0, "0 + 50 = 50", 0, 50],
          [2, "(2, 4, 10)", 0, "0 + 10 = 10", 50, 50],
          [3, "(3, 5, 40)", 1, "50 + 40 = 90", 50, 90],
          [4, "(3, 6, 70)", 1, "50 + 70 = 120", 90, "**120**"],
        ],
        caption: "Jobs sorted by end time. best[k] is the most profit from the first k jobs. The answer is 120.",
      },
    },
    "For job 3, which starts at 3, the first job ends at 3 exactly, so it is compatible (upper_bound counts it) and p = 1. Job 2 ends at 4 and is not. Job 4 likewise pairs with job 1 for 50 + 70 = 120, beating 90.",
    { h: "Cost" },
    "Sorting O(n log n) plus one binary search per job: O(n log n) time, O(n) space.",
    { tip: "Signal: choose non-overlapping intervals with weights. Sort by end, DP over prefixes, binary search the last compatible one." },
  ],
  analysis: {
    time: "O(n log n)",
    space: "O(n)",
    notes: ["Total profit is at most 5 × 10⁸, which fits in int."],
  },
  solution: `class Solution {
public:
    int jobScheduling(vector<int>& startTime, vector<int>& endTime, vector<int>& profit) {
        int n = startTime.size();
        // Sort job indices by end time (the three arrays must move together).
        vector<int> idx(n);
        iota(idx.begin(), idx.end(), 0);
        sort(idx.begin(), idx.end(), [&](int a, int b) { return endTime[a] < endTime[b]; });

        vector<int> ends(n);
        for (int k = 0; k < n; ++k) ends[k] = endTime[idx[k]];

        // best[k]: most profit using only the first k jobs in end order.
        vector<int> best(n + 1, 0);
        for (int k = 0; k < n; ++k) {
            int j = idx[k];
            // Jobs ending at or before this start form a prefix of length p.
            // upper_bound: ending exactly at the start time is allowed.
            int p = upper_bound(ends.begin(), ends.begin() + k, startTime[j]) - ends.begin();
            best[k + 1] = max(best[k],                 // skip this job
                              best[p] + profit[j]);    // take it
        }
        return best[n];
    }
};
`,
});
