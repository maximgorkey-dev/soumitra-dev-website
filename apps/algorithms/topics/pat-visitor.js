/**
 * Visitor. Operations over an expression tree written as separate visitor
 * classes, with the double dispatch (accept, then visit) animated hop by hop.
 */

import { frame } from "../core/trace.js";
import { OBJECTS, add, printed } from "./pat-common.js";

const BEFORE = `// Before: every operation is a virtual function on every node class. Adding
// an operation means opening every class in the hierarchy.
#include <cstdio>
#include <memory>
#include <string>

struct Expr {
    virtual ~Expr() = default;
    virtual int eval() const = 0;
    virtual std::string print() const = 0;
    // edit 1: virtual std::string rpn() const = 0;
};

struct Num : Expr {
    int v;
    explicit Num(int v) : v(v) {}
    int eval() const override { return v; }
    std::string print() const override { return std::to_string(v); }
    // edit 2: rpn()
};

struct Add : Expr {
    std::unique_ptr<Expr> l, r;
    Add(std::unique_ptr<Expr> l, std::unique_ptr<Expr> r) : l(std::move(l)), r(std::move(r)) {}
    int eval() const override { return l->eval() + r->eval(); }
    std::string print() const override { return "(" + l->print() + " + " + r->print() + ")"; }
    // edit 3: rpn()
};

struct Mul : Expr {
    std::unique_ptr<Expr> l, r;
    Mul(std::unique_ptr<Expr> l, std::unique_ptr<Expr> r) : l(std::move(l)), r(std::move(r)) {}
    int eval() const override { return l->eval() * r->eval(); }
    std::string print() const override { return "(" + l->print() + " * " + r->print() + ")"; }
    // edit 4: rpn()
};

int main() {
    Mul e(std::make_unique<Add>(std::make_unique<Num>(2), std::make_unique<Num>(3)), std::make_unique<Num>(4));
    std::printf("%s = %d\\n", e.print().c_str(), e.eval());
}
`;

const AFTER = `// After: node classes have one method, accept(). Each operation is a Visitor
// class with a visit() overload per node type. A new operation is a new class.
#include <cstdio>
#include <memory>
#include <string>

struct Num;
struct Add;
struct Mul;

struct Visitor {
    virtual ~Visitor() = default;
    virtual void visit(const Num&) = 0;
    virtual void visit(const Add&) = 0;
    virtual void visit(const Mul&) = 0;
};

struct Expr {
    virtual ~Expr() = default;
    virtual void accept(Visitor& v) const = 0;
};

// Each accept() is the same one line, but *this has a different static type in
// each, which is what picks the right visit() overload: the second dispatch.
struct Num : Expr {
    int value;
    explicit Num(int v) : value(v) {}
    void accept(Visitor& v) const override { v.visit(*this); }
};

struct Add : Expr {
    std::unique_ptr<Expr> l, r;
    Add(std::unique_ptr<Expr> l, std::unique_ptr<Expr> r) : l(std::move(l)), r(std::move(r)) {}
    void accept(Visitor& v) const override { v.visit(*this); }
};

struct Mul : Expr {
    std::unique_ptr<Expr> l, r;
    Mul(std::unique_ptr<Expr> l, std::unique_ptr<Expr> r) : l(std::move(l)), r(std::move(r)) {}
    void accept(Visitor& v) const override { v.visit(*this); }
};

class Eval : public Visitor {
public:
    int result = 0;
    void visit(const Num& n) override { result = n.value; }
    void visit(const Add& a) override { result = both(a.l, a.r, [](int x, int y) { return x + y; }); }
    void visit(const Mul& m) override { result = both(m.l, m.r, [](int x, int y) { return x * y; }); }
private:
    template <class Op>
    int both(const std::unique_ptr<Expr>& l, const std::unique_ptr<Expr>& r, Op op) {
        l->accept(*this);
        int left = result;
        r->accept(*this);
        return op(left, result);
    }
};

class Print : public Visitor {
public:
    std::string out;
    void visit(const Num& n) override { out += std::to_string(n.value); }
    void visit(const Add& a) override { out += "("; a.l->accept(*this); out += " + "; a.r->accept(*this); out += ")"; }
    void visit(const Mul& m) override { out += "("; m.l->accept(*this); out += " * "; m.r->accept(*this); out += ")"; }
};

// The change request: a new operation. One new class; no node class is touched.
class Rpn : public Visitor {
public:
    std::string out;
    void visit(const Num& n) override { out += std::to_string(n.value) + " "; }
    void visit(const Add& a) override { a.l->accept(*this); a.r->accept(*this); out += "+ "; }
    void visit(const Mul& m) override { m.l->accept(*this); m.r->accept(*this); out += "* "; }
};

int main() {
    Mul e(std::make_unique<Add>(std::make_unique<Num>(2), std::make_unique<Num>(3)), std::make_unique<Num>(4));

    Eval eval;
    e.accept(eval);
    Print print;
    e.accept(print);
    std::printf("%s = %d\\n", print.out.c_str(), eval.result);

    Rpn rpn;
    e.accept(rpn);
    std::printf("rpn: %s\\n", rpn.out.c_str());
}
`;

