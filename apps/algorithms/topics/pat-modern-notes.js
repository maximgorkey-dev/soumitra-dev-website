/**
 * More modern C++ idioms, one page each: PIMPL, NVI, Rule of zero,
 * Policy-based design, Ranges pipelines, Concepts.
 */

import { note } from "./pat-common.js";

const cpp = (name, source, noteText = "A complete program; the steps above follow its output.") =>
  ({ lang: "cpp", files: [{ name, note: noteText, source, traced: true }] });

/* ------------------------------------------------------------------ */

export const pimpl = note({
  id: "pat-pimpl",
  topic: "Modern C++",
  title: "PIMPL",
  blurb: "Pointer to implementation: move a class's private members into a hidden struct, so the header stops changing.",
  scene: {
    objects: [
      { id: "client", label: "client.cpp", role: "client", x: 0, y: 0.04, lines: ['#include "widget.h"', "Widget w; w.draw();"] },
      { id: "hdr", label: "widget.h", role: "interface", x: 1, y: 0.04, lines: ["class Widget {", "  struct Impl;", "  unique_ptr<Impl> p_;", "};"] },
      { id: "impl", label: "Widget::Impl (widget.cpp)", role: "code", x: 0.5, y: 0.95, lines: ["std::string name;", "int clicks;", "#include <heavy stuff>"] },
    ],
    links: [
      { from: "client", to: "hdr", kind: "uses", label: "sees only this" },
      { from: "hdr", to: "impl", kind: "owns", label: "p_" },
    ],
  },
  steps: [
    { note: "The header shows only a forward-declared Impl and a pointer to it. Clients can't see any private member.",
      states: { client: "active", hdr: "active" }, printed: ["sizeof(Widget) = one pointer"] },
    { note: "Calls go through the pointer to the real members, which live in the .cpp file.",
      states: { hdr: "active", impl: "active" }, msg: { from: "hdr", to: "impl", label: "draw()" },
      printed: ["draw button (clicks: 0)"] },
    { note: "Adding a private member edits only Impl in the .cpp. widget.h is untouched, so clients don't recompile.",
      detail: "The binary layout of Widget doesn't change either — useful for stable library ABIs.",
      states: { impl: "edited" }, lines: { impl: ["std::string name;", "int clicks;", "Theme theme;   // new", "#include <heavy stuff>"] } },
  ],
  explanation: [
    { tip: "**In one line:** the class holds a `std::unique_ptr` to a struct defined only in the .cpp, which holds all the private data." },
    "In C++ a class's private members are still **in the header**. Change one, and every file that includes the header recompiles; include a heavy library for a member, and every client includes it too. PIMPL **moves the privates out**.",
    { h: "How it works" },
    { list: [
      "The header **forward-declares** `struct Impl;` and holds `std::unique_ptr<Impl>`.",
      "The .cpp **defines** `Impl` and all member functions, which forward to it.",
      "Declare the **destructor** (and moves) in the header but define them in the .cpp — `= default` there — because `unique_ptr` needs the complete `Impl` to delete it.",
    ] },
    { h: "What you gain and pay" },
    { list: [
      "**Gain:** faster builds, headers free of implementation includes, a **stable ABI**.",
      "**Pay:** a heap allocation per object, a pointer hop per call, and forwarding boilerplate.",
    ] },
    "PIMPL is a **Bridge** with exactly one implementation, used for build hygiene rather than for variation.",
  ],
  analysis: {
    rows: [
      ["Use it when", "A widely included class changes often, or a library needs a stable ABI"],
      ["Avoid it when", "The class is small and hot — the allocation and indirection cost real time"],
      ["Gotcha", "\"incomplete type\" errors mean the destructor was generated in the header"],
    ],
    notes: [
      "Copying needs a hand-written copy constructor that clones the `Impl`; moves can be `= default` in the .cpp.",
      "Qt uses this everywhere (`d`-pointers) to keep binary compatibility across releases.",
    ],
  },
  code: cpp("pimpl.cpp", `#include <cstdio>
#include <memory>
#include <string>

// ---- widget.h: what clients see -------------------------------------
class Widget {
public:
    explicit Widget(std::string name);
    ~Widget();                                // defined where Impl is complete
    void draw() const;
private:
    struct Impl;
    std::unique_ptr<Impl> p_;
};

// ---- widget.cpp: the hidden part ------------------------------------
struct Widget::Impl {
    std::string name;
    int clicks = 0;
};

Widget::Widget(std::string name) : p_(std::make_unique<Impl>(Impl{std::move(name)})) {}
Widget::~Widget() = default;
void Widget::draw() const { std::printf("draw %s (clicks: %d)\\n", p_->name.c_str(), p_->clicks); }

// ---- client.cpp ------------------------------------------------------
int main() {
    std::printf("sizeof(Widget) = %s\\n", sizeof(Widget) == sizeof(void*) ? "one pointer" : "more");
    Widget w("button");
    w.draw();
}
`),
});

