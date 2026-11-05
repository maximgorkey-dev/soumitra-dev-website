import { study } from "./leet-light.js";

export const lc834 = study({
  number: 834,
  title: "Sum of Distances in Tree",
  slug: "sum-of-distances-in-tree",
  difficulty: "H",
  pattern: "F6",
  topic: "F6 · Tree DP, with rerooting",
  themes: ["Rerooting", "Subtree sizes", "Two passes"],
  blurb: "Compute the answer for one root with a post-order pass (subtree sizes and distance sums). Then move the root across each edge: the child's side gets one step closer and everyone else one step farther, so ans[child] = ans[parent] − size[child] + (n − size[child]).",
  statement: [
    "An undirected tree has n nodes labelled 0..n − 1. For every node i, return the sum of the distances (edge counts) from i to every other node.",
    "n up to 3 · 10⁴. Example: n = 6 with edges 0–1, 0–2, 2–3, 2–4, 2–5 gives [8, 12, 6, 10, 10, 10].",
  ],
  concepts: [
    "Rooting an undirected tree: pick node 0 as root to get parents and subtrees.",
    "Subtree aggregates: size[v] (nodes in v's subtree) and down[v] (sum of distances from v to its subtree), from children in post-order: down[v] = Σ (down[c] + size[c]).",
    "Rerooting: moving the root from parent p to child c changes every distance by exactly ±1, so the new total follows from the old one in O(1).",
    "Two passes: bottom up for the root's answer and the sizes, top down for everyone else.",
    "Iterative traversal: a path-shaped tree of 3 · 10⁴ nodes is deep, so a BFS order processed forwards and backwards avoids deep recursion.",
  ],
  hints: [
    "Computing one node's answer with a BFS is O(n). Doing that for every node is O(n²). Find what changes between neighbours.",
    "Suppose you know the answer at p. Move to its child c. Which nodes get closer, and which get farther?",
    "The nodes in c's subtree each get one step closer; all others get one step farther. How many of each?",
    "So you need subtree sizes, and one full answer to start from. Get both with a single post-order pass from node 0.",
  ],
  brute: [
    "Run a BFS from every node and add up the distances: n BFS runs of O(n), about 9 × 10⁸ steps at n = 3 · 10⁴, too slow.",
    "Neighbouring nodes share almost all their distances; only the side of the edge changes. Rerooting along each edge reuses the parent's total and costs O(1) per node, so O(n) in all.",
  ],
  invariant: "After the first pass, size[v] is the number of nodes in v's subtree (rooted at 0) and ans[0] is the true answer for node 0. In the second pass, ans[v] is final once its parent's ans is final.",
  traps: [
    "Getting the reroot formula backwards: the child's subtree (size[c] nodes) gets closer, so subtract size[c]; the rest (n − size[c] nodes) gets farther, so add n − size[c].",
    "Recursion depth on a path-shaped tree with n = 3 · 10⁴: often fine, but iterative order is safer.",
    "Revisiting the parent through the undirected edge: track the parent (or a visited flag) when building the order.",
    "Integer range: a path's sum of distances is about n² / 2 = 4.5 × 10⁸, which fits in int; larger n needs 64-bit.",
  ],
  followUps: [
    "Rerooting in general: any aggregate where moving the root across an edge changes the total by a formula in the child's subtree data. Common examples: minimum height trees (310), count of reachable nodes with edge weights, and \"best root\" questions.",
    "Weighted edges: the change across an edge of weight w is −w × size[c] + w × (n − size[c]).",
    "Sum of distances only to marked nodes: replace size with the number of marked nodes in the subtree.",
    "Find the node with the smallest sum (the tree median): the centroid-like node where no side has more than n / 2 nodes.",
    "Sum over all pairs of distances: each edge contributes size[c] × (n − size[c]); one pass, no rerooting.",
  ],
  explanation: [
    { h: "First pass: one root, done properly" },
    "Root the tree at 0. For each node v define size[v], the number of nodes in its subtree, and down[v], the sum of distances from v to the nodes of its subtree. In post-order: size[v] = 1 + Σ size[c], and down[v] = Σ (down[c] + size[c]), because every node in c's subtree is one edge farther from v than from c.",
    "The answer at the root is down[0], since its subtree is everything.",
    { h: "Second pass: moving the root" },
    {
      list: [
        "Move from parent p to child c across one edge.",
        "The size[c] nodes in c's subtree are each one step closer to c than to p: subtract size[c].",
        "The other n − size[c] nodes are each one step farther: add n − size[c].",
      ],
    },
    { code: "pass 1 (children before parents):  size[v] = 1 + sum size[c];  down[v] = sum (down[c] + size[c])\nans[0] = down[0]\npass 2 (parents before children):  ans[c] = ans[p] - size[c] + (n - size[c])" },
    { h: "A worked example: edges 0–1, 0–2, 2–3, 2–4, 2–5" },
    {
      table: {
        head: ["node", "parent", "size", "down (to own subtree)", "ans"],
        rows: [
          [0, "–", 6, 8, "**8**"],
          [1, 0, 1, 0, "8 − 1 + 5 = 12"],
          [2, 0, 4, 3, "8 − 4 + 2 = 6"],
          [3, 2, 1, 0, "6 − 1 + 5 = 10"],
          [4, 2, 1, 0, "6 − 1 + 5 = 10"],
          [5, 2, 1, 0, "6 − 1 + 5 = 10"],
        ],
        caption: "Pass 1 fills size and down; ans[0] = down[0] = 8. Pass 2 reroots each child from its parent.",
      },
    },
    "down[2] = 3 because 3, 4 and 5 are each one edge away. down[0] = (down[1] + 1) + (down[2] + 4) = 1 + 7 = 8. Moving the root from 0 to 2 brings its 4-node subtree one step closer and pushes nodes 0 and 1 one step away: 8 − 4 + 2 = 6.",
    { h: "Order and memory" },
    "A BFS from 0 lists every node after its parent. Walk that list backwards for pass 1 and forwards for pass 2: O(n) time and O(n) space, with no recursion.",
    { tip: "Signal: \"for every node, the answer if it were the root\". Solve one root, then find the O(1) change across an edge." },
  ],
  analysis: {
    time: "O(n)",
    space: "O(n)",
    notes: ["Two linear passes over a BFS order."],
  },
  solution: `class Solution {
public:
    vector<int> sumOfDistancesInTree(int n, vector<vector<int>>& edges) {
        vector<vector<int>> adj(n);
        for (auto& e : edges) {
            adj[e[0]].push_back(e[1]);
            adj[e[1]].push_back(e[0]);
        }

        // BFS from 0: every node appears after its parent.
        vector<int> order, parent(n, -1);
        order.reserve(n);
        order.push_back(0);
        parent[0] = 0;
        for (size_t k = 0; k < order.size(); ++k) {
            int u = order[k];
            for (int v : adj[u])
                if (parent[v] == -1) { parent[v] = u; order.push_back(v); }
        }

        // Pass 1, children before parents:
        //   size[v] = nodes in v's subtree, down[v] = sum of distances from v
        //   to its subtree (each node below c is one edge farther from v).
        vector<int> size(n, 1), down(n, 0);
        for (int k = n - 1; k > 0; --k) {
            int v = order[k], p = parent[v];
            size[p] += size[v];
            down[p] += down[v] + size[v];
        }

        // Pass 2, parents before children: moving the root from p to v brings
        // v's subtree one step closer and pushes the other n - size[v] nodes
        // one step away.
        vector<int> ans(n);
        ans[0] = down[0];
        for (int k = 1; k < n; ++k) {
            int v = order[k], p = parent[v];
            ans[v] = ans[p] - size[v] + (n - size[v]);
        }
        return ans;
    }
};
`,
});
