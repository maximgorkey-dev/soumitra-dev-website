/**
 * Adapter. An app written against its own Logger interface uses a legacy XML
 * logger it can't change; one adapter class holds all the translation.
 */

import { frame } from "../core/trace.js";
import { OBJECTS, add, printed } from "./pat-common.js";

const BEFORE = `// Before: the app calls the legacy library directly, translating at every call site.
#include <cstdio>
#include <string>

// A library you cannot change.
class LegacyXmlLogger {
public:
    void writeXml(const char* tag, const std::string& text) {
        std::printf("<log level=\\"%s\\">%s</log>\\n", tag, text.c_str());
    }
};

LegacyXmlLogger xml;

void startup()  { xml.writeXml("info", "started"); }
void loadFile() { xml.writeXml("error", "file missing"); }
// Every caller knows the library's tag strings. Switching libraries means editing all of them.

int main() {
    startup();
    loadFile();
}
`;

const AFTER = `// After: the app is written against Logger; one adapter translates to the library.
#include <cstdio>
#include <string>

// The interface the application is written against.
enum class Level { Info, Error };
struct Logger {
    virtual ~Logger() = default;
    virtual void log(Level level, const std::string& msg) = 0;
};

// A library you cannot change.
class LegacyXmlLogger {
public:
    void writeXml(const char* tag, const std::string& text) {
        std::printf("<log level=\\"%s\\">%s</log>\\n", tag, text.c_str());
    }
};

class XmlLoggerAdapter : public Logger {
public:
    void log(Level level, const std::string& msg) override {
        legacy_.writeXml(level == Level::Error ? "error" : "info", msg);   // the translation
    }
private:
    LegacyXmlLogger legacy_;
};

void app(Logger& log) {
    log.log(Level::Info, "started");
    log.log(Level::Error, "file missing");
}

int main() {
    XmlLoggerAdapter adapter;
    app(adapter);
}
`;

/* ---------------------------------------------------------------- */

function beforeScene(edited) {
  const site = (id, label, x, call) => ({
    id, label, role: "client", x, y: 0.04, state: edited ? "edited" : "idle",
    lines: edited ? [call, add("json.write({level, msg})")] : [call],
  });
  return {
    objects: [
      site("start", "startup()", 0, 'xml.writeXml("info", …)'),
      site("load", "loadFile()", 1, 'xml.writeXml("error", …)'),
      { id: "legacy", label: "LegacyXmlLogger", role: "concrete", x: 0.5, y: 0.95, state: edited ? "dim" : "idle",
        lines: ["writeXml(tag, text)", "// can't change"] },
    ],
    links: [{ from: "start", to: "legacy", kind: "calls" }, { from: "load", to: "legacy", kind: "calls" }],
  };
}

function afterScene({ states = {}, msg = null, edited = false } = {}) {
  return {
    objects: [
      { id: "client", label: "App", role: "client", x: 0, y: 0.04, state: states.client || (edited ? "dim" : undefined),
        lines: ["Logger& log", "log.log(Info, msg)"] },
      { id: "iface", label: "Logger", stereo: "«interface»", role: "interface", x: 1, y: 0.04, state: states.iface,
        lines: ["log(Level, msg)"] },
      { id: "ad", label: "XmlLoggerAdapter", role: "code", x: 0.5, y: 0.52, state: states.ad || (edited ? "new" : undefined),
        lines: ["log(level, msg):", "  tag = level → \"info\" | \"error\"", "  legacy_.writeXml(tag, msg)"] },
      { id: "legacy", label: "LegacyXmlLogger", role: "concrete", x: 0.5, y: 0.97, state: states.legacy,
        lines: ["writeXml(tag, text)  // can't change"] },
    ],
    links: [
      { from: "client", to: "iface", kind: "uses" },
      { from: "ad", to: "iface", kind: "implements" },
      { from: "ad", to: "legacy", kind: "owns", label: "legacy_" },
    ],
    msg,
  };
}

