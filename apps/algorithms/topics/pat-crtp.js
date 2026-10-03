/**
 * CRTP versus virtual functions. The same call, area(), resolved through a
 * vtable at run time and through a template at compile time, with the object
 * layouts side by side.
 */

import { frame } from "../core/trace.js";
import { MEMORY, printed } from "./pat-common.js";

const COMPARE = `// The same shape written twice: once with a virtual function, once with the
// Curiously Recurring Template Pattern. The program prints both layouts.
#include <cstdio>

// ---- run-time polymorphism -------------------------------------------
struct Shape {
    virtual ~Shape() = default;
    virtual double area() const = 0;
};

struct Circle : Shape {
    double r;
    explicit Circle(double r) : r(r) {}
    double area() const override { return 3.14159265 * r * r; }
};

// ---- compile-time polymorphism (CRTP) --------------------------------
// The base is a template on its own derived class. It can call into the
// derived class with a static_cast, because it knows the type exactly.
template <class Derived>
struct ShapeBase {
    double area() const { return static_cast<const Derived&>(*this).areaImpl(); }
};

struct FastCircle : ShapeBase<FastCircle> {
    double r;
    explicit FastCircle(double r) : r(r) {}
    double areaImpl() const { return 3.14159265 * r * r; }
};

// Generic code takes ShapeBase<D>, so D is known and the call can inline.
template <class D>
double measure(const ShapeBase<D>& s) { return s.area(); }

int main() {
    Circle c(2);
    const Shape& s = c;
    std::printf("virtual: sizeof = %zu, area = %.2f\\n", sizeof(Circle), s.area());

    FastCircle f(2);
    std::printf("crtp: sizeof = %zu, area = %.2f\\n", sizeof(FastCircle), measure(f));
}
`;

const MODERN = `// Modern: often you don't need a base class at all. A C++20 concept states
// the interface, and any type with a matching area() is accepted.
#include <concepts>
#include <cstdio>

template <class T>
concept Shape = requires(const T& t) {
    { t.area() } -> std::convertible_to<double>;
};

struct Circle { double r; double area() const { return 3.14159265 * r * r; } };
struct Square { double s; double area() const { return s * s; } };

double measure(const Shape auto& s) { return s.area(); }   // a template, checked against the concept

int main() {
    std::printf("circle %.2f, square %.2f\\n", measure(Circle{2}), measure(Square{3}));
    // measure(42);  // error: int does not satisfy Shape — a readable message
    // C++23 adds "deducing this", which replaces most remaining CRTP uses:
    //   double area(this const auto& self) { return self.areaImpl(); }
}
`;

/* ---------------------------------------------------------------- */

const REGIONS = ["Stack", "Static data", "Code"];

function virtualScene({ vptr, slot, fn, done } = {}) {
  return {
    regions: REGIONS,
    blocks: [
      { id: "c", region: "Stack", label: "Circle c   (16 bytes)", state: vptr ? "active" : "new",
        cells: [{ t: "vptr", kind: "vptr", to: "vt", state: vptr ? "active" : undefined }, { t: "double r = 2.0" }] },
      { id: "vt", region: "Static data", label: "vtable for Circle", state: slot ? "active" : undefined,
        cells: [{ t: "offset, typeinfo" }, { t: "~Circle()" }, { t: "area()", kind: "fn", to: "fn", state: slot ? "active" : undefined }] },
      { id: "fn", region: "Code", label: "Circle::area()", state: fn ? (done ? "new" : "active") : undefined,
        cells: [{ t: "return π · r · r" }] },
    ],
  };
}

