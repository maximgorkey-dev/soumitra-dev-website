/**
 * More behavioural patterns, one page each: Template Method, Iterator,
 * Chain of Responsibility, Mediator, Memento.
 */

import { note } from "./pat-common.js";

const cpp = (name, source, noteText = "A complete program; the steps above follow its output.") =>
  ({ lang: "cpp", files: [{ name, note: noteText, source, traced: true }] });

/* ------------------------------------------------------------------ */

export const templateMethod = note({
  id: "pat-template-method",
  topic: "Behavioural",
  title: "Template Method",
  blurb: "The base class fixes the steps of an algorithm; subclasses fill in the steps that vary.",
  scene: {
    objects: [
      { id: "base", label: "DataExporter", role: "code", x: 0.5, y: 0.04,
        lines: ["run():  // non-virtual, fixed order", "  open(); write(); close()", "virtual write() = 0"] },
      { id: "csv", label: "CsvExporter", role: "concrete", x: 0, y: 0.92, lines: ["write(): a,b,c"] },
      { id: "json", label: "JsonExporter", role: "concrete", x: 1, y: 0.92, lines: ["write(): [a,b,c]"] },
    ],
    links: [{ from: "csv", to: "base", kind: "implements" }, { from: "json", to: "base", kind: "implements" }],
  },
  steps: [
    { note: "run() belongs to the base class. Its first step, open(), is the same for every exporter.",
      states: { base: "active" }, printed: ["open file"] },
    { note: "The varying step is a virtual call down to the subclass — here, CSV.",
      states: { base: "active", csv: "active" }, msg: { from: "base", to: "csv", label: "write()" }, printed: ["a,b,c"] },
    { note: "Control returns to the base class, which finishes the algorithm. Subclasses can't skip or reorder steps.",
      states: { base: "active" }, printed: ["close file"] },
    { note: "A JSON exporter reuses the same skeleton and supplies only its own write().",
      states: { base: "active", json: "active" }, msg: { from: "base", to: "json", label: "write()" },
      printed: ["open file", "[a,b,c]", "close file"] },
  ],
  explanation: [
    { tip: "**In one line:** a non-virtual method defines the algorithm's skeleton and calls virtual hooks for the parts that differ." },
    "Template Method is inheritance used **the right way round**: the base class stays in control of the sequence — the \"Hollywood principle\", *don't call us, we'll call you* — and subclasses only answer the questions they're asked.",
    { h: "How it works" },
    { list: [
      "The **template method** (`run()`) is public and **non-virtual**, so the order can't be overridden.",
      "Steps that vary are **pure virtual** (must override) or virtual with a default (**hooks**, may override).",
      "Steps that never vary are ordinary private functions.",
    ] },
    { h: "Template Method vs. Strategy" },
    { list: [
      "**Template Method** varies part of an algorithm by **inheritance**, fixed at compile time per subclass.",
      "**Strategy** varies the whole algorithm by **composition**, swappable at run time.",
      "In modern C++ the varying step is often just a **lambda** or template parameter — Strategy in miniature.",
    ] },
    "The **NVI idiom** (Modern C++ group) is Template Method applied to every public virtual function.",
  ],
  analysis: {
    rows: [
      ["Use it when", "Several classes share an algorithm's shape but differ in a few steps"],
      ["Avoid it when", "The variations are many or need to change at run time — prefer Strategy"],
      ["Cost", "One virtual call per varying step"],
    ],
    notes: [
      "Deep hierarchies of template methods become hard to follow — each level overriding a different hook.",
      "Never call the varying virtual steps from the base **constructor**: the subclass part doesn't exist yet.",
    ],
  },
  code: cpp("template_method.cpp", `#include <cstdio>

class DataExporter {
public:
    virtual ~DataExporter() = default;
    void run() {                    // the template method: fixed order, not virtual
        open();
        write();
        close();
    }
private:
    void open()  { std::puts("open file"); }
    void close() { std::puts("close file"); }
    virtual void write() = 0;       // the step that varies
};

class CsvExporter : public DataExporter {
    void write() override { std::puts("a,b,c"); }
};
class JsonExporter : public DataExporter {
    void write() override { std::puts("[a,b,c]"); }
};

int main() {
    CsvExporter().run();
    JsonExporter().run();
}
`),
});

