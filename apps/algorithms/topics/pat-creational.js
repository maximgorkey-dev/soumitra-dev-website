/**
 * Creational patterns, one page each: Factory Method, Abstract Factory,
 * Builder, Prototype, Singleton.
 */

import { note } from "./pat-common.js";

const cpp = (name, source, noteText = "A complete program; the steps above follow its output.") =>
  ({ lang: "cpp", files: [{ name, note: noteText, source, traced: true }] });

/* ------------------------------------------------------------------ */

export const factoryMethod = note({
  id: "pat-factory-method",
  topic: "Creational",
  title: "Factory Method",
  blurb: "Let subclasses decide which concrete class to create, so the code that uses the object never names it.",
  scene: {
    objects: [
      { id: "dialog", label: "Dialog", role: "code", x: 0, y: 0.04, lines: ["render(): createButton()->draw()", "virtual createButton() = 0"] },
      { id: "button", label: "Button", stereo: "«interface»", role: "interface", x: 1, y: 0.04, lines: ["draw()"] },
      { id: "wd", label: "WinDialog", role: "concrete", x: 0, y: 0.6, lines: ["createButton(): WinButton"] },
      { id: "md", label: "MacDialog", role: "concrete", x: 0.3, y: 0.97, lines: ["createButton(): MacButton"] },
      { id: "wb", label: "WinButton", role: "concrete", x: 1, y: 0.6, lines: ["draw()"] },
      { id: "mb", label: "MacButton", role: "concrete", x: 0.72, y: 0.97, lines: ["draw()"] },
    ],
    links: [
      { from: "wd", to: "dialog", kind: "implements" }, { from: "md", to: "dialog", kind: "implements" },
      { from: "wb", to: "button", kind: "implements" }, { from: "mb", to: "button", kind: "implements" },
      { from: "dialog", to: "button", kind: "uses", label: "uses" },
    ],
  },
  steps: [
    { note: "Dialog::render() needs a button but doesn't know which kind. It calls createButton(), a virtual function — the factory method.",
      detail: "The shared algorithm (render) lives in the base class. Only the one decision — which concrete class to create — is deferred to subclasses.",
      states: { dialog: "active" } },
    { note: "On a WinDialog, the virtual call lands in WinDialog::createButton, which returns a WinButton.",
      states: { wd: "active", wb: "new" }, msg: { from: "wd", to: "wb", label: "make_unique" } },
    { note: "render() calls draw() through the Button interface. It never named WinButton.",
      states: { dialog: "active", wb: "active", button: "dispatch" }, msg: { from: "dialog", to: "wb", label: "draw()" }, printed: ["draw a Windows button"] },
    { note: "A MacDialog runs exactly the same render(), and gets a MacButton.",
      states: { md: "active", mb: "active" }, msg: { from: "md", to: "mb", label: "make_unique" }, printed: ["draw a macOS button"] },
  ],
  explanation: [
    { tip: "**In one line:** a virtual \"create\" function that subclasses override, so base-class code can use an object without naming its concrete type." },
    "Code that writes `new WinButton` is tied to `WinButton` forever. Factory Method moves that one line behind a virtual function, so the rest of the class works with **any** button.",
    { h: "How it works" },
    { list: [
      "The base class (*creator*) has a virtual **`createButton()`** returning a `Button` pointer.",
      "Its other code (`render()`) calls the factory method and then **uses the product through its interface**.",
      "Each subclass overrides the factory method to **pick the concrete class**.",
    ] },
    { h: "Modern C++" },
    { list: [
      "Return **`std::unique_ptr<Button>`** — ownership is explicit, and nothing leaks.",
      "Often a subclass isn't needed at all: pass a **`std::function<std::unique_ptr<Button>()>`** into the class, or a template parameter if the choice is known at compile time.",
      "A plain **factory function** (`makeButton(Platform)`) is the simplest form — not the GoF pattern, but frequently all you need.",
    ] },
  ],
  analysis: {
    rows: [
      ["Use it when", "A class's algorithm is shared, but the exact type it creates varies by subclass"],
      ["Avoid it when", "Only one concrete type exists — just construct it"],
      ["Related", "Abstract Factory is a family of factory methods; Template Method is the same shape for behaviour"],
    ],
    notes: [
      "Don't call a virtual factory method from a **constructor**: during construction the object is still the base type, so the override isn't called.",
      "Factory functions are also how you return objects whose type depends on run-time data: parsing a file format, a message type from the network.",
    ],
  },
  code: cpp("factory_method.cpp", `#include <cstdio>
#include <memory>

struct Button {
    virtual ~Button() = default;
    virtual void draw() const = 0;
};
struct WinButton : Button { void draw() const override { std::printf("draw a Windows button\\n"); } };
struct MacButton : Button { void draw() const override { std::printf("draw a macOS button\\n"); } };

class Dialog {
public:
    virtual ~Dialog() = default;
    void render() const {
        std::unique_ptr<Button> b = createButton();   // which type? not our problem
        b->draw();
    }
protected:
    virtual std::unique_ptr<Button> createButton() const = 0;   // the factory method
};

class WinDialog : public Dialog {
protected:
    std::unique_ptr<Button> createButton() const override { return std::make_unique<WinButton>(); }
};
class MacDialog : public Dialog {
protected:
    std::unique_ptr<Button> createButton() const override { return std::make_unique<MacButton>(); }
};

int main() {
    WinDialog().render();
    MacDialog().render();
}
`),
});