const MODERN = `// Modern: the node types are a std::variant, and each operation is a set of
// lambdas passed to std::visit. No accept(), no Visitor base class — and if a
// node type is added to the variant, every visit that misses it fails to compile.
#include <cstdio>
#include <memory>
#include <string>
#include <variant>

struct Num; struct Add; struct Mul;
using Expr = std::variant<Num, Add, Mul>;
using Ptr = std::unique_ptr<Expr>;

struct Num { int value; };
struct Add { Ptr l, r; };
struct Mul { Ptr l, r; };

template <class... F> struct overloaded : F... { using F::operator()...; };

int eval(const Expr& e) {
    return std::visit(overloaded{
        [](const Num& n) { return n.value; },
        [](const Add& a) { return eval(*a.l) + eval(*a.r); },
        [](const Mul& m) { return eval(*m.l) * eval(*m.r); },
    }, e);
}

std::string rpn(const Expr& e) {            // a new operation is a new function
    return std::visit(overloaded{
        [](const Num& n) { return std::to_string(n.value) + " "; },
        [](const Add& a) { return rpn(*a.l) + rpn(*a.r) + "+ "; },
        [](const Mul& m) { return rpn(*m.l) + rpn(*m.r) + "* "; },
    }, e);
}

template <class T> Ptr make(T t) { return std::make_unique<Expr>(std::move(t)); }

int main() {
    Expr e = Mul{make(Add{make(Num{2}), make(Num{3})}), make(Num{4})};
    std::printf("%d, rpn: %s\\n", eval(e), rpn(e).c_str());
}
`;

/* ---------------------------------------------------------------- */

function beforeScene(edited) {
  const node = (id, label, y) => ({
    id, label, role: "concrete", x: 0.5, y, state: edited ? "edited" : "idle",
    lines: ["eval()", "print()", ...(edited ? [add("rpn()")] : [])],
  });
  return {
    objects: [
      { id: "expr", label: "Expr", stereo: "«interface»", role: "interface", x: 0.5, y: 0.02, state: edited ? "edited" : "idle",
        lines: ["eval()", "print()", ...(edited ? [add("rpn()")] : [])] },
      { ...node("num", "Num", 0.95), x: 0 },
      { ...node("add", "Add", 0.95), x: 0.5 },
      { ...node("mul", "Mul", 0.95), x: 1 },
    ],
    links: ["num", "add", "mul"].map((id) => ({ from: id, to: "expr", kind: "implements" })),
  };
}

function structureScene(withRpn) {
  const el = (id, y) => ({ id, label: id[0].toUpperCase() + id.slice(1), role: "concrete", x: 0, y, lines: ["accept(v): v.visit(*this)"] });
  const vis = (id, label, y, state) => ({ id, label, role: "concrete", x: 1, y, state, lines: ["visit(Num&)", "visit(Add&)", "visit(Mul&)"] });
  return {
    objects: [
      { id: "expr", label: "Expr", stereo: "«interface»", role: "interface", x: 0, y: 0.02, lines: ["accept(Visitor&)"] },
      { id: "visitor", label: "Visitor", stereo: "«interface»", role: "interface", x: 1, y: 0.02,
        lines: ["visit(const Num&)", "visit(const Add&)", "visit(const Mul&)"] },
      el("num", 0.4), el("add", 0.68), el("mul", 0.96),
      vis("eval", "Eval", 0.5), vis("print", "Print", 0.98),
      ...(withRpn ? [{ ...vis("rpn", "Rpn", 0.98, "new"), x: 0.62 }] : []),
    ],
    links: [
      ...["num", "add", "mul"].map((id) => ({ from: id, to: "expr", kind: "implements" })),
      ...["eval", "print", ...(withRpn ? ["rpn"] : [])].map((id) => ({ from: id, to: "visitor", kind: "implements" })),
    ],
  };
}

