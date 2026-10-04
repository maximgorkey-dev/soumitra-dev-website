/**
 * Chain of Responsibility. Expense approval: each approver handles what is
 * within its limit and passes the rest on; an audit step is linked in at run
 * time without touching any approver.
 */

import { frame } from "../core/trace.js";
import { OBJECTS, add, printed } from "./pat-common.js";

const BEFORE = `// Before: one function knows every approver, every limit, and their order.
#include <cstdio>

void approve(int amount) {
    if (amount <= 1000)        std::printf("%d: approved by team lead\\n", amount);
    else if (amount <= 10000)  std::printf("%d: approved by manager\\n", amount);
    else if (amount <= 100000) std::printf("%d: approved by director\\n", amount);
    else                       std::printf("%d: nobody can approve, escalate to the board\\n", amount);
    // An audit step, a CFO level, or "manager on holiday: skip to director"
    // all mean editing this function, and every caller gets the same order.
}

int main() {
    approve(500);
    approve(4200);
    approve(75000);
    approve(250000);
}
`;

const AFTER = `// After: each link handles what it can and passes the rest to next_.
// The sender only knows the first link.
#include <cstdio>
#include <memory>

class Handler {
public:
    virtual ~Handler() = default;
    void setNext(std::unique_ptr<Handler> n) { next_ = std::move(n); }

    void handle(int amount) {
        if (process(amount)) return;                // handled: stop here
        if (next_) next_->handle(amount);           // otherwise pass it on
        else std::printf("%d: nobody can approve, escalate to the board\\n", amount);
    }

protected:
    virtual bool process(int amount) = 0;           // true = handled

private:
    std::unique_ptr<Handler> next_;
};

class Approver : public Handler {
public:
    Approver(const char* title, int limit) : title_(title), limit_(limit) {}
private:
    bool process(int amount) override {
        if (amount > limit_) return false;
        std::printf("%d: approved by %s\\n", amount, title_);
        return true;
    }
    const char* title_;
    int limit_;
};

class Audit : public Handler {
    bool process(int amount) override {
        std::printf("audit: %d logged\\n", amount);
        return false;                               // does its part, then passes it on
    }
};

int main() {
    auto manager = std::make_unique<Approver>("manager", 10000);
    manager->setNext(std::make_unique<Approver>("director", 100000));
    auto lead = std::make_unique<Approver>("team lead", 1000);
    lead->setNext(std::move(manager));
    std::unique_ptr<Handler> chain = std::move(lead);

    chain->handle(500);
    chain->handle(4200);

    auto audit = std::make_unique<Audit>();         // a new first link;
    audit->setNext(std::move(chain));               // no other class changes
    chain = std::move(audit);

    chain->handle(75000);
    chain->handle(250000);
}
`;

const MODERN = `// Modern: a chain is often just an ordered list of callables. Each returns
// true if it handled the request. No base class, no next_ pointers, and the
// order is data you can build, sort or configure at run time.
#include <cstdio>
#include <functional>
#include <vector>

using Handler = std::function<bool(int)>;

Handler approver(const char* title, int limit) {
    return [=](int amount) {
        if (amount > limit) return false;
        std::printf("%d: approved by %s\\n", amount, title);
        return true;
    };
}

void handle(const std::vector<Handler>& chain, int amount) {
    for (const auto& h : chain)
        if (h(amount)) return;
    std::printf("%d: nobody can approve, escalate to the board\\n", amount);
}

int main() {
    std::vector<Handler> chain{
        approver("team lead", 1000), approver("manager", 10000), approver("director", 100000)};
    handle(chain, 500);

    chain.insert(chain.begin(), [](int amount) {
        std::printf("audit: %d logged\\n", amount);
        return false;
    });
    handle(chain, 75000);
}
`;

/* ---------------------------------------------------------------- */

function beforeScene(edited) {
  return {
    objects: [
      { id: "main", label: "main()", role: "client", x: 0.5, y: 0.04, lines: ["approve(500); approve(4200); …"] },
      { id: "fn", label: "approve(amount)", role: "code", x: 0.5, y: 0.42, state: edited ? "edited" : "idle",
        lines: [
          ...(edited ? [add("audit every request first")] : []),
          "if ≤ 1000: team lead",
          "else if ≤ 10000: manager",
          "else if ≤ 100000: director",
          ...(edited ? [add("else if ≤ 250000: CFO")] : []),
          "else: board",
        ] },
      { id: "b1", label: "team lead", role: "concrete", x: 0, y: 0.97, lines: [] },
      { id: "b2", label: "manager", role: "concrete", x: 0.5, y: 0.97, lines: [] },
      { id: "b3", label: "director", role: "concrete", x: 1, y: 0.97, lines: [] },
    ],
    links: [
      { from: "main", to: "fn", kind: "calls" },
      { from: "fn", to: "b1", kind: "calls" }, { from: "fn", to: "b2", kind: "calls" }, { from: "fn", to: "b3", kind: "calls" },
    ],
  };
}

