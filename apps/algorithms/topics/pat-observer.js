/**
 * Observer. A price feed that notifies whoever subscribed, with subscribers
 * joining and leaving while the program runs.
 */

import { frame } from "../core/trace.js";
import { OBJECTS, add, printed } from "./pat-common.js";

const BEFORE = `// Before: the feed calls every consumer directly, so it has to know them all.
#include <cstdio>

struct Chart  { void plot(int p)  { std::printf("chart plots %d\\n", p); } };
struct Alert  { void check(int p) { if (p > 105) std::printf("alert: price above 105 (%d)\\n", p); } };
struct Logger { void write(int p) { std::printf("log %d\\n", p); } };

class PriceFeed {
public:
    void set(int price) {
        price_ = price;
        chart_.plot(price);        // every new consumer is another line here,
        alert_.check(price);       // another member below, and another include
        log_.write(price);         // at the top of this file
    }

private:
    int price_ = 0;
    Chart chart_;
    Alert alert_;
    Logger log_;
};

int main() {
    PriceFeed feed;
    feed.set(101);
    feed.set(107);
}
`;

const AFTER = `// After: the feed keeps a list of observers and tells each one. It knows the
// interface, not the consumers; they subscribe and unsubscribe themselves.
#include <algorithm>
#include <cstdio>
#include <vector>

class PriceObserver {
public:
    virtual ~PriceObserver() = default;
    virtual void onPrice(int price) = 0;
};

class PriceFeed {
public:
    void subscribe(PriceObserver* o) { observers_.push_back(o); }
    void unsubscribe(PriceObserver* o) { std::erase(observers_, o); }

    void set(int price) {
        price_ = price;
        for (PriceObserver* o : observers_) o->onPrice(price);   // notify
    }

private:
    int price_ = 0;
    std::vector<PriceObserver*> observers_;
};

class Chart : public PriceObserver {
public:
    void onPrice(int p) override { std::printf("chart plots %d\\n", p); }
};

class Alert : public PriceObserver {
public:
    void onPrice(int p) override {
        if (p > 105) std::printf("alert: price above 105 (%d)\\n", p);
    }
};

class Logger : public PriceObserver {
public:
    void onPrice(int p) override { std::printf("log %d\\n", p); }
};

int main() {
    PriceFeed feed;
    Chart chart;
    Alert alert;
    Logger logger;

    feed.subscribe(&chart);
    feed.subscribe(&alert);
    feed.set(101);

    feed.subscribe(&logger);      // joins while the program runs
    feed.set(107);

    feed.unsubscribe(&chart);     // and leaves
    feed.set(99);
}
`;

const MODERN = `// Modern: callbacks instead of a base class, and a Subscription object that
// unsubscribes in its destructor. The classic version's worst bug — an
// observer destroyed while still subscribed, leaving a dangling pointer in the
// list — cannot happen, because leaving scope is unsubscribing.
#include <cstdio>
#include <functional>
#include <map>

class PriceFeed {
public:
    using Callback = std::function<void(int)>;

    class Subscription {
    public:
        Subscription(PriceFeed& f, int id) : feed_(&f), id_(id) {}
        Subscription(const Subscription&) = delete;
        Subscription& operator=(const Subscription&) = delete;
        ~Subscription() { feed_->callbacks_.erase(id_); }
    private:
        PriceFeed* feed_;
        int id_;
    };

    [[nodiscard]] Subscription subscribe(Callback cb) {
        callbacks_.emplace(next_, std::move(cb));
        return Subscription(*this, next_++);
    }

    void set(int price) {
        for (auto& [id, cb] : callbacks_) cb(price);
    }

private:
    std::map<int, Callback> callbacks_;   // ordered, so notification order is subscription order
    int next_ = 0;
};

int main() {
    PriceFeed feed;
    auto alert = feed.subscribe([](int p) {
        if (p > 105) std::printf("alert: price above 105 (%d)\\n", p);
    });
    {
        auto chart = feed.subscribe([](int p) { std::printf("chart plots %d\\n", p); });
        feed.set(107);
    }                              // chart's Subscription is destroyed here
    feed.set(108);                 // so only the alert hears this
}
`;

/* ---------------------------------------------------------------- */

