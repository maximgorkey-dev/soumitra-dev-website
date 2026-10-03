/**
 * Strategy, the pilot for the design-patterns section. The frame fields are
 * documented in pat-common.js.
 */

import { frame } from "../core/trace.js";
import { OBJECTS, add, printed } from "./pat-common.js";

/* ---------------------------------------------------------------- */
/* the C++                                                           */
/* ---------------------------------------------------------------- */

const BEFORE = `// Before: the payment method is an enum, and every behaviour switches on it.
// Adding a method means finding and editing every switch.
#include <cstdio>

enum class Method { Card, Upi };                // edit 1: add Wallet

int fee(Method m, int amount) {                 // edit 2
    switch (m) {
        case Method::Card: return amount * 2 / 100;
        case Method::Upi:  return 0;
    }
    return 0;
}

const char* label(Method m) {                   // edit 3
    switch (m) {
        case Method::Card: return "card";
        case Method::Upi:  return "UPI";
    }
    return "?";
}

void pay(Method m, int amount) {                // edit 4
    switch (m) {
        case Method::Card: std::printf("charge card %d\\n", amount); break;
        case Method::Upi:  std::printf("send UPI request for %d\\n", amount); break;
    }
}

void checkout(Method m, int amount) {
    int total = amount + fee(m, amount);
    std::printf("paying by %s\\n", label(m));
    pay(m, total);
}

int main() {
    checkout(Method::Card, 500);
    checkout(Method::Upi, 500);
}
`;

const AFTER = `// After: each payment method is a class behind one interface, and Checkout
// holds whichever one it was given. Adding a method is adding a class.
#include <cstdio>
#include <memory>
#include <string>

class PaymentMethod {
public:
    virtual ~PaymentMethod() = default;
    virtual int fee(int amount) const = 0;
    virtual std::string label() const = 0;
    virtual void pay(int amount) = 0;
};

class Card : public PaymentMethod {
public:
    int fee(int amount) const override { return amount * 2 / 100; }
    std::string label() const override { return "card"; }
    void pay(int amount) override { std::printf("charge card %d\\n", amount); }
};

class Upi : public PaymentMethod {
public:
    int fee(int) const override { return 0; }
    std::string label() const override { return "UPI"; }
    void pay(int amount) override { std::printf("send UPI request for %d\\n", amount); }
};

// The change request lands here, as a new class. Nothing above is edited.
class Wallet : public PaymentMethod {
public:
    int fee(int amount) const override { return amount / 100; }
    std::string label() const override { return "wallet"; }
    void pay(int amount) override { std::printf("debit wallet %d\\n", amount); }
};

class Checkout {
public:
    explicit Checkout(std::unique_ptr<PaymentMethod> m) : method_(std::move(m)) {}

    // Swapping strategy at run time; unique_ptr destroys the old one.
    void setMethod(std::unique_ptr<PaymentMethod> m) { method_ = std::move(m); }

    void pay(int amount) {
        int total = amount + method_->fee(amount);
        std::printf("paying by %s\\n", method_->label().c_str());
        method_->pay(total);
    }

private:
    std::unique_ptr<PaymentMethod> method_;
};

int main() {
    Checkout checkout(std::make_unique<Card>());
    checkout.pay(500);

    checkout.setMethod(std::make_unique<Upi>());
    checkout.pay(500);

    checkout.setMethod(std::make_unique<Wallet>());
    checkout.pay(500);
}
`;

