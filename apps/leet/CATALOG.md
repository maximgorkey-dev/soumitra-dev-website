# Interview problems — catalogue (draft for review)

Planning document only; nothing here is built yet. Target: Google L6 coding
rounds. Edit freely: reorder, retier, cut, add.

## How to read this

**Two axes.**

- **Techniques** (sections A–X) are the primary home. Family → pattern →
  problems. Every problem is taught in exactly one pattern.
- **Themes** (section Y) are title words that span three or more techniques.
  A theme page lists its problems grouped by mechanism, with the signal that
  picks between them. A problem can carry several theme tags.

**Notation.**

- `[core]`, `[stretch]` or `[rare]` after a pattern is my tier for Google L6.
  A tier after a single problem overrides its pattern's tier. In the app
  these are a filter, and you can override any of them.
- `*` marks a pattern's canonical problem: the one its page animates, with
  the others on the ladder after it.
- `E`, `M` or `H` is LeetCode difficulty. `P` means Premium.
- `→` points to a problem's home pattern when it is also listed somewhere
  else.
- Each pattern has an **insight** line, which is the one thing to recognise,
  and a **signal** line, the words in a statement that should trigger it.

**Links.** Every problem gets an "Open on LeetCode" link built from its title
(`https://leetcode.com/problems/<slug>/`). The app stores nothing from
LeetCode beyond the number, title and difficulty.

**Release dates.** Recency filtering uses release dates. LeetCode numbers are
assigned in release order, so the date can be approximated from the number,
then refined from LeetCode's public problem list when this is built:

| Numbers | Released (approx.) |
|---|---|
| 1–450 | up to 2016 |
| 450–800 | 2017 |
| 800–1000 | 2018 |
| 1000–1300 | 2019 |
| 1300–1700 | 2020 |
| 1700–2100 | 2021 |
| 2100–2500 | 2022 |
| 2500–3000 | 2023 |
| 3000–3400 | 2024 |
| 3400+ | 2025–26 |

> **Recent problems** (3000+) are in section Z. They were picked from a saved
> list of 446 recent medium and hard problems. Z1 holds problems whose
> solution I know. Z2 holds newer ones placed from their title only, which
> need their statement read before they are final. Problems below 3000 come
> from the main sections.

**Per-problem page** (from the earlier discussion):

- The statement in my own words, and the link.
- A hint ladder.
- The brute force, and where it breaks; the sandbox can show it timing out.
- The key invariant.
- An animation, using an existing view where possible.
- A C++ solution.
- Traps.
- Follow-ups for L6: streaming, scale, online, concurrent, generalising to k.
- Hidden tests.

Pages have a study mode and an attempt-first mode, switchable per page.

**Pilot:** 84, 312 and 4.

---

## A. Arrays and invariants

**A1. Prefix sums with a hash map** `[core]`

- Insight: a subarray sum is a difference of two prefix sums, so count
  earlier prefixes that complete the target.
- Signal: count or find subarrays with sum (or sum mod k) equal to something;
  negative numbers are allowed.
- Problems: 560 Subarray Sum Equals K (M)\*; 523 Continuous Subarray Sum (M);
  974 Subarray Sums Divisible by K (M); 1074 Number of Submatrices That Sum
  to Target (H).

**A2. Monotonic stack** `[core]`

- Insight: keep a stack that is always increasing (or decreasing). An
  element's pop is the moment its next smaller (or greater) element is found.
- Signal: next greater or smaller, a span, "visible", the largest rectangle.
- Problems: 84 Largest Rectangle in Histogram (H)\*; 85 Maximal Rectangle (H);
  316 Remove Duplicate Letters (M); 402 Remove K Digits (M); 1944 Number of
  Visible People in a Queue (H); 654 Maximum Binary Tree (M).
- Also listed under X1, contribution counting: 907, 2104.

**A3. Monotonic deque** `[core]`

- Insight: the window maximum (or minimum) is at the deque front; drop
  dominated elements from the back.
- Signal: max or min over a sliding window, or DP over the last k states.
- Problems: 239 Sliding Window Maximum (H)\*; 862 Shortest Subarray with Sum
  at Least K (H); 1499 Max Value of Equation (H); 1696 Jump Game VI (M); 1438
  Longest Continuous Subarray With Absolute Diff Less Than or Equal to Limit
  (M).

**A4. Variable sliding window** `[core]`

- Insight: when the constraint is monotone in window size, grow the right
  edge and shrink the left. "Exactly K" = at most K − at most K−1.
- Signal: longest or shortest substring or subarray with at most K of
  something, all non-negative.
- Problems: 76 Minimum Window Substring (H)\*; 3 Longest Substring Without
  Repeating Characters (M); 992 Subarrays with K Different Integers (H); 340
  Longest Substring with At Most K Distinct Characters (M, P); 1004 Max
  Consecutive Ones III (M); 424 Longest Repeating Character Replacement (M);
  438 Find All Anagrams in a String (M); 567 Permutation in String (M).

**A5. Two pointers after sorting** `[core]`

- Insight: once sorted, move the pointer that cannot be part of a better
  answer.
- Signal: pairs or triplets meeting a sum, or water held between bars.
- Problems: 42 Trapping Rain Water (H)\*; 15 3Sum (M); 881 Boats to Save
  People (M).

**A6. Rotation** `[core]`

- Insight: every rotation of s is a substring of s + s; in-place rotation is
  three reversals.
- Signal: "rotate", "shift", "circular", "obtained by rotating".
- Problems: 796 Rotate String (E)\*; 189 Rotate Array (M); 1752 Check if
  Array Is Sorted and Rotated (E); 1888 Minimum Number of Flips to Make the
  Binary String Alternating (M); 899 Orderly Queue (H).
- 899's lemma: for k ≥ 2 the answer is just the sorted string.
- Also listed elsewhere: 33, 81, 153 and 154 → B3; 61 → T1; 48 and 1886 → S1.

**A7. Bitwise OR / AND over subarrays** `[stretch]`

- Insight: over subarrays ending at i, there are only O(log V) distinct ORs
  (or ANDs). Carry that small set forward.
- Signal: OR or AND of a subarray, closest to a target, smallest subarray
  with the maximum OR.
- Problems: 898 Bitwise ORs of Subarrays (M)\*; 2411 Smallest Subarrays With
  Maximum Bitwise OR (M); 1521 Find a Value of a Mysterious Function Closest
  to Target (H).

**A8. Prefix parity mask with a hash map** `[stretch]`

- Insight: "every character count is even" means equal prefix parity masks,
  so hash the masks, as in A1.
- Signal: substrings where counts are even, or at most one is odd.
- Problems: 1371 Find the Longest Substring Containing Vowels in Even Counts
  (M)\*; 1915 Number of Wonderful Substrings (M); 1542 Find Longest Awesome
  Substring (H).

## B. Binary search

**B1. Binary search on the answer** `[core]`

- Insight: if feasible(x) is monotone, search x and write a greedy check.
  This covers both minimising the maximum and maximising the minimum.
- Signal: "minimum speed, capacity or time such that…", or "maximise the
  minimum distance".
- Problems, minimising the maximum: 875 Koko Eating Bananas (M)\*; 1011
  Capacity To Ship Packages Within D Days (M); 410 Split Array Largest Sum
  (H); 1482 Minimum Number of Days to Make m Bouquets (M); 1283 Find the
  Smallest Divisor Given a Threshold (M); 2064 Minimized Maximum of Products
  Distributed to Any Store (M); 1870 Minimum Speed to Arrive on Time (M);
  2187 Minimum Time to Complete Trips (M); 1891 Cutting Ribbons (M, P).
