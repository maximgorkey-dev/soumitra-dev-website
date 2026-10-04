/**
 * Memento. Undo for a text editor: without the pattern the history pokes at
 * the editor's fields through getters and setters; with it, the editor hands
 * out sealed snapshots and takes them back.
 */

import { frame } from "../core/trace.js";
import { OBJECTS, add, printed } from "./pat-common.js";

const BEFORE = `// Before: the history copies the editor's fields itself.
#include <cstdio>
#include <string>
#include <vector>

class Editor {
public:
    // Public only so that History can save and restore them.
    const std::string& text() const { return text_; }
    std::size_t cursor() const { return cursor_; }
    void setText(std::string t) { text_ = std::move(t); }
    void setCursor(std::size_t c) { cursor_ = c; }
    void type(const std::string& s) { text_.insert(cursor_, s); cursor_ += s.size(); }
private:
    std::string text_ = "Hello";
    std::size_t cursor_ = 5;
};

struct Saved { std::string text; std::size_t cursor; };

class History {
public:
    void save(const Editor& ed) { stack_.push_back({ed.text(), ed.cursor()}); }
    void undo(Editor& ed) {
        ed.setText(stack_.back().text);
        ed.setCursor(stack_.back().cursor);
        stack_.pop_back();
    }
    // Change request: add a text selection. Saved, save() and undo() all
    // change, and Editor grows two more public accessors nobody else should use.
private:
    std::vector<Saved> stack_;
};

int main() {
    Editor ed;
    History h;
    h.save(ed);
    ed.type(", world");
    h.undo(ed);
    std::printf("undo -> %s\\n", ed.text().c_str());
}
`;

const AFTER = `// After: the editor makes and reads its own snapshots; nobody else can.
#include <cstdio>
#include <string>
#include <utility>
#include <vector>

class Editor {
public:
    class Memento {                              // opaque to everyone but Editor
        friend class Editor;
        Memento(std::string text, std::size_t cursor) : text_(std::move(text)), cursor_(cursor) {}
        std::string text_;
        std::size_t cursor_;
    };

    void type(const std::string& more) {
        text_.insert(cursor_, more);
        cursor_ += more.size();
        std::printf("text: %s\\n", text_.c_str());
    }
    Memento save() const { return Memento(text_, cursor_); }
    void restore(const Memento& m) { text_ = m.text_; cursor_ = m.cursor_; }
    const std::string& text() const { return text_; }

private:
    std::string text_ = "Hello";
    std::size_t cursor_ = 5;
};

class History {                                  // the caretaker: stores, never reads
public:
    void push(Editor::Memento m) { stack_.push_back(std::move(m)); }
    void undo(Editor& ed) {
        if (stack_.empty()) { std::puts("nothing to undo"); return; }
        ed.restore(stack_.back());
        stack_.pop_back();
        std::printf("undo -> %s\\n", ed.text().c_str());
    }
private:
    std::vector<Editor::Memento> stack_;
};

int main() {
    Editor ed;
    History history;

    history.push(ed.save());
    ed.type(", world");
    history.push(ed.save());
    ed.type("!");

    history.undo(ed);
    history.undo(ed);
    history.undo(ed);
}
`;

/* ---------------------------------------------------------------- */

function beforeScene(edited) {
  return {
    objects: [
      { id: "ed", label: "Editor", role: "code", x: 0, y: 0.04, state: edited ? "edited" : "idle",
        lines: ["text(), setText()", "cursor(), setCursor()", ...(edited ? [add("selection(), setSelection()")] : []), "// public only for History"] },
      { id: "hist", label: "History", role: "client", x: 1, y: 0.04, state: edited ? "edited" : "idle",
        lines: ["save: copy text, cursor", "undo: setText, setCursor", ...(edited ? [add("…and the selection, twice")] : [])] },
      { id: "saved", label: "Saved", role: "concrete", x: 1, y: 0.9, state: edited ? "edited" : "idle",
        lines: ["string text", "size_t cursor", ...(edited ? [add("Range selection")] : [])] },
    ],
    links: [
      { from: "hist", to: "ed", kind: "calls", label: "reads and writes fields" },
      { from: "hist", to: "saved", kind: "owns", label: "stack of" },
    ],
  };
}

const SNAPS = [
  { id: "m1", text: "Hello", cursor: 5 },
  { id: "m2", text: "Hello, world", cursor: 12 },
];

function afterScene({ text = "Hello", cursor = 5, stack = [], states = {}, msg = null, edited = false } = {}) {
  return {
    objects: [
      { id: "ed", label: "Editor", role: "code", x: 0, y: 0.04, state: states.ed || (edited ? "edited" : undefined),
        lines: [`text_ = "${text}"`, `cursor_ = ${cursor}`, ...(edited ? [add("selection_")] : []), "save() → Memento", "restore(Memento)"] },
      { id: "hist", label: "History", role: "client", x: 1, y: 0.04, state: states.hist,
        lines: ["vector<Memento> stack_", `${stack.length} saved`, "never looks inside"] },
      ...stack.map((id, i) => {
        const s = SNAPS.find((m) => m.id === id);
        return { id, label: `Memento ${i + 1}`, stereo: "«opaque»", role: "concrete", x: i ? 0.62 : 1, y: 0.9, state: states[id],
          lines: [`"${s.text}", ${s.cursor}`, "private, friend Editor"] };
      }),
    ],
    links: [
      { from: "hist", to: "ed", kind: "calls", label: "save / restore" },
      ...stack.map((id) => ({ from: "hist", to: id, kind: "owns" })),
    ],
    msg,
  };
}

