import { study } from "./leet-light.js";

export const lc376 = study({
  number: 376,
  title: "Wiggle Subsequence",
  slug: "wiggle-subsequence",
  difficulty: "M",
  pattern: "F1",
  topic: "F1 · State-machine DP",
  themes: ["Alternation", "Two states"],
  blurb: "Two states: the longest wiggle ending with a rise, and ending with a fall. A rise extends the best ending in a fall, and vice versa.",
  statement: [
    "A wiggle sequence has differences that strictly alternate in sign (zero differences are not allowed). Return the length of the longest wiggle subsequence of nums.",
    "Up to 1000 elements; the follow-up asks for O(n).",
  ],
  concepts: [
    "State-machine DP where the state is the sign of the last step (up or down).",
    "Only the last element of each state matters, so one pass with two counters is enough.",
    "Greedy view: the answer is the number of turning points, with plateaus ignored, plus one.",
  ],
  traps: [
    "Counting equal neighbours as a change of direction: zero differences are ignored.",
    "Returning 0 for a single element: one element is a wiggle of length 1.",
  ],
  followUps: [
    "Return the subsequence itself.",
    "978 Longest Turbulent Subarray: the same with contiguous elements.",
  ],
  explanation: [
    "Let up be the longest wiggle subsequence so far whose last step rises, and down the longest whose last step falls. When nums[i] > nums[i − 1], a rise can extend any sequence ending in a fall: up = down + 1. When nums[i] < nums[i − 1], down = up + 1. Equal values change nothing.",
    "This works with just the latest element because the best sequence of each kind can always swap its last element for nums[i − 1] without getting shorter.",
    { tip: "Signal: alternating up and down. Keep one state per sign of the last step." },
  ],
  analysis: { time: "O(n)", space: "O(1)" },
  solution: `class Solution {
public:
    int wiggleMaxLength(vector<int>& nums) {
        // up:   longest wiggle subsequence so far whose last step goes up.
        // down: longest whose last step goes down.
        // A single element counts as both (length 1).
        int up = 1, down = 1;
        for (size_t i = 1; i < nums.size(); ++i) {
            if (nums[i] > nums[i - 1]) up = down + 1;       // a rise extends a sequence ending in a fall
            else if (nums[i] < nums[i - 1]) down = up + 1;  // a fall extends one ending in a rise
            // equal neighbours: no step, nothing changes
        }
        return max(up, down);
    }
};
`,
});
