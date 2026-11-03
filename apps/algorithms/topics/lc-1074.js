import { light } from "./leet-light.js";

export const lc1074 = light({
  number: 1074,
  title: "Number of Submatrices That Sum to Target",
  slug: "number-of-submatrices-that-sum-to-target",
  difficulty: "H",
  pattern: "A1",
  topic: "A1 · Prefix sums with a hash map",
  see: 560,
  themes: ["Matrix", "Reduction", "Subarray sums"],
  blurb: "Fix a pair of rows, collapse the band into one array of column sums, and run 560 on it.",
  statement: [
    "Count the non-empty rectangular submatrices whose elements sum to target.",
    "Up to 100 × 100, values between −1000 and 1000, target between −10⁸ and 10⁸.",
  ],
  hints: [
    "In one dimension, counting subarrays with sum target is 560. Can you reduce to that?",
    "Fix the top and bottom rows of the rectangle. What does each column contribute?",
    "The band between the two rows is a 1D array of column sums; its subarrays are exactly the rectangles with those rows.",
    "Extend the bottom row one at a time, adding to the column sums, so each band costs O(C).",
  ],
  brute: "Every rectangle with a 2D prefix sum: O(R²C²). At 100 × 100 that is 2.5·10⁷ rectangles and actually fast enough, so an interviewer will push for the O(R²C) reduction; the brute grows as the fourth power and is far behind at a few hundred.",
  invariant: "For fixed rows top … bottom, col[c] is the sum of column c over those rows, and the number of rectangles with sum target in this band equals the number of subarrays of col with sum target.",
  traps: [
    "Rebuilding the column sums from scratch for each band: O(R²C·R). Add the new bottom row instead.",
    "Clearing the hash map between bands, but not seeding it with prefix 0 → 1 each time.",
    "Iterating over the larger dimension squared: fix pairs along the smaller side.",
  ],
  followUps: [
    "363 Max Sum of Rectangle No Larger Than K: the same reduction, then an ordered set of prefix sums.",
    "Largest-sum submatrix: the same reduction with Kadane per band.",
    "Count submatrices of all 1s (1504): monotonic stack per row instead.",
  ],
  explanation: [
    "A rectangle is a choice of top row, bottom row, left column and right column. Fix the top and bottom rows; summing each column over that band turns the matrix into one array col, and the rectangles in the band are exactly the subarrays of col. Counting subarrays with sum target is 560: walk col with a running prefix sum and a hash map of how often each earlier prefix occurred.",
    "For a fixed top row, move the bottom row down one at a time and add that row into col, so each band costs O(C) to build and O(C) to count. There are O(R²) bands, so the total is O(R²C).",
    "Choose the smaller dimension for the pair of boundaries; transpose if needed.",
    { tip: "Signal: a 2D count or optimum over rectangles. Fix two parallel boundaries, compress to 1D, reuse the 1D algorithm." },
  ],
  analysis: {
    time: "O(min(R, C)² · max(R, C))",
    space: "O(max(R, C)) for the column sums and the map",
    notes: [
      "1 million band-columns at 100 × 100, each with a hash lookup.",
      "Prefix sums stay within 10⁷ in absolute value here, so int suffices; the count can reach about 2.5·10⁷.",
    ],
  },
  tests: {
    fn: "numSubmatrixSumTarget",
    args: [{ type: "vector<vector<int>>", name: "matrix" }, { type: "int", name: "target" }],
    starter: `class Solution {
public:
    int numSubmatrixSumTarget(vector<vector<int>>& matrix, int target) {

    }
};`,
    reference: `class Solution {
public:
    int numSubmatrixSumTarget(vector<vector<int>>& matrix, int target) {
        int R = matrix.size(), C = matrix[0].size(), ans = 0;
        for (int top = 0; top < R; ++top) {
            vector<int> col(C);  // column sums over rows top..bottom
            for (int bottom = top; bottom < R; ++bottom) {
                for (int c = 0; c < C; ++c) col[c] += matrix[bottom][c];
                unordered_map<int, int> seen{{0, 1}};  // 560 on col
                int s = 0;
                for (int c = 0; c < C; ++c) {
                    s += col[c];
                    auto it = seen.find(s - target);
                    if (it != seen.end()) ans += it->second;
                    ++seen[s];
                }
            }
        }
        return ans;
    }
};`,
    brute: `class Solution {
public:
    // Every rectangle, with a 2D prefix sum: O(R^2 C^2).
    int numSubmatrixSumTarget(vector<vector<int>>& matrix, int target) {
        int R = matrix.size(), C = matrix[0].size(), ans = 0;
        vector<vector<int>> p(R + 1, vector<int>(C + 1));
        for (int r = 0; r < R; ++r)
            for (int c = 0; c < C; ++c) p[r + 1][c + 1] = p[r][c + 1] + p[r + 1][c] - p[r][c] + matrix[r][c];
        for (int r1 = 0; r1 < R; ++r1)
            for (int r2 = r1; r2 < R; ++r2)
                for (int c1 = 0; c1 < C; ++c1)
                    for (int c2 = c1; c2 < C; ++c2)
                        ans += p[r2 + 1][c2 + 1] - p[r1][c2 + 1] - p[r2 + 1][c1] + p[r1][c1] == target;
        return ans;
    }
};`,
    cases: [
      { name: "example", args: ["{{0, 1, 0}, {1, 1, 1}, {0, 1, 0}}", "0"] },
      { name: "example 2", args: ["{{1, -1}, {-1, 1}}", "0"] },
      { name: "single cell", args: ["{{904}}", "0"] },
      { name: "one row", args: ["{{1, 2, 3, -3}}", "3"] },
      { name: "negative target", args: ["{{-1, -1}, {-1, 5}}", "-2"] },
    ],
    random: { count: 300, gen: "{ int lt_r = rnd(1, 5), lt_c = rnd(1, 5); matrix.assign(lt_r, {}); for (auto& row : matrix) row = rnd_vec(lt_c, -2, 2); target = rnd(-3, 3); }" },
    stress: { label: "150 × 150 (above the limit)", gen: "matrix.assign(150, {}); for (auto& row : matrix) row = rnd_vec(150, -1000, 1000); target = 0;" },
  },
});
