import { light } from "./leet-light.js";

export const lc424 = light({
  number: 424,
  title: "Longest Repeating Character Replacement",
  slug: "longest-repeating-character-replacement",
  difficulty: "M",
  pattern: "A4",
  topic: "A4 · Variable sliding window",
  see: 76,
  themes: ["Strings", "Sliding window", "Budget of changes"],
  blurb: "A window can be made uniform with (length − count of its most frequent letter) replacements. Keep that ≤ k, and the stale maximum is fine.",
  statement: [
    "You may replace at most k characters of an uppercase string with any uppercase letters. Return the length of the longest substring that can be made of one repeated letter.",
    "Up to 10⁵ characters; 0 ≤ k ≤ n.",
  ],
  hints: [
    "For a fixed window, how many replacements make it uniform?",
    "Its length minus the count of its most frequent letter.",
    "Grow the window on the right; shrink from the left when that cost exceeds k.",
    "You never need to decrease the recorded maximum frequency when shrinking. Why?",
  ],
  brute: "For every start, extend while length − max frequency ≤ k, updating 26 counts: O(n²).",
  invariant: "The window length never decreases, and it equals the best answer found so far plus at most one; it only grows when a letter reaches a new highest frequency.",
  traps: [
    "Recomputing the max over 26 counts on every shrink is correct but unnecessary.",
    "Believing the stale maxFreq gives wrong answers: it can only overstate validity for windows no longer than the best already found, so the answer is unaffected.",
    "Using if instead of while with the exact max: then the window must truly shrink to validity.",
  ],
  followUps: [
    "1004 Max Consecutive Ones III: two letters, the budget counts zeros.",
    "2024 Maximize the Confusion of an Exam: the same with T and F.",
    "Return the substring and the letter.",
  ],
  explanation: [
    "A window is fixable when its length minus the count of its most common letter is at most k: replace every other letter. Fixability survives shrinking, so a two-pointer window applies.",
    "The classic trick is that the window never needs to shrink by more than one step. Keep maxFreq as the highest count seen in any window so far. When length − maxFreq > k, slide the left edge once, so the window keeps its length. The window can only grow when some letter reaches a count above maxFreq, which is exactly when a longer answer appears.",
    "The final answer is the window's length at the end, or the largest r − l + 1 seen.",
    { tip: "Signal: \"at most k replacements to make it uniform\". Cost = length − dominant count; slide a window that never shrinks below the best." },
  ],
  analysis: {
    time: "O(n)",
    space: "O(26)",
    notes: ["Recomputing the exact max over 26 counts each step is O(26n) and also fine."],
  },
  tests: {
    fn: "characterReplacement",
    args: [{ type: "string", name: "s" }, { type: "int", name: "k" }],
    starter: `class Solution {
public:
    int characterReplacement(string s, int k) {

    }
};`,
    reference: `class Solution {
public:
    int characterReplacement(string s, int k) {
        int cnt[26] = {}, maxFreq = 0, l = 0;
        for (int r = 0; r < (int)s.size(); ++r) {
            maxFreq = max(maxFreq, ++cnt[s[r] - 'A']);
            if (r - l + 1 - maxFreq > k) --cnt[s[l++] - 'A'];  // slide; the window never shrinks
        }
        return s.size() - l;
    }
};`,
    brute: `class Solution {
public:
    // Every start, extended while fixable: O(26 n^2).
    int characterReplacement(string s, int k) {
        int n = s.size(), best = 0;
        for (int i = 0; i < n; ++i) {
            int cnt[26] = {}, mx = 0;
            for (int j = i; j < n; ++j) {
                mx = max(mx, ++cnt[s[j] - 'A']);
                if (j - i + 1 - mx > k) break;
                best = max(best, j - i + 1);
            }
        }
        return best;
    }
};`,
    cases: [
      { name: "example", args: ['"ABAB"', "2"] },
      { name: "example 2", args: ['"AABABBA"', "1"] },
      { name: "k = 0", args: ['"AABBBA"', "0"] },
      { name: "one letter", args: ['"Z"', "0"] },
      { name: "replace all", args: ['"ABCD"', "4"] },
    ],
    random: { count: 400, gen: "s = rnd_str(rnd(1, 12), \"ABC\"); k = rnd(0, 3);" },
    stress: { label: "10⁵ characters, one letter", gen: "s.assign(100000, 'Q'); k = 0;" },
  },
});
