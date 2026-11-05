import { study } from "./leet-light.js";

export const lc1039 = study({
  number: 1039,
  title: "Minimum Score Triangulation of Polygon",
  slug: "minimum-score-triangulation-of-polygon",
  difficulty: "M",
  pattern: "F4",
  topic: "F4 · Interval DP",
  see: 312,
  themes: ["Interval DP", "Choose the apex"],
  blurb: "The edge (i, j) belongs to exactly one triangle, with some apex k between them. dp[i][j] = min over k of dp[i][k] + dp[k][j] + v[i] · v[k] · v[j].",
  statement: [
    "A convex polygon has vertex values values[0..n − 1] in order. Triangulate it into n − 2 triangles; a triangle scores the product of its three vertex values. Return the smallest total score.",
    "n ≤ 50, values ≤ 100.",
  ],
  concepts: [
    "Interval DP over a range of polygon vertices i..j.",
    "Choosing the split: the side (i, j) is in exactly one triangle, whose third vertex k splits the polygon into two smaller ones.",
    "The same shape as Burst Balloons (312) and matrix-chain multiplication.",
  ],
  traps: [
    "Trying a greedy (always cut the largest vertex off): it fails on simple inputs.",
    "Iterating by i and j directly instead of by interval length, so subproblems are not ready.",
  ],
  followUps: [
    "Return the triangulation itself.",
    "Maximise the score instead.",
  ],
  explanation: [
    "dp[i][j] is the minimum score for the sub-polygon with vertices i, i + 1, …, j (and the chord from j back to i). Two vertices (j = i + 1) make no triangle: score 0.",
    "In any triangulation, the side (i, j) belongs to exactly one triangle, whose third vertex k is strictly between i and j. That triangle scores v[i] · v[k] · v[j], and it splits the rest into the sub-polygons i..k and k..j, which are independent.",
    "So dp[i][j] = min over i < k < j of dp[i][k] + dp[k][j] + v[i] · v[k] · v[j], filled by increasing length. The answer is dp[0][n − 1].",
    { tip: "Signal: split a sequence or polygon recursively, with a cost for each split. Interval DP: choose the element that sits on the boundary of [i, j]." },
  ],
  analysis: { time: "O(n³)", space: "O(n²)" },
  solution: `class Solution {
public:
    int minScoreTriangulation(vector<int>& v) {
        int n = v.size();
        // dp[i][j]: least score for the polygon on vertices i..j (closed by the chord j-i).
        // Adjacent vertices (j == i+1) form no triangle, so they stay 0.
        vector<vector<int>> dp(n, vector<int>(n, 0));

        for (int len = 2; len < n; ++len) {          // j - i
            for (int i = 0; i + len < n; ++i) {
                int j = i + len;
                dp[i][j] = INT_MAX;
                // The side (i, j) is in exactly one triangle (i, k, j).
                for (int k = i + 1; k < j; ++k)
                    dp[i][j] = min(dp[i][j], dp[i][k] + dp[k][j] + v[i] * v[k] * v[j]);
            }
        }
        return dp[0][n - 1];
    }
};
`,
});