/* ------------------------------------------------------------------ */

export const iterator = note({
  id: "pat-iterator",
  topic: "Behavioural",
  title: "Iterator",
  blurb: "Walk the elements of a collection without knowing how it is stored.",
  scene: {
    objects: [
      { id: "loop", label: "for (int x : range)", role: "client", x: 0.5, y: 0.04, lines: ["it = begin(); it != end(); ++it"] },
      { id: "range", label: "Countdown", role: "code", x: 0, y: 0.6, lines: ["begin() → iterator{3}", "end()   → sentinel"] },
      { id: "it", label: "iterator", role: "concrete", x: 1, y: 0.6, lines: ["n = 3", "*it, ++it, it != end"] },
    ],
    links: [
      { from: "loop", to: "range", kind: "calls", label: "begin/end" },
      { from: "loop", to: "it", kind: "calls", label: "* ++ !=" },
      { from: "range", to: "it", kind: "uses", label: "creates" },
    ],
  },
  steps: [
    { note: "The range-for asks the range for an iterator. The loop never sees how elements are produced.",
      states: { loop: "active", range: "active", it: "new" }, msg: { from: "loop", to: "range", label: "begin()" } },
    { note: "*it gives the current element; ++it moves on.",
      states: { loop: "active", it: "active" }, msg: { from: "loop", to: "it", label: "*it" }, printed: ["3"] },
    { note: "Same three operations each time round.",
      states: { loop: "active", it: "active" }, lines: { it: ["n = 2", "*it, ++it, it != end"] },
      msg: { from: "loop", to: "it", label: "++it, *it" }, printed: ["2"] },
    { note: "Elements are computed on demand — this range stores nothing at all.",
      states: { loop: "active", it: "active" }, lines: { it: ["n = 1", "*it, ++it, it != end"] },
      msg: { from: "loop", to: "it", label: "++it, *it" }, printed: ["1"] },
    { note: "When it == end(), the loop stops.",
      states: { loop: "active", it: "dim" }, lines: { it: ["n = 0", "it == end: stop"] }, printed: ["liftoff"] },
  ],
  explanation: [
    { tip: "**In one line:** a small object that remembers a position in a collection and knows how to move to the next element." },
    "Iterator is the pattern C++ **built its standard library on**. Every container, every algorithm, and the range-for loop speak the same small vocabulary, so `std::sort` works on a vector, an array, or your own type.",
    { h: "The C++ iterator vocabulary" },
    { list: [
      "`begin()` and `end()` give a **start position** and a **one-past-the-end** marker.",
      "`*it` reads the element; `++it` advances; `it != end` tests for the end.",
      "**Categories** say what else works: random access (`it + 5`), bidirectional (`--it`), forward, input.",
      "Since C++20, `end()` can be a **sentinel** of a different type — useful for \"until a condition\" ranges.",
    ] },
    { h: "Modern C++" },
    { list: [
      "**Ranges** (`std::views::filter`, `transform`) are iterators composed lazily — see Ranges pipelines.",
      "**Generators** (`std::generator`, C++23) let you write an iterator as a simple function with `co_yield`.",
    ] },
  ],
  analysis: {
    rows: [
      ["Use it when", "A custom collection or sequence should work with range-for and standard algorithms"],
      ["Cost", "Usually zero: iterators inline to pointer arithmetic or a counter"],
      ["Watch for", "Invalidation — modifying a container can leave existing iterators dangling"],
    ],
    notes: [
      "`std::vector::push_back` may reallocate and invalidate **every** iterator into the vector.",
      "For a forward-iterable type you need `value_type`, `difference_type`, `*`, pre- and post-`++`, and `==`.",
    ],
  },
  code: cpp("iterator.cpp", `#include <cstdio>

class Countdown {
public:
    explicit Countdown(int from) : from_(from) {}

    struct sentinel {};
    struct iterator {
        int n;
        int operator*() const { return n; }
        iterator& operator++() { --n; return *this; }
        bool operator!=(sentinel) const { return n > 0; }
    };

    iterator begin() const { return {from_}; }
    sentinel end() const { return {}; }

private:
    int from_;
};

int main() {
    for (int x : Countdown(3))
        std::printf("%d\\n", x);
    std::puts("liftoff");
}
`),
});

