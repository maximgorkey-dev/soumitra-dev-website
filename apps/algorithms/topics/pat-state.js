/**
 * State. A turnstile whose behaviour depends on whether it is locked, with
 * each state an object that decides the next state itself.
 */

import { frame } from "../core/trace.js";
import { OBJECTS, add, printed } from "./pat-common.js";

const BEFORE = `// Before: one enum, and every event handler switches on it. Adding a state
// means editing every handler; adding a transition means finding the right case.
#include <cstdio>

class Turnstile {
public:
    enum class State { Locked, Unlocked };      // edit 1: add Broken

    void coin() {                               // edit 2
        switch (state_) {
            case State::Locked:   std::printf("coin accepted: unlocked\\n"); state_ = State::Unlocked; break;
            case State::Unlocked: std::printf("already unlocked: coin returned\\n"); break;
        }
    }

    void push() {                               // edit 3
        switch (state_) {
            case State::Locked:   std::printf("locked: push ignored\\n"); break;
            case State::Unlocked: std::printf("passed through: locked\\n"); state_ = State::Locked; break;
        }
    }

    // edit 4: a new repair() handler, with a case for every state

private:
    State state_ = State::Locked;
};

int main() {
    Turnstile t;
    t.push();
    t.coin();
    t.coin();
    t.push();
}
`;

const AFTER = `// After: each state is an object that handles every event for that state and
// chooses the next one. The turnstile just forwards to its current state.
#include <cstdio>

class Turnstile;

class State {
public:
    virtual ~State() = default;
    virtual void coin(Turnstile& t) = 0;
    virtual void push(Turnstile& t) = 0;
    virtual const char* name() const = 0;
};

class Locked : public State {
public:
    void coin(Turnstile& t) override;
    void push(Turnstile&) override { std::printf("locked: push ignored\\n"); }
    const char* name() const override { return "Locked"; }
};

class Unlocked : public State {
public:
    void coin(Turnstile&) override { std::printf("already unlocked: coin returned\\n"); }
    void push(Turnstile& t) override;
    const char* name() const override { return "Unlocked"; }
};

class Turnstile {
public:
    void coin() { state_->coin(*this); }        // forward the event...
    void push() { state_->push(*this); }

    // ...and let the state object pick its successor.
    void goLocked() { state_ = &locked_; }
    void goUnlocked() { state_ = &unlocked_; }

private:
    Locked locked_;
    Unlocked unlocked_;
    State* state_ = &locked_;
};

void Locked::coin(Turnstile& t) {
    std::printf("coin accepted: unlocked\\n");
    t.goUnlocked();
}

void Unlocked::push(Turnstile& t) {
    std::printf("passed through: locked\\n");
    t.goLocked();
}

int main() {
    Turnstile t;
    t.push();
    t.coin();
    t.coin();
    t.push();
}
`;

const MODERN = `// Modern: states as plain structs in a std::variant, and transitions as
// overloads of (state, event). The compiler checks every pair is handled.
#include <cstdio>
#include <variant>

struct Locked {};
struct Unlocked {};
using State = std::variant<Locked, Unlocked>;

struct Coin {};
struct Push {};

State on(Locked, Coin)   { std::printf("coin accepted: unlocked\\n"); return Unlocked{}; }
State on(Locked, Push)   { std::printf("locked: push ignored\\n"); return Locked{}; }
State on(Unlocked, Coin) { std::printf("already unlocked: coin returned\\n"); return Unlocked{}; }
State on(Unlocked, Push) { std::printf("passed through: locked\\n"); return Locked{}; }

template <class Event>
State dispatch(const State& s, Event e) {
    // Remove any on() overload and this line stops compiling.
    return std::visit([e](auto st) { return on(st, e); }, s);
}

int main() {
    State s = Locked{};
    s = dispatch(s, Push{});
    s = dispatch(s, Coin{});
    s = dispatch(s, Coin{});
    s = dispatch(s, Push{});
}
`;

/* ---------------------------------------------------------------- */

