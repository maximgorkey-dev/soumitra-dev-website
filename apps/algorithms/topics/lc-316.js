import { light } from "./leet-light.js";

export const lc316 = light({
  number: 316,
  title: "Remove Duplicate Letters",
  slug: "remove-duplicate-letters",
  difficulty: "M",
  pattern: "A2",
  topic: "A2 · Monotonic stack",
  see: 84,
  themes: ["Strings", "Greedy", "Smallest subsequence"],
  blurb: "A monotonic stack of letters, where a larger letter on top may be popped only if it occurs again later.",
  statement: [
    "Remove letters from a lowercase string so that every distinct letter appears exactly once, and the result is the lexicographically smallest possible among all such subsequences.",
    "Up to 10⁴ characters. (1081 is the same problem.)",
  ],
  hints: [
    "The result is a subsequence containing each distinct letter once. Which letter should come first?",
    "Scan left to right with a stack. When a smaller letter arrives, when may you pop a larger one?",
    "Only if the larger letter occurs again later, so you can still take it then. Precompute the last index of each letter.",
    "Skip a letter that is already on the stack.",
  ],
  brute: "Enumerate subsequences that keep one copy of each distinct letter and take the smallest: exponential. A smarter brute builds the answer letter by letter, trying each candidate first letter and checking that the rest still contains every remaining letter: O(26² · n).",
  invariant: "The stack is the smallest possible prefix of the answer using the characters read so far, given that every letter still on the stack or still ahead must appear in the result.",
  traps: [
    "Popping a letter that never appears again, which loses it from the result.",
    "Pushing a letter that is already in the stack, which creates a duplicate. Track membership.",
    "Comparing with ≥ instead of >: equal letters cannot both be on the stack anyway, but the membership check must come first.",
  ],
  followUps: [
    "402 Remove K Digits: the same stack, with a budget of k pops instead of a \"seen later\" test.",
    "Smallest subsequence of length k that contains a given letter at least r times (2030).",
    "Largest instead of smallest.",
  ],
  explanation: [
    "Build the answer left to right in a stack. For each character c: if c is already in the stack, skip it, since its earlier copy is placed as well as it can be. Otherwise, while the top of the stack is larger than c and occurs again later in the string, pop it: putting c first is lexicographically better, and the popped letter will be taken again at a later occurrence. Then push c.",
    "\"Occurs again later\" is a check against the last index of each letter, computed in one pass beforehand. A boolean array of 26 entries tracks stack membership.",
    "Each character is pushed and popped at most once, so the whole thing is O(n). The stack is never larger than 26.",
    { tip: "Signal: \"lexicographically smallest subsequence\" with a constraint on which letters must stay. Monotonic stack; pop only when the constraint allows." },
  ],
  analysis: {
    time: "O(n)",
    space: "O(1): 26 letters on the stack, 26 last indices",
    notes: [
      "Proof sketch: if the answer kept a larger letter before a smaller one while a later copy of the larger letter existed, moving it later gives a smaller string.",
    ],
  },
  tests: {
    fn: "removeDuplicateLetters",
    args: [{ type: "string", name: "s" }],
    starter: `class Solution {
public:
    string removeDuplicateLetters(string s) {

    }
};`,
    reference: `class Solution {
public:
    string removeDuplicateLetters(string s) {
        int last[26] = {};
        for (int i = 0; i < (int)s.size(); ++i) last[s[i] - 'a'] = i;
        bool in[26] = {};
        string st;
        for (int i = 0; i < (int)s.size(); ++i) {
            char c = s[i];
            if (in[c - 'a']) continue;
            while (!st.empty() && st.back() > c && last[st.back() - 'a'] > i) {  // it comes again later
                in[st.back() - 'a'] = false;
                st.pop_back();
            }
            st.push_back(c);
            in[c - 'a'] = true;
        }
        return st;
    }
};`,
    brute: `class Solution {
public:
    // Choose the answer one letter at a time: the smallest letter whose first
    // occurrence (from the current position) still leaves every other needed
    // letter ahead. O(26^2 * n).
    string removeDuplicateLetters(string s) {
        string out;
        set<char> need(s.begin(), s.end());
        size_t pos = 0;
        while (!need.empty()) {
            for (char c : need) {
                size_t at = s.find(c, pos);
                bool ok = true;
                for (char d : need)
                    if (d != c && s.find(d, at) == string::npos) ok = false;
                if (ok) { out += c; need.erase(c); pos = at + 1; break; }
            }
        }
        return out;
    }
};`,
    cases: [
      { name: "example", args: ['"bcabc"'] },
      { name: "example 2", args: ['"cbacdcbc"'] },
      { name: "one letter", args: ['"aaaa"'] },
      { name: "already distinct", args: ['"zyx"'] },
      { name: "must keep the last copy", args: ['"abacb"'] },
    ],
    random: { count: 400, gen: "s = rnd_str(rnd(1, 12), \"abcde\");" },
    stress: { label: "10⁴ characters, 26 letters", gen: "s = rnd_str(10000, \"abcdefghijklmnopqrstuvwxyz\");" },
  },
});
