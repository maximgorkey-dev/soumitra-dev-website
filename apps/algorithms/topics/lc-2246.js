import { study } from "./leet-light.js";

export const lc2246 = study({
  number: 2246,
  title: "Longest Path With Different Adjacent Characters",
  slug: "longest-path-with-different-adjacent-characters",
  difficulty: "H",
  pattern: "F6",
  topic: "F6 · Tree DP, with rerooting",
  see: 124,
  themes: ["Top two children", "Bend point", "Filtered edges"],
  blurb: "124's idea on a general tree with a filter: a child can extend its parent's chain only if their letters differ. Each node returns its longest valid downward chain, and the best path bending there joins its two longest valid child chains.",
  statement: [
    "A tree of n nodes is given by parent (parent[0] = −1) and a string s, with s[i] the letter on node i. Return the number of nodes on the longest path in which no two adjacent nodes have the same letter.",
    "n up to 10⁵. Example: parent = [−1, 0, 0, 1, 1, 2], s = \"abacbe\" gives 3 (the path 3 → 1 → 0, letters c, b, a).",
  ],
  concepts: [
    "Bend point (124): every path has a highest node, from which it goes down into at most two child subtrees.",
    "Top-two children: for a node with many children, the best path bending there uses its two longest valid child chains, found in one scan.",
    "Filtering edges: a child whose letter equals the node's cannot be next to it on the path. Its subtree still has its own best path, which was already recorded.",
    "Bottom-up order without recursion: n up to 10⁵ can be a chain, so process nodes in reverse BFS order.",
  ],
  hints: [
    "Solve it first ignoring the letters: it is the tree's diameter (in nodes). How do you compute that bottom up?",
    "Each node returns the longest chain going down from it; the best path bending at a node joins its two longest child chains.",
    "Now add the letter rule. Which child chains may a node use?",
    "Skip children with the same letter, but remember their subtrees were already searched for paths.",
  ],
  brute: [
    "From every node, DFS the tree along valid edges and take the longest path found: O(n²), 10¹⁰ steps at n = 10⁵.",
    "The longest path bending at a node needs only the two longest valid chains below it, and those chains are shared by every ancestor. Computing each chain once bottom up gives O(n).",
  ],
  invariant: "When node v is processed, chain[v] is the number of nodes on the longest downward path from v with all adjacent letters different, and best covers every valid path whose highest node lies in v's subtree.",
  traps: [
    "Ignoring a same-letter child's subtree entirely: its chain cannot attach to the parent, but its own best path was recorded when it was processed. Just skip it in the parent's top two.",
    "Counting edges instead of nodes: the answer counts nodes, so a single node is 1.",
    "Recursion on a chain of 10⁵ nodes can overflow the stack. Use an explicit order.",
    "Assuming parent[i] < i: the input does not promise it, so build child lists and a BFS order instead of looping i from n − 1 down to 0.",
    "Keeping only the longest child: the path bending at a node needs the top two.",
  ],
  followUps: [
    "Return the path: store each node's best child and the bend node; walk down the two best chains.",
    "Edge weights (longest weighted path, still with the letter rule): the same recurrence with weights added instead of 1.",
    "At most k distinct letters on the path, or no letter repeated: much harder; the rule is no longer local to an edge.",
    "Tree diameter in general (1245): this solution with the letter filter removed.",
    "Many queries on a static tree (longest valid path through a given node): rerooting to get the best chain going up as well as down.",
  ],
  explanation: [
    { h: "What each node computes" },
    "chain[v] is the number of nodes on the longest valid path that starts at v and goes only downward. Valid means every step goes to a child with a different letter. The best path whose highest node is v goes down two different valid children: 1 + top1 + top2, where top1 and top2 are the two longest chain values among v's valid children (0 if missing).",
    { h: "Base case" },
    "A leaf has no children: chain = 1, and the path bending there is the leaf alone, length 1.",
    { h: "One node's step" },
    {
      list: [
        "Scan the children. Skip a child c if s[c] == s[v]; it cannot be adjacent to v on the path.",
        "Keep the two largest chain[c] among the rest.",
        "Record best = max(best, 1 + top1 + top2), then set chain[v] = 1 + top1.",
      ],
    },
    { code: "for v in reverse BFS order (children before parents):\n    top1 = top2 = 0\n    for each child c with s[c] != s[v]: update top1, top2 with chain[c]\n    best     = max(best, 1 + top1 + top2)\n    chain[v] = 1 + top1" },
    { h: "A worked example: parent = [−1, 0, 0, 1, 1, 2], s = \"abacbe\"" },
    "Node 0 (a) has children 1 (b) and 2 (a). Node 1 (b) has children 3 (c) and 4 (b). Node 2 (a) has child 5 (e).",
    {
      table: {
        head: ["node", "letter", "valid children (chain)", "chain", "path bending here"],
        rows: [
          [3, "c", "none", 1, 1],
          [4, "b", "none", 1, 1],
          [5, "e", "none", 1, 1],
          [1, "b", "3 (1); 4 skipped, same letter", 2, 2],
          [2, "a", "5 (1)", 2, 2],
          [0, "a", "1 (2); 2 skipped, same letter", 3, "**3**"],
        ],
        caption: "Children before parents. The answer is the largest path bending at any node, 3.",
      },
    },
    "At node 0, child 2 has the same letter a, so its chain cannot attach. The best through 0 is 1 + 2 = 3 (nodes 0, 1, 3). Node 2's own subtree still offers 2 → 5 of length 2, recorded when node 2 was processed.",
    { h: "Order and memory" },
    "Build child lists, BFS from 0 to get an order with parents before children, then process it backwards: O(n) time and space, no recursion.",
    { tip: "Signal: longest path in a tree with a rule on adjacent nodes. Diameter DP with the rule applied when choosing which children may extend the chain." },
  ],
  analysis: {
    time: "O(n)",
    space: "O(n)",
    notes: ["Each child is looked at once, from its parent."],
  },
  solution: `class Solution {
public:
    int longestPath(vector<int>& parent, string s) {
        int n = parent.size();
        vector<vector<int>> kids(n);
        for (int i = 1; i < n; ++i) kids[parent[i]].push_back(i);

        // BFS order from the root: parents before children. Processing it
        // backwards gives children before parents without recursion.
        vector<int> order;
        order.reserve(n);
        order.push_back(0);
        for (size_t k = 0; k < order.size(); ++k)
            for (int c : kids[order[k]]) order.push_back(c);

        // chain[v]: nodes on the longest valid downward path starting at v.
        vector<int> chain(n, 1);
        int best = 1;
        for (int k = n - 1; k >= 0; --k) {
            int v = order[k];
            int top1 = 0, top2 = 0;              // two longest valid child chains
            for (int c : kids[v]) {
                if (s[c] == s[v]) continue;      // cannot be adjacent on the path
                if (chain[c] > top1) { top2 = top1; top1 = chain[c]; }
                else if (chain[c] > top2) top2 = chain[c];
            }
            best = max(best, 1 + top1 + top2);   // the path bending at v
            chain[v] = 1 + top1;                 // what v offers its parent
        }
        return best;
    }
};
`,
});