/* ------------------------------------------------------------------ */

export const abstractFactory = note({
  id: "pat-abstract-factory",
  topic: "Creational",
  title: "Abstract Factory",
  blurb: "One object that creates a whole family of related products, so the products always match each other.",
  scene: {
    objects: [
      { id: "app", label: "Application", role: "client", x: 0.5, y: 0.04, lines: ["GuiFactory& f", "f.button(); f.checkbox()"] },
      { id: "gf", label: "GuiFactory", stereo: "«interface»", role: "interface", x: 0.5, y: 0.5, lines: ["button()", "checkbox()"] },
      { id: "wf", label: "WinFactory", role: "concrete", x: 0, y: 0.95, lines: ["→ WinButton, WinCheckbox"] },
      { id: "mf", label: "MacFactory", role: "concrete", x: 1, y: 0.95, lines: ["→ MacButton, MacCheckbox"] },
    ],
    links: [
      { from: "app", to: "gf", kind: "owns", label: "uses" },
      { from: "wf", to: "gf", kind: "implements" }, { from: "mf", to: "gf", kind: "implements" },
    ],
  },
  steps: [
    { note: "The application is given one factory object and asks it for every widget it needs.",
      detail: "It depends only on GuiFactory and the product interfaces. It cannot accidentally mix a Windows button with a macOS checkbox, because it never chooses.",
      states: { app: "active", gf: "dispatch" } },
    { note: "Given a WinFactory, both products come from the Windows family.",
      states: { app: "active", wf: "active" }, msg: { from: "app", to: "wf", label: "button(), checkbox()" },
      printed: ["[Windows] button", "[Windows] checkbox"] },
    { note: "Swap in a MacFactory, and the same application code builds a consistent macOS UI.",
      states: { app: "active", mf: "active" }, msg: { from: "app", to: "mf", label: "button(), checkbox()" },
      printed: ["[macOS] button", "[macOS] checkbox"] },
  ],
  explanation: [
    { tip: "**In one line:** an interface with a create method per product, implemented once per family, so a client given one factory gets products that belong together." },
    "Factory Method picks **one** product. Abstract Factory picks a **family**: Windows widgets, or macOS widgets; a SQL backend's connection, command and transaction; a test double for every service at once.",
    { h: "How it works" },
    { list: [
      "**`GuiFactory`** declares `button()` and `checkbox()`.",
      "One concrete factory per family (`WinFactory`, `MacFactory`) creates **matching** products.",
      "The client takes a `GuiFactory&` and is **chosen once, at the top** — usually in `main`, from configuration.",
    ] },
    { h: "The trade-off" },
    "Adding a **family** (Linux) is one new factory class. Adding a **product** (a slider) means a new method on the interface and in **every** factory — the familiar Strategy/Visitor trade.",
  ],
  analysis: {
    rows: [
      ["Use it when", "Products come in families that must not be mixed, and the family is chosen at run time"],
      ["Avoid it when", "There is one product type — Factory Method or a factory function is enough"],
      ["Related", "Each method is a factory method; the concrete factory is often a Singleton or passed by dependency injection"],
    ],
    notes: [
      "In tests, a **fake factory** that returns test doubles for every product is a clean way to isolate a subsystem.",
      "With templates, the family can be a compile-time policy: `Application<WinWidgets>` — no virtual calls, but no run-time switching either.",
    ],
  },
  code: cpp("abstract_factory.cpp", `#include <cstdio>
#include <memory>

struct Button   { virtual ~Button() = default;   virtual void paint() const = 0; };
struct Checkbox { virtual ~Checkbox() = default; virtual void paint() const = 0; };

struct GuiFactory {
    virtual ~GuiFactory() = default;
    virtual std::unique_ptr<Button> button() const = 0;
    virtual std::unique_ptr<Checkbox> checkbox() const = 0;
};

struct WinButton : Button { void paint() const override { std::printf("[Windows] button\\n"); } };
struct WinCheckbox : Checkbox { void paint() const override { std::printf("[Windows] checkbox\\n"); } };
struct MacButton : Button { void paint() const override { std::printf("[macOS] button\\n"); } };
struct MacCheckbox : Checkbox { void paint() const override { std::printf("[macOS] checkbox\\n"); } };

struct WinFactory : GuiFactory {
    std::unique_ptr<Button> button() const override { return std::make_unique<WinButton>(); }
    std::unique_ptr<Checkbox> checkbox() const override { return std::make_unique<WinCheckbox>(); }
};
struct MacFactory : GuiFactory {
    std::unique_ptr<Button> button() const override { return std::make_unique<MacButton>(); }
    std::unique_ptr<Checkbox> checkbox() const override { return std::make_unique<MacCheckbox>(); }
};

void buildUi(const GuiFactory& f) {     // never names a concrete widget
    f.button()->paint();
    f.checkbox()->paint();
}

int main() {
    buildUi(WinFactory{});
    buildUi(MacFactory{});
}
`),
});