/* ------------------------------------------------------------------ */

export const nvi = note({
  id: "pat-nvi",
  topic: "Modern C++",
  title: "NVI (non-virtual interface)",
  blurb: "Make public functions non-virtual and virtual functions private, so the base class keeps control of every call.",
  scene: {
    objects: [
      { id: "client", label: "Caller", role: "client", x: 0, y: 0.04, lines: ['store.save("k", "v")'] },
      { id: "base", label: "Storage", role: "code", x: 1, y: 0.04,
        lines: ["public:  save(k, v)  // non-virtual", "  check, log, doSave(), log", "private: virtual doSave() = 0"] },
      { id: "file", label: "FileStorage", role: "concrete", x: 1, y: 0.85, lines: ["doSave(k, v) override"] },
    ],
    links: [
      { from: "client", to: "base", kind: "calls" },
      { from: "file", to: "base", kind: "implements" },
    ],
  },
  steps: [
    { note: "The caller uses the public, non-virtual save(). The base class runs its checks first.",
      states: { client: "active", base: "active" }, msg: { from: "client", to: "base", label: 'save("k", "v")' },
      printed: ["check key: k"] },
    { note: "Then it calls the private virtual — the only part a subclass can change.",
      states: { base: "active", file: "active" }, msg: { from: "base", to: "file", label: "doSave()" },
      printed: ["write k=v to file"] },
    { note: "Control returns to the base, which finishes up. No subclass can skip the check or the log.",
      states: { base: "active" }, printed: ["saved k"] },
  ],
  explanation: [
    { tip: "**In one line:** public functions are non-virtual wrappers; the customisation points are private virtuals they call." },
    "A public virtual function does **two jobs at once**: it's the interface callers use, and the hook subclasses override. NVI **separates them**, so the base class can add checks, logging, locking or timing around every call — and subclasses can't bypass it.",
    { h: "The rules" },
    { list: [
      "**Public** functions are **non-virtual**.",
      "**Virtual** functions are **private** (or protected if overrides must call the base version).",
      "The destructor is the exception: public and virtual, or protected and non-virtual.",
    ] },
    { h: "Why private virtuals work" },
    "A subclass **can override** a private virtual — access control governs who may *call* a function, not who may *override* it. Only the base class calls it.",
    "NVI is **Template Method** applied systematically: every public operation is a tiny template method.",
  ],
  analysis: {
    rows: [
      ["Use it when", "A base class needs pre- or post-conditions, logging or locking around every override"],
      ["Avoid it when", "The interface is a pure abstract contract with nothing to enforce — it's just ceremony"],
      ["Cost", "Usually none: the wrapper inlines"],
    ],
    notes: [
      "The interface and the customisation points can evolve independently — e.g. a public overload set over one virtual.",
      "Much of the standard library's `std::streambuf` follows this shape (`sputc` calls `overflow`).",
    ],
  },
  code: cpp("nvi.cpp", `#include <cstdio>
#include <string>

class Storage {
public:
    virtual ~Storage() = default;
    void save(const std::string& key, const std::string& value) {   // non-virtual
        std::printf("check key: %s\\n", key.c_str());
        doSave(key, value);
        std::printf("saved %s\\n", key.c_str());
    }
private:
    virtual void doSave(const std::string& key, const std::string& value) = 0;
};

class FileStorage : public Storage {
    void doSave(const std::string& key, const std::string& value) override {
        std::printf("write %s=%s to file\\n", key.c_str(), value.c_str());
    }
};

int main() {
    FileStorage file;
    Storage& store = file;
    store.save("k", "v");
}
`),
});

