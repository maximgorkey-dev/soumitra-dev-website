/**
 * The pattern map: one diagram of how the patterns in this section relate,
 * walked through one family at a time. Classic patterns are drawn as
 * concrete boxes, modern C++ idioms in the (blue) client style.
 */

import { note } from "./pat-common.js";

const P = (id, label, x, y, modern = false) => ({ id, label, role: modern ? "client" : "concrete", x, y, lines: [] });

/* Pairs sit one above the other where possible: link labels are drawn beside
   the line, so a short horizontal link would put its label inside a box. */
const C = [0, 0.33, 0.66, 0.92];
const R = [0.02, 0.27, 0.52, 0.77, 0.98];
const OBJECTS = [
  P("composite", "Composite", C[0], R[0]),
  P("decorator", "Decorator", C[0], R[1]),
  P("proxy", "Proxy", C[0], R[2]),
  P("command", "Command", C[0], R[3]),
  P("memento", "Memento", C[0], R[4]),
  P("template", "Template Method", C[1], R[0]),
  P("chain", "Chain of Resp.", C[1], R[2]),
  P("visitor", "Visitor", C[1], R[3]),
  P("variant", "std::variant", C[1], R[4], true),
  P("strategy", "Strategy", C[2], R[1]),
  P("policy", "Policy-based", C[2], R[2], true),
  P("observer", "Observer", C[2], R[3]),
  P("mediator", "Mediator", C[2], R[4]),
  P("state", "State", C[3], R[0]),
  P("erasure", "Type erasure", C[3], R[2], true),
  P("iterator", "Iterator", C[3], R[3]),
  P("ranges", "Ranges", C[3], R[4], true),
];

const LINKS = [
  { from: "composite", to: "decorator", kind: "uses", label: "1 vs many" },
  { from: "decorator", to: "proxy", kind: "uses", label: "adds/controls" },
  { from: "decorator", to: "chain", kind: "uses", label: "may stop" },
  { from: "observer", to: "mediator", kind: "uses", label: "broadcast / hub" },
  { from: "command", to: "memento", kind: "uses", label: "ops / snapshots" },
  { from: "template", to: "strategy", kind: "uses", label: "inherit / compose" },
  { from: "state", to: "strategy", kind: "uses", label: "who switches" },
  { from: "strategy", to: "policy", kind: "uses", label: "static" },
  { from: "strategy", to: "erasure", kind: "uses", label: "by value" },
  { from: "visitor", to: "variant", kind: "uses", label: "classic / modern" },
  { from: "iterator", to: "ranges", kind: "uses", label: "lazy" },
];

/** Light up a family; everything else dims. */
const only = (...ids) => Object.fromEntries(OBJECTS.map((o) => [o.id, ids.includes(o.id) ? "active" : "dim"]));

