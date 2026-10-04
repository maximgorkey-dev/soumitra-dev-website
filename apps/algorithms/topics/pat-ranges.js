/**
 * Ranges pipelines, before and after: hand-written loops with temporary
 * vectors, then a lazy filter | transform pipeline.
 */

import { add, box, promote, sceneWith } from "./pat-common.js";
import { ranges as n } from "./pat-modern-notes.js";

const BEFORE = `// Before: each step is its own loop, writing a temporary vector for the next.
#include <algorithm>
#include <cstdio>
#include <iterator>
#include <vector>

int main() {
    std::vector<int> nums{1, 2, 3, 4, 5, 6};

    std::vector<int> evens;
    std::copy_if(nums.begin(), nums.end(), std::back_inserter(evens), [](int x) { return x % 2 == 0; });

    std::vector<int> squares;
    std::transform(evens.begin(), evens.end(), std::back_inserter(squares), [](int x) { return x * x; });

    for (int x : squares)
        std::printf("%d\\n", x);
}
`;

const before = (edited) => ({
  objects: [
    box("src", "nums", "client", 0, 0.02, ["1 2 3 4 5 6"]),
    box("evens", "vector evens", "concrete", 0.5, 0.02, ["copy_if even", "2 4 6"]),
    box("sq", "vector squares", "concrete", 1, 0.02, ["transform x * x", "4 16 36"]),
    ...(edited ? [box("first", "vector firstTwo", "concrete", 1, 0.5, [add("copy the first 2"), "4 16"], "new")] : []),
    box("out", "for (x : …)", "code", 0.5, 0.95, ["print x"], edited ? "edited" : undefined),
  ],
  links: [
    { from: "src", to: "evens", kind: "calls" },
    { from: "evens", to: "sq", kind: "calls" },
    ...(edited ? [{ from: "sq", to: "first", kind: "calls" }, { from: "first", to: "out", kind: "calls" }] : [{ from: "sq", to: "out", kind: "calls" }]),
  ],
});

export const ranges = promote(n, {
  before: { source: BEFORE, note: "The problem: a loop and a temporary vector per step." },
  smell: [
    "A chain of algorithm calls joined by **temporary containers**.",
    "The data flow reads **inside out or bottom up**, spread over several statements.",
    "Every element is processed by each step **even if the next step only needs a few**.",
  ],
  frames: [
    { phase: "Before", note: "Without ranges: copy_if writes the evens into one vector, transform writes their squares into another, then a loop prints.",
      detail: "Two temporary vectors, and the whole input is processed by each step before the next starts.",
      marks: before(false), metrics: [{ label: "temporary vectors", value: "2" }] },
    { phase: "Before", note: "Change request: print only the first two results. Another step means another loop and another temporary.",
      detail: "All six numbers are still filtered and squared, though only two answers are wanted.",
      marks: before(true), metrics: [{ label: "temporary vectors", value: "3" }] },
    { phase: "After", note: "With ranges: nums | filter(even) | transform(square) is one lazy pipeline. Taking two is one more stage, | take(2).",
      detail: "No temporaries, and with take(2) the pipeline stops pulling after the second result.",
      marks: sceneWith(n, { f: "active", t: "active" }), metrics: [{ label: "temporary vectors", value: "3 → 0" }] },
  ],
});
