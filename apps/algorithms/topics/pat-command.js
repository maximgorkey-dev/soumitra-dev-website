/**
 * Command, with undo. Edits to a document become objects that know how to
 * reverse themselves, and a history stack replays them backwards.
 */

import { frame } from "../core/trace.js";
import { OBJECTS, add, printed } from "./pat-common.js";

const BEFORE = `// Before: the editor changes the text directly, and undo has to know about
// every kind of change. It also only remembers the last one.
#include <cstdio>
#include <string>

enum class Last { None, Insert, Delete };   // edit 1 for every new action

class Editor {
public:
    void type(const std::string& s) {
        text_ += s;
        last_ = Last::Insert;               // every action records itself here,
        saved_ = s;                         // in its own ad-hoc way
    }

    void deleteLast(std::size_t n) {
        saved_ = text_.substr(text_.size() - n);
        text_.erase(text_.size() - n);
        last_ = Last::Delete;
    }

    void undo() {                           // edit 2 for every new action
        switch (last_) {
            case Last::Insert: text_.erase(text_.size() - saved_.size()); break;
            case Last::Delete: text_ += saved_; break;
            case Last::None:   break;
        }
        last_ = Last::None;                 // one level only: history is gone
    }

    const std::string& text() const { return text_; }

private:
    std::string text_;
    Last last_ = Last::None;
    std::string saved_;
};

int main() {
    Editor ed;
    ed.type("Hello");
    ed.type(" world");
    ed.undo();
    ed.undo();                              // does nothing: only one step was kept
    std::printf("[%s]\\n", ed.text().c_str());
}
`;

const AFTER = `// After: each edit is a Command object that can execute and undo itself.
// History runs commands and keeps them on a stack, so undo is just "pop".
#include <cstdio>
#include <memory>
#include <string>
#include <vector>

struct Document { std::string text; };

class Command {
public:
    virtual ~Command() = default;
    virtual void execute() = 0;
    virtual void undo() = 0;
    virtual const char* name() const = 0;
};

class Insert : public Command {
public:
    Insert(Document& d, std::string s) : doc_(d), s_(std::move(s)) {}
    void execute() override { doc_.text += s_; }
    void undo() override { doc_.text.erase(doc_.text.size() - s_.size()); }
    const char* name() const override { return "insert"; }
private:
    Document& doc_;
    std::string s_;
};

class Delete : public Command {
public:
    Delete(Document& d, std::size_t n) : doc_(d), n_(n) {}
    void execute() override {                   // remembers what it removed,
        removed_ = doc_.text.substr(doc_.text.size() - n_);
        doc_.text.erase(doc_.text.size() - n_);
    }
    void undo() override { doc_.text += removed_; }   // so it can put it back
    const char* name() const override { return "delete"; }
private:
    Document& doc_;
    std::size_t n_;
    std::string removed_;
};

class History {
public:
    explicit History(Document& d) : doc_(d) {}

    void run(std::unique_ptr<Command> c) {
        c->execute();
        std::printf("did %s, text is now [%s]\\n", c->name(), doc_.text.c_str());
        done_.push_back(std::move(c));
    }

    void undo() {
        if (done_.empty()) return;
        done_.back()->undo();
        std::printf("undid %s, text is now [%s]\\n", done_.back()->name(), doc_.text.c_str());
        done_.pop_back();
    }

private:
    Document& doc_;
    std::vector<std::unique_ptr<Command>> done_;
};

int main() {
    Document doc;
    History history(doc);

    history.run(std::make_unique<Insert>(doc, "Hello"));
    history.run(std::make_unique<Insert>(doc, " world"));
    history.run(std::make_unique<Delete>(doc, 6));

    history.undo();
    history.undo();
}
`;

const MODERN = `// Modern: a command is a pair of lambdas, held by value. Captures replace
// the hand-written classes, and a second stack gives redo for free.
#include <cstdio>
#include <functional>
#include <string>
#include <vector>

struct Command {
    std::function<void()> execute;
    std::function<void()> undo;
};

class History {
public:
    void run(Command c) { c.execute(); done_.push_back(std::move(c)); undone_.clear(); }

    void undo() {
        if (done_.empty()) return;
        done_.back().undo();
        undone_.push_back(std::move(done_.back()));
        done_.pop_back();
    }

    void redo() {
        if (undone_.empty()) return;
        undone_.back().execute();
        done_.push_back(std::move(undone_.back()));
        undone_.pop_back();
    }

private:
    std::vector<Command> done_, undone_;
};

Command insert(std::string& text, std::string s) {
    return { [&text, s] { text += s; },
             [&text, s] { text.erase(text.size() - s.size()); } };
}

int main() {
    std::string text;
    History h;
    h.run(insert(text, "Hello"));
    h.run(insert(text, " world"));
    h.undo();
    std::printf("after undo: [%s]\\n", text.c_str());
    h.redo();
    std::printf("after redo: [%s]\\n", text.c_str());
}
`;

/* ---------------------------------------------------------------- */