- Problems, maximising the minimum: 1552 Magnetic Force Between Two Balls
  (M); 2226 Maximum Candies Allocated to K Children (M); 2560 House Robber IV
  (M).
- Harder checks: 2141 Maximum Running Time of N Computers (H); 774 Minimize
  Max Distance to Gas Station (H, P), which searches over real numbers.

**B2. Binary search on the value, counting how many are ≤ x** `[core]`

- Insight: the kth smallest of an implicit set is the smallest x with
  count(≤ x) ≥ k.
- Signal: kth smallest where k is huge or the set is too big to list.
- Problems: 668 Kth Smallest Number in Multiplication Table (H)\*; 719 Find
  K-th Smallest Pair Distance (H); 2040 Kth Smallest Product of Two Sorted
  Arrays (H); 1539 Kth Missing Positive Number (E); 378 Kth Smallest Element
  in a Sorted Matrix (M), which has a second solution under E2.

**B3. Binary search on a rotated or partitioned array** `[core]`

- Insight: one half is always sorted, so decide which half is, then whether
  the target is in it. Duplicates break this, giving O(n) in the worst case.
- Signal: "rotated sorted array", "median of two sorted arrays".
- Problems: 4 Median of Two Sorted Arrays (H)\* (pilot); 33 Search in Rotated
  Sorted Array (M); 81 Search in Rotated Sorted Array II (M); 153 Find
  Minimum in Rotated Sorted Array (M); 154 Find Minimum in Rotated Sorted
  Array II (H); 1228 Missing Number In Arithmetic Progression (E, P).

## C. Math lemmas and reframings

This is the home for one-insight problems: the lemma is the whole solution.

**C1. The median minimises the sum of absolute distances** `[core]`

- Insight: f(x) = Σ|aᵢ − x| has its minimum at the median. Weighted versions
  use the weighted median. Separate the axes in 2D Manhattan problems.
- Signal: "minimum moves, cost or distance to make all equal", "meeting
  point".
- Problems: 462 Minimum Moves to Equal Array Elements II (M)\*; 296 Best
  Meeting Point (H, P); 2033 Minimum Operations to Make a Uni-Value Grid (M);
  2448 Minimum Cost to Make Array Equal (H); 1703 Minimum Adjacent Swaps for
  K Consecutive Ones (H), which uses the transformed positions pᵢ − i.
- Also listed elsewhere: 324 → U1. 1515 → M5, where there is no closed form
  in 2D Euclidean distance.

**C2. Reframing the operation** `[core]`

- Insight: restate what the operation really does.
- Signal: an odd-looking operation and "minimum number of operations".
- Problems: 453 Minimum Moves to Equal Array Elements (M)\*, where
  incrementing n−1 elements is the same as decrementing one; 1551 Minimum
  Operations to Make Array Equal (M); 1460 Make Two Arrays Equal by Reversing
  Subarrays (E), where reversals generate every permutation; 2396 Strictly
  Palindromic Number (M), which is always false.

**C3. Majority vote (Boyer–Moore)** `[core]`

- Insight: cancel pairs of different elements; the survivor is the
  candidate.
- Problems: 169 Majority Element (E)\*; 229 Majority Element II (M).

**C4. Pigeonhole, and the index as a hash** `[core]`

- Insight: values in 1..n can be placed at their own index, or read as
  next-pointers.
- Problems: 41 First Missing Positive (H)\*; 287 Find the Duplicate Number
  (M), which is Floyd's cycle detection on i → a[i] (see also G6).

**C5. Exchange argument, for a custom sort order** `[core]`

- Insight: compare two adjacent items and ask which order is better; that
  comparison is the sort key.
- Signal: "arrange to maximise or minimise", or "in what order".
- Problems: 179 Largest Number (M)\*; 406 Queue Reconstruction by Height (M);
  1665 Minimum Initial Energy to Finish Tasks (H), which looks exponential
  but sorts by minimum − actual.

**C6. Checking an arithmetic progression without sorting** `[stretch]`

- Insight: an AP is fixed by its min, its max and its length. Check each
  member with a set.
- Problems: 1630 Arithmetic Subarrays (M)\*; 1502 Can Make Arithmetic
  Progression From Sequence (E); 2367 Number of Arithmetic Triplets (E).

## D. Greedy

**D1. Interval scheduling and covering** `[core]`

- Insight: sort by end to keep the most intervals; sort by start and extend
  reach to cover.
- Problems: 435 Non-overlapping Intervals (M)\*; 452 Minimum Number of Arrows
  to Burst Balloons (M); 1024 Video Stitching (M); 1326 Minimum Number of
  Taps to Open to Water a Garden (H); 55 Jump Game (M); 45 Jump Game II (M).

**D2. Greedy with a heap and regret** `[core]`

- Insight: take greedily, and when a constraint breaks, undo the worst choice
  so far (pop from the heap).
- Problems: 630 Course Schedule III (H)\*; 502 IPO (H); 871 Minimum Number of
  Refueling Stops (H); 1642 Furthest Building You Can Reach (M); 2233 Maximum
  Product After K Increments (M); 2208 Minimum Operations to Halve Array Sum
  (M); 1962 Remove Stones to Minimize the Total (M); 1046 Last Stone Weight
  (E).

**D3. Two passes** `[core]`

- Insight: satisfy the left neighbour in one pass and the right in another,
  then combine.
- Problems: 135 Candy (H)\*.

**D4. Fixing a single violation** `[core]`

- Insight: a sequence can be fixed with one change only if it breaks in one
  place, and the fix is local.
- Problems: 665 Non-decreasing Array (M)\*; 1909 Remove One Element to Make
  the Array Strictly Increasing (E); 1827 Minimum Operations to Make the
  Array Increasing (E).

**D5. Counting the balance** `[core]`

- Insight: track how many opens are still unmatched; a negative balance
  forces an insertion.
- Problems: 921 Minimum Add to Make Parentheses Valid (M)\*; 1541 Minimum
  Insertions to Balance a Parentheses String (M).

## E. Heaps, sweep lines and intervals

**E1. Sweeping over events** `[core]`

- Insight: turn intervals into +1 and −1 events, sort them, and keep a
  running count or an active set.
- Problems: 253 Meeting Rooms II (M, P)\*; 218 The Skyline Problem (H); 732
  My Calendar III (H); 2251 Number of Flowers in Full Bloom (H).

**E2. Two heaps, or a k-way merge** `[core]`

- Insight: keep the median between a max-heap and a min-heap. To walk sorted
  lists in order, push each list's head.
- Problems: 295 Find Median from Data Stream (H)\*; 480 Sliding Window Median
  (H); 23 Merge k Sorted Lists (H); 373 Find K Pairs with Smallest Sums (M);
  378 Kth Smallest Element in a Sorted Matrix (M); 786 K-th Smallest Prime
  Fraction (M); 1439 Find the Kth Smallest Sum of a Matrix With Sorted Rows
  (H); 2386 Find the K-Sum of an Array (H).

**E3. Intervals in an ordered set** `[core]`

- Insight: keep disjoint intervals in a map keyed by start, and merge
  neighbours on insert.
- Problems: 57 Insert Interval (M)\*; 352 Data Stream as Disjoint Intervals
  (H); 715 Range Module (H).

**E4. Top k and frequency** `[core]`

- Insight: a heap of size k, buckets by count when counts are bounded, or
  quickselect.
- Problems: 347 Top K Frequent Elements (M)\*; 692 Top K Frequent Words (M);
  703 Kth Largest Element in a Stream (E); 1985 Find the Kth Largest Integer
  in the Array (M), which compares numbers as strings.

