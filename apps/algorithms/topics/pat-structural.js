/**
 * Structural patterns, one page each: Adapter, Facade, Proxy, Bridge,
 * Flyweight.
 */

import { note } from "./pat-common.js";

const cpp = (name, source, noteText = "A complete program; the steps above follow its output.") =>
  ({ lang: "cpp", files: [{ name, note: noteText, source, traced: true }] });

/* ------------------------------------------------------------------ */

export const adapter = note({
  id: "pat-adapter",
  topic: "Structural",
  title: "Adapter",
  blurb: "Wrap a class whose interface doesn't fit, so it can be used where a different interface is expected.",
  scene: {
    objects: [
      { id: "client", label: "App", role: "client", x: 0, y: 0.04, lines: ["Logger& log", 'log.log(Info, "started")'] },
      { id: "iface", label: "Logger", stereo: "«interface»", role: "interface", x: 1, y: 0.04, lines: ["log(Level, msg)"] },
      { id: "ad", label: "XmlLoggerAdapter", role: "code", x: 0.5, y: 0.55, lines: ["log(level, msg):", "  legacy_.writeXml(tag(level), msg)"] },
      { id: "legacy", label: "LegacyXmlLogger", role: "concrete", x: 0.5, y: 0.97, lines: ["writeXml(tag, text)  // can't change"] },
    ],
    links: [
      { from: "client", to: "iface", kind: "uses" },
      { from: "ad", to: "iface", kind: "implements" },
      { from: "ad", to: "legacy", kind: "owns", label: "legacy_" },
    ],
  },
  steps: [
    { note: "The app is written against Logger. The library you must use has a different interface, and you can't change it.",
      states: { client: "active", legacy: "edited" } },
    { note: "The adapter implements Logger and holds the legacy object. The app calls it like any Logger.",
      states: { client: "active", ad: "active", iface: "dispatch" }, msg: { from: "client", to: "ad", label: 'log(Info, "started")' } },
    { note: "The adapter translates the call — converting the level to a tag — and forwards it.",
      states: { ad: "active", legacy: "active" }, msg: { from: "ad", to: "legacy", label: 'writeXml("info", …)' },
      printed: ['<log level="info">started</log>'] },
  ],
  explanation: [
    { tip: "**In one line:** a class that implements the interface you need by translating calls into the interface you have." },
    "Third-party libraries, legacy code and C APIs rarely match the interfaces your code is built around. An Adapter is a **translator**: the client stays clean, and all the mismatch lives in one class.",
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
    ],
  },
  code: cpp("adapter.cpp", `#include <cstdio>
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
        legacy_.writeXml(level == Level::Error ? "error" : "info", msg);
    }
private:
    LegacyXmlLogger legacy_;
};

void app(Logger& log) { log.log(Level::Info, "started"); }

int main() {
    XmlLoggerAdapter adapter;
    app(adapter);
}
`),
});

/* ------------------------------------------------------------------ */

