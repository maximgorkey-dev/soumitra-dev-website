import { light } from "./leet-light.js";

export const lc1944 = light({
  number: 1944,
  title: "Number of Visible People in a Queue",
  slug: "number-of-visible-people-in-a-queue",
  difficulty: "H",
  pattern: "A2",
  topic: "A2 · Monotonic stack",
  see: 84,
  themes: ["Next greater", "Visibility"],
  blurb: "Scan from the right with a decreasing stack: everyone you pop is visible, and so is the first taller person left on the stack.",
  statement: [
    "People stand in a row, heights all distinct. Person i can see person j > i if everyone strictly between them is shorter than both. For each person, count how many people to their right they can see.",
    "Up to 10⁵ people, heights up to 10⁵.",
  ],
  hints: [
    "Person i sees j exactly when everyone between is shorter than min(h[i], h[j]). Who blocks the view?",
    "Looking right from i, i sees a run of people who keep getting taller, ending at the first person taller than i.",
    "Process from right to left, keeping a stack of people not hidden from the left. What happens to the shorter ones when i arrives?",
    "Pop everyone shorter than i (i sees each of them), then i also sees the top of the stack if any. Push i.",
  ],
  brute: "For each person, walk right keeping the tallest seen so far: j is visible when h[j] exceeds everyone between, and stop after the first person taller than i. O(n²) on a decreasing queue, where nobody is ever blocked by someone taller.",
  invariant: "Before processing i, the stack holds, from top to bottom, exactly the people that someone standing at i − ½ with infinite height would see: a strictly increasing sequence of heights.",
  traps: [
    "Forgetting the +1 for the first taller person, who is visible but not popped.",
    "Counting people behind a taller person: once someone taller than i appears, i sees no one beyond.",
    "Scanning left to right: it works, but the counting is less natural.",
  ],
  followUps: [
    "Heights not distinct: equal heights block. Pop people of equal height too, and count them.",
    "496/503 Next Greater Element: the same stack, one answer per index.",
    "Count pairs that see each other in a circle (Mountain Watchmen, a classic).",
  ],
  explanation: [
    "From i, looking right, the visible people are those that are taller than everyone between: a staircase of increasing heights, stopping at the first one taller than i (who is seen, and blocks everything after).",
    "Process from right to left with a stack that is increasing from top to bottom. When i arrives, every stack entry shorter than i is visible to i, and is now hidden from everyone further left by i, so pop and count each. If the stack is not empty afterwards, its top is the first taller person, also visible. Push i.",
    "Every person is pushed and popped at most once, so the scan is O(n).",
    { tip: "A pop is the moment an element meets the one that hides it for good. Counting pops answers \"how many does each element see or beat\"." },
  ],
  analysis: {
    time: "O(n)",
    space: "O(n) for the stack",
    notes: [
      "The answer for each person is at most the stack size plus one.",
    ],
  },
  tests: {
    fn: "canSeePersonsCount",
    args: [{ type: "vector<int>", name: "heights" }],
    starter: `class Solution {
public:
    vector<int> canSeePersonsCount(vector<int>& heights) {

    }
};`,
    reference: `class Solution {
public:
    vector<int> canSeePersonsCount(vector<int>& heights) {
        int n = heights.size();
        vector<int> ans(n), st;  // heights increasing from top to bottom
        for (int i = n - 1; i >= 0; --i) {
            while (!st.empty() && st.back() < heights[i]) st.pop_back(), ++ans[i];
            if (!st.empty()) ++ans[i];  // the first taller person
            st.push_back(heights[i]);
        }
        return ans;
    }
};`,
    brute: `class Solution {
public:
    // Walk right from each person: O(n^2).
    vector<int> canSeePersonsCount(vector<int>& heights) {
        int n = heights.size();
        vector<int> ans(n);
        for (int i = 0; i < n; ++i) {
            int tallest = 0;  // tallest strictly between i and j
            for (int j = i + 1; j < n; ++j) {
                if (heights[j] > tallest) ++ans[i];
                tallest = max(tallest, heights[j]);
                if (heights[j] > heights[i]) break;
            }
        }
        return ans;
    }
};`,
    cases: [
      { name: "example", args: ["{10, 6, 8, 5, 11, 9}"] },
      { name: "example 2", args: ["{5, 1, 2, 3, 10}"] },
      { name: "one person", args: ["{7}"] },
      { name: "decreasing", args: ["{5, 4, 3, 2, 1}"] },
      { name: "increasing", args: ["{1, 2, 3, 4, 5}"] },
    ],
    random: { count: 400, gen: "{ int lt_n = rnd(1, 9); heights.resize(lt_n); iota(heights.begin(), heights.end(), 1); for (int i = lt_n - 1; i > 0; --i) swap(heights[i], heights[rnd(0, i)]); }" },
    stress: { label: "10⁵ people, decreasing", gen: "heights.resize(100000); for (int i = 0; i < 100000; ++i) heights[i] = 100000 - i;" },
  },
});