function beforeScene(edited) {
  const st = (id) => (edited ? "edited" : "idle");
  return {
    objects: [
      { id: "enum", label: "enum Last", role: "code", x: 0.5, y: 0.05, state: st(),
        lines: ["None, Insert, Delete", ...(edited ? [add("Uppercase")] : [])] },
      { id: "type", label: "type(s)", role: "code", x: 0, y: 0.5, lines: ["text_ += s", "last_ = Insert", "saved_ = s"] },
      { id: "del", label: "deleteLast(n)", role: "code", x: 0.36, y: 0.5, lines: ["saved_ = tail", "erase tail", "last_ = Delete"] },
      ...(edited ? [{ id: "up", label: "uppercase()", role: "code", x: 0.68, y: 0.5, state: "new",
        lines: ["saved_ = text_", "to upper", "last_ = Uppercase"] }] : []),
      { id: "undo", label: "undo()", role: "code", x: 1, y: 0.96, state: st(),
        lines: ["switch (last_) {", "  case Insert: …", "  case Delete: …", ...(edited ? [add("  case Uppercase: …")] : []), "}", "last_ = None  // 1 level"] },
    ],
    links: [
      { from: "type", to: "enum", kind: "uses" },
      { from: "del", to: "enum", kind: "uses" },
      ...(edited ? [{ from: "up", to: "enum", kind: "uses" }] : []),
      { from: "undo", to: "enum", kind: "uses" },
    ],
  };
}

/**
 * @param stack  commands on the history, bottom first: [{ id, label }]
 * @param text   current document text
 */
function afterScene(stack, text, { states = {}, msg = null, cmds = [] } = {}) {
  const stackLines = stack.length ? [...stack].reverse().map((c, i) => `${i ? "  " : "▸ "}${c.label}`) : ["(empty)"];
  return {
    objects: [
      { id: "history", label: "History", role: "client", x: 0, y: 0.04, state: states.history,
        lines: ["done_ (top first):", ...stackLines] },
      { id: "iface", label: "Command", stereo: "«interface»", role: "interface", x: 0.62, y: 0.04,
        state: states.iface, lines: ["execute()", "undo()"] },
      ...cmds.map((c, i) => ({ id: c.id, label: c.label, role: "concrete", x: i * 0.5, y: 0.6,
        state: states[c.id] || (stack.some((s) => s.id === c.id) ? "idle" : "dim"), lines: c.lines })),
      { id: "doc", label: "Document", role: "concrete", x: 0.5, y: 0.98, state: states.doc,
        lines: [`text = "${text}"`] },
    ],
    links: [
      { from: "history", to: "iface", kind: "owns", label: "stack of" },
      ...cmds.map((c) => ({ from: c.id, to: "iface", kind: "implements" })),
      ...cmds.filter((c) => stack.some((s) => s.id === c.id)).map((c) => ({ from: c.id, to: "doc", kind: "ref", label: "doc_" })),
    ],
    msg,
  };
}

function* run() {
  yield frame({
    phase: "Before",
    note: "Without the pattern: actions change the text directly, and undo() switches on 'what happened last'.",
    detail: "Each action saves what undo needs in its own ad-hoc way, and undo() has to know how to reverse every one of them.",
    marks: beforeScene(false),
    metrics: [{ label: "undo levels", value: "1" }],
  });
  yield frame({
    phase: "Before",
    note: "Change request: add uppercase(). That's a new enum value, a new action, and a new case in undo().",
    detail: "And there is still only one level of undo: the second undo() does nothing, because each action overwrites saved_. Multi-level undo would mean re-designing all of it.",
    marks: beforeScene(true),
    metrics: [{ label: "places edited", value: "3" }, { label: "undo levels", value: "1" }],
  });

  const cmds = [
    { id: "c1", label: 'Insert "Hello"', lines: ["execute: text += s_", "undo: erase |s_| chars"] },
    { id: "c2", label: 'Insert " world"', lines: ["execute: text += s_", "undo: erase |s_| chars"] },
    { id: "c3", label: "Delete 6", lines: ["execute: save + erase 6", "undo: append removed_"] },
  ];

  yield frame({
    phase: "After",
    note: "With Command: each edit is an object with execute() and undo(), and History keeps a stack of them.",
    detail: "A command carries everything it needs to reverse itself. History doesn't know what any command does — only that it can be undone.",
    marks: afterScene([], "", { cmds: [] }),
    metrics: [{ label: "undo levels", value: "unlimited" }],
  });

  const stack = [];
  let text = "";
  const steps = [
    { c: cmds[0], after: "Hello" },
    { c: cmds[1], after: "Hello world" },
    { c: cmds[2], after: "Hello", removed: " world" },
  ];
  const shown = [];

  for (const s of steps) {
    shown.push(s.c);
    yield frame({
      phase: "Run",
      note: `history.run(${s.c.label}): a new command object is created and handed to History.`,
      marks: afterScene(stack, text, { cmds: shown, states: { history: "active", [s.c.id]: "new" } }),
      metrics: [{ label: "stack depth", value: String(stack.length) }],
    });
    stack.push(s.c);
    text = s.after;
    yield frame({
      phase: "Run",
      note: `History calls execute(), and the command edits the document.`,
      detail: s.removed ? `Delete saves the text it removes ("${s.removed}") inside itself. That is what will make undo possible.` : "",
      marks: afterScene(stack, text, { cmds: shown, states: { history: "active", iface: "dispatch", [s.c.id]: "active", doc: "active" },
        msg: { from: "history", to: s.c.id, label: "execute()" } }),
      metrics: [{ label: "stack depth", value: String(stack.length) }, printed(`did ${s.c.id === "c3" ? "delete" : "insert"}, text is now [${text}]`)],
    });
  }

  const undos = [
    { c: cmds[2], after: "Hello world", why: "Delete appends the text it saved." },
    { c: cmds[1], after: "Hello", why: "Insert erases as many characters as it added." },
  ];
  for (const u of undos) {
    text = u.after;
    yield frame({
      phase: "Undo",
      note: `history.undo(): pop the top command and call its undo(). ${u.why}`,
      marks: afterScene(stack, text, { cmds: shown, states: { history: "active", iface: "dispatch", [u.c.id]: "active", doc: "active" },
        msg: { from: "history", to: u.c.id, label: "undo()" } }),
      metrics: [{ label: "stack depth", value: String(stack.length - 1) },
        printed(`undid ${u.c.id === "c3" ? "delete" : "insert"}, text is now [${text}]`)],
    });
    stack.pop();
  }

  yield frame({
    phase: "Done",
    note: "Two undos, both correct, and History never knew what an insert or a delete is.",
    detail: "Adding uppercase() now means one new Command class. Undo, history, logging, macros and redo all work for it without being touched.",
    marks: afterScene(stack, text, { cmds: shown }),
    metrics: [{ label: "stack depth", value: String(stack.length) }],
  });
}

