/**
 * Singleton, and why to avoid it. A hand-rolled global, then the Meyers
 * singleton, then the usual better answer: one object passed in.
 */

import { frame } from "../core/trace.js";
import { OBJECTS, add, printed } from "./pat-common.js";

const BEFORE = `// Before: a global pointer, created by whichever module gets there first.
#include <cstdio>

struct Config {
    Config() { std::printf("config loaded\\n"); }
    int retries = 3;
};

Config* g_config = nullptr;

void logger()  { if (!g_config) g_config = new Config; }   // two threads here: two Configs
void network() { if (!g_config) g_config = new Config; }   // and nobody ever deletes it

int main() {
    logger();
    network();
    std::printf("retries: %d\\n", g_config->retries);
}
`;

const AFTER = `// After: the Meyers singleton. One instance, made on first use, thread-safe since C++11.
#include <cstdio>

class Config {
public:
    static Config& instance() {
        static Config c;               // constructed once, on first call
        return c;
    }
    Config(const Config&) = delete;
    Config& operator=(const Config&) = delete;

    int retries = 3;

private:
    Config() { std::printf("config loaded\\n"); }
};

void logger()  { (void)Config::instance(); }
void network() { (void)Config::instance(); }

int main() {
    logger();                              // first use: constructs
    Config* a = &Config::instance();
    network();
    Config* b = &Config::instance();
    std::printf("same object: %s\\n", a == b ? "yes" : "no");
}
`;

const INJECTED = `// Usually better: make one object in main() and pass it to whatever needs it.
#include <cstdio>

struct Config {
    int retries = 3;
};

void logger(const Config& c)  { std::printf("logger: retries=%d\\n", c.retries); }
void network(const Config& c) { std::printf("network: retries=%d\\n", c.retries); }

int main() {
    Config config;                         // still exactly one, but visible
    logger(config);
    network(config);

    Config test{.retries = 0};             // and a test can pass its own
    network(test);
}
`;

/* ---------------------------------------------------------------- */

function beforeScene(edited) {
  const user = (id, label, x, state) => ({
    id, label, role: "client", x, y: 0.04, state: state || (edited ? "edited" : "idle"),
    lines: ["if (!g_config)", "  g_config = new Config;"],
  });
  return {
    objects: [
      user("log", "logger()", 0),
      user("net", "network()", 0.5),
      ...(edited ? [{ ...user("ui", "ui()", 1, "new"), lines: [add("if (!g_config)"), add("  g_config = new Config;")] }] : []),
      { id: "cfg", label: "Config* g_config", role: "code", x: 0.5, y: 0.95, lines: ["global pointer", "public constructor"] },
    ],
    links: ["log", "net", ...(edited ? ["ui"] : [])].map((id) => ({ from: id, to: "cfg", kind: "ref" })),
  };
}

function afterScene({ states = {}, msg = null, built = true, edited = false } = {}) {
  return {
    objects: [
      { id: "a", label: "logger()", role: "client", x: 0, y: 0.04, state: states.a || (edited ? "dim" : undefined), lines: ["Config::instance()"] },
      { id: "b", label: "network()", role: "client", x: 1, y: 0.04, state: states.b || (edited ? "dim" : undefined), lines: ["Config::instance()"] },
      { id: "cfg", label: "Config", role: "code", x: 0.5, y: 0.9, state: states.cfg || (edited ? "edited" : undefined),
        lines: ["static Config& instance() {", "  static Config c;  // once", "  return c;", "}", "private: Config()",
          built ? "the one instance: made" : "the one instance: not yet"] },
    ],
    links: [{ from: "a", to: "cfg", kind: "ref" }, { from: "b", to: "cfg", kind: "ref" }],
    msg,
  };
}

function injectedScene() {
  return {
    objects: [
      { id: "main", label: "main()", role: "client", x: 0.5, y: 0.02, state: "active", lines: ["Config config;", "logger(config); network(config);"] },
      { id: "cfg", label: "Config", role: "concrete", x: 0.5, y: 0.5, state: "new", lines: ["retries = 3", "plain struct"] },
      { id: "a", label: "logger(const Config&)", role: "code", x: 0, y: 0.97, lines: ["dependency in the signature"] },
      { id: "b", label: "network(const Config&)", role: "code", x: 1, y: 0.97, lines: ["a test passes a fake"] },
    ],
    links: [
      { from: "main", to: "cfg", kind: "owns" },
      { from: "a", to: "cfg", kind: "ref" }, { from: "b", to: "cfg", kind: "ref" },
    ],
  };
}