/* ------------------------------------------------------------------ */

export const builder = note({
  id: "pat-builder",
  topic: "Creational",
  title: "Builder",
  blurb: "Assemble a complex object step by step through a readable chain of calls, instead of one constructor with many parameters.",
  scene: {
    objects: [
      { id: "client", label: "main()", role: "client", x: 0, y: 0.04, lines: ["Request::to(url)", "  .header(…).timeout(5)", "  .build()"] },
      { id: "b", label: "Request::Builder", role: "code", x: 1, y: 0.04, lines: ["url_ = ?", "headers_ = {}", "timeout_ = 30"] },
      { id: "r", label: "Request", role: "concrete", x: 0.5, y: 0.95, lines: ["const url", "const headers", "const timeout"] },
    ],
    links: [{ from: "client", to: "b", kind: "calls" }, { from: "b", to: "r", kind: "calls", label: "build()" }],
  },
  steps: [
    { note: "Request::to(url) starts a builder holding the one required field; everything else has a default.",
      detail: "Compare Request(url, {}, 30, true, false, nullptr) — positional arguments where nobody remembers which bool is which.",
      states: { client: "active", b: "new" }, lines: { b: ['url_ = "https://example.com"', "headers_ = {}", "timeout_ = 30"] }, msg: { from: "client", to: "b", label: "to(url)" } },
    { note: ".header(…) twice and .timeout(5): each call sets one field and returns the builder, so calls chain.",
      states: { b: "active" }, lines: { b: ['url_ = "https://example.com"', "headers_ = {Accept, Auth}", "timeout_ = 5"] }, msg: { from: "client", to: "b", label: ".header().header().timeout(5)" } },
    { note: ".build() validates and produces an immutable Request.",
      detail: "Validation happens once, in build(), so a half-configured Request can never exist.",
      states: { b: "active", r: "new" }, msg: { from: "b", to: "r", label: "build()" }, printed: ["GET https://example.com (2 headers, timeout 5s)"] },
    { phase: "Modern", note: "For plain data with defaults, C++20 designated initialisers often make a builder unnecessary.",
      states: { r: "active" }, hide: ["b"], printed: ["GET https://example.org (0 headers, timeout 10s)"] },
  ],
  explanation: [
    { tip: "**In one line:** a helper object with one method per option, each returning itself, and a final `build()` that produces the finished object." },
    "Constructors with many parameters are **unreadable** at the call site and **brittle** when options are added. Builder names each option and lets you set only the ones you care about.",
    { h: "How it works" },
    { list: [
      "A **`Builder`** holds the fields, with **defaults**.",
      "Each setter **returns `*this`**, so calls chain into a sentence.",
      "**`build()`** checks the combination is valid and returns the finished, often **immutable**, object.",
    ] },
    { h: "Modern C++" },
    { list: [
      "**Designated initialisers** (C++20): `Request{.url = \"…\", .timeout = 10}` — named, defaulted, no builder. Use them for plain aggregates.",
      "Keep Builder when construction needs **validation**, **computed fields**, or the result should be **immutable** with private members.",
      "Setters can be `&&`-qualified (`Builder&& header(...) &&`) so a builder is consumed by `build()` and can't be reused by accident.",
    ] },
  ],
  analysis: {
    rows: [
      ["Use it when", "Many optional parameters, invariants to check, or an immutable result"],
      ["Avoid it when", "A few fields with defaults — designated initialisers say the same thing in one line"],
      ["Related", "Abstract Factory creates families in one call; Builder creates one complex object in many"],
    ],
    notes: [
      "The GoF version also has a *Director* that runs a fixed sequence of builder steps — useful when the same recipe builds different representations (an HTML and a PDF document).",
      "Fluent interfaces are easy to over-use: if the chain has one or two calls, a constructor is clearer.",
    ],
  },
  code: cpp("builder.cpp", `#include <cstdio>
#include <string>
#include <utility>
#include <vector>

class Request {
public:
    class Builder;
    static Builder to(std::string url);

    void describe() const {
        std::printf("GET %s (%zu headers, timeout %ds)\\n", url_.c_str(), headers_.size(), timeout_);
    }

private:
    Request(std::string url, std::vector<std::string> headers, int timeout)
        : url_(std::move(url)), headers_(std::move(headers)), timeout_(timeout) {}
    std::string url_;
    std::vector<std::string> headers_;
    int timeout_;
};

class Request::Builder {
public:
    explicit Builder(std::string url) : url_(std::move(url)) {}
    Builder& header(std::string h) { headers_.push_back(std::move(h)); return *this; }
    Builder& timeout(int seconds) { timeout_ = seconds; return *this; }
    Request build() const { return Request(url_, headers_, timeout_ > 0 ? timeout_ : 30); }
private:
    std::string url_;
    std::vector<std::string> headers_;
    int timeout_ = 30;
};

Request::Builder Request::to(std::string url) { return Builder(std::move(url)); }

// The C++20 alternative for plain data: designated initialisers.
struct Options {
    std::string url;
    std::vector<std::string> headers = {};
    int timeout = 30;
};

int main() {
    Request r = Request::to("https://example.com")
                    .header("Accept: text/html")
                    .header("Authorization: token")
                    .timeout(5)
                    .build();
    r.describe();

    Options o{.url = "https://example.org", .timeout = 10};
    std::printf("GET %s (%zu headers, timeout %ds)\\n", o.url.c_str(), o.headers.size(), o.timeout);
}
`),
});

