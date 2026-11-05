import { light } from "./leet-light.js";

export const lc692 = light({
  number: 692,
  title: "Top K Frequent Words",
  slug: "top-k-frequent-words",
  difficulty: "M",
  pattern: "E4",
  topic: "E4 · Top k and frequency",
  themes: ["Counting", "Heap of size k", "Custom comparator"],
  blurb: "Count the words, then keep a size-k heap whose top is the worst kept word: lowest count, and among equal counts the lexicographically largest.",
  statement: [
    "Given a list of lowercase words and k, return the k most frequent words, sorted by frequency from highest to lowest; words with the same frequency are sorted alphabetically.",
    "Up to 500 words of length up to 10; k is at most the number of distinct words. Follow-up: O(n log k).",
  ],
  hints: [
    "Count with a hash map. What order do you need on (count, word)?",
    "Higher count first, then smaller word first.",
    "For O(n log k), keep a min-heap of size k ordered the opposite way, so its top is the one to evict. Reverse at the end.",
  ],
  brute: "Count, then sort all distinct words with the comparator: O(n + u log u).",
  invariant: "After each push and possible pop, the heap holds the k best words seen so far under (count desc, word asc), with the worst on top.",
  traps: [
    "Getting the tie-break backwards inside the heap: the eviction order is the reverse of the output order.",
    "Forgetting to reverse the heap's output.",
    "Comparing words by length instead of lexicographically.",
  ],
  followUps: [
    "A trie per frequency bucket gives alphabetical order within a count for free.",
    "Streaming words with a sliding time window.",
  ],
  explanation: [
    "Count each word. The output order is: higher count first, and for equal counts, the alphabetically smaller word first.",
    "To keep only k words, use a heap whose top is the worst of those kept: smallest count, and among equal counts the alphabetically larger. Push each distinct word and pop when the size exceeds k. Popping the heap then yields the answer worst-first, so reverse it.",
    { tip: "Signal: top k with a tie-break. Write the comparator once for the output order, and invert it for the eviction heap." },
  ],
  analysis: {
    time: "O(n log k)",
    space: "O(n)",
    notes: [],
  },
  tests: {
    fn: "topKFrequent",
    args: [{ type: "vector<string>", name: "words" }, { type: "int", name: "k" }],
    starter: `class Solution {
public:
    vector<string> topKFrequent(vector<string>& words, int k) {

    }
};`,
    reference: `class Solution {
public:
    vector<string> topKFrequent(vector<string>& words, int k) {
        unordered_map<string, int> cnt;
        for (auto& w : words) ++cnt[w];
        using P = pair<int, string>;
        auto better = [](const P& a, const P& b) {  // a ranks above b in the output
            return a.first != b.first ? a.first > b.first : a.second < b.second;
        };
        priority_queue<P, vector<P>, decltype(better)> heap(better);  // top = worst kept
        for (auto& [w, c] : cnt) {
            heap.push({c, w});
            if ((int)heap.size() > k) heap.pop();
        }
        vector<string> res;
        while (!heap.empty()) { res.push_back(heap.top().second); heap.pop(); }
        reverse(res.begin(), res.end());
        return res;
    }
};`,
    brute: `class Solution {
public:
    // Sort every distinct word: O(n + u log u).
    vector<string> topKFrequent(vector<string>& words, int k) {
        map<string, int> cnt;
        for (auto& w : words) ++cnt[w];
        vector<pair<int, string>> v;
        for (auto& [w, c] : cnt) v.push_back({-c, w});
        sort(v.begin(), v.end());
        vector<string> res;
        for (int i = 0; i < k; ++i) res.push_back(v[i].second);
        return res;
    }
};`,
    cases: [
      { name: "example", args: ["{\"i\", \"love\", \"leetcode\", \"i\", \"love\", \"coding\"}", "2"] },
      { name: "example 2", args: ["{\"the\", \"day\", \"is\", \"sunny\", \"the\", \"the\", \"the\", \"sunny\", \"is\", \"is\"}", "4"] },
      { name: "all ties", args: ["{\"b\", \"a\", \"c\"}", "2"] },
      { name: "prefix words", args: ["{\"ab\", \"a\", \"ab\", \"a\", \"abc\"}", "3"] },
    ],
    random: { count: 400, gen: "{ int lt_n = rnd(1, 12); words.clear(); for (int i = 0; i < lt_n; ++i) words.push_back(rnd_str(rnd(1, 2), \"abc\")); set<string> lt_d(words.begin(), words.end()); k = rnd(1, lt_d.size()); }" },
    stress: { label: "10⁵ words", gen: "{ words.clear(); for (int i = 0; i < 100000; ++i) words.push_back(rnd_str(rnd(1, 4), \"abcdefgh\")); k = 500; }" },
  },
});