export const facade = note({
  id: "pat-facade",
  topic: "Structural",
  title: "Facade",
  blurb: "Give a complicated subsystem one simple entry point for the common case.",
  scene: {
    objects: [
      { id: "client", label: "main()", role: "client", x: 0.5, y: 0.04, lines: ['convert("talk.mov", "mp4")'] },
      { id: "f", label: "VideoConverter", role: "code", x: 0.5, y: 0.45, lines: ["convert(file, format)"] },
      { id: "d", label: "Decoder", role: "concrete", x: 0, y: 0.95, lines: ["open, decode frames"] },
      { id: "s", label: "Scaler", role: "concrete", x: 0.5, y: 0.95, lines: ["resize, colour space"] },
      { id: "e", label: "Encoder", role: "concrete", x: 1, y: 0.95, lines: ["codec, bitrate, mux"] },
    ],
    links: [
      { from: "client", to: "f", kind: "calls" },
      { from: "f", to: "d", kind: "calls" }, { from: "f", to: "s", kind: "calls" }, { from: "f", to: "e", kind: "calls" },
    ],
  },
  steps: [
    { note: "The client wants one thing: convert a file. It calls one method on the facade.",
      detail: "Without the facade, every caller would need to know the three subsystems, their order, and their configuration.",
      states: { client: "active", f: "active" }, msg: { from: "client", to: "f", label: "convert()" } },
    { note: "The facade drives the subsystems in the right order: decode…",
      states: { f: "active", d: "active" }, msg: { from: "f", to: "d", label: "decode" }, printed: ["decode talk.mov"] },
    { note: "…scale…", states: { f: "active", s: "active" }, msg: { from: "f", to: "s", label: "scale" }, printed: ["scale to 1080p"] },
    { note: "…and encode.", states: { f: "active", e: "active" }, msg: { from: "f", to: "e", label: "encode" }, printed: ["encode as mp4"] },
    { note: "The subsystems are still public. Callers with unusual needs can use them directly; the facade covers the common path.",
      states: { client: "active" }, printed: ["done: talk.mp4"] },
  ],
  explanation: [
    { tip: "**In one line:** one class with a few high-level methods that orchestrate a complicated set of lower-level classes." },
    "Large subsystems — media codecs, compilers, cloud SDKs — expose dozens of classes because they must support every use. Most callers need one or two common operations. A Facade **packages the common path**.",
    { h: "How it works" },
    { list: [
      "The facade **knows the subsystem**: which classes, in which order, with which settings.",
      "Clients **know only the facade**, so they are decoupled from the subsystem's internals.",
      "The subsystem stays **available** for advanced use — a facade adds a door, it doesn't wall anything off.",
    ] },
    { h: "Watch out for" },
    "Facades attract features until they become a **god class** that does everything. Keep a facade to the common cases, and add a second facade for a different audience rather than growing one forever.",
  ],
  analysis: {
    rows: [
      ["Use it when", "A subsystem is complex and most callers need the same few operations"],
      ["Avoid it when", "It would only forward one call to one class — that's an extra layer for nothing"],
      ["Related", "Adapter changes an interface; Facade simplifies many; Mediator coordinates peers that know it"],
    ],
    notes: [
      "A library's top-level free functions (`std::filesystem::copy`) often act as facades over more detailed APIs.",
      "Facades are a natural place for a stable API boundary while internals change.",
    ],
  },
  code: cpp("facade.cpp", `#include <cstdio>
#include <string>

// A subsystem with several parts, each with its own detailed API.
struct Decoder { void decode(const std::string& f) { std::printf("decode %s\\n", f.c_str()); } };
struct Scaler  { void scale(int height) { std::printf("scale to %dp\\n", height); } };
struct Encoder { void encode(const std::string& fmt) { std::printf("encode as %s\\n", fmt.c_str()); } };

// The facade: one call for the common case.
class VideoConverter {
public:
    std::string convert(const std::string& file, const std::string& format) {
        decoder_.decode(file);
        scaler_.scale(1080);
        encoder_.encode(format);
        return file.substr(0, file.rfind('.')) + "." + format;
    }
private:
    Decoder decoder_;
    Scaler scaler_;
    Encoder encoder_;
};

int main() {
    VideoConverter converter;
    std::string out = converter.convert("talk.mov", "mp4");
    std::printf("done: %s\\n", out.c_str());
}
`),
});

/* ------------------------------------------------------------------ */

