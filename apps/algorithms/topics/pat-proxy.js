/**
 * Proxy, as a virtual (lazy-loading) proxy. A gallery of three photos: the
 * proxies cost nothing up front, and only the photos actually shown are ever
 * loaded.
 */

import { frame } from "../core/trace.js";
import { OBJECTS, add, printed } from "./pat-common.js";

const BEFORE = `// Before: every photo is loaded up front, and making that lazy means
// teaching every caller to check "loaded yet?".
#include <cstdio>
#include <string>
#include <vector>

struct Photo {
    Photo(const char* f) : file(f) {}
    std::string file;
    bool loaded = false;
    void load() { std::printf("loading %s\\n", file.c_str()); loaded = true; }
};

void show(Photo& p)      { if (!p.loaded) p.load(); std::printf("display %s\\n", p.file.c_str()); }
void thumbnail(Photo& p) { if (!p.loaded) p.load(); std::printf("thumb %s\\n", p.file.c_str()); }
void print(Photo& p)     { if (!p.loaded) p.load(); std::printf("print %s\\n", p.file.c_str()); }
// Forget the check in one place and it draws an empty image.

int main() {
    std::vector<Photo> gallery{{"a.png"}, {"b.png"}, {"c.png"}};
    show(gallery[0]);
    thumbnail(gallery[2]);
    print(gallery[0]);
}
`;

const AFTER = `// After: a proxy with the same interface loads the real image on first use.
#include <cstdio>
#include <initializer_list>
#include <memory>
#include <string>
#include <vector>

struct Image {
    virtual ~Image() = default;
    virtual void display() = 0;
};

class RealImage : public Image {
public:
    explicit RealImage(std::string file) : file_(std::move(file)) {
        std::printf("loading %s\\n", file_.c_str());      // the expensive part
        ++loaded;
    }
    void display() override { std::printf("display %s\\n", file_.c_str()); }
    static inline int loaded = 0;
private:
    std::string file_;
};

class ImageProxy : public Image {
public:
    explicit ImageProxy(std::string file) : file_(std::move(file)) {}   // cheap: loads nothing
    void display() override {
        if (!real_) real_ = std::make_unique<RealImage>(file_);       // load on first use
        real_->display();
    }
private:
    std::string file_;
    std::unique_ptr<RealImage> real_;
};

int main() {
    std::vector<std::unique_ptr<Image>> gallery;
    for (const char* f : {"a.png", "b.png", "c.png"})
        gallery.push_back(std::make_unique<ImageProxy>(f));
    std::printf("gallery of %zu photos, %d loaded\\n", gallery.size(), RealImage::loaded);

    gallery[0]->display();
    gallery[2]->display();
    gallery[0]->display();
    std::printf("loaded %d of %zu\\n", RealImage::loaded, gallery.size());
}
`;

/* ---------------------------------------------------------------- */

function beforeScene(edited) {
  return {
    objects: [
      { id: "photo", label: "Photo", role: "code", x: 0.5, y: 0.04, state: edited ? "edited" : "idle",
        lines: ["file", ...(edited ? [add("bool loaded"), add("load()")] : ["pixels, loaded in constructor"])] },
      ...[["show", "show()", 0], ["thumb", "thumbnail()", 0.5], ["print", "print()", 1]].map(([id, label, x]) => ({
        id, label, role: "client", x, y: 0.9, state: edited ? "edited" : "idle",
        lines: edited ? [add("if (!p.loaded) p.load();"), "draw it"] : ["draw it"],
      })),
    ],
    links: ["show", "thumb", "print"].map((id) => ({ from: id, to: "photo", kind: "uses" })),
  };
}

const FILES = ["a.png", "b.png", "c.png"];

function afterScene({ loaded = [], states = {}, msg = null, edited = false } = {}) {
  return {
    objects: [
      { id: "client", label: "Gallery", role: "client", x: 0, y: 0.04, state: states.client || (edited ? "dim" : undefined),
        lines: ["vector<unique_ptr<Image>>", "img->display()"] },
      { id: "iface", label: "Image", stereo: "«interface»", role: "interface", x: 1, y: 0.04, lines: ["virtual display() = 0"] },
      ...FILES.map((f, i) => ({
        id: `p${i}`, label: `ImageProxy ${f}`, role: "code", x: i / 2, y: 0.5, state: states[`p${i}`] || (edited ? "edited" : undefined),
        lines: [loaded.includes(i) ? "real_ = loaded" : "real_ = null", ...(edited && i === 0 ? [add("load on first display()")] : [])],
      })),
      ...loaded.map((i) => ({
        id: `r${i}`, label: `RealImage ${FILES[i]}`, role: "concrete", x: i / 2, y: 0.97, state: states[`r${i}`], lines: ["pixels (expensive)"],
      })),
    ],
    links: [
      ...FILES.map((_, i) => ({ from: "client", to: `p${i}`, kind: "ref" })),
      { from: "p1", to: "iface", kind: "implements" },
      ...loaded.map((i) => ({ from: `p${i}`, to: `r${i}`, kind: "owns", label: "real_" })),
    ],
    msg,
  };
}