/* ------------------------------------------------------------------ */

export const ruleOfZero = note({
  id: "pat-rule-of-zero",
  topic: "Modern C++",
  title: "Rule of zero",
  blurb: "Let members that manage themselves do the work, so your class needs no destructor, copy or move functions at all.",
  scene: {
    objects: [
      { id: "old", label: "Buffer (rule of five)", role: "concrete", x: 0, y: 0.04,
        lines: ["char* data_; size_t n_;", "~Buffer, Buffer(const&), =(const&)", "Buffer(&&), =(&&)  // 5 to get right"] },
      { id: "nu", label: "Document (rule of zero)", role: "code", x: 1, y: 0.04,
        lines: ["std::string title;", "std::vector<int> pages;", "std::unique_ptr<Font> font;"] },
      { id: "gen", label: "compiler-generated", role: "client", x: 1, y: 0.85, lines: ["destroy, copy, move:", "member by member"] },
    ],
    links: [{ from: "nu", to: "gen", kind: "uses", label: "gets for free" }],
  },
  steps: [
    { note: "A class that owns a raw pointer must write all five special functions, and get every one right.",
      detail: "Forget one and you get a double free (shallow copy) or a leak (missing destructor).",
      states: { old: "edited" } },
    { note: "Build the class from members that already manage themselves, and the compiler writes correct versions.",
      states: { nu: "active", gen: "active" } },
    { note: "Moving a Document moves each member; no hand-written code ran.",
      states: { nu: "active", gen: "active" }, msg: { from: "gen", to: "nu", label: "move" },
      printed: ["moved: title=Report pages=3"] },
    { note: "unique_ptr makes Document move-only automatically: copying would not compile.",
      detail: "The class's copy and move abilities are simply the intersection of its members' abilities.",
      states: { nu: "active" }, printed: ["copyable: no, movable: yes"] },
  ],
  explanation: [
    { tip: "**In one line:** if every member manages its own resource, write none of the five special functions." },
    "The **rule of three/five** says a class that manages a resource needs a destructor, copy constructor, copy assignment, move constructor and move assignment. The **rule of zero** says: don't manage resources in ordinary classes at all — **delegate to members that do it**.",
    { h: "How it works" },
    { list: [
      "Each resource gets **one owner type**: `std::string`, `std::vector`, `std::unique_ptr`, `std::shared_ptr`, or your own RAII wrapper.",
      "Business classes just **contain** those types.",
      "The compiler-generated special functions do the right thing **member by member**.",
      "Only the small RAII wrapper types follow the rule of five.",
    ] },
    { h: "Pitfall" },
    "Declaring **any** destructor — even `~T() = default;` — suppresses the implicit move operations, quietly turning moves into copies. Under the rule of zero you don't declare one. (Polymorphic bases are the exception: they need a virtual destructor, then `= default` the other four.)",
  ],
  analysis: {
    rows: [
      ["Use it when", "Always, for classes that aren't themselves resource wrappers"],
      ["Rule of five", "Only in the few classes that own a raw resource directly"],
      ["Cost", "None — usually faster, because generated moves are noexcept"],
    ],
    notes: [
      "For custom resources, `std::unique_ptr<T, Deleter>` turns a C handle into a rule-of-zero member.",
      "See the RAII topic for how ownership and destructors work underneath.",
    ],
  },
  code: cpp("rule_of_zero.cpp", `#include <cstdio>
#include <memory>
#include <string>
#include <type_traits>
#include <utility>
#include <vector>

struct Font { std::string name = "serif"; };

struct Document {                     // no destructor, no copy or move functions
    std::string title;
    std::vector<int> pages;
    std::unique_ptr<Font> font;
};

int main() {
    Document a{"Report", {1, 2, 3}, std::make_unique<Font>()};
    Document b = std::move(a);
    std::printf("moved: title=%s pages=%zu\\n", b.title.c_str(), b.pages.size());
    std::printf("copyable: %s, movable: %s\\n",
                std::is_copy_constructible_v<Document> ? "yes" : "no",
                std::is_move_constructible_v<Document> ? "yes" : "no");
}
`),
});