export const proxy = note({
  id: "pat-proxy",
  topic: "Structural",
  title: "Proxy",
  blurb: "Stand in for another object with the same interface, to control access to it: load lazily, check permissions, or cache.",
  scene: {
    objects: [
      { id: "client", label: "Gallery", role: "client", x: 0, y: 0.04, lines: ["Image& img", "img.display()"] },
      { id: "iface", label: "Image", stereo: "«interface»", role: "interface", x: 1, y: 0.04, lines: ["display()"] },
      { id: "p", label: "ImageProxy", role: "code", x: 0.5, y: 0.5, lines: ["file_ = photo.png", "real_ = null"] },
      { id: "real", label: "RealImage", role: "concrete", x: 0.5, y: 0.97, lines: ["pixels (expensive)"] },
    ],
    links: [
      { from: "client", to: "p", kind: "ref", label: "Image&" },
      { from: "p", to: "iface", kind: "implements" }, { from: "real", to: "iface", kind: "implements" },
      { from: "p", to: "real", kind: "owns", label: "real_" },
    ],
  },
  steps: [
    { note: "Creating the proxy is cheap: it remembers the file name and loads nothing.",
      detail: "A gallery of 1,000 thumbnails can create 1,000 proxies instantly and load only what scrolls into view.",
      states: { p: "new" }, hide: ["real"], printed: ["proxy created for photo.png"] },
    { note: "The first display() finds real_ empty, so the proxy loads the real image — only now.",
      states: { client: "active", p: "active", real: "new" }, lines: { p: ["file_ = photo.png", "real_ = loaded"] },
      msg: { from: "p", to: "real", label: "load" }, printed: ["loading photo.png", "display photo.png"] },
    { note: "Later calls go straight through to the loaded image.",
      states: { client: "active", p: "active", real: "active" }, lines: { p: ["file_ = photo.png", "real_ = loaded"] },
      msg: { from: "p", to: "real", label: "display()" }, printed: ["display photo.png"] },
  ],
  explanation: [
    { tip: "**In one line:** an object with the same interface as the real one, that decides when and whether to pass calls through." },
    "The client can't tell a proxy from the real thing — that's the point. What the proxy does between receiving a call and forwarding it defines its kind.",
    { h: "Kinds of proxy" },
    { list: [
      "**Virtual proxy** — create the expensive object **lazily** (this example).",
      "**Protection proxy** — check **permissions** before forwarding.",
      "**Remote proxy** — the real object lives in **another process**; the proxy marshals calls (RPC stubs).",
      "**Caching proxy** — remember results and skip repeated work.",
    ] },
    { h: "In the standard library" },
    { list: [
      "**Smart pointers** are proxies for the object they point at: `operator->` forwards, and the proxy controls lifetime.",
      "`std::vector<bool>::reference` is a proxy for a single bit.",
    ] },
  ],
  analysis: {
    rows: [
      ["Use it when", "Access to an object needs control — laziness, permissions, location, caching — invisible to clients"],
      ["Avoid it when", "Clients need to know the cost: a hidden network call behind an innocent method is a trap"],
      ["Related", "Same shape as Decorator; a decorator adds behaviour, a proxy controls access"],
    ],
    notes: [
      "A lazy proxy used from several threads needs synchronised loading — `std::call_once` is the tool.",
      "Remote proxies are where the \"looks local, is remote\" illusion leaks: latency and failures don't go away by hiding them.",
    ],
  },
  code: cpp("proxy.cpp", `#include <cstdio>
#include <memory>
#include <string>

struct Image {
    virtual ~Image() = default;
    virtual void display() = 0;
};

class RealImage : public Image {
public:
    explicit RealImage(std::string file) : file_(std::move(file)) {
        std::printf("loading %s\\n", file_.c_str());     // the expensive part
    }
    void display() override { std::printf("display %s\\n", file_.c_str()); }
private:
    std::string file_;
};

class ImageProxy : public Image {
public:
    explicit ImageProxy(std::string file) : file_(std::move(file)) {
        std::printf("proxy created for %s\\n", file_.c_str());
    }
    void display() override {
        if (!real_) real_ = std::make_unique<RealImage>(file_);   // load on first use
        real_->display();
    }
private:
    std::string file_;
    std::unique_ptr<RealImage> real_;
};

int main() {
    ImageProxy photo("photo.png");
    Image& img = photo;
    img.display();
    img.display();
}
`),
});

/* ------------------------------------------------------------------ */

