import { study } from "./leet-light.js";

export const lc241 = study({
  number: 241,
  title: "Different Ways to Add Parentheses",
  slug: "different-ways-to-add-parentheses",
  difficulty: "M",
  pattern: "F4",
  topic: "F4 · Interval DP",
  see: 312,
  themes: ["Interval DP", "Split at the last operator", "Catalan growth"],
  blurb: "Every full parenthesisation has a last operator applied. Splitting there gives a left and a right sub-expression, and their value lists combine pairwise. ways[l][r] holds every value the operands l..r can produce.",
  statement: [
    "An expression contains non-negative integers and the operators +, − and ×, with no spaces or parentheses. Return every value it can take over all ways of fully parenthesising it, one entry per way (duplicates kept), in any order.",
    "Up to 20 characters. Example: `2*3-4*5` gives [−34, −14, −10, −10, 10]: (2 × (3 − (4 × 5))) = −34, ((2 × 3) − (4 × 5)) = −14, ((2 × (3 − 4)) × 5) = −10, (2 × ((3 − 4) × 5)) = −10, (((2 × 3) − 4) × 5) = 10.",
  ],
  concepts: [
    "Split at the last operation: in any parenthesisation one operator is applied last, and everything to its left and right forms independent sub-expressions.",
    "Interval DP over operands: the sub-expression from operand l to operand r has its own list of possible values, independent of what surrounds it.",
    "Combining lists: for a split at operator k, every left value pairs with every right value, so the count multiplies.",
    "Catalan numbers: with m operators there are C(m) parenthesisations, 1, 1, 2, 5, 14, 42, …, so the output itself grows exponentially and no method can be polynomial in general.",
    "Tokenising first: parse numbers and operators into two arrays so the DP works on indices, not string slices.",
  ],
  hints: [
    "Pick the operator that is evaluated last. What can you say about the two sides?",
    "Each side is a smaller expression, and you need all of its values. That is the same problem, recursively.",
    "The same sub-expression (say operands 1..3) is reached from many outer splits. Memoise by operand range.",
    "Results must keep duplicates (one per way), so store lists, not sets.",
  ],
  brute: [
    "Generate every parenthesised string and evaluate each. There are C(m) of them and each takes O(m) to build and evaluate, so O(m × C(m)), with nothing shared.",
    "Plain recursion on the last operator is already much better, but it recomputes inner ranges many times: operands 1..2 are solved again for every outer split containing them. Memoising by (l, r) means each range's list is built once, and the remaining cost is just the unavoidable list products.",
  ],
  invariant: "ways[l][r] lists the value of operands l..r under every full parenthesisation of that sub-expression, one entry per parenthesisation.",
  traps: [
    "Splitting the string at characters and re-parsing numbers each time: multi-digit numbers like 11 get split, and the work balloons. Tokenise once.",
    "Deduplicating results with a set: the problem wants one entry per parenthesisation, so −10 must appear twice in the example.",
    "Treating a lone number as needing an operator: a range with one operand returns just that number, which is the base case.",
    "Applying the wrong operator: the split between operand k and k + 1 uses ops[k]. An off-by-one here silently gives wrong values.",
  ],
  followUps: [
    "Only the count of ways: that is the Catalan number C(m), computed by the same split recurrence on counts alone.",
    "Only the maximum (or minimum) value: keep max and min per range, since subtraction and multiplication by negatives can swap them. O(m³).",
    "Target value: count parenthesisations that evaluate to a target with a map from value to count per range; useful when values repeat a lot.",
    "Boolean version (count ways to parenthesise to true): keep (true count, false count) per range, combine per operator. A well-known interview variant.",
    "Add division: watch for division by zero and integer truncation rules.",
  ],
  explanation: [
    { h: "Tokens" },
    "Parse the expression into operands nums[0..m] and operators ops[0..m − 1], where ops[k] sits between nums[k] and nums[k + 1]. `2*3-4*5` becomes nums = [2, 3, 4, 5] and ops = [×, −, ×].",
    { h: "What the table means" },
    "ways[l][r] is the list of values the sub-expression nums[l] ops[l] … nums[r] can take, one per way to parenthesise it. The surrounding operators cannot change those values, which is what makes the range a valid subproblem.",
    { h: "Base cases" },
    "A single operand has one way: ways[i][i] = [nums[i]].",
    { h: "Filling one cell" },
    {
      list: [
        "Choose the operator applied last, ops[k] for some k between l and r − 1.",
        "The left side is operands l..k and the right side is k + 1..r, each fully parenthesised on its own.",
        "Every pairing of a left value a and a right value b gives one way: a ops[k] b. Append them all.",
      ],
    },
    { code: "ways[i][i] = [nums[i]]\nways[l][r] = concat over k in l..r-1 of  [a op_k b  for a in ways[l][k], b in ways[k+1][r]]" },
    { h: "A worked example: 2 × 3 − 4 × 5" },
    {
      table: {
        head: ["range", "operands", "values", "where they come from"],
        rows: [
          ["0..1", "2 × 3", "6", "one split"],
          ["1..2", "3 − 4", "−1", "one split"],
          ["2..3", "4 × 5", "20", "one split"],
          ["0..2", "2 × 3 − 4", "−2, 2", "2 × (−1); then 6 − 4"],
          ["1..3", "3 − 4 × 5", "−17, −5", "3 − 20; then (−1) × 5"],
          ["0..3", "all", "**−34, −10, −14, −10, 10**", "2 × [−17, −5]; 6 − 20; [−2, 2] × 5"],
        ],
        caption: "Each range's list, built from shorter ranges. The full range has C(3) = 5 values.",
      },
    },
    "Range 0..3 splits three ways. Last operator the first ×: 2 times each value of 3 − 4 × 5, giving −34 and −10. Last operator −: (2 × 3) − (4 × 5) = −14. Last operator the second ×: each value of 2 × 3 − 4, times 5, giving −10 and 10. The two −10s come from different parenthesisations and both stay.",
    { h: "Fill order and memory" },
    "Fill by increasing range length, or recurse with memo on (l, r). There are O(m²) ranges; the work is dominated by the list products, which add up to the size of all lists, growing like the Catalan numbers. For 20 characters, m ≤ 10, C(10) = 16796, which is small.",
    { tip: "Signal: \"all ways to group\" or \"all ways to apply operations in some order\". Split at the last operation; subranges are independent." },
  ],
  analysis: {
    time: "Proportional to the total size of all ranges' lists, Catalan in the number of operators",
    space: "Same order as the time (the lists are stored)",
    notes: ["With memo, each range is built once; without it, inner ranges are rebuilt for every outer split."],
  },
  solution: `class Solution {
public:
    vector<int> diffWaysToCompute(string expression) {
        // Tokenise: operands in nums, operators in ops, with ops[k] between
        // nums[k] and nums[k+1].
        vector<int> nums;
        vector<char> ops;
        int cur = 0;
        for (char ch : expression) {
            if (isdigit(static_cast<unsigned char>(ch))) {
                cur = cur * 10 + (ch - '0');
            } else {
                nums.push_back(cur);
                cur = 0;
                ops.push_back(ch);
            }
        }
        nums.push_back(cur);
        int m = nums.size();

        // ways[l][r]: every value of operands l..r, one per parenthesisation.
        vector<vector<vector<int>>> ways(m, vector<vector<int>>(m));
        for (int i = 0; i < m; ++i) ways[i][i] = {nums[i]};

        for (int len = 2; len <= m; ++len) {
            for (int l = 0; l + len - 1 < m; ++l) {
                int r = l + len - 1;
                // ops[k] is the operator applied last; the two sides are
                // independent sub-expressions.
                for (int k = l; k < r; ++k)
                    for (int a : ways[l][k])
                        for (int b : ways[k + 1][r])
                            ways[l][r].push_back(ops[k] == '+' ? a + b
                                               : ops[k] == '-' ? a - b
                                                               : a * b);
            }
        }
        return ways[0][m - 1];
    }
};
`,
});
