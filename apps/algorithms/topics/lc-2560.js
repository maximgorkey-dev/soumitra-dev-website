import { light } from "./leet-light.js";

export const lc2560 = light({
  number: 2560,
  title: "House Robber IV",
  slug: "house-robber-iv",
  difficulty: "M",
  pattern: "B1",
  topic: "B1 · Binary search on the answer",
  see: 875,
  themes: ["Minimise the maximum", "Greedy check", "No two adjacent"],
  blurb: "Search the capability c; greedily take every house ≤ c that is not next to the last one taken, and check whether that reaches k.",
  statement: [
    "A robber takes from at least k houses, never two adjacent ones. Their capability is the largest amount taken from any single house. Return the minimum possible capability.",
    "Up to 10⁵ houses with amounts up to 10⁹; it is always possible to take k houses.",
  ],
  hints: [
    "Fix a capability c. Which houses are allowed?",
    "Only those with amount ≤ c. Can you take k of them with no two adjacent?",
    "Greedy: scan left to right and take an allowed house whenever the previous house was not taken.",
    "More capability never hurts: binary search c over the amounts.",
  ],
  brute: "Try each distinct amount in increasing order as the capability, with the greedy check: O(n²) when amounts are distinct.",
  invariant: "maxTaken(lo − 1) < k ≤ maxTaken(hi), where maxTaken(c) is the greedy count of non-adjacent houses with amount ≤ c.",
  traps: [
    "Running House Robber's sum DP: the objective here is a count under a cap, not a sum.",
    "In the greedy, skipping only the next index after taking one: that is exactly right; skipping more loses houses.",
  ],
  followUps: [
    "198 House Robber: maximise the sum instead, a two-state DP.",
    "Houses on a circle: the first and last are adjacent. Run the check twice.",
    "Return which houses to take.",
  ],
  explanation: [
    "Turn the optimisation into a yes-or-no question: with capability c, can the robber take k non-adjacent houses whose amounts are all ≤ c? A larger c allows more houses, so the answer flips from no to yes once, and binary search finds the smallest yes.",
    "For a fixed c, taking the leftmost allowed house is never worse than skipping it: any valid choice that skips it can swap its first taken house for this one. So scan left to right, take an allowed house, then skip the next index.",
    "Search c over [min amount, max amount]: O(n log(max)).",
    { tip: "Signal: \"minimise the maximum\" over a selection with a structural constraint. Binary search the cap; the check becomes a greedy count." },
  ],
  analysis: {
    time: "O(n log(max amount))",
    space: "O(1)",
    notes: ["Searching over the sorted distinct amounts gives O(n log n) instead."],
  },
  tests: {
    fn: "minCapability",
    args: [{ type: "vector<int>", name: "nums" }, { type: "int", name: "k" }],
    starter: `class Solution {
public:
    int minCapability(vector<int>& nums, int k) {

    }
};`,
    reference: `class Solution {
public:
    int minCapability(vector<int>& nums, int k) {
        int lo = *min_element(nums.begin(), nums.end());
        int hi = *max_element(nums.begin(), nums.end());
        while (lo < hi) {
            int c = lo + (hi - lo) / 2;
            int taken = 0;
            for (int i = 0; i < (int)nums.size(); ++i)
                if (nums[i] <= c) ++taken, ++i;  // take it, skip its neighbour
            if (taken >= k) hi = c;
            else lo = c + 1;
        }
        return lo;
    }
};`,
    brute: `class Solution {
public:
    // Every distinct amount as the capability, smallest first: O(n^2).
    int minCapability(vector<int>& nums, int k) {
        vector<int> caps(nums);
        sort(caps.begin(), caps.end());
        caps.erase(unique(caps.begin(), caps.end()), caps.end());
        for (int c : caps) {
            int taken = 0;
            for (int i = 0; i < (int)nums.size(); ++i)
                if (nums[i] <= c) ++taken, ++i;
            if (taken >= k) return c;
        }
        return caps.back();
    }
};`,
    cases: [
      { name: "example", args: ["{2, 3, 5, 9}", "2"] },
      { name: "example 2", args: ["{2, 7, 9, 3, 1}", "2"] },
      { name: "k = 1", args: ["{4, 1, 8}", "1"] },
      { name: "alternate forced", args: ["{5, 1, 5, 1, 5}", "3"] },
    ],
    random: { count: 400, gen: "nums = rnd_vec(rnd(1, 9), 1, 9); k = rnd(1, (nums.size() + 1) / 2);" },
    stress: { label: "10⁵ distinct amounts", gen: "nums.resize(100000); for (int i = 0; i < 100000; ++i) nums[i] = 1 + (int)((long long)i * 7919 % 100000) * 10000; k = 50000;" },
  },
});
