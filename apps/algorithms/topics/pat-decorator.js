/**
 * Decorator. Text sinks wrapped in layers that each add one behaviour, chosen
 * and ordered at run time instead of by a subclass per combination.
 */

import { frame } from "../core/trace.js";
import { OBJECTS, printed } from "./pat-common.js";

const BEFORE = `// Before: one subclass per combination of features. Two features need four
// classes; a third doubles that to eight, and order is baked into each one.
#include <cctype>
#include <cstdio>
#include <string>

class ConsoleSink {
public:
    virtual ~ConsoleSink() = default;
    virtual void write(const std::string& s) { std::printf("%s\\n", s.c_str()); }
};

std::string upper(std::string s) {
    for (char& c : s) c = static_cast<char>(std::toupper(static_cast<unsigned char>(c)));
    return s;
}

class UpperSink : public ConsoleSink {
public:
    void write(const std::string& s) override { ConsoleSink::write(upper(s)); }
};

class NumberedSink : public ConsoleSink {
public:
    void write(const std::string& s) override { ConsoleSink::write(std::to_string(++n_) + ": " + s); }
private:
    int n_ = 0;
};

class NumberedUpperSink : public ConsoleSink {      // a copy of both, glued together
public:
    void write(const std::string& s) override { ConsoleSink::write(std::to_string(++n_) + ": " + upper(s)); }
private:
    int n_ = 0;
};

int main() {
    NumberedUpperSink sink;
    sink.write("the secret plan");
}
`;

const AFTER = `// After: every feature is a wrapper with the same interface as the thing it
// wraps. Stack them in any combination and order, at run time.
#include <cctype>
#include <cstdio>
#include <memory>
#include <string>

class Sink {
public:
    virtual ~Sink() = default;
    virtual void write(const std::string& s) = 0;
};

class ConsoleSink : public Sink {
public:
    void write(const std::string& s) override { std::printf("%s\\n", s.c_str()); }
};

// The decorator base: is-a Sink, and has-a Sink it forwards to.
class SinkDecorator : public Sink {
public:
    explicit SinkDecorator(std::unique_ptr<Sink> inner) : inner_(std::move(inner)) {}
protected:
    void forward(const std::string& s) { inner_->write(s); }
private:
    std::unique_ptr<Sink> inner_;
};

class Numbered : public SinkDecorator {
public:
    using SinkDecorator::SinkDecorator;
    void write(const std::string& s) override { forward(std::to_string(++n_) + ": " + s); }
private:
    int n_ = 0;
};

class Censor : public SinkDecorator {
public:
    using SinkDecorator::SinkDecorator;
    void write(const std::string& s) override {
        std::string out = s;
        for (auto at = out.find("secret"); at != std::string::npos; at = out.find("secret", at))
            out.replace(at, 6, "******");
        forward(out);
    }
};

class Upper : public SinkDecorator {
public:
    using SinkDecorator::SinkDecorator;
    void write(const std::string& s) override {
        std::string out = s;
        for (char& c : out) c = static_cast<char>(std::toupper(static_cast<unsigned char>(c)));
        forward(out);
    }
};

int main() {
    // Numbered -> Censor -> Upper -> Console, built inside out.
    std::unique_ptr<Sink> sink =
        std::make_unique<Numbered>(
            std::make_unique<Censor>(
                std::make_unique<Upper>(
                    std::make_unique<ConsoleSink>())));
    sink->write("the secret plan");
    sink->write("all clear");

    // Same pieces, different order: Upper runs first, so Censor never
    // sees a lower-case "secret".
    std::unique_ptr<Sink> leaky =
        std::make_unique<Upper>(
            std::make_unique<Censor>(
                std::make_unique<ConsoleSink>()));
    leaky->write("secret");
}
`;

const MODERN = `// Modern: when each layer is just a transformation, a decorator is a function
// that wraps a function. Composition replaces the class hierarchy.
#include <cctype>
#include <cstdio>
#include <functional>
#include <string>
#include <vector>

using Sink = std::function<void(const std::string&)>;
using Layer = std::function<Sink(Sink)>;

Sink console() {
    return [](const std::string& s) { std::printf("%s\\n", s.c_str()); };
}

Layer numbered() {
    return [](Sink next) {
        return [next, n = 0](const std::string& s) mutable { next(std::to_string(++n) + ": " + s); };
    };
}

Layer upper() {
    return [](Sink next) {
        return [next](std::string s) {
            for (char& c : s) c = static_cast<char>(std::toupper(static_cast<unsigned char>(c)));
            next(s);
        };
    };
}

// Layers are listed outermost first, the order the text meets them, so they
// are applied to the base in reverse.
Sink wrap(Sink base, std::initializer_list<Layer> outerFirst) {
    std::vector<Layer> layers(outerFirst);
    for (auto it = layers.rbegin(); it != layers.rend(); ++it) base = (*it)(base);
    return base;
}

int main() {
    Sink sink = wrap(console(), {numbered(), upper()});
    sink("hello");
    sink("decorated");
}
`;

