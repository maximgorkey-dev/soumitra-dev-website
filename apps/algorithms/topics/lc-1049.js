import { study } from "./leet-light.js";

export const lc1049 = study({
  number: 1049,
  title: "Last Stone Weight II",
  slug: "last-stone-weight-ii",
  difficulty: "M",
  pattern: "F5",
  topic: "F5 · Knapsack and counting",
  see: 416,
  themes: ["Knapsack in disguise", "Signed sums", "Reachable sums"],
  blurb: "However you smash, the final stone is a sum of the weights with + and − signs, and every split into two groups can be achieved. So minimise |sum(A) − sum(B)|: find the largest reachable subset sum not above half the total.",
  statement: [
    "Stones have positive weights. Repeatedly pick any two, x ≤ y, and smash them: if x = y both vanish, otherwise one stone of weight y − x remains. At the end at most one stone is left.",
    "Return the smallest possible weight of the last stone (0 if none). Up to 30 stones, each at most 100. Example: [2, 7, 4, 1, 8, 1] gives 1.",
  ],
  concepts: [
    "Recognising a disguise: the process looks like a simulation, but its outcome depends only on which stones end up added and which subtracted.",
    "Signed sums: each smash replaces y and x with y − x, so by induction the final weight is a sum of all weights with some signs, that is, sum(A) − sum(B) for a split into groups A and B.",
    "Every split is achievable: for any split, repeatedly smash a stone from the heavier side against one from the lighter side; the result stays on the heavier side, and the final weight is |sum(A) − sum(B)|.",
    "Minimise the difference: with S = sum(B) ≤ total / 2, the result is total − 2S, so maximise S.",
    "Reachable sums (416): a boolean table over sums up to total / 2, filled with a downward loop per stone.",
  ],
  hints: [
    "Simulate a few smashes on paper. Write the remaining stone as an expression in the original weights. What do you notice?",
    "It is always a sum of the weights with plus and minus signs. Which sign patterns are possible?",
    "Any split into two groups is possible. So what are you really minimising?",
    "|sum(A) − sum(B)| = total − 2 × sum(B) when B is the lighter group. Find the largest subset sum not above total / 2.",
  ],
  brute: [
    "Simulate every smashing order: choose a pair at each step, recursing on the multiset that remains. The branching is about n² / 2 per step for n − 1 steps, far beyond 30!.",
    "Assigning a sign to each stone instead gives 2³⁰ ≈ 10⁹ patterns, still too many. But many patterns give the same subset sum, and sums are at most 30 × 100 / 2 = 1500, so tracking reachable sums is tiny.",
  ],
  invariant: "After processing the first i stones, can[s] is true exactly when some subset of those stones sums to s (for 0 ≤ s ≤ total / 2).",
  traps: [
    "Greedy smashing of the two heaviest (that is 1046, Last Stone Weight): on [2, 7, 4, 1, 8, 1] it leaves 1 by luck, but on [31, 26, 33, 21, 40] it leaves 9 while the best is 5.",
    "Looping sums upward: a stone would be used twice.",
    "Returning total − 2 × target without checking reachability: the best reachable sum may be below total / 2.",
    "Forgetting that equal smashes (x = y) are also covered: they are just a stone in each group with equal weights.",
  ],
  followUps: [
    "Prove the achievability direction in the interview: while both groups are non-empty, smash a stone from each; the survivor goes back to the heavier group's side, and the difference of group sums never changes.",
    "Return the smashing sequence: reconstruct the subset, then pair stones across the two groups as in the proof.",
    "Split into two groups with equal size and minimal difference (2035): meet in the middle by group size, since values are large there.",
    "This is 416 with a different question asked of the same table: 416 asks whether total / 2 is reachable, this asks for the largest reachable sum up to it.",
    "Bitset: b |= b << w for each stone, then scan down from total / 2 for the first set bit.",
  ],
  explanation: [
    { h: "Why this is a partition problem" },
    "Each smash of x ≤ y leaves y − x. Expand the final stone back through every smash and it becomes the original weights, each with a + or a −. Call the + stones group A and the − stones group B: the final weight is sum(A) − sum(B).",
    "Conversely, any split can be produced. Keep one stone from each group and smash them; the survivor stays with the heavier one, and sum(A) − sum(B) never changes. When one group is empty, what remains is |sum(A) − sum(B)|. So the answer is the minimum of |sum(A) − sum(B)| over all splits.",
    "With B the lighter group and S = sum(B) ≤ total / 2, that difference is total − 2S. The best split maximises S.",
    { h: "What the table means" },
    "can[s], for 0 ≤ s ≤ total / 2, is true when some subset of the stones seen so far sums to s. It starts with only can[0] true and is updated per stone with a downward loop, exactly as in 416.",
    { code: "can[0] = true\nfor each weight w:\n    for s = total/2 down to w:\n        can[s] = can[s] or can[s - w]\nS = largest s <= total/2 with can[s]\nanswer = total - 2*S" },
    { h: "A worked example: [2, 7, 4, 1, 8, 1]" },
    "total = 23, so the lighter group can sum to at most 11.",
    {
      table: {
        head: ["after", "reachable sums (≤ 11)"],
        rows: [
          ["start", "0"],
          ["2", "0, 2"],
          ["7", "0, 2, 7, 9"],
          ["4", "0, 2, 4, 6, 7, 9, **11**"],
          ["1, 8, 1", "every sum 0..11"],
        ],
        caption: "11 is reachable after the third stone (7 + 4), so S = 11 and the answer is 23 − 2 × 11 = 1.",
      },
    },
    "With B = {7, 4} and A = {2, 1, 8, 1}: sums 11 and 12. One way to smash: 8 vs 7 leaves 1; 4 vs 2 leaves 2; 2 vs 1 leaves 1; 1 vs 1 vanish; the last stone is 1, as predicted.",
    { h: "Fill order and memory" },
    "n passes over total / 2 + 1 entries: at most 30 × 1501 steps, O(total) space.",
    { tip: "Signal: a process that combines numbers by subtraction in any order. The end result is a signed sum; turn it into a subset-sum problem." },
  ],
  analysis: {
    time: "O(n × total)",
    space: "O(total)",
    notes: ["The simulation is a red herring; only the split matters."],
  },
  solution: `class Solution {
public:
    int lastStoneWeightII(vector<int>& stones) {
        // The last stone is always sum(A) - sum(B) for some split into two
        // groups, and every split is achievable. So with B the lighter group,
        // minimise total - 2 * sum(B), i.e. maximise sum(B) <= total / 2.
        int total = accumulate(stones.begin(), stones.end(), 0);
        int half = total / 2;

        // can[s]: some subset of the stones seen so far sums to exactly s.
        vector<char> can(half + 1, 0);
        can[0] = 1;
        for (int w : stones)
            for (int s = half; s >= w; --s)   // downward: each stone once
                if (can[s - w]) can[s] = 1;

        for (int s = half; s >= 0; --s)       // the heaviest lighter group
            if (can[s]) return total - 2 * s;
        return total;                          // unreachable: can[0] is true
    }
};
`,
});
