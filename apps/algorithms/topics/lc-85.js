import { light } from "./leet-light.js";

export const lc85 = light({
  number: 85,
  title: "Maximal Rectangle",
  slug: "maximal-rectangle",
  difficulty: "H",
  pattern: "A2",
  topic: "A2 · Monotonic stack",
  see: 84,
  themes: ["Matrix", "Reduction"],
  blurb: "Each row is the floor of a histogram whose bars are the runs of 1s above it. Run 84 on every row.",
  statement: [
    "Given a grid of '0' and '1' characters, return the area of the largest rectangle containing only '1's.",
    "Up to 200 × 200.",
  ],
  hints: [
    "Fix the bottom row of the rectangle. What does the grid look like from there?",
    "For each column, count the consecutive 1s ending at this row. Those counts are bar heights.",
    "The best rectangle with this bottom row is the largest rectangle in that histogram (84).",
    "Update the heights row by row in O(C): add 1, or reset to 0.",
  ],
  brute: "Try every pair of corners and check with a 2D prefix sum whether the rectangle is all 1s: O(R²C²), about 4·10⁸ at 200 × 200 and quickly hopeless beyond.",
  invariant: "After processing row r, h[c] is the number of consecutive 1s ending at (r, c). Every all-1s rectangle with bottom row r is a rectangle in that histogram, and vice versa.",
  traps: [
    "Not resetting the height to 0 at a '0' cell.",
    "Comparing with 1 instead of '1': the cells are characters.",
    "Forgetting to flush the stack at the end of each row; a sentinel height 0 after the last column does it.",
  ],
  followUps: [
    "221 Maximal Square: a simpler DP, side = 1 + min(up, left, up-left).",
    "Count all-1s rectangles instead (1504): monotonic stack again, summing contributions.",
    "The grid is sparse and huge: work only with the rows that change.",
  ],
  explanation: [
    "Choose a bottom row. Above each column stands a bar of consecutive 1s ending at that row, and every all-1s rectangle resting on this row fits under those bars. So the answer for this row is exactly 84 Largest Rectangle in Histogram on the bar heights.",
    "The heights update in O(C) per row: a '1' extends its column's bar by 1, a '0' resets it. Running the monotonic-stack solution of 84 on each row costs O(C), so the total is O(RC).",
    "In the stack pass, each bar is popped when a lower bar appears to its right; the bar below it on the stack is the first lower bar to its left, so its width is known at that moment.",
    { tip: "Signal: a 2D problem that becomes 1D once you fix one boundary. Fix the bottom row and reuse a 1D algorithm (here 84; for sums, Kadane per pair of rows in 363 and 1074)." },
  ],
  analysis: {
    time: "O(R · C)",
    space: "O(C)",
    notes: [
      "The alternative DP with left, right and height arrays per row is also O(RC) and avoids the stack.",
      "Fixing pairs of rows and scanning columns is O(R²C), fine at 200 but worse in general.",
    ],
  },
  tests: {
    fn: "maximalRectangle",
    args: [{ type: "vector<vector<char>>", name: "matrix" }],
    starter: `class Solution {
public:
    int maximalRectangle(vector<vector<char>>& matrix) {

    }
};`,
    reference: `class Solution {
public:
    int maximalRectangle(vector<vector<char>>& matrix) {
        int R = matrix.size(), C = matrix[0].size(), best = 0;
        vector<int> h(C + 1);  // h[C] = 0 is a sentinel that flushes the stack
        for (int r = 0; r < R; ++r) {
            for (int c = 0; c < C; ++c) h[c] = matrix[r][c] == '1' ? h[c] + 1 : 0;
            vector<int> st;  // columns with increasing heights
            for (int c = 0; c <= C; ++c) {
                while (!st.empty() && h[st.back()] >= h[c]) {
                    int height = h[st.back()];
                    st.pop_back();
                    int left = st.empty() ? -1 : st.back();
                    best = max(best, height * (c - left - 1));
                }
                st.push_back(c);
            }
        }
        return best;
    }
};`,
    brute: `class Solution {
public:
    // Every rectangle, checked with a 2D prefix sum: O(R^2 C^2).
    int maximalRectangle(vector<vector<char>>& matrix) {
        int R = matrix.size(), C = matrix[0].size(), best = 0;
        vector<vector<int>> p(R + 1, vector<int>(C + 1));
        for (int r = 0; r < R; ++r)
            for (int c = 0; c < C; ++c)
                p[r + 1][c + 1] = p[r][c + 1] + p[r + 1][c] - p[r][c] + (matrix[r][c] == '1');
        for (int r1 = 0; r1 < R; ++r1)
            for (int c1 = 0; c1 < C; ++c1)
                for (int r2 = r1; r2 < R; ++r2)
                    for (int c2 = c1; c2 < C; ++c2) {
                        int area = (r2 - r1 + 1) * (c2 - c1 + 1);
                        if (p[r2 + 1][c2 + 1] - p[r1][c2 + 1] - p[r2 + 1][c1] + p[r1][c1] == area) best = max(best, area);
                    }
        return best;
    }
};`,
    cases: [
      { name: "example", args: ["{{'1','0','1','0','0'},{'1','0','1','1','1'},{'1','1','1','1','1'},{'1','0','0','1','0'}}"] },
      { name: "single 0", args: ["{{'0'}}"] },
      { name: "single 1", args: ["{{'1'}}"] },
      { name: "one row", args: ["{{'1','1','0','1','1','1'}}"] },
      { name: "one column", args: ["{{'1'},{'1'},{'0'},{'1'}}"] },
      { name: "all ones", args: ["{{'1','1','1'},{'1','1','1'}}"] },
    ],
    random: { count: 300, gen: "{ int lt_r = rnd(1, 6), lt_c = rnd(1, 6); matrix.assign(lt_r, vector<char>(lt_c)); for (auto& row : matrix) for (char& ch : row) ch = rnd(0, 3) ? '1' : '0'; }" },
    stress: { label: "400 × 400, mostly 1s (twice the limit)", gen: "matrix.assign(400, vector<char>(400, '1')); for (int i = 0; i < 400; ++i) matrix[rnd(0, 399)][rnd(0, 399)] = '0';" },
  },
});
