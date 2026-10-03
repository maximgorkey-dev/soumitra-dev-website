/**
 * std::variant + std::visit, the modern Visitor. The layout of a variant in
 * memory, and how visit turns the stored index into a call.
 */

import { frame } from "../core/trace.js";
import { MEMORY, printed } from "./pat-common.js";

const VARIANT = `// A closed set of types in one value: no heap, no base class, no pointers.
#include <cstdio>
#include <variant>

struct Circle { double r; };
struct Square { double s; };
using Shape = std::variant<Circle, Square>;

// The "overloaded" helper: one object whose call operator is every lambda.
template <class... F> struct overloaded : F... { using F::operator()...; };

double area(const Shape& shape) {
    return std::visit(overloaded{
        [](const Circle& c) { return 3.14159265 * c.r * c.r; },
        [](const Square& q) { return q.s * q.s; },
    }, shape);
}

int main() {
    std::printf("sizeof(Shape) = %zu\\n", sizeof(Shape));

    Shape s = Circle{2};
    std::printf("index %zu: area %.2f\\n", s.index(), area(s));

    s = Square{3};                     // the Circle is destroyed in place
    std::printf("index %zu: area %.2f\\n", s.index(), area(s));
}
`;

const ACCESS = `// The other ways in, and what happens when you guess wrong.
#include <cstdio>
#include <string>
#include <variant>

int main() {
    std::variant<int, std::string> v = 42;

    if (auto* p = std::get_if<int>(&v))           // a pointer, or nullptr
        std::printf("holds int %d\\n", *p);

    v = std::string("text");
    std::printf("holds a string? %s\\n", std::holds_alternative<std::string>(v) ? "yes" : "no");

    try {
        (void)std::get<int>(v);                   // wrong guess: throws
    } catch (const std::bad_variant_access&) {
        std::printf("std::get<int> threw bad_variant_access\\n");
    }
}
`;

/* ---------------------------------------------------------------- */

const REGIONS = ["Stack", "Static data", "Code"];

function scene({ held = null, readIndex = false, slot = null, fn = null, err = false } = {}) {
  const storage = held === "c" ? "Circle {r = 2}" : held === "s" ? "Square {s = 3}" : "8 bytes, unused";
  const index = held === "c" ? "index = 0" : held === "s" ? "index = 1" : "index";
  return {
    regions: REGIONS,
    blocks: [
      { id: "v", region: "Stack", label: "Shape s   (16 bytes)", state: held ? (readIndex ? "active" : "new") : undefined,
        cells: [
          { t: storage, kind: "buf" },
          { t: index, kind: "tag", state: readIndex ? "active" : undefined },
          { t: "padding (7 bytes)" },
        ] },
      { id: "table", region: "Static data", label: "visit's jump table", state: slot !== null ? "active" : undefined,
        cells: [
          { t: "[0] → Circle lambda", kind: "fn", to: "fc", state: slot === 0 ? "active" : undefined },
          { t: "[1] → Square lambda", kind: "fn", to: "fs", state: slot === 1 ? "active" : undefined },
        ] },
      { id: "fc", region: "Code", label: "(const Circle&)", state: fn === "c" ? "new" : undefined, cells: [{ t: "π · c.r · c.r" }] },
      { id: "fs", region: "Code", label: "(const Square&)", state: fn === "s" ? "new" : undefined, cells: [{ t: "q.s · q.s" }] },
      ...(err ? [{ id: "err", region: "Code", label: "(const Triangle&) ?", state: "leaked",
        cells: [{ t: "error: no matching" }, { t: "call to overloaded" }] }] : []),
    ],
  };
}

function* run() {
  yield frame({
    phase: "Layout",
    note: "std::variant<Circle, Square> is one value big enough for either type, plus an index saying which one it holds.",
    detail: "Storage is the size of the largest alternative (8 bytes); the index is a small integer; alignment pads the total to 16. Nothing is on the heap.",
    marks: scene(),
    metrics: [printed("sizeof(Shape) = 16")],
  });
  yield frame({
    phase: "Hold",
    note: "Shape s = Circle{2}: the Circle is constructed inside the variant's own storage, and the index is set to 0.",
    detail: "Compare type erasure: there, each value was a heap object behind a pointer. Here the object is in the variant.",
    marks: scene({ held: "c" }),
    metrics: [{ label: "heap objects", value: "0" }],
  });
  yield frame({
    phase: "Visit",
    note: "std::visit reads the index…",
    marks: scene({ held: "c", readIndex: true }),
    metrics: [],
  });
  yield frame({
    phase: "Visit",
    note: "…and uses it to pick an entry in a table generated at compile time: one entry per alternative.",
    detail: "Each entry is a function that casts the storage to the right type and calls the matching lambda. Typically one indirect call — the same cost as a virtual call, with no vptr in the object.",
    marks: scene({ held: "c", readIndex: true, slot: 0 }),
    metrics: [],
  });
  yield frame({
    phase: "Visit",
    note: "The Circle overload runs with a const Circle&.",
    marks: scene({ held: "c", slot: 0, fn: "c" }),
    metrics: [printed("index 0: area 12.57")],
  });
  yield frame({
    phase: "Hold",
    note: "s = Square{3}: the Circle is destroyed, a Square is constructed in the same 8 bytes, and the index becomes 1.",
    detail: "Assignment between alternatives is destroy-then-construct, in place. The variant's size never changes.",
    marks: scene({ held: "s" }),
    metrics: [{ label: "heap objects", value: "0" }],
  });
  yield frame({
    phase: "Visit",
    note: "The same visit now reads index 1 and jumps to the Square overload.",
    marks: scene({ held: "s", readIndex: true, slot: 1, fn: "s" }),
    metrics: [printed("index 1: area 9.00")],
  });
  yield frame({
    phase: "Done",
    note: "Add Triangle to the variant and forget its lambda: the program stops compiling.",
    detail: "std::visit requires the visitor to accept every alternative. That exhaustiveness check is the main reason to prefer variant over the classic Visitor — the compiler finds every place a new type must be handled.",
    marks: scene({ held: "s", err: true }),
    metrics: [],
  });
}

