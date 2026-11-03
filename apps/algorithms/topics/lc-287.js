import { light } from "./leet-light.js";

export const lc287 = light({
  number: 287,
  title: "Find the Duplicate Number",
  slug: "find-the-duplicate-number",
  difficulty: "M",
  pattern: "C4",
  topic: "C4 · Cyclic placement",
  see: 41,
  themes: ["O(1) space", "Cycle detection", "Read-only input"],
  blurb: "Read i → nums[i] as a linked list. The duplicate value has two incoming arrows, so it is the entry of a cycle: Floyd's tortoise and hare finds it.",
  statement: [
    "An array of n + 1 integers contains values from 1 to n only, so some value repeats (possibly many times). Return the repeated value without modifying the array, using O(1) extra space.",
    "n up to 10⁵.",
  ],
  hints: [
    "Why must there be a repeat? Pigeonhole: n + 1 values in 1 … n.",
    "Treat each index as a node with an arrow to nums[i]. Starting from index 0, what shape do you walk?",
    "A path that ends in a cycle (a ρ shape). The repeated value is where the path enters the cycle.",
    "Floyd: a slow and a fast pointer meet inside the cycle; then restart one from 0 and step both by one until they meet at the entry.",
  ],
  brute: "Compare every pair: O(n²). Sorting or a hash set is O(n log n) or O(n) space, both against the rules.",
  invariant: "After the first phase, slow and fast meet at a node whose distance from the cycle entry, going forward, equals the distance from node 0 to the entry (modulo the cycle length).",
  traps: [
    "Starting at index 0 matters: no value points to 0, so 0 is on the tail, not the cycle.",
    "Cyclic placement (41's swaps) finds it too, but modifies the array.",
    "The duplicate can occur more than twice.",
  ],
  followUps: [
    "Binary search on the value: count elements ≤ mid; if the count exceeds mid, the duplicate is ≤ mid. O(n log n) time, O(1) space, no cycles.",
    "142 Linked List Cycle II: the same Floyd entry argument.",
    "442 Find All Duplicates: when modification is allowed, mark by sign.",
  ],
  explanation: [
    "Build the function f(i) = nums[i] on the indices 0 … n. Since values are in 1 … n, following f from 0 never stops, and with finitely many nodes it must eventually loop. The node where the tail joins the loop has two predecessors: one on the tail, one on the loop. Two indices pointing to the same node means two equal values, so that node is the duplicate.",
    "Floyd's algorithm finds the loop entry in O(1) space. Phase one: slow moves one step, fast two, until they meet inside the loop. Phase two: move one pointer back to 0 and step both one at a time; they meet exactly at the entry. The distance arithmetic: if the tail has length a and the meeting point is b steps into a loop of length c, then 2(a + b) = a + b + kc, so a ≡ −b (mod c).",
    { tip: "Signal: values in 1 … n, read-only, O(1) space. Read the array as a function and look for a cycle." },
  ],
  analysis: {
    time: "O(n)",
    space: "O(1)",
    notes: ["The binary-search-on-value alternative is O(n log n) and easier to prove in an interview."],
  },
  tests: {
    fn: "findDuplicate",
    args: [{ type: "vector<int>", name: "nums" }],
    starter: `class Solution {
public:
    int findDuplicate(vector<int>& nums) {

    }
};`,
    reference: `class Solution {
public:
    int findDuplicate(vector<int>& nums) {
        int slow = 0, fast = 0;
        do slow = nums[slow], fast = nums[nums[fast]];
        while (slow != fast);  // met inside the cycle
        slow = 0;
        while (slow != fast) slow = nums[slow], fast = nums[fast];
        return slow;  // the cycle's entry: the value with two incoming arrows
    }
};`,
    brute: `class Solution {
public:
    // Compare every pair: O(n^2).
    int findDuplicate(vector<int>& nums) {
        for (size_t i = 0; i < nums.size(); ++i)
            for (size_t j = i + 1; j < nums.size(); ++j)
                if (nums[i] == nums[j]) return nums[i];
        return -1;
    }
};`,
    cases: [
      { name: "example", args: ["{1, 3, 4, 2, 2}"] },
      { name: "example 2", args: ["{3, 1, 3, 4, 2}"] },
      { name: "many copies", args: ["{3, 3, 3, 3, 3}"] },
      { name: "n = 1", args: ["{1, 1}"] },
    ],
    random: { count: 400, gen: "{ int lt_n = rnd(1, 9); nums.resize(lt_n + 1); for (int i = 0; i < lt_n; ++i) nums[i] = i + 1; nums[lt_n] = rnd(1, lt_n); for (int i = 0; i < rnd(0, 2); ++i) nums[rnd(0, lt_n)] = nums[lt_n]; for (int i = lt_n; i > 0; --i) swap(nums[i], nums[rnd(0, i)]); }" },
    stress: { label: "10⁵ + 1 values, duplicate placed last", gen: "nums.resize(100001); for (int i = 0; i < 100000; ++i) nums[i] = i + 1; nums[100000] = 99999; swap(nums[0], nums[99999]);" },
  },
});