/* ------------------------------------------------------------------ */

export const chain = note({
  id: "pat-chain",
  topic: "Behavioural",
  title: "Chain of Responsibility",
  blurb: "Pass a request along a chain of handlers until one of them deals with it.",
  scene: {
    objects: [
      { id: "client", label: "Support desk", role: "client", x: 0, y: 0.04, lines: ["first.handle(ticket)"] },
      { id: "bot", label: "FaqBot", role: "concrete", x: 0, y: 0.6, lines: ["handles: password"] },
      { id: "agent", label: "Agent", role: "concrete", x: 0.5, y: 0.6, lines: ["handles: billing"] },
      { id: "eng", label: "Engineer", role: "concrete", x: 1, y: 0.6, lines: ["handles: anything"] },
    ],
    links: [
      { from: "client", to: "bot", kind: "ref" },
      { from: "bot", to: "agent", kind: "owns", label: "next_" },
      { from: "agent", to: "eng", kind: "owns", label: "next_" },
    ],
  },
  steps: [
    { note: "A password ticket enters the chain. The first handler can deal with it, so it stops there.",
      states: { client: "active", bot: "active" }, msg: { from: "client", to: "bot", label: "password" },
      printed: ["FaqBot handled: password"] },
    { note: "A billing ticket: FaqBot can't help, so it passes it to the next handler.",
      states: { bot: "dim", agent: "active" }, msg: { from: "bot", to: "agent", label: "billing" },
      printed: ["Agent handled: billing"] },
    { note: "A crash report passes FaqBot and Agent and reaches the Engineer at the end.",
      detail: "The sender never knew who would handle it — only where the chain starts.",
      states: { bot: "dim", agent: "dim", eng: "active" }, msg: { from: "agent", to: "eng", label: "crash" },
      printed: ["Engineer handled: crash"] },
  ],
  explanation: [
    { tip: "**In one line:** handlers linked in a list; each either handles the request or passes it to the next one." },
    "The sender of a request shouldn't need to know **which** object will handle it. Chain of Responsibility puts candidate handlers in order and lets the request **find its own way**.",
    { h: "How it works" },
    { list: [
      "Every handler has the same interface and a link to the **next** handler.",
      "A handler **handles** the request, **passes** it on, or does a bit of both.",
      "The chain is assembled at run time, so handlers can be **added, removed or reordered**.",
      "Decide what happens when **nobody** handles a request — a final catch-all is usually wise.",
    ] },
    { h: "Where you've seen it" },
    { list: [
      "**Middleware** in web servers: auth → logging → rate limit → handler.",
      "**GUI event bubbling**: a click goes from the button to its parent until someone consumes it.",
      "**Exception handling**: a thrown exception unwinds until a matching `catch`.",
    ] },
    "In modern C++ a chain is often just a `std::vector<std::function<bool(const Request&)>>`, tried in order.",
  ],
  analysis: {
    rows: [
      ["Use it when", "Several objects might handle a request and the right one is decided at run time"],
      ["Avoid it when", "There is always exactly one handler — just call it"],
      ["Cost", "Up to one call per handler in the chain"],
    ],
    notes: [
      "Unhandled requests can disappear silently. A logging catch-all at the end makes them visible.",
      "Long chains are hard to debug: you have to trace which link took the request.",
    ],
  },
  code: cpp("chain.cpp", `#include <cstdio>
#include <memory>
#include <string>

class Handler {
public:
    explicit Handler(std::unique_ptr<Handler> next = nullptr) : next_(std::move(next)) {}
    virtual ~Handler() = default;
    void handle(const std::string& ticket) {
        if (canHandle(ticket)) std::printf("%s handled: %s\\n", name(), ticket.c_str());
        else if (next_)        next_->handle(ticket);
        else                   std::printf("nobody handled: %s\\n", ticket.c_str());
    }
private:
    virtual bool canHandle(const std::string& ticket) const = 0;
    virtual const char* name() const = 0;
    std::unique_ptr<Handler> next_;
};

struct FaqBot : Handler {
    using Handler::Handler;
    bool canHandle(const std::string& t) const override { return t == "password"; }
    const char* name() const override { return "FaqBot"; }
};
struct Agent : Handler {
    using Handler::Handler;
    bool canHandle(const std::string& t) const override { return t == "billing"; }
    const char* name() const override { return "Agent"; }
};
struct Engineer : Handler {
    using Handler::Handler;
    bool canHandle(const std::string&) const override { return true; }
    const char* name() const override { return "Engineer"; }
};

int main() {
    auto desk = std::make_unique<FaqBot>(
                    std::make_unique<Agent>(
                        std::make_unique<Engineer>()));
    desk->handle("password");
    desk->handle("billing");
    desk->handle("crash");
}
`),
});

