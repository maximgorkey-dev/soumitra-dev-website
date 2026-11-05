import { study } from "./leet-light.js";

export const lc124 = study({
  number: 124,
  title: "Binary Tree Maximum Path Sum",
  slug: "binary-tree-maximum-path-sum",
  difficulty: "H",
  pattern: "F6",
  topic: "F6 · Tree DP, with rerooting",
  themes: ["Return one thing, record another", "Bend point", "Clamp negatives"],
  blurb: "Every path has a single highest node where it bends. A post-order pass returns, for each node, the best downward chain starting there (one child at most), while recording the best path bending there (both children).",
  statement: [
    "A path is a sequence of distinct nodes, each adjacent to the next, using any edges of a binary tree (it need not pass through the root). Its sum is the sum of its node values, which may be negative. Return the largest sum of a non-empty path.",
    "Up to 3 · 10⁴ nodes, values in [−1000, 1000]. Example: [−10, 9, 20, null, null, 15, 7] gives 42 (15 → 20 → 7).",
  ],
  concepts: [
    "The bend point: every path has a unique node closest to the root. From there it goes down into at most two different child subtrees.",
    "Two quantities per node: what the parent can use (a chain going down from this node, one side only) differs from what is a complete answer (a path bending here, both sides).",
    "Clamping at zero: a child chain with a negative sum is better dropped, so use max(0, child gain).",
    "Post-order traversal: children are finished before their parent, so each node is O(1) work.",
    "A global best updated during the traversal, initialised to minus infinity so that all-negative trees work.",
  ],
  hints: [
    "Pick any path and look at its highest node. What does the path look like from there?",
    "It goes down the left side some distance, and down the right side some distance, either possibly zero.",
    "So for every node you want the best chain going straight down from it. How does a node's chain come from its children's?",
    "The parent can only extend a chain through one child, but the path bending at this node may use both. Return one, record the other.",
  ],
  brute: [
    "For every pair of nodes, sum the path between them (or for every node as a start, DFS the whole tree): O(n²), about 10⁹ operations at n = 3 · 10⁴ in the worst case.",
    "The waste: the best path bending at a node only needs the best downward chain on each side, and those chains are shared by every ancestor's computation. Computing each chain once, bottom up, gives O(n).",
  ],
  invariant: "gain(v) returns the largest sum of a path that starts at v and goes only downward (possibly just v). When gain(v) returns, best already accounts for every path whose highest node is in v's subtree.",
  traps: [
    "Returning node + left + right to the parent: a path cannot fork, so the parent may extend only one side. Return node + max(left, right).",
    "Not clamping child gains at 0: a negative subtree would be forced into every chain through it.",
    "Starting best at 0: a tree of all negatives, such as [−3], must return −3, not 0. Start at INT_MIN or at the root's value.",
    "Clamping the node's own value: the path is non-empty, so the bend node is always included even if negative.",
    "Deep recursion on a chain of 3 · 10⁴ nodes is usually fine, but on much larger inputs use an explicit stack.",
  ],
  followUps: [
    "Return the path itself: record the bend node and which children contributed, then follow the best chain down each side.",
    "Maximum path between two leaves only: a child that is missing cannot contribute, so a node with one child cannot be a bend point for a leaf-to-leaf path.",
    "General trees (any number of children): keep the top two child gains.",
    "Diameter of a tree (543) is the same shape with every value 1 and no negatives.",
    "Paths that must go downward only (from ancestor to descendant): no bend, just the best chain, or prefix sums with a hash map for counting paths with a given sum (437).",
  ],
  explanation: [
    { h: "The two numbers per node" },
    "gain(v) is the best sum of a chain starting at v and going down through children, one at a time. This is the only thing a parent can use, because a path through the parent can enter v's subtree along a single chain.",
    "through(v) = v.val + max(0, gain(left)) + max(0, gain(right)) is the best path whose highest node is v. Every path has exactly one highest node, so the answer is the largest through(v) over all nodes.",
    { h: "Base case" },
    "An empty child contributes 0, which is also what clamping would give, so gain(null) = 0 works.",
    { h: "One node's step" },
    {
      list: [
        "Compute l = max(0, gain(left)) and r = max(0, gain(right)), dropping sides that would lower the sum.",
        "Record best = max(best, v.val + l + r): the best path bending at v.",
        "Return v.val + max(l, r) to the parent: the best one-sided chain.",
      ],
    },
    { code: "gain(null) = 0\ngain(v): l = max(0, gain(v.left)); r = max(0, gain(v.right))\n         best = max(best, v.val + l + r)      // bend here: both sides\n         return v.val + max(l, r)             // to the parent: one side" },
    { h: "A worked example: [−10, 9, 20, null, null, 15, 7]" },
    {
      table: {
        head: ["node", "children", "gain (to the parent)", "through (bend here)", "best so far"],
        rows: [
          [9, "none", 9, 9, 9],
          [15, "none", 15, 15, 15],
          [7, "none", 7, 7, 15],
          [20, "15, 7", "20 + 15 = 35", "20 + 15 + 7 = **42**", 42],
          [-10, "9, 20", "−10 + 35 = 25", "−10 + 9 + 35 = 34", "**42**"],
        ],
        caption: "Post-order: children first. The answer is the best through value, 42, at node 20.",
      },
    },
    "Node 20 returns only 35 to its parent, choosing the 15 side, even though the path bending at 20 is worth 42. At the root, through is 34 because the −10 costs more than the left side's 9 brings, so the best path never reaches the root.",
    { h: "Order and memory" },
    "One post-order pass: O(n) time, O(h) stack for the recursion, h the tree height.",
    { tip: "Signal: best path anywhere in a tree. Return the one-sided chain upward, record the two-sided path at each node." },
  ],
  analysis: {
    time: "O(n)",
    space: "O(h)",
    notes: ["h is the height: O(log n) when balanced, O(n) for a chain."],
  },
  solution: `class Solution {
    int best = INT_MIN;   // all-negative trees must still return a value

    // Best sum of a path that starts at node and goes only downward.
    int gain(TreeNode* node) {
        if (!node) return 0;
        // Drop a side whose best chain is negative.
        int l = max(0, gain(node->left));
        int r = max(0, gain(node->right));
        // The best path whose highest node is this one uses both sides.
        best = max(best, node->val + l + r);
        // The parent can extend through only one side.
        return node->val + max(l, r);
    }

public:
    int maxPathSum(TreeNode* root) {
        best = INT_MIN;
        gain(root);
        return best;
    }
};
`,
});