**E5. Staircase search in a sorted matrix** `[core]`

- Insight: start at a corner where one move increases and the other
  decreases.
- Problems: 240 Search a 2D Matrix II (M)\*.

## F. Dynamic programming

**F1. State-machine DP** `[core]`

- Insight: the state is what you hold or the phase you are in; transitions
  are the allowed actions. Draw the automaton first, then write one
  recurrence per state.
- Signal: buy/sell/hold, rob/skip, "alternating", "no three in a row",
  attendance rules.
- Problems, stocks: 121 Best Time to Buy and Sell Stock (E); 122 … II (M);
  123 … III (H); 188 … IV (H)\*; 309 … with Cooldown (M); 714 … with
  Transaction Fee (M).
- Problems, in disguise: 198 House Robber (M); 213 House Robber II (M); 376
  Wiggle Subsequence (M); 801 Minimum Swaps To Make Sequences Increasing (H);
  552 Student Attendance Record II (H); 935 Knight Dialer (M); 1220 Count
  Vowels Permutation (H); 790 Domino and Tromino Tiling (M); 975 Odd Even
  Jump (H).
- Problems, alternation (the state is the sign of the last step): 1911
  Maximum Alternating Subsequence Sum (M); 2036 Maximum Alternating Subarray
  Sum (M, P); 978 Longest Turbulent Subarray (M); 2765 Longest Alternating
  Subarray (E); 1758 Minimum Changes To Make Alternating Binary String (E).

**F2. Literal automata** `[stretch]`

- Insight: write the state table explicitly. A pattern becomes an automaton,
  and a DP can then run over that automaton.
- Problems: 65 Valid Number (H)\*; 8 String to Integer (atoi) (M); 1397 Find
  All Good Strings (H) `[rare]`, which is digit DP over a KMP automaton.
- Also listed elsewhere: 10 → F3.

**F3. DP over two strings** `[core]`

- Insight: dp[i][j] describes prefixes of both strings; the last characters
  decide the transition.
- Problems: 72 Edit Distance (H)\*; 1143 Longest Common Subsequence (M); 97
  Interleaving String (M); 115 Distinct Subsequences (H); 10 Regular
  Expression Matching (H); 44 Wildcard Matching (H); 1312 Minimum Insertion
  Steps to Make a String Palindrome (H).

**F4. Interval DP** `[core]`

- Insight: dp[l][r], built by choosing the last (or first) split. Burst
  Balloons works because you choose which balloon goes last.
- Problems: 312 Burst Balloons (H)\* (pilot); 516 Longest Palindromic
  Subsequence (M); 1039 Minimum Score Triangulation of Polygon (M); 664
  Strange Printer (H); 1000 Minimum Cost to Merge Stones (H); 730 Count
  Different Palindromic Subsequences (H); 241 Different Ways to Add
  Parentheses (M).

**F5. Knapsack and counting** `[core]`

- Insight: process items in the outer loop and capacity in the inner. The
  loop order decides between combinations and permutations.
- Problems: 416 Partition Equal Subset Sum (M)\*; 494 Target Sum (M); 322
  Coin Change (M); 518 Coin Change II (M); 879 Profitable Schemes (H); 1049
  Last Stone Weight II (M), which is knapsack in disguise; 139 Word Break
  (M); 140 Word Break II (H).

**F6. Tree DP, with rerooting** `[core]`

- Insight: return a small tuple from each subtree. Rerooting reuses the
  answer at the parent to get the answer at the child.
- Problems: 124 Binary Tree Maximum Path Sum (H)\*; 337 House Robber III (M);
  968 Binary Tree Cameras (H); 834 Sum of Distances in Tree (H); 2246
  Longest Path With Different Adjacent Characters (H).

**F7. DP sped up with a data structure (the LIS family)** `[core]`

- Insight: patience sorting gives LIS in O(n log n), and many "minimum
  operations" problems reduce to LIS.
- Problems: 300 Longest Increasing Subsequence (M)\*; 354 Russian Doll
  Envelopes (H); 1235 Maximum Profit in Job Scheduling (H); 1671 Minimum
  Number of Removals to Make Mountain Array (H); 1713 Minimum Operations to
  Make a Subsequence (H); 2111 Minimum Operations to Make the Array
  K-Increasing (H); 2407 Longest Increasing Subsequence II (H) `[stretch]`,
  which uses a segment tree.

**F8. Grid and DAG DP** `[core]`

- Insight: DP is valid when moves form a DAG. When they don't, use Dijkstra
  (compare 64 with 1631). Two walkers at once share one state (step, r1, r2).
- Problems: 741 Cherry Pickup (H)\*; 64 Minimum Path Sum (M); 174 Dungeon
  Game (H), which runs backwards; 329 Longest Increasing Path in a Matrix
  (H); 1463 Cherry Pickup II (H); 403 Frog Jump (H); 1340 Jump Game V (H);
  1871 Jump Game VII (M); 2050 Parallel Courses III (H).

**F9. DP keyed by the common difference** `[stretch]`

- Insight: the state is (end index, difference), kept in a hash map per
  index.
- Problems: 1027 Longest Arithmetic Subsequence (M)\*; 413 Arithmetic Slices
  (M); 1218 Longest Arithmetic Subsequence of Given Difference (M); 446
  Arithmetic Slices II - Subsequence (H).

**F10. Counting distinct subsequences** `[stretch]`

- Insight: subtract what was counted at the previous occurrence of the same
  character.
- Problems: 940 Distinct Subsequences II (H)\*; 1987 Number of Unique Good
  Subsequences (H).

**F11. Assigning items to groups: exponential, but on a small state** `[stretch]`

- Insight: n ≤ 15–20 invites a mask over the items. Use plain mask DP,
  enumerate submasks in 3ⁿ, or backtrack with symmetry pruning (skip
  identical buckets). Binary search on the answer can pair with a
  feasibility search.
- Signal: small n, "assign to k workers, bikes or sessions", "partition into
  k".
- Problems: 1723 Find Minimum Time to Finish All Jobs (H)\*; 1066 Campus
  Bikes II (M, P); 847 Shortest Path Visiting All Nodes (H); 1125 Smallest
  Sufficient Team (H); 1434 Number of Ways to Wear Different Hats to Each
  Other (H); 943 Find the Shortest Superstring (H); 1986 Minimum Number of
  Work Sessions to Finish the Tasks (M); 1494 Parallel Courses II (H); 473
  Matchsticks to Square (M); 698 Partition to K Equal Sum Subsets (M); 2305
  Fair Distribution of Cookies (M).
- Look-alike that isn't: 1665 → C5.

**F12. Digit counting and digit DP** `[core]` (moved up at your request)

- Insight: count position by position, carrying a "tight" flag, plus any
  state (a mask, the last digit, a remainder). Some problems have a closed
  form per position.
- Signal: "how many numbers in [1, n] have…".
- Problems: 233 Number of Digit One (H)\*; 400 Nth Digit (M); 1067 Digit
  Count in Range (H, P); 357 Count Numbers with Unique Digits (M); 600
  Non-negative Integers without Consecutive Ones (H); 788 Rotated Digits (M);
  902 Numbers At Most N Given Digit Set (H); 1012 Numbers With Repeated
  Digits (H); 2376 Count Special Integers (H); 2719 Count of Integers (H);
  2801 Count Stepping Numbers in Range (H).

## G. Graphs

**G1. BFS: over a state space, multi-source, and 0-1** `[core]`

- Insight: put whatever matters for the future into the node (position plus
  keys, obstacles left, or direction). Edge weights 0 and 1 mean a deque.
