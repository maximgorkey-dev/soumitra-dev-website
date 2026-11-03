import { light } from "./leet-light.js";

export const lc406 = light({
  number: 406,
  title: "Queue Reconstruction by Height",
  slug: "queue-reconstruction-by-height",
  difficulty: "M",
  pattern: "C5",
  topic: "C5 · Exchange argument",
  see: 179,
  themes: ["Custom sort", "Greedy insertion"],
  blurb: "Sort by height descending, then k ascending, and insert each person at index k: everyone already placed is at least as tall, so k counts exactly them.",
  statement: [
    "Each person is a pair [h, k]: their height, and how many people in front of them in the queue are at least as tall. The pairs are shuffled; return the queue in order.",
    "Up to 2000 people; a valid queue always exists.",
  ],
  hints: [
    "Who is easiest to place: the tallest or the shortest?",
    "The tallest: shorter people never affect their k, so they just need k taller-or-equal people ahead.",
    "Process people from tallest to shortest. When you place someone, everyone already placed is at least as tall.",
    "So insert each person at index k. Among equal heights, smaller k first.",
  ],
  brute: "Try permutations until one satisfies every k: O(n! · n²).",
  invariant: "After inserting everyone of height ≥ h, the partial queue is valid for them, and later (shorter) insertions do not change any of their k values.",
  traps: [
    "Sorting equal heights by k descending: inserting the larger k first puts the smaller one in front of it, which breaks the larger k.",
    "Sorting ascending by height and filling empty slots also works, but the counting differs; do not mix the two methods.",
  ],
  followUps: [
    "O(n log n) with a Fenwick tree: process from shortest, place each person in the (k + 1)th empty slot, counting only equal-or-taller slots.",
    "Verify a given queue in O(n log n).",
    "Some ks may be inconsistent: detect that no valid queue exists.",
  ],
  explanation: [
    "A shorter person is invisible to everyone taller: placing them anywhere never changes a taller person's k. So build the queue from the tallest down. When person [h, k] is placed, everyone already in the queue is at least as tall, and exactly k of them must be in front, so insert at index k.",
    "For equal heights, insert the smaller k first. Two people of the same height both count each other, and inserting the smaller k later would push it in front of the one with the larger k, invalidating it.",
    "Insertion into a vector is O(n), so this is O(n²), fine at n = 2000.",
    { tip: "Signal: reconstruct an order from \"how many before me are at least X\". Insert in decreasing X so each count refers only to what is already placed." },
  ],
  analysis: {
    time: "O(n²) with vector insertion; O(n log n) with a Fenwick tree",
    space: "O(n)",
    notes: ["The answer is unique when one exists."],
  },
  tests: {
    fn: "reconstructQueue",
    args: [{ type: "vector<vector<int>>", name: "people" }],
    starter: `class Solution {
public:
    vector<vector<int>> reconstructQueue(vector<vector<int>>& people) {

    }
};`,
    reference: `class Solution {
public:
    vector<vector<int>> reconstructQueue(vector<vector<int>>& people) {
        sort(people.begin(), people.end(), [](const vector<int>& a, const vector<int>& b) {
            return a[0] != b[0] ? a[0] > b[0] : a[1] < b[1];  // tallest first, then smaller k
        });
        vector<vector<int>> q;
        for (auto& p : people) q.insert(q.begin() + p[1], p);
        return q;
    }
};`,
    brute: `class Solution {
public:
    // Every permutation until one is consistent: O(n! * n^2).
    vector<vector<int>> reconstructQueue(vector<vector<int>>& people) {
        sort(people.begin(), people.end());
        do {
            bool ok = true;
            for (size_t i = 0; i < people.size() && ok; ++i) {
                int taller = 0;
                for (size_t j = 0; j < i; ++j) taller += people[j][0] >= people[i][0];
                ok = taller == people[i][1];
            }
            if (ok) return people;
        } while (next_permutation(people.begin(), people.end()));
        return {};
    }
};`,
    cases: [
      { name: "example", args: ["{{7, 0}, {4, 4}, {7, 1}, {5, 0}, {6, 1}, {5, 2}}"] },
      { name: "example 2", args: ["{{6, 0}, {5, 0}, {4, 0}, {3, 2}, {2, 2}, {1, 4}}"] },
      { name: "one person", args: ["{{1, 0}}"] },
      { name: "equal heights", args: ["{{5, 2}, {5, 0}, {5, 1}}"] },
    ],
    random: { count: 300, gen: "{ int lt_n = rnd(1, 6); vector<int> lt_h = rnd_vec(lt_n, 1, 4); people.clear(); for (int i = 0; i < lt_n; ++i) { int lt_k = 0; for (int j = 0; j < i; ++j) lt_k += lt_h[j] >= lt_h[i]; people.push_back({lt_h[i], lt_k}); } for (int i = lt_n - 1; i > 0; --i) swap(people[i], people[rnd(0, i)]); }" },
    stress: { label: "2000 people", gen: "{ vector<int> lt_h = rnd_vec(2000, 1, 1000000); people.clear(); for (int i = 0; i < 2000; ++i) { int lt_k = 0; for (int j = 0; j < i; ++j) lt_k += lt_h[j] >= lt_h[i]; people.push_back({lt_h[i], lt_k}); } for (int i = 1999; i > 0; --i) swap(people[i], people[rnd(0, i)]); }" },
  },
});