function* run() {
  yield frame({
    phase: "Before",
    note: "Without the pattern: Photo loads its pixels in its constructor, so opening the gallery loads every photo.",
    detail: "Three photos is fine. A thousand thumbnails, most never scrolled to, is seconds of startup and gigabytes of memory.",
    marks: beforeScene(false),
    metrics: [{ label: "places edited", value: "0" }],
  });
  yield frame({
    phase: "Before",
    note: "Change request: load lazily. Photo gains a loaded flag, and every function that draws one must check it first.",
    detail: "Forget the check in one place and it draws an empty image. The laziness is spread across every caller.",
    marks: beforeScene(true),
    metrics: [{ label: "places edited", value: "4" }],
  });
  yield frame({
    phase: "After",
    note: "With Proxy: ImageProxy implements the same Image interface and does the check itself, once.",
    detail: "The gallery holds Image pointers and calls display(). It can't tell a proxy from a real image, so none of its code changes.",
    marks: afterScene({ edited: true }),
    metrics: [{ label: "places edited", value: "4 → 1" }],
  });

  yield frame({
    phase: "Run",
    note: "Opening the gallery creates three proxies. Each remembers a file name and loads nothing.",
    marks: afterScene({ states: { p0: "new", p1: "new", p2: "new" } }),
    metrics: [printed("gallery of 3 photos, 0 loaded")],
  });
  yield frame({
    phase: "Run",
    note: "The first display() of a.png finds real_ empty, so the proxy creates the RealImage — only now.",
    marks: afterScene({ loaded: [0], states: { client: "active", p0: "active", r0: "new" }, msg: { from: "p0", to: "r0", label: "load" } }),
    metrics: [printed("loading a.png")],
  });
  yield frame({
    phase: "Run",
    note: "Then it forwards the call to the real image.",
    marks: afterScene({ loaded: [0], states: { p0: "active", r0: "active" }, msg: { from: "p0", to: "r0", label: "display()" } }),
    metrics: [printed("display a.png")],
  });
  yield frame({
    phase: "Run",
    note: "The user scrolls past b.png to c.png. Same story: load on first use, then display.",
    detail: "b.png is never loaded at all. Its proxy cost a file name and a null pointer.",
    marks: afterScene({ loaded: [0, 2], states: { client: "active", p2: "active", r2: "new", p1: "dim" }, msg: { from: "p2", to: "r2", label: "load, display()" } }),
    metrics: [printed("loading c.png"), printed("display c.png")],
  });
  yield frame({
    phase: "Run",
    note: "Showing a.png again goes straight through: real_ is already set, so nothing is reloaded.",
    marks: afterScene({ loaded: [0, 2], states: { client: "active", p0: "active", r0: "active" }, msg: { from: "p0", to: "r0", label: "display()" } }),
    metrics: [printed("display a.png")],
  });
  yield frame({
    phase: "Done",
    note: "Three displays, two loads, and one photo never loaded. The gallery's code is the same as if every image were real.",
    detail: "The same shape gives the other proxies: check permissions before forwarding (protection), forward over the network (remote), or remember results (caching).",
    marks: afterScene({ loaded: [0, 2] }),
    metrics: [printed("loaded 2 of 3")],
  });
}

export const proxy = {
  id: "pat-proxy",
  section: "Design patterns",
  topic: "Structural",
  title: "Proxy",
  blurb: "Stand in for another object with the same interface, to control access to it: load lazily, check permissions, or cache.",
  structure: OBJECTS,
  run,

  explanation: [
    { tip: "**In one line:** an object with the same interface as the real one, that decides when and whether to pass calls through." },
    "The client can't tell a proxy from the real thing — that's the point. What the proxy does between receiving a call and forwarding it defines its kind.",
    { h: "The smell" },
    { list: [
      "An access rule — **load first**, check a permission, use the cache — repeated **at every call site**.",
      "Forgetting it in one place is a bug that only shows up on that path.",
      "The rule can't be changed without finding every caller.",
    ] },
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
      "The first display() is slow and the rest are fast. If that matters, preload what is about to scroll into view.",
    ],
  },

  code: {
    lang: "cpp",
    files: [
      { name: "before.cpp", note: "The problem: every caller checks whether the photo is loaded.", source: BEFORE },
      { name: "proxy.cpp", note: "The classic pattern, which the animation follows.", source: AFTER, traced: true },
    ],
  },
};