const MODERN = `// Two modern takes on the same idea.
#include <concepts>
#include <cstdio>
#include <functional>
#include <string>

// 1. Run-time strategy as a value. No base class and no heap object to own:
//    any callable fits, and copying a Checkout copies its strategy.
struct PaymentMethod {
    std::string label;
    std::function<int(int)> fee;
    std::function<void(int)> pay;
};

class Checkout {
public:
    explicit Checkout(PaymentMethod m) : method_(std::move(m)) {}
    void setMethod(PaymentMethod m) { method_ = std::move(m); }

    void pay(int amount) const {
        int total = amount + method_.fee(amount);
        std::printf("paying by %s\\n", method_.label.c_str());
        method_.pay(total);
    }

private:
    PaymentMethod method_;
};

// 2. Compile-time strategy. The concept is the interface; calls are direct
//    and can inline, but the choice is fixed when the code is compiled.
template <class M>
concept Payment = requires(const M m, int amount) {
    { m.fee(amount) } -> std::convertible_to<int>;
    m.pay(amount);
};

struct Card {
    int fee(int amount) const { return amount * 2 / 100; }
    void pay(int amount) const { std::printf("charge card %d\\n", amount); }
};

template <Payment M>
void checkoutWith(const M& method, int amount) {
    method.pay(amount + method.fee(amount));
}

int main() {
    Checkout checkout({"card",
                       [](int a) { return a * 2 / 100; },
                       [](int a) { std::printf("charge card %d\\n", a); }});
    checkout.pay(500);

    checkout.setMethod({"UPI",
                        [](int) { return 0; },
                        [](int a) { std::printf("send UPI request for %d\\n", a); }});
    checkout.pay(500);

    checkoutWith(Card{}, 500);
}
`;

/* ---------------------------------------------------------------- */
/* scenes                                                            */
/* ---------------------------------------------------------------- */

function beforeScene(edited) {
  const st = (id) => (edited.has(id) ? "edited" : "idle");
  const sw = (id, extra) => [
    "switch (m) {",
    "  case Card: …",
    "  case Upi:  …",
    ...(edited.has(id) ? [add(`  case Wallet: ${extra}`)] : []),
  ];
  return {
    objects: [
      { id: "enum", label: "enum Method", role: "code", x: 0.5, y: 0.08, state: st("enum"),
        lines: ["Card, Upi", ...(edited.has("enum") ? [add("Wallet")] : [])] },
      { id: "fee", label: "fee(m, amount)", role: "code", x: 0, y: 0.47, state: st("fee"), lines: sw("fee", "amt/100") },
      { id: "label", label: "label(m)", role: "code", x: 0.5, y: 0.47, state: st("label"), lines: sw("label", '"wallet"') },
      { id: "pay", label: "pay(m, amount)", role: "code", x: 1, y: 0.47, state: st("pay"), lines: sw("pay", "debit") },
      { id: "checkout", label: "checkout(m, amount)", role: "client", x: 0.5, y: 0.93,
        lines: ["fee(m, amount)", "label(m)", "pay(m, total)"] },
    ],
    links: [
      { from: "checkout", to: "fee", kind: "calls" },
      { from: "checkout", to: "label", kind: "calls" },
      { from: "checkout", to: "pay", kind: "calls" },
      { from: "fee", to: "enum", kind: "uses" },
      { from: "label", to: "enum", kind: "uses" },
      { from: "pay", to: "enum", kind: "uses" },
    ],
  };
}

const CONCRETE = {
  card: { label: "Card", x: 0, lines: ["fee: 2%", 'label: "card"', "pay: charge card"] },
  upi: { label: "Upi", x: 0.5, lines: ["fee: 0", 'label: "UPI"', "pay: send UPI request"] },
  wallet: { label: "Wallet", x: 1, lines: ["fee: 1%", 'label: "wallet"', "pay: debit wallet"] },
};

/**
 * @param held      which concrete strategy Checkout's method_ points at, or null
 * @param withWallet whether the Wallet class exists yet
 * @param states    per-object state overrides
 */
function afterScene({ held = null, withWallet = true, states = {} } = {}) {
  const ids = ["card", "upi", ...(withWallet ? ["wallet"] : [])];
  return {
    objects: [
      { id: "checkout", label: "Checkout", role: "client", x: 0.5, y: 0.08, state: states.checkout,
        lines: ["unique_ptr<PaymentMethod> method_", "pay(amount)", "setMethod(m)"] },
      { id: "iface", label: "PaymentMethod", stereo: "«interface»", role: "interface", x: 0.5, y: 0.45,
        state: states.iface, lines: ["fee(amount) const", "label() const", "pay(amount)"] },
      ...ids.map((id) => ({ id, role: "concrete", y: 0.9, state: states[id] || (held && held !== id ? "dim" : "idle"),
        ...CONCRETE[id] })),
    ],
    links: [
      { from: "checkout", to: "iface", kind: "owns", label: "has a" },
      ...ids.map((id) => ({ from: id, to: "iface", kind: "implements" })),
      ...(held ? [{ from: "checkout", to: held, kind: "ref", label: "method_" }] : []),
    ],
  };
}

