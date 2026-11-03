import { light } from "./leet-light.js";

export const lc1888 = light({
  number: 1888,
  title: "Minimum Number of Flips to Make the Binary String Alternating",
  slug: "minimum-number-of-flips-to-make-the-binary-string-alternating",
  difficulty: "M",
  pattern: "A6",
  topic: "A6 · Rotation",
  themes: ["Rotation", "Fixed window", "Strings"],
  blurb: "Every rotation is a window of length n in s + s. Slide that window and count mismatches against the two alternating patterns.",
  statement: [
    "Two operations are allowed on a binary string: move the first character to the end (any number of times, free), and flip a character (counted). Return the fewest flips that make the string alternating, so that no two adjacent characters are equal.",
    "Up to 10⁵ characters.",
  ],
  hints: [
    "Moving the first character to the end is a rotation. How do you enumerate all rotations efficiently?",
    "Every rotation of s is a length-n window of s + s.",
    "For a fixed window, the flips needed are its mismatches against 0101… or 1010…, whichever is fewer.",
    "Slide the window over s + s, updating the two mismatch counts by the character entering and the one leaving.",
  ],
  brute: "Try each of the n rotations and count mismatches from scratch: O(n²), 10¹⁰ at the limit.",
  invariant: "For the window s2[i − n + 1 … i], d0 and d1 are its mismatch counts against the alternating patterns aligned to absolute positions in s + s.",
  traps: [
    "Aligning the target pattern to the window start: aligning to absolute positions in s + s is equivalent and makes the sliding update trivial.",
    "For even n rotation never helps (the two patterns just swap), but the general code handles it.",
  ],
  followUps: [
    "Without the free rotation: just the two mismatch counts.",
    "Flips cost differently for 0 → 1 and 1 → 0.",
    "796 Rotate String: every rotation is a substring of s + s, for equality checks.",
  ],
  explanation: [
    "Moving the first character to the end any number of times reaches exactly the n rotations of s, and each rotation is a window of length n in s + s. The cost of a window is the number of positions that disagree with an alternating pattern; take the better of the two patterns.",
    "Fix the two patterns by absolute position in s + s: p0 has '0' at even indices, p1 has '1' at even indices. A window's mismatch count against a pattern aligned to its start equals its count against p0 or p1, just possibly swapped, so taking the minimum of both is still right. Slide the window, adding the mismatch of the entering character and removing that of the leaving one.",
    { tip: "Signal: \"rotate any number of times\", then something per rotation. Double the string and slide a window of length n." },
  ],
  analysis: {
    time: "O(n)",
    space: "O(1) beyond s + s (or index modulo n and avoid building it)",
    notes: ["For even n the answer is simply the better of the two mismatch counts on s itself."],
  },
  tests: {
    fn: "minFlips",
    args: [{ type: "string", name: "s" }],
    starter: `class Solution {
public:
    int minFlips(string s) {

    }
};`,
    reference: `class Solution {
public:
    int minFlips(string s) {
        int n = s.size(), best = INT_MAX, d0 = 0, d1 = 0;
        for (int i = 0; i < 2 * n; ++i) {
            char c = s[i % n];  // s + s without building it
            d0 += c != (i % 2 ? '1' : '0');
            d1 += c != (i % 2 ? '0' : '1');
            if (i >= n) {  // drop the character that left the window
                char o = s[(i - n) % n];
                d0 -= o != ((i - n) % 2 ? '1' : '0');
                d1 -= o != ((i - n) % 2 ? '0' : '1');
            }
            if (i >= n - 1) best = min({best, d0, d1});
        }
        return best;
    }
};`,
    brute: `class Solution {
public:
    // Every rotation, counted from scratch: O(n^2).
    int minFlips(string s) {
        int n = s.size(), best = INT_MAX;
        for (int r = 0; r < n; ++r) {
            int a = 0, b = 0;
            for (int i = 0; i < n; ++i) {
                char c = s[(r + i) % n];
                a += c != (i % 2 ? '1' : '0');
                b += c != (i % 2 ? '0' : '1');
            }
            best = min({best, a, b});
        }
        return best;
    }
};`,
    cases: [
      { name: "example", args: ['"111000"'] },
      { name: "example 2", args: ['"010"'] },
      { name: "example 3", args: ['"1110"'] },
      { name: "one character", args: ['"0"'] },
      { name: "rotation helps", args: ['"01001001101"'] },
    ],
    random: { count: 400, gen: "s = rnd_str(rnd(1, 12), \"01\");" },
    stress: { label: "10⁵ characters, odd length", gen: "s = rnd_str(99999, \"01\");" },
  },
});
