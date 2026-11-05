import { study } from "./leet-light.js";

export const lc801 = study({
  number: 801,
  title: "Minimum Swaps To Make Sequences Increasing",
  slug: "minimum-swaps-to-make-sequences-increasing",
  difficulty: "H",
  pattern: "F1",
  topic: "F1 · State-machine DP",
  themes: ["Two states", "Swap or keep", "Local legality"],
  blurb: "Two states per index: the pair at i is left alone (keep) or swapped (swap). Whether a transition from i − 1 is legal depends only on two comparisons, straight and crossed, so each index costs O(1).",
  statement: [
    "Two arrays nums1 and nums2 of equal length. In one operation you may swap nums1[i] with nums2[i] (same index). Return the fewest swaps that make both arrays strictly increasing. The input guarantees this is possible.",
    "Up to 10⁵ elements. Example: nums1 = [1, 3, 5, 4], nums2 = [1, 2, 3, 7] gives 1 (swap index 3: nums1 = [1, 3, 5, 7], nums2 = [1, 2, 3, 4]).",
  ],
  concepts: [
    "Swap-or-keep state: each index is either swapped or not, and the only constraints are between neighbours i − 1 and i.",
    "Local legality: a pair of decisions at i − 1 and i is legal exactly when the two arrays increase at that step. There are only two kinds of check, straight (same choice) and crossed (different choice).",
    "Minimum per state: among all ways to reach \"index i swapped\", only the cheapest matters for the future.",
    "Transitions that are not exclusive: often both checks pass, and then either previous state may be used. Taking the min over every legal transition is what makes it correct.",
  ],
  hints: [
    "Whether index i must be swapped depends only on what happened at index i − 1. What do you need to remember about i − 1?",
    "Just whether it was swapped, and the cheapest cost for each case.",
    "Compare the pairs at i − 1 and i in two ways: straight (a1 < b1 and a2 < b2) and crossed (a1 < b2 and a2 < b1). Which previous states can feed which current states under each test?",
    "Straight: same choice at both indices (keep after keep, swap after swap). Crossed: opposite choices. Both may hold at once.",
  ],
  brute: [
    "Try every subset of indices to swap and check both arrays: 2ⁿ subsets, impossible at n = 10⁵.",
    "The recursion \"decide index i given the choice at i − 1\" has only 2n distinct situations (index, previous swapped or not), but without memo the same situation is reached through exponentially many prefixes. Storing the cheapest cost per (index, choice) makes it linear.",
  ],
  invariant: "After processing index i, keep is the fewest swaps among indices 0..i that make both prefixes strictly increasing with index i not swapped, and swap is the same with index i swapped (∞ if impossible).",
  traps: [
    "Using if/else between the two tests: when both straight and crossed hold, both transitions are legal and the cheaper one must win. Two independent ifs with min.",
    "Checking only nums1[i − 1] < nums1[i] and forgetting the other array, or only one of the two crossed inequalities.",
    "Greedy: swap whenever the current pair is out of order. Sometimes the cheaper fix is to swap the earlier index instead, which a left-to-right greedy has already committed to.",
    "Initialising the new keep and swap from the old ones instead of ∞: an illegal transition would then leak through.",
    "Overwriting keep before computing swap from it: compute both new values into fresh variables.",
  ],
  followUps: [
    "Why only neighbours matter: strict increase is a statement about each adjacent pair, so the choices at i − 1 and i are the only ones that interact at step i.",
    "Return which indices to swap: keep, per index, which previous state each min came from, and walk back.",
    "Allow k arrays and any permutation per index: the state becomes the permutation chosen at i, k! states and k!² checks per step.",
    "Non-decreasing instead of strictly increasing: change < to ≤ in both tests.",
    "Swapping costs c[i] instead of 1: add c[i] in the swap transitions.",
    "If the input might be impossible: return −1 when both final states are ∞.",
  ],
  explanation: [
    { h: "The states" },
    "At index i you either leave the pair (nums1[i], nums2[i]) alone or swap it. For each choice keep the fewest swaps so far: keep and swap. The future only cares about which values ended up on top at index i, and that is fully determined by this one choice.",
    { h: "Start" },
    "Index 0 has no predecessor, so both choices are legal: keep = 0, swap = 1.",
    { h: "Two tests decide the legal transitions" },
    "Let a1, a2 be nums1[i − 1], nums2[i − 1] and b1, b2 be nums1[i], nums2[i].",
    {
      list: [
        "Straight test, a1 < b1 and a2 < b2: the pairs line up as given. Then making the same choice at both indices is legal, because swapping both pairs keeps the same comparisons with the arrays exchanged. So keep can come from keep, and swap from swap + 1.",
        "Crossed test, a1 < b2 and a2 < b1: the pairs line up when exactly one of them is swapped. So keep can come from swap (only i − 1 swapped), and swap from keep + 1 (only i swapped).",
      ],
    },
    { code: "newKeep = newSwap = INF\nif straight: newKeep = min(newKeep, keep);  newSwap = min(newSwap, swap + 1)\nif crossed:  newKeep = min(newKeep, swap);  newSwap = min(newSwap, keep + 1)\nanswer = min(keep, swap) after the last index" },
    "Both tests can pass, for example when the next pair is larger than both previous values. Then the index is free to choose, and the min picks whichever history was cheaper.",
    { h: "A worked example: nums1 = [1, 3, 5, 4], nums2 = [1, 2, 3, 7]" },
    {
      table: {
        head: ["i", "pair", "straight?", "crossed?", "keep", "swap"],
        rows: [
          [0, "(1, 1)", "–", "–", 0, 1],
          [1, "(3, 2)", "yes", "yes", 0, 1],
          [2, "(5, 3)", "yes", "no (3 < 3 fails)", 0, 2],
          [3, "(4, 7)", "no (5 < 4 fails)", "yes", 2, "**1**"],
        ],
        caption: "keep and swap are the fewest swaps so far with index i left alone or swapped. The answer is min(2, 1) = 1.",
      },
    },
    "Index 2: only the straight test passes, so the choice must match index 1's. keep = 0 (neither swapped) and swap = 1 + 1 = 2 (both swapped). Index 3: only the crossed test passes, so the choice must differ from index 2's. keep = swap of index 2 = 2, while swap = keep of index 2 + 1 = 1, meaning only index 3 is swapped.",
    { h: "Fill order and memory" },
    "Each index reads only the previous two values: O(n) time, O(1) space.",
    { tip: "Signal: a binary choice per index with constraints only between neighbours. Two states, and enumerate which pairs of choices are legal." },
  ],
  analysis: {
    time: "O(n)",
    space: "O(1)",
    notes: ["Four comparisons and two mins per index."],
  },
  solution: `class Solution {
public:
    int minSwap(vector<int>& nums1, vector<int>& nums2) {
        const int INF = INT_MAX / 2;
        // keep: fewest swaps so far with index i NOT swapped.
        // swap: fewest swaps so far with index i swapped.
        int keep = 0, swp = 1;   // index 0: both choices are legal

        for (size_t i = 1; i < nums1.size(); ++i) {
            int a1 = nums1[i - 1], a2 = nums2[i - 1];
            int b1 = nums1[i],     b2 = nums2[i];
            int nk = INF, ns = INF;

            // Straight: the pairs line up as given, so the same choice at
            // i-1 and i is legal (keep after keep, swap after swap).
            if (a1 < b1 && a2 < b2) {
                nk = min(nk, keep);
                ns = min(ns, swp + 1);
            }
            // Crossed: the pairs line up when exactly one is swapped.
            // Not an else: both tests may hold, and then either history works.
            if (a1 < b2 && a2 < b1) {
                nk = min(nk, swp);       // only i-1 swapped
                ns = min(ns, keep + 1);  // only i swapped
            }
            keep = nk;
            swp = ns;
        }
        return min(keep, swp);
    }
};
`,
});
