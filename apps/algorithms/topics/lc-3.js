import { light } from "./leet-light.js";

export const lc3 = light({
  number: 3,
  title: "Longest Substring Without Repeating Characters",
  slug: "longest-substring-without-repeating-characters",
  difficulty: "M",
  pattern: "A4",
  topic: "A4 · Variable sliding window",
  see: 76,
  themes: ["Strings", "Sliding window"],
  blurb: "Grow the window on the right; when a character repeats, jump the left edge past its previous occurrence.",
  statement: [
    "Return the length of the longest substring with no repeated character.",
    "Up to 5·10⁴ characters: letters, digits, symbols and spaces.",
  ],
  hints: [
    "If a substring has no repeats, neither does any substring of it. What does that suggest?",
    "A window [l, r]: extend r; when s[r] is already in the window, move l right until it is not.",
    "Can l jump directly instead of stepping?",
    "Remember the last index of each character; set l = max(l, last[s[r]] + 1).",
  ],
  brute: "Every substring, checked for repeats with a set: O(n³), about 10¹⁴ steps at 5·10⁴. Extending each start until its first repeat is O(n · alphabet), much better but still not the intended answer.",
  invariant: "After processing r, s[l … r] has no repeated character, and l is the smallest such start.",
  traps: [
    "Jumping l backwards: the previous occurrence may be before l already. Take the max.",
    "Assuming only lowercase letters: the input can contain any ASCII character, including spaces.",
    "Off-by-one: the window length is r − l + 1.",
  ],
  followUps: [
    "340 / 159: at most k (or 2) distinct characters, with a count map.",
    "395 Longest Substring with At Least K Repeating Characters: not monotone; split by bad characters, or fix the number of distinct letters.",
    "Return the substring itself, or all substrings of maximum length.",
  ],
  explanation: [
    "Having no repeated character is preserved by shrinking, so the longest valid window ending at r starts at the smallest l for which s[l … r] has no repeat, and that l never moves left as r grows.",
    "Store the last index of every character. At r, if s[r] was last seen at an index ≥ l, the window now has two copies, and the only fix is to start just after the earlier copy: l = last[s[r]] + 1. Otherwise l stays. Update last[s[r]] = r and record r − l + 1.",
    "One pass, constant work per character.",
    { tip: "The jump version of a sliding window: when the violation is caused by one known earlier position, move l straight past it." },
  ],
  analysis: {
    time: "O(n)",
    space: "O(alphabet): 128 or 256 last-seen indices",
    notes: [
      "The step-by-step version with a set is also O(n), since l only moves right.",
    ],
  },
  tests: {
    fn: "lengthOfLongestSubstring",
    args: [{ type: "string", name: "s" }],
    starter: `class Solution {
public:
    int lengthOfLongestSubstring(string s) {

    }
};`,
    reference: `class Solution {
public:
    int lengthOfLongestSubstring(string s) {
        vector<int> last(256, -1);
        int best = 0;
        for (int l = 0, r = 0; r < (int)s.size(); ++r) {
            unsigned char c = s[r];
            l = max(l, last[c] + 1);  // never move l backwards
            last[c] = r;
            best = max(best, r - l + 1);
        }
        return best;
    }
};`,
    brute: `class Solution {
public:
    // Every substring, checked for repeats with a set: O(n^3).
    int lengthOfLongestSubstring(string s) {
        int n = s.size(), best = 0;
        for (int i = 0; i < n; ++i)
            for (int j = i; j < n; ++j) {
                set<char> seen(s.begin() + i, s.begin() + j + 1);
                if ((int)seen.size() == j - i + 1) best = max(best, j - i + 1);
            }
        return best;
    }
};`,
    cases: [
      { name: "example", args: ['"abcabcbb"'] },
      { name: "example 2", args: ['"bbbbb"'] },
      { name: "example 3", args: ['"pwwkew"'] },
      { name: "empty", args: ['""'] },
      { name: "space", args: ['" "'] },
      { name: "old repeat before l", args: ['"abba"'] },
      { name: "symbols", args: ['"a!b@a #"'] },
    ],
    random: { count: 400, gen: "s = rnd_str(rnd(0, 12), \"abcd \");" },
    stress: { label: "5·10⁴ characters, 95 symbols", gen: "{ string lt_a; for (char c = 32; c < 127; ++c) lt_a += c; s = rnd_str(50000, lt_a); }" },
  },
});
