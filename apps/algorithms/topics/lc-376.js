import { study } from "./leet-light.js";

export const lc376 = study({
  number: 376,
  title: "Wiggle Subsequence",
  slug: "wiggle-subsequence",
  difficulty: "M",
  pattern: "F1",
  topic: "F1 · State-machine DP",
  themes: ["Alternation", "Two states", "Counting turns"],
  blurb: "Keep two lengths: the longest wiggle so far whose last step went up, and whose last step went down. A rise extends the best one that ended going down, and a fall the reverse.",
  statement: [
    "A wiggle sequence is one whose successive differences strictly alternate in sign (up, down, up, … or down, up, down, …). One element, or two different elements, also count. Equal neighbours break a wiggle.",
    "Given nums, return the length of its longest wiggle subsequence (elements kept in order, others deleted). Up to 1000 elements. Example: [1, 17, 5, 10, 13, 15, 10, 5, 16, 8] gives 7, for instance 1, 17, 5, 15, 5, 16, 8.",
  ],
  concepts: [
    "State-machine DP: what matters about a wiggle so far is only the direction of its last step, up or down.",
    "Best value per state: among wiggles ending in the same direction, the longest one dominates.",
    "The O(n²) to O(n) collapse: instead of \"ending exactly at index i\", keep \"best so far\", which never decreases and needs no inner loop.",
    "Turning points: the answer equals 1 plus the number of direction changes among nonzero differences, which is the greedy view of the same DP.",
  ],
  hints: [
    "Start with the slow DP: up[i] is the longest wiggle ending at i with a rise into i, down[i] the same with a fall. How do they depend on earlier j?",
    "up[i] = max over j < i with nums[j] < nums[i] of down[j] + 1. That is O(n²). Can you avoid scanning all j?",
    "Make the states \"best over everything seen so far\" rather than \"ending exactly here\". When nums[i] > nums[i − 1], what is the best new up?",
    "Equal neighbours change nothing. What should the base values be for a single element?",
  ],
  brute: [
    "Try every subsequence and check whether it wiggles: 2ⁿ subsequences, hopeless at n = 1000.",
    "The O(n²) DP (up[i], down[i] ending exactly at i, scanning all j < i) passes at n = 1000, but it hides the key fact: when the price rises from i − 1 to i, the best wiggle ending in a fall anywhere up to i − 1 can always be extended by a rise to nums[i]. Using that fact removes the inner loop.",
  ],
  invariant: "After processing index i, up is the length of the longest wiggle subsequence of nums[0..i] whose last difference is positive, and down is the same with a negative last difference (a single element counts as both, with length 1).",
  traps: [
    "Treating equal neighbours as a rise or a fall: with a zero difference neither state may grow. [3, 3, 3] has answer 1.",
    "Starting up and down at 0: a single element is a wiggle of length 1, so both start at 1. Otherwise [5] returns 0 and every length is off by one.",
    "Updating up from the new down in the same step: one step changes only one of the two, depending on the sign, so this cannot happen if you branch on the sign.",
    "Counting local extrema with neighbours i − 1 and i + 1: plateaus like [1, 2, 2, 1] are a turning point spread over two indices, and the naive count misses it. Compare with the last nonzero difference instead.",
  ],
  followUps: [
    "Why up = down + 1 is always valid on a rise: the best fall-ending wiggle can be chosen to end at the most recent valley, and since then the values have only risen or stayed flat up to nums[i − 1] < nums[i]. So appending nums[i] is a genuine rise.",
    "Return one longest wiggle: keep the last element of each run in the direction it is moving (the peak of each rise, the valley of each fall).",
    "Longest strictly alternating subarray (contiguous): reset a counter when the pattern breaks; much simpler.",
    "Wiggle Sort II (324) asks to rearrange into a wiggle, a different problem: median selection plus index mapping.",
    "Longest subsequence with differences alternating and at least d in size: back to an O(n log n) DP with a segment tree over values.",
  ],
  explanation: [
    { h: "The states" },
    "A wiggle can be extended by a rise only if its last step was a fall, and vice versa. So keep two lengths: up, the longest wiggle so far whose last step goes up, and down, the longest whose last step goes down.",
    "Two wiggles ending in the same direction differ only in length and their last value. The O(n) form works with lengths alone, because the most recent element can always stand in as the last value (it is at least as good an end point as any older one in the same direction).",
    { h: "Start" },
    "A single element is a wiggle of length 1 that can be followed by either direction: up = down = 1.",
    { h: "One step's transitions" },
    {
      list: [
        "nums[i] > nums[i − 1]: a rise. The best fall-ending wiggle extends by this rise: up = down + 1. down is unchanged.",
        "nums[i] < nums[i − 1]: a fall. down = up + 1. up is unchanged.",
        "nums[i] == nums[i − 1]: nothing changes.",
      ],
    },
    { code: "if nums[i] > nums[i-1]: up   = down + 1\nif nums[i] < nums[i-1]: down = up + 1\nanswer = max(up, down)" },
    "In a long rise, up = down + 1 is written several times with the same down, so it stays put. That is the DP's way of saying \"keep moving the peak to the newest, higher element\".",
    { h: "A worked example: [1, 17, 5, 10, 13, 15, 10, 5, 16, 8]" },
    {
      table: {
        head: ["i", "nums", "step", "up", "down"],
        rows: [
          [0, 1, "start", 1, 1],
          [1, 17, "rise", 2, 1],
          [2, 5, "fall", 2, 3],
          [3, 10, "rise", 4, 3],
          [4, 13, "rise", 4, 3],
          [5, 15, "rise", 4, 3],
          [6, 10, "fall", 4, 5],
          [7, 5, "fall", 4, 5],
          [8, 16, "rise", 6, 5],
          [9, 8, "fall", 6, "**7**"],
        ],
        caption: "A rise sets up = down + 1; a fall sets down = up + 1. The answer is max(6, 7) = 7.",
      },
    },
    "Indices 3 to 5 are one long rise: up stays 4 because down stays 3. Any of 10, 13 or 15 can be the peak, and taking the last (15) leaves the most room for the next fall. Indices 6 and 7 are one fall, so down stays 5. The final picture: 1, 17, 5, 15, 5, 16, 8 alternates seven times.",
    { h: "Fill order and memory" },
    "One left-to-right pass, two integers: O(n) time, O(1) space.",
    { tip: "Signal: a subsequence whose steps must alternate. Keep the best length per last-step direction; long monotone runs collapse to their last element." },
  ],
  analysis: {
    time: "O(n)",
    space: "O(1)",
    notes: ["The O(n²) \"ending exactly at i\" DP also passes for n ≤ 1000, but the O(n) form is expected."],
  },
  solution: `class Solution {
public:
    int wiggleMaxLength(vector<int>& nums) {
        // up:   longest wiggle so far whose last step goes up.
        // down: longest wiggle so far whose last step goes down.
        // A single element is a wiggle of length 1 in both senses.
        int up = 1, down = 1;
        for (size_t i = 1; i < nums.size(); ++i) {
            if (nums[i] > nums[i - 1])
                up = down + 1;     // a rise extends the best fall-ending wiggle
            else if (nums[i] < nums[i - 1])
                down = up + 1;     // a fall extends the best rise-ending wiggle
            // Equal neighbours change nothing.
        }
        return max(up, down);
    }
};

// Greedy view: 1 + number of sign changes among nonzero differences.
//   int prev = 0, count = 1;
//   for (size_t i = 1; i < nums.size(); ++i) {
//       int d = (nums[i] > nums[i-1]) - (nums[i] < nums[i-1]);   // -1, 0, +1
//       if (d != 0 && d != prev) { ++count; prev = d; }
//   }
//   return count;
`,
});
