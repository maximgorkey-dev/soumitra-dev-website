import { study } from "./leet-light.js";

export const lc140 = study({
  number: 140,
  title: "Word Break II",
  slug: "word-break-ii",
  difficulty: "H",
  pattern: "F5",
  topic: "F5 · Knapsack and counting",
  see: 139,
  themes: ["Enumerate all splits", "Memoised suffixes", "Output-sensitive"],
  blurb: "List every way to split s into dictionary words. The sentences for the suffix starting at i are each word s[i..j) followed by every sentence for the suffix at j. Memoise by i so each suffix's list is built once.",
  statement: [
    "Given a string s and a list of dictionary words, return every sentence formed by inserting spaces into s so that every piece is a dictionary word (words may be reused), in any order.",
    "s up to 20 characters, up to 1000 words, at most 10⁵ sentences in the answer. Example: \"catsanddog\" with [cat, cats, and, sand, dog] gives \"cats and dog\" and \"cat sand dog\".",
  ],
  concepts: [
    "First-piece decomposition: every sentence for the suffix s[i..) is a first word s[i..j) plus a sentence for s[j..).",
    "Memoising lists by suffix start: the same suffix is reached from many prefixes, so build its sentence list once.",
    "Output-sensitive cost: the answer itself can be exponential (\"aaaa…\" with [a, aa, aaa]), so the goal is to spend time only on sentences that are actually produced.",
    "Dead-end pruning: suffixes that cannot be split return an empty list once and are never explored again, which is 139's table in disguise.",
  ],
  hints: [
    "Solve 139 first. What changes when you need the sentences rather than a yes or no?",
    "Write a function that returns all sentences for the suffix starting at i. How does it use itself?",
    "Which calls repeat? Store the list per i.",
    "What should the call at i = n return so that the last word has something to attach to?",
  ],
  brute: [
    "Backtrack from the left, trying every dictionary word at the current position and recursing. Without memo, inputs like \"aaaaaaaaaaaaaaaaaaab\" with [a, aa, aaa, …] explore an exponential number of paths that all fail at the final b, producing nothing.",
    "Memoising by start position means each suffix is solved once. A suffix that cannot be split stores an empty list and stops every later branch that reaches it immediately, so the remaining work is proportional to the sentences built.",
  ],
  invariant: "memo[i], once computed, holds every sentence (words joined by single spaces) that splits the suffix s[i..) into dictionary words; memo[n] holds one empty sentence.",
  traps: [
    "Returning an empty list for i = n: then no sentence can ever be completed. The end of the string has exactly one split, the empty one.",
    "Adding a trailing or doubled space when joining: attach \" \" + rest only when rest is non-empty.",
    "No memo: the all-a's-then-b input times out even though the answer is empty.",
    "Building sentences left to right in a shared buffer and copying at every leaf: correct, but without a reachability check it explores dead branches. Either memoise suffixes or prune with 139's table first.",
  ],
  followUps: [
    "Count the sentences without listing them: 139 with sums, O(n × L) after hashing.",
    "Return only the first k sentences in lexicographic order: try words in sorted order and stop after k, with 139's table to skip dead ends.",
    "Minimum number of words: 139 with a min.",
    "Very long s with few sentences: prune with ok-from-the-right (can the suffix at j be split?) so backtracking never enters a dead suffix, and stream sentences instead of storing lists.",
    "Huge dictionary: a trie lets each start position find all matching words in one walk.",
  ],
  explanation: [
    { h: "What the memo holds" },
    "sentences(i) is the list of all ways to split the suffix s[i..) into dictionary words, each written as a string with single spaces. The answer is sentences(0).",
    { h: "Base case" },
    "sentences(n) = [\"\"]: the empty suffix has exactly one split, with no words. Each last word attaches to this empty sentence.",
    { h: "Building one entry" },
    {
      list: [
        "Try every end j with s[i..j) in the dictionary (j − i at most the longest word).",
        "For each sentence r in sentences(j), produce s[i..j) followed by \" \" + r, or just s[i..j) if r is empty.",
        "Store the combined list for i. A suffix with no valid split stores an empty list, so later visits return at once.",
      ],
    },
    { code: "sentences(n) = [\"\"]\nsentences(i) = [ w + (r empty ? \"\" : \" \" + r)\n                 for each word w = s[i..j) in dict\n                 for each r in sentences(j) ]" },
    { h: "A worked example: \"catsanddog\", dictionary [cat, cats, and, sand, dog]" },
    {
      table: {
        head: ["start i", "suffix", "sentences(i)"],
        rows: [
          [10, "(empty)", "[\"\"]"],
          [7, "dog", "dog"],
          [4, "anddog", "and dog"],
          [3, "sanddog", "sand dog"],
          [0, "catsanddog", "**cat sand dog; cats and dog**"],
          ["1, 2, 5, 6, 8, 9", "…", "none (no word fits, or the rest fails)"],
        ],
        caption: "Each suffix's sentence list, built from shorter suffixes. The answer is the list at i = 0.",
      },
    },
    "At i = 0 two words fit: \"cat\" leads to i = 3, whose only sentence is \"sand dog\", and \"cats\" leads to i = 4, whose only sentence is \"and dog\". At i = 3, \"sand\" leads to 7, and \"dog\" there leads to the empty sentence at 10, giving \"dog\" without a trailing space.",
    { h: "Cost" },
    "There are n + 1 suffixes, each trying at most L words. The total work is dominated by building the output strings, which can be exponential in n, so no algorithm is polynomial in the worst case. Memo ensures nothing is built twice and dead suffixes cost O(L) once.",
    { tip: "Signal: \"return all\" segmentations or parses. Memoise the list per suffix; make the base case one empty result, not zero results." },
  ],
  analysis: {
    time: "O(n × L² + total length of all sentences produced)",
    space: "Same order as the output (memoised lists)",
    notes: ["With n ≤ 20 the bound on outputs (10⁵ sentences) is what keeps this fast."],
  },
  solution: `class Solution {
    string s;
    unordered_set<string> dict;
    int maxLen = 0;
    vector<vector<string>> memo;   // memo[i]: every sentence for the suffix s[i..)
    vector<char> done;

    const vector<string>& from(int i) {
        if (done[i]) return memo[i];
        vector<string> out;
        int n = s.size();
        if (i == n) out.push_back("");            // one split of the empty suffix
        for (int len = 1; len <= maxLen && i + len <= n; ++len) {
            string w = s.substr(i, len);
            if (!dict.count(w)) continue;
            // w is the first word; attach every sentence for the rest.
            for (const string& rest : from(i + len))
                out.push_back(rest.empty() ? w : w + " " + rest);
        }
        done[i] = 1;
        memo[i] = std::move(out);                 // empty means "cannot be split"
        return memo[i];
    }

public:
    vector<string> wordBreak(string str, vector<string>& wordDict) {
        s = str;
        dict = unordered_set<string>(wordDict.begin(), wordDict.end());
        for (const string& w : wordDict) maxLen = max(maxLen, (int)w.size());
        memo.assign(s.size() + 1, vector<string>());
        done.assign(s.size() + 1, 0);
        return from(0);
    }
};
`,
});
