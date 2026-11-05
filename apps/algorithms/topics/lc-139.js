import { study } from "./leet-light.js";

export const lc139 = study({
  number: 139,
  title: "Word Break",
  slug: "word-break",
  difficulty: "M",
  pattern: "F5",
  topic: "F5 · Knapsack and counting",
  themes: ["Prefix DP", "Last piece", "Dictionary lookup"],
  blurb: "ok[i] says whether the first i characters split into dictionary words. The last word of such a split ends at i and starts at some j with ok[j] true, so try every dictionary-length j back from i.",
  statement: [
    "Given a string s and a list of dictionary words, return whether s can be split into a sequence of one or more dictionary words (words may be reused).",
    "s up to 300 characters, up to 1000 words of length at most 20. Examples: \"leetcode\" with [leet, code] is true; \"catsandog\" with [cats, dog, sand, and, cat] is false.",
  ],
  concepts: [
    "Prefix DP: the state is a prefix length i, and ok[i] answers the question for s[0..i).",
    "Last-piece decomposition: a valid split of s[0..i) ends with one word s[j..i), and the rest s[0..j) must itself be valid.",
    "Knapsack in sequence form: words are reusable items laid end to end, and order matters, like counting sequences (377) with a boolean instead of a count.",
    "Bounded word length: only j with i − j ≤ the longest word length can work, which cuts the inner loop to 20 steps.",
    "Hash lookups of substrings: put the dictionary in a hash set; each check costs O(word length).",
  ],
  hints: [
    "Try recursion: does s start with some word w such that the rest can be split? Where does it repeat work?",
    "The rest is always a suffix of s, so there are only n + 1 distinct subproblems. Memoise, or flip it to prefixes.",
    "Define ok[i] for the prefix of length i. Which earlier entries does it depend on?",
    "Only j between i − maxWordLength and i − 1 can start the last word.",
  ],
  brute: [
    "Try every way to cut s: 2ⁿ⁻¹ cut patterns for n − 1 gaps, checking each piece. Even plain recursion on \"which word comes first\" is exponential on inputs like \"aaaa…ab\" with dictionary [a, aa, aaa, …], where every prefix matches and the final b makes every branch fail.",
    "Every branch ends up asking \"can the suffix starting at k be split?\" for the same few k. There are only n + 1 such questions; answering each once makes it O(n × L) lookups with L the longest word.",
  ],
  invariant: "After computing ok[0..i], ok[x] for each x ≤ i is true exactly when s[0..x) can be split into dictionary words (ok[0] is true for the empty prefix).",
  traps: [
    "Greedy longest match: with [a, abc, b, cd] and \"abcd\", taking \"abc\" first leaves \"d\" and fails, but a + b + cd works.",
    "Forgetting ok[0] = true: nothing can ever start.",
    "Scanning all j from 0 to i − 1 with substr: O(n³) character work. Limit j to the longest word length.",
    "Plain recursion without memo: times out on the \"aaaa…ab\" family.",
  ],
  followUps: [
    "Return all splits (140): the same structure, but collect sentences, which can be exponentially many.",
    "Fewest words in a split: replace the OR with a min over j of words[j] + 1.",
    "Count splits: sum instead of OR, modulo a prime.",
    "Huge dictionary or long s: a trie over the dictionary walks forward from each reachable j, checking all words starting there in one pass. Aho–Corasick does all positions at once.",
    "Concatenated Words (472): run this per word against the dictionary of shorter words.",
  ],
  explanation: [
    { h: "What the table means" },
    "ok[i] is true when the first i characters, s[0..i), can be cut into dictionary words. The answer is ok[n].",
    { h: "Base case" },
    "ok[0] = true: the empty prefix is split into zero words. It is what lets the first word start.",
    { h: "Filling one cell" },
    {
      list: [
        "If s[0..i) splits, its last word is s[j..i) for some j < i, and s[0..j) splits too.",
        "So ok[i] is true when some j has ok[j] true and s[j..i) in the dictionary.",
        "Only j ≥ i − L can work, where L is the longest dictionary word.",
      ],
    },
    { code: "ok[0] = true\nfor i = 1 .. n:\n    ok[i] = any over j in [i - L, i - 1] of  ok[j] and s[j..i) in dict\nanswer = ok[n]" },
    { h: "A worked example: \"catsandog\", dictionary [cats, dog, sand, and, cat]" },
    {
      table: {
        head: ["i", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
        rows: [
          ["prefix ends with", "", "c", "a", "t", "s", "a", "n", "d", "o", "g"],
          ["ok[i]", "T", "F", "F", "T", "T", "F", "F", "T", "F", "**F**"],
          ["via", "empty", "", "", "cat", "cats", "", "", "cat + sand, cats + and", "", "dog needs ok[6]"],
        ],
        caption: "ok[i]: can the first i characters be split? The answer ok[9] is false.",
      },
    },
    "ok[7] is true twice over: \"sand\" = s[3..7) with ok[3], and \"and\" = s[4..7) with ok[4]. ok[9] would need the last word \"dog\" = s[6..9), which needs ok[6], and ok[6] is false because no word ends exactly after \"catsan\". No other suffix of length up to 4 is a word, so the answer is false.",
    { h: "Fill order and memory" },
    "Left to right, n cells, each trying at most L starting points with an O(L) substring hash: O(n × L²) time, O(n + dictionary size) space.",
    { tip: "Signal: can a string be cut into pieces from a set. Prefix DP over the cut position, last piece on top." },
  ],
  analysis: {
    time: "O(n × L²)",
    space: "O(n + total dictionary length)",
    notes: ["L is the longest dictionary word (at most 20)."],
  },
  solution: `class Solution {
public:
    bool wordBreak(string s, vector<string>& wordDict) {
        unordered_set<string> dict(wordDict.begin(), wordDict.end());
        int maxLen = 0;
        for (const string& w : wordDict) maxLen = max(maxLen, (int)w.size());

        int n = s.size();
        // ok[i]: the prefix s[0..i) can be split into dictionary words.
        vector<char> ok(n + 1, 0);
        ok[0] = 1;                              // the empty prefix

        for (int i = 1; i <= n; ++i)
            // The last word is s[i-len .. i); only lengths up to maxLen can match.
            for (int len = 1; len <= maxLen && len <= i; ++len)
                if (ok[i - len] && dict.count(s.substr(i - len, len))) {
                    ok[i] = 1;
                    break;                      // one valid split is enough
                }
        return ok[n];
    }
};
`,
});