function beforeScene(edited) {
  const st = edited ? "edited" : "idle";
  return {
    objects: [
      { id: "enum", label: "enum State", role: "code", x: 0.5, y: 0.04, state: st,
        lines: ["Locked, Unlocked", ...(edited ? [add("Broken")] : [])] },
      { id: "coin", label: "coin()", role: "code", x: 0, y: 0.6, state: st,
        lines: ["switch (state_) {", "  Locked:   unlock", "  Unlocked: refund", ...(edited ? [add("  Broken:   refund")] : []), "}"] },
      { id: "push", label: "push()", role: "code", x: 0.5, y: 0.6, state: st,
        lines: ["switch (state_) {", "  Locked:   ignore", "  Unlocked: lock", ...(edited ? [add("  Broken:   ignore")] : []), "}"] },
      ...(edited ? [{ id: "repair", label: "repair()", role: "code", x: 1, y: 0.6, state: "new",
        lines: ["switch (state_) {", "  Locked:   …", "  Unlocked: …", "  Broken:   lock", "}"] }] : []),
    ],
    links: ["coin", "push", ...(edited ? ["repair"] : [])].map((id) => ({ from: id, to: "enum", kind: "uses" })),
  };
}

function afterScene(current, { states = {}, msg = null } = {}) {
  return {
    objects: [
      { id: "t", label: "Turnstile", role: "client", x: 0.5, y: 0.04, state: states.t,
        lines: [`state_ → ${current}`, "coin(): state_->coin(*this)", "push(): state_->push(*this)"] },
      { id: "iface", label: "State", stereo: "«interface»", role: "interface", x: 0.5, y: 0.5, state: states.iface,
        lines: ["coin(Turnstile&)", "push(Turnstile&)"] },
      { id: "Locked", label: "Locked", role: "concrete", x: 0, y: 0.96, state: states.Locked || (current === "Locked" ? "idle" : "dim"),
        lines: ["coin: unlock → Unlocked", "push: ignore"] },
      { id: "Unlocked", label: "Unlocked", role: "concrete", x: 1, y: 0.96, state: states.Unlocked || (current === "Unlocked" ? "idle" : "dim"),
        lines: ["coin: refund", "push: lock → Locked"] },
    ],
    links: [
      { from: "t", to: "iface", kind: "owns", label: "has a" },
      { from: "Locked", to: "iface", kind: "implements" },
      { from: "Unlocked", to: "iface", kind: "implements" },
      { from: "t", to: current, kind: "ref", label: "state_" },
    ],
    msg,
  };
}

const EVENTS = [
  { ev: "push", from: "Locked", to: "Locked", out: "locked: push ignored", why: "Locked::push does nothing — the arm stays locked." },
  { ev: "coin", from: "Locked", to: "Unlocked", out: "coin accepted: unlocked", why: "Locked::coin accepts the coin and calls t.goUnlocked()." },
  { ev: "coin", from: "Unlocked", to: "Unlocked", out: "already unlocked: coin returned", why: "The same event, a different object, a different behaviour." },
  { ev: "push", from: "Unlocked", to: "Locked", out: "passed through: locked", why: "Unlocked::push lets the person through and calls t.goLocked()." },
];

function* run() {
  yield frame({
    phase: "Before",
    note: "Without the pattern: an enum for the state, and a switch on it in every event handler.",
    detail: "The behaviour of 'Locked' is split between coin() and push(). To understand one state you read every handler.",
    marks: beforeScene(false),
    metrics: [{ label: "places edited", value: "0" }],
  });
  yield frame({
    phase: "Before",
    note: "Change request: a Broken state, and a repair() event. Every handler gets a new case, plus a new handler.",
    detail: "States × events: 3 states and 3 events is 9 cases spread across 3 switches.",
    marks: beforeScene(true),
    metrics: [{ label: "places edited", value: "4" }],
  });
  yield frame({
    phase: "After",
    note: "With State: each state is an object that handles every event, and the turnstile forwards to whichever is current.",
    detail: "Everything about 'Locked' is now in one class. Broken would be one new class, plus the transitions into it.",
    marks: afterScene("Locked"),
    metrics: [],
  });

  let cur = "Locked";
  for (const e of EVENTS) {
    yield frame({
      phase: "Run",
      note: `t.${e.ev}(): the turnstile doesn't decide anything — it forwards to state_->${e.ev}(*this).`,
      marks: afterScene(cur, { states: { t: "active", iface: "dispatch", [cur]: "active" }, msg: { from: "t", to: cur, label: `${e.ev}(*this)` } }),
      metrics: [{ label: "state", value: cur }],
    });
    const moved = e.to !== cur;
    yield frame({
      phase: "Run",
      note: e.why,
      detail: moved ? "The state object picked its own successor. Compare Strategy, where the client chooses which object to hold." : "",
      marks: afterScene(e.to, {
        states: { [cur]: "active", ...(moved ? { [e.to]: "new", t: "active" } : {}) },
        msg: moved ? { from: cur, to: "t", label: `go${e.to}()`, back: true } : null,
      }),
      metrics: [{ label: "state", value: e.to }, printed(e.out)],
    });
    cur = e.to;
  }

  yield frame({
    phase: "Done",
    note: "Four events, two transitions, and Turnstile contains no if or switch at all.",
    detail: "The state machine is spread over the state classes, one class per state, each answering every event. That is easy to extend with states and harder to see as a whole — the trade the modern version on the Code tab makes differently.",
    marks: afterScene(cur),
    metrics: [{ label: "state", value: cur }],
  });
}