const LINKS = [
  { id: "audit", label: "Audit", x: 0, lines: ["process: log it,", "then pass it on"] },
  { id: "lead", label: "Approver: team lead", x: 0.34, limit: 1000, title: "team lead" },
  { id: "manager", label: "Approver: manager", x: 0.67, limit: 10000, title: "manager" },
  { id: "director", label: "Approver: director", x: 1, limit: 100000, title: "director" },
];

function afterScene(chain, { states = {}, msg = null } = {}) {
  const present = LINKS.filter((l) => chain.includes(l.id));
  const nextOf = (id) => chain[chain.indexOf(id) + 1];
  return {
    objects: [
      { id: "main", label: "main()", role: "client", x: 0, y: 0.04, state: states.main,
        lines: ["chain->handle(amount)", `chain = ${LINKS.find((l) => l.id === chain[0]).label.replace("Approver: ", "")}`] },
      { id: "base", label: "Handler", stereo: "«abstract»", role: "interface", x: 1, y: 0.04,
        lines: ["handle(): process() or next_->handle()", "virtual process() = 0"] },
      ...present.map((l) => ({
        id: l.id, label: l.label, role: "concrete", x: l.x, y: 0.66, state: states[l.id],
        lines: l.lines || [`limit ${l.limit}`, `next_ → ${nextOf(l.id) ? LINKS.find((k) => k.id === nextOf(l.id)).title : "null"}`],
      })),
    ],
    links: [
      { from: "main", to: chain[0], kind: "ref", label: "chain" },
      ...chain.slice(0, -1).map((id, i) => ({ from: id, to: chain[i + 1], kind: "owns", label: "next_" })),
    ],
    msg,
  };
}

function* run() {
  yield frame({
    phase: "Before",
    note: "Without the pattern: one function decides who approves what.",
    detail: "Every approver, every limit and their order are hard-wired into approve().",
    marks: beforeScene(false),
    metrics: [{ label: "approve() edits", value: "0" }],
  });
  yield frame({
    phase: "Before",
    note: "Change request: audit every request, and add a CFO level. approve() has to be opened and rewritten.",
    detail: "The rules of four different people are tangled in one if/else ladder, and any caller wanting a different order needs a copy of it.",
    marks: beforeScene(true),
    metrics: [{ label: "approve() edits", value: "2" }],
  });

  let chain = ["lead", "manager", "director"];
  yield frame({
    phase: "After",
    note: "With Chain of Responsibility: each approver is a link that knows its own limit and the next link.",
    detail: "The sender holds only the first link. Who actually approves is decided by the chain, at run time.",
    marks: afterScene(chain),
  });

  const send = function* (amount) {
    yield frame({
      phase: "Run",
      note: `chain->handle(${amount}): the request goes to the first link. main() doesn't know who will deal with it.`,
      marks: afterScene(chain, { states: { main: "active", [chain[0]]: "active" }, msg: { from: "main", to: chain[0], label: `handle(${amount})` } }),
      metrics: [{ label: "amount", value: String(amount) }],
    });
    for (let i = 0; i < chain.length; i++) {
      const id = chain[i];
      const link = LINKS.find((l) => l.id === id);
      const next = chain[i + 1];
      if (id === "audit") {
        yield frame({
          phase: "Run",
          note: `Audit logs it, then passes it on: a link can do part of the work without ending the chain.`,
          marks: afterScene(chain, { states: { audit: "active", base: "dispatch" }, msg: { from: "audit", to: next, label: "next_->handle()" } }),
          metrics: [{ label: "amount", value: String(amount) }, printed(`audit: ${amount} logged`)],
        });
        continue;
      }
      if (amount <= link.limit) {
        yield frame({
          phase: "Run",
          note: `${amount} ≤ ${link.limit}: the ${link.title} approves it, and the request goes no further.`,
          marks: afterScene(chain, { states: { [id]: "new" } }),
          metrics: [{ label: "amount", value: String(amount) }, printed(`${amount}: approved by ${link.title}`)],
        });
        return;
      }
      if (next) {
        yield frame({
          phase: "Run",
          note: `${amount} > ${link.limit}: too big for the ${link.title}, who passes it to next_.`,
          marks: afterScene(chain, { states: { [id]: "active", base: "dispatch" }, msg: { from: id, to: next, label: "next_->handle()" } }),
          metrics: [{ label: "amount", value: String(amount) }],
        });
      } else {
        yield frame({
          phase: "Run",
          note: `${amount} > ${link.limit}, and the director has no next_. The request falls off the end of the chain.`,
          detail: "Decide what that means. Here it escalates; silently dropping it is the classic bug.",
          marks: afterScene(chain, { states: { [id]: "edited" } }),
          metrics: [{ label: "amount", value: String(amount) }, printed(`${amount}: nobody can approve, escalate to the board`)],
        });
      }
    }
  };

  yield* send(500);
  yield* send(4200);

  chain = ["audit", ...chain];
  yield frame({
    phase: "Run",
    note: "Link an Audit handler in at the front. No approver changes, and main() still just calls chain->handle().",
    detail: "The chain is built at run time, so links can be added, removed or reordered per request type, per region, per test.",
    marks: afterScene(chain, { states: { audit: "new", main: "active" } }),
  });

  yield* send(75000);
  yield* send(250000);

  yield frame({
    phase: "Done",
    note: "Four requests, four different outcomes, and the sender's code was identical every time.",
    detail: "Each class holds one rule. Changing the policy means re-linking objects, not editing an if/else ladder.",
    marks: afterScene(chain),
  });
}