/* ------------------------------------------------------------------ */

export const prototype = note({
  id: "pat-prototype",
  topic: "Creational",
  title: "Prototype",
  blurb: "Create new objects by copying an existing one through its interface, when you don't know its concrete type.",
  scene: {
    objects: [
      { id: "client", label: "main()", role: "client", x: 0.5, y: 0.04, lines: ["const Shape& original", "auto copy = original.clone()"] },
      { id: "iface", label: "Shape", stereo: "«interface»", role: "interface", x: 1, y: 0.04, lines: ["clone() const", "describe()"] },
      { id: "orig", label: "Circle (original)", role: "concrete", x: 0, y: 0.92, lines: ["r = 2"] },
      { id: "copy", label: "Circle (copy)", role: "concrete", x: 1, y: 0.92, lines: ["r = 2"] },
    ],
    links: [{ from: "client", to: "orig", kind: "ref", label: "Shape&" }, { from: "orig", to: "copy", kind: "calls", label: "clone()" }],
  },
  steps: [
    { note: "The code holds a Shape& and wants a copy. It can't write Circle(original): it doesn't know the type is Circle.",
      detail: "Copy constructors are not virtual. Copying through a base reference would slice the object down to a Shape.",
      states: { client: "active" }, hide: ["copy"] },
    { note: "So Shape declares a virtual clone(), and each class implements it with its own copy constructor.",
      states: { orig: "active", copy: "new", iface: "dispatch" }, msg: { from: "client", to: "orig", label: "clone()" } },
    { note: "The copy is independent: changing it leaves the original alone.",
      states: { copy: "active" }, lines: { copy: ["r = 5"] }, printed: ["original: circle r=2", "copy: circle r=5"] },
  ],
  explanation: [
    { tip: "**In one line:** a virtual `clone()` that returns a copy of the object's real type, so code can duplicate objects it only knows through an interface." },
    "C++ copy constructors are chosen by **static** type. Through a `Shape&`, `Shape s = original;` copies only the `Shape` part — **slicing** — and with an abstract `Shape` it doesn't compile at all. Prototype makes copying **virtual**.",
    { h: "How it works" },
    { list: [
      "The interface declares **`virtual std::unique_ptr<Shape> clone() const`**.",
      "Each concrete class implements it as **`return std::make_unique<Circle>(*this);`** — its own copy constructor, which knows every field.",
      "A **registry of prototypes** (a map from name to pre-configured object) lets you create objects by cloning templates loaded from configuration.",
    ] },
    { h: "Modern C++" },
    "**Type erasure** (in the Modern C++ group) hides `clone()` inside a value type, so users simply copy a `Shape` like an `int`. A CRTP base (`Cloneable<Circle>`) can write the identical `clone()` for every class once.",
  ],
  analysis: {
    rows: [
      ["Use it when", "Copying objects known only through a base class, or creating from configured templates"],
      ["Avoid it when", "The concrete type is known — use its copy constructor"],
      ["Watch out for", "Deep vs shallow copies of pointer members — clone() must copy what the object owns"],
    ],
    notes: [
      "Make the base copy constructor `protected` so the object can't be sliced by accident, while derived `clone()`s can still use it.",
      "Covariant return types let `Circle::clone()` return `Circle*`, but they don't work with `unique_ptr` — the usual compromise is to return `unique_ptr<Shape>`.",
    ],
  },
  code: cpp("prototype.cpp", `#include <cstdio>
#include <memory>

class Shape {
public:
    virtual ~Shape() = default;
    virtual std::unique_ptr<Shape> clone() const = 0;
    virtual void describe(const char* who) const = 0;
    virtual void scale(double k) = 0;
};

class Circle : public Shape {
public:
    explicit Circle(double r) : r_(r) {}
    std::unique_ptr<Shape> clone() const override { return std::make_unique<Circle>(*this); }
    void describe(const char* who) const override { std::printf("%s: circle r=%g\\n", who, r_); }
    void scale(double k) override { r_ *= k; }
private:
    double r_;
};

int main() {
    std::unique_ptr<Shape> original = std::make_unique<Circle>(2);
    const Shape& known = *original;        // all we know is: it's a Shape

    std::unique_ptr<Shape> copy = known.clone();
    copy->scale(2.5);

    original->describe("original");
    copy->describe("copy");
}
`),
});