export const patternMap = note({
  id: "pat-map",
  topic: "Start here",
  title: "How the patterns relate",
  blurb: "One map of the section: which patterns share a shape, which solve the same problem, and which modern idiom replaces which classic one.",
  scene: { objects: OBJECTS, links: LINKS },
  steps: [
    { phase: "Map", note: "Seventeen of the patterns here, joined where comparing two of them teaches something. Grey boxes are classic patterns; blue boxes are modern C++ idioms.",
      detail: "Each link is labelled with the one difference that tells the two apart. The patterns not on the map (the creational ones, Adapter, Facade, Bridge) stand more on their own." },
    { phase: "Same shape", note: "Wrappers: Decorator, Proxy and Chain all hold one object of the same interface and forward to it. Composite holds many.",
      detail: "The structure is identical; the intent differs. Decorator always forwards and adds behaviour. Proxy decides whether and when to forward. A chain link may handle the request and stop.",
      states: only("decorator", "proxy", "chain", "composite") },
    { phase: "Same problem", note: "Swappable behaviour: Strategy, State and Template Method all vary one step of an algorithm.",
      detail: "Template Method varies it by inheritance, fixed when the class is written. Strategy composes an object the caller chooses. State is a strategy that the object swaps for itself as it changes.",
      states: only("strategy", "state", "template") },
    { phase: "Classic vs modern", note: "The same Strategy, bound three ways: a virtual call, a template policy, and a type-erased std::function.",
      detail: "Virtual: chosen at run time, one indirect call. Policy: chosen at compile time and inlined, but each choice is a different type. Type erasure: chosen at run time and held by value, with no base class for the strategies.",
      states: only("strategy", "policy", "erasure"), printed: ["virtual: 90", "policy: 90", "function: 90"] },
    { phase: "Classic vs modern", note: "Visitor and std::variant both add operations to a fixed set of types; Iterator and Ranges both separate walking from storage.",
      detail: "std::visit replaces Visitor's accept/visit double dispatch when the set of types is closed. Ranges compose iterators lazily into pipelines instead of writing a new iterator class each time.",
      states: only("visitor", "variant", "iterator", "ranges") },
    { phase: "Same problem", note: "Undo two ways: Command stores the operation and its inverse; Memento stores a snapshot of the state.",
      detail: "Commands are small but each needs a correct undo(). Snapshots are always correct but can be big. Real editors mix them.",
      states: only("command", "memento") },
    { phase: "Same problem", note: "Talking to many objects: Observer broadcasts from one subject to many listeners; Mediator routes many colleagues through one hub.",
      detail: "Observer keeps the subject ignorant of who listens. Mediator keeps the colleagues ignorant of each other. A mediator often uses observers internally.",
      states: only("observer", "mediator") },
    { phase: "Map", note: "When you meet a new problem, ask which link describes it: does behaviour vary, does access need control, does state need saving? The link points to the pattern.",
      detail: "Every box here has its own walkthrough in the list on the left." },
  ],
  explanation: [
    { tip: "**In one line:** most patterns are one of a handful of moves, and the useful question is not \"which pattern is this?\" but \"which of these neighbours is it, and why not the other one?\"" },
    "Patterns are easier to remember as **families** than as a list of 32. Several share a structure and differ only in intent; several solve the same problem with a different trade-off; and several classic patterns have a modern C++ idiom that does the same job with less code.",
    { h: "Three kinds of link" },
    { list: [
      "**Same shape, different intent** — Decorator, Proxy, Chain of Responsibility and Composite are all \"an object holding objects of its own interface\". The class diagrams are nearly identical; what the forwarding *means* is not.",
      "**Same problem, different trade-off** — Strategy, State and Template Method all let one step vary. Command and Memento both give you undo. Observer and Mediator both decouple talkers from listeners.",
      "**Classic and modern** — policy-based design, type erasure, `std::variant` and ranges are the C++ answers to Strategy, Visitor and Iterator, trading run-time flexibility for compile-time checking and value semantics.",
    ] },
    { h: "How to use the map" },
    "Start from the problem, not the pattern. If behaviour varies, look at the Strategy family and ask who chooses and when. If something wraps something else, ask whether it adds, controls or may stop. If you need undo, ask whether operations or state are cheaper to store.",
  ],
  analysis: {
    rows: [
      ["Most-confused pair", "Decorator and Proxy: the same code shape; Decorator adds behaviour, Proxy controls access"],
      ["Biggest modern shift", "Value-semantic alternatives (variant, type erasure) to inheritance hierarchies"],
      ["Not on the map", "Creational patterns, Adapter, Facade and Bridge, which have no close neighbour here"],
    ],
    notes: [
      "Iglberger's *C++ Software Design* is organised around exactly these classic-versus-modern pairs, and is the best next read.",
      "Patterns combine: a Composite is often walked by an Iterator and operated on by a Visitor; a Command history often stores Mementos.",
      "The modern idioms are not always better. Virtual dispatch keeps the set of types open; `std::variant` closes it.",
    ],
  },
  code: {
    lang: "cpp",
    files: [{ name: "strategy_three_ways.cpp", note: "The map's fourth step: one Strategy bound three ways. Its output appears on that step.", traced: true, source: `// One idea, three bindings: the Strategy family side by side.
#include <cstdio>
#include <functional>

struct Discount {                                   // Strategy: chosen at run time
    virtual ~Discount() = default;
    virtual int apply(int price) const = 0;
};
struct TenOff : Discount {
    int apply(int p) const override { return p - p / 10; }
};
int checkout(const Discount& d, int price) { return d.apply(price); }

struct TenOffPolicy {                               // Policy: chosen at compile time
    static int apply(int p) { return p - p / 10; }
};
template <class Policy>
int checkoutWith(int price) { return Policy::apply(price); }

int main() {
    std::printf("virtual: %d\\n", checkout(TenOff{}, 100));
    std::printf("policy: %d\\n", checkoutWith<TenOffPolicy>(100));

    std::function<int(int)> erased = [](int p) { return p - p / 10; };   // type erasure
    std::printf("function: %d\\n", erased(100));
}
` }],
  },
});