function crtpScene({ call, done } = {}) {
  return {
    regions: REGIONS,
    blocks: [
      { id: "c", region: "Stack", label: "Circle c   (16 bytes)", state: "dim",
        cells: [{ t: "vptr", kind: "vptr", to: "vt" }, { t: "double r = 2.0" }] },
      { id: "f", region: "Stack", label: "FastCircle f  (8 bytes)", state: call ? "active" : "new",
        cells: [{ t: "double r = 2.0" }] },
      { id: "vt", region: "Static data", label: "vtable for Circle", state: "dim",
        cells: [{ t: "offset, typeinfo" }, { t: "~Circle()" }, { t: "area()", kind: "fn", to: "fn" }] },
      { id: "fn", region: "Code", label: "Circle::area()", state: "dim", cells: [{ t: "return π · r · r" }] },
      { id: "base", region: "Code", label: "ShapeBase<FastCircle>", state: call ? "active" : undefined,
        cells: [{ t: "area(): static_cast" }, { t: "  → areaImpl()", kind: "fn", to: "impl", state: call ? "active" : undefined }] },
      { id: "impl", region: "Code", label: "FastCircle::areaImpl", state: done ? "new" : call ? "active" : undefined,
        cells: [{ t: "return π · r · r" }] },
    ],
  };
}

function* run() {
  yield frame({
    phase: "Virtual",
    note: "Circle c(2): an object with a virtual function carries a hidden pointer, the vptr, to its class's vtable.",
    detail: "The vtable is one table per class, in read-only static memory, holding the address of each virtual function. 8 bytes of vptr + 8 bytes of double = 16.",
    marks: virtualScene(),
    metrics: [{ label: "sizeof(Circle)", value: "16" }],
  });
  yield frame({
    phase: "Virtual",
    note: "s.area() through a Shape&, step 1: load the vptr from the object.",
    detail: "The compiler only knows s is some Shape. Which area() to run is data, stored in the object.",
    marks: virtualScene({ vptr: true }),
    metrics: [{ label: "memory loads", value: "1" }],
  });
  yield frame({
    phase: "Virtual",
    note: "Step 2: load the address of area() from its fixed slot in the vtable.",
    marks: virtualScene({ vptr: true, slot: true }),
    metrics: [{ label: "memory loads", value: "2" }],
  });
  yield frame({
    phase: "Virtual",
    note: "Step 3: an indirect call to that address. Circle::area runs.",
    detail: "Two dependent loads and an indirect jump. The cost is small, but the compiler cannot inline what it cannot see, and inlining is what unlocks most other optimisations.",
    marks: virtualScene({ vptr: true, slot: true, fn: true, done: true }),
    metrics: [{ label: "memory loads", value: "2" }, printed("virtual: sizeof = 16, area = 12.57")],
  });

  yield frame({
    phase: "CRTP",
    note: "FastCircle f(2) derives from ShapeBase<FastCircle> — a base class templated on the class deriving from it.",
    detail: "No virtual functions, so no vptr and no vtable. The empty base takes no space: the object is just its double.",
    marks: crtpScene(),
    metrics: [{ label: "sizeof(FastCircle)", value: "8" }],
  });
  yield frame({
    phase: "CRTP",
    note: "measure(f) calls s.area(). ShapeBase<FastCircle>::area does static_cast<const FastCircle&>(*this).areaImpl().",
    detail: "Inside the template, Derived is a known type, so the cast is free and the call target is fixed at compile time — no pointer is read to find it.",
    marks: crtpScene({ call: true }),
    metrics: [{ label: "memory loads", value: "0" }],
  });
  yield frame({
    phase: "CRTP",
    note: "A direct call, which the optimiser typically inlines away entirely: measure(f) compiles to π · r · r.",
    marks: crtpScene({ call: true, done: true }),
    metrics: [{ label: "memory loads", value: "0" }, printed("crtp: sizeof = 8, area = 12.57")],
  });
  yield frame({
    phase: "Done",
    note: "The catch: ShapeBase<FastCircle> and ShapeBase<FastSquare> are unrelated types.",
    detail: "You cannot put them in one vector or pass them through one non-template function. CRTP is polymorphism resolved at compile time — choose it when the type is known where it's used, and virtual when it is decided at run time.",
    marks: crtpScene({ done: true }),
    metrics: [],
  });
}

