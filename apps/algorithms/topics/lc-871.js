import { light } from "./leet-light.js";

export const lc871 = light({
  number: 871,
  title: "Minimum Number of Refueling Stops",
  slug: "minimum-number-of-refueling-stops",
  difficulty: "H",
  pattern: "D2",
  topic: "D2 · Greedy with a heap and regret",
  themes: ["Heap", "Regret"],
  blurb: "Drive as far as the fuel allows, remembering every station passed; when you run dry, retroactively refuel at the biggest one passed.",
  statement: [
    "A car starts at 0 with startFuel litres and must reach target miles, using one litre per mile. Stations are [position, fuel], sorted by position; stopping at one adds all its fuel.",
    "Return the fewest stops needed to reach target, or −1 if it is impossible. Up to 500 stations, values up to 10⁹.",
  ],
  hints: [
    "You do not have to decide at a station whether to stop. Could you decide later?",
    "Pretend you passed every station without stopping; when the tank runs dry, which past station would you rather have stopped at?",
    "The one with the most fuel. A max-heap of passed stations.",
  ],
  brute: "DP: dp[j] = furthest reachable with j stops, updated per station from j down: O(n²).",
  invariant: "With s stops so far, the reach is the furthest any s stops among the passed stations can get, and the heap holds the stations passed but not used.",
  traps: [
    "Overflow: reach can sum fuel from 500 stations of 10⁹; use long long.",
    "Pushing a station before checking that it is reachable.",
    "Forgetting the final leg from the last station to target.",
  ],
  followUps: [
    "The O(n²) DP is a good second answer and easy to prove.",
    "Stations have a price: minimise total cost instead (Dijkstra over (station, fuel)).",
    "Same regret idea: 630 Course Schedule III, 1642 Furthest Building.",
  ],
  explanation: [
    "Delay every decision. Drive forward and push the fuel of each station you pass onto a max-heap. When the next station or the target is beyond the current reach, you must have stopped somewhere earlier: pop the largest fuel and count a stop. Repeat until it is reachable, or return −1 if the heap runs out.",
    "Taking the biggest passed station is safe: any set of s stops that gets you past this point can swap one stop for the biggest unused one and reach at least as far.",
    "Each station is pushed and popped at most once.",
    { tip: "Signal: fewest refills or boosts to get past a series of thresholds. Pass everything, keep a heap, and spend from it only when forced." },
  ],
  analysis: {
    time: "O(n log n)",
    space: "O(n)",
    notes: ["The reach needs long long."],
  },
  tests: {
    fn: "minRefuelStops",
    args: [{ type: "int", name: "target" }, { type: "int", name: "startFuel" }, { type: "vector<vector<int>>", name: "stations" }],
    starter: `class Solution {
public:
    int minRefuelStops(int target, int startFuel, vector<vector<int>>& stations) {

    }
};`,
    reference: `class Solution {
public:
    int minRefuelStops(int target, int startFuel, vector<vector<int>>& stations) {
        priority_queue<int> passed;
        long long reach = startFuel;
        int stops = 0, i = 0, n = stations.size();
        while (reach < target) {
            while (i < n && stations[i][0] <= reach) passed.push(stations[i++][1]);
            if (passed.empty()) return -1;
            reach += passed.top();  // refuel at the best station already passed
            passed.pop();
            ++stops;
        }
        return stops;
    }
};`,
    brute: `class Solution {
public:
    // dp[j] = furthest reach with j stops: O(n^2).
    int minRefuelStops(int target, int startFuel, vector<vector<int>>& stations) {
        int n = stations.size();
        vector<long long> dp(n + 1, 0);
        dp[0] = startFuel;
        for (int i = 0; i < n; ++i)
            for (int j = i; j >= 0; --j)
                if (dp[j] >= stations[i][0]) dp[j + 1] = max(dp[j + 1], dp[j] + stations[i][1]);
        for (int j = 0; j <= n; ++j) if (dp[j] >= target) return j;
        return -1;
    }
};`,
    cases: [
      { name: "example", args: ["1", "1", "{}"] },
      { name: "example 2", args: ["100", "1", "{{10, 100}}"] },
      { name: "example 3", args: ["100", "10", "{{10, 60}, {20, 30}, {30, 30}, {60, 40}}"] },
      { name: "biggest is later", args: ["100", "50", "{{25, 25}, {50, 50}}"] },
      { name: "overflow", args: ["1000000000", "1", "{{1, 1000000000}, {2, 1000000000}}"] },
    ],
    random: { count: 400, gen: "{ int lt_n = rnd(1, 8); vector<int> lt_p = rnd_sorted(lt_n, 1, 29); stations.clear(); for (int i = 0; i < lt_n; ++i) stations.push_back({lt_p[i], rnd(1, 10)}); target = rnd(1, 30); startFuel = rnd(1, 12); }" },
    stress: { label: "500 stations", gen: "{ vector<int> lt_p = rnd_sorted(500, 1, 999999999); stations.clear(); for (int i = 0; i < 500; ++i) stations.push_back({lt_p[i], rnd(1, 4000000)}); target = 1000000000; startFuel = 5000000; }" },
  },
});
