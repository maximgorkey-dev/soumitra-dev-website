import { light } from "./leet-light.js";

export const lc347 = light({
  number: 347,
  title: "Top K Frequent Elements",
  slug: "top-k-frequent-elements",
  difficulty: "M",
  pattern: "E4",
  topic: "E4 · Top k and frequency",
  themes: ["Counting", "Bucket sort", "Heap of size k"],
  blurb: "Count, then bucket the values by their count: counts are at most n, so walking the buckets from the top gives the k most frequent in linear time.",
  statement: [
    "Given nums and k, return the k most frequent values, in any order. The answer is unique.",
    "Up to 10⁵ elements; the follow-up asks for better than O(n log n).",
  ],
  hints: [
    "Count with a hash map first. Then what is sorted?",
    "Sorting the distinct values by count is O(u log u). Can you avoid the log?",
    "Counts lie in 1..n. Put each value in bucket[count] and read buckets from n down.",
  ],
  brute: "Count, then sort all distinct values by count: O(n + u log u).",
  invariant: "bucket[c] holds exactly the values that occur c times; reading from the top, the first k values seen are the k most frequent.",
  traps: [
    "A max-heap of all distinct values is O(u log u); a min-heap of size k is O(u log k).",
    "Bucket array of size n, indexed by count up to n: allocate n + 1.",
    "Returning counts instead of values.",
  ],
  followUps: [
    "Quickselect on the distinct values by count: O(u) on average.",
    "A stream of values: a heap of size k with a hash map, or Count-Min Sketch when memory is tight.",
    "Ties broken lexicographically: 692.",
  ],
  explanation: [
    "Count every value. A value's count is between 1 and n, so make n + 1 buckets and drop each value into the bucket of its count.",
    "Walk the buckets from n down to 1, collecting values until there are k. That is O(n) in total, with no comparison sort.",
    { tip: "Signal: top k by frequency. Counts are bounded by n, so bucket by count; otherwise a heap of size k or quickselect." },
  ],
  analysis: {
    time: "O(n)",
    space: "O(n)",
    notes: [],
  },
  tests: {
    fn: "topKFrequent",
    args: [{ type: "vector<int>", name: "nums" }, { type: "int", name: "k" }],
    normalize: `[&](const vector<int>& got) {
    map<int, int> cnt;
    for (int x : nums) ++cnt[x];
    vector<int> counts;
    set<int> seen;
    for (int x : got) {
        if (!cnt.count(x) || !seen.insert(x).second) return vector<int>{-1};
        counts.push_back(cnt[x]);
    }
    sort(counts.rbegin(), counts.rend());
    return counts;
}`,
    starter: `class Solution {
public:
    vector<int> topKFrequent(vector<int>& nums, int k) {

    }
};`,
    reference: `class Solution {
public:
    vector<int> topKFrequent(vector<int>& nums, int k) {
        unordered_map<int, int> cnt;
        for (int x : nums) ++cnt[x];
        vector<vector<int>> bucket(nums.size() + 1);
        for (auto& [x, c] : cnt) bucket[c].push_back(x);
        vector<int> res;
        for (int c = nums.size(); c > 0 && (int)res.size() < k; --c)
            for (int x : bucket[c]) if ((int)res.size() < k) res.push_back(x);
        return res;
    }
};`,
    brute: `class Solution {
public:
    // Count, sort the distinct values by count: O(n + u log u).
    vector<int> topKFrequent(vector<int>& nums, int k) {
        map<int, int> cnt;
        for (int x : nums) ++cnt[x];
        vector<pair<int, int>> v;
        for (auto& [x, c] : cnt) v.push_back({c, x});
        sort(v.rbegin(), v.rend());
        vector<int> res;
        for (int i = 0; i < k; ++i) res.push_back(v[i].second);
        return res;
    }
};`,
    cases: [
      { name: "example", args: ["{1, 1, 1, 2, 2, 3}", "2"] },
      { name: "example 2", args: ["{1}", "1"] },
      { name: "negatives", args: ["{-1, -1, 5, 5, 5, 0}", "2"] },
      { name: "all distinct", args: ["{4, 3, 2, 1}", "4"] },
    ],
    random: { count: 400, gen: "{ nums = rnd_vec(rnd(1, 12), -3, 3); set<int> lt_d(nums.begin(), nums.end()); k = rnd(1, lt_d.size()); }" },
    stress: { label: "10⁵ elements", gen: "{ nums = rnd_vec(100000, -10000, 10000); k = 100; }" },
  },
});
