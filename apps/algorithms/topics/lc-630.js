import { light } from "./leet-light.js";

export const lc630 = light({
  number: 630,
  title: "Course Schedule III",
  slug: "course-schedule-iii",
  difficulty: "H",
  pattern: "D2",
  topic: "D2 · Greedy with a heap and regret",
  themes: ["Heap", "Sort by deadline", "Regret"],
  blurb: "Take courses in deadline order; when the total time breaks a deadline, drop the longest course taken so far. A max-heap makes the regret O(log n).",
  statement: [
    "Each course is [duration, lastDay]: it takes duration consecutive days and must finish by lastDay. You start on day 1 and take one course at a time.",
    "Return the largest number of courses you can take. Up to 10⁴ courses, values up to 10⁴.",
  ],
  hints: [
    "If you have chosen a set of courses, in which order should you take them?",
    "By deadline. So process courses by deadline and decide which to keep.",
    "When adding a course pushes past its deadline, something must go. Which one hurts least?",
    "The longest one taken so far: the count stays the same and the total time drops the most.",
  ],
  brute: "Try every subset in deadline order: O(2ⁿ · n). A DP over (course, time) is O(n · maxDay).",
  invariant: "After processing courses by deadline, the heap holds a largest feasible set among them, and among those sets it has the smallest total duration.",
  traps: [
    "Sorting by duration: a short course with a far deadline does not need to be taken early.",
    "Skipping the new course when it does not fit: push it first, then pop the longest; the one popped may be an earlier, longer course.",
    "Using a min-heap: you want to drop the longest course.",
  ],
  followUps: [
    "Return which courses to take.",
    "Courses have values: maximise the total value (knapsack-like DP).",
    "The same regret pattern: 871 Refuelling Stops, 1642 Furthest Building.",
  ],
  explanation: [
    "Any feasible set can be taken in deadline order (an exchange argument), so scan courses by lastDay and keep a running total of days used.",
    "Add each course: push its duration on a max-heap and add it to the total. If the total now exceeds this course's deadline, pop the longest duration. The count is unchanged, the total is as small as it can be, and every course still in the heap meets its deadline, since deadlines are non-decreasing and the total only fell.",
    "The answer is the heap size at the end.",
    { tip: "Signal: take as many as possible under a running budget. Take greedily, and when the budget breaks, undo the worst choice using a heap." },
  ],
  analysis: {
    time: "O(n log n)",
    space: "O(n)",
    notes: ["The total fits in int: at most 10⁴ · 10⁴ = 10⁸."],
  },
  tests: {
    fn: "scheduleCourse",
    args: [{ type: "vector<vector<int>>", name: "courses" }],
    starter: `class Solution {
public:
    int scheduleCourse(vector<vector<int>>& courses) {

    }
};`,
    reference: `class Solution {
public:
    int scheduleCourse(vector<vector<int>>& courses) {
        sort(courses.begin(), courses.end(), [](const vector<int>& a, const vector<int>& b) {
            return a[1] < b[1];
        });
        priority_queue<int> taken;
        int total = 0;
        for (auto& c : courses) {
            taken.push(c[0]);
            total += c[0];
            if (total > c[1]) { total -= taken.top(); taken.pop(); }  // drop the longest
        }
        return taken.size();
    }
};`,
    brute: `class Solution {
public:
    // Every subset, taken in deadline order: O(2^n * n).
    int scheduleCourse(vector<vector<int>>& courses) {
        sort(courses.begin(), courses.end(), [](const vector<int>& a, const vector<int>& b) {
            return a[1] < b[1];
        });
        int n = courses.size(), best = 0;
        for (int mask = 0; mask < (1 << n); ++mask) {
            int day = 0;
            bool ok = true;
            for (int i = 0; i < n && ok; ++i)
                if (mask >> i & 1) { day += courses[i][0]; ok = day <= courses[i][1]; }
            if (ok) best = max(best, __builtin_popcount(mask));
        }
        return best;
    }
};`,
    cases: [
      { name: "example", args: ["{{100, 200}, {200, 1300}, {1000, 1250}, {2000, 3200}}"] },
      { name: "example 2", args: ["{{1, 2}}"] },
      { name: "example 3", args: ["{{3, 2}, {4, 3}}"] },
      { name: "drop the long one", args: ["{{5, 5}, {4, 6}, {2, 6}}"] },
    ],
    random: { count: 300, gen: "{ int lt_n = rnd(1, 10); courses.clear(); for (int i = 0; i < lt_n; ++i) courses.push_back({rnd(1, 6), rnd(1, 20)}); }" },
    stress: { label: "10⁴ courses", gen: "{ courses.clear(); for (int i = 0; i < 10000; ++i) courses.push_back({rnd(1, 10000), rnd(1, 10000)}); }" },
  },
});
