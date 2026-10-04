/**
 * Prototype, before and after: copying through a type check per class, then a
 * virtual clone().
 */

import { add, box, promote, sceneWith } from "./pat-common.js";
import { prototype as n } from "./pat-creational.js";

const BEFORE = `// Before: to copy a Shape you must first find out what it really is.
#include <cstdio>
#include <memory>

struct Shape {
    virtual ~Shape() = default;
    virtual void describe(const char* who) const = 0;
    virtual void scale(double k) = 0;
};
struct Circle : Shape {
    explicit Circle(double r) : r(r) {}
    void describe(const char* who) const override { std::printf("%s: circle r=%g\\n", who, r); }
    void scale(double k) override { r *= k; }
    double r;
};
struct Square : Shape {
    explicit Square(double s) : s(s) {}
    void describe(const char* who) const override { std::printf("%s: square s=%g\\n", who, s); }
    void scale(double k) override { s *= k; }
    double s;
};

std::unique_ptr<Shape> copyOf(const Shape& shape) {
    if (auto c = dynamic_cast<const Circle*>(&shape)) return std::make_unique<Circle>(*c);
    if (auto q = dynamic_cast<const Square*>(&shape)) return std::make_unique<Square>(*q);
    return nullptr;                    // a new shape type silently copies to nothing
}

int main() {
    std::unique_ptr<Shape> original = std::make_unique<Circle>(2);
    std::unique_ptr<Shape> copy = copyOf(*original);
    copy->scale(2.5);
    original->describe("original");
    copy->describe("copy");
}
`;

const before = (edited) => ({
  objects: [
    box("fn", "copyOf(const Shape&)", "code", 0.5, 0.02,
      ["if Circle*: new Circle(*c)", "if Square*: new Square(*q)", ...(edited ? [add("if Triangle*: new Triangle(*t)")] : []), "else: nullptr"],
      edited ? "edited" : undefined),
    box("c", "Circle", "concrete", 0, 0.95),
    box("s", "Square", "concrete", edited ? 0.5 : 1, 0.95),
    ...(edited ? [box("t", "Triangle", "concrete", 1, 0.95, [], "new")] : []),
  ],
  links: ["c", "s", ...(edited ? ["t"] : [])].map((id) => ({ from: "fn", to: id, kind: "uses" })),
});

export const prototype = promote(n, {
  before: { source: BEFORE, note: "The problem: copying needs a type check per class." },
  smell: [
    "Code that copies objects through a base reference with a **`dynamic_cast` chain** or a type tag.",
    "Every new class must be **added to the chain**, or its copies come back empty.",
    "Copying through a base by value (`Shape s = original;`) **slices** off the derived part.",
  ],
  frames: [
    { phase: "Before", note: "Without the pattern: copyOf() asks each concrete type in turn whether the shape is one of them.",
      detail: "It works, but copyOf() has to know every shape there is.",
      marks: before(false), metrics: [{ label: "places edited", value: "0" }] },
    { phase: "Before", note: "Change request: add a Triangle. copyOf() needs another branch — forget it and copies of triangles are null.",
      marks: before(true), metrics: [{ label: "places edited", value: "2 (class + copyOf)" }] },
    { phase: "After", note: "With Prototype: Shape declares a virtual clone(), and each class copies itself with its own copy constructor.",
      detail: "A Triangle writes its own one-line clone(). The code that copies shapes never changes.",
      marks: sceneWith(n, { orig: "active", iface: "dispatch" }), metrics: [{ label: "places edited", value: "2 → 1" }] },
  ],
});