/* ---------------------------------------------------------------- */
/* the walkthrough                                                   */
/* ---------------------------------------------------------------- */

function* run() {
  const edited = new Set();
  const editsMetric = () => [{ label: "places edited", value: String(edited.size) }];

  yield frame({
    phase: "Before",
    note: "Without the pattern: one enum, and three functions that each switch on it.",
    detail: "checkout() calls fee(), label() and pay(), and each of those decides what to do by looking at the enum.",
    marks: beforeScene(edited),
    metrics: editsMetric(),
  });

  const steps = [
    ["enum", "Change request: support a Wallet. First, the enum gets a new value."],
    ["fee", "fee() needs a Wallet case…"],
    ["label", "…so does label()…"],
    ["pay", "…and so does pay(). Every behaviour lives in a different place."],
  ];
  for (const [id, note] of steps) {
    edited.add(id);
    yield frame({ phase: "Before", note, marks: beforeScene(edited), metrics: editsMetric() });
  }

  yield frame({
    phase: "Before",
    note: "Four edits in four places for one new payment method.",
    detail: "Miss one and the program still compiles; -Wall only warns about an unhandled enum value. In a real codebase the switches are spread across files and nobody knows the full list.",
    marks: beforeScene(edited),
    metrics: editsMetric(),
  });

  yield frame({
    phase: "After",
    note: "With Strategy: each method's behaviour lives in its own class, behind one interface.",
    detail: "Checkout knows only PaymentMethod. Card and Upi each implement all three operations, so everything about one method is in one place.",
    marks: afterScene({ withWallet: false }),
    metrics: [{ label: "places edited", value: "0" }],
  });

  yield frame({
    phase: "After",
    note: "Same change request: Wallet is a new class. Nothing that already exists is edited.",
    detail: "This is the open/closed principle in practice: open for extension (new classes), closed for modification (existing ones untouched).",
    marks: afterScene({ states: { wallet: "new" } }),
    metrics: [{ label: "places edited", value: "0" }, { label: "new classes", value: "1" }],
  });

  // Run time: three payments, swapping the strategy between them.
  const runs = [
    { id: "card", amount: 500, fee: 10, label: "card", printed: "charge card 510", swap: null },
    { id: "upi", amount: 500, fee: 0, label: "UPI", printed: "send UPI request for 500", swap: "Upi" },
    { id: "wallet", amount: 500, fee: 5, label: "wallet", printed: "debit wallet 505", swap: "Wallet" },
  ];

  for (const r of runs) {
    const total = r.amount + r.fee;
    const scene = (states, msg) => ({ ...afterScene({ held: r.id, states }), msg });
    const m = (extra = []) => [{ label: "amount", value: String(r.amount) }, ...extra];

    if (r.swap) {
      yield frame({
        phase: "Run",
        note: `checkout.setMethod(make_unique<${r.swap}>()) swaps the strategy while the program runs.`,
        detail: "method_ now points at the new object, and unique_ptr destroys the old one. Checkout itself is unchanged.",
        marks: scene({ checkout: "active", [r.id]: "new" }),
        metrics: [],
      });
    } else {
      yield frame({
        phase: "Run",
        note: "At run time, Checkout is constructed holding a Card through method_.",
        detail: "The dashed arrow is the pointer that decides which strategy runs.",
        marks: scene({ checkout: "active" }),
        metrics: [],
      });
    }

    yield frame({
      phase: "Run",
      note: `checkout.pay(${r.amount}) asks the strategy for its fee: method_->fee(${r.amount}).`,
      detail: `A virtual call. Checkout sees only PaymentMethod; the vtable of the object behind method_ sends it to ${CONCRETE[r.id].label}::fee.`,
      marks: scene({ checkout: "active", iface: "dispatch", [r.id]: "active" }, { from: "checkout", to: r.id, label: `fee(${r.amount})` }),
      metrics: m(),
    });

    yield frame({
      phase: "Run",
      note: `${CONCRETE[r.id].label} returns a fee of ${r.fee}, and label() returns "${r.label}".`,
      marks: scene({ checkout: "active", [r.id]: "active" }, { from: r.id, to: "checkout", label: `${r.fee}, "${r.label}"`, back: true }),
      metrics: m([{ label: "fee", value: String(r.fee) }, printed(`paying by ${r.label}`)]),
    });

    yield frame({
      phase: "Run",
      note: `method_->pay(${total}) hands over the total.`,
      marks: scene({ checkout: "active", iface: "dispatch", [r.id]: "active" }, { from: "checkout", to: r.id, label: `pay(${total})` }),
      metrics: m([{ label: "fee", value: String(r.fee) }, printed(r.printed)]),
    });
  }

  yield frame({
    phase: "Done",
    note: "Three payment methods, two swaps, and Checkout's code never changed.",
    detail: "That is the whole pattern: pull a varying behaviour out behind an interface, and let the caller hold whichever one it is given.",
    marks: afterScene({ held: "wallet" }),
    metrics: [{ label: "Checkout edits", value: "0" }],
  });
}