export const bridge = note({
  id: "pat-bridge",
  topic: "Structural",
  title: "Bridge",
  blurb: "Split one hierarchy into two — what something is, and how it is implemented — so each can vary independently.",
  scene: {
    objects: [
      { id: "shape", label: "Shape", role: "code", x: 0, y: 0.04, lines: ["Renderer& r_", "draw() = 0"] },
      { id: "rend", label: "Renderer", stereo: "«interface»", role: "interface", x: 1, y: 0.04, lines: ["circle(r)", "square(s)"] },
      { id: "circle", label: "Circle", role: "concrete", x: 0, y: 0.6, lines: ["draw(): r_.circle(r)"] },
      { id: "square", label: "Square", role: "concrete", x: 0.3, y: 0.97, lines: ["draw(): r_.square(s)"] },
      { id: "vec", label: "VectorRenderer", role: "concrete", x: 1, y: 0.6, lines: ["SVG path"] },
      { id: "ras", label: "RasterRenderer", role: "concrete", x: 0.72, y: 0.97, lines: ["fill pixels"] },
    ],
    links: [
      { from: "circle", to: "shape", kind: "implements" }, { from: "square", to: "shape", kind: "implements" },
      { from: "vec", to: "rend", kind: "implements" }, { from: "ras", to: "rend", kind: "implements" },
      { from: "shape", to: "rend", kind: "owns", label: "the bridge" },
    ],
  },
  steps: [
    { note: "Without a bridge, shapes × renderers needs a class per pair: VectorCircle, RasterCircle, VectorSquare, RasterSquare…",
      detail: "Two dimensions of variation in one hierarchy multiply: m shapes × n renderers = m·n classes.",
      states: { shape: "edited", rend: "edited" } },
    { note: "With a bridge, Shape holds a Renderer. A circle drawn with the vector renderer…",
      states: { circle: "active", vec: "active", rend: "dispatch" }, msg: { from: "circle", to: "vec", label: "circle(2)" },
      printed: ["vector: <circle r=2/>"] },
    { note: "…and the same Circle class drawn with the raster renderer. m + n classes cover every combination.",
      states: { circle: "active", ras: "active", rend: "dispatch" }, msg: { from: "circle", to: "ras", label: "circle(2)" },
      printed: ["raster: filled 13 pixels for a circle of r=2"] },
    { note: "A square uses whichever renderer it was given, too.",
      states: { square: "active", vec: "active" }, msg: { from: "square", to: "vec", label: "square(3)" },
      printed: ["vector: <rect w=3 h=3/>"] },
  ],
  explanation: [
    { tip: "**In one line:** when a class varies along two independent axes, make one axis an object that the other holds." },
    "Bridge is what Strategy looks like when the *strategy* is a whole implementation layer. It is designed in up front, when you can see **two independent dimensions** of change: shape and renderer, message and transport, window and platform.",
    { h: "How it works" },
    { list: [
      "The **abstraction** hierarchy (`Shape`, `Circle`, `Square`) holds a reference to…",
      "…the **implementation** interface (`Renderer`), with its own hierarchy (`VectorRenderer`, `RasterRenderer`).",
      "Abstractions are written **in terms of implementation primitives** (`circle()`, `square()`).",
      "*m* abstractions + *n* implementations = **m + n classes**, not m × n.",
    ] },
    { h: "PIMPL is a bridge" },
    "The **PIMPL idiom** (in the Modern C++ group) is a one-implementation bridge used for a different reason: to hide implementation details from the header, so they can change without recompiling clients.",
  ],
  analysis: {
    rows: [
      ["Use it when", "Two independent dimensions of variation would otherwise multiply subclasses"],
      ["Avoid it when", "One dimension really varies — Strategy or plain inheritance is simpler"],
      ["Cost", "One indirection per primitive call"],
    ],
    notes: [
      "The hard part is choosing the **implementation primitives**: too few and abstractions can't express themselves; too many and every new renderer is a chore.",
      "Device drivers are the classic case: the OS-facing interface (abstraction) and the hardware-facing one (implementation) evolve separately.",
    ],
  },
  code: cpp("bridge.cpp", `#include <cstdio>

// The implementation side.
struct Renderer {
    virtual ~Renderer() = default;
    virtual void circle(double r) = 0;
    virtual void square(double s) = 0;
};
struct VectorRenderer : Renderer {
    void circle(double r) override { std::printf("vector: <circle r=%g/>\\n", r); }
    void square(double s) override { std::printf("vector: <rect w=%g h=%g/>\\n", s, s); }
};
struct RasterRenderer : Renderer {
    void circle(double r) override {
        int n = 0;                                    // count pixels inside the circle
        for (int y = -2; y <= 2; ++y)
            for (int x = -2; x <= 2; ++x) n += (x * x + y * y <= r * r);
        std::printf("raster: filled %d pixels for a circle of r=%g\\n", n, r);
    }
    void square(double s) override { std::printf("raster: filled %g pixels\\n", s * s); }
};

// The abstraction side, holding the bridge.
class Shape {
public:
    explicit Shape(Renderer& r) : r_(r) {}
    virtual ~Shape() = default;
    virtual void draw() = 0;
protected:
    Renderer& r_;
};
class Circle : public Shape {
public:
    Circle(Renderer& r, double radius) : Shape(r), radius_(radius) {}
    void draw() override { r_.circle(radius_); }
private:
    double radius_;
};
class Square : public Shape {
public:
    Square(Renderer& r, double side) : Shape(r), side_(side) {}
    void draw() override { r_.square(side_); }
private:
    double side_;
};

int main() {
    VectorRenderer vector;
    RasterRenderer raster;
    Circle(vector, 2).draw();
    Circle(raster, 2).draw();
    Square(vector, 3).draw();
}
`),
});

/* ------------------------------------------------------------------ */

