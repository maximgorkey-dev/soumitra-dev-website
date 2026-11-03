import { light } from "./leet-light.js";

export const lc402 = light({
  number: 402,
  title: "Remove K Digits",
  slug: "remove-k-digits",
  difficulty: "M",
  pattern: "A2",
  topic: "A2 · Monotonic stack",
  see: 84,
  themes: ["Strings", "Greedy"],
  blurb: "Scan left to right and pop a larger digit whenever a smaller one arrives, while removals remain: the kept digits stay non-decreasing.",
  statement: [
    "Given a non-negative integer as a string of digits and an integer k, remove exactly k digits so that the remaining number is as small as possible. Return it without leading zeros, or \"0\" if nothing is left.",
    "Up to 10⁵ digits; the input has no leading zeros except for \"0\" itself.",
  ],
  hints: [
    "Which single digit should you remove to make the number smallest?",
    "The first digit that is larger than the one after it. If there is none, the last digit.",
    "Doing that k times is O(kn). Can a stack do all k removals in one pass?",
    "Push each digit; while the top is larger than the new digit and k > 0, pop. Then trim from the end and strip leading zeros.",
  ],
  brute: "k rounds, each trying every single-digit removal and keeping the smallest result: O(k · n²). Correct (one best removal at a time is optimal), but hopeless at n = 10⁵.",
  invariant: "The stack is non-decreasing from bottom to top, and it is the smallest possible prefix of the answer using the digits seen so far and the removals spent so far.",
  traps: [
    "Stopping when the digits become non-decreasing with removals left: remove the remaining k from the end.",
    "Leading zeros: \"10200\" with k = 1 is \"200\", not \"0200\".",
    "Returning \"\" instead of \"0\" when every digit is removed or only zeros remain.",
    "Comparing with > versus ≥ when popping: equal digits must stay, or you remove more than needed.",
  ],
  followUps: [
    "316 Remove Duplicate Letters: the same stack, but a letter can be popped only if it appears again later.",
    "321 Create Maximum Number: pick the largest k-digit subsequence from each of two arrays, then merge.",
    "Make the number as large as possible instead.",
    "1673 Find the Most Competitive Subsequence: the same algorithm on an integer array.",
  ],
  explanation: [
    "The leftmost digits matter most. Among numbers of the same length, the smaller one is smaller at the first position where they differ. So removing one digit: delete the first digit that is larger than its right neighbour (a \"peak\"), which lets a smaller digit move one place left. If the digits never go down, delete the last one.",
    "Repeating that k times is quadratic, but a stack does it in one pass. Push digits left to right; before pushing d, pop every larger digit on top while removals remain. Each pop is exactly the peak removal the slow version would make.",
    "If removals are left at the end, the stack is non-decreasing, so drop digits from its end. Finally strip leading zeros and return \"0\" for an empty result.",
    { tip: "Signal: \"smallest or largest subsequence of a given length\", \"remove k to minimise\". Use a monotonic stack with a budget of pops." },
  ],
  analysis: {
    time: "O(n): every digit is pushed and popped at most once",
    space: "O(n)",
    notes: [
      "Use the result string itself as the stack (push_back, pop_back).",
      "The greedy is optimal by an exchange argument: if the answer keeps a peak digit that could have been removed, swapping the choice gives a smaller number.",
    ],
  },
  tests: {
    fn: "removeKdigits",
    args: [{ type: "string", name: "num" }, { type: "int", name: "k" }],
    starter: `class Solution {
public:
    string removeKdigits(string num, int k) {

    }
};`,
    reference: `class Solution {
public:
    string removeKdigits(string num, int k) {
        string st;  // non-decreasing digits
        for (char d : num) {
            while (k > 0 && !st.empty() && st.back() > d) st.pop_back(), --k;
            st.push_back(d);
        }
        st.resize(st.size() - min<size_t>(k, st.size()));  // removals left: drop from the end
        size_t z = st.find_first_not_of('0');
        return z == string::npos ? "0" : st.substr(z);
    }
};`,
    brute: `class Solution {
public:
    // k rounds of "try every single removal, keep the smallest": O(k * n^2).
    string removeKdigits(string num, int k) {
        while (k-- > 0 && !num.empty()) {
            string best;
            for (size_t i = 0; i < num.size(); ++i) {
                string t = num.substr(0, i) + num.substr(i + 1);
                if (best.empty() && i == 0) best = t;
                else if (t < best) best = t;  // equal lengths, so string order is numeric order
            }
            num = best;
        }
        size_t z = num.find_first_not_of('0');
        return z == string::npos ? "0" : num.substr(z);
    }
};`,
    cases: [
      { name: "example", args: ['"1432219"', "3"] },
      { name: "leading zeros", args: ['"10200"', "1"] },
      { name: "remove everything", args: ['"10"', "2"] },
      { name: "increasing", args: ['"12345"', "2"] },
      { name: "equal digits", args: ['"1111"', "2"] },
      { name: "k = 0", args: ['"9"', "0"] },
      { name: "zeros remain", args: ['"100"', "1"] },
    ],
    random: { count: 400, gen: "num = rnd_str(rnd(1, 8), \"0123456789\"); if (num.size() > 1 && num[0] == '0') num[0] = '1'; k = rnd(0, num.size());" },
    stress: { label: "10⁵ digits, k = 5·10⁴", gen: "num = rnd_str(100000, \"0123456789\"); num[0] = '7'; k = 50000;" },
  },
});
