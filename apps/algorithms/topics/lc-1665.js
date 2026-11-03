import { light } from "./leet-light.js";

export const lc1665 = light({
  number: 1665,
  title: "Minimum Initial Energy to Finish Tasks",
  slug: "minimum-initial-energy-to-finish-tasks",
  difficulty: "H",
  pattern: "C5",
  topic: "C5 · Exchange argument",
  see: 179,
  themes: ["Custom sort", "Greedy"],
  blurb: "Do tasks in decreasing order of minimum − actual: an exchange argument on two adjacent tasks gives the sort key, and the required energy then falls out of one backward pass.",
  statement: [
    "Each task is a pair [actual, minimum]: starting it needs at least minimum energy, and finishing it spends actual energy (actual ≤ minimum). You may do the tasks in any order.",
    "Return the least initial energy that lets you finish every task. Up to 10⁵ tasks, values up to 10⁴.",
  ],
  hints: [
    "n! orders is hopeless. Compare just two adjacent tasks: when is doing A before B better?",
    "The slack of a task is minimum − actual: the energy it leaves unused but needed to start.",
    "Doing the larger-slack task first is never worse. Sort by slack descending.",
    "Compute the answer backwards: the energy needed before the last task is its minimum; before the one before it, max(need + actual, minimum).",
  ],
  brute: "Try every order and compute the energy each needs: O(n! · n).",
  invariant: "Processing tasks from the last one done to the first, need is the least energy that finishes the suffix: need = max(need + actual, minimum).",
  traps: [
    "Sorting by minimum alone, or by actual alone: [1, 10] and [9, 10] in either single-key order can give the wrong answer.",
    "Simulating forwards and adding a deficit each time works, but it is easy to double count; the backward recurrence is cleaner.",
    "Sorting the wrong way: the backward pass sees tasks in increasing slack.",
  ],
  followUps: [
    "Binary search the initial energy and simulate in the sorted order: O(n log n · log S), a good check.",
    "Tasks also give energy back (actual may be negative): split into gaining and losing tasks first.",
    "Prove the exchange: swapping an adjacent inversion never increases the requirement.",
  ],
  explanation: [
    "Take two adjacent tasks A then B, with energy E on arrival. The order works if E ≥ mA and E − aA ≥ mB, so E ≥ max(mA, aA + mB). The other order needs E ≥ max(mB, aB + mA). If mA − aA ≥ mB − aB, then aA + mB ≤ aB + mA, and both terms of the first max are at most aB + mA, so A first is never worse. The larger slack goes first.",
    "With the order fixed, walk it backwards. Before the last task you need its minimum. Before any earlier task you need enough to pay its actual and still have what the rest requires, and at least its own minimum: need = max(need + actual, minimum).",
    "Sorting by slack ascending and folding from the front is exactly that backward walk.",
    { tip: "Signal: \"in what order\" with a cost that depends on what came before. Compare two adjacent items; the comparison is the sort key." },
  ],
  analysis: {
    time: "O(n log n)",
    space: "O(1) beyond the sort",
    notes: ["The total fits in int: at most 10⁵ · 10⁴ = 10⁹."],
  },
  tests: {
    fn: "minimumEffort",
    args: [{ type: "vector<vector<int>>", name: "tasks" }],
    starter: `class Solution {
public:
    int minimumEffort(vector<vector<int>>& tasks) {

    }
};`,
    reference: `class Solution {
public:
    int minimumEffort(vector<vector<int>>& tasks) {
        sort(tasks.begin(), tasks.end(), [](const vector<int>& a, const vector<int>& b) {
            return a[1] - a[0] < b[1] - b[0];  // smallest slack is done last
        });
        int need = 0;
        for (auto& t : tasks) need = max(need + t[0], t[1]);
        return need;
    }
};`,
    brute: `class Solution {
public:
    // Every order, each costed backwards: O(n! * n).
    int minimumEffort(vector<vector<int>>& tasks) {
        vector<int> idx(tasks.size());
        iota(idx.begin(), idx.end(), 0);
        int best = INT_MAX;
        do {
            int need = 0;
            for (int i = (int)idx.size() - 1; i >= 0; --i)
                need = max(need + tasks[idx[i]][0], tasks[idx[i]][1]);
            best = min(best, need);
        } while (next_permutation(idx.begin(), idx.end()));
        return best;
    }
};`,
    cases: [
      { name: "example", args: ["{{1, 2}, {2, 4}, {4, 8}}"] },
      { name: "example 2", args: ["{{1, 3}, {2, 4}, {10, 11}, {10, 12}, {8, 9}}"] },
      { name: "example 3", args: ["{{1, 7}, {2, 8}, {3, 9}, {4, 10}, {5, 11}, {6, 12}}"] },
      { name: "one task", args: ["{{5, 5}}"] },
      { name: "single key fails", args: ["{{1, 10}, {9, 10}}"] },
    ],
    random: { count: 300, gen: "{ int lt_n = rnd(1, 7); tasks.clear(); for (int i = 0; i < lt_n; ++i) { int lt_a = rnd(1, 9); tasks.push_back({lt_a, lt_a + rnd(0, 9)}); } }" },
    stress: { label: "10⁵ tasks", gen: "{ tasks.clear(); for (int i = 0; i < 100000; ++i) { int lt_a = rnd(1, 10000); tasks.push_back({lt_a, rnd(lt_a, 10000)}); } }" },
  },
});