/* ---------------------------------------------------------------- */

function beforeScene(withCensor) {
  const cls = (id, label, x, y, state) => ({ id, label, role: "concrete", x, y, state, lines: [] });
  const objects = [
    { id: "base", label: "ConsoleSink", role: "interface", x: 0.5, y: 0.04, lines: ["write(s)"] },
    cls("u", "UpperSink", 0, 0.42), cls("n", "NumberedSink", 0.33, 0.42), cls("nu", "NumberedUpperSink", 0.7, 0.42),
  ];
  if (withCensor) {
    objects.push(
      cls("c", "CensorSink", 1, 0.42, "new"),
      cls("cu", "CensorUpperSink", 0, 0.9, "new"), cls("cn", "CensorNumberedSink", 0.38, 0.9, "new"),
      cls("cnu", "CensorNumberedUpperSink", 0.95, 0.9, "new"),
    );
  }
  return {
    objects,
    links: objects.filter((o) => o.id !== "base").map((o) => ({ from: o.id, to: "base", kind: "implements" })),
  };
}

const CHAIN = [
  { id: "num", label: "Numbered", lines: ["prefix count"] },
  { id: "cen", label: "Censor", lines: ['"secret" → ******'] },
  { id: "up", label: "Upper", lines: ["to upper case"] },
  { id: "con", label: "ConsoleSink", lines: ["printf"] },
];

/** The run-time chain, laid out left to right in the order text flows. */
function chainScene(chain, { states = {}, msg = null, client = "sink" } = {}) {
  const n = chain.length;
  return {
    objects: [
      { id: "client", label: "main()", role: "client", x: 0, y: 0.1, lines: [`${client}->write(…)`] },
      { id: "iface", label: "Sink", stereo: "«interface»", role: "interface", x: 1, y: 0.1, lines: ["write(s)"] },
      ...chain.map((c, i) => ({
        id: c.id, label: c.label, role: c.id === "con" ? "concrete" : "code", x: n === 1 ? 0.5 : i / (n - 1), y: 0.62,
        state: states[c.id], lines: [...c.lines, ...(c.id === "con" ? [] : ["inner_ → next"])],
      })),
    ],
    links: [
      { from: "client", to: chain[0].id, kind: "ref", label: client },
      ...chain.slice(0, -1).map((c, i) => ({ from: c.id, to: chain[i + 1].id, kind: "owns", label: "inner_" })),
    ],
    msg,
  };
}

function* flow(chain, input, outputs, client) {
  let s = input;
  yield frame({
    phase: "Run",
    note: `${client}->write("${input}") goes to the outermost layer.`,
    detail: "main() holds a Sink pointer. It has no idea how many layers are behind it.",
    marks: chainScene(chain, { client, states: { [chain[0].id]: "active" }, msg: { from: "client", to: chain[0].id, label: `"${s}"` } }),
    metrics: [],
  });
  for (let i = 0; i < chain.length - 1; i++) {
    s = outputs[i];
    yield frame({
      phase: "Run",
      note: `${chain[i].label} does its one job and forwards "${s}" to the layer inside it.`,
      marks: chainScene(chain, { client, states: { [chain[i].id]: "active", [chain[i + 1].id]: "active" },
        msg: { from: chain[i].id, to: chain[i + 1].id, label: `"${s}"` } }),
      metrics: [],
    });
  }
  yield frame({
    phase: "Run",
    note: `ConsoleSink, the innermost object, prints the result.`,
    marks: chainScene(chain, { client, states: { con: "active" } }),
    metrics: [printed(s)],
  });
}

