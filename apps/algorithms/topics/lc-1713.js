import { study } from "./leet-light.js";

export const lc1713 = study({
  number: 1713,
  title: "Minimum Operations to Make a Subsequence",
  slug: "minimum-operations-to-make-a-subsequence",
  difficulty: "H",
  pattern: "F7",
  topic: "F7 · DP sped up with a data structure (the LIS family)",
  see: 300,
  themes: ["LCS becomes LIS", "Distinct values", "Relabel by position"],
  blurb: "Insertions needed = |target| − (longest common subsequence). Because target's values are distinct, relabel each element of arr by its position in target (dropping the rest); a common subsequence is then an increasing run of positions, so LCS = LIS, in O(n log n).",
  statement: [
    "target has distinct integers; arr may have duplicates. In one operation you insert any integer anywhere in arr. Return the fewest operations that make target a subsequence of arr.",
    "Both up to 10⁵ long. Example: target = [6, 4, 8, 1, 3, 2], arr = [4, 7, 6, 2, 3, 8, 6, 1] gives 3.",
  ],
  concepts: [
    "Insertions and LCS: the elements of target already present in order (a common subsequence) can stay; every other target element must be inserted. So the answer is |target| − LCS.",
    "LCS is O(n × m) in general: 10¹⁰ here, far too slow.",
    "Distinctness enables relabelling: each value of target has one position, so map arr's elements to those positions and drop values not in target.",
    "A common subsequence is then exactly a strictly increasing subsequence of positions, so LCS = LIS of the relabelled array.",
    "LIS with tails and lower_bound (300).",
  ],
  hints: [
    "Which target elements never need inserting?",
    "Those forming a common subsequence of target and arr. So the answer is |target| minus the LCS. Why is the usual LCS DP too slow?",
    "Use that target's values are distinct. Replace each element of arr by its index in target.",
    "In the relabelled array, what does a common subsequence look like?",
  ],
  brute: [
    "The standard LCS table is |target| × |arr| = 10¹⁰ cells.",
    "The table is wasteful because each arr element matches at most one target position. After relabelling, matching target in order means choosing arr elements whose target positions strictly increase, which is LIS: one binary search per element.",
  ],
  invariant: "After relabelling, a subsequence of arr matches a subsequence of target (in order) exactly when its labels are strictly increasing; tails maintains 300's invariant over the labels.",
  traps: [
    "Running the O(n × m) LCS: times out.",
    "Keeping arr elements not in target: they cannot match and must be dropped before the LIS.",
    "Non-strict LIS: duplicates in arr map to the same position, and one target element can match only once. Use lower_bound.",
    "Trying this when target has duplicates: the relabelling is no longer unique, and the reduction breaks. Then it is a true LCS (Hunt–Szymanski helps when matches are sparse).",
  ],
  followUps: [
    "Why distinctness matters: with duplicates in target, one arr element could match several positions, and LIS over a single label would undercount.",
    "Return where to insert: reconstruct the LIS with parent links; the target elements not in it are inserted between the matched ones.",
    "Both deletions and insertions allowed to turn arr into target: |arr| + |target| − 2 × LCS, same reduction.",
    "LCS of two permutations: exactly this reduction, a classic.",
    "Edit distance with substitutions (72) does not reduce this way; it needs the full table.",
  ],
  explanation: [
    { h: "Count what can stay" },
    "Inserting elements never removes any, so target becomes a subsequence of arr exactly when every target element outside some common subsequence is inserted. Keep the longest common subsequence: the answer is |target| − LCS(target, arr).",
    { h: "Relabel by position" },
    "Let pos[v] be the index of value v in target (values are distinct, so this is well defined). Turn arr into the list of pos[x] for each x in arr that appears in target.",
    "A common subsequence picks arr elements in order that match target elements in order, so their target positions strictly increase. Conversely, a strictly increasing run of labels is a common subsequence. So LCS = LIS of the label list.",
    { code: "pos[target[i]] = i\nlabels = [pos[x] for x in arr if x in pos]\nanswer = len(target) - LIS_strict(labels)" },
    { h: "A worked example" },
    "target = [6, 4, 8, 1, 3, 2] gives pos: 6→0, 4→1, 8→2, 1→3, 3→4, 2→5. arr = [4, 7, 6, 2, 3, 8, 6, 1] becomes labels [1, 0, 5, 4, 2, 0, 3] (7 is dropped).",
    {
      table: {
        head: ["label", "from arr value", "action", "tails after"],
        rows: [
          [1, 4, "append", "1"],
          [0, 6, "replace 1", "0"],
          [5, 2, "append", "0, 5"],
          [4, 3, "replace 5", "0, 4"],
          [2, 8, "replace 4", "0, 2"],
          [0, 6, "replace 0 with 0", "0, 2"],
          [3, 1, "append", "**0, 2, 3**"],
        ],
        caption: "LIS over target positions. Its length 3 is the LCS, so 6 − 3 = 3 insertions.",
      },
    },
    "The kept chain 0, 2, 3 is the target values 6, 8, 1, appearing in arr in that order. The other three target values (4, 3, 2) are inserted around them.",
    { h: "Cost" },
    "A hash map from value to position, then LIS: O((n + m) log m) time, O(n) space.",
    { tip: "Signal: LCS where one sequence has distinct values. Relabel by position and the LCS becomes an LIS." },
  ],
  analysis: {
    time: "O(n + m log m)",
    space: "O(n + m)",
    notes: ["n = |target|, m = |arr|."],
  },
  solution: `class Solution {
public:
    int minOperations(vector<int>& target, vector<int>& arr) {
        // target's values are distinct, so each has one position.
        unordered_map<int, int> pos;
        pos.reserve(target.size() * 2);
        for (int i = 0; i < (int)target.size(); ++i) pos[target[i]] = i;

        // Relabel arr by target position (dropping values not in target).
        // A common subsequence is a strictly increasing run of labels,
        // so the LCS is the LIS of the labels.
        vector<int> tails;
        for (int x : arr) {
            auto f = pos.find(x);
            if (f == pos.end()) continue;           // cannot match anything
            int p = f->second;
            auto it = lower_bound(tails.begin(), tails.end(), p);   // strict
            if (it == tails.end()) tails.push_back(p); else *it = p;
        }
        // Everything outside the kept common subsequence must be inserted.
        return (int)target.size() - (int)tails.size();
    }
};
`,
});
