import { light } from "./leet-light.js";

export const lc899 = light({
  number: 899,
  title: "Orderly Queue",
  slug: "orderly-queue",
  difficulty: "H",
  pattern: "A6",
  topic: "A6 · Rotation",
  themes: ["Rotation", "Lemma", "Strings"],
  blurb: "With k = 1 you can only rotate: take the smallest rotation. With k ≥ 2 you can swap any adjacent pair, so the answer is the sorted string.",
  statement: [
    "In one move you take one of the first k characters of a string and append it to the end. Return the lexicographically smallest string reachable after any number of moves.",
    "Up to 1000 lowercase characters; 1 ≤ k ≤ n.",
  ],
  hints: [
    "With k = 1, what strings can you reach?",
    "Only rotations. Try all n of them.",
    "With k = 2, can you swap two adjacent characters somewhere in the string?",
    "Rotate until the pair is at the front, move the second one back, then the first, and rotate the rest around: any adjacent swap is possible, so any permutation is. The answer is sorted(s).",
  ],
  brute: "Breadth-first search over reachable strings: exponential in general. It confirms the lemma on small inputs.",
  invariant: "For k = 1 the reachable set is exactly the n rotations. For k ≥ 2 it is every permutation of s.",
  traps: [
    "Simulating moves greedily: there is no simple greedy; the lemma replaces it.",
    "Treating k ≥ 2 differently from k = 2: any k ≥ 2 includes the k = 2 moves.",
  ],
  followUps: [
    "Find the smallest rotation in O(n): Booth's algorithm or the Lyndon factorisation (Duval).",
    "Count the moves needed for k = 2 to reach sorted order.",
  ],
  explanation: [
    "If k = 1, every move is a rotation, so the reachable strings are the n rotations of s; return the smallest. Comparing all of them is O(n²), fine for n ≤ 1000.",
    "If k ≥ 2, you can swap any two adjacent characters. Rotate until they are the first two characters, append the second one, then the first, and rotate the rest back into place: the pair has been swapped. Adjacent swaps generate every permutation, so the smallest reachable string is s sorted.",
    { tip: "Signal: a strange queue or deque operation with a parameter k. Find what the operations generate; often it is \"rotations only\" for small k and \"everything\" beyond." },
  ],
  analysis: {
    time: "O(n²) for k = 1, O(n log n) for k ≥ 2",
    space: "O(n)",
    notes: ["Booth's algorithm makes the k = 1 case O(n)."],
  },
  tests: {
    fn: "orderlyQueue",
    args: [{ type: "string", name: "s" }, { type: "int", name: "k" }],
    starter: `class Solution {
public:
    string orderlyQueue(string s, int k) {

    }
};`,
    reference: `class Solution {
public:
    string orderlyQueue(string s, int k) {
        if (k >= 2) { sort(s.begin(), s.end()); return s; }  // any permutation is reachable
        string best = s;
        for (size_t r = 1; r < s.size(); ++r) best = min(best, s.substr(r) + s.substr(0, r));
        return best;
    }
};`,
    brute: `class Solution {
public:
    // Breadth-first search over every reachable string: exponential.
    string orderlyQueue(string s, int k) {
        set<string> seen{s};
        queue<string> q;
        q.push(s);
        while (!q.empty()) {
            string u = q.front();
            q.pop();
            for (int i = 0; i < k; ++i) {
                string v = u.substr(0, i) + u.substr(i + 1) + u[i];
                if (seen.insert(v).second) q.push(v);
            }
        }
        return *seen.begin();
    }
};`,
    cases: [
      { name: "example", args: ['"cba"', "1"] },
      { name: "example 2", args: ['"baaca"', "3"] },
      { name: "k = 2 sorts", args: ['"dcab"', "2"] },
      { name: "one character", args: ['"z"', "1"] },
      { name: "repeated rotation", args: ['"abab"', "1"] },
    ],
    random: { count: 300, gen: "s = rnd_str(rnd(1, 7), \"abc\"); k = rnd(1, min<int>(3, s.size()));" },
    stress: { label: "1000 characters, k = 2", gen: "s = rnd_str(1000, \"abcdefghijklmnopqrstuvwxyz\"); k = 2;" },
  },
});
