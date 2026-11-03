import { light } from "./leet-light.js";

export const lc438 = light({
  number: 438,
  title: "Find All Anagrams in a String",
  slug: "find-all-anagrams-in-a-string",
  difficulty: "M",
  pattern: "A4",
  topic: "A4 · Variable sliding window",
  see: 76,
  themes: ["Strings", "Fixed window", "Anagrams"],
  blurb: "Slide a window of length |p| and keep letter counts; track how many of the 26 letters match so each step is O(1).",
  statement: [
    "Return the start indices of every substring of s that is an anagram of p (the same letters with the same multiplicities), in any order.",
    "Both strings are lowercase, each up to 3·10⁴ characters.",
  ],
  hints: [
    "Every anagram has exactly |p| characters. What kind of window is this?",
    "A fixed-size window. Compare its letter counts with p's.",
    "Comparing 26 counts per step is O(26n), already fine. Can you make it O(1)?",
    "Keep the number of letters whose counts currently agree; update it only for the letter entering and the letter leaving.",
  ],
  brute: "Sort every length-|p| substring and compare with sorted p: O(n · m log m), about 10⁹ when both are 3·10⁴ characters long.",
  invariant: "After the window covers s[i … i + m − 1], diff[c] = window count − p count for every letter, and matches is the number of letters with diff 0.",
  traps: [
    "|p| > |s|: no answers; do not index out of range.",
    "Updating matches without checking whether the count crossed zero in either direction.",
  ],
  followUps: [
    "567 Permutation in String: the same window, return as soon as one matches.",
    "76 Minimum Window Substring: a variable window with \"covers\" instead of \"equals\".",
    "30 Substring with Concatenation of All Words: the same idea over words, one window per offset.",
  ],
  explanation: [
    "An anagram of p is a substring of length m = |p| with the same letter counts. Slide a window of exactly m characters along s and maintain the difference between its counts and p's counts.",
    "Keep matches, the number of letters (out of 26) whose difference is 0. When a letter enters or leaves the window, its difference changes by 1: if it becomes 0, matches goes up; if it was 0, matches goes down. The window is an anagram exactly when matches is 26.",
    { tip: "Signal: \"anagram\" or \"permutation\" inside a string. A fixed window of counts, compared incrementally." },
  ],
  analysis: {
    time: "O(n + m)",
    space: "O(26)",
    notes: ["Comparing the full count arrays at every step is O(26n), also accepted."],
  },
  tests: {
    fn: "findAnagrams",
    args: [{ type: "string", name: "s" }, { type: "string", name: "p" }],
    normalize: `[](vector<int> v) { sort(v.begin(), v.end()); return v; }`,
    starter: `class Solution {
public:
    vector<int> findAnagrams(string s, string p) {

    }
};`,
    reference: `class Solution {
public:
    vector<int> findAnagrams(string s, string p) {
        int n = s.size(), m = p.size();
        vector<int> out;
        if (m > n) return out;
        int diff[26] = {}, matches = 0;
        for (char c : p) --diff[c - 'a'];
        for (int c = 0; c < 26; ++c) matches += diff[c] == 0;
        auto bump = [&](char ch, int d) {
            int& x = diff[ch - 'a'];
            if (x == 0) --matches;
            x += d;
            if (x == 0) ++matches;
        };
        for (int i = 0; i < n; ++i) {
            bump(s[i], +1);
            if (i >= m) bump(s[i - m], -1);
            if (i >= m - 1 && matches == 26) out.push_back(i - m + 1);
        }
        return out;
    }
};`,
    brute: `class Solution {
public:
    // Sort every window and compare: O(n * m log m).
    vector<int> findAnagrams(string s, string p) {
        vector<int> out;
        sort(p.begin(), p.end());
        for (int i = 0; i + p.size() <= s.size(); ++i) {
            string w = s.substr(i, p.size());
            sort(w.begin(), w.end());
            if (w == p) out.push_back(i);
        }
        return out;
    }
};`,
    cases: [
      { name: "example", args: ['"cbaebabacd"', '"abc"'] },
      { name: "example 2", args: ['"abab"', '"ab"'] },
      { name: "p longer", args: ['"a"', '"ab"'] },
      { name: "whole string", args: ['"ba"', '"ab"'] },
      { name: "repeated letters", args: ['"aaaaa"', '"aa"'] },
    ],
    random: { count: 400, gen: "s = rnd_str(rnd(1, 12), \"abc\"); p = rnd_str(rnd(1, 4), \"abc\");" },
    stress: { label: "3·10⁴ characters, |p| = 1.5·10⁴", gen: "s = rnd_str(30000, \"ab\"); p = rnd_str(15000, \"ab\");" },
  },
});