/* ------------------------------------------------------------------ */

export const policy = note({
  id: "pat-policy",
  topic: "Modern C++",
  title: "Policy-based design",
  blurb: "Build a class from template parameters that each supply one behaviour, chosen at compile time.",
  scene: {
    objects: [
      { id: "host", label: "Logger<Format, Sink>", role: "code", x: 0.5, y: 0.04, lines: ["log(msg):", "  Sink::write(Format::apply(msg))"] },
      { id: "plain", label: "Plain", role: "concrete", x: 0, y: 0.55, lines: ["apply(msg) → msg"] },
      { id: "stamp", label: "Timestamped", role: "concrete", x: 0, y: 0.97, lines: ["apply(msg) → [12:00] msg"] },
      { id: "con", label: "Console", role: "concrete", x: 1, y: 0.55, lines: ["write(s) → stdout"] },
      { id: "nul", label: "Null", role: "concrete", x: 1, y: 0.97, lines: ["write(s) → nothing"] },
    ],
    links: [
      { from: "host", to: "plain", kind: "uses", label: "Format" }, { from: "host", to: "stamp", kind: "uses" },
      { from: "host", to: "con", kind: "uses", label: "Sink" }, { from: "host", to: "nul", kind: "uses" },
    ],
  },
  steps: [
    { note: "Logger<Plain, Console>: the compiler picks both behaviours. No virtual calls, nothing to choose at run time.",
      states: { host: "active", plain: "active", con: "active" }, msg: { from: "host", to: "con", label: "write" },
      printed: ["boot"] },
    { note: "Logger<Timestamped, Console> is a different type, generated from the same template.",
      states: { host: "active", stamp: "active", con: "active" }, msg: { from: "host", to: "stamp", label: "apply" },
      printed: ["[12:00] boot"] },
    { note: "Logger<Plain, Null> compiles to nothing at all — the optimiser removes the call.",
      detail: "2 formats × 2 sinks = 4 loggers from 4 small classes. Policies combine like Bridge, but at compile time.",
      states: { host: "active", nul: "active" }, printed: ["(null sink: nothing printed)"] },
  ],
  explanation: [
    { tip: "**In one line:** Strategy at compile time — each behaviour is a template parameter instead of an object." },
    "Popularised by Andrei Alexandrescu's *Modern C++ Design*. A **host** class template is assembled from small **policy** classes, each covering one independent decision. You get the flexibility of Strategy with **zero run-time cost**.",
    { h: "How it works" },
    { list: [
      "Each **policy** is a small class with an agreed interface (`apply`, `write`).",
      "The **host** takes them as template parameters and calls them directly.",
      "Every combination is a **separate type**, fully inlined by the compiler.",
      "**Concepts** can state each policy's required interface and give clear errors.",
    ] },
    { h: "In the standard library" },
    { list: [
      "`std::vector<T, Allocator>` — the allocator is a policy.",
      "`std::unique_ptr<T, Deleter>`, `std::map<K, V, Compare>`, `std::basic_string<C, Traits>`.",
    ] },
  ],
  analysis: {
    rows: [
      ["Use it when", "Behaviour is fixed per use site, and speed or zero overhead matters"],
      ["Avoid it when", "Behaviour must change at run time, or objects with different policies must share a container"],
      ["Cost", "No run-time cost; more template code, longer compile times, and distinct types"],
    ],
    notes: [
      "`Logger<Plain, Console>` and `Logger<Timestamped, Console>` are unrelated types: they can't go in one vector without type erasure.",
      "Policies with state can be stored as members; `[[no_unique_address]]` makes empty ones take no space.",
    ],
  },
  code: cpp("policy.cpp", `#include <cstdio>
#include <string>

// Format policies
struct Plain       { static std::string apply(const std::string& m) { return m; } };
struct Timestamped { static std::string apply(const std::string& m) { return "[12:00] " + m; } };

// Sink policies
struct Console { static void write(const std::string& s) { std::puts(s.c_str()); } };
struct Null    { static void write(const std::string&) {} };

template <class Format, class Sink>
struct Logger {
    void log(const std::string& msg) { Sink::write(Format::apply(msg)); }
};

int main() {
    Logger<Plain, Console>{}.log("boot");
    Logger<Timestamped, Console>{}.log("boot");
    Logger<Plain, Null>{}.log("boot");
    std::puts("(null sink: nothing printed)");
}
`),
});

