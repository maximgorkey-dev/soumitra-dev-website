import { study } from "./leet-light.js";

export const lc801 = study({
  number: 801,
  title: "Minimum Swaps To Make Sequences Increasing",
  slug: "minimum-swaps-to-make-sequences-increasing",
  difficulty: "H",
  pattern: "F1",
  topic: "F1 · State-machine DP",
  themes: ["Two states", "Swap or keep"],
  blurb: "Two states per index: swapped or not. Which transitions are legal depends on comparing the pair at i with the pair at i − 1, straight and crossed.",
  statement: [
    "Two equal-length arrays nums1 and nums2. In one operation you may swap nums1[i] with nums2[i]. Return the fewest swaps that make both arrays strictly increasing; it is always possible.",
    "Up to 10⁵ elements.",
  ],
  concepts: [
    "State-machine DP: the state at index i is whether position i is swapped.",
    "Legal transitions come from two tests: straight (a[i − 1] < a[i] and b[i − 1] < b[i]) and crossed (a[i − 1] < b[i] and b[i − 1] < a[i]).",
    "Both tests may hold at once; then either state can follow either.",
  ],
  traps: [
    "Greedy swapping when a violation appears: an earlier swap may be the cheaper fix.",
    "Treating the two tests as exclusive with if / else.",
  ],
  followUps: [
    "Non-decreasing instead of strictly increasing.",
    "Each swap has a cost: the same DP with weights.",
  ],
  explanation: [
    "keep[i] is the fewest swaps for the prefix through i with position i not swapped; swap[i] is the same with it swapped.",
    "If the straight test holds, the states can stay the same as at i − 1: keep[i] = keep[i − 1], swap[i] = swap[i − 1] + 1. If the crossed test holds, they can flip: keep[i] = swap[i − 1], swap[i] = keep[i − 1] + 1. When both hold, take the minimum of the options. Since a valid answer always exists, at least one test holds at every i.",
    { tip: "Signal: a binary choice at each position whose legality depends only on the previous position. Two states, transitions from local comparisons." },
  ],
  analysis: { time: "O(n)", space: "O(1)" },
  solution: `class Solution {
public:
    int minSwap(vector<int>& nums1, vector<int>& nums2) {
        int n = nums1.size();
        // keep: fewest swaps so far with position i left as is.
        // swap: fewest swaps so far with position i swapped.
        int keep = 0, swp = 1;

        for (int i = 1; i < n; ++i) {
            int a0 = nums1[i - 1], b0 = nums2[i - 1], a = nums1[i], b = nums2[i];
            int k = INT_MAX, s = INT_MAX;

            // Straight: both arrays already increase, so i can match i-1's choice.
            if (a0 < a && b0 < b) {
                k = min(k, keep);     // neither swapped
                s = min(s, swp + 1);  // both swapped
            }
            // Crossed: increasing if exactly one of i-1, i is swapped.
            if (a0 < b && b0 < a) {
                k = min(k, swp);       // i-1 swapped, i not
                s = min(s, keep + 1);  // i swapped, i-1 not
            }
            keep = k;
            swp = s;
        }
        return min(keep, swp);
    }
};
`,
});
