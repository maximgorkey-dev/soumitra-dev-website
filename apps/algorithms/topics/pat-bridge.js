/**
 * Bridge. Shapes and renderers vary independently: one class per pair grows
 * as m × n, a shape holding a renderer grows as m + n.
 */

import { frame } from "../core/trace.js";
import { OBJECTS, printed } from "./pat-common.js";

const BEFORE = `// Before: one class per (shape, renderer) pair.
#include <cstdio>

struct Shape {
    virtual ~Shape() = default;
    virtual void draw() = 0;
};

struct VectorCircle : Shape { void draw() override { std::printf("vector: <circle r=2/>\\n"); } };
struct RasterCircle : Shape { void draw() override { std::printf("raster: filled 13 pixels for a circle of r=2\\n"); } };
struct VectorSquare : Shape { void draw() override { std::printf("vector: <rect w=3 h=3/>\\n"); } };
struct RasterSquare : Shape { void draw() override { std::printf("raster: filled 9 pixels\\n"); } };
// A Triangle needs two more classes; a PDF renderer needs one more per shape.

int main() {
    VectorCircle().draw();
    RasterCircle().draw();
    VectorSquare().draw();
}
`;

const AFTER = `// After: a shape holds a renderer, so the two hierarchies vary independently.
#include <cstdio>

// The implementation side.
struct Renderer {
    virtual ~Renderer() = default;
    virtual void circle(double r) = 0;
    virtual void square(double s) = 0;
};
struct VectorRenderer : Renderer {
    void circle(double r) override { std::printf("vector: <circle r=%g/>\\n", r); }
    void square(double s) override { std::printf("vector: <rect w=%g h=%g/>\\n", s, s); }
};
struct RasterRenderer : Renderer {
    void circle(double r) override {
        int n = 0;                                    // count pixels inside the circle
        for (int y = -2; y <= 2; ++y)
            for (int x = -2; x <= 2; ++x) n += (x * x + y * y <= r * r);
        std::printf("raster: filled %d pixels for a circle of r=%g\\n", n, r);
    }
    void square(double s) override { std::printf("raster: filled %g pixels\\n", s * s); }
};

// The abstraction side, holding the bridge.
class Shape {
public:
    explicit Shape(Renderer& r) : r_(r) {}
    virtual ~Shape() = default;
    virtual void draw() = 0;
protected:
    Renderer& r_;
};
class Circle : public Shape {
public:
    Circle(Renderer& r, double radius) : Shape(r), radius_(radius) {}
    void draw() override { r_.circle(radius_); }
private:
    double radius_;
};
class Square : public Shape {
public:
    Square(Renderer& r, double side) : Shape(r), side_(side) {}
    void draw() override { r_.square(side_); }
private:
    double side_;
};

int main() {
    VectorRenderer vector;
    RasterRenderer raster;
    Circle(vector, 2).draw();
    Circle(raster, 2).draw();
    Square(vector, 3).draw();
}
`;

/* ---------------------------------------------------------------- */

function beforeScene(withTriangle) {
  const C = (id, label, x, y, state) => ({ id, label, role: "concrete", x, y, state, lines: [] });
  return {
    objects: [
      { id: "shape", label: "Shape", stereo: "«interface»", role: "interface", x: 0.5, y: 0.02, lines: ["draw() = 0"] },
      C("vc", "VectorCircle", 0, 0.6),
      C("rc", "RasterCircle", 0.25, 0.97),
      C("vs", "VectorSquare", 0.5, 0.6),
      C("rs", "RasterSquare", 0.75, 0.97),
      ...(withTriangle ? [C("vt", "VectorTriangle", 1, 0.6, "new"), C("rt", "RasterTriangle", 1, 0.97, "new")] : []),
    ],
    links: ["vc", "rc", "vs", "rs", ...(withTriangle ? ["vt", "rt"] : [])].map((id) => ({ from: id, to: "shape", kind: "implements" })),
  };
}

function afterScene({ states = {}, msg = null, triangle = false } = {}) {
  return {
    objects: [
      { id: "shape", label: "Shape", role: "code", x: 0, y: 0.02, state: states.shape, lines: ["Renderer& r_", "draw() = 0"] },
      { id: "rend", label: "Renderer", stereo: "«interface»", role: "interface", x: 1, y: 0.02, state: states.rend,
        lines: ["circle(r)", "square(s)"] },
      { id: "circle", label: "Circle", role: "concrete", x: 0, y: 0.6, state: states.circle, lines: ["draw(): r_.circle(r)"] },
      { id: "square", label: "Square", role: "concrete", x: 0.3, y: 0.97, state: states.square, lines: ["draw(): r_.square(s)"] },
      ...(triangle ? [{ id: "tri", label: "Triangle", role: "concrete", x: 0.42, y: 0.6, state: "new", lines: ["draw(): r_.…"] }] : []),
      { id: "vec", label: "VectorRenderer", role: "concrete", x: 1, y: 0.6, state: states.vec, lines: ["SVG path"] },
      { id: "ras", label: "RasterRenderer", role: "concrete", x: 0.72, y: 0.97, state: states.ras, lines: ["fill pixels"] },
    ],
    links: [
      { from: "circle", to: "shape", kind: "implements" }, { from: "square", to: "shape", kind: "implements" },
      ...(triangle ? [{ from: "tri", to: "shape", kind: "implements" }] : []),
      { from: "vec", to: "rend", kind: "implements" }, { from: "ras", to: "rend", kind: "implements" },
      { from: "shape", to: "rend", kind: "owns", label: "the bridge" },
    ],
    msg,
  };
}

