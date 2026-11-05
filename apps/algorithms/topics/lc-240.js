import { light } from "./leet-light.js";

export const lc240 = light({
  number: 240,
  title: "Search a 2D Matrix II",
  slug: "search-a-2d-matrix-ii",
  difficulty: "M",
  pattern: "E5",
  topic: "E5 · Staircase search in a sorted matrix",
  themes: ["Staircase search", "Elimination"],
  blurb: "Start at the top-right corner: if the value is too big, the whole column is too big; if too small, the whole row is. Each step discards a row or a column.",
  statement: [
    "Each row of an m × n matrix is sorted left to right, and each column top to bottom. Return whether target appears.",
    "m, n ≤ 300; values between −10⁹ and 10⁹.",
  ],
  hints: [
    "From the top-left corner, both moves increase the value. Which corner gives one move up and one move down?",
    "The top-right (or bottom-left).",
    "At the top-right, a value larger than target rules out its column; a smaller one rules out its row.",
  ],
  brute: "Scan every cell: O(m · n). Binary search each row: O(m log n).",
  invariant: "If target is in the matrix, it lies in rows r..m − 1 and columns 0..c.",
  traps: [
    "Starting at the top-left or bottom-right corner: both moves go the same way, so nothing is eliminated.",
    "Treating it like 74, where the whole matrix is one sorted list: here it is not.",
    "Empty rows: check n > 0 before indexing.",
  ],
  followUps: [
    "Count the elements ≤ x in O(m + n): the same walk, used by 378.",
    "Divide and conquer on the middle row: O(n log m)-ish, but more code.",
  ],
  explanation: [
    "At the top-right cell, everything to its left is smaller and everything below is larger. If the cell is larger than target, nothing below it in that column can match either, so drop the column. If it is smaller, nothing to its left in that row can match, so drop the row.",
    "Each comparison removes a row or a column, so at most m + n steps.",
    { tip: "Signal: a matrix sorted along rows and columns. Start in the corner where one direction increases and the other decreases." },
  ],
  analysis: {
    time: "O(m + n)",
    space: "O(1)",
    notes: [],
  },
  tests: {
    fn: "searchMatrix",
    args: [{ type: "vector<vector<int>>", name: "matrix" }, { type: "int", name: "target" }],
    starter: `class Solution {
public:
    bool searchMatrix(vector<vector<int>>& matrix, int target) {

    }
};`,
    reference: `class Solution {
public:
    bool searchMatrix(vector<vector<int>>& matrix, int target) {
        int m = matrix.size(), n = matrix[0].size();
        int r = 0, c = n - 1;
        while (r < m && c >= 0) {
            if (matrix[r][c] == target) return true;
            if (matrix[r][c] > target) --c;  // the rest of this column is larger
            else ++r;                        // the rest of this row is smaller
        }
        return false;
    }
};`,
    brute: `class Solution {
public:
    // Every cell: O(m * n).
    bool searchMatrix(vector<vector<int>>& matrix, int target) {
        for (auto& row : matrix) for (int x : row) if (x == target) return true;
        return false;
    }
};`,
    cases: [
      { name: "example", args: ["{{1, 4, 7, 11, 15}, {2, 5, 8, 12, 19}, {3, 6, 9, 16, 22}, {10, 13, 14, 17, 24}, {18, 21, 23, 26, 30}}", "5"] },
      { name: "example 2", args: ["{{1, 4, 7, 11, 15}, {2, 5, 8, 12, 19}, {3, 6, 9, 16, 22}, {10, 13, 14, 17, 24}, {18, 21, 23, 26, 30}}", "20"] },
      { name: "one cell", args: ["{{-5}}", "-5"] },
      { name: "one row", args: ["{{1, 3, 5}}", "4"] },
      { name: "bottom-left corner", args: ["{{1, 2}, {3, 4}}", "3"] },
    ],
    random: { count: 400, gen: "{ int lt_m = rnd(1, 5), lt_n = rnd(1, 5); matrix.assign(lt_m, vector<int>(lt_n)); for (int i = 0; i < lt_m; ++i) for (int j = 0; j < lt_n; ++j) matrix[i][j] = max(i ? matrix[i - 1][j] : -5, j ? matrix[i][j - 1] : -5) + rnd(0, 2); target = rnd(-5, 20); }" },
    stress: { label: "300 × 300", gen: "{ matrix.assign(300, vector<int>(300)); for (int i = 0; i < 300; ++i) for (int j = 0; j < 300; ++j) matrix[i][j] = max(i ? matrix[i - 1][j] : -1000000000, j ? matrix[i][j - 1] : -1000000000) + rnd(0, 10000); target = matrix[150][150] + 1; }" },
  },
});
