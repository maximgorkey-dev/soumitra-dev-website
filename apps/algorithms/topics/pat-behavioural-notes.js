/**
 * More behavioural patterns, one page each: Template Method.
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