/* ------------------------------------------------------------------ */

export const ranges = note({
  id: "pat-ranges",
  topic: "Modern C++",
  title: "Ranges pipelines",
  blurb: "Compose filter and transform steps with |, evaluated lazily one element at a time.",
  scene: {
    objects: [
      { id: "src", label: "nums", role: "client", x: 0, y: 0.04, lines: ["1 2 3 4 5 6"] },
      { id: "f", label: "views::filter", role: "code", x: 0.5, y: 0.04, lines: ["is even?"] },
      { id: "t", label: "views::transform", role: "code", x: 1, y: 0.04, lines: ["x * x"] },
      { id: "out", label: "for (int x : pipeline)", role: "concrete", x: 1, y: 0.85, lines: ["print x"] },
    ],
    links: [
      { from: "src", to: "f", kind: "calls", label: "|" },
      { from: "f", to: "t", kind: "calls", label: "|" },
      { from: "t", to: "out", kind: "calls" },
    ],
  },
  steps: [
    { note: "Building the pipeline does no work: it's just a description of the steps.",
      states: { src: "active", f: "active", t: "active" } },
    { note: "The loop pulls one element. 1 fails the filter; 2 passes, is squared, and arrives.",
      detail: "Each element travels the whole pipeline before the next one starts — no intermediate vectors.",
      states: { f: "active", t: "active", out: "active" }, msg: { from: "t", to: "out", label: "4" }, printed: ["4"] },
    { note: "3 is skipped, 4 becomes 16.",
      states: { f: "active", t: "active", out: "active" }, msg: { from: "t", to: "out", label: "16" }, printed: ["16"] },
    { note: "5 is skipped, 6 becomes 36, and the source is exhausted.",
      states: { f: "active", t: "active", out: "active" }, msg: { from: "t", to: "out", label: "36" }, printed: ["36"] },
  ],
  explanation: [
    { tip: "**In one line:** views are lazy adaptors over iterators; `|` chains them into a pipeline that runs element by element." },
    "Before C++20, \"square the even numbers\" meant a loop, or `std::copy_if` into a temporary vector followed by `std::transform`. **Ranges** let you write the steps as a **pipeline** that reads left to right and creates no temporaries.",
    { h: "Key ideas" },
    { list: [
      "A **range** is anything with `begin()` and `end()`.",
      "A **view** is a cheap, lazy range adaptor: `filter`, `transform`, `take`, `drop`, `reverse`, `split`…",
      "`|` **composes** views: `nums | filter(even) | transform(square)`.",
      "Nothing runs until something **iterates** — it's the Iterator pattern, composed.",
      "Range **algorithms** (`std::ranges::sort(v)`) take the whole range, and accept **projections**.",
    ] },
    { h: "Watch out for" },
    { list: [
      "A view **refers** to its source; don't return a view of a local container.",
      "Some views (`filter`) cache their begin, so iterate them as non-const.",
      "To keep results, materialise them: `std::ranges::to<std::vector>()` in C++23.",
    ] },
  ],
  analysis: {
    rows: [
      ["Use it when", "Data flows through a sequence of filter and transform steps"],
      ["Avoid it when", "The loop body has complex control flow or side effects — a plain loop is clearer"],
      ["Cost", "Usually the same as a hand-written loop after inlining"],
    ],
    notes: [
      "Ranges are a functional-style **pipeline** — similar in spirit to Unix pipes or LINQ.",
      "Error messages from bad pipelines can be long; concepts made them much better than pre-C++20 templates.",
    ],
  },
  code: cpp("ranges.cpp", `#include <cstdio>
#include <ranges>
#include <vector>

int main() {
    std::vector<int> nums{1, 2, 3, 4, 5, 6};

    auto pipeline = nums
        | std::views::filter([](int x) { return x % 2 == 0; })
        | std::views::transform([](int x) { return x * x; });

    for (int x : pipeline)
        std::printf("%d\\n", x);
}
`),
});

