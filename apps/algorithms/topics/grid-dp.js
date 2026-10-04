/**
 * Dynamic programming on the grid view: longest common subsequence, the
 * reference 2D table. Each cell is filled from its up, left and diagonal
 * neighbours, and the answer is recovered by walking those choices back.
 */

import { frame } from "../core/trace.js";
import { result, cpp } from "./seq-common.js";

const GRID = { kind: "grid" };

const A = "ABCBDAB";
const B = "BDCABA";

function* lcsRun() {
  const m = A.length;
  const n = B.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => (i === 0 || j === 0 ? 0 : null)));
  const rowLabels = ["∅", ...A];
  const colLabels = ["∅", ...B];
  let filled = 0;

  const grid = (extra = {}) => ({
    name: "dp[i][j] = LCS length of A[0..i) and B[0..j)",
    values: dp.map((r) => [...r]),
    rowLabels,
    colLabels,
    ...extra,
  });
  const metrics = (more = []) => [{ label: "Cells filled", value: `${filled} / ${m * n}` }, ...more];

  yield frame({
    phase: "Set up",
    note: `Find the longest common subsequence of A = "${A}" and B = "${B}".`,
    detail: "Row i and column j stand for the prefixes A[0..i) and B[0..j). The ∅ row and column are 0: nothing is common with an empty string.",
    marks: { grids: [grid()] },
    metrics: metrics(),
  });

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const a = A[i - 1];
      const b = B[j - 1];
      const here = `${i},${j}`;
      filled++;
      if (a === b) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
        yield frame({
          phase: "Fill",
          note: `'${a}' = '${b}': both prefixes end in the same letter, so extend their LCS without it by one: ${dp[i - 1][j - 1]} + 1 = ${dp[i][j]}.`,
          marks: { grids: [grid({
            cells: { [here]: "active", [`${i - 1},${j - 1}`]: "compared" },
            rowMarks: { [i]: "found" }, colMarks: { [j]: "found" },
            arrows: [{ from: [i - 1, j - 1], to: [i, j], state: "active" }],
          })] },
          metrics: metrics(),
        });
      } else {
        const up = dp[i - 1][j];
        const left = dp[i][j - 1];
        dp[i][j] = Math.max(up, left);
        const from = up >= left ? [i - 1, j] : [i, j - 1];
        yield frame({
          phase: "Fill",
          note: `'${a}' ≠ '${b}': at least one of them is not in the LCS, so drop either one and keep the better: max(${up}, ${left}) = ${dp[i][j]}.`,
          detail: up >= left ? `Dropping '${a}' from A is at least as good (the cell above).` : `Dropping '${b}' from B is better (the cell to the left).`,
          marks: { grids: [grid({
            cells: { [here]: "active", [`${i - 1},${j}`]: "compared", [`${i},${j - 1}`]: "compared" },
            rowMarks: { [i]: "active" }, colMarks: { [j]: "active" },
            arrows: [{ from, to: [i, j], state: "active" }],
          })] },
          metrics: metrics(),
        });
      }
    }
  }

  const cells = { [`${m},${n}`]: "selected" };
  const arrows = [];
  const word = [];
  yield frame({
    phase: "Trace back",
    note: `The table is full: dp[${m}][${n}] = ${dp[m][n]} is the length. To recover the letters, walk back from the corner the way each cell was built.`,
    detail: "A diagonal step means the letter was matched; a step up or left means one letter was dropped.",
    marks: { grids: [grid({ cells: { ...cells } })] },
    metrics: metrics([{ label: "LCS so far", value: "–" }]),
  });

  let i = m;
  let j = n;
  while (i > 0 && j > 0) {
    let note;
    const rowMarks = { [i]: "active" };
    const colMarks = { [j]: "active" };
    if (A[i - 1] === B[j - 1]) {
      word.unshift(A[i - 1]);
      cells[`${i},${j}`] = "found";
      rowMarks[i] = "found";
      colMarks[j] = "found";
      arrows.push({ from: [i, j], to: [i - 1, j - 1], state: "path" });
      note = `'${A[i - 1]}' matches here, so it is in the LCS. Step diagonally.`;
      i--; j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      arrows.push({ from: [i, j], to: [i - 1, j], state: "path" });
      note = `No match at ('${A[i - 1]}', '${B[j - 1]}'), and the cell above is as large (${dp[i - 1][j]}): this value came from dropping '${A[i - 1]}'. Step up.`;
      i--;
    } else {
      arrows.push({ from: [i, j], to: [i, j - 1], state: "path" });
      note = `No match at ('${A[i - 1]}', '${B[j - 1]}'), and the cell to the left is larger (${dp[i][j - 1]}): this value came from dropping '${B[j - 1]}'. Step left.`;
      j--;
    }
    if (!cells[`${i},${j}`]) cells[`${i},${j}`] = "selected";
    yield frame({
      phase: "Trace back",
      note,
      marks: { grids: [grid({ cells: { ...cells }, arrows: [...arrows], rowMarks, colMarks })] },
      metrics: metrics([{ label: "LCS so far", value: word.length ? `"${word.join("")}"` : "–" }]),
    });
  }

  const lcs = word.join("");
  yield frame({
    phase: "Done",
    note: `Reached the edge of the table. The longest common subsequence is "${lcs}", length ${dp[m][n]}.`,
    detail: `${m * n} cells, each filled in O(1) from three neighbours. Other subsequences of the same length exist (for example "BDAB"); preferring "up" on ties picked this one.`,
    marks: { grids: [grid({ cells: { ...cells }, arrows: [...arrows] })] },
    metrics: metrics([{ label: "LCS so far", value: `"${lcs}"` }, result(`length = ${dp[m][n]}`), result(`lcs = "${lcs}"`)]),
  });
}

