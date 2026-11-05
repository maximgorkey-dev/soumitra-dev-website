import { study } from "./leet-light.js";

export const lc968 = study({
  number: 968,
  title: "Binary Tree Cameras",
  slug: "binary-tree-cameras",
  difficulty: "H",
  pattern: "F6",
  topic: "F6 · Tree DP, with rerooting",
  see: 337,
  themes: ["Three states", "Greedy from the leaves", "Covering"],
  blurb: "A camera covers its node, its parent and its children. Work bottom up with three states per node: needs cover, has a camera, covered without one. A leaf never needs a camera itself; its parent does. Place a camera exactly when a child is uncovered.",
  statement: [
    "Cameras can be installed on the nodes of a binary tree; a camera covers its own node, its parent and its immediate children. Return the fewest cameras that cover every node.",
    "Up to 1000 nodes. Examples: a root with one child that has two children needs 1 camera (on the middle node); a chain of five nodes needs 2.",
  ],
  concepts: [
    "Covering on a tree: each node must be within distance 1 of a camera, a dominating set. On general graphs this is hard; on trees it is greedy or a small DP.",
    "Three states, because the parent's camera can cover a child: uncovered (waiting for the parent), camera here, covered by a child.",
    "Exchange argument for the greedy: a camera on a leaf covers only the leaf and its parent; moving it to the parent covers at least those and more. So leaves never get cameras.",
    "Post-order with a status code: each node decides from its children's statuses alone.",
    "The root has no parent: if it ends uncovered, it needs its own camera.",
  ],
  hints: [
    "Look at a leaf. Should it ever hold a camera?",
    "No: its parent covers the leaf and more. So where does the first camera go?",
    "Process bottom up. What does a node need to know about each child?",
    "Whether the child is uncovered (and so needs this node to have a camera), has a camera (so this node is covered), or is covered without one.",
    "What happens at the root if it is still uncovered?",
  ],
  brute: [
    "Try every subset of nodes as camera positions and check coverage: 2ⁿ subsets, hopeless at n = 1000.",
    "A DP with three states per node (min cameras for each status) is a correct O(n) solution. The greedy is the same DP after noticing that \"camera here only if a child needs it\" is always optimal, so it never needs to compare options.",
  ],
  invariant: "When dfs(v) returns, v's whole subtree except possibly v itself is covered with the fewest cameras, and the return value says whether v is uncovered (0), has a camera (1), or is covered by a child (2).",
  traps: [
    "Treating an empty child as uncovered: then every leaf would demand a camera on itself. An empty child must count as covered (2), so leaves report \"uncovered\" and push the camera to their parent.",
    "Forgetting the root: if the root reports uncovered, no parent will fix it; add one camera.",
    "Checking \"child has a camera\" before \"child is uncovered\": a node with one uncovered child and one camera child must still place a camera.",
    "Greedy top-down from the root: in a chain of three nodes, a camera on the root still leaves the bottom node uncovered and forces a second camera, while one camera on the middle node covers all three.",
  ],
  followUps: [
    "Prove the greedy: in some optimal placement, no leaf has a camera (move it to the parent). Then the deepest uncovered nodes force cameras on their parents, and induction finishes it.",
    "The min-cost DP version (different camera costs per node): three states, min over child combinations; greedy no longer works.",
    "Cameras with range 2 or k: states become the distance to the nearest camera below and the distance still needed from above, still O(n × k).",
    "Minimum vertex cover (every edge has a chosen endpoint): two states per node, a similar bottom-up greedy (take the parent of every uncovered leaf edge).",
    "General graphs: dominating set is NP-hard; trees are what make it linear.",
  ],
  explanation: [
    { h: "The three states" },
    "Each node reports one of three statuses to its parent: 0, not covered (it needs the parent to have a camera); 1, it has a camera (so the parent is covered); 2, covered by one of its own children, without a camera.",
    { h: "Base case" },
    "An empty child reports 2. It needs nothing and offers nothing, so it must not force a camera. As a result a leaf, whose children are both empty, reports 0: uncovered, waiting for its parent.",
    { h: "One node's step" },
    {
      list: [
        "If any child is 0, this node must hold a camera, the only way left to cover that child. Count it and report 1.",
        "Otherwise, if any child is 1, this node is covered by that child's camera. Report 2.",
        "Otherwise (both children 2), nobody covers this node yet. Report 0 and let the parent take care of it.",
      ],
    },
    "Why waiting is right: leaving the node to its parent is never worse, because a camera at the parent covers this node and also the parent and its other neighbours, while a camera here would cover only this node and the already covered children.",
    { code: "dfs(null) = 2\ndfs(v): a = dfs(v.left); b = dfs(v.right)\n        if a == 0 or b == 0: cameras++; return 1\n        if a == 1 or b == 1: return 2\n        return 0\nanswer = cameras + (dfs(root) == 0 ? 1 : 0)" },
    { h: "A worked example: a chain of five nodes, A → B → C → D → E" },
    {
      table: {
        head: ["node", "child's status", "decision", "status", "cameras"],
        rows: [
          ["E (leaf)", "none (2, 2)", "nobody covers it yet", 0, 0],
          ["D", "E is 0", "camera here", 1, 1],
          ["C", "D is 1", "covered by D", 2, 1],
          ["B", "C is 2", "nobody covers it yet", 0, 1],
          ["A (root)", "B is 0", "camera here", 1, "**2**"],
        ],
        caption: "Post-order from the bottom of the chain. The root ends with a camera, so no extra is needed. The answer is 2.",
      },
    },
    "The camera at D covers C, D and E. C is covered, so B has only covered children and nobody covering it, so it reports 0 and A takes a camera, covering A and B. If the chain had four nodes, B would be the root reporting 0, and the root rule would add its camera.",
    { h: "Order and memory" },
    "One post-order pass: O(n) time and O(h) stack.",
    { tip: "Signal: cover a tree where each choice affects neighbours. Decide bottom up; push choices as high as possible, and treat the root specially." },
  ],
  analysis: {
    time: "O(n)",
    space: "O(h)",
    notes: ["The three-state min DP gives the same answer and generalises to weighted cameras."],
  },
  solution: `class Solution {
    // Status of a node after its subtree is handled:
    //   0 = not covered (needs a camera on the parent)
    //   1 = has a camera
    //   2 = covered by a child's camera, no camera here
    enum { NEEDS = 0, CAMERA = 1, COVERED = 2 };
    int cameras = 0;

    int dfs(TreeNode* node) {
        // An empty child needs nothing and must not force a camera.
        if (!node) return COVERED;
        int a = dfs(node->left), b = dfs(node->right);
        // A child that is not covered can only be covered from here.
        if (a == NEEDS || b == NEEDS) { ++cameras; return CAMERA; }
        // A child's camera covers this node.
        if (a == CAMERA || b == CAMERA) return COVERED;
        // Leave this node to the parent, whose camera would cover more.
        return NEEDS;
    }

public:
    int minCameraCover(TreeNode* root) {
        cameras = 0;
        // The root has no parent to cover it.
        if (dfs(root) == NEEDS) ++cameras;
        return cameras;
    }
};
`,
});
