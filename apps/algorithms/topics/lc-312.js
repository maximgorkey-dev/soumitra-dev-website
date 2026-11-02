/**
 * 312 Burst Balloons: interval DP over the balloon burst last (catalogue pattern F4).
 */

import { frame } from "../core/trace.js";

const NUMS = [3, 1, 5, 8];

const REFERENCE = `class Solution {
public:
    int maxCoins(vector<int>& nums) {
        int n = nums.size();
        vector<int> v(n + 2, 1);  // a 1 on each side stands for the wall
        for (int i = 0; i < n; ++i) v[i + 1] = nums[i];
        // dp[l][r]: the most coins from bursting every balloon strictly between
        // l and r, while l and r themselves are still standing.
        vector<vector<int>> dp(n + 2, vector<int>(n + 2, 0));
        for (int len = 2; len <= n + 1; ++len)
            for (int l = 0; l + len <= n + 1; ++l) {
                int r = l + len;
                for (int k = l + 1; k < r; ++k)  // k is the LAST balloon to go
                    dp[l][r] = max(dp[l][r], dp[l][k] + dp[k][r] + v[l] * v[k] * v[r]);
            }
        return dp[0][n + 1];
    }
};`;

const BRUTE = `class Solution {
public:
    // Try every bursting order: n! of them.
    int maxCoins(vector<int>& nums) {
        int best = 0;
        for (size_t i = 0; i < nums.size(); ++i) {
            int left = i ? nums[i - 1] : 1, right = i + 1 < nums.size() ? nums[i + 1] : 1;
            vector<int> rest = nums;
            rest.erase(rest.begin() + i);
            best = max(best, left * nums[i] * right + maxCoins(rest));
        }
        return best;
    }
};`;

const STARTER = `class Solution {
public:
    int maxCoins(vector<int>& nums) {

    }
};`;