// (2 + 3) * 4
const TREE = [
  { id: "mul", label: "Mul", x: 0.32, y: 0.04, kids: ["add", "n4"] },
  { id: "add", label: "Add", x: 0.12, y: 0.5, kids: ["n2", "n3"] },
  { id: "n4", label: "Num 4", x: 0.55, y: 0.5, value: 4 },
  { id: "n2", label: "Num 2", x: 0, y: 0.96, value: 2 },
  { id: "n3", label: "Num 3", x: 0.3, y: 0.96, value: 3 },
];

function evalScene({ states = {}, msg = null, result = "—", pending = [] } = {}) {
  return {
    objects: [
      ...TREE.map((n) => ({ id: n.id, label: n.label, role: n.kids ? "code" : "concrete", x: n.x, y: n.y,
        state: states[n.id], lines: ["accept(v)"] })),
      { id: "main", label: "main()", role: "client", x: 1, y: 0.04, state: states.main, lines: ["e.accept(eval)"] },
      { id: "eval", label: "Eval", role: "concrete", x: 1, y: 0.62, state: states.eval,
        lines: [`result = ${result}`, `waiting: ${pending.length ? pending.join(", ") : "—"}`] },
    ],
    links: TREE.flatMap((n) => (n.kids || []).map((k) => ({ from: n.id, to: k, kind: "owns" }))),
    msg,
  };
}

function* run() {
  yield frame({
    phase: "Before",
    note: "Without the pattern: each operation is a virtual function on every node class.",
    detail: "Expr declares eval() and print(); Num, Add and Mul each implement both. Adding node types is easy. Adding operations is not.",
    marks: beforeScene(false),
    metrics: [{ label: "classes edited", value: "0" }],
  });
  yield frame({
    phase: "Before",
    note: "Change request: print the expression in reverse Polish notation. Every class in the hierarchy is opened.",
    detail: "This is the mirror image of Strategy's problem. There, new versions were the change; here, new operations are. When the node types are stable and operations keep coming, the virtual-function layout is the wrong way round.",
    marks: beforeScene(true),
    metrics: [{ label: "classes edited", value: "4" }],
  });
  yield frame({
    phase: "After",
    note: "With Visitor: nodes have one method, accept(). Each operation is a class with a visit() per node type.",
    detail: "The operation's code for all node types now lives together in one class, exactly as Strategy put each version's code together.",
    marks: structureScene(false),
    metrics: [{ label: "classes edited", value: "0" }],
  });
  yield frame({
    phase: "After",
    note: "Same change request: Rpn is one new Visitor class. Num, Add and Mul are untouched.",
    detail: "The price: a new node type now means a new visit() in every visitor. Visitor fixes one axis by fixing the other.",
    marks: structureScene(true),
    metrics: [{ label: "classes edited", value: "0" }, { label: "new classes", value: "1" }],
  });

  // Animate Eval over (2 + 3) * 4: accept goes down, visit comes back.
  // Scenes are built eagerly during the walk, so each one captures `result`
  // and `pending` as they were at that step.
  const pending = [];
  let result = "—";
  const s = (states, msg) => evalScene({ states, msg, result, pending: [...pending] });
  const live = [];
  const walk = (id, caller) => {
    const n = TREE.find((t) => t.id === id);
    const kind = n.label.split(" ")[0];
    live.push({
      note: `${caller === "main" ? "main()" : "Eval"} calls ${n.label}.accept(*this).`,
      detail: caller === "main" ? "Dispatch #1: accept() is virtual, so the call lands in the accept() of the node's real type — Mul." : "",
      marks: s({ [caller]: "active", [id]: "active" }, { from: caller, to: id, label: "accept(eval)" }),
    });
    live.push({
      note: `${n.label}::accept calls v.visit(*this). Here *this is a ${kind}.`,
      detail: caller === "main" ? `Dispatch #2: the static type of *this picks the overload visit(const ${kind}&), and because visit is virtual on Visitor, Eval's version runs. Two dispatches, one on each object: that is double dispatch.` : "",
      marks: s({ [id]: "active", eval: "dispatch" }, { from: id, to: "eval", label: `visit(${kind}&)` }),
    });
    if (n.kids) {
      pending.push(n.label);
      walk(n.kids[0], "eval");
      const left = result;
      walk(n.kids[1], "eval");
      const right = result;
      pending.pop();
      result = n.id === "mul" ? left * right : left + right;
      live.push({
        note: `Eval::visit(${kind}&) combines its two results: ${left} ${n.id === "mul" ? "×" : "+"} ${right} = ${result}.`,
        marks: s({ eval: "active", [id]: "new" }),
      });
    } else {
      result = n.value;
      live.push({ note: `Eval::visit(Num&) sets result = ${n.value}.`, marks: s({ eval: "active", [id]: "new" }) });
    }
  };
  walk("mul", "main");

  for (const f of live) {
    yield frame({ phase: "Run", note: f.note, detail: f.detail || "", marks: f.marks, metrics: [] });
  }

  yield frame({
    phase: "Run",
    note: "Print walks the same tree the same way, appending text instead of combining numbers.",
    detail: "Neither visitor needed a single change to Num, Add or Mul.",
    marks: evalScene({ result, states: { main: "active" } }),
    metrics: [printed("((2 + 3) * 4) = 20")],
  });
  yield frame({
    phase: "Done",
    note: "And Rpn, the operation added by the change request, is just one more walk.",
    marks: evalScene({ result, states: { main: "active" } }),
    metrics: [printed("rpn: 2 3 + 4 * ")],
  });
}