/* ------------------------------------------------------------------ */

export const singleton = note({
  id: "pat-singleton",
  topic: "Creational",
  title: "Singleton (and why to avoid it)",
  blurb: "Guarantee one instance of a class with a global access point — and why that is usually a design smell.",
  scene: {
    objects: [
      { id: "a", label: "Logger code", role: "client", x: 0, y: 0.04, lines: ["Config::instance()"] },
      { id: "b", label: "Network code", role: "client", x: 1, y: 0.04, lines: ["Config::instance()"] },
      { id: "cfg", label: "Config", role: "code", x: 0.5, y: 0.9,
        lines: ["static Config& instance() {", "  static Config c;  // once", "  return c;", "}", "private: Config()"] },
    ],
    links: [{ from: "a", to: "cfg", kind: "ref" }, { from: "b", to: "cfg", kind: "ref" }],
  },
  steps: [
    { note: "Config's constructor is private. The only way to get one is Config::instance().",
      detail: "Inside it, a function-local static is constructed the first time control passes through — and since C++11 that initialisation is thread-safe.",
      states: { cfg: "active" } },
    { note: "The first caller triggers construction.",
      states: { a: "active", cfg: "new" }, msg: { from: "a", to: "cfg", label: "instance()" }, printed: ["config loaded"] },
    { note: "Every later caller gets the same object, from anywhere in the program.",
      states: { b: "active", cfg: "active" }, msg: { from: "b", to: "cfg", label: "instance()" }, printed: ["same object: yes"] },
    { phase: "The problem", note: "That 'from anywhere' is the problem: every function can now depend on Config without saying so.",
      detail: "Hidden dependencies make code hard to test (you can't substitute a fake config), create order-of-destruction bugs at exit, and turn into global mutable state. Prefer creating one object in main() and passing it in.",
      states: { a: "edited", b: "edited", cfg: "edited" } },
  ],
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
  code: cpp("singleton.cpp", `#include <cstdio>

class Config {
public:
    static Config& instance() {
        static Config c;               // constructed once, on first call; thread-safe since C++11
        return c;
    }
    Config(const Config&) = delete;
    Config& operator=(const Config&) = delete;

    int retries = 3;

private:
    Config() { std::printf("config loaded\\n"); }
};

void logger()  { Config::instance().retries += 0; }
void network() { (void)Config::instance(); }

int main() {
    logger();                              // first use: constructs
    Config* a = &Config::instance();
    network();
    Config* b = &Config::instance();
    std::printf("same object: %s\\n", a == b ? "yes" : "no");
}
`),
});