- Problems: 1293 Shortest Path in a Grid with Obstacles Elimination (H)\*;
  200 Number of Islands (M); 994 Rotting Oranges (M); 1368 Minimum Cost to
  Make at Least One Valid Path in a Grid (H); 815 Bus Routes (H); 127 Word
  Ladder (H); 126 Word Ladder II (H); 1306 Jump Game III (M); 1345 Jump Game
  IV (H), which clears each value group after use; 1654 Minimum Jumps to
  Reach Home (M); 694 Number of Distinct Islands (M, P), which uses canonical
  shapes.

**G2. Dijkstra on a modified graph** `[core]`

- Insight: redefine the path cost (a max edge, a bounded number of stops, or
  removal counts) and keep the heap.
- Problems: 778 Swim in Rising Water (H)\*; 787 Cheapest Flights Within K
  Stops (M); 1631 Path With Minimum Effort (M); 2290 Minimum Obstacle Removal
  to Reach Corner (H); 882 Reachable Nodes In Subdivided Graph (H); 1334 Find
  the City With the Smallest Number of Neighbors at a Threshold Distance (M),
  which uses Floyd–Warshall.

**G3. Topological sort** `[core]`

- Insight: Kahn's algorithm with in-degrees. A cycle shows up as nodes left
  over.
- Problems: 269 Alien Dictionary (H, P)\*; 207 Course Schedule (M); 210
  Course Schedule II (M); 1203 Sort Items by Groups Respecting Dependencies
  (H); 2050 → F8.

**G4. Union-find, including offline queries** `[core]`

- Insight: merge components as edges arrive. To answer threshold queries,
  sort the queries and edges together.
- Problems: 827 Making A Large Island (H)\*; 721 Accounts Merge (M); 305
  Number of Islands II (H, P); 684 Redundant Connection (M); 685 Redundant
  Connection II (H); 952 Largest Component Size by Common Factor (H).
- Also listed elsewhere: 1697 → X2; 803 → X3.

**G5. Bridges, articulation points and Euler paths** `[core]`

- Insight: low-link values in a single DFS. For an Euler path, use
  Hierholzer's algorithm and write the path out in post-order.
- Problems: 1192 Critical Connections in a Network (H)\*; 332 Reconstruct
  Itinerary (H); 753 Cracking the Safe (H), which builds a de Bruijn
  sequence.
- The existing bridges and Euler circuit topics in the app cover the
  animation.

**G6. Functional graphs (every node has out-degree 1)** `[core]`

- Insight: the graph is cycles with trees hanging off them. Find the cycles
  (by colouring, or by peeling in-degree 0), then measure the tails.
- Signal: "each person points to one other", "next[i]", "favourite".
- Problems: 2127 Maximum Employees to Be Invited to a Meeting (H)\*; 2360
  Longest Cycle in a Graph (H); 2359 Find Closest Node to Given Two Nodes
  (M); 565 Array Nesting (M); 457 Circular Array Loop (M); 802 Find Eventual
  Safe States (M); 2876 Count Visited Nodes in a Directed Graph (H); 2836
  Maximize Value of Function in a Ball Passing Game (H) `[stretch]`, which
  uses binary lifting.
- Related: 287 → C4; 142 → T1.

**G7. Minimum spanning tree** `[stretch]`

- Problems: 1584 Min Cost to Connect All Points (M)\*; 1489 Find Critical and
  Pseudo-Critical Edges in Minimum Spanning Tree (H).
- The existing Kruskal, Prim and Borůvka topics in the app cover the
  animation.

## H. Trees

**H1. Trees ↔ sequences: reconstruction** `[core]`

- Insight: preorder gives the root, and inorder splits the subtrees. For a
  BST, value bounds alone are enough, which gives O(n). Preorder plus
  postorder isn't unique.
- Problems: 105 Construct Binary Tree from Preorder and Inorder Traversal
  (M)\*; 106 Construct Binary Tree from Inorder and Postorder Traversal (M);
  889 Construct Binary Tree from Preorder and Postorder Traversal (M); 1008
  Construct Binary Search Tree from Preorder Traversal (M); 1028 Recover a
  Tree From Preorder Traversal (H); 536 Construct Binary Tree from String (M,
  P); 255 Verify Preorder Sequence in Binary Search Tree (M, P).
- Also listed elsewhere: 654 → A2.

**H2. Trees ↔ sequences: serialisation** `[core]`

- Insight: a traversal with null markers is unique. A serialised subtree is a
  key you can hash or search.
- Problems: 297 Serialize and Deserialize Binary Tree (H)\*; 449 Serialize
  and Deserialize BST (M); 428 Serialize and Deserialize N-ary Tree (H, P);
  331 Verify Preorder Serialization of a Binary Tree (M), which counts free
  slots; 652 Find Duplicate Subtrees (M); 572 Subtree of Another Tree (E).

**H3. Traversal invariants** `[core]`

- Problems: 236 Lowest Common Ancestor of a Binary Tree (M)\*; 99 Recover
  Binary Search Tree (M); 987 Vertical Order Traversal of a Binary Tree (H).

**H4. Binary lifting** `[stretch]`

- Problems: 1483 Kth Ancestor of a Tree Node (H)\*.

## I. Range-query structures `[stretch]`

**I1. Fenwick tree, segment tree, and merge-sort counting**

- Insight: count pairs i < j with some property by sweeping and querying
  a tree, or during merge sort. Compress coordinates first.
- Problems: 315 Count of Smaller Numbers After Self (H)\*; 307 Range Sum
  Query - Mutable (M); 327 Count of Range Sum (H); 493 Reverse Pairs (H); 699
  Falling Squares (H).

## J. Tries

**J1. String tries** `[core]`

- Problems: 208 Implement Trie (Prefix Tree) (M)\*; 211 Design Add and Search
  Words Data Structure (M); 1268 Search Suggestions System (M); 2416 Sum of
  Prefix Scores of Strings (H); 820 Short Encoding of Words (M); 472
  Concatenated Words (H); 745 Prefix and Suffix Search (H); 336 Palindrome
  Pairs (H); 642 Design Search Autocomplete System (H, P).

**J2. Bitwise tries, for XOR** `[core]`

- Insight: walk from the high bit down, preferring the opposite bit at each
  level.
- Problems: 421 Maximum XOR of Two Numbers in an Array (M)\*; 1707 Maximum
  XOR With an Element From Array (H), which sorts queries offline.

**J3. Implicit tries: counting without building one** `[stretch]`

- Problems: 440 K-th Smallest in Lexicographical Order (H)\*; 386
  Lexicographical Numbers (M).

**J4. A trie driving a search** `[core]`

- Problems: 212 Word Search II (H)\*; 1032 Stream of Characters (H), which
  uses a trie of reversed words.

## K. Strings

**K1. Evaluating expressions: a stack, or recursive descent** `[core]`

- Insight: write one function per precedence level, or use two stacks.
  Parentheses mean recursion.
- Problems: 224 Basic Calculator (H)\*; 227 Basic Calculator II (M); 772
  Basic Calculator III (H, P); 150 Evaluate Reverse Polish Notation (M); 394
  Decode String (M); 439 Ternary Expression Parser (M, P); 1106 Parsing A
  Boolean Expression (H); 736 Parse Lisp Expression (H); 1597 Build Binary
  Expression Tree From Infix Expression (H, P).

**K2. Parentheses** `[core]`

- Problems: 20 Valid Parentheses (E)\*; 32 Longest Valid Parentheses (H),
  which uses a stack of indices or DP; 22 Generate Parentheses (M).
