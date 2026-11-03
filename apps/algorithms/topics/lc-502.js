import { light } from "./leet-light.js";

export const lc502 = light({
  number: 502,
  title: "IPO",
  slug: "ipo",
  difficulty: "H",
  pattern: "D2",
  topic: "D2 · Greedy with a heap and regret",
  themes: ["Heap", "Two sorted streams"],
  blurb: "Sort projects by capital; each round, push every project you can now afford onto a max-heap of profits and take the best one.",
  statement: [
    "You have w capital and may finish at most k projects. Project i needs capital[i] to start (it is not spent) and adds profits[i] to your capital when done.",
    "Return the most capital you can end with. Up to 10⁵ projects, k up to 10⁵, values up to 10⁹ in total.",
  ],
  hints: [
    "Among the projects you can afford right now, which should you do?",
    "The most profitable: capital only grows, so nothing you could afford becomes unaffordable.",
    "Keep the affordable ones in a max-heap by profit, and add newly affordable ones as w grows.",
  ],
  brute: "Each round, scan every unused project for the best affordable one: O(k · n).",
  invariant: "Before each round, the heap holds exactly the unused projects with capital ≤ w, keyed by profit.",
  traps: [
    "Stopping only after k rounds: if the heap is empty, nothing more can be done.",
    "Re-scanning all projects each round: that is the O(k · n) brute force.",
    "Thinking capital is spent: it is a threshold, not a cost.",
  ],
  followUps: [
    "Projects consume their capital: a knapsack, no longer greedy.",
    "The same two-stream shape: 1834 Single-Threaded CPU, 2402 Meeting Rooms III.",
    "k is huge: stop early when the heap empties.",
  ],
  explanation: [
    "Capital never decreases, so the set of affordable projects only grows. Picking the most profitable affordable project is never worse: it leaves you with the most capital, which can only unlock more projects.",
    "Sort projects by required capital. Each round, move every project with capital ≤ w from the sorted list into a max-heap of profits, then pop the top and add it to w. Stop after k rounds or when the heap is empty.",
    "Each project enters and leaves the heap at most once.",
    { tip: "Signal: repeatedly pick the best option among those currently unlocked, with a threshold that only grows. Sort by threshold, heap by value." },
  ],
  analysis: {
    time: "O(n log n + k log n)",
    space: "O(n)",
    notes: ["The final capital fits in int by the constraints."],
  },
  tests: {
    fn: "findMaximizedCapital",
    args: [{ type: "int", name: "k" }, { type: "int", name: "w" }, { type: "vector<int>", name: "profits" }, { type: "vector<int>", name: "capital" }],
    starter: `class Solution {
public:
    int findMaximizedCapital(int k, int w, vector<int>& profits, vector<int>& capital) {

    }
};`,
    reference: `class Solution {
public:
    int findMaximizedCapital(int k, int w, vector<int>& profits, vector<int>& capital) {
        int n = profits.size();
        vector<int> order(n);
        iota(order.begin(), order.end(), 0);
        sort(order.begin(), order.end(), [&](int a, int b) { return capital[a] < capital[b]; });
        priority_queue<int> ready;
        for (int i = 0; k > 0; --k) {
            while (i < n && capital[order[i]] <= w) ready.push(profits[order[i++]]);
            if (ready.empty()) break;
            w += ready.top();
            ready.pop();
        }
        return w;
    }
};`,
    brute: `class Solution {
public:
    // Scan for the best affordable project every round: O(k * n).
    int findMaximizedCapital(int k, int w, vector<int>& profits, vector<int>& capital) {
        int n = profits.size();
        vector<bool> used(n, false);
        while (k-- > 0) {
            int best = -1;
            for (int i = 0; i < n; ++i)
                if (!used[i] && capital[i] <= w && (best < 0 || profits[i] > profits[best])) best = i;
            if (best < 0) break;
            used[best] = true;
            w += profits[best];
        }
        return w;
    }
};`,
    cases: [
      { name: "example", args: ["2", "0", "{1, 2, 3}", "{0, 1, 1}"] },
      { name: "example 2", args: ["3", "0", "{1, 2, 3}", "{0, 1, 2}"] },
      { name: "nothing affordable", args: ["5", "0", "{10}", "{1}"] },
      { name: "k beyond projects", args: ["10", "1", "{1, 1}", "{0, 1}"] },
    ],
    random: { count: 400, gen: "{ int lt_n = rnd(1, 8); profits = rnd_vec(lt_n, 0, 9); capital = rnd_vec(lt_n, 0, 12); k = rnd(1, 10); w = rnd(0, 5); }" },
    stress: { label: "10⁵ projects", gen: "{ profits = rnd_vec(100000, 0, 10000); capital = rnd_vec(100000, 0, 1000000000); k = 100000; w = 0; capital[0] = 0; profits[0] = 10000; }" },
  },
});