export const lcs = {
  id: "grid-lcs",
  section: "Algorithms",
  topic: "Dynamic programming",
  title: "Longest common subsequence",
  blurb: "Fill a table of prefix answers, each from three neighbours, then walk back to read the letters",
  structure: GRID,
  run: lcsRun,
  explanation: [
    { tip: "**In one line:** the answer for two prefixes depends only on the answers for slightly shorter prefixes, so fill a table of all of them in order and read the result from the corner." },
    "A **subsequence** keeps letters in order but may skip some: \"BCBA\" is a subsequence of \"ABCBDAB\". The longest one common to two strings measures how alike they are, and it is what `diff` computes between two files, line by line.",
    { h: "The recurrence" },
    { list: [
      "**dp[i][j]** is the LCS length of the first *i* letters of A and the first *j* letters of B.",
      "If the last letters **match**, that letter can end the common subsequence: dp[i][j] = dp[i−1][j−1] + 1 (the diagonal arrow).",
      "If they **differ**, one of them is not used, so drop either and take the better: dp[i][j] = max(dp[i−1][j], dp[i][j−1]).",
      "An empty prefix has nothing in common with anything, so row 0 and column 0 are 0.",
    ] },
    { h: "Why it is correct" },
    "Take an optimal common subsequence of the two prefixes. Either it uses both last letters — which forces them to be equal and leaves an optimal answer for both shorter prefixes — or it misses at least one of them, in which case it is a common subsequence of a shorter pair. The recurrence tries exactly these cases. Filling row by row guarantees the up, left and diagonal cells are ready before they are needed.",
    { h: "Reading the answer back" },
    "The table stores lengths, not strings. The letters come from **tracing back** from the corner, asking at each cell which case produced it. That is the general DP shape: compute values forwards, recover the choice backwards, without ever storing a string per cell.",
  ],
  analysis: {
    time: "O(m·n) — one constant-time step per cell",
    space: "O(m·n) for the table; O(min(m, n)) for the length alone",
    notes: [
      "Each row only reads the row above, so two rows suffice if you only need the length. Recovering the letters in linear space needs Hirschberg's divide-and-conquer.",
      "Ties can be broken either way; each choice yields a different, equally long LCS. The listing and animation both prefer \"up\" so that they agree.",
      "Edit distance is the same table with a different recurrence: add 1 for an insertion, a deletion or a substitution, and take the minimum.",
      "Real diff tools use Myers' O((m+n)·D) algorithm, which is fast when the two files differ in few places (small D).",
    ],
  },
  code: cpp("lcs.cpp", `#include <algorithm>
#include <cstdio>
#include <string>
#include <vector>

int main() {
    const std::string a = "ABCBDAB", b = "BDCABA";
    const int m = a.size(), n = b.size();

    // dp[i][j] = LCS length of a[0..i) and b[0..j). Row 0 and column 0 stay 0.
    std::vector<std::vector<int>> dp(m + 1, std::vector<int>(n + 1, 0));
    for (int i = 1; i <= m; ++i)
        for (int j = 1; j <= n; ++j)
            dp[i][j] = a[i - 1] == b[j - 1]
                ? dp[i - 1][j - 1] + 1                     // match: extend the diagonal
                : std::max(dp[i - 1][j], dp[i][j - 1]);    // drop a letter from one side

    // Walk back from the corner, re-asking which case built each cell.
    std::string lcs;
    for (int i = m, j = n; i > 0 && j > 0;) {
        if (a[i - 1] == b[j - 1]) { lcs += a[i - 1]; --i; --j; }
        else if (dp[i - 1][j] >= dp[i][j - 1]) --i;        // ties go up
        else --j;
    }
    std::reverse(lcs.begin(), lcs.end());

    std::printf("length = %d\\n", dp[m][n]);
    std::printf("lcs = \\"%s\\"\\n", lcs.c_str());
}
`),
};
