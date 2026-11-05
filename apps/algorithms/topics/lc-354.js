import { study } from "./leet-light.js";

export const lc354 = study({
  number: 354,
  title: "Russian Doll Envelopes",
  slug: "russian-doll-envelopes",
  difficulty: "H",
  pattern: "F7",
  topic: "F7 · DP sped up with a data structure (the LIS family)",
  see: 300,
  themes: ["2D to 1D by sorting", "Tie-breaking", "LIS on heights"],
  blurb: "Sort by width ascending, and for equal widths by height descending. Then any strictly increasing run of heights uses strictly increasing widths too, so the answer is the LIS of the heights, in O(n log n).",
  statement: [
    "envelopes[i] = [w, h]. One envelope fits inside another only if both its width and height are strictly smaller. Return the largest number of envelopes you can nest one inside another (no rotation).",
    "Up to 10⁵ envelopes. Example: [[5, 4], [6, 4], [6, 7], [2, 3]] gives 3 ([2, 3] in [5, 4] in [6, 7]).",
  ],
  concepts: [
    "Reducing a 2D chain to 1D: sorting by one coordinate makes the order of the chain fixed, leaving an LIS on the other coordinate.",
    "Tie-breaking as a constraint: equal widths cannot nest, so sorting them by height descending makes any two of them impossible to pick in an increasing height run.",
    "LIS with tails and lower_bound (300): O(n log n), required at n = 10⁵.",
    "Strictness in both dimensions: lower_bound gives strict heights; the tie rule gives strict widths.",
  ],
  hints: [
    "If envelopes were already in nesting order by width, what would remain to choose?",
    "Sort by width. Now a nesting chain is a subsequence whose heights strictly increase. That is LIS.",
    "What goes wrong when two envelopes share a width?",
    "Their heights might increase, and LIS would chain them even though they cannot nest. Order equal widths so that cannot happen.",
  ],
  brute: [
    "Build the \"fits inside\" graph and find the longest path in the DAG: O(n²) edges, 10¹⁰ at n = 10⁵.",
    "The O(n²) DP after sorting (longest chain ending at i over all j < i that fit inside i) is the same cost. After sorting with the tie rule, the condition \"fits inside\" becomes just \"smaller height earlier in the list\", which the tails array answers with a binary search per envelope.",
  ],
  invariant: "After sorting by (width ascending, height descending), a set of envelopes nests if and only if, taken in sorted order, their heights are strictly increasing.",
  traps: [
    "Sorting equal widths by height ascending: [[1, 1], [1, 2], [1, 3]] would give LIS 3, but none of them nest, the answer is 1.",
    "upper_bound: allows equal heights, which cannot nest.",
    "O(n²) DP: times out at 10⁵.",
    "Sorting with a comparator that takes vectors by value: copies 10⁵ small vectors many times; take them by const reference.",
  ],
  followUps: [
    "Why the tie rule works: within one width the heights are decreasing, so a strictly increasing subsequence contains at most one of them.",
    "Return the chain: parent links in the tails array, as in 300.",
    "Three dimensions (boxes): sorting removes one dimension only; the remaining 2D dominance chain needs an O(n²) DP, or a CDQ divide and conquer with a Fenwick tree in O(n log² n).",
    "Rotation allowed: normalise each envelope to (min, max) first.",
    "Count the number of maximum chains: Fenwick tree over heights storing (length, count).",
  ],
  explanation: [
    { h: "From two dimensions to one" },
    "If the envelopes are sorted by width, any nesting chain appears in that order, so the problem becomes picking a subsequence whose heights strictly increase: an LIS.",
    "The catch is equal widths. Two envelopes with width 6 cannot nest, but if their heights were 4 then 7 in the sorted order, the LIS would happily chain them. Sorting equal widths by height descending puts 7 before 4, and a strictly increasing subsequence can then use at most one envelope of each width.",
    { h: "What the tails array means here" },
    "tails[k] is the smallest height that can end a valid chain of k + 1 envelopes among those processed so far, exactly as in 300.",
    { code: "sort by (w ascending, h descending)\ntails = []\nfor each envelope (w, h) in order:\n    k = lower_bound(tails, h)\n    append or replace tails[k] = h\nanswer = len(tails)" },
    { h: "A worked example: [[5, 4], [6, 4], [6, 7], [2, 3]]" },
    {
      table: {
        head: ["sorted envelope", "height", "action", "tails after"],
        rows: [
          ["[2, 3]", 3, "append", "3"],
          ["[5, 4]", 4, "append", "3, 4"],
          ["[6, 7]", 7, "append", "3, 4, 7"],
          ["[6, 4]", 4, "replace 4 with 4", "**3, 4, 7**"],
        ],
        caption: "Width 6 comes as [6, 7] then [6, 4], heights descending. The answer is 3.",
      },
    },
    "To see the tie rule matter, replace [6, 4] with [6, 5]. Sorted with heights ascending within width 6, the heights read 3, 4, 5, 7 and the LIS reports 4, nesting [6, 5] inside [6, 7], which is not allowed. Sorted descending, they read 3, 4, 7, 5: the 5 replaces the 7, and the length stays 3.",
    { h: "Cost" },
    "Sorting O(n log n), then one binary search per envelope: O(n log n) time, O(n) space.",
    { tip: "Signal: longest chain under a two-coordinate strict order. Sort by one coordinate, break ties against the chain, LIS on the other." },
  ],
  analysis: {
    time: "O(n log n)",
    space: "O(n)",
    notes: ["The tie-break is the whole trick; the rest is 300."],
  },
  solution: `class Solution {
public:
    int maxEnvelopes(vector<vector<int>>& envelopes) {
        // Width ascending; equal widths by height DESCENDING, so a strictly
        // increasing run of heights can never take two envelopes of one width.
        sort(envelopes.begin(), envelopes.end(),
             [](const vector<int>& a, const vector<int>& b) {
                 return a[0] != b[0] ? a[0] < b[0] : a[1] > b[1];
             });

        // LIS on heights. tails[k]: smallest height ending a chain of k+1.
        vector<int> tails;
        for (const auto& e : envelopes) {
            int h = e[1];
            auto it = lower_bound(tails.begin(), tails.end(), h);   // strict
            if (it == tails.end()) tails.push_back(h); else *it = h;
        }
        return tails.size();
    }
};
`,
});