function* run() {
  yield frame({
    phase: "Before",
    note: "Without the pattern: History saves and restores the editor by copying its fields.",
    detail: "Editor has to make text and cursor public through getters and setters, just so History can reach them.",
    marks: beforeScene(false),
    metrics: [{ label: "edits outside Editor", value: "0" }],
  });
  yield frame({
    phase: "Before",
    note: "Change request: the editor gains a text selection. History, its Saved struct and the Editor's public interface all change.",
    detail: "Every field the editor adds leaks into the undo code, and anyone holding an Editor can now call setCursor() too.",
    marks: beforeScene(true),
    metrics: [{ label: "edits outside Editor", value: "2" }],
  });
  yield frame({
    phase: "After",
    note: "With Memento: Editor packs its own state into an opaque snapshot, and History only stores snapshots.",
    detail: "Adding a selection is now one line inside Editor. History doesn't change, because it never knew what was in the box.",
    marks: afterScene({ edited: true }),
    metrics: [{ label: "edits outside Editor", value: "2 → 0" }],
  });

  yield frame({
    phase: "Run",
    note: "Before the first edit, History asks for a snapshot. Editor::save() copies text and cursor into a Memento.",
    detail: "The Memento's constructor and fields are private, with Editor as a friend. History can hold one, but can't read or forge one.",
    marks: afterScene({ stack: ["m1"], states: { hist: "active", ed: "active", m1: "new" }, msg: { from: "ed", to: "hist", label: "Memento", back: true } }),
  });
  yield frame({
    phase: "Run",
    note: "The user types \", world\". The snapshot still holds the old state.",
    marks: afterScene({ text: "Hello, world", cursor: 12, stack: ["m1"], states: { ed: "active" } }),
    metrics: [printed("text: Hello, world")],
  });
  yield frame({
    phase: "Run",
    note: "Snapshot again, then type \"!\". Two mementos on the stack, newest last.",
    marks: afterScene({ text: "Hello, world!", cursor: 13, stack: ["m1", "m2"], states: { ed: "active", m2: "new" } }),
    metrics: [printed("text: Hello, world!")],
  });
  yield frame({
    phase: "Run",
    note: "Undo: History passes the newest memento back, Editor restores itself from it, and History drops it.",
    marks: afterScene({ text: "Hello, world", cursor: 12, stack: ["m1", "m2"], states: { hist: "active", ed: "active", m2: "dim" }, msg: { from: "hist", to: "ed", label: "restore(m2)" } }),
    metrics: [printed("undo -> Hello, world")],
  });
  yield frame({
    phase: "Run",
    note: "Undo again restores the first snapshot. The cursor comes back too: the snapshot holds whatever Editor decided to put in it.",
    marks: afterScene({ stack: ["m1"], states: { hist: "active", ed: "active", m1: "dim" }, msg: { from: "hist", to: "ed", label: "restore(m1)" } }),
    metrics: [printed("undo -> Hello")],
  });
  yield frame({
    phase: "Run",
    note: "A third undo finds the stack empty, and History says so instead of crashing.",
    detail: "Calling back() on an empty vector is undefined behaviour, the classic undo bug.",
    marks: afterScene({ states: { hist: "edited" } }),
    metrics: [printed("nothing to undo")],
  });
  yield frame({
    phase: "Done",
    note: "Two edits undone, and History never read a single field.",
    detail: "The Editor's state stays private, and the undo machinery works for whatever that state grows into.",
    marks: afterScene(),
  });
}

export const memento = {
  id: "pat-memento",
  section: "Design patterns",
  topic: "Behavioural",
  title: "Memento",
  blurb: "Capture an object's state in an opaque snapshot, so it can be restored later without exposing its internals.",
  structure: OBJECTS,
  run,

  explanation: [
    { tip: "**In one line:** an object hands out sealed snapshots of its own state, and later accepts them back to roll itself back." },
    "Undo, transactions and checkpoints all need to **save state and restore it** later. The trouble is that whoever stores the snapshots shouldn't be able to poke at the object's private data. Memento solves that with **opaque** snapshots.",
    { h: "The smell" },
    { list: [
      "Getters and setters that exist **only so undo can reach the fields**.",
      "Every new field means editing the **undo code** as well as the class.",
      "Anyone can now call `setCursor()`, so the class can no longer protect its invariants.",
    ] },
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
      "Cap the history: an unbounded undo stack is a memory leak with a nice name.",
    ],
  },

  code: {
    lang: "cpp",
    files: [
      { name: "before.cpp", note: "The problem: undo reaches into the editor's fields.", source: BEFORE },
      { name: "memento.cpp", note: "The classic pattern, which the animation follows.", source: AFTER, traced: true },
    ],
  },
};
