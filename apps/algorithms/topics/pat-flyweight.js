/**
 * Flyweight. A forest of 1,000 trees of two kinds: without the pattern every
 * tree carries its own copy of the texture; with it, a factory hands out one
 * shared, immutable TreeType per kind.
 */

import { frame } from "../core/trace.js";
import { OBJECTS, printed } from "./pat-common.js";

const BEFORE = `// Before: every tree carries its own copy of the heavy data.
#include <cstdio>
#include <string>
#include <vector>

struct Tree {
    int x, y;
    std::string name;
    std::string texture;                 // imagine 4 MB of pixels here
};

int main() {
    std::vector<Tree> forest;
    for (int i = 0; i < 1000; ++i) {
        std::string kind = i % 3 ? "oak" : "pine";
        forest.push_back({i % 37, i % 23, kind, kind + ".png"});
    }
    // 1000 textures in memory for 2 kinds of tree: about 4 GB instead of 8 MB.
    std::printf("trees: %zu, texture copies: %zu\\n", forest.size(), forest.size());
}
`;

const AFTER = `// After: the heavy, unchanging part is shared; each tree keeps only its position.
#include <cstdio>
#include <map>
#include <memory>
#include <string>
#include <vector>

struct TreeType {                         // intrinsic: shared and immutable
    std::string name;
    std::string texture;                  // imagine 4 MB of pixels here
};

class TreeTypes {                         // the flyweight factory
public:
    const TreeType* get(const std::string& name) {
        auto it = types_.find(name);
        if (it == types_.end()) {
            std::printf("new type: %s\\n", name.c_str());
            it = types_.emplace(name, std::make_unique<TreeType>(TreeType{name, name + ".png"})).first;
        }
        return it->second.get();          // existing type: no new data at all
    }
    std::size_t count() const { return types_.size(); }
private:
    std::map<std::string, std::unique_ptr<TreeType>> types_;
};

struct Tree {                             // extrinsic: position, plus a pointer
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
`;

/* ---------------------------------------------------------------- */

const KIND = (i) => (i % 3 ? "oak" : "pine");

function beforeScene() {
  return {
    objects: [0, 1, 2].map((i) => ({
      id: `t${i}`, label: i === 2 ? "Tree #1000" : `Tree #${i + 1}`, role: "concrete", x: i / 2, y: 0.4, state: "edited",
      lines: [`x, y = ${i === 2 ? "0, 10" : `${i}, ${i}`}`, `name = ${KIND(i === 2 ? 999 : i)}`, "texture (4 MB copy)"],
    })),
    links: [],
  };
}

function afterScene({ planted = 0, types = [], states = {}, msg = null } = {}) {
  const shown = Math.min(planted, 4);
  return {
    objects: [
      ...Array.from({ length: shown }, (_, i) => ({
        id: `t${i}`, label: `Tree #${i + 1}`, role: "concrete", x: i / 3, y: 0.04, state: states[`t${i}`],
        lines: [`x, y = ${i}, ${i}`, `type → ${KIND(i)}`],
      })),
      { id: "factory", label: "TreeTypes", role: "client", x: 0.5, y: 0.5, state: states.factory,
        lines: ["get(name):", "  found? return it", "  else create once", `${types.length} type${types.length === 1 ? "" : "s"} held`] },
      ...types.map((k) => ({
        id: k, label: `TreeType ${k}`, stereo: "«shared, immutable»", role: "code", x: k === "pine" ? 0 : 1, y: 0.97, state: states[k],
        lines: [`name = ${k}`, `texture = ${k}.png (4 MB)`],
      })),
    ],
    links: [
      ...types.map((k) => ({ from: "factory", to: k, kind: "owns" })),
      ...Array.from({ length: shown }, (_, i) => ({ from: `t${i}`, to: KIND(i), kind: "ref", label: i ? undefined : "type" })),
    ],
    msg,
  };
}