function* run() {
  yield frame({
    phase: "Before",
    note: "Without the pattern: shapes and renderers live in one hierarchy, so every pair is its own class.",
    detail: "Two shapes × two renderers = four classes, and the circle-drawing code is written twice.",
    marks: beforeScene(false),
    metrics: [{ label: "classes", value: "4" }],
  });
  yield frame({
    phase: "Before",
    note: "Change request: add a Triangle. That's two new classes, one per renderer — and a third renderer would add one per shape.",
    detail: "Two independent dimensions in one hierarchy multiply: m shapes × n renderers = m·n classes.",
    marks: beforeScene(true),
    metrics: [{ label: "classes", value: "4 → 6" }],
  });
  yield frame({
    phase: "After",
    note: "With Bridge: a Shape holds a Renderer. Shapes are written in terms of the renderer's primitives, circle() and square().",
    detail: "A Triangle is one new class that works with every renderer. Shapes and renderers now grow as m + n.",
    marks: afterScene({ triangle: true }),
    metrics: [{ label: "classes", value: "m·n → m + n" }],
  });

  yield frame({
    phase: "Run",
    note: "A Circle given the vector renderer draws by calling r_.circle(2). The vector renderer writes SVG.",
    marks: afterScene({ states: { circle: "active", rend: "dispatch", vec: "active" }, msg: { from: "circle", to: "vec", label: "circle(2)" } }),
    metrics: [printed("vector: <circle r=2/>")],
  });
  yield frame({
    phase: "Run",
    note: "The same Circle class, given the raster renderer, fills pixels instead. Circle's code didn't change.",
    marks: afterScene({ states: { circle: "active", rend: "dispatch", ras: "active" }, msg: { from: "circle", to: "ras", label: "circle(2)" } }),
    metrics: [printed("raster: filled 13 pixels for a circle of r=2")],
  });
  yield frame({
    phase: "Run",
    note: "A Square uses whichever renderer it was given, too.",
    marks: afterScene({ states: { square: "active", rend: "dispatch", vec: "active" }, msg: { from: "square", to: "vec", label: "square(3)" } }),
    metrics: [printed("vector: <rect w=3 h=3/>")],
  });
  yield frame({
    phase: "Done",
    note: "Every shape works with every renderer, and each side can grow without touching the other.",
    detail: "The hard part was choosing the primitives on the bridge. If a new shape needs a primitive the renderers don't have, every renderer must add it.",
    marks: afterScene(),
    metrics: [{ label: "classes", value: "2 + 2 = 4, for every combination" }],
  });
}

export const bridge = {
  id: "pat-bridge",
  section: "Design patterns",
  topic: "Structural",
  title: "Bridge",
  blurb: "Split one hierarchy into two — what something is, and how it is implemented — so each can vary independently.",
  structure: OBJECTS,
  run,

  explanation: [
    { tip: "**In one line:** when a class varies along two independent axes, make one axis an object that the other holds." },
    "Bridge is what Strategy looks like when the *strategy* is a whole implementation layer. It is designed in up front, when you can see **two independent dimensions** of change: shape and renderer, message and transport, window and platform.",
    { h: "The smell" },
    { list: [
      "Class names that are **two words glued together**: `VectorCircle`, `RasterCircle`, `VectorSquare`…",
      "Adding one thing on either axis means adding **a class per item on the other axis**.",
      "The same drawing code is **duplicated** across the pairs.",
    ] },
    { h: "How it works" },
    { list: [
      "The **abstraction** hierarchy (`Shape`, `Circle`, `Square`) holds a reference to…",
      "…the **implementation** interface (`Renderer`), with its own hierarchy (`VectorRenderer`, `RasterRenderer`).",
      "Abstractions are written **in terms of implementation primitives** (`circle()`, `square()`).",
      "*m* abstractions + *n* implementations = **m + n classes**, not m × n.",
    ] },
    { h: "PIMPL is a bridge" },
    "The **PIMPL idiom** (in the Modern C++ group) is a one-implementation bridge used for a different reason: to hide implementation details from the header, so they can change without recompiling clients.",
  ],

  analysis: {
    rows: [
      ["Use it when", "Two independent dimensions of variation would otherwise multiply subclasses"],
      ["Avoid it when", "One dimension really varies — Strategy or plain inheritance is simpler"],
      ["Cost", "One indirection per primitive call"],
    ],
    notes: [
      "The hard part is choosing the **implementation primitives**: too few and abstractions can't express themselves; too many and every new renderer is a chore.",
      "Device drivers are the classic case: the OS-facing interface (abstraction) and the hardware-facing one (implementation) evolve separately.",
    ],
  },

  code: {
    lang: "cpp",
    files: [
      { name: "before.cpp", note: "The problem: one class for every shape and renderer pair.", source: BEFORE },
      { name: "bridge.cpp", note: "The classic pattern, which the animation follows.", source: AFTER, traced: true },
    ],
  },
};
