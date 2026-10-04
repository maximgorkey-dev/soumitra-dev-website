/**
 * Concepts, before and after: an unconstrained template whose misuse fails
 * deep inside its body, then a named requirement checked at the call.
 */

import { box, promote, sceneWith } from "./pat-common.js";
import { concepts as n } from "./pat-modern-notes.js";

const BEFORE = `// Before: the template's requirement is implicit, found only when its body fails to compile.
#include <cstdio>

struct Square {
    double side;
    double area() const { return side * side; }
};

template <class T>
void printArea(const T& s) {          // what must T have? Read the body to find out.
    std::printf("area = %g\\n", s.area());
}

int main() {
    printArea(Square{3});
    // printArea(std::string("hi"));
    //   error: 'const std::string' has no member named 'area'
    //   — reported inside printArea, after the instantiation stack
}
`;

const before = (misuse) => ({
  objects: [
    box("fn", "template printArea(const T&)", "code", 0.5, 0.02, ["// T needs area()? read the body", "s.area()"],
      misuse ? "edited" : "active"),
    box("sq", "Square", "concrete", 0, 0.95, ["area() ✓"], misuse ? "dim" : "active"),
    box("str", "std::string", "concrete", 1, 0.95,
      misuse ? ["error inside printArea:", "no member named 'area'"] : ["no area()"], misuse ? "edited" : "dim"),
  ],
  links: [{ from: "sq", to: "fn", kind: "calls" }, { from: "str", to: "fn", kind: "calls" }],
  msg: misuse ? { from: "str", to: "fn", label: "printArea(str)" } : { from: "sq", to: "fn", label: "printArea(sq)" },
});

export const concepts = promote(n, {
  before: { source: BEFORE, note: "The problem: an unconstrained template." },
  smell: [
    "Template requirements that live **only in the body** (or in a comment).",
    "Misuse reported **deep inside the template**, with pages of instantiation context.",
    "Overloads that need **`enable_if` tricks** to pick the right template.",
  ],
  frames: [
    { phase: "Before", note: "Without concepts: printArea is a plain template. With a Square it compiles, because Square happens to have area().",
      detail: "Nothing in the signature says area() is needed. That requirement is only discovered by compiling the body.",
      marks: before(false), metrics: [{ label: "requirement stated", value: "nowhere" }] },
    { phase: "Before", note: "Pass a std::string by mistake, and the error points inside printArea's body rather than at the bad call.",
      detail: "In real libraries this is pages of nested templates before the one line that matters.",
      marks: before(true), metrics: [{ label: "error reported at", value: "the template body" }] },
    { phase: "After", note: "With a concept: Shape names the requirement, and printArea(const Shape auto&) states it in the signature.",
      detail: "The same mistake is now rejected at the call, with the message that std::string does not satisfy Shape.",
      marks: sceneWith(n, { concept: "active", fn: "active" }), metrics: [{ label: "error reported at", value: "body → the call" }] },
  ],
});
