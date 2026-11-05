import { light } from "./leet-light.js";

export const lc1985 = light({
  number: 1985,
  title: "Find the Kth Largest Integer in the Array",
  slug: "find-the-kth-largest-integer-in-the-array",
  difficulty: "M",
  pattern: "E4",
  topic: "E4 · Top k and frequency",
  themes: ["Custom comparator", "Quickselect"],
  blurb: "The numbers have up to 100 digits, so compare them as strings: a longer string is larger, and equal lengths compare lexicographically. Then it is ordinary selection.",
  statement: [
    "nums holds non-negative integers written as strings without leading zeros, each up to 100 digits. Return the k-th largest, counting duplicates separately.",
    "Up to 10⁴ strings.",
  ],
  hints: [
    "The values do not fit in any integer type. How do two such strings compare?",
    "By length first; with equal lengths, lexicographic order matches numeric order.",
    "With that comparator, use nth_element, a size-k heap, or a sort.",
  ],
  brute: "Remove the maximum k times: O(k · n · L).",
  invariant: "With the comparator, the strings form a total order identical to their numeric order.",
  traps: [
    "Comparing strings lexicographically: \"9\" > \"10\".",
    "Converting to long long: up to 100 digits overflow.",
    "Removing duplicates: they count separately.",
  ],
  followUps: [
    "nth_element gives O(n · L) on average.",
    "Leading zeros allowed: strip them first, or compare after skipping them.",
    "Strings with a sign: negatives reverse the order.",
  ],
  explanation: [
    "Without leading zeros, a number with more digits is larger, and two numbers with the same number of digits compare the same way as their strings. Write that comparator and the problem is ordinary selection.",
    "nth_element with the comparator in descending order puts the k-th largest at index k − 1 in linear average time.",
    { tip: "Signal: numbers too big for any type. Compare them as strings by length, then lexicographically." },
  ],
  analysis: {
    time: "O(n · L) on average with nth_element",
    space: "O(1) beyond the input",
    notes: [],
  },
  tests: {
    fn: "kthLargestNumber",
    args: [{ type: "vector<string>", name: "nums" }, { type: "int", name: "k" }],
    starter: `class Solution {
public:
    string kthLargestNumber(vector<string>& nums, int k) {

    }
};`,
    reference: `class Solution {
public:
    string kthLargestNumber(vector<string>& nums, int k) {
        auto larger = [](const string& a, const string& b) {
            return a.size() != b.size() ? a.size() > b.size() : a > b;
        };
        nth_element(nums.begin(), nums.begin() + k - 1, nums.end(), larger);
        return nums[k - 1];
    }
};`,
    brute: `class Solution {
public:
    // Take the maximum k times: O(k * n * L).
    string kthLargestNumber(vector<string>& nums, int k) {
        auto smaller = [](const string& a, const string& b) {
            return a.size() != b.size() ? a.size() < b.size() : a < b;
        };
        string best;
        while (k-- > 0) {
            auto it = max_element(nums.begin(), nums.end(), smaller);
            best = *it;
            nums.erase(it);
        }
        return best;
    }
};`,
    cases: [
      { name: "example", args: ["{\"3\", \"6\", \"7\", \"10\"}", "4"] },
      { name: "example 2", args: ["{\"2\", \"21\", \"12\", \"1\"}", "3"] },
      { name: "duplicates", args: ["{\"0\", \"0\"}", "2"] },
      { name: "9 versus 10", args: ["{\"9\", \"10\"}", "1"] },
      { name: "long numbers", args: ["{\"123456789012345678901234567890\", \"99999999999999999999\"}", "2"] },
    ],
    random: { count: 400, gen: "{ int lt_n = rnd(1, 8); nums.clear(); for (int i = 0; i < lt_n; ++i) { string lt_s = rnd_str(rnd(1, 3), \"0123456789\"); if (lt_s.size() > 1 && lt_s[0] == '0') lt_s[0] = '1'; nums.push_back(lt_s); } k = rnd(1, lt_n); }" },
    stress: { label: "10⁴ numbers of up to 100 digits", gen: "{ nums.clear(); for (int i = 0; i < 10000; ++i) { string lt_s = rnd_str(rnd(1, 100), \"0123456789\"); if (lt_s.size() > 1 && lt_s[0] == '0') lt_s[0] = '7'; nums.push_back(lt_s); } k = 5000; }" },
  },
});
