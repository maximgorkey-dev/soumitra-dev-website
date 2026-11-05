import { study } from "./leet-light.js";

export const lc1000 = study({
  number: 1000,
  title: "Minimum Cost to Merge Stones",
  slug: "minimum-cost-to-merge-stones",
  difficulty: "H",
  pattern: "F4",
  topic: "F4 · Interval DP",
  see: 312,
  themes: ["Interval DP", "Pile counting", "Feasibility by arithmetic"],
  blurb: "dp[i][j] is the cheapest way to squeeze stones[i..j] down to as few piles as possible. Split off a prefix that becomes exactly one pile (its length steps by K − 1), and when the whole range can become one pile, pay its sum once for the final merge.",
  statement: [
    "Piles of stones stand in a row; stones[i] is the size of pile i. One move merges exactly K consecutive piles into a single pile, and costs the total number of stones in them.",
    "Return the minimum total cost to end with one pile, or −1 if that is impossible. n ≤ 30, 2 ≤ K ≤ 30. Examples: [3, 2, 4, 1] with K = 2 gives 20; [3, 2, 4, 1] with K = 3 gives −1; [3, 5, 1, 2, 6] with K = 3 gives 25.",
  ],
  concepts: [
    "Feasibility by counting: each move removes exactly K − 1 piles, so n piles reach 1 only if (n − 1) is divisible by (K − 1).",
    "Interval DP: every pile that ever exists is made of a contiguous range of the original stones, so subproblems are ranges [i..j].",
    "The right cell meaning: \"reduce [i..j] to the fewest piles possible\". That number is forced, 1 + (j − i) mod (K − 1), so the cell does not need a pile count.",
    "Splitting at the first final pile: the leftmost pile of the result is some prefix [i..mid] merged to one pile, which forces (mid − i) to be a multiple of K − 1.",
    "Cost of the last merge: whenever a range collapses to one pile, the final move costs the range's sum regardless of how it got there. Prefix sums give it in O(1).",
  ],
  hints: [
    "First decide when the answer is −1. How many piles does each move remove?",
    "Think about the very last merge of the whole row. It combines K piles, each of which came from a contiguous block. What does that suggest as a subproblem?",
    "A natural cell is dp[i][j][p]: cheapest way to turn [i..j] into p piles. Write its transitions.",
    "Notice that for a given range, only one pile count is ever useful: the smallest reachable one. Drop the p dimension.",
    "The last merge of a range that becomes one pile always costs sum(i..j). Add it once, outside the min.",
  ],
  brute: [
    "Simulate: at each step try every window of K consecutive piles to merge, recurse, keep the cheapest. With n = 30 and K = 2 that is 29 × 28 × … choices, about 29! orders.",
    "Many orders produce the same intermediate row of piles, and more importantly each final pile depends only on its own block of original stones. Once you see that piles are blocks, the state becomes a range plus a pile count, O(n² × K) states, and then the pile count turns out to be determined by the range length.",
  ],
  invariant: "dp[i][j] is the minimum cost to merge stones[i..j] into exactly 1 + (j − i) mod (K − 1) piles, the fewest it can ever reach. When (j − i) is a multiple of K − 1, that is one pile.",
  traps: [
    "Skipping the feasibility check: without it, dp[0][n − 1] holds the cost of reaching several piles and is returned as if it were one.",
    "Letting mid take every value i..j − 1: a prefix whose length is not 1 mod (K − 1) cannot be a single pile, so it mixes in impossible splits and can produce answers that are too small.",
    "Adding the range sum on every cell: the sum is paid only when the range collapses to one pile, which is when (j − i) is a multiple of K − 1.",
    "Thinking K = 2 is the general case: with K = 2 every range can become one pile, so the pile-count subtlety never shows up. Test with K = 3.",
    "Recomputing range sums inside the triple loop: O(n⁴). Use prefix sums.",
  ],
  followUps: [
    "The 3D version is easier to derive in an interview: dp[i][j][p] for p piles, dp[i][j][1] = dp[i][j][K] + sum(i..j), dp[i][j][p] = min over mid of dp[i][mid][1] + dp[mid + 1][j][p − 1]. Mention it first, then compress.",
    "K = 2 is the classic \"merge adjacent piles\" problem, and the Knuth optimisation brings it to O(n²) because the best split point is monotone.",
    "If any K piles may be merged (not only adjacent ones): greedy with a min-heap, merging the K smallest, after padding with zero piles so that (n − 1) is divisible by (K − 1), as in Huffman coding.",
    "Return the merge order: store the best mid per cell and replay recursively.",
    "Circular row: duplicate the array to length 2n and take the best range of length n.",
  ],
  explanation: [
    { h: "When it is possible at all" },
    "Each merge turns K piles into 1, so it removes K − 1 piles. Going from n piles to 1 needs (n − 1) / (K − 1) moves, so (n − 1) must be a multiple of K − 1. Otherwise return −1.",
    { h: "What the table means" },
    "Every pile at any moment is the union of a contiguous block of the original stones, because merges only combine neighbours. So the subproblems are ranges.",
    "dp[i][j] is the cheapest way to reduce the range stones[i..j] to as few piles as possible. Each merge cuts the count by K − 1, so starting from len = j − i + 1 piles the fewest reachable is 1 + (len − 1) mod (K − 1). Ranges of length 1, K, 2K − 1, … can become a single pile; shorter or misaligned ranges stop at 2, 3, … piles.",
    { h: "Base cases" },
    "A single pile needs no moves: dp[i][i] = 0. Any range shorter than K also costs 0, because no merge fits inside it; the loop below gives that automatically.",
    { h: "Filling one cell" },
    {
      list: [
        "Look at the leftmost pile of the final result for [i..j]. It is some prefix [i..mid] merged down to exactly one pile, so (mid − i) is a multiple of K − 1. So mid runs i, i + K − 1, i + 2(K − 1), … below j.",
        "The rest, [mid + 1..j], is reduced to its own fewest piles, which is exactly the number needed to make the counts add up. That is dp[mid + 1][j].",
        "If the whole range can become one pile, the split gives K piles, and one more merge combines them for sum(i..j). That cost does not depend on mid, so add it after the min.",
      ],
    },
    { code: "dp[i][j] = min over mid = i, i+K-1, i+2(K-1), ... < j of  dp[i][mid] + dp[mid+1][j]\nif (j - i) % (K - 1) == 0:  dp[i][j] += sum(stones[i..j])\nanswer = dp[0][n-1]  (after checking (n - 1) % (K - 1) == 0)" },
    { h: "A worked example: [3, 5, 1, 2, 6], K = 3" },
    {
      table: {
        head: ["i \\ j", "0 (3)", "1 (5)", "2 (1)", "3 (2)", "4 (6)"],
        rows: [
          ["0", 0, 0, 9, 8, "**25**"],
          ["1", "", 0, 0, 8, 8],
          ["2", "", "", 0, 0, 9],
          ["3", "", "", "", 0, 0],
          ["4", "", "", "", "", 0],
        ],
        caption: "dp[i][j]: cheapest reduction of stones[i..j] to its fewest piles. Lengths 1, 3 and 5 end in one pile; lengths 2 and 4 end in two. The answer is dp[0][4] = 25.",
      },
    },
    "dp[1][3] = 8: the range [5, 1, 2] has length 3, so it can become one pile with one merge costing 5 + 1 + 2 = 8. dp[0][3] = 8: [3, 5, 1, 2] can only get down to two piles. Either keep 3 alone and merge [5, 1, 2] (0 + 8), or merge [3, 5, 1] and keep 2 (9 + 0). The cheaper is 8.",
    "dp[0][4]: mid can be 0 or 2. With mid = 0, pile 3 stays alone and [5, 1, 2, 6] goes down to two piles for dp[1][4] = 8, giving three piles 3, 8, 6. With mid = 2, it is 9 + dp[3][4] = 9. Take 8, then the final merge adds 3 + 5 + 1 + 2 + 6 = 17, total 25.",
    { h: "Fill order and memory" },
    "A cell reads only shorter ranges, so fill by increasing length (or i from right to left, j from left to right). There are O(n²) cells, each with about n / (K − 1) splits: O(n³ / K) time and O(n²) space.",
    { tip: "Signal: repeatedly combine neighbours with a cost equal to the combined size. Ranges are the states; ask which counts of pieces a range can actually reach." },
  ],
  analysis: {
    time: "O(n³ / K)",
    space: "O(n²)",
    notes: ["The feasibility test is O(1) and must come first.", "Prefix sums make each range sum O(1)."],
  },
  solution: `class Solution {
public:
    int mergeStones(vector<int>& stones, int k) {
        int n = stones.size();
        // Each merge removes k-1 piles, so n piles reach 1 only if
        // (n-1) is a multiple of (k-1).
        if ((n - 1) % (k - 1) != 0) return -1;

        vector<int> pre(n + 1, 0);   // pre[i] = stones[0] + ... + stones[i-1]
        for (int i = 0; i < n; ++i) pre[i + 1] = pre[i] + stones[i];

        // dp[i][j]: cheapest way to reduce stones[i..j] to its fewest
        // reachable piles, 1 + (j-i) % (k-1). Single piles cost 0.
        vector<vector<int>> dp(n, vector<int>(n, 0));

        for (int len = 2; len <= n; ++len) {
            for (int i = 0; i + len - 1 < n; ++i) {
                int j = i + len - 1;
                int best = INT_MAX;
                // The leftmost final pile is the prefix [i..mid] merged to one
                // pile, so mid - i must be a multiple of k-1.
                for (int mid = i; mid < j; mid += k - 1)
                    best = min(best, dp[i][mid] + dp[mid + 1][j]);
                // If the range can become a single pile, the split leaves k
                // piles and one last merge combines them for the range's sum.
                if ((j - i) % (k - 1) == 0) best += pre[j + 1] - pre[i];
                dp[i][j] = best;
            }
        }
        return dp[0][n - 1];
    }
};
`,
});
