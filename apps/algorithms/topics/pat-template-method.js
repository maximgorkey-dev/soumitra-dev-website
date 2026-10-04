/**
 * Template Method. Two exporters share open, write, close; the base class
 * owns that order, and a change to it is made once.
 */

import { frame } from "../core/trace.js";
import { OBJECTS, add, printed } from "./pat-common.js";

const BEFORE = `// Before: each exporter repeats the whole sequence, and the copies drift.
#include <cstdio>

struct CsvExporter {
    void run() {
        std::puts("open file");
        std::puts("x,y,z");          // header row
        std::puts("1,2,3");
        std::puts("close file");
    }
};

struct JsonExporter {
    void run() {
        std::puts("open file");
        std::puts("[1,2,3]");
        // close was forgotten here: nobody noticed, because only one copy changed
    }
};

int main() {
    CsvExporter().run();
    JsonExporter().run();
}
`;

const AFTER = `// After: the base class owns the order; subclasses supply only the steps that vary.
#include <cstdio>

class DataExporter {
public:
    virtual ~DataExporter() = default;
    void run() {                    // the template method: fixed order, not virtual
        open();
        header();
        write();
        close();
    }
private:
    void open()  { std::puts("open file"); }
    void close() { std::puts("close file"); }
    virtual void header() {}        // a hook: optional, does nothing by default
    virtual void write() = 0;       // a required step
};

class CsvExporter : public DataExporter {
    void header() override { std::puts("x,y,z"); }
    void write() override  { std::puts("1,2,3"); }
};

class JsonExporter : public DataExporter {
    void write() override { std::puts("[1,2,3]"); }
};

int main() {
    CsvExporter().run();
    JsonExporter().run();
}
`;

/* ---------------------------------------------------------------- */

function beforeScene(edited) {
  const box = (id, label, x, body, forgot) => ({
    id, label, role: "code", x, y: 0.5, state: edited ? "edited" : "idle",
    lines: ["run():", "  open file", ...body, ...(forgot ? ["  (no close)"] : ["  close file"]),
      ...(edited ? [add("  flush before close")] : [])],
  });
  return {
    objects: [
      { id: "main", label: "main()", role: "client", x: 0.5, y: 0.02, lines: ["Csv.run(); Json.run();"] },
      box("csv", "CsvExporter", 0.1, ["  x,y,z", "  1,2,3"], false),
      box("json", "JsonExporter", 0.9, ["  [1,2,3]"], true),
    ],
    links: [{ from: "main", to: "csv", kind: "calls" }, { from: "main", to: "json", kind: "calls" }],
  };
}

function afterScene({ states = {}, msg = null, edited = false } = {}) {
  return {
    objects: [
      { id: "main", label: "main()", role: "client", x: 0, y: 0.02, state: states.main || (edited ? "dim" : undefined),
        lines: ["exporter.run()"] },
      { id: "base", label: "DataExporter", role: "code", x: 0.75, y: 0.02, state: states.base || (edited ? "edited" : undefined),
        lines: ["run():  // not virtual", "  open(); header();", "  write(); close();",
          ...(edited ? [add("  flush before close")] : []),
          "virtual header() {}  // hook", "virtual write() = 0"] },
      { id: "csv", label: "CsvExporter", role: "concrete", x: 0.3, y: 0.95, state: states.csv,
        lines: ["header(): x,y,z", "write(): 1,2,3"] },
      { id: "json", label: "JsonExporter", role: "concrete", x: 1, y: 0.95, state: states.json,
        lines: ["write(): [1,2,3]"] },
    ],
    links: [
      { from: "main", to: "base", kind: "calls" },
      { from: "csv", to: "base", kind: "implements" },
      { from: "json", to: "base", kind: "implements" },
    ],
    msg,
  };
}