/* ------------------------------------------------------------------ */

export const concepts = note({
  id: "pat-concepts",
  topic: "Modern C++",
  title: "Concepts",
  blurb: "Name the requirements a template places on its types, so mistakes are caught with a clear message.",
  scene: {
    objects: [
      { id: "concept", label: "concept Shape", role: "interface", x: 0.5, y: 0.04, lines: ["requires(const T& s) {", "  { s.area() } → double", "}"] },
      { id: "fn", label: "printArea(const Shape auto&)", role: "code", x: 0.5, y: 0.5, lines: ["prints s.area()"] },
      { id: "sq", label: "Square", role: "concrete", x: 0, y: 0.95, lines: ["area() ✓"] },
      { id: "str", label: "std::string", role: "concrete", x: 1, y: 0.95, lines: ["no area() ✗"] },
    ],
    links: [
      { from: "fn", to: "concept", kind: "uses", label: "requires" },
      { from: "sq", to: "concept", kind: "implements", label: "satisfies" },
    ],
  },
  steps: [
    { note: "The concept states the requirement: the type must have area() returning something convertible to double.",
      states: { concept: "active" } },
    { note: "Square satisfies it — with no base class and no virtual functions.",
      states: { sq: "active", fn: "active", concept: "dispatch" }, msg: { from: "sq", to: "fn", label: "printArea(sq)" },
      printed: ["area = 9"] },
    { note: "A std::string doesn't. The compiler rejects the call at the call site, naming the unmet requirement.",
      detail: "Without the concept, the error would come from deep inside the template body — often pages long.",
      states: { str: "edited", fn: "dim" }, printed: ["string is a Shape: no"] },
  ],
  explanation: [
    { tip: "**In one line:** a named compile-time predicate on types, used to constrain templates." },
    "Templates have always had requirements — \"`T` must have `area()`\" — but before C++20 they were **implicit**, discovered only when compilation failed inside the template. Concepts make them **explicit, checked, and documented** in the signature.",
    { h: "How it works" },
    { list: [
      "`concept Shape = requires(const T& s) { … };` lists **expressions that must compile**, and their result types.",
      "Constrain a template: `template <Shape T>`, `requires Shape<T>`, or the short form `Shape auto`.",
      "Concepts are also **bool constants**: `Shape<std::string>` is `false`, usable in `if constexpr` and `static_assert`.",
      "**Overloads** can be chosen by concept — the more constrained one wins.",
    ] },
    { h: "Concepts vs. interfaces" },
    { list: [
      "**Virtual interfaces**: types opt in by inheriting; checked and dispatched at **run time**.",
      "**Concepts**: types satisfy them **structurally**, with no inheritance; checked at **compile time**, zero cost.",
      "Need both? **Type erasure** stores concept-satisfying types behind one run-time interface.",
    ] },
  ],
  analysis: {
    rows: [
      ["Use it when", "Writing any template whose parameters must support particular operations"],
      ["Standard concepts", "`std::integral`, `std::invocable`, `std::ranges::range`, `std::totally_ordered`…"],
      ["Cost", "None at run time; compile-time checks only"],
    ],
    notes: [
      "Concepts check **syntax**, not meaning: a type with an `area()` that returns its perimeter still satisfies `Shape`.",
      "Prefer standard concepts and small named ones over long ad-hoc `requires` clauses.",
    ],
  },
  code: cpp("concepts.cpp", `#include <concepts>
#include <cstdio>
#include <string>

template <class T>
concept Shape = requires(const T& s) {
    { s.area() } -> std::convertible_to<double>;
};

struct Square {
    double side;
    double area() const { return side * side; }
};

void printArea(const Shape auto& s) { std::printf("area = %g\\n", s.area()); }

int main() {
    printArea(Square{3});
    // printArea(std::string("hi"));   // error: std::string does not satisfy Shape
    std::printf("string is a Shape: %s\\n", Shape<std::string> ? "yes" : "no");
}
`),
});