function beforeScene(withPush) {
  const st = withPush ? "edited" : "idle";
  return {
    objects: [
      { id: "feed", label: "PriceFeed", role: "code", x: 0.5, y: 0.06, state: st,
        lines: ["Chart chart_; Alert alert_;", "Logger log_;", ...(withPush ? [add("Push push_;")] : []),
          "set(p): chart_.plot(p);", "        alert_.check(p);", "        log_.write(p);", ...(withPush ? [add("        push_.send(p);")] : [])] },
      { id: "chart", label: "Chart", role: "concrete", x: 0, y: 0.95, lines: ["plot(p)"] },
      { id: "alert", label: "Alert", role: "concrete", x: 0.36, y: 0.95, lines: ["check(p)"] },
      { id: "log", label: "Logger", role: "concrete", x: 0.68, y: 0.95, lines: ["write(p)"] },
      ...(withPush ? [{ id: "push", label: "Push", role: "concrete", x: 1, y: 0.95, state: "new", lines: ["send(p)"] }] : []),
    ],
    links: ["chart", "alert", "log", ...(withPush ? ["push"] : [])].map((id) => ({ from: "feed", to: id, kind: "calls" })),
  };
}

const NAMES = { chart: "Chart", alert: "Alert", logger: "Logger" };
const X = { chart: 0.3, alert: 0.65, logger: 1 };

/** @param subs subscribed ids in notification order */
function afterScene(subs, { states = {}, msg = null, price = null } = {}) {
  return {
    objects: [
      { id: "feed", label: "PriceFeed", role: "client", x: 0.5, y: 0.04, state: states.feed,
        lines: [`observers_ = [${subs.join(", ")}]`, `price_ = ${price ?? 0}`, "set(p): for each o: o->onPrice(p)"] },
      { id: "iface", label: "PriceObserver", stereo: "«interface»", role: "interface", x: 0, y: 0.5,
        state: states.iface, lines: ["onPrice(price)"] },
      ...Object.keys(NAMES).map((id) => ({
        id, label: NAMES[id], role: "concrete", x: X[id], y: 0.95,
        state: states[id] || (subs.includes(id) ? "idle" : "dim"),
        lines: id === "alert" ? ["onPrice: if p > 105 warn"] : id === "chart" ? ["onPrice: plot"] : ["onPrice: write"],
      })),
    ],
    links: [
      { from: "feed", to: "iface", kind: "owns", label: "notifies 0..n" },
      ...Object.keys(NAMES).map((id) => ({ from: id, to: "iface", kind: "implements" })),
      ...subs.map((id) => ({ from: "feed", to: id, kind: "ref" })),
    ],
    msg,
  };
}

const OUT = {
  chart: (p) => `chart plots ${p}`,
  alert: (p) => (p > 105 ? `alert: price above 105 (${p})` : null),
  logger: (p) => `log ${p}`,
};

function* run() {
  yield frame({
    phase: "Before",
    note: "Without the pattern: the feed calls each consumer directly.",
    detail: "PriceFeed holds a Chart, an Alert and a Logger as members, and set() calls a different method on each.",
    marks: beforeScene(false),
    metrics: [{ label: "PriceFeed edits", value: "0" }],
  });
  yield frame({
    phase: "Before",
    note: "Change request: also send push notifications. PriceFeed itself has to change.",
    detail: "A new member, a new call in set(), and a new #include. The feed can't be compiled, tested or reused without every consumer it feeds.",
    marks: beforeScene(true),
    metrics: [{ label: "PriceFeed edits", value: "2" }],
  });
  yield frame({
    phase: "After",
    note: "With Observer: the feed keeps a list of PriceObserver pointers and knows nothing else.",
    detail: "Consumers implement one method, onPrice(), and put themselves on the list. A push notifier would be a new class that subscribes — PriceFeed is never opened.",
    marks: afterScene([]),
    metrics: [{ label: "PriceFeed edits", value: "0" }],
  });

  let subs = [];
  let price = 0;

  const join = function* (id, note) {
    subs = [...subs, id];
    yield frame({
      phase: "Run",
      note,
      detail: `observers_ now holds ${subs.length} pointer${subs.length > 1 ? "s" : ""}. The yellow arrows are the list.`,
      marks: afterScene(subs, { states: { feed: "active", [id]: "new" }, price }),
      metrics: [{ label: "subscribers", value: String(subs.length) }],
    });
  };

  const set = function* (p) {
    price = p;
    yield frame({
      phase: "Run",
      note: `feed.set(${p}) stores the price and walks observers_ in order.`,
      marks: afterScene(subs, { states: { feed: "active" }, price }),
      metrics: [{ label: "price", value: String(p) }, { label: "subscribers", value: String(subs.length) }],
    });
    for (const id of subs) {
      const out = OUT[id](p);
      yield frame({
        phase: "Run",
        note: `o->onPrice(${p}) on ${NAMES[id]}: ${out ? "it prints." : `${p} is not above 105, so it stays quiet.`}`,
        detail: id === subs[0] ? "A virtual call through PriceObserver. The feed does not know, or care, what kind of object is on the other end." : "",
        marks: afterScene(subs, { states: { feed: "active", iface: "dispatch", [id]: "active" }, price,
          msg: { from: "feed", to: id, label: `onPrice(${p})` } }),
        metrics: [{ label: "price", value: String(p) }, ...(out ? [printed(out)] : [])],
      });
    }
  };

  yield* join("chart", "feed.subscribe(&chart): the chart puts itself on the list.");
  yield* join("alert", "feed.subscribe(&alert): so does the alert.");
  yield* set(101);
  yield* join("logger", "feed.subscribe(&logger) while the program is running. Nothing about the feed changes.");
  yield* set(107);

  subs = subs.filter((s) => s !== "chart");
  yield frame({
    phase: "Run",
    note: "feed.unsubscribe(&chart): the chart takes itself off the list.",
    detail: "In the classic version this step is the observer's responsibility. Forget it, destroy the chart, and the feed is left holding a dangling pointer — the modern version on the Code tab makes that impossible.",
    marks: afterScene(subs, { states: { feed: "active" }, price }),
    metrics: [{ label: "subscribers", value: String(subs.length) }],
  });
  yield* set(99);

  yield frame({
    phase: "Done",
    note: "Three consumers came and went, and PriceFeed's code never mentioned any of them.",
    detail: "The dependency now points the other way: consumers depend on the feed's interface, and the feed depends on nothing but PriceObserver.",
    marks: afterScene(subs, { price }),
    metrics: [{ label: "PriceFeed edits", value: "0" }],
  });
}

