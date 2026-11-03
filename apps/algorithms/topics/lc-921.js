import { light } from "./leet-light.js";

export const lc921 = light({
  number: 921,
  title: "Minimum Add to Make Parentheses Valid",
  slug: "minimum-add-to-make-parentheses-valid",
  difficulty: "M",
  pattern: "D5",
  topic: "D5 · Counting the balance",
  themes: ["Balance counter", "Parentheses"],
  blurb: "Track how many '(' are still open. A ')' with nothing open forces an insertion; whatever stays open at the end needs closing.",
  statement: [
    "Given a string of '(' and ')', return the fewest parentheses to insert anywhere to make it valid.",
    "Up to 1000 characters.",
  ],
  hints: [
    "Do you need a stack, or just a count?",
    "A count of unmatched '('. What does a ')' do when the count is zero?",
    "It needs a '(' inserted before it. At the end, each unmatched '(' needs a ')'.",
  ],
  brute: "Repeatedly delete matched \"()\" pairs; what is left can only be fixed one character at a time: O(n²).",
  invariant: "After each character, open is the number of unmatched '(' so far, and added is the number of ')' that had no partner.",
  traps: [
    "Letting the balance go negative and fixing it with the absolute value at the end: \")(\" needs 2, not 0.",
    "Using a stack of characters when an integer suffices.",
  ],
  followUps: [
    "Return one valid string with the fewest insertions.",
    "Removals instead of insertions: 1249 Minimum Remove to Make Valid.",
    "A ')' must be doubled: 1541.",
  ],
  explanation: [
    "Scan left to right with open, the number of '(' waiting for a partner. A '(' increments it. A ')' decrements it if it is positive; if it is zero, this ')' can never be matched by anything to its left, so one '(' must be inserted.",
    "At the end, each of the open '(' needs a ')', so the answer is the insertions counted plus open.",
    { tip: "Signal: fix a bracket string with the fewest edits. A balance counter, with a forced edit whenever it would go negative." },
  ],
  analysis: {
    time: "O(n)",
    space: "O(1)",
    notes: [],
  },
  tests: {
    fn: "minAddToMakeValid",
    args: [{ type: "string", name: "s" }],
    starter: `class Solution {
public:
    int minAddToMakeValid(string s) {

    }
};`,
    reference: `class Solution {
public:
    int minAddToMakeValid(string s) {
        int open = 0, added = 0;
        for (char c : s) {
            if (c == '(') ++open;
            else if (open > 0) --open;
            else ++added;  // nothing to match this ')'
        }
        return added + open;
    }
};`,
    brute: `class Solution {
public:
    // Delete matched pairs until none remain: O(n^2).
    int minAddToMakeValid(string s) {
        for (size_t p; (p = s.find("()")) != string::npos;) s.erase(p, 2);
        return s.size();
    }
};`,
    cases: [
      { name: "example", args: ["\"())\""] },
      { name: "example 2", args: ["\"(((\""] },
      { name: "valid", args: ["\"(()())\""] },
      { name: "wrong order", args: ["\")(\""] },
      { name: "one char", args: ["\")\""] },
    ],
    random: { count: 400, gen: "s = rnd_str(rnd(1, 12), \"()\");" },
    stress: { label: "1000 characters", gen: "s = rnd_str(1000, \"()\");" },
  },
});