- Also listed elsewhere: 301 → L1; 921 and 1541 → D5.

**K3. Cancellation stacks** `[core]`

- Insight: push each item, and pop when it cancels the top.
- Problems: 735 Asteroid Collision (M)\*; 1544 Make The String Great (E);
  1047 Remove All Adjacent Duplicates In String (E); 1209 Remove All Adjacent
  Duplicates in String II (M).

**K4. Palindromes** `[core]`

- Problems: 5 Longest Palindromic Substring (M)\*; 647 Palindromic Substrings
  (M); 132 Palindrome Partitioning II (H).
- Also listed elsewhere: 214 → K5; 336 → J1; 516 and 730 → F4; 1312 → F3.

**K5. KMP, the Z-function and rolling hashes** `[stretch]`

- Problems: 214 Shortest Palindrome (H)\*; 28 Find the Index of the First
  Occurrence in a String (E); 1392 Longest Happy Prefix (H); 1044 Longest
  Duplicate Substring (H), which is binary search plus a rolling hash; 1316
  Distinct Echo Substrings (H).

**K6. Subsequence matching with next-occurrence tables** `[core]`

- Problems: 792 Number of Matching Subsequences (M)\*; 392 Is Subsequence
  (E); 1055 Shortest Way to Form String (M, P).

## L. Backtracking

**L1. Search with pruning** `[stretch]`

- Problems: 51 N-Queens (H)\*; 37 Sudoku Solver (H); 282 Expression Add
  Operators (H); 980 Unique Paths III (H); 301 Remove Invalid Parentheses
  (H).

## M. Geometry `[core]` (raised at your request)

**M1. Primitives: cross product, orientation, normalising a slope with gcd**

- Problems: 149 Max Points on a Line (H)\*; 593 Valid Square (M); 1232 Check
  If It Is a Straight Line (E).

**M2. Rectangles: overlap, union area, tiling**

- Insight: overlap is an interval intersection per axis. Union area is a
  sweep plus coordinate compression.
- Problems: 850 Rectangle Area II (H)\*; 223 Rectangle Area (M); 836
  Rectangle Overlap (E); 391 Perfect Rectangle (H); 939 Minimum Area
  Rectangle (M); 963 Minimum Area Rectangle II (M).
- The EDA demo can supply pictures here.

**M3. Convex hull (monotone chain)**

- Problems: 587 Erect the Fence (H)\*.

**M4. Sweeping by angle, and circles**

- Problems: 1610 Maximum Number of Visible Points (H)\*; 1453 Maximum Number
  of Darts Inside of a Circular Dartboard (H) `[stretch]`; 1401 Circle and
  Rectangle Overlapping (M).

**M5. The geometric median** `[stretch]`

