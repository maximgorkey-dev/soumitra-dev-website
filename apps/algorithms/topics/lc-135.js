import { light } from "./leet-light.js";

export const lc135 = light({
  number: 135,
  title: "Candy",
  slug: "candy",
  difficulty: "H",
  pattern: "D3",
  topic: "D3 · Two passes",
  themes: ["Two passes", "Local constraints"],
  blurb: "Satisfy the left-neighbour rule in a forward pass and the right-neighbour rule in a backward pass, taking the maximum of the two at each child.",
  statement: [
    "Children stand in a line with ratings. Each gets at least one candy, and a child with a higher rating than a neighbour must get more candy than that neighbour.",
    "Return the least total candy. Up to 2 · 10⁴ children.",
  ],
  hints: [
    "Handle only the rule with the left neighbour first. What is the least candy for each child?",
    "Now only the right neighbour, scanning from the right.",
    "Each child needs both, so take the maximum. Is that still minimal?",
  ],
  brute: "Start everyone at 1 and repeatedly fix any violated neighbour pair until nothing changes: O(n²).",
  invariant: "After the forward pass, left[i] is the length of the strictly increasing run ending at i; after the backward pass, right[i] is the length of the strictly decreasing run starting at i.",
  traps: [
    "Equal ratings impose nothing: neighbours with the same rating may get different amounts.",
    "Adding the two passes instead of taking the maximum.",
    "A single pass with a counter for descending runs exists, but the peak correction is easy to get wrong; the two passes are safer in an interview.",
  ],
  followUps: [
    "O(1) extra space: count up-runs and down-runs, giving the peak the longer one.",
    "Children sit in a circle.",
    "Same two-pass shape: 238 Product Except Self, 42 Trapping Rain Water.",
  ],
  explanation: [
    "Split the rule in two. The left rule alone is met by left[i] = left[i − 1] + 1 when the rating rises, else 1, and no smaller values work. The right rule alone is the mirror, scanning backwards.",
    "Each child must satisfy both, so it needs at least max(left[i], right[i]). That amount also works: if the rating rises from i − 1 to i, then left[i] > left[i − 1], and right does not constrain this pair the wrong way.",
    "The answer is the sum of the maxima.",
    { tip: "Signal: each element depends on both neighbours in one direction each. Do a left pass and a right pass, then combine." },
  ],
  analysis: {
    time: "O(n)",
    space: "O(n), or O(1) with the run-counting version",
    notes: [],
  },
  tests: {
    fn: "candy",
    args: [{ type: "vector<int>", name: "ratings" }],
    starter: `class Solution {
public:
    int candy(vector<int>& ratings) {

    }
};`,
    reference: `class Solution {
public:
    int candy(vector<int>& ratings) {
        int n = ratings.size();
        vector<int> c(n, 1);
        for (int i = 1; i < n; ++i)
            if (ratings[i] > ratings[i - 1]) c[i] = c[i - 1] + 1;
        for (int i = n - 2; i >= 0; --i)
            if (ratings[i] > ratings[i + 1]) c[i] = max(c[i], c[i + 1] + 1);
        return accumulate(c.begin(), c.end(), 0);
    }
};`,
    brute: `class Solution {
public:
    // Fix violations until stable: O(n^2).
    int candy(vector<int>& ratings) {
        int n = ratings.size();
        vector<int> c(n, 1);
        for (bool changed = true; changed;) {
            changed = false;
            for (int i = 0; i + 1 < n; ++i) {
                if (ratings[i] > ratings[i + 1] && c[i] <= c[i + 1]) { c[i] = c[i + 1] + 1; changed = true; }
                if (ratings[i + 1] > ratings[i] && c[i + 1] <= c[i]) { c[i + 1] = c[i] + 1; changed = true; }
            }
        }
        return accumulate(c.begin(), c.end(), 0);
    }
};`,
    cases: [
      { name: "example", args: ["{1, 0, 2}"] },
      { name: "example 2", args: ["{1, 2, 2}"] },
      { name: "one child", args: ["{5}"] },
      { name: "peak", args: ["{1, 2, 3, 4, 3, 2, 1, 0}"] },
      { name: "all equal", args: ["{3, 3, 3}"] },
    ],
    random: { count: 400, gen: "ratings = rnd_vec(rnd(1, 12), 0, 5);" },
    stress: { label: "2 · 10⁴ children", gen: "ratings = rnd_vec(20000, 0, 20000);" },
  },
});