function* run() {
  yield frame({
    phase: "Before",
    note: "Without the pattern: a subclass for every combination of features.",
    detail: "Upper case and line numbers are two features, so there are three subclasses — and NumberedUpperSink is a copy-paste of the other two.",
    marks: beforeScene(false),
    metrics: [{ label: "classes", value: "4" }],
  });
  yield frame({
    phase: "Before",
    note: "Change request: add a censor. Every existing combination now needs a censored twin.",
    detail: "Features multiply: n features need 2ⁿ classes. And the order the features apply in is fixed inside each class.",
    marks: beforeScene(true),
    metrics: [{ label: "classes", value: "8" }],
  });
  yield frame({
    phase: "After",
    note: "With Decorator: each feature is a wrapper that is a Sink and holds a Sink.",
    detail: "Because a wrapper has the same interface as what it wraps, wrappers can wrap wrappers. One class per feature, combined however you like: n features, n classes.",
    marks: chainScene(CHAIN),
    metrics: [{ label: "classes", value: "5" }],
  });

  yield* flow(CHAIN, "the secret plan", ["1: the secret plan", "1: the ****** plan", "1: THE ****** PLAN"], "sink");
  yield* flow(CHAIN, "all clear", ["2: all clear", "2: all clear", "2: ALL CLEAR"], "sink");

  const leaky = [CHAIN[2], CHAIN[1], CHAIN[3]];
  yield frame({
    phase: "Order",
    note: "Same pieces, built in a different order: Upper first, then Censor.",
    detail: "Decorators compose at run time — which also means the order is your responsibility.",
    marks: chainScene(leaky, { client: "leaky" }),
    metrics: [],
  });
  yield* flow(leaky, "secret", ["SECRET", "SECRET"], "leaky");

  yield frame({
    phase: "Done",
    note: "Censor never matched: by the time it saw the text, Upper had changed it to \"SECRET\".",
    detail: "Each layer is simple; the behaviour of the stack is the composition. Decorator gives you the flexibility and hands you the ordering problem.",
    marks: chainScene(leaky, { client: "leaky", states: { cen: "edited" } }),
    metrics: [],
  });
}

export const decorator = {
  id: "pat-decorator",
  section: "Design patterns",
  topic: "Structural",
  title: "Decorator",
  blurb: "Add behaviour by wrapping an object in another with the same interface, stacking wrappers at run time.",
  structure: OBJECTS,
  run,

  explanation: [
    { tip: "**In one line:** a wrapper that *is* the interface and *has* the interface, so wrappers stack like layers of an onion." },
    "Decorator answers \"how do I add optional features to an object without a subclass per combination?\" It is the reason `std::ostream` can be buffered, and why a logging layer, a retry layer and a cache can be added to a network client without touching it.",
    { h: "The smell" },
    { list: [
      "**Subclass explosion**: every combination of features needs its own class. Two features need 3 subclasses, three need 7 — it is *2ⁿ*.",
      "Combination classes are **copy-pastes** of the single-feature ones.",
      "The **order** features apply in is fixed inside each class, and the choice is made at **compile time**.",
    ] },
    { h: "The fix" },
    { list: [
      "Every feature is a class that **implements `Sink`** and **owns a `Sink`** (`inner_`).",
      "Its `write()` does **its one job** and then **forwards** to `inner_`.",
      "Because a decorator *is* a `Sink`, it can wrap **another decorator** — so features stack.",
      "The chain is built **at run time**, in **any order**: *n* features, *n* classes.",
    ] },
    { h: "The trap" },
    "**Order matters, and nothing checks it.** In the animation, `Upper → Censor` leaks the secret because the censor looks for a lower-case word that no longer exists. Each layer is correct on its own; the bug is in the composition. Build chains in one place (a factory function) so the order is decided once.",
    { h: "Decorator vs. its look-alikes" },
    { list: [
      "**Proxy** has the same shape but *controls access* (lazy loading, permissions) rather than adding behaviour.",
      "**Adapter** *changes* the interface; Decorator *keeps* it.",
      "**Chain of Responsibility** looks like a chain of decorators, but each link may *stop* the request instead of always forwarding.",
    ] },
    { h: "Modern C++" },
    "If each layer is a **transformation**, a decorator is just **a function that wraps a function**: `Layer = std::function<Sink(Sink)>`. Compose them with a small helper. For compile-time stacking with zero overhead, use **templates** (`Numbered<Upper<Console>>`) — at the cost of fixing the chain at compile time.",
  ],

  analysis: {
    rows: [
      ["Run-time cost", "One indirect call and one heap object per layer, per call"],
      ["Use it when", "Features are optional, combinable, and chosen or reordered at run time"],
      ["Avoid it when", "There is one fixed combination — write that class directly"],
    ],
    notes: [
      "Debugging is harder: a stack trace through five wrappers that each just forward is noise. Name decorators clearly.",
      "Identity is lost: the outer object is not the inner one, so `dynamic_cast` to the concrete type of the core fails. Code that needs the core type is a sign Decorator is the wrong fit.",
      "**`std::ostream` with `std::streambuf`**, and I/O stacks in general (compression over encryption over a socket), are Decorator.",
      "The decorator base class (`SinkDecorator`) is optional but useful: it owns `inner_` once instead of in every decorator.",
    ],
  },

  code: {
    lang: "cpp",
    files: [
      { name: "before.cpp", note: "The problem: a subclass per combination.", source: BEFORE },
      { name: "decorator.cpp", note: "The classic pattern, which the animation follows.", source: AFTER, traced: true },
      { name: "modern.cpp", note: "Decorators as functions that wrap functions.", source: MODERN },
    ],
  },
};
