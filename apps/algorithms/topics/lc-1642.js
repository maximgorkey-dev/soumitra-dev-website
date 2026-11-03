import { light } from "./leet-light.js";

export const lc1642 = light({
  number: 1642,
  title: "Furthest Building You Can Reach",
  slug: "furthest-building-you-can-reach",
  difficulty: "M",
  pattern: "D2",
  topic: "D2 · Greedy with a heap and regret",
  themes: ["Heap", "Regret"],
  blurb: "Spend ladders on the climbs first, keeping them in a min-heap; once there are more climbs than ladders, pay bricks for the smallest one.",
  statement: [
    "You walk along buildings of the given heights. Stepping down or level is free. Stepping up by d needs either d bricks or one ladder.",
    "With the given bricks and ladders, return the index of the furthest building you can reach. Up to 10⁵ buildings, heights up to 10⁶, bricks up to 10⁹.",
  ],
  hints: [
    "Which climbs deserve the ladders?",
    "The largest ones. But you do not know the future, so tentatively give every climb a ladder.",
    "Keep ladder climbs in a min-heap of size ladders; when it overflows, pay bricks for the smallest.",
  ],
  brute: "Binary search the answer and check each prefix by sorting its climbs: O(n log² n). Or try every ladder assignment: exponential.",
  invariant: "After building i, the heap holds the ladders largest climbs so far, and bricks have paid for all the others.",
  traps: [
    "Using bricks greedily first: a small brick budget gets wasted on an early huge climb.",
    "Pushing descents onto the heap; only climbs count.",
    "Off by one: return the last index you stood on, which may be n − 1.",
  ],
  followUps: [
    "Binary search on the answer with a sorted check: a good second solution.",
    "Ladders cover at most a fixed height.",
    "Same regret pattern: 630, 871.",
  ],
  explanation: [
    "For any reachable prefix, the best use of L ladders is on its L largest climbs, paying bricks for the rest. So walk forward, and for each climb, tentatively use a ladder by pushing its height onto a min-heap.",
    "If the heap holds more climbs than ladders, the smallest of them should have used bricks: pop it and subtract it from the bricks. When the bricks go negative, the current building cannot be reached, so the answer is the one before it.",
    { tip: "Signal: two resources, one flexible (bricks) and one all-or-nothing (ladders). Give the all-or-nothing ones to the biggest costs, using a heap to change your mind." },
  ],
  analysis: {
    time: "O(n log L)",
    space: "O(L)",
    notes: [],
  },
  tests: {
    fn: "furthestBuilding",
    args: [{ type: "vector<int>", name: "heights" }, { type: "int", name: "bricks" }, { type: "int", name: "ladders" }],
    starter: `class Solution {
public:
    int furthestBuilding(vector<int>& heights, int bricks, int ladders) {

    }
};`,
    reference: `class Solution {
public:
    int furthestBuilding(vector<int>& heights, int bricks, int ladders) {
        priority_queue<int, vector<int>, greater<int>> laddered;
        for (int i = 0; i + 1 < (int)heights.size(); ++i) {
            int d = heights[i + 1] - heights[i];
            if (d <= 0) continue;
            laddered.push(d);
            if ((int)laddered.size() > ladders) {
                bricks -= laddered.top();  // the smallest climb pays bricks instead
                laddered.pop();
                if (bricks < 0) return i;
            }
        }
        return heights.size() - 1;
    }
};`,
    brute: `class Solution {
public:
    // For each prefix, ladders on its largest climbs and bricks for the rest: O(n^2 log n).
    int furthestBuilding(vector<int>& heights, int bricks, int ladders) {
        int n = heights.size(), best = 0;
        for (int j = 1; j < n; ++j) {
            vector<int> climbs;
            for (int i = 0; i < j; ++i) if (heights[i + 1] > heights[i]) climbs.push_back(heights[i + 1] - heights[i]);
            sort(climbs.rbegin(), climbs.rend());
            long long need = 0;
            for (size_t c = ladders; c < climbs.size(); ++c) need += climbs[c];
            if (need > bricks) break;
            best = j;
        }
        return best;
    }
};`,
    cases: [
      { name: "example", args: ["{4, 2, 7, 6, 9, 14, 12}", "5", "1"] },
      { name: "example 2", args: ["{4, 12, 2, 7, 3, 18, 20, 3, 19}", "10", "2"] },
      { name: "example 3", args: ["{14, 3, 19, 3}", "17", "0"] },
      { name: "one building", args: ["{5}", "0", "0"] },
      { name: "bricks first is wrong", args: ["{1, 5, 6, 7}", "2", "1"] },
    ],
    random: { count: 400, gen: "{ heights = rnd_vec(rnd(1, 10), 1, 10); bricks = rnd(0, 12); ladders = rnd(0, 3); }" },
    stress: { label: "10⁵ buildings", gen: "{ heights = rnd_vec(100000, 1, 1000000); bricks = 1000000000; ladders = 1000; }" },
  },
});