export const state = {
  id: "pat-state",
  section: "Design patterns",
  topic: "Behavioural",
  title: "State",
  blurb: "Let an object change its behaviour when its state changes, by delegating to a state object that picks its own successor.",
  structure: OBJECTS,
  run,

  explanation: [
    { tip: "**In one line:** one class per state, each handling every event; the context forwards events to its current state, and states switch the context to the next one." },
    "Any object that behaves differently depending on its mode is a state machine: a connection (connecting, open, closed), a media player (playing, paused), a document (draft, review, published). State is how to write one without a switch in every method.",
    { h: "The smell" },
    { list: [
      "An **enum for the state**, and a **`switch` on it in every event handler**.",
      "Everything about one state is **scattered** across every handler.",
      "A new state means **editing every handler**; the cases grow as *states × events*.",
      "Transitions (`state_ = …`) are buried inside cases, so the shape of the machine is hard to see.",
    ] },
    { h: "The fix" },
    { list: [
      "A **`State` interface** with one method per event: `coin()`, `push()`.",
      "**One class per state**, implementing every event for that state. All of 'Locked' is in `Locked`.",
      "The context (**`Turnstile`**) holds a pointer to its current state and **forwards** every event to it.",
      "**States choose the next state** by telling the context (`t.goUnlocked()`).",
    ] },
    { h: "State vs. Strategy" },
    "The class diagrams are **identical** — a context holding a pointer to an interface. The difference is **who changes the pointer**. With **Strategy**, the *client* picks the object, and it rarely changes. With **State**, the *state objects* swap it themselves, as a consequence of handling events. Watch the yellow `state_` arrow move on its own in the animation.",
    { h: "Modern C++" },
    { list: [
      "Model states as **plain structs in a `std::variant`**, and transitions as **overloads** of `on(State, Event)` that return the next state.",
      "`std::visit` picks the overload. If any *(state, event)* pair is missing, **the code does not compile** — the classic version would silently inherit a default.",
      "The whole machine is visible in **one place** — four lines in the example — which is the classic version's weakness.",
      "The trade: adding a state means touching every event's overload set, the same trade-off as Visitor.",
    ] },
  ],

  analysis: {
    rows: [
      ["Run-time cost", "One indirect call per event; state objects can be shared or held as members, so no allocation"],
      ["Use it when", "Behaviour depends heavily on mode, with several states and events, and states keep being added"],
      ["Avoid it when", "Two states and one event — a bool and an if are clearer"],
    ],
    notes: [
      "State objects here are **members of the context** (`locked_`, `unlocked_`), so switching state allocates nothing. States that carry their own data are created on transition instead.",
      "A state that needs no data can be a **shared singleton** across all contexts — the Flyweight idea.",
      "For large machines, a **transition table** (state × event → action, next state) is often clearer than either version, and can be generated or checked by tools.",
      "Entry and exit actions (`onEnter`, `onExit`) slot naturally into the `goX()` methods.",
    ],
  },

  code: {
    lang: "cpp",
    files: [
      { name: "before.cpp", note: "The problem: a switch on the state in every handler.", source: BEFORE },
      { name: "state.cpp", note: "The classic pattern, which the animation follows.", source: AFTER, traced: true },
      { name: "modern.cpp", note: "States in a std::variant; transitions as overloads checked by the compiler.", source: MODERN },
    ],
  },
};