- Insight: the 2D Euclidean version of C1 has no closed form, so iterate
  towards it (Weiszfeld's algorithm or gradient descent). The page explains
  why the median trick stops working.
- Problems: 1515 Best Position for a Service Centre (H)\*.

## N. Probability and randomised algorithms

**N1. Sampling** `[core]` (reservoir sampling is an L6 follow-up staple)

- Problems: 382 Linked List Random Node (M)\*, which is reservoir sampling;
  398 Random Pick Index (M); 528 Random Pick with Weight (M); 384 Shuffle an
  Array (M), which is Fisher–Yates; 470 Implement Rand10() Using Rand7() (M),
  which is rejection sampling; 478 Generate Random Point in a Circle (M); 497
  Random Point in Non-overlapping Rectangles (M); 519 Random Flip Matrix (M);
  710 Random Pick with Blacklist (H).

**N2. Randomised O(1) structures** `[core]`

- Insight: a vector plus a map from value to index; delete by swapping with
  the last element.
- Problems: 380 Insert Delete GetRandom O(1) (M)\*; 381 Insert Delete
  GetRandom O(1) - Duplicates allowed (H).

**N3. Probability DP and expected value** `[stretch]`

- Problems: 837 New 21 Game (M)\*, which uses a sliding-window sum; 688
  Knight Probability in Chessboard (M); 808 Soup Servings (M); 1230 Toss
  Strange Coins (M, P); 1377 Frog Position After T Seconds (H); 1467
  Probability of a Two Boxes Having The Same Number of Distinct Balls (H).

**N4. Probability lemmas** `[stretch]`

- Problems: 1227 Airplane Seat Assignment Probability (M)\*, where the
  answer is ½ and the page explains why.

**N5. Statistics** `[stretch]`

- Problems: 1093 Statistics from a Large Sample (M)\*.
- Also listed elsewhere: 295 and 480 → E2.

## O. Number theory and combinatorics

**O1. Number representation: bases and digits** `[core]`

- Insight: repeated divmod. Bijective base 26 is off by one, and a negative
  base needs a non-negative remainder.
- Problems: 504 Base 7 (E)\*; 1837 Sum of Digits in Base K (E); 405 Convert a
  Number to Hexadecimal (E), which uses two's complement; 168 Excel Sheet
  Column Title (E); 171 Excel Sheet Column Number (E); 1017 Convert to Base
  -2 (M); 483 Smallest Good Base (H), which is binary search plus a
  geometric series; 166 Fraction to Recurring Decimal (M), which detects a
  remainder cycle; 43 Multiply Strings (M); 67 Add Binary (E); 60 Permutation
  Sequence (H), which uses the factorial number system.

**O2. gcd and lcm, with inclusion–exclusion** `[stretch]`

- Problems: 878 Nth Magical Number (H)\*, which adds binary search; 1201 Ugly
  Number III (M); 858 Mirror Reflection (M).

**O3. Fast exponentiation and modular arithmetic** `[stretch]`

- Problems: 50 Pow(x, n) (M)\*; 372 Super Pow (M).

**O4. Combinatorics: nCr modulo p, Catalan numbers** `[stretch]`

- Problems: 62 Unique Paths (M)\*; 96 Unique Binary Search Trees (M); 1569
  Number of Ways to Reorder Array to Get Same BST (H); 1916 Count Ways to
  Build Rooms in an Ant Colony (H); 1735 Count Ways to Make Array With
  Product (H).

**O5. Primes and factorisation** `[stretch]`

- Problems: 204 Count Primes (M)\*; 829 Consecutive Numbers Sum (H); 264
  Ugly Number II (M).
- Also listed elsewhere: 952 → G4.

## P. Game theory `[stretch]`

**P1. Minimax as DP**

- Problems: 877 Stone Game (M)\*; 486 Predict the Winner (M); 1140 Stone Game
  II (M); 1406 Stone Game III (H); 1510 Stone Game IV (H); 464 Can I Win (M),
  which memoises on a bitmask; 292 Nim Game (E).

**P2. Solving a game backwards over its states**

- Insight: start from the known outcomes and propagate win or loss to their
  predecessors, counting a node's moves to settle draws. Naive recursion
  loops.
- Problems: 913 Cat and Mouse (H)\*.

## Q. Bit manipulation `[stretch]`

**Q1. XOR tricks**

- Problems: 136 Single Number (E)\*; 137 Single Number II (M); 260 Single
  Number III (M); 1310 XOR Queries of a Subarray (M); 1442 Count Triplets
  That Can Form Two Arrays of Equal XOR (M); 1734 Decode XORed Permutation
  (M).

**Q2. Counting bits and bit ranges**

- Problems: 338 Counting Bits (E)\*; 201 Bitwise AND of Numbers Range (M);
  693 Binary Number with Alternating Bits (E); 89 Gray Code (M).

## R. Scheduling simulations `[core]`

**R1. Heaps of free and busy resources over time**

- Insight: one heap holds the available resources and one holds the busy
  ones, keyed by free time. Advance the clock to the next event.
- Problems: 1882 Process Tasks Using Servers (M)\*; 621 Task Scheduler (M);
  1834 Single-Threaded CPU (M); 2402 Meeting Rooms III (H).

## S. Matrix and simulation `[core]`

**S1. In-place transforms and simulations**

- Problems: 48 Rotate Image (M)\*; 54 Spiral Matrix (M); 73 Set Matrix
  Zeroes (M); 289 Game of Life (M); 1886 Determine Whether Matrix Can Be
  Obtained By Rotation (E).

## T. Linked lists `[core]`

**T1. Pointer surgery and cycles**

- Problems: 25 Reverse Nodes in k-Group (H)\*; 138 Copy List with Random
  Pointer (M); 142 Linked List Cycle II (M); 61 Rotate List (M).
- Also listed elsewhere: 23 → E2.

## U. Selection and divide-and-conquer

**U1. Quickselect** `[core]`

- Problems: 215 Kth Largest Element in an Array (M)\*; 973 K Closest Points
  to Origin (M); 324 Wiggle Sort II (M), which takes the median and then
  uses virtual indexing.

**U2. Divide and conquer construction** `[stretch]`

- Problems: 932 Beautiful Array (M)\*.

**U3. Meet in the middle** `[stretch]`

- Insight: n around 40 is too many for 2ⁿ but fine for 2^(n/2) twice. Sort
  one half and binary search into it.
- Problems: 1755 Closest Subsequence Sum (H)\*; 2035 Partition Array Into Two
  Arrays to Minimize Sum Difference (H); 805 Split Array With Same Average
  (H).

**U4. Constructive kth** `[stretch]`

- Problems: 1850 Minimum Adjacent Swaps to Reach the Kth Smallest Number
  (M)\*.
- Also listed elsewhere: 60 → O1; 440 → J3.

## V. Interactive problems (you can only call an API) `[stretch]`

**V1. Search through an API**

- Problems: 1095 Find in Mountain Array (H)\*; 278 First Bad Version (E); 702
  Search in a Sorted Array of Unknown Size (M, P); 843 Guess the Word (H),
  which is minimax over the possible guesses.

## W. Concurrency (C++) `[core as a follow-up]`

Running these needs a deliberate change to the sandbox's thread and process
limit, the fork-bomb guard. Plan that change with the first concurrency page.

**W1. Ordering, barriers and producer–consumer**

- Problems: 1114 Print in Order (E)\*; 1115 Print FooBar Alternately (M);
  1116 Print Zero Even Odd (M); 1117 Building H2O (M); 1195 Fizz Buzz
  Multithreaded (M); 1226 The Dining Philosophers (M); 1188 Design Bounded
  Blocking Queue (M, P); 1242 Web Crawler Multithreaded (M, P).
- Follow-up links: make 146 (LRU) and 981 thread-safe.

## X. Techniques that cut across families

**X1. Contribution counting** `[core]`

- Insight: instead of listing every subarray or substring, count how many of
  them each element contributes to, using its previous and next
  smaller/greater element or its previous occurrence.
- Problems: 907 Sum of Subarray Minimums (M)\*; 2104 Sum of Subarray Ranges
  (M); 828 Count Unique Characters of All Substrings of a Given String (H);
  2262 Total Appeal of A String (H); 891 Sum of Subsequence Widths (H).

**X2. Offline queries** `[core]`

- Insight: sort the queries together with the data, then sweep once with
  union-find, a heap or a Fenwick tree.
- Problems: 1697 Checking Existence of Edge Length Limited Paths (H)\*; 1851
  Minimum Interval to Include Each Query (H); 2503 Maximum Number of Points
  From Grid Queries (H).

**X3. Thinking in reverse**

- Insight: deletions are hard and additions are easy, so process the events
  backwards.
- Problems: 803 Bricks Falling When Hit (H)\*.

**X4. Sorting is allowed when only the multiset matters** `[core]`

- Insight: when an answer depends only on sum, min or max, the order of the
  elements is irrelevant, so sort first.
- Problems: 1498 Number of Subsequences That Satisfy the Given Sum Condition
  (M)\*.
- Also listed elsewhere: 891 → X1.

**X5. Kadane's algorithm and its variants** `[core]`

- Problems: 53 Maximum Subarray (M)\*; 152 Maximum Product Subarray (M); 918
  Maximum Sum Circular Subarray (M); 1186 Maximum Subarray Sum with One
  Deletion (M); 363 Max Sum of Rectangle No Larger Than K (H), the 2D version
  with an ordered set.

**X6. Coordinate compression** (a tag rather than a page)

- Used by 850, 699, 315 and 327.

---

## Z. Recent problems (3000+)

Grouped by home pattern. When this is built, each entry moves into its
pattern's ladder; it stays separate here so the pass is easy to review.

### Z1. Placed, with the mechanism known

**Arrays and windows**

- A1 prefix sums: 3026 Maximum Good Subarray Sum (M), which keeps the minimum
  prefix per value; 3381 Maximum Subarray Sum With Length Divisible by K (M),
  which keeps the minimum prefix per residue.
- A8 parity states: 3445 Maximum Difference Between Even and Odd Frequency II
  (H). Prefix counts for each character pair, keyed by parity state.
- A4 windows: 3306 Count of Substrings Containing Every Vowel and K
  Consonants II (M), using "exactly K" = at most K − at most K−1; 3413 Maximum
  Coins From K Consecutive Bags (M), where the window is anchored at interval
  ends and run in both directions; 3439 and 3440 Reschedule Meetings for
  Maximum Free Time I and II (M), a window over gaps, with prefix and suffix
  maximum gaps for II.
- A7 bitwise windows: 3097 Shortest Subarray With OR at Least K II (M), a
  window with per-bit counts; 3117 Minimum Sum of Values by Dividing Array
  (H) `[stretch]`, a DP over (index, piece, running AND), where only a few
  distinct ANDs occur.
- A6 circular: 3208 Alternating Groups II (M), a window over the doubled
  array (also theme Y4).

**Binary search**

- B1 on the answer:
  - 3296 Minimum Number of Seconds to Make Mountain Height Zero (M), using
    triangular numbers.
  - 3356 Zero Array Transformation II (M), binary search on k plus a
    difference array.
  - 3007 Maximum Number That Sum of the Prices Is Less Than or Equal to K
    (M), binary search plus counting set bits per position (links F12).
  - 3464 Maximize the Distance Between Points on a Square (H), which unfolds
    the perimeter onto a line and then searches with a greedy check.
  - 3049 Earliest Second to Mark Indices II (H) `[stretch]`, binary search
    with a greedy check that uses a heap.
- B2 on the value: 3116 Kth Smallest Amount With Single Denomination
  Combination (H), binary search plus inclusion–exclusion over the lcms of
  subsets (links O2).

**Lemmas and greedy**

- C2 reframing: 3068 Find the Maximum Sum of Node Values (H). The operation
  on edges lets you toggle any even-sized set of nodes, so the tree doesn't
  matter. 3021 Alice and Bob Playing Flower Game (M) reduces to counting odd
  sums.
- C5 exchange argument: 3219 Minimum Cost for Cutting Cake II (H). Take cuts
  in descending cost; each cut costs its price times the pieces it crosses.
- D2 greedy with a heap: 3362 Zero Array Transformation III (M). Sweep the
  starts, keep the available intervals in a max-heap by end, and use one
  only when needed.
- Greedy on differences: 3229 Minimum Operations to Make Array Equal to
  Target (H), which sums the rises in the difference array.

**Sweeps, heaps and ordered sets**

- E1 sweep and difference arrays: 3224 Minimum Array Changes to Make
  Differences Equal (M), with a difference array over the candidate X; 3347
  Maximum Frequency of an Element After Performing Operations II (H), a sweep
  over candidate values; 3394 Check if Grid can be Cut into Sections (M),
  merging intervals per axis.
- E2 sliding two multisets: 3013 Divide an Array Into Subarrays With Minimum
  Cost II (H), the sum of the k−1 smallest in a sliding window; 3321 Find
  X-Sum of All K-Long Subarrays II (H), the top x by frequency in a sliding
  window.
- E3 ordered set: 3244 Shortest Distance After Road Addition Queries II (H).
  The roads never cross, so erase the nodes each road skips.

**Dynamic programming**

- F1 state machine:
  - 3129 and 3130 Find All Possible Stable Binary Arrays I and II (M, H),
    states limited by run length, with a subtraction trick.
  - 3122 Minimum Number of Operations to Satisfy Conditions (M), a DP over
    columns with the colour as the state.
  - 3165 Maximum Sum of Subsequence With Non-adjacent Elements (H): house
    robber under point updates, using a segment tree that stores a 2×2
    state per node. This is a new pattern, I2 below.
- F4 interval: 3472 Longest Palindromic Subsequence After at Most K
  Operations (M), which is 516 with a budget dimension.
- F5 counting: 3082 Find the Sum of the Power of All Subsequences (H), a
  knapsack where each count is weighted by 2^(elements left out); 3333 Find
  the Original Typed String II (H), complement counting with a prefix-sum DP.
- F6 trees: 3203 Find Minimum Diameter After Merging Two Trees (H). The
  answer is max(d₁, d₂, ⌈d₁/2⌉ + ⌈d₂/2⌉ + 1), and it reuses the app's
  tree-diameter topic.
- F7 the LIS family: 3288 Length of the Longest Increasing Path (H), a 2D LIS
  through a fixed point, sorted by x ascending and y descending; 3414 Maximum
  Score of Non-overlapping Intervals (H), which is 1235 with at most four
  picks and a lexicographic tie-break.
- F8 grid: 3363 Find the Maximum Number of Fruits Collected (H). One child is
  forced along the diagonal, and the other two are independent DPs.
- F9 keyed by residue: 3202 Find the Maximum Length of Valid Subsequence II
  (M), with dp[last residue][residue of pair sum].
- F11 bitmask: 3149 Find the Minimum Cost Array Permutation (H), a cyclic
  TSP: fix the start at 0, then rebuild the lexicographically smallest
  answer.

**Graphs**

- G2 modified Dijkstra: 3112 Minimum Time to Visit Disappearing Nodes (M),
  with deadlines; 3419 Minimize the Maximum Edge Weight of Graph (M), which
  reverses the edges, and the threshold turns out not to matter.
- G4 union-find:
  - 3108 Minimum Cost Walk in Weighted Graph (H): walks may repeat edges, so
    the answer is the AND over the whole component.
  - 3235 Check if the Rectangle Corner Is Reachable (H): union the circles
    that touch, then ask whether a group joins two blocking sides. Also
    geometry.
- Two-colouring by parity: 3373 Maximize the Number of Target Nodes After
  Connecting Trees II (H). An even distance means the same colour, so count
  colours. This reuses the app's bipartite-check topic.

**Strings and tries**

- J1 tries: 3045 Count Prefix and Suffix Pairs II (H), a trie keyed by the
  pair (s[i], s[n−1−i]); 3093 Longest Common Suffix Queries (H), a trie over
  reversed words that stores the best index at each node.
- K5 matching:
  - 3023 Find Pattern in Infinite Stream I (M), KMP over a stream, which is
    the L6 follow-up shape.
  - 3303 Find the Occurrence of First Almost Equal Substring (H), the
    Z-function from both ends to allow one mismatch.
  - 3327 Check if DFS Strings Are Palindromes (H), a post-order string plus a
    palindrome check per subtree range.

**Design**

- L, design: 3408 Design Task Manager (M), a heap with lazy deletion; 3369
  Design an Array Statistics Tracker (H), the mean, the median (two heaps
  with lazy deletion) and the mode.

**Geometry**

- M6, new pattern: rotating Manhattan into Chebyshev distance `[core]`. Map
  (x, y) → (x + y, x − y), and the Manhattan distance becomes the larger of
  the two coordinate differences.
  - 3102 Minimize Manhattan Distances (H)\*: the maximum distance is the
    largest range of either coordinate, so try removing each extreme point.
- M2 rectangles: 3453 and 3454 Separate Squares I and II (M, H), binary
  search on the dividing line, with II needing union area by sweep as in 850.
- M1 sorting points: 3027 Find the Number of Ways to Place People II (H),
  sorted by x ascending and y descending, then scanned.

**Number theory and bits**

- O3, widened to fast exponentiation including matrices: 3337 Total
  Characters in String After Transformations II (H), a 26×26 matrix power.
  935 Knight Dialer also gains a matrix-power follow-up.
- O2 gcd: 3312 Sorted GCD Pair Queries (H). Count pairs whose gcd is exactly
  g by subtracting the counts for multiples of g, then binary search each
  query in the prefix sums.
- O4 combinatorics: 3405 Count the Number of Arrays with K Matching Adjacent
  Elements (H), which is C(n−1, k) · m · (m−1)^(n−1−k); 3272 Find the Count of
  Good Integers (H), which enumerates palindromes, removes duplicates by
  digit multiset, and counts permutations without a leading zero.
- Q2 bits: 3133 Minimum Array End (M), which spreads the bits of n−1 into
  the zero bits of x; 3307 Find the K-th Character in String Game II (H),
  which reads the bits of k−1 against the operations.

**I2, new pattern: a segment tree storing DP states** `[stretch]`

- Insight: when a DP has to survive point updates, store a small matrix
  combining the states at each node, and merge children like matrix
  multiplication.
- Problems: 3165\* (see F1 above).

### Z2. Placed from the title only: read each statement before finalising

These are the newest problems in the list, and I don't know their solutions
yet. The placement is what the title suggests.

- F1 state machine, stocks: 3573 Best Time to Buy and Sell Stock V (M), which
  probably adds short selling as a third state; 3652 Best Time to Buy and
  Sell Stock using Strategy (M); 3640 Trionic Array II (H), probably three
  phases (up, down, up); 3699 and 3700 Number of ZigZag Arrays I and II (H),
  alternating DP, with II perhaps needing a matrix power.
- C1 median ladder: 3585 Find Weighted Median Node in Tree (H), a weighted
  median along a tree path, probably with binary lifting.
- Q3, a possible new pattern, the linear XOR basis: 3681 Maximum XOR of
  Subsequences (H).
- A1 balanced as a prefix difference: 3713 and 3714 Longest Balanced
  Substring I and II (M); 3719 and 3721 Longest Balanced Subarray I and II
  (M, H).
- Majority via ±1 prefix sums: 3737 and 3739 Count Subarrays With Majority
  Element I and II (M, H).
- F12 digit DP: 3751 and 3753 Total Waviness of Numbers in Range I and II (M,
  H); 3490 Count Beautiful Numbers (H).
- K1 parsing: 3749 Evaluate Valid Expressions (H).
- L design: 3484 Design Spreadsheet (M); 3508 Implement Router (M); 3815
  Design Auction System (M); 3822 Design Order Management System (M); 3829
  Design Ride Sharing System (M); 3885 Design Event Manager (M).
- G2 Dijkstra variants: 3650 Minimum Cost Path with Edge Reversals (M); 3651
  Minimum Cost Path with Teleportations (H); 3924 Minimum Threshold Path With
  Limited Heavy Edges (H).
- G4 union-find and X3 reverse: 3607 Power Grid Maintenance (M); 3608 Minimum
  Time for K Connected Components (M); 3600 Maximize Spanning Tree Stability
  with Upgrades (H).
- H4 binary lifting: 3532 and 3534 Path Existence Queries in a Graph I and II
  (M, H).
- Cycle decomposition of a permutation: 3551 Minimum Swaps to Sort by Digit
  Sum (M); 3942 Minimum Operations to Sort a Permutation (M).
- A2 monotonic stack: 3542 Minimum Operations to Convert All Elements to Zero
  (M); 3676 Count Bowl Subarrays (M).
- A3 deque plus DP: 3578 Count Partitions With Max-Min Difference at Most K
  (M).
- Y6 jump game: 3660 Jump Game IX (M); 3629 Minimum Jumps to Reach End via
  Prime Teleportation (M).
- U4 constructive kth: 3821 Find Nth Smallest Integer With K One Bits (H).
- M geometry counting: 3623 and 3625 Count Number of Trapezoids I and II (M,
  H).
- E intervals: 4057 Number of Intersecting Interval Pairs II (M); 4086
  Minimum Interval Selection to Cover Target Intervals (H).
- R scheduling and simulation: 4023 Elevator Requests II (H); 3494 Find the
  Minimum Amount of Time to Brew Potions (M); 3510 Minimum Pair Removal to
  Sort Array II (H), probably a linked list plus a heap.
- J2 XOR trie: 3845 Maximum Subarray XOR with Bounded Range (H).
- Tree XOR masks: 3841 Palindromic Path Queries in a Tree (H).

---

## Y. Themes

Each theme page groups its members by mechanism. The signal says which
mechanism applies.

**Y1. Kth**

- Small k, or the items can be listed: selection or a heap (215, 973, 347,
  692, 703, 1985).
- Implicit sorted lists: a k-way merge (373, 378, 786, 1439, 2386).
- Huge k: binary search on the value and count (668, 719, 2040, 1539, and
  378 again).
- Built directly: 60, 440, 1850.

**Y2. Rotation**

- The doubling trick: 796, 1888, 1886.
- Rotated binary search: 33, 81, 153, 154, 1752.
- Rotating in place: 189, 61, 48.
- A lemma: 899.
- A false friend: 788 is about rotating digits, so it belongs to digit DP.

**Y3. "Make the array…" (minimum operations)**

- An invariant decides it: 1460, 453, 1551, 462.
- Greedy: 1827.
- Greedy with a heap: 2233, 2208, 1962.
- A cancellation stack: 1544, 1047, 1209, 735.
- One violation: 1909, 665.
- Reduces to LIS: 1671, 1713, 2111.

**Y4. Alternating**

- Two-state DP: 1911, 2036, 376, 978, 2765, 975.
- Two target patterns: 1758.
- Rotation plus a window: 1888.
- A bit trick: 693.

**Y5. Arithmetic progressions** (just passes the theme test)

- DP keyed by difference: 413, 1027, 1218, 446.
- Checking without sorting: 1630, 1502, 2367.
- Binary search: 1228.

**Y6. Jump game**

- Greedy reach: 55, 45.
- BFS: 1306, 1654, 1345.
- DP with a deque or window: 1696, 1871.
- DP with a monotonic stack or ordered map: 1340, 975.
- DP over a set of jump sizes: 403.

**Y7. Koko-style ("minimum rate, capacity or time such that…")**

- Minimise the maximum: 875, 1011, 410, 1283, 2064, 1870, 2187, 1891.
- Maximise the minimum: 1552, 2226, 2560.
- Real-valued: 774.
- Hard checks: 2141, 1723.

**Y8. Subarray, subsequence and substring**

- Subarray: prefix sums (560, 974), windows (1004, 1438), monotonic stack
  and contribution (907), deque (239, 862), Kadane (53), bitwise sets (898),
  "exactly K" (992).
- Subsequence: LIS (300), two-string DP (1143, 115), next-occurrence tables
  (792), distinct counting (940), sorting is allowed (1498, 891), state
  machine (1911).
- Substring: windows with counts (3, 76, 438), parity masks (1371, 1542),
  hashing (1044, 1316), palindromes (5, 647), contribution (828, 2262).

**Y9. Stock buy-sell**

- Running minimum: 121.
- Greedy over every rise: 122.
- State machine: 123, 188, 309, 714.
- 188 with a large k collapses to 122.

**Y10. Palindrome**

- Expanding around the centre: 5, 647.
- DP: 516, 132, 1312, 730.
- KMP: 214.
- Trie: 336.
- Parity mask: 1542.
- A lemma: 2396.

**Y11. Parentheses**

- Stack: 20, 32, 394.
- Counting the balance: 921, 1541.
- Backtracking: 301.
- Generating: 22.
- Expressions: 224, 241.

**Y12. Intervals and meeting rooms**

- Greedy: 435, 452.
- Sweep: 253, 218, 2251.
- Heaps: 1882, 2402.
- Ordered set: 57, 352, 715.
- DP plus binary search: 1235.

**Y13. Islands**

- DFS or BFS: 200.
- Labelling, then merging: 827.
- Union-find for online additions: 305.
- Canonical shapes: 694.
- Multi-source BFS: 994.

**Y14. Shortest path**

- Plain BFS: 127.
- 0-1 BFS: 1368, 2290.
- Dijkstra: 778, 1631.
- BFS over a state space: 1293, 847.
- Bounded stops: 787.
- DP when the graph is acyclic: 64, 329.

**Y15. Cycle**

- Floyd's algorithm: 142, 287.
- Functional graphs: 2127, 2360.
- Directed graphs, by colouring or topological sort: 207, 802.
- Undirected graphs, with union-find: 684.

**Y16. Stones and stone games**

- Game DP: 877, 1140, 1406, 1510.
- Heap: 1046, 1962.
- Knapsack: 1049.
- Interval DP: 1000.

**Y17. House robber**

- State machine: 198.
- Circular: 213.
- Tree DP: 337.
- Binary search plus greedy: 2560.

**Y18. Number of ways and counting**

- DP: 62, 518, 935.
- Combinatorics: 1569, 1916.
- Contribution: 907, 828.
- Digit DP: 233, 2376.

**Y19. Courses and scheduling**

- Topological sort: 207, 210.
- Greedy with a heap: 630.
- Bitmask DP: 1494.
- Longest path in a DAG: 2050.
- Simulation: 621, 1834.

**Y20. Sorted matrix**

- Staircase walk: 240.
- Binary search on the value: 378, 668.
- K-way merge: 1439.

**Y21. Word and dictionary**

- BFS: 127, 126.
- Trie: 212, 1032.
- Word-break DP: 139, 140.
- Topological sort: 269.
- Concatenation: 472.

**Y22. Base conversion and digits** (bridges O1 and F12)

- Conversion: 504, 1837, 1017, 168.
- Digit counting: 233, 400.
- Digit DP: 902, 2376.

---

## Counts

24 technique families, 96 patterns, 22 themes, and about 400 problems, 23 of
them Premium. 57 patterns are core: that is the default view in the app.
Section Z adds about 60 recent problems placed with their mechanism, and about
50 placed from their title only. It also proposes three new patterns: I2
(DP states in a segment tree), M6 (Manhattan to Chebyshev) and possibly Q3
(the linear XOR basis).