function* run() {
  yield frame({
    phase: "Before",
    note: "Without the pattern: the app calls the legacy XML logger directly, and every call site spells out the library's tag strings.",
    detail: "The library's interface has leaked into the whole app. It decides how the app's code looks.",
    marks: beforeScene(false),
    metrics: [{ label: "places edited", value: "0" }],
  });
  yield frame({
    phase: "Before",
    note: "Change request: move to a JSON logging library. Every call site has to be found and rewritten.",
    detail: "Two call sites here; in a real app, hundreds, each translating levels slightly differently.",
    marks: beforeScene(true),
    metrics: [{ label: "places edited", value: "2" }],
  });
  yield frame({
    phase: "After",
    note: "With Adapter: the app is written against its own Logger interface, and one adapter class translates to the library.",
    detail: "Moving to the JSON library means writing a JsonLoggerAdapter. The app's code doesn't change at all.",
    marks: afterScene({ edited: true }),
    metrics: [{ label: "places edited", value: "2 → 1" }],
  });

  yield frame({
    phase: "Run",
    note: "The app calls log(Info, \"started\") through a Logger reference. It doesn't know an adapter is behind it.",
    marks: afterScene({ states: { client: "active", iface: "dispatch", ad: "active" }, msg: { from: "client", to: "ad", label: 'log(Info, "started")' } }),
    metrics: [],
  });
  yield frame({
    phase: "Run",
    note: "The adapter converts the level into the library's tag and forwards the call.",
    marks: afterScene({ states: { ad: "active", legacy: "active" }, msg: { from: "ad", to: "legacy", label: 'writeXml("info", …)' } }),
    metrics: [printed('<log level="info">started</log>')],
  });
  yield frame({
    phase: "Run",
    note: "An error goes through the same path, and the same translation, in one place.",
    marks: afterScene({ states: { client: "active", ad: "active", legacy: "active" }, msg: { from: "ad", to: "legacy", label: 'writeXml("error", …)' } }),
    metrics: [printed('<log level="error">file missing</log>')],
  });
  yield frame({
    phase: "Done",
    note: "The app speaks its own interface; the mismatch with the library lives in one class.",
    detail: "The legacy library was never touched. That is the usual reason for an adapter: you can't, or shouldn't, change either side.",
    marks: afterScene(),
    metrics: [{ label: "classes that know the library", value: "1" }],
  });
}

export const adapter = {
  id: "pat-adapter",
  section: "Design patterns",
  topic: "Structural",
  title: "Adapter",
  blurb: "Wrap a class whose interface doesn't fit, so it can be used where a different interface is expected.",
  structure: OBJECTS,
  run,

  explanation: [
    { tip: "**In one line:** a class that implements the interface you need by translating calls into the interface you have." },
    "Third-party libraries, legacy code and C APIs rarely match the interfaces your code is built around. An Adapter is a **translator**: the client stays clean, and all the mismatch lives in one class.",
    { h: "The smell" },
    { list: [
      "A library's types and conventions **appear all over** your code.",
      "Each call site does its own small **conversion** — of levels, units, error codes — slightly differently.",
      "Swapping the library means **touching every caller**.",
    ] },
    { h: "How it works" },
    { list: [
      "The adapter **implements the target interface** (`Logger`).",
      "It **holds the adaptee** (`LegacyXmlLogger`) as a member — *object adapter*.",
      "Each method **converts arguments and results** and forwards to the adaptee.",
    ] },
    { h: "Adapter vs. its look-alikes" },
    { list: [
      "**Decorator** keeps the same interface and adds behaviour; Adapter **changes** the interface.",
      "**Facade** simplifies a whole subsystem; Adapter makes **one** class fit **one** interface.",
      "**Bridge** is designed in up front; Adapter is retrofitted.",
    ] },
    { h: "Modern C++" },
    "When the target is a **concept** rather than a base class, an adapter is often a tiny struct or a lambda. Standard examples: `std::stack` and `std::queue` adapt a container; `std::back_inserter` adapts a container into an output iterator.",
  ],

  analysis: {
    rows: [
      ["Use it when", "An existing class does the right job behind the wrong interface"],
      ["Avoid it when", "You own both sides — change one of them instead"],
      ["Cost", "One forwarding call; conversions may copy data"],
    ],
    notes: [
      "A *class adapter* inherits privately from the adaptee instead of holding it. It can override adaptee virtuals, but couples more tightly.",
      "Wrapping a C API (`FILE*`, sockets) in a class is usually adapter and RAII at once.",
      "Keep adapters thin. Business logic that creeps into an adapter is hidden from everyone who reads the app.",
    ],
  },

  code: {
    lang: "cpp",
    files: [
      { name: "before.cpp", note: "The problem: every call site speaks the library's language.", source: BEFORE },
      { name: "adapter.cpp", note: "The classic pattern, which the animation follows.", source: AFTER, traced: true },
    ],
  },
};