function* run() {
  yield frame({
    phase: "Before",
    note: "Without the pattern: each exporter writes out the whole sequence itself — open, write, close.",
    detail: "The copies have already drifted: JsonExporter never closes its file, and nothing in the code says the two are meant to match.",
    marks: beforeScene(false),
    metrics: [{ label: "places edited", value: "0" }],
  });
  yield frame({
    phase: "Before",
    note: "Change request: flush before closing. Every exporter has to be found and edited, and the order kept the same in each.",
    detail: "With five exporters this is five edits, and the one that is missed is the bug.",
    marks: beforeScene(true),
    metrics: [{ label: "places edited", value: "2" }],
  });
  yield frame({
    phase: "After",
    note: "With Template Method: DataExporter::run() fixes the order, and subclasses override only the steps that vary.",
    detail: "run() is not virtual, so no subclass can skip or reorder a step. The flush is one line in one place, and every exporter gets it.",
    marks: afterScene({ edited: true }),
    metrics: [{ label: "places edited", value: "2 → 1" }],
  });

  yield frame({
    phase: "Run",
    note: "main() calls run() on a CsvExporter. run() belongs to the base class, and its first step, open(), is shared.",
    marks: afterScene({ states: { main: "active", base: "active" }, msg: { from: "main", to: "base", label: "run()" } }),
    metrics: [printed("open file")],
  });
  yield frame({
    phase: "Run",
    note: "header() is a hook: a virtual with an empty default. CsvExporter overrides it to write its header row.",
    marks: afterScene({ states: { base: "active", csv: "dispatch" }, msg: { from: "base", to: "csv", label: "header()" } }),
    metrics: [printed("x,y,z")],
  });
  yield frame({
    phase: "Run",
    note: "write() is pure virtual, so every exporter must supply it. The call goes down to CsvExporter.",
    detail: "The base class calls the subclass, not the other way round: \"don't call us, we'll call you\".",
    marks: afterScene({ states: { base: "active", csv: "dispatch" }, msg: { from: "base", to: "csv", label: "write()" } }),
    metrics: [printed("1,2,3")],
  });
  yield frame({
    phase: "Run",
    note: "Control returns to the base class, which finishes with close().",
    marks: afterScene({ states: { base: "active", csv: "active" }, msg: { from: "csv", to: "base", label: "return", back: true } }),
    metrics: [printed("close file")],
  });
  yield frame({
    phase: "Run",
    note: "JsonExporter runs the same skeleton. It doesn't override header(), so the empty default runs and prints nothing.",
    detail: "Only write() differs. Open and close come from the base class, so this exporter can no longer forget to close.",
    marks: afterScene({ states: { main: "active", base: "active", json: "dispatch", csv: "dim" }, msg: { from: "base", to: "json", label: "write()" } }),
    metrics: [printed("open file"), printed("[1,2,3]"), printed("close file")],
  });
  yield frame({
    phase: "Done",
    note: "Two exporters, one sequence. Subclasses answer only the questions the base class asks.",
    detail: "A required step is pure virtual; an optional one is a hook with a default. Steps that never vary are private and non-virtual.",
    marks: afterScene(),
    metrics: [{ label: "copies of the sequence", value: "2 → 1" }],
  });
}

export const templateMethod = {
  id: "pat-template-method",
  section: "Design patterns",
  topic: "Behavioural",
  title: "Template Method",
  blurb: "The base class fixes the steps of an algorithm; subclasses fill in the steps that vary.",
  structure: OBJECTS,
  run,

  explanation: [
    { tip: "**In one line:** a non-virtual method defines the algorithm's skeleton and calls virtual hooks for the parts that differ." },
    "Template Method is inheritance used **the right way round**: the base class stays in control of the sequence — the \"Hollywood principle\", *don't call us, we'll call you* — and subclasses only answer the questions they're asked.",
    { h: "The smell" },
    { list: [
      "Several classes run the **same sequence of steps** and differ in one or two of them.",
      "The sequence is **copied** into each class, so the copies drift: one forgets a step, another does them out of order.",
      "A change to the sequence means **finding every copy**.",
    ] },
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
      "Keep the hooks few. Every hook is a promise to subclasses that the base class can't easily take back.",
    ],
  },

  code: {
    lang: "cpp",
    files: [
      { name: "before.cpp", note: "The problem: each exporter repeats the sequence, and one copy has drifted.", source: BEFORE },
      { name: "template_method.cpp", note: "The classic pattern, which the animation follows.", source: AFTER, traced: true },
    ],
  },
};
