import { light } from "./leet-light.js";

export const lc2033 = light({
  number: 2033,
  title: "Minimum Operations to Make a Uni-Value Grid",
  slug: "minimum-operations-to-make-a-uni-value-grid",
  difficulty: "M",
  pattern: "C1",
  topic: "C1 · The median lemma",
  see: 462,
  themes: ["Make the array", "Median", "Modular arithmetic"],
  blurb: "Moves of ±x keep every value's remainder mod x, so all remainders must match. Then it is 462 on the values divided by x: move everything to the median.",
  statement: [
    "In one operation you add x to, or subtract x from, any single cell of a grid. Return the fewest operations that make every cell equal, or −1 if that is impossible.",
    "Up to 10⁵ cells; values and x between 1 and 10⁴.",
  ],
  hints: [
    "What does an operation never change about a cell?",
    "Its value mod x. If two cells differ mod x, the answer is −1.",
    "Otherwise every cell is r + x · tᵢ, and the operations change the tᵢ by ±1.",
    "That is 462: move every tᵢ to the median, for Σ |vᵢ − median| / x operations.",
  ],
  brute: "Try every cell's value as the target and sum |v − t| / x: O(N²) for N cells, 10¹⁰ at the limit.",
  invariant: "All values share one remainder mod x; for targets in that residue class, the cost Σ |v − t| / x is minimised at a median.",
  traps: [
    "Forgetting the remainder check, which makes the answer −1.",
    "Using the mean instead of the median.",
    "Flattening is needed: the grid shape plays no role.",
  ],
  followUps: [
    "462: the same with steps of 1.",
    "2448: each cell has its own cost per operation, so use the weighted median.",
    "Operations may add x to a whole row at once: now it is a different problem entirely.",
  ],
  explanation: [
    "Adding or subtracting x never changes a value mod x, so if two cells have different remainders they can never meet: return −1. Otherwise every value is r + x · t for its own t, and an operation moves one t by 1.",
    "Making all ts equal with unit moves is 462: the cheapest common target is a median, costing Σ |t − median|, which equals Σ |v − median value| / x. Flatten the grid, find the median with nth_element, and sum.",
    { tip: "Signal: moves of fixed size. Check the invariant (the remainder), divide it out, and the problem becomes the plain version." },
  ],
  analysis: {
    time: "O(N) on average with nth_element, N = number of cells",
    space: "O(N) for the flattened values",
    notes: ["Sorting the values works too, at O(N log N)."],
  },
  tests: {
    fn: "minOperations",
    args: [{ type: "vector<vector<int>>", name: "grid" }, { type: "int", name: "x" }],
    starter: `class Solution {
public:
    int minOperations(vector<vector<int>>& grid, int x) {

    }
};`,
    reference: `class Solution {
public:
    int minOperations(vector<vector<int>>& grid, int x) {
        vector<int> v;
        for (auto& row : grid) v.insert(v.end(), row.begin(), row.end());
        for (int a : v)
            if ((a - v[0]) % x != 0) return -1;  // the remainder mod x never changes
        nth_element(v.begin(), v.begin() + v.size() / 2, v.end());
        int med = v[v.size() / 2];
        long long ops = 0;
        for (int a : v) ops += abs(a - med) / x;
        return ops;
    }
};`,
    brute: `class Solution {
public:
    // Every cell's value as the target: O(N^2).
    int minOperations(vector<vector<int>>& grid, int x) {
        vector<int> v;
        for (auto& row : grid) v.insert(v.end(), row.begin(), row.end());
        long long best = LLONG_MAX;
        for (int t : v) {
            long long ops = 0;
            for (int a : v) {
                if (abs(a - t) % x) return -1;
                ops += abs(a - t) / x;
            }
            best = min(best, ops);
        }
        return best;
    }
};`,
    cases: [
      { name: "example", args: ["{{2, 4}, {6, 8}}", "2"] },
      { name: "example 2", args: ["{{1, 5}, {2, 3}}", "1"] },
      { name: "impossible", args: ["{{1, 2}, {3, 4}}", "2"] },
      { name: "one cell", args: ["{{7}}", "3"] },
    ],
    random: { count: 400, gen: "{ int lt_r = rnd(1, 3), lt_c = rnd(1, 3), lt_x = rnd(1, 3); x = lt_x; grid.assign(lt_r, vector<int>(lt_c)); int lt_b = rnd(1, 3); for (auto& row : grid) for (int& a : row) a = rnd(0, 3) ? lt_b + lt_x * rnd(0, 4) : rnd(1, 12); }" },
    stress: { label: "10⁵ cells", gen: "grid.assign(100, {}); for (auto& row : grid) { row = rnd_vec(1000, 0, 2000); for (int& a : row) a = 1 + a * 5; } x = 5;" },
  },
});
