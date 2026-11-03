import { light } from "./leet-light.js";

export const lc15 = light({
  number: 15,
  title: "3Sum",
  slug: "3sum",
  difficulty: "M",
  pattern: "A5",
  topic: "A5 · Two pointers",
  see: 42,
  themes: ["Pairs and triplets", "Duplicates"],
  blurb: "Sort, fix the smallest element, and close two pointers on the rest. Skip equal values at each of the three positions to avoid duplicates.",
  statement: [
    "Return every distinct triple of values [a, b, c], taken from three different positions, with a + b + c = 0. No triple may appear twice; the order of triples and within a triple does not matter.",
    "Between 3 and 3000 elements, each between −10⁵ and 10⁵.",
  ],
  hints: [
    "If the array is sorted and you fix the first element, what is left?",
    "A two-sum on the rest, for target −a, which two pointers solve in O(n) on a sorted array.",
    "How do you avoid reporting the same triple twice?",
    "Skip a first element equal to the previous one; after a match, move both pointers past equal values.",
  ],
  brute: "Every triple of positions, deduplicated with a set: O(n³), 4.5·10⁹ triples at n = 3000.",
  invariant: "For a fixed i, every pair (l, r) with i < l < r that sums to −nums[i] lies between the pointers: moving l right is safe when the sum is too small, because nums[l] with any r′ ≤ r is smaller still.",
  traps: [
    "Duplicates: [−1, −1, 0, 1] has one answer, not two. Skip equal values at all three positions.",
    "Skipping duplicates of i by comparing with i + 1 instead of i − 1, which skips valid triples like [−1, −1, 2].",
    "Not breaking early: once nums[i] > 0, no triple can sum to 0.",
  ],
  followUps: [
    "16 3Sum Closest: the same scan, tracking the nearest sum.",
    "18 4Sum: one more fixed loop, O(n³); watch overflow in the sum.",
    "259 3Sum Smaller: count, adding r − l at once when the sum is below the target.",
    "Without sorting: a hash set per fixed element, O(n²) but harder to deduplicate.",
  ],
  explanation: [
    "Sort first. For each i, the problem becomes: find pairs in nums[i + 1 …] summing to −nums[i]. On a sorted range two pointers do it: if the sum is too small, move l right; if too large, move r left; on a match, record and move both.",
    "Sorting also makes deduplication local. Equal values are adjacent, so skip i when nums[i] == nums[i − 1], and after a match, step l past copies of nums[l] and r past copies of nums[r].",
    "Total time O(n²): n fixed elements, a linear scan each. Since the answer can have Θ(n²) triples, this is optimal in the worst case.",
    { tip: "Signal: k-sum on an array. Sort, fix k − 2 elements, two pointers for the last two. Dedup by skipping equal neighbours." },
  ],
  analysis: {
    time: "O(n²)",
    space: "O(1) extra besides the output (O(log n) for the sort)",
    notes: [
      "The hash-set version is also O(n²) but slower in practice and needs a set of triples to deduplicate.",
      "Sums fit in int here (3 · 10⁵); in 4Sum with a target up to 10⁹ they do not.",
    ],
  },
  tests: {
    fn: "threeSum",
    args: [{ type: "vector<int>", name: "nums" }],
    normalize: `[](vector<vector<int>> v) { for (auto& t : v) sort(t.begin(), t.end()); sort(v.begin(), v.end()); return v; }`,
    starter: `class Solution {
public:
    vector<vector<int>> threeSum(vector<int>& nums) {

    }
};`,
    reference: `class Solution {
public:
    vector<vector<int>> threeSum(vector<int>& nums) {
        sort(nums.begin(), nums.end());
        int n = nums.size();
        vector<vector<int>> out;
        for (int i = 0; i < n - 2 && nums[i] <= 0; ++i) {
            if (i > 0 && nums[i] == nums[i - 1]) continue;  // same first value as before
            int l = i + 1, r = n - 1;
            while (l < r) {
                int s = nums[i] + nums[l] + nums[r];
                if (s < 0) ++l;
                else if (s > 0) --r;
                else {
                    out.push_back({nums[i], nums[l], nums[r]});
                    while (l < r && nums[l] == nums[l + 1]) ++l;
                    while (l < r && nums[r] == nums[r - 1]) --r;
                    ++l, --r;
                }
            }
        }
        return out;
    }
};`,
    brute: `class Solution {
public:
    // Every triple of positions, deduplicated with a set: O(n^3).
    vector<vector<int>> threeSum(vector<int>& nums) {
        int n = nums.size();
        set<vector<int>> seen;
        for (int i = 0; i < n; ++i)
            for (int j = i + 1; j < n; ++j)
                for (int k = j + 1; k < n; ++k)
                    if (nums[i] + nums[j] + nums[k] == 0) {
                        vector<int> t{nums[i], nums[j], nums[k]};
                        sort(t.begin(), t.end());
                        seen.insert(t);
                    }
        return vector<vector<int>>(seen.begin(), seen.end());
    }
};`,
    cases: [
      { name: "example", args: ["{-1, 0, 1, 2, -1, -4}"] },
      { name: "none", args: ["{0, 1, 1}"] },
      { name: "zeros", args: ["{0, 0, 0, 0}"] },
      { name: "repeated first value", args: ["{-1, -1, 2, -1, 2}"] },
      { name: "extremes", args: ["{-100000, 50000, 50000, 100000, 0, -100000}"] },
    ],
    random: { count: 400, gen: "nums = rnd_vec(rnd(3, 9), -5, 5);" },
    stress: { label: "3000 elements", gen: "nums = rnd_vec(3000, -100000, 100000);" },
  },
});
