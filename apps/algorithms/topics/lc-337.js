import { study } from "./leet-light.js";

export const lc337 = study({
  number: 337,
  title: "House Robber III",
  slug: "house-robber-iii",
  difficulty: "M",
  pattern: "F6",
  topic: "F6 · Tree DP, with rerooting",
  see: 198,
  themes: ["Take or skip on a tree", "Return a pair", "Post-order"],
  blurb: "198's take/skip pair, moved onto a tree. Each node returns (best if robbed, best if not). Robbing a node forces both children to be skipped; skipping it lets each child choose freely.",
  statement: [
    "Houses form a binary tree, node values are the money inside. Robbing two directly linked houses (a parent and its child) sets off the alarm. Return the most money you can rob.",
    "Up to 10⁴ nodes, values up to 10⁴. Example: [3, 4, 5, 1, 3, null, 1] gives 9 (rob 4 and 5).",
  ],
  concepts: [
    "Take-or-skip states (198): the only thing a parent needs to know about a child's subtree is the best total with the child robbed and with it not robbed.",
    "Returning a pair from recursion: computing both values in one call avoids re-solving grandchildren.",
    "Post-order: a node's pair depends only on its children's pairs.",
    "Why the obvious memo is slower: memoising best(node) and recursing to grandchildren works, but needs a hash map and touches each node several times; the pair does it in one pass.",
  ],
  hints: [
    "At the root you either rob it or not. What does each choice force on the children?",
    "If the root is robbed, its children cannot be, but grandchildren can. If not, each child is free.",
    "Rather than recurse to grandchildren, have each call return two numbers: best with this node robbed, best without.",
    "Combine: rob = val + left.skip + right.skip; skip = max(left) + max(right).",
  ],
  brute: [
    "Try every subset of nodes with no parent-child pair: exponential, about 1.6ⁿ on a path-shaped tree.",
    "The plain recursion best(v) = max(v + best of grandchildren, best of children) calls each grandchild from two places, and that doubling compounds down the tree. Returning both states per node makes each node computed once: O(n).",
  ],
  invariant: "dfs(v) returns (rob, skip): rob is the best total in v's subtree with v robbed, and skip is the best total in v's subtree with v not robbed.",
  traps: [
    "Level-by-level greedy (all even depths or all odd depths): [4, 1, null, 2, null, 3] (a chain 4 → 1 → 2 → 3) is best as 4 + 3 = 7, which mixes depths 0 and 3.",
    "Forcing children to be robbed when the parent is skipped: skipping the parent allows either choice per child, so take max(child.rob, child.skip).",
    "Recursing to grandchildren without memo: exponential on deep trees.",
    "Returning only max(rob, skip): the parent loses the information it needs.",
  ],
  followUps: [
    "Return the chosen houses: store each node's pair, then walk down from the root choosing rob or skip, and force skip on the children of robbed nodes.",
    "General trees: the same pair, summing over all children.",
    "Maximum independent set on a general graph is NP-hard; trees (and graphs of small treewidth) are what make this easy.",
    "Minimum vertex cover on a tree: the complement of a maximum-weight independent set, or the same two-state DP with a min.",
    "Binary Tree Cameras (968) needs three states, because covering depends on neighbours in both directions.",
  ],
  explanation: [
    { h: "The states" },
    "For each node v, rob(v) is the best total from v's subtree if v is robbed, and skip(v) the best if v is left alone. The parent needs exactly these two numbers, because its own choice only constrains whether v may be robbed.",
    { h: "Base case" },
    "An empty child has nothing to rob: (0, 0).",
    { h: "One node's step" },
    {
      list: [
        "Robbing v forbids robbing either child: rob(v) = v.val + skip(left) + skip(right).",
        "Skipping v leaves each child free to do whatever is best: skip(v) = max(rob(left), skip(left)) + max(rob(right), skip(right)).",
      ],
    },
    { code: "dfs(null) = (0, 0)\ndfs(v): (lr, ls) = dfs(v.left); (rr, rs) = dfs(v.right)\n        rob  = v.val + ls + rs\n        skip = max(lr, ls) + max(rr, rs)\nanswer = max of dfs(root)" },
    { h: "A worked example: [3, 4, 5, 1, 3, null, 1]" },
    "The root 3 has children 4 and 5; 4 has children 1 and 3; 5 has a right child 1.",
    {
      table: {
        head: ["node", "children", "rob (robbed)", "skip (not robbed)"],
        rows: [
          ["1 (under 4)", "none", 1, 0],
          ["3 (under 4)", "none", 3, 0],
          ["1 (under 5)", "none", 1, 0],
          [4, "1, 3", "4 + 0 + 0 = 4", "1 + 3 = 4"],
          [5, "1", "5 + 0 = 5", "1"],
          ["3 (root)", "4, 5", "3 + 4 + 1 = 8", "max(4, 4) + max(5, 1) = **9**"],
        ],
        caption: "Each node's pair from its children's pairs. The answer is max(8, 9) = 9.",
      },
    },
    "Robbing the root gives 8: the root, plus skip(4) = 4 (its children 1 and 3) and skip(5) = 1 (its child 1). Skipping the root lets 4 and 5 be robbed: 4 + 5 = 9, which wins.",
    { h: "Order and memory" },
    "One post-order pass: O(n) time and O(h) recursion stack.",
    { tip: "Signal: choose nodes with no parent-child pair. Each node returns (taken, not taken)." },
  ],
  analysis: {
    time: "O(n)",
    space: "O(h)",
    notes: ["No hash map needed: the pair carries everything the parent uses."],
  },
  solution: `class Solution {
    // Returns {best with node robbed, best with node not robbed}.
    pair<int, int> dfs(TreeNode* node) {
        if (!node) return {0, 0};
        auto [lRob, lSkip] = dfs(node->left);
        auto [rRob, rSkip] = dfs(node->right);
        // Robbed: both children must be left alone.
        int take = node->val + lSkip + rSkip;
        // Not robbed: each child independently takes its better option.
        int skip = max(lRob, lSkip) + max(rRob, rSkip);
        return {take, skip};
    }

public:
    int rob(TreeNode* root) {
        auto [r, s] = dfs(root);
        return max(r, s);
    }
};
`,
});