export const variant = {
  id: "pat-variant",
  section: "Design patterns",
  topic: "Modern C++",
  title: "std::variant + std::visit",
  blurb: "A closed set of types stored by value, with exhaustive, compiler-checked dispatch — the modern Visitor.",
  structure: MEMORY,
  run,

  explanation: [
    { tip: "**In one line:** `std::variant<A, B, C>` holds exactly one of a fixed list of types, in place; `std::visit` calls the right overload for whichever it holds." },
    "This is the modern answer to the classic **Visitor** — and to a lot of what inheritance was used for. When the set of types is **known and closed** (the shapes in a drawing, the tokens of a parser, the messages of a protocol, the states of a machine), a variant replaces the whole base-class-plus-pointers apparatus with one value.",
    { h: "In memory" },
    { list: [
      "**Storage** big enough for the largest alternative, aligned for all of them.",
      "An **index** saying which alternative is live (`s.index()`).",
      "**No heap**, no vptr, no pointer: the object lives inside the variant.",
      "Assigning a different alternative **destroys** the old one and **constructs** the new one in the same storage.",
    ] },
    { h: "How visit dispatches" },
    { list: [
      "At compile time, `std::visit` builds a **table** with one entry per alternative.",
      "At run time it **reads the index** and calls that entry, which casts the storage and calls your overload.",
      "The cost is about **one indirect call** — similar to a virtual call, and often optimised into a `switch`.",
    ] },
    { h: "Versus the classic Visitor" },
    { list: [
      "**No `accept()`** and no `Visitor` base class: types are plain structs.",
      "**Exhaustive**: a visitor that misses an alternative **doesn't compile**. Add `Triangle`, and the compiler lists every place to update.",
      "Operations **return values** directly, instead of stashing results in visitor state.",
      "Same trade-off: new **operations** are cheap (a new function), new **types** touch every visit.",
    ] },
    { h: "Versus type erasure" },
    { list: [
      "Variant: **closed** set, **no allocation**, compiler-checked. Size is the largest alternative.",
      "Type erasure: **open** set, usually an allocation, any type with the right operations.",
      "Pick by asking: *does the code that defines the set of types know all of them?*",
    ] },
    { h: "Getting values out" },
    "`std::visit` is the safe default. `std::get_if<T>` returns a pointer or `nullptr`; `std::holds_alternative<T>` asks; `std::get<T>` **throws `bad_variant_access`** on a wrong guess. The second listing shows all three.",
  ],

  analysis: {
    rows: [
      ["Run-time cost", "No allocation; about one indirect call per visit; size = largest alternative + index + padding"],
      ["Use it when", "The set of types is closed and known, and you want value semantics and exhaustive checking"],
      ["Avoid it when", "Types are added by other code (plugins, users of a library) — use virtual or type erasure"],
    ],
    notes: [
      "A variant with one huge alternative makes **every** value huge. Box the rare large one: `std::variant<Small, std::unique_ptr<Huge>>`.",
      "**Recursive types** need indirection: `struct Add { std::unique_ptr<Expr> l, r; }`, as in the Visitor and Composite modern listings.",
      "`valueless_by_exception()` is the one odd state: if constructing the new alternative throws during assignment, the variant may hold nothing.",
      "The `overloaded` helper is three lines and not (yet) in the standard; C++26 pattern matching proposals aim to replace it with `inspect`/`match` syntax.",
    ],
  },

  code: {
    lang: "cpp",
    files: [
      { name: "variant.cpp", note: "A Shape variant and visit, which the animation follows.", source: VARIANT, traced: true },
      { name: "access.cpp", note: "get_if, holds_alternative, and get throwing on a wrong guess.", source: ACCESS },
    ],
  },
};