function* run() {
  yield frame({
    phase: "Before",
    note: "Without the pattern: each of 1,000 trees stores its position and its own copy of the texture.",
    detail: "There are only two kinds of tree, so 998 of those textures are duplicates.",
    marks: beforeScene(),
    metrics: [{ label: "texture copies", value: "1000" }],
  });
  yield frame({
    phase: "After",
    note: "With Flyweight: split each tree into what is unique (position) and what is shared (the kind's name and texture).",
    detail: "Intrinsic state — the same for many objects, and immutable — goes into one shared TreeType per kind. Extrinsic state stays in the tiny Tree.",
    marks: afterScene({ planted: 4, types: ["oak", "pine"], states: { oak: "new", pine: "new" } }),
    metrics: [{ label: "texture copies", value: "1000 → 2" }],
  });

  yield frame({
    phase: "Run",
    note: "Plant tree #1, a pine. The factory has no pine yet, so it creates one.",
    marks: afterScene({ planted: 1, types: ["pine"], states: { t0: "new", factory: "active", pine: "new" }, msg: { from: "t0", to: "factory", label: "get(pine)" } }),
    metrics: [{ label: "trees", value: "1" }, printed("new type: pine")],
  });
  yield frame({
    phase: "Run",
    note: "Tree #2 is an oak: also new, so the factory creates the oak type.",
    marks: afterScene({ planted: 2, types: ["oak", "pine"], states: { t1: "new", factory: "active", oak: "new" }, msg: { from: "t1", to: "factory", label: "get(oak)" } }),
    metrics: [{ label: "trees", value: "2" }, printed("new type: oak")],
  });
  yield frame({
    phase: "Run",
    note: "Tree #3 is another oak. The factory finds it and returns the same pointer: no new texture.",
    marks: afterScene({ planted: 3, types: ["oak", "pine"], states: { t2: "new", factory: "active", oak: "active" }, msg: { from: "factory", to: "t2", label: "existing oak", back: true } }),
    metrics: [{ label: "trees", value: "3" }],
  });
  yield frame({
    phase: "Run",
    note: "Tree #4 is a pine, and reuses the pine type the same way.",
    marks: afterScene({ planted: 4, types: ["oak", "pine"], states: { t3: "new", factory: "active", pine: "active" }, msg: { from: "factory", to: "t3", label: "existing pine", back: true } }),
    metrics: [{ label: "trees", value: "4" }],
  });
  yield frame({
    phase: "Run",
    note: "The other 996 trees all hit existing types. The factory never creates a third.",
    detail: "Each tree is now two ints and a pointer, about 16 bytes. The heavy data exists twice instead of a thousand times.",
    marks: afterScene({ planted: 4, types: ["oak", "pine"], states: { oak: "active", pine: "active" } }),
    metrics: [{ label: "trees", value: "1000" }, printed("trees: 1000, shared tree types: 2")],
  });
  yield frame({
    phase: "Done",
    note: "A thousand trees, two textures. Sharing is safe because nothing ever changes a TreeType after it is made.",
    detail: "If one tree needed a different texture, it would get a different TreeType, never a modified shared one.",
    marks: afterScene({ planted: 4, types: ["oak", "pine"] }),
  });
}

export const flyweight = {
  id: "pat-flyweight",
  section: "Design patterns",
  topic: "Structural",
  title: "Flyweight",
  blurb: "Share the heavy, unchanging part of many similar objects, so each object stores only what is unique to it.",
  structure: OBJECTS,
  run,

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
      "The factory owns the flyweights here, so it must outlive every Tree that points into it.",
    ],
  },

  code: {
    lang: "cpp",
    files: [
      { name: "before.cpp", note: "The problem: a full copy of the heavy data in every object.", source: BEFORE },
      { name: "flyweight.cpp", note: "The classic pattern, which the animation follows.", source: AFTER, traced: true },
    ],
  },
};