export const chain = {
  id: "pat-chain",
  section: "Design patterns",
  topic: "Behavioural",
  title: "Chain of Responsibility",
  blurb: "Pass a request along a chain of handlers until one of them deals with it.",
  structure: OBJECTS,
  run,

  explanation: [
    { tip: "**In one line:** handlers linked in a list; each either handles the request or passes it to the next, and the sender only knows the first." },
    "Many requests have several possible handlers, tried in order: approvals by amount, support tickets by difficulty, HTTP requests through middleware. The question is **where the routing rule lives**.",
    { h: "The smell" },
    { list: [
      "An **if/else ladder** that names every handler and its condition.",
      "Adding a step — an audit, a new level, a holiday rule — means **editing the ladder**.",
      "Callers that need a **different order** can't get one without copying the function.",
    ] },
    { h: "The fix" },
    { list: [
      "Every handler implements one interface and holds a pointer to the **next** handler.",
      "`handle()` asks **\"can I deal with this?\"** — if yes, it does and stops; if not, it forwards.",
      "A handler can also do **part of the work and still forward** (the audit step).",
      "The chain is **assembled at run time**, so the policy is data, not code.",
    ] },
    { h: "The traps" },
    { list: [
      "**Falling off the end.** If no link handles a request, something must happen — a final catch-all or an explicit error. Silently dropping it is the classic bug.",
      "**Hard to trace.** Which link handled it? Logging in the base `handle()` helps.",
      "**Long chains cost.** Every request may visit every link.",
    ] },
    { h: "Modern C++" },
    "A chain is often just a **`std::vector` of `std::function<bool(const Request&)>`**, tried in order. No base class, no `next_` pointers, and inserting a link is `insert()`. Keep the linked version when handlers need to wrap the rest of the chain (run code *after* the next link returns), as middleware does.",
  ],

  analysis: {
    rows: [
      ["Run-time cost", "Up to one call per link per request"],
      ["Use it when", "Several handlers might take a request, and the set or order should change without editing the sender"],
      ["Avoid it when", "There is always exactly one handler — just call it"],
    ],
    notes: [
      "Exception handling is a built-in chain: a `throw` unwinds through `catch` blocks until one matches.",
      "GUI event bubbling is the same shape: a click goes from the widget to its parents until one consumes it.",
      "**Decorator** has the same linked structure, but every decorator always forwards; a chain link may stop.",
    ],
  },

  code: {
    lang: "cpp",
    files: [
      { name: "before.cpp", note: "The problem: one function holds every rule and their order.", source: BEFORE },
      { name: "chain.cpp", note: "The classic pattern, which the animation follows.", source: AFTER, traced: true },
      { name: "modern.cpp", note: "The chain as an ordered vector of callables.", source: MODERN },
    ],
  },
};