function* run() {
  const v = [1, ...NUMS, 1];
  const m = v.length;
  const dp = Array.from({ length: m }, () => Array(m).fill(null));
  const filled = new Set();
  const labels = v.map((x, i) => (i === 0 || i === m - 1 ? "wall" : String(i)));

  const grids = ({ l = -1, r = -1, k = -1, cells = {}, arrows = [] } = {}) => {
    const bal = {};
    for (let i = 0; i < m; i++) {
      if (i === l || i === r) bal[`0,${i}`] = "selected";
      else if (i === k) bal[`0,${i}`] = "active";
      else if (l >= 0 && i > l && i < r) bal[`0,${i}`] = "compared";
      else if (i === 0 || i === m - 1) bal[`0,${i}`] = "excluded";
    }
    const table = {};
    for (let a = 0; a < m; a++) for (let b = 0; b < m; b++) {
      if (b <= a) table[`${a},${b}`] = "excluded";
      else if (filled.has(`${a},${b}`)) table[`${a},${b}`] = "visited";
    }
    return [
      { name: "balloons (padded)", values: [v], rowLabels: false, colLabels: labels, cells: bal },
      {
        name: "dp[l][r]: best for everything strictly between l and r",
        values: dp.map((row, a) => row.map((x, b) => (b <= a ? null : x))),
        rowLabels: v.map((_, i) => `l=${i}`), colLabels: v.map((_, i) => `r=${i}`),
        cells: { ...table, ...cells }, arrows,
      },
    ];
  };

  yield frame({
    phase: "Set up",
    note: "Burst all of [3, 1, 5, 8]; each burst pays left × it × right, with 1 beyond each end.",
    detail: "Pad with a 1 on both sides. dp[l][r] is the best for the balloons strictly between l and r while l and r still stand.",
    marks: { grids: grids() },
    metrics: [],
  });

  for (let l = 0; l + 1 < m; l++) { dp[l][l + 1] = 0; filled.add(`${l},${l + 1}`); }
  yield frame({
    phase: "Set up",
    note: "Neighbours with nothing between them score 0. These are the base cases on the first diagonal.",
    marks: { grids: grids() },
    metrics: [],
  });

  for (let len = 2; len < m; len++) {
    for (let l = 0; l + len < m; l++) {
      const r = l + len;
      let best = -1;
      let bk = -1;
      const tries = [];
      for (let k = l + 1; k < r; k++) {
        const val = dp[l][k] + dp[k][r] + v[l] * v[k] * v[r];
        tries.push(`k=${k}: ${dp[l][k]} + ${dp[k][r]} + ${v[l]}·${v[k]}·${v[r]} = ${val}`);
        if (val > best) { best = val; bk = k; }
        if (l === 0 && r === m - 1) {
          yield frame({
            phase: "Whole row",
            note: `Try balloon ${k} (value ${v[k]}) as the last to burst. By then only the walls are its neighbours.`,
            detail: tries[tries.length - 1],
            marks: { grids: grids({ l, r, k, cells: { [`${l},${r}`]: "active", [`${l},${k}`]: "compared", [`${k},${r}`]: "compared" }, arrows: [{ from: [l, k], to: [l, r], state: "active" }, { from: [k, r], to: [l, r], state: "active" }] }) },
            metrics: [{ label: "Best so far", value: String(best) }],
          });
        }
      }
      dp[l][r] = best;
      filled.add(`${l},${r}`);
      yield frame({
        phase: l === 0 && r === m - 1 ? "Done" : `Length ${len}`,
        note: l === 0 && r === m - 1
          ? `The best last balloon is ${bk}. Bursting everything pays ${best} coins.`
          : `dp[${l}][${r}] = ${best}: of the balloons between ${l} and ${r}, burst ${bk} (value ${v[bk]}) last.`,
        detail: tries.join(" · "),
        marks: { grids: grids({ l, r, k: bk, cells: { [`${l},${r}`]: "found", [`${l},${bk}`]: "compared", [`${bk},${r}`]: "compared" }, arrows: [{ from: [l, bk], to: [l, r], state: "path" }, { from: [bk, r], to: [l, r], state: "path" }] }) },
        metrics: l === 0 && r === m - 1 ? [{ label: "Result", value: String(best) }] : [{ label: "Filled", value: `dp[${l}][${r}] = ${best}` }],
      });
    }
  }
}