function* run() {
  yield frame({
    phase: "Before",
    note: "Without the pattern: a global pointer, and every module that needs the config creates it if nobody has yet.",
    detail: "Two threads can both see null and make two Configs. Nobody owns it, so nobody deletes it.",
    marks: beforeScene(false),
    metrics: [{ label: "copies of the check", value: "2" }],
  });
  yield frame({
    phase: "Before",
    note: "Change request: a UI module needs the config too. It copies the same check, and the same race.",
    marks: beforeScene(true),
    metrics: [{ label: "copies of the check", value: "3" }],
  });
  yield frame({
    phase: "After",
    note: "With Singleton: Config's constructor is private, and Config::instance() is the only way in.",
    detail: "Inside it, a function-local static is constructed the first time control passes through. Since C++11 that is thread-safe: concurrent first callers wait for one construction.",
    marks: afterScene({ built: false, edited: true }),
    metrics: [{ label: "copies of the check", value: "3 → 1" }],
  });

  yield frame({
    phase: "Run",
    note: "logger() is the first caller, so its call to instance() constructs the Config.",
    marks: afterScene({ built: true, states: { a: "active", cfg: "new" }, msg: { from: "a", to: "cfg", label: "instance()" } }),
    metrics: [printed("config loaded")],
  });
  yield frame({
    phase: "Run",
    note: "network() calls instance() later and gets the same object. Nothing is constructed again.",
    marks: afterScene({ states: { b: "active", cfg: "active" }, msg: { from: "b", to: "cfg", label: "instance()" } }),
    metrics: [printed("same object: yes")],
  });
  yield frame({
    phase: "The problem",
    note: "Any function, anywhere, can now depend on Config without saying so. That is why Singleton is usually a smell.",
    detail: "Nothing in logger()'s signature shows it reads Config, so a test can't substitute a fake config, and state leaks from one test to the next. At exit, statics are destroyed in reverse order, and another static's destructor may use Config after it is gone.",
    marks: afterScene({ states: { a: "edited", b: "edited", cfg: "edited" } }),
    metrics: [{ label: "hidden dependencies", value: "2" }],
  });
  yield frame({
    phase: "Instead",
    note: "Usually better: make one Config in main() and pass it in. There is still exactly one, but every dependency is in a signature.",
    detail: "This is dependency injection. A test makes its own Config and passes that instead — see injected.cpp.",
    marks: injectedScene(),
    metrics: [{ label: "hidden dependencies", value: "0" }],
  });
}

export const singleton = {
  id: "pat-singleton",
  section: "Design patterns",
  topic: "Creational",
  title: "Singleton (and why to avoid it)",
  blurb: "Guarantee one instance of a class with a global access point — and why that is usually a design smell.",
  structure: OBJECTS,
  run,

  explanation: [
    { tip: "**In one line:** a private constructor plus a static `instance()` returning the one object — usually better replaced by creating one object and passing it where it's needed." },
    "Singleton is the best-known pattern and the most criticised. The mechanics are easy; the question is whether you should.",
    { h: "The C++ version (Meyers singleton)" },
    { list: [
      "Make the constructor **private** and delete copy and move.",
      "`static Config& instance() { static Config c; return c; }` — a **function-local static**.",
      "Since C++11, its initialisation is **thread-safe**: concurrent first callers wait for one construction.",
      "It is constructed **on first use**, which avoids the *static initialisation order fiasco* between globals in different files.",
    ] },
    { h: "Why it's usually a smell" },
    { list: [
      "**Hidden dependencies**: a function's signature no longer tells you what it uses.",
      "**Untestable**: tests can't swap in a fake, and state leaks between tests.",
      "**Global mutable state** with all the usual concurrency problems.",
      "**Destruction order** at exit is reverse of construction, and other statics may use it after it's gone.",
    ] },
    { h: "What to do instead" },
    "Create **one** object in `main()` and **pass it** (by reference, or through constructors) to whatever needs it — *dependency injection*. You still have one instance; it's just visible. Reserve true singletons for things that really are unique to the process and stateless to callers: a logger sink, a hardware register map.",
  ],

  analysis: {
    rows: [
      ["Use it when", "There truly is one per process, it is effectively immutable, and threading it through every call is impractical"],
      ["Avoid it when", "Almost always — pass the dependency instead"],
      ["Watch out for", "Singletons used from other statics' destructors, after they have been destroyed"],
    ],
    notes: [
      "A *Monostate* (all-static data behind normal-looking objects) has the same problems with less honesty.",
      "If you must have global access, a singleton holding an **interface pointer** that tests can replace is the least bad form.",
    ],
  },

  code: {
    lang: "cpp",
    files: [
      { name: "before.cpp", note: "The problem: a global pointer created by whoever gets there first.", source: BEFORE },
      { name: "singleton.cpp", note: "The Meyers singleton, which the animation follows.", source: AFTER, traced: true },
      { name: "injected.cpp", note: "Usually better: one object, passed in.", source: INJECTED },
    ],
  },
};