/* ------------------------------------------------------------------ */

export const mediator = note({
  id: "pat-mediator",
  topic: "Behavioural",
  title: "Mediator",
  blurb: "Objects talk through one coordinator instead of to each other, so they don't need to know each other.",
  scene: {
    objects: [
      { id: "m", label: "ChatRoom", role: "code", x: 0.5, y: 0.5, lines: ["send(from, text):", "  deliver to everyone else"] },
      { id: "a", label: "Alice", role: "concrete", x: 0, y: 0.04, lines: ["room_.send(this, …)"] },
      { id: "b", label: "Bob", role: "concrete", x: 1, y: 0.04, lines: ["receive(text)"] },
      { id: "c", label: "Carol", role: "concrete", x: 0.5, y: 0.97, lines: ["receive(text)"] },
    ],
    links: [
      { from: "a", to: "m", kind: "ref" }, { from: "b", to: "m", kind: "ref" }, { from: "c", to: "m", kind: "ref" },
    ],
  },
  steps: [
    { note: "Alice doesn't know Bob or Carol exist. She sends her message to the room.",
      detail: "With n participants talking directly, there are up to n·(n−1) links. With a mediator there are n.",
      states: { a: "active", m: "active" }, msg: { from: "a", to: "m", label: "hi all" } },
    { note: "The room decides who receives it — everyone except the sender.",
      states: { m: "active", b: "active" }, msg: { from: "m", to: "b", label: "Alice: hi all" },
      printed: ["Bob got: Alice: hi all"] },
    { note: "Carol too. Adding a participant changes the room, not every other participant.",
      states: { m: "active", c: "active" }, msg: { from: "m", to: "c", label: "Alice: hi all" },
      printed: ["Carol got: Alice: hi all"] },
  ],
  explanation: [
    { tip: "**In one line:** a central object that encapsulates how a group of objects interact." },
    "When many objects must react to each other — widgets on a form, aircraft near an airport, players in a chat — direct references turn into a **tangled web**. A Mediator replaces the web with a **hub**.",
    { h: "How it works" },
    { list: [
      "Each colleague knows **only the mediator**.",
      "Colleagues **report** events to the mediator; the mediator **decides** who reacts.",
      "Interaction rules live in **one place**, so changing them touches one class.",
    ] },
    { h: "Mediator vs. Observer" },
    { list: [
      "**Observer** is one-to-many broadcast: the subject doesn't care who listens.",
      "**Mediator** is many-to-many coordination with **rules**: who hears what, and what happens next.",
      "A mediator is often *implemented* with observer-style callbacks.",
    ] },
  ],
  analysis: {
    rows: [
      ["Use it when", "A group of objects interacts in complex ways and the coupling is getting out of hand"],
      ["Avoid it when", "Two or three objects talk simply — direct calls are clearer"],
      ["Cost", "One extra hop per message"],
    ],
    notes: [
      "The mediator can grow into a **god object** holding all the logic. Split it by concern if that happens.",
      "Colleagues should hold the mediator by reference and must not outlive it.",
    ],
  },
  code: cpp("mediator.cpp", `#include <cstdio>
#include <string>
#include <vector>

class ChatRoom;

class User {
public:
    User(std::string name, ChatRoom& room);
    void say(const std::string& text);
    void receive(const std::string& text) const {
        std::printf("%s got: %s\\n", name_.c_str(), text.c_str());
    }
    const std::string& name() const { return name_; }
private:
    std::string name_;
    ChatRoom& room_;
};

class ChatRoom {                              // the mediator
public:
    void join(User& u) { users_.push_back(&u); }
    void send(const User& from, const std::string& text) {
        for (const User* u : users_)
            if (u != &from) u->receive(from.name() + ": " + text);
    }
private:
    std::vector<const User*> users_;
};

User::User(std::string name, ChatRoom& room) : name_(std::move(name)), room_(room) { room_.join(*this); }
void User::say(const std::string& text) { room_.send(*this, text); }

int main() {
    ChatRoom room;
    User alice("Alice", room), bob("Bob", room), carol("Carol", room);
    alice.say("hi all");
}
`),
});

