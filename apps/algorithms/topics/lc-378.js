import { light } from "./leet-light.js";

export const lc378 = light({
  number: 378,
  title: "Kth Smallest Element in a Sorted Matrix",
  slug: "kth-smallest-element-in-a-sorted-matrix",
  difficulty: "M",
  pattern: "B2",
  topic: "B2 · Binary search on the value",
  see: 668,
  themes: ["Kth smallest", "Sorted matrix", "Staircase walk"],
  blurb: "Search the value; count entries ≤ x with a staircase walk from the bottom-left corner in O(n).",
  statement: [
    "In an n × n matrix whose rows and columns are each sorted in ascending order, return the kth smallest element (counting duplicates).",
    "n up to 300; values between −10⁹ and 10⁹; aim for better than O(n²) memory.",
  ],
  hints: [
    "How fast can you count the entries ≤ x?",
    "Start at the bottom-left corner. If the entry is ≤ x, the whole column above it is too.",
    "Move right when the entry is ≤ x (adding row + 1), up when it is > x. That is O(n).",
    "Binary search x between the top-left and bottom-right values.",
  ],
  brute: "Flatten and sort: O(n² log n) time and O(n²) memory.",
  invariant: "count(lo − 1) < k ≤ count(hi) during the search; in the walk, everything left of the current column at or above the current row has been counted.",
  traps: [
    "Overflow in (lo + hi) / 2 with values near ±10⁹: use lo + (hi − lo) / 2 in long long.",
    "Binary searching each row separately is O(n log n) per count: fine but slower.",
  ],
  followUps: [
    "A k-way merge with a min-heap of row heads: O(k log n), better when k is small.",
    "373 Find K Pairs with Smallest Sums: the heap version on an implicit matrix.",
    "The O(n) selection algorithm of Frederickson and Johnson exists, but is not an interview answer.",
  ],
  explanation: [
    "count(x), the number of entries ≤ x, rises with x, so the kth smallest is the smallest x with count(x) ≥ k. Binary search x between matrix[0][0] and matrix[n − 1][n − 1].",
    "The count uses the sorted structure. Start at the bottom-left. If that entry is ≤ x, so is everything above it in its column: add row + 1 and step right. Otherwise step up. The walk leaves the matrix after at most 2n steps.",
    "Like 668, the result of the search is always an actual entry: the smallest x with count(x) ≥ k must be one.",
    { tip: "A staircase walk counts in a row- and column-sorted matrix in O(n). Combined with a value search, it answers kth-smallest questions." },
  ],
  analysis: {
    time: "O(n log(range)), about 32 walks of 2n steps",
    space: "O(1)",
    notes: ["The heap approach is O(k log n) time and O(n) space."],
  },
  tests: {
    fn: "kthSmallest",
    args: [{ type: "vector<vector<int>>", name: "matrix" }, { type: "int", name: "k" }],
    starter: `class Solution {
public:
    int kthSmallest(vector<vector<int>>& matrix, int k) {

    }
};`,
    reference: `class Solution {
public:
    int kthSmallest(vector<vector<int>>& matrix, int k) {
        int n = matrix.size();
        long long lo = matrix[0][0], hi = matrix[n - 1][n - 1];
        while (lo < hi) {
            long long x = lo + (hi - lo) / 2;
            int cnt = 0;
            for (int r = n - 1, c = 0; r >= 0 && c < n;)
                if (matrix[r][c] <= x) cnt += r + 1, ++c;  // the column above is <= x too
                else --r;
            if (cnt >= k) hi = x;
            else lo = x + 1;
        }
        return lo;
    }
};`,
    brute: `class Solution {
public:
    // Flatten and sort: O(n^2 log n).
    int kthSmallest(vector<vector<int>>& matrix, int k) {
        vector<int> all;
        for (auto& row : matrix) all.insert(all.end(), row.begin(), row.end());
        sort(all.begin(), all.end());
        return all[k - 1];
    }
};`,
    cases: [
      { name: "example", args: ["{{1, 5, 9}, {10, 11, 13}, {12, 13, 15}}", "8"] },
      { name: "1 × 1", args: ["{{-5}}", "1"] },
      { name: "duplicates", args: ["{{1, 2}, {1, 3}}", "2"] },
      { name: "extremes", args: ["{{-1000000000, 0}, {0, 1000000000}}", "4"] },
    ],
    random: { count: 400, gen: "{ int lt_n = rnd(1, 5); matrix.assign(lt_n, vector<int>(lt_n)); for (int r = 0; r < lt_n; ++r) for (int c = 0; c < lt_n; ++c) matrix[r][c] = max(r ? matrix[r - 1][c] : -5, c ? matrix[r][c - 1] : -5) + rnd(0, 3); k = rnd(1, lt_n * lt_n); }" },
    stress: { label: "300 × 300", gen: "matrix.assign(300, vector<int>(300)); for (int r = 0; r < 300; ++r) for (int c = 0; c < 300; ++c) matrix[r][c] = max(r ? matrix[r - 1][c] : -1000000000, c ? matrix[r][c - 1] : -1000000000) + rnd(0, 10000); k = 45000;" },
  },
});