/* ---------------------------------------------------------------- */

export const strategy = {
  id: "pat-strategy",
  section: "Design patterns",
  topic: "Behavioural",
  title: "Strategy",
  blurb: "Pull a behaviour that varies out behind an interface, so the caller can be handed, or switched to, any version of it.",
  structure: OBJECTS,
  run,

  explanation: [
    { tip: "**In one line:** put each version of a behaviour in its own class behind one interface, and let the caller hold whichever version it is given." },
    "Strategy is the pattern most of the others are built on, which is why it comes first. It solves one problem: a behaviour that comes in **several versions** — ways to pay, ways to compress, ways to price — where the code using it should not care which version it has.",
    { h: "The smell" },
    { list: [
      "The **same `switch` appears in several places**, each one switching on the same enum.",
      "Each switch is one *operation*, and each case is one *version*. So everything about a single version (one payment method) is **scattered** across all the switches.",
      "Adding a version means **finding every switch**. Miss one and it still compiles — `-Wall` only warns.",
    ] },
    { h: "The fix" },
    { list: [
      "Each version becomes a **class** implementing every operation, behind **one interface**.",
      "The caller holds a pointer to the **interface** and calls through it. Which version runs depends only on **which object it was given**.",
      "Adding a version is **writing one new class**. Nothing that exists is edited — the *open/closed principle*.",
      "The object can be **swapped at run time** (`setMethod`), and the caller never notices.",
    ] },
    { h: "The price" },
    "It is a trade, not a free win. Adding a **version** got cheap, but adding an **operation** got expensive: a new method on the interface must be written in every class. If versions are fixed and operations keep growing, prefer the switch layout — or `std::variant` with `std::visit`. **Visitor**, later in this app, is exactly that situation.",
    { h: "Modern C++" },
    { list: [
      "If the behaviour is **one function**, a `std::function` or lambda *is* a strategy: value semantics, no base class, no heap object to manage.",
      "If the choice is **known at compile time**, a template parameter constrained by a **concept** gives the same separation with no virtual call at all — but no run-time swapping.",
      "The Code tab shows all three versions side by side.",
    ] },
  ],

  analysis: {
    rows: [
      ["Run-time cost", "One indirect (virtual) call per operation; usually one heap object per strategy"],
      ["Use it when", "Versions keep being added, operations are stable, or the choice changes at run time"],
      ["Avoid it when", "Two fixed choices that never change — an if is clearer"],
    ],
    notes: [
      "Strategy and State share a class diagram. The difference is who switches: with Strategy the client chooses the object; with State the object switches itself as it changes state.",
      "Template Method solves the same problem with inheritance instead of composition: the varying step is a virtual function in a base class. Strategy is usually preferred because the behaviour can be swapped at run time and tested on its own.",
      "Dependency injection is largely Strategy applied to a class's collaborators: pass in the interface rather than constructing the concrete thing inside.",
      "std::sort's comparator, std::unique_ptr's deleter and the allocator parameter of every standard container are strategies, chosen at compile time.",
    ],
  },

  code: {
    lang: "cpp",
    files: [
      { name: "before.cpp", note: "The problem: one enum, a switch per behaviour.", source: BEFORE },
      { name: "strategy.cpp", note: "The classic pattern, which the animation follows.", source: AFTER, traced: true },
      { name: "modern.cpp", note: "The same idea with std::function, and at compile time with a concept.", source: MODERN },
    ],
  },
};