export const command = {
  id: "pat-command",
  section: "Design patterns",
  topic: "Behavioural",
  title: "Command (with undo)",
  blurb: "Turn a request into an object, so it can be stored, queued, logged and — above all — undone.",
  structure: OBJECTS,
  run,

  explanation: [
    { tip: "**In one line:** wrap each action in an object with `execute()` and `undo()`, and keep those objects on a stack." },
    "A method call happens and is gone. You can't put it in a list, send it to another thread, log it, or reverse it. Command fixes that by making the call **a thing** — an object that holds the receiver, the arguments, and whatever it needs to reverse itself.",
    { h: "The smell" },
    { list: [
      "Undo is a **giant `switch`** over \"what was the last action?\" that must know how to reverse every action in the program.",
      "Each action saves undo information **in its own ad-hoc way**, into shared fields.",
      "Only **one level** of undo, because the next action overwrites what the last one saved.",
      "Adding an action means editing the enum, the action, *and* `undo()`.",
    ] },
    { h: "The fix" },
    { list: [
      "A **`Command` interface**: `execute()` and `undo()`.",
      "Each action is a **class** that captures its receiver (the `Document`) and its arguments. `Delete` also saves the text it removed — **the undo information lives inside the command**.",
      "An *invoker*, **`History`**, runs commands and pushes them onto a stack. Undo is **pop and call `undo()`**. Unlimited levels come for free.",
      "History never learns what any command does. A new action is **one new class**.",
    ] },
    { h: "What else it buys" },
    { list: [
      "**Redo**: a second stack (see the modern version).",
      "**Macros**: a command that holds a list of commands.",
      "**Queues and threads**: hand command objects to a worker; it calls `execute()` later.",
      "**Logging and replay**: write commands down; replay them to rebuild state.",
    ] },
    { h: "Modern C++" },
    "A command is often just **two lambdas**: `std::function<void()> execute, undo`. The captures replace the hand-written fields, commands are held **by value** in a `std::vector`, and there is no class hierarchy to maintain. Keep the class form when commands need more than two operations (a name for the menu, merging consecutive keystrokes, serialisation).",
  ],

  analysis: {
    rows: [
      ["Run-time cost", "One heap object (or two std::functions) per action, kept while it is undoable"],
      ["Use it when", "Actions must be undone, queued, logged, scheduled or sent somewhere else"],
      ["Avoid it when", "The call is made once, right now, and never needs to be reversed or stored"],
    ],
    notes: [
      "Undo needs commands to be **exact inverses**. That is easy for insert and delete, hard for anything with side effects outside the document (sending an email cannot be undone).",
      "**Memento** is the alternative for undo: snapshot the whole state instead of reversing operations. Simpler, but memory grows with document size per step.",
      "History must be **cleared of redo entries** whenever a new command runs after an undo, or redo would replay a branch that no longer exists. The modern version does this in `run()`.",
      "Commands holding a **reference** to their receiver (`Document&`) must not outlive it. A history stored longer than its document needs shared or weak ownership.",
    ],
  },

  code: {
    lang: "cpp",
    files: [
      { name: "before.cpp", note: "The problem: undo switches on the last action, one level deep.", source: BEFORE },
      { name: "command.cpp", note: "The classic pattern, which the animation follows.", source: AFTER, traced: true },
      { name: "modern.cpp", note: "Commands as pairs of lambdas, held by value, with redo.", source: MODERN },
    ],
  },
};