export const observer = {
  id: "pat-observer",
  section: "Design patterns",
  topic: "Behavioural",
  title: "Observer",
  blurb: "Let any number of objects subscribe to changes in another, without the source knowing who they are.",
  structure: OBJECTS,
  run,

  explanation: [
    { tip: "**In one line:** the source keeps a list of interested parties and tells each one when something changes; it knows only their common interface." },
    "Observer is how almost every UI, event system and spreadsheet works. One object has state that changes — a price, a document, a sensor reading. Several others want to react. The question is **who depends on whom**.",
    { h: "The smell" },
    { list: [
      "The source **calls each consumer by name**: `chart_.plot(p); alert_.check(p); …`",
      "Every new consumer means **editing the source** — a new member, a new call, a new `#include`.",
      "The source **can't be compiled or tested** without every consumer it feeds, so a low-level class ends up depending on high-level ones.",
    ] },
    { h: "The fix" },
    { list: [
      "Define a tiny interface: **`onPrice(int)`**. That is the only thing the source knows.",
      "The source (the *subject*) keeps a **list of observers** and a `subscribe` / `unsubscribe` pair.",
      "On a change it **walks the list** and calls `onPrice` on each one — the *notify* step.",
      "Observers can **join and leave at run time**, and the subject's code never changes.",
    ] },
    { h: "The traps" },
    { list: [
      "**Dangling observers.** The subject stores raw pointers. Destroy an observer without unsubscribing and the next notification calls into freed memory. This is the number-one Observer bug in C++.",
      "**Modifying the list during notification.** An observer that unsubscribes itself inside `onPrice` invalidates the loop's iterator. Real implementations copy the list or defer removals.",
      "**Order and re-entrancy.** Observers run in subscription order, synchronously. One that triggers another `set()` causes nested notifications.",
    ] },
    { h: "Modern C++" },
    "Use **callbacks** (`std::function`) instead of a base class, and return a **`Subscription` object whose destructor unsubscribes**. Lifetime and subscription become the same thing: when the observer's scope ends, so does its subscription. Mark `subscribe` `[[nodiscard]]` so discarding the handle — which would unsubscribe immediately — is a compiler warning.",
  ],

  analysis: {
    rows: [
      ["Run-time cost", "One indirect call per observer per change; notification is O(observers)"],
      ["Use it when", "One source, many consumers, and the set of consumers changes or is unknown to the source"],
      ["Avoid it when", "There is exactly one consumer — a direct call or a single callback is clearer"],
    ],
    notes: [
      "**Mediator** is the many-to-many cousin: instead of everyone subscribing to everyone, all parties talk through one hub.",
      "Signals and slots (Qt, Boost.Signals2) are Observer with the lifetime problem solved for you, much like the modern version here.",
      "Observer is *push*: the subject sends the new value. The *pull* variant sends only \"something changed\" and lets observers query what they need.",
      "Reactive streams (RxCpp, and C++26's `std::execution` direction) are Observer extended with composition: map, filter and merge over notifications.",
    ],
  },

  code: {
    lang: "cpp",
    files: [
      { name: "before.cpp", note: "The problem: the feed names every consumer.", source: BEFORE },
      { name: "observer.cpp", note: "The classic pattern, which the animation follows.", source: AFTER, traced: true },
      { name: "modern.cpp", note: "Callbacks plus a Subscription that unsubscribes itself when destroyed.", source: MODERN },
    ],
  },
};