export const flyweight = note({
  id: "pat-flyweight",
  topic: "Structural",
  title: "Flyweight",
  blurb: "Share the heavy, unchanging part of many similar objects, so each object stores only what is unique to it.",
  scene: {
    objects: [
      { id: "t1", label: "Tree #1", role: "concrete", x: 0, y: 0.04, lines: ["x, y = 3, 7", "type → Oak"] },
      { id: "t2", label: "Tree #2", role: "concrete", x: 0.5, y: 0.04, lines: ["x, y = 9, 1", "type → Oak"] },
      { id: "t3", label: "Tree #1000", role: "concrete", x: 1, y: 0.04, lines: ["x, y = 4, 4", "type → Pine"] },
      { id: "oak", label: "TreeType Oak", role: "code", x: 0, y: 0.95, lines: ["name, colour", "mesh, texture (big)"] },
      { id: "pine", label: "TreeType Pine", role: "code", x: 1, y: 0.95, lines: ["name, colour", "mesh, texture (big)"] },
      { id: "factory", label: "TreeTypes", role: "client", x: 0.5, y: 0.95, lines: ["get(name):", "reuse or create"] },
    ],
    links: [
      { from: "t1", to: "oak", kind: "ref" }, { from: "t2", to: "oak", kind: "ref" }, { from: "t3", to: "pine", kind: "ref" },
      { from: "factory", to: "oak", kind: "owns" }, { from: "factory", to: "pine", kind: "owns" },
    ],
  },
  steps: [
    { note: "A forest of 1,000 trees. Each tree's position is unique; its mesh and texture are not.",
      detail: "Intrinsic state (shared, immutable): the type's mesh and texture. Extrinsic state (per object): position.",
      states: { t1: "active", t2: "active", t3: "active" } },
    { note: "TreeTypes hands out one shared TreeType per kind, creating it only the first time.",
      states: { factory: "active", oak: "new", pine: "new" } },
    { note: "So 1,000 trees point at just two heavy objects.",
      detail: "Each tree is now two coordinates and a pointer. The heavy data exists twice instead of a thousand times.",
      states: { oak: "active", pine: "active" }, printed: ["trees: 1000, shared tree types: 2"] },
  ],
  explanation: [
    { tip: "**In one line:** split an object's state into a shared, immutable part and a per-object part, and keep one copy of each shared part." },
    "When you have **very many** similar objects — glyphs in a document, tiles in a map, particles, trees — most of their data is often identical. Flyweight keeps that data **once** and has each object refer to it.",
    { h: "How it works" },
    { list: [
      "**Intrinsic** state — the same for many objects, and **immutable** — goes into a shared flyweight (`TreeType`).",
      "**Extrinsic** state — unique per object, like position — stays in the small object or is passed in.",
      "A **factory** (`TreeTypes`) returns the existing flyweight for a key, creating it only once.",
      "Flyweights must be **immutable**, because many objects share them.",
    ] },
    { h: "You already use it" },
    { list: [
      "**String interning** and string-literal pooling.",
      "**`std::shared_ptr<const T>`** for shared immutable configuration.",
      "Text rendering: one glyph bitmap per character and font, positioned many times.",
    ] },
  ],
  analysis: {
    rows: [
      ["Use it when", "Huge numbers of objects share large, immutable data"],
      ["Avoid it when", "Objects are few, or their shared part is small — the indirection costs more than it saves"],
      ["Cost", "A lookup on creation and a pointer per object; shared data must never be mutated"],
    ],
    notes: [
      "Pointer chasing can hurt cache locality; data-oriented designs often store a small **type index** instead of a pointer.",
      "Sharing across threads is safe precisely because flyweights are immutable.",
    ],
  },
  code: cpp("flyweight.cpp", `#include <cstdio>
#include <map>
#include <memory>
#include <string>
#include <vector>

struct TreeType {                         // intrinsic, shared, immutable
    std::string name;
    std::string texture;                  // imagine megabytes here
};

class TreeTypes {                         // the flyweight factory
public:
    const TreeType* get(const std::string& name) {
        auto it = types_.find(name);
        if (it == types_.end())
            it = types_.emplace(name, std::make_unique<TreeType>(TreeType{name, name + ".png"})).first;
        return it->second.get();
    }
    std::size_t count() const { return types_.size(); }
private:
    std::map<std::string, std::unique_ptr<TreeType>> types_;
};

struct Tree {                             // extrinsic: just position and a pointer
    int x, y;
    const TreeType* type;
};

int main() {
    TreeTypes types;
    std::vector<Tree> forest;
    for (int i = 0; i < 1000; ++i)
        forest.push_back({i % 37, i % 23, types.get(i % 3 ? "oak" : "pine")});
    std::printf("trees: %zu, shared tree types: %zu\\n", forest.size(), types.count());
}
`),
});
