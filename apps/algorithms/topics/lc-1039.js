import { study } from "./leet-light.js";

export const lc1039 = study({
  number: 1039,
  title: "Minimum Score Triangulation of Polygon",
  slug: "minimum-score-triangulation-of-polygon",
  difficulty: "M",
  pattern: "F4",
  topic: "F4 · Interval DP",
  see: 312,
  themes: ["Interval DP", "Choose the split", "Catalan structures"],
  blurb: "The side (i, j) lies in exactly one triangle; its third corner k splits the polygon into two smaller ones. dp[i][j] = the best over k of dp[i][k] + dp[k][j] + v[i] · v[k] · v[j].",
  statement: [
    "A convex polygon has n vertices labelled in order with values[0..n − 1]. Cut it into n − 2 triangles using non-crossing diagonals. A triangle's score is the product of its three vertex values. Return the smallest possible total score.",
    "3 ≤ n ≤ 50, values up to 100. Example: [3, 7, 4, 5] gives 144: triangles (3, 7, 4) and (3, 4, 5), scoring 84 + 60.",
  ],
  concepts: [
    "Interval DP over a run of consecutive vertices i..j, closed by the chord from j back to i.",
    "Choose the element on the boundary: the side (i, j) belongs to exactly one triangle, and choosing its apex k is the whole decision.",
    "Independence: the triangle (i, k, j) splits the rest into the polygons i..k and k..j, which never interact.",
    "Same skeleton as matrix-chain multiplication and Burst Balloons (312). The number of triangulations is a Catalan number, which is why brute force explodes.",
  ],
  hints: [
    "Focus on one fixed side, say the one between vertex 0 and vertex n − 1. How many triangles contain it?",
    "Exactly one. Its third vertex k can be any of 1..n − 2.",
    "After choosing k, what shapes are left on either side of that triangle?",
    "Two smaller convex polygons, 0..k and k..n − 1. Define dp[i][j] for the polygon on vertices i..j.",
  ],
  brute: [
    "Enumerate all triangulations: there are Catalan(n − 2) of them, about 4ⁿ / n^1.5. For n = 50 that is roughly 10²⁶.",
    "The recursion over k without memo solves the same sub-polygon i..j many times (it appears inside many different outer choices). There are only O(n²) sub-polygons, each tried with O(n) apexes: O(n³) with a table.",
  ],
  invariant: "dp[i][j] is the minimum score to triangulate the polygon on vertices i, i + 1, …, j, and every shorter range is already final.",
  traps: [
    "Greedy choices (always cut off the smallest or largest vertex): they fail on small inputs, for example [1, 3, 1, 4, 1, 5], whose optimum 13 needs a specific fan.",
    "Filling by i and j in plain order instead of by interval length, so dp[i][k] or dp[k][j] is not ready.",
    "Forgetting that adjacent vertices (j = i + 1) form no triangle and cost 0.",
    "Overflow is not an issue here (at most 48 triangles of 10⁶), but in variants with larger values use long long.",
  ],
  followUps: [
    "Return the triangulation: store the best k per cell and recurse from (0, n − 1).",
    "Matrix-chain multiplication: the same recurrence with dimensions instead of vertex values.",
    "Maximise instead: swap min for max.",
    "Knuth's optimisation can bring some interval DPs from O(n³) to O(n²) when the best split is monotone; it does not apply to every cost, so you would need to check the quadrangle inequality.",
  ],
  explanation: [
    { h: "What the table means" },
    "dp[i][j], for i < j, answers: what is the smallest total score for triangulating the polygon formed by vertices i, i + 1, …, j, with the chord from j back to i as its closing side? The answer is dp[0][n − 1], the whole polygon.",
    { h: "Base cases" },
    "When j = i + 1 there are only two vertices, which is an edge, not a polygon: no triangles, score 0.",
    { h: "Filling one cell" },
    "In any triangulation of the polygon i..j, the side (i, j) belongs to exactly one triangle. Its third corner is some k with i < k < j. That triangle scores v[i] · v[k] · v[j], and it splits what is left into the polygon i..k and the polygon k..j, which are triangulated independently.",
    "So dp[i][j] is the best over all k: dp[i][k] + dp[k][j] + v[i] · v[k] · v[j].",
    { code: "dp[i][j] = min over i < k < j of  dp[i][k] + dp[k][j] + v[i]*v[k]*v[j]\ndp[i][i+1] = 0" },
    { h: "A worked example: [3, 7, 4, 5]" },
    {
      table: {
        head: ["i \\ j", "0 (3)", "1 (7)", "2 (4)", "3 (5)"],
        rows: [
          ["0 (3)", "", 0, 84, "**144**"],
          ["1 (7)", "", "", 0, 140],
          ["2 (4)", "", "", "", 0],
        ],
        caption: "dp[i][j] for values [3, 7, 4, 5]; vertex values in brackets. The answer is dp[0][3].",
      },
    },
    "dp[0][2]: only k = 1, the triangle (3, 7, 4) = 84.",
    "dp[1][3]: only k = 2, the triangle (7, 4, 5) = 140.",
    "dp[0][3]: k = 1 gives dp[0][1] + dp[1][3] + 3 · 7 · 5 = 0 + 140 + 105 = 245. k = 2 gives dp[0][2] + dp[2][3] + 3 · 4 · 5 = 84 + 0 + 60 = 144. The minimum is 144, using the diagonal from 3 to 4.",
    { h: "Fill order" },
    "dp[i][j] reads only shorter ranges, so fill by length j − i = 2, 3, …, n − 1. Each cell tries up to n apexes.",
    { tip: "Signal: split a sequence or polygon recursively, where each split has a cost that depends on its boundary. Interval DP: pick the element that sits on the boundary of [i, j], and combine the two independent sides." },
  ],
  analysis: {
    time: "O(n³)",
    space: "O(n²)",
    notes: ["For n = 50, about 2 · 10⁴ operations."],
  },
  solution: `class Solution {
public:
    int minScoreTriangulation(vector<int>& v) {
        int n = v.size();

        // dp[i][j] = least score to triangulate the polygon on vertices i..j,
        // closed by the chord j -> i. Adjacent vertices (j == i + 1) are just
        // an edge, so they stay 0.
        vector<vector<int>> dp(n, vector<int>(n, 0));

        // By length, so dp[i][k] and dp[k][j] (both shorter) are ready.
        for (int len = 2; len < n; ++len) {
            for (int i = 0; i + len < n; ++i) {
                int j = i + len;
                dp[i][j] = INT_MAX;
                // The side (i, j) is in exactly one triangle; try every apex k.
                for (int k = i + 1; k < j; ++k) {
                    int cost = dp[i][k]               // polygon on one side
                             + dp[k][j]               // polygon on the other side
                             + v[i] * v[k] * v[j];    // the triangle (i, k, j)
                    dp[i][j] = min(dp[i][j], cost);
                }
            }
        }
        return dp[0][n - 1];
    }
};
`,
});
