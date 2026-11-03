import { light } from "./leet-light.js";

export const lc2208 = light({
  number: 2208,
  title: "Minimum Operations to Halve Array Sum",
  slug: "minimum-operations-to-halve-array-sum",
  difficulty: "M",
  pattern: "D2",
  topic: "D2 · Greedy with a heap and regret",
  themes: ["Heap", "Greedy"],
  blurb: "Always halve the current largest value: it removes the most from the sum. A max-heap of doubles, and at most n operations.",
  statement: [
    "In one operation, pick any element of nums and replace it with exactly half of itself (it may become fractional, and may be picked again).",
    "Return the fewest operations that reduce the sum to at most half of the original. Up to 10⁵ elements, values up to 10⁷.",
  ],
  hints: [
    "Halving x removes x / 2 from the sum. Which x removes the most?",
    "The largest one, and after halving it, the largest may be a different element.",
    "A max-heap. Why are at most n operations ever needed?",
  ],
  brute: "Iterative deepening over which element to halve: O(nⁿ), since the answer is at most n.",
  invariant: "After j operations, the amount removed is the most that any j operations can remove.",
  traps: [
    "Using integer halving: the values must stay exact halves; use double.",
    "Halving each element once and stopping: the largest may need halving twice.",
    "Comparing with > instead of ≥ half: reaching exactly half is enough.",
  ],
  followUps: [
    "Prove the bound: halving every element once removes exactly half, so the answer is at most n.",
    "Remove a third instead of a half: same greedy.",
    "Integer floors: 1962 Remove Stones to Minimize the Total.",
  ],
  explanation: [
    "Each operation removes half of the chosen value, so the best single move is always the largest value. Greedy stays optimal over many moves: the amounts removed are the largest available at each step, and swapping any choice for the current largest never removes less.",
    "Keep a max-heap of doubles. Pop the top, add half of it to the removed total, push the half back. Stop once the removed total reaches half the original sum.",
    { tip: "Signal: shrink a sum fastest with repeated partial operations. Always act on the current largest, using a max-heap." },
  ],
  analysis: {
    time: "O(n log n)",
    space: "O(n)",
    notes: ["At most n operations: halving every element once removes exactly half."],
  },
  tests: {
    fn: "halveArray",
    args: [{ type: "vector<int>", name: "nums" }],
    starter: `class Solution {
public:
    int halveArray(vector<int>& nums) {

    }
};`,
    reference: `class Solution {
public:
    int halveArray(vector<int>& nums) {
        priority_queue<double> heap(nums.begin(), nums.end());
        double half = accumulate(nums.begin(), nums.end(), 0.0) / 2, removed = 0;
        int ops = 0;
        while (removed < half) {
            double x = heap.top() / 2;
            heap.pop();
            removed += x;
            heap.push(x);
            ++ops;
        }
        return ops;
    }
};`,
    brute: `class Solution {
public:
    // Iterative deepening over every choice, with values scaled to stay exact: O(n^n).
    bool go(vector<long long>& v, int depth, long long removed, long long target) {
        if (removed >= target) return true;
        if (depth == 0) return false;
        for (auto& x : v) {
            long long h = x / 2;
            x -= h;
            bool ok = go(v, depth - 1, removed + h, target);
            x += h;
            if (ok) return true;
        }
        return false;
    }
    int halveArray(vector<int>& nums) {
        int n = nums.size();
        vector<long long> v;
        long long sum = 0;
        for (int x : nums) { v.push_back((long long)x << (n + 1)); sum += v.back(); }
        for (int d = 0; ; ++d) if (go(v, d, 0, sum / 2)) return d;
    }
};`,
    cases: [
      { name: "example", args: ["{5, 19, 8, 1}"] },
      { name: "example 2", args: ["{3, 8, 20}"] },
      { name: "one element", args: ["{1}"] },
      { name: "one big value twice", args: ["{100, 1, 1}"] },
      { name: "all equal", args: ["{4, 4, 4, 4}"] },
    ],
    random: { count: 300, gen: "nums = rnd_vec(rnd(1, 5), 1, 30);" },
    stress: { label: "10⁵ elements", gen: "nums = rnd_vec(100000, 1, 10000000);" },
  },
});