export const visitor = {
  id: "pat-visitor",
  section: "Design patterns",
  topic: "Behavioural",
  title: "Visitor",
  blurb: "Add new operations over a fixed set of types without editing them, using double dispatch.",
  structure: OBJECTS,
  run,

  explanation: [
    { tip: "**In one line:** each node type has a single `accept(Visitor&)`; each *operation* is a Visitor class with one `visit()` per node type." },
    "Visitor has a reputation as the hardest classic pattern. Most of that comes from **double dispatch**, which is genuinely odd the first time. The animation slows it down to one hop per step; watch the first two hops closely.",
    { h: "The smell — Strategy's problem, flipped" },
    { list: [
      "Every operation (`eval`, `print`) is a **virtual function on every node class**.",
      "Adding a node type is easy. Adding an **operation** means **opening every class** in the hierarchy.",
      "The code for one operation is **scattered** across all the node classes.",
      "This is exactly backwards when the **types are stable and operations keep coming** — compilers, document formats, serialisers.",
    ] },
    { h: "The fix" },
    { list: [
      "Nodes get **one** virtual method: `accept(Visitor& v)`, implemented as `v.visit(*this)`.",
      "A **`Visitor`** interface has one `visit()` overload **per node type**.",
      "Each operation is **a Visitor class** — all of `eval` in `Eval`, all of `print` in `Print`.",
      "A new operation is **a new class**. No node is touched.",
    ] },
    { h: "Double dispatch, in two hops" },
    { list: [
      "**Hop 1 — `e.accept(eval)`**: `accept` is virtual on `Expr`, so the *node's* real type picks the function: `Mul::accept`.",
      "**Hop 2 — `v.visit(*this)`**: inside `Mul::accept`, `*this` has static type `Mul`, so overload resolution picks `visit(const Mul&)`; `visit` is virtual on `Visitor`, so the *visitor's* real type picks `Eval::visit(const Mul&)`.",
      "Two virtual calls, one decided by each object. C++ has no built-in way to dispatch on two run-time types at once, so Visitor builds it from two single dispatches.",
    ] },
    { h: "The price" },
    "A **new node type** now means a new `visit()` in **every** visitor — the exact trade Strategy made in the other direction. Use Visitor when the set of types is **closed** and the set of operations is **open**.",
    { h: "Modern C++" },
    "**`std::variant` + `std::visit`** is Visitor built into the language. The node types are the variant's alternatives; an operation is a set of lambdas (the `overloaded` helper). There is **no `accept`**, **no base class**, and — the big win — if you add a type to the variant, **every `visit` that doesn't handle it fails to compile**. The classic version only tells you if `Visitor` declares the new overload as pure virtual.",
  ],

  analysis: {
    rows: [
      ["Run-time cost", "Two virtual calls per node visited (accept, then visit); std::visit is a jump-table lookup"],
      ["Use it when", "The set of types is fixed and stable, and new operations over them keep being added"],
      ["Avoid it when", "New types are added often — every visitor must change each time"],
    ],
    notes: [
      "Visitors often need **state** (Eval's `result`, Print's `out`) because `visit` returns `void`. The variant version returns values directly, which is usually cleaner.",
      "**Composite + Visitor** is the classic pairing: Composite builds the tree, Visitor walks it. Compilers' syntax trees are the canonical example.",
      "Visitors need access to node internals (`a.l`, `n.value`), which pushes nodes towards public data. That is a real encapsulation cost.",
      "An **acyclic visitor** (using `dynamic_cast` per type) avoids recompiling every visitor when a type is added, at the cost of run-time checks.",
    ],
  },

  code: {
    lang: "cpp",
    files: [
      { name: "before.cpp", note: "The problem: every operation lives in every class.", source: BEFORE },
      { name: "visitor.cpp", note: "The classic pattern, which the animation follows.", source: AFTER, traced: true },
      { name: "modern.cpp", note: "std::variant + std::visit: the language's own visitor.", source: MODERN },
    ],
  },
};