export const lc312 = {
  id: "lc-312",
  section: "Interview problems",
  topic: "F4 · Interval DP",
  title: "312. Burst Balloons",
  blurb: "Choose the balloon that bursts last, not first: it walls the left part off from the right, so the two halves are independent.",
  structure: { kind: "grid" },
  run,
  explanation: [
    "The obvious recursion picks which balloon to burst first, and it does not decompose: after a burst, the balloons on either side become neighbours, so the left and right parts interact. Every order is different, and there are n! of them.",
    "Turn it around and pick the balloon k that bursts **last** in a range. While everything else between l and r goes, k is still standing, so nothing on its left is ever adjacent to anything on its right. The two sides are separate subproblems, and when k finally goes, its neighbours are exactly l and r, which pays v[l] · v[k] · v[r].",
    "So dp[l][r] is the best for bursting everything strictly between l and r, with l and r still there. That is an open interval, which is why the input is padded with a 1 at each end: the walls are the outermost l and r, and they never burst. Fill by increasing width, so both halves are ready before they are needed; the answer is dp[0][n + 1].",
    { tip: "Signal: an operation that removes an element and is scored by its current neighbours, or merging adjacent pieces at a cost. Ask \"what is the last operation in this range?\" Siblings: 1000 Minimum Cost to Merge Stones, 1547 Minimum Cost to Cut a Stick, 664 Strange Printer." },
  ],
  analysis: {
    time: "O(n³): O(n²) intervals, each trying O(n) last balloons",
    space: "O(n²) for the table",
    notes: [
      "With n ≤ 300 that is about 4.5 × 10⁶ inner steps (n³/6), comfortably fast.",
      "Iterating by length is the simplest correct order. Iterating l downwards and r upwards works too; iterating l upwards does not, because dp[k][r] with k > l is not ready.",
      "Knuth's optimisation does not apply in general here: the best last balloon is not monotone in l and r, because the score depends on the boundary values, not only on interval sums.",
      "The answer fits in int: at most 300 bursts of 100 × 100 × 100.",
    ],
  },
  code: {
    lang: "cpp",
    files: [{
      name: "solution.cpp",
      note: "The LeetCode-shaped solution, plus a main over the animation's input that prints its Result.",
      source: `#include <algorithm>\n#include <cstdio>\n#include <vector>\nusing namespace std;\n\n${REFERENCE}\n\nint main() {\n    vector<int> nums{${NUMS.join(", ")}};\n    printf("%d\\n", Solution().maxCoins(nums));\n}\n`,
      traced: true,
    }],
  },
  problem: {
    number: 312,
    slug: "burst-balloons",
    difficulty: "H",
    tier: "core",
    pattern: "F4",
    themes: ["Interval DP", "Think in reverse"],
    statement: [
      "Balloons in a row each carry a number. Bursting balloon i earns left × nums[i] × right, where left and right are its current neighbours, counting a 1 beyond either end. Once burst, a balloon is gone and its neighbours become adjacent. Return the most coins you can collect by bursting them all.",
      "Up to 300 balloons, each between 0 and 100.",
    ],
    hints: [
      "Choosing which balloon to burst first leaves two sides that later become neighbours, so they are not independent. Is there a choice that does split the row cleanly?",
      "Choose the balloon that bursts last within a range. Until it goes, it separates everything on its left from everything on its right.",
      "Pad with a 1 at both ends. Let dp[l][r] be the best for everything strictly between l and r while l and r still stand. If k goes last, it pays v[l] · v[k] · v[r].",
      "Fill by increasing r − l and return dp[0][n + 1].",
    ],
    brute: "Try every bursting order recursively: n! orders. Memoising on the set of remaining balloons still gives 2ⁿ states, hopeless at n = 300. Load it in the Solve tab: it is correct on small inputs and never finishes the stress case.",
    invariant: "Inside dp[l][r], balloons l and r are never burst, so when k is the last balloon between them its neighbours are exactly l and r, and the subproblems (l, k) and (k, r) never touch.",
    traps: [
      "Making k the first balloon burst instead of the last: then its neighbours depend on the order of everything else.",
      "Closed intervals: the boundaries l and r must still be standing when the last balloon between them goes, so the interval is open.",
      "Forgetting the 1s at both ends, or filling by l then r, so that dp[k][r] is read before it is computed.",
    ],
    followUps: [
      "Return the bursting order as well as the score: store the best k per interval and replay it.",
      "1000 Minimum Cost to Merge Stones: merging exactly k adjacent piles. What does the last merge in a range look like, and why do you need an extra dimension for the pile count?",
      "1547 Minimum Cost to Cut a Stick: the same shape over the cut positions. Which is the first cut there, and why is \"first\" safe in that problem?",
      "The balloons are on a circle. Fix which balloon goes last overall, then the rest is a padded row.",
    ],
    tests: {
      fn: "maxCoins",
      args: [{ type: "vector<int>", name: "nums" }],
      starter: STARTER,
      reference: REFERENCE,
      brute: BRUTE,
      cases: [
        { name: "example", args: ["{3, 1, 5, 8}"] },
        { name: "two balloons", args: ["{1, 5}"] },
        { name: "one balloon", args: ["{7}"] },
        { name: "zeros", args: ["{0, 0, 0}"] },
        { name: "a zero in the middle", args: ["{9, 0, 9}"] },
        { name: "all equal", args: ["{2, 2, 2, 2, 2}"] },
      ],
      random: { count: 200, gen: "nums = rnd_vec(rnd(1, 7), 0, 9);" },
      stress: { label: "300 balloons", gen: "nums = rnd_vec(300, 0, 100);" },
    },
  },
};