export const crtp = {
  id: "pat-crtp",
  section: "Design patterns",
  topic: "Modern C++",
  title: "CRTP vs. virtual",
  blurb: "Static polymorphism: let a base class call into its derived class at compile time, with no vtable and no indirect call.",
  structure: MEMORY,
  run,

  explanation: [
    { tip: "**In one line:** `struct Derived : Base<Derived>` — the base knows the exact derived type, so it can call into it without virtual functions." },
    "Virtual functions are C++'s **run-time** polymorphism: which function runs is decided by data in the object. The Curiously Recurring Template Pattern gives the same *shape* of code — a base class with shared behaviour, derived classes filling in the details — but **decides everything at compile time**.",
    { h: "What a virtual call costs" },
    { list: [
      "A hidden **vptr** in every object (8 bytes on 64-bit — doubling a one-`double` class).",
      "Per call: **load the vptr, load the slot, indirect call** — two dependent memory reads.",
      "The real cost: the compiler usually **can't inline** the call, which blocks the optimisations inlining enables.",
      "For most code this is negligible. In a hot loop over millions of small objects it is not.",
    ] },
    { h: "How CRTP works" },
    { list: [
      "The base is a template: `template <class D> struct ShapeBase`.",
      "The derived class passes **itself**: `struct FastCircle : ShapeBase<FastCircle>`. That is the \"curiously recurring\" part.",
      "In the base, `static_cast<const D&>(*this)` is safe and free, because `*this` really is a `D`.",
      "So `area()` calls `D::areaImpl()` **directly** — known at compile time, and inlinable.",
    ] },
    { h: "What you give up" },
    { list: [
      "`ShapeBase<FastCircle>` and `ShapeBase<FastSquare>` are **unrelated types**: no `vector<ShapeBase*>`, no choosing the type at run time.",
      "Everything using it becomes a **template**, so code lives in headers and compile times grow.",
      "Error messages are template error messages.",
    ] },
    { h: "Where CRTP is the right tool" },
    { list: [
      "**Mixins**: add `operator!=` from `operator==`, or counters, or `clone()`, to many classes (`std::enable_shared_from_this` is CRTP).",
      "**Static interfaces** in performance-critical libraries (Eigen's expression templates).",
      "Anywhere the concrete type is known at every call site, and speed matters.",
    ] },
    { h: "Modern C++" },
    "A **concept** often replaces CRTP entirely: state what a type must provide, and write `measure(const Shape auto&)`. No base class at all. **C++23's deducing `this`** (`area(this const auto& self)`) removes most remaining reasons to write CRTP by hand.",
  ],

  analysis: {
    rows: [
      ["Run-time cost", "None: direct, inlinable calls and no vptr in the object"],
      ["Use it when", "Types are known at compile time, and the call is hot or the object is tiny"],
      ["Avoid it when", "You need a heterogeneous collection, or the type is chosen at run time — use virtual"],
    ],
    notes: [
      "Compilers can **devirtualise** when they can prove the dynamic type (a `final` class, or a local object). Mark leaf classes `final` before reaching for CRTP.",
      "Getting the template argument wrong (`struct B : Base<A>`) compiles and is undefined behaviour. A `static_assert` or a private constructor with `friend D` in the base catches it.",
      "The **sizes are printed by the program**, not assumed: 16 and 8 on a 64-bit build. The empty-base optimisation is what makes `FastCircle` exactly one `double`.",
      "Both can mix: a virtual interface for run-time choice, implemented once with CRTP to remove boilerplate in each derived class.",
    ],
  },

  code: {
    lang: "cpp",
    files: [
      { name: "compare.cpp", note: "Both versions in one program, which the animation follows.", source: COMPARE, traced: true },
      { name: "modern.cpp", note: "A C++20 concept instead of a base class; C++23 deducing this.", source: MODERN },
    ],
  },
};
