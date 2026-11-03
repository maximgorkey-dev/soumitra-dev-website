import { light } from "./leet-light.js";

export const lc765 = light({
  number: 765,
  title: "Couples Holding Hands",
  slug: "couples-holding-hands",
  difficulty: "H",
  pattern: "C7",
  topic: "C7 · Permutation cycles",
  see: 3551,
  themes: ["Greedy", "Union-find"],
  blurb: "Fix the seat pairs left to right: if a person's partner is not beside them, swap the partner in. Each swap closes one couple, and the count is couples minus cycles.",
  statement: [
    "2n people sit in a row of 2n seats; seats 2i and 2i + 1 form a pair. People 2k and 2k + 1 are a couple. A swap exchanges any two people.",
    "Return the least number of swaps that seats every couple side by side in some pair. n ≤ 30.",
  ],
  hints: [
    "The partner of person x is x ^ 1.",
    "Go through the seat pairs in order. If the second seat is not the partner of the first, some swap must fix it eventually. Is swapping the partner in ever a mistake?",
    "Build a graph whose nodes are seat pairs and whose edges join the two pairs holding each couple. What is the answer in terms of its components?",
  ],
  brute: "Breadth-first search over seatings, one swap per edge: O((2n)! · n²).",
  invariant: "After handling seat pair i, pairs 0..i each hold a couple, and the swaps so far equal the number of couples placed by a swap.",
  traps: [
    "Searching for the partner with a linear scan is fine at n = 30, but keep a position array if the follow-up raises n.",
    "Forgetting to update the position of the person swapped out.",
    "Answering \"number of misplaced couples\": a cycle of k seat pairs needs k − 1 swaps, not k.",
  ],
  followUps: [
    "Prove the greedy is optimal: one swap can merge or split cycles by at most one.",
    "Count with union-find over couples: answer = n − components.",
    "Couples may sit in any two adjacent seats, not only the fixed pairs.",
  ],
  explanation: [
    "Treat each seat pair as a node, and join the two nodes that hold the two members of each couple. Every node has degree two, so the graph is a set of cycles. A cycle through k seat pairs needs exactly k − 1 swaps, and any single swap increases the number of cycles by at most one, so the answer is n minus the number of cycles.",
    "The greedy achieves it without building the graph. For each seat pair, if the partner of the first person is not in the second seat, swap the partner in. That seats one couple for good and shortens its cycle by one, and the last pair of every cycle fixes itself for free.",
    "A position array makes each swap O(1).",
    { tip: "Signal: minimum swaps to put things where they belong. Count cycles, or fix positions greedily one swap at a time." },
  ],
  analysis: {
    time: "O(n)",
    space: "O(n)",
    notes: ["The answer is at most n − 1."],
  },
  tests: {
    fn: "minSwapsCouples",
    args: [{ type: "vector<int>", name: "row" }],
    starter: `class Solution {
public:
    int minSwapsCouples(vector<int>& row) {

    }
};`,
    reference: `class Solution {
public:
    int minSwapsCouples(vector<int>& row) {
        int m = row.size(), swaps = 0;
        vector<int> pos(m);
        for (int i = 0; i < m; ++i) pos[row[i]] = i;
        for (int i = 0; i < m; i += 2) {
            int partner = row[i] ^ 1;
            if (row[i + 1] == partner) continue;
            int j = pos[partner];
            pos[row[i + 1]] = j;
            swap(row[i + 1], row[j]);
            pos[partner] = i + 1;
            ++swaps;
        }
        return swaps;
    }
};`,
    brute: `class Solution {
public:
    // Breadth-first search over seatings: O((2n)! * n^2).
    int minSwapsCouples(vector<int>& row) {
        int m = row.size();
        auto done = [&](const vector<int>& r) {
            for (int i = 0; i < m; i += 2) if ((r[i] ^ 1) != r[i + 1]) return false;
            return true;
        };
        map<vector<int>, int> dist{{row, 0}};
        queue<vector<int>> q;
        q.push(row);
        while (!q.empty()) {
            auto r = q.front(); q.pop();
            int d = dist[r];
            if (done(r)) return d;
            for (int i = 0; i < m; ++i)
                for (int j = i + 1; j < m; ++j) {
                    swap(r[i], r[j]);
                    if (!dist.count(r)) { dist[r] = d + 1; q.push(r); }
                    swap(r[i], r[j]);
                }
        }
        return -1;
    }
};`,
    cases: [
      { name: "example", args: ["{0, 2, 1, 3}"] },
      { name: "example 2", args: ["{3, 2, 0, 1}"] },
      { name: "one couple", args: ["{1, 0}"] },
      { name: "one long cycle", args: ["{0, 2, 3, 4, 5, 6, 7, 1}"] },
      { name: "two cycles", args: ["{0, 3, 1, 2, 4, 7, 5, 6}"] },
    ],
    random: { count: 300, gen: "{ int lt_m = 2 * rnd(1, 3); row.resize(lt_m); iota(row.begin(), row.end(), 0); for (int i = lt_m - 1; i > 0; --i) swap(row[i], row[rnd(0, i)]); }" },
    stress: { label: "30 couples", gen: "{ row.resize(60); iota(row.begin(), row.end(), 0); for (int i = 59; i > 0; --i) swap(row[i], row[rnd(0, i)]); }" },
  },
});