/* ------------------------------------------------------------------ */

export const memento = note({
  id: "pat-memento",
  topic: "Behavioural",
  title: "Memento",
  blurb: "Capture an object's state in an opaque snapshot, so it can be restored later without exposing its internals.",
  scene: {
    objects: [
      { id: "ed", label: "Editor", role: "code", x: 0, y: 0.04, lines: ['text_ = "Hello"', "save() → Memento", "restore(Memento)"] },
      { id: "hist", label: "History", role: "client", x: 1, y: 0.04, lines: ["stack<Memento>"] },
      { id: "m1", label: "Memento", role: "concrete", x: 1, y: 0.75, lines: ['"Hello"  (private)'] },
    ],
    links: [
      { from: "hist", to: "m1", kind: "owns" },
      { from: "hist", to: "ed", kind: "calls", label: "save / restore" },
    ],
  },
  steps: [
    { note: "Before an edit, History asks the editor for a snapshot. Only the Editor can read what's inside it.",
      states: { hist: "active", ed: "active", m1: "new" }, msg: { from: "ed", to: "hist", label: "Memento", back: true } },
    { note: "The user edits. The memento keeps the old state.",
      states: { ed: "active" }, lines: { ed: ['text_ = "Hello, world"', "save() → Memento", "restore(Memento)"] },
      printed: ["text: Hello, world"] },
    { note: "Undo: History hands the memento back, and the editor restores itself from it.",
      states: { hist: "active", ed: "active", m1: "dim" }, msg: { from: "hist", to: "ed", label: "restore(m)" },
      printed: ["undo -> text: Hello"] },
  ],
  explanation: [
    { tip: "**In one line:** an object hands out sealed snapshots of its own state, and later accepts them back to roll itself back." },
    "Undo, transactions and checkpoints all need to **save state and restore it** later. The trouble is that whoever stores the snapshots shouldn't be able to poke at the object's private data. Memento solves that with **opaque** snapshots.",
    { h: "Three roles" },
    { list: [
      "**Originator** (`Editor`) — creates a memento of its state and restores from one.",
      "**Memento** — the snapshot; its contents are private, readable only by the originator (via `friend`).",
      "**Caretaker** (`History`) — stores mementos and decides when to restore, **never looking inside**.",
    ] },
    { h: "Memento vs. Command for undo" },
    { list: [
      "**Memento** stores *state*: simple and always correct, but snapshots can be big.",
      "**Command** stores *operations* and their inverse: small, but each command needs a correct `undo()`.",
      "Editors often mix them: commands for most edits, snapshots at checkpoints.",
    ] },
  ],
  analysis: {
    rows: [
      ["Use it when", "You need undo or rollback and want to keep the object's internals private"],
      ["Avoid it when", "State is large and changes often — snapshots get expensive; store deltas instead"],
      ["Cost", "One copy of the saved state per memento"],
    ],
    notes: [
      "With **immutable** state (persistent data structures), a memento can just be a shared pointer — nearly free.",
      "A value type with copy semantics is already a memento of itself; the pattern matters when the state must stay private.",
    ],
  },
  code: cpp("memento.cpp", `#include <cstdio>
#include <string>
#include <vector>

class Editor {
public:
    class Memento {
        friend class Editor;                  // only the Editor can see inside
        explicit Memento(std::string s) : state_(std::move(s)) {}
        std::string state_;
    };

    void type(const std::string& more) { text_ += more; }
    Memento save() const { return Memento(text_); }
    void restore(const Memento& m) { text_ = m.state_; }
    const std::string& text() const { return text_; }
private:
    std::string text_ = "Hello";
};

int main() {
    Editor ed;
    std::vector<Editor::Memento> history;     // the caretaker never looks inside

    history.push_back(ed.save());
    ed.type(", world");
    std::printf("text: %s\\n", ed.text().c_str());

    ed.restore(history.back());
    history.pop_back();
    std::printf("undo -> text: %s\\n", ed.text().c_str());
}
`),
});
