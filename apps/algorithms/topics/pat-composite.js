/**
 * Composite. A file tree where folders and files share one interface, so a
 * single call on the root walks the whole tree.
 */

import { frame } from "../core/trace.js";
import { OBJECTS, add, printed } from "./pat-common.js";

const BEFORE = `// Before: one struct for both kinds, and every operation asks "folder or file?"
#include <cstdio>
#include <string>
#include <vector>

struct Entry {
    std::string name;
    bool isFolder = false;          // edit 1: becomes an enum when Symlink arrives
    int kb = 0;
    std::vector<Entry> children;
};

int totalSize(const Entry& e) {     // edit 2
    if (e.isFolder) {
        int sum = 0;
        for (const Entry& c : e.children) sum += totalSize(c);
        return sum;
    }
    return e.kb;
}

int countFiles(const Entry& e) {    // edit 3
    if (e.isFolder) {
        int n = 0;
        for (const Entry& c : e.children) n += countFiles(c);
        return n;
    }
    return 1;
}

void printTree(const Entry& e, int depth = 0) {   // edit 4
    std::printf("%*s%s\\n", depth * 2, "", e.name.c_str());
    if (e.isFolder)
        for (const Entry& c : e.children) printTree(c, depth + 1);
}

int main() {
    Entry project{"project", true, 0, {
        {"src", true, 0, {{"main.cpp", false, 4, {}}, {"util.cpp", false, 3, {}}}},
        {"readme.md", false, 1, {}},
    }};
    printTree(project);
    std::printf("project: %d KB in %d files\\n", totalSize(project), countFiles(project));
}
`;

const AFTER = `// After: File and Folder implement the same Node interface. A Folder's size()
// asks each child for its size, without knowing or caring which kind it is.
#include <cstdio>
#include <memory>
#include <string>
#include <vector>

class Node {
public:
    virtual ~Node() = default;
    virtual int size() const = 0;
    virtual const std::string& name() const = 0;
};

class File : public Node {                      // a leaf
public:
    File(std::string name, int kb) : name_(std::move(name)), kb_(kb) {}
    int size() const override { return kb_; }
    const std::string& name() const override { return name_; }
private:
    std::string name_;
    int kb_;
};

class Folder : public Node {                    // a composite: a Node made of Nodes
public:
    explicit Folder(std::string name) : name_(std::move(name)) {}

    Folder& add(std::unique_ptr<Node> child) {
        children_.push_back(std::move(child));
        return *this;
    }

    int size() const override {
        int sum = 0;
        for (const auto& c : children_) sum += c->size();   // recursion, by interface
        return sum;
    }
    const std::string& name() const override { return name_; }

private:
    std::string name_;
    std::vector<std::unique_ptr<Node>> children_;
};

// Client code takes a Node. It neither knows nor cares whether that is one
// file or a whole tree.
void report(const Node& n) { std::printf("%s: %d KB\\n", n.name().c_str(), n.size()); }

int main() {
    auto src = std::make_unique<Folder>("src");
    src->add(std::make_unique<File>("main.cpp", 4))
        .add(std::make_unique<File>("util.cpp", 3));

    Folder project("project");
    project.add(std::move(src))
           .add(std::make_unique<File>("readme.md", 1));

    report(project);

    File notes("notes.txt", 2);
    report(notes);                              // same call, a single leaf
}
`;

const MODERN = `// Modern: a recursive std::variant. No base class and no heap-allocated nodes
// you manage yourself; the tree is a value you can copy and compare.
#include <cstdio>
#include <string>
#include <variant>
#include <vector>

struct Node;
struct File { std::string name; int kb; };
struct Folder { std::string name; std::vector<Node> children; };  // vector of an incomplete type: fine since C++17
struct Node { std::variant<File, Folder> v; };

template <class... F> struct overloaded : F... { using F::operator()...; };

int size(const Node& n) {
    return std::visit(overloaded{
        [](const File& f) { return f.kb; },
        [](const Folder& d) {
            int sum = 0;
            for (const Node& c : d.children) sum += size(c);
            return sum;
        },
    }, n.v);
}

int main() {
    Node project{Folder{"project", {
        Node{Folder{"src", {Node{File{"main.cpp", 4}}, Node{File{"util.cpp", 3}}}}},
        Node{File{"readme.md", 1}},
    }}};
    std::printf("project: %d KB\\n", size(project));
}
`;

/* ---------------------------------------------------------------- */

function beforeScene(edited) {
  const st = edited ? "edited" : "idle";
  const fn = (id, label, x, leaf) => ({
    id, label, role: "code", x, y: 0.9, state: st,
    lines: ["if (e.isFolder)", "  recurse children", ...(edited ? [add("else if (e.isLink)"), add("  follow target")] : []), `else ${leaf}`],
  });
  return {
    objects: [
      { id: "entry", label: "struct Entry", role: "concrete", x: 0.5, y: 0.04, state: st,
        lines: ["name", edited ? { t: "kind (was bool isFolder)", add: true } : "bool isFolder", "kb", "children"] },
      fn("size", "totalSize(e)", 0, "return e.kb"),
      fn("count", "countFiles(e)", 0.5, "return 1"),
      fn("print", "printTree(e)", 1, "print name"),
    ],
    links: ["size", "count", "print"].map((id) => ({ from: id, to: "entry", kind: "uses" })),
  };
}

const TREE = [
  { id: "project", label: "Folder project", x: 0.5, y: 0.04, folder: true, parent: null },
  { id: "src", label: "Folder src", x: 0.22, y: 0.5, folder: true, parent: "project" },
  { id: "readme", label: "File readme.md", x: 0.78, y: 0.5, kb: 1, parent: "project" },
  { id: "main", label: "File main.cpp", x: 0, y: 0.96, kb: 4, parent: "src" },
  { id: "util", label: "File util.cpp", x: 0.44, y: 0.96, kb: 3, parent: "src" },
];

/** @param sums running sum shown in each folder, keyed by id */
function treeScene({ states = {}, sums = {}, msg = null, notes = false } = {}) {
  return {
    objects: [
      ...TREE.map((n) => ({
        id: n.id, label: n.label, role: n.folder ? "code" : "concrete", x: n.x, y: n.y, state: states[n.id],
        lines: n.folder
          ? ["size(): Σ child->size()", ...(n.id in sums ? [`sum so far = ${sums[n.id]}`] : [])]
          : [`size(): ${n.kb} KB`],
      })),
      { id: "iface", label: "Node", stereo: "«interface»", role: "interface", x: 1, y: 0.04, state: states.iface,
        lines: ["size()", "name()"] },
      ...(notes ? [{ id: "notes", label: "File notes.txt", role: "concrete", x: 1, y: 0.96, state: states.notes, lines: ["size(): 2 KB"] }] : []),
    ],
    links: TREE.filter((n) => n.parent).map((n) => ({ from: n.parent, to: n.id, kind: "owns" })),
    msg,
  };
}

function* run() {
  yield frame({
    phase: "Before",
    note: "Without the pattern: one struct for files and folders, and every function asks which one it has.",
    detail: "totalSize, countFiles and printTree each contain the same if (isFolder) … else … shape.",
    marks: beforeScene(false),
    metrics: [{ label: "places edited", value: "0" }],
  });
  yield frame({
    phase: "Before",
    note: "Change request: support symbolic links. The struct changes, and every function grows a new branch.",
    detail: "The type check is duplicated in every operation. Miss one and links are silently treated as files.",
    marks: beforeScene(true),
    metrics: [{ label: "places edited", value: "4" }],
  });
  yield frame({
    phase: "After",
    note: "With Composite: File and Folder both implement Node. A Folder is a Node that contains Nodes.",
    detail: "The tree is made of one kind of thing, as far as any caller is concerned. A Symlink would be one more Node class.",
    marks: treeScene({ states: { iface: "dispatch" } }),
    metrics: [],
  });

  const sums = {};
  const steps = [];
  // Depth-first walk, emitting a call and a return frame per edge.
  const walk = (id) => {
    const n = TREE.find((t) => t.id === id);
    if (!n.folder) return n.kb;
    sums[id] = 0;
    steps.push({ kind: "enter", id, sums: { ...sums } });
    for (const c of TREE.filter((t) => t.parent === id)) {
      steps.push({ kind: "call", from: id, to: c.id, sums: { ...sums } });
      const s = walk(c.id);
      sums[id] += s;
      steps.push({ kind: "ret", from: c.id, to: id, value: s, sums: { ...sums } });
    }
    return sums[id];
  };
  const total = walk("project");

  yield frame({
    phase: "Run",
    note: "report(project) calls project.size(). It's just a Node to report().",
    marks: treeScene({ states: { project: "active" }, sums: { project: 0 } }),
    metrics: [],
  });

  for (const s of steps) {
    if (s.kind === "enter") continue;
    const child = TREE.find((t) => t.id === (s.kind === "call" ? s.to : s.from));
    if (s.kind === "call") {
      yield frame({
        phase: "Run",
        note: `${TREE.find((t) => t.id === s.from).label} asks a child for its size: child->size().`,
        detail: child.folder ? "The child is itself a folder, so the same code runs one level down. This is the recursion, and the caller can't tell." : "A virtual call. The folder doesn't check what the child is.",
        marks: treeScene({ sums: s.sums, states: { [s.from]: "active", [s.to]: "active", iface: "dispatch" }, msg: { from: s.from, to: s.to, label: "size()" } }),
        metrics: [],
      });
    } else {
      yield frame({
        phase: "Run",
        note: `${child.label} returns ${s.value} KB${child.folder ? ", the sum of its own children" : ""}.`,
        marks: treeScene({ sums: s.sums, states: { [s.to]: "active", [s.from]: child.folder ? "new" : "active" }, msg: { from: s.from, to: s.to, label: `${s.value} KB`, back: true } }),
        metrics: [{ label: "running total", value: `${s.sums.project} KB` }],
      });
    }
  }

  yield frame({
    phase: "Run",
    note: `project.size() returns ${total}, and report() prints it.`,
    marks: treeScene({ sums, states: { project: "new" } }),
    metrics: [printed(`project: ${total} KB`)],
  });
  yield frame({
    phase: "Run",
    note: "report(notes) on a single file: the same function, the same call, one level of tree.",
    detail: "That's the point of Composite — client code treats one object and a whole tree of them identically.",
    marks: treeScene({ sums, notes: true, states: { notes: "active" } }),
    metrics: [printed("notes.txt: 2 KB")],
  });
}

export const composite = {
  id: "pat-composite",
  section: "Design patterns",
  topic: "Structural",
  title: "Composite",
  blurb: "Build trees out of objects that share one interface, so a single item and a whole tree are used the same way.",
  structure: OBJECTS,
  run,

  explanation: [
    { tip: "**In one line:** leaves and containers implement the same interface, and a container implements it by asking its children." },
    "File systems, UI widget trees, scene graphs, organisation charts, the syntax tree inside a compiler — any **part–whole hierarchy** — are trees where you want to ask the same question of a single item and of a whole subtree. Composite is the way to make those look identical to the caller.",
    { h: "The smell" },
    { list: [
      "A flag or enum says **\"am I a container?\"**, and every operation starts with `if (isFolder) … else …`.",
      "The recursion and the type check are **duplicated** in every function that walks the tree.",
      "A new kind of node (a symlink) means **editing every function**.",
    ] },
    { h: "The fix" },
    { list: [
      "One interface, **`Node`**, with the operations every node supports: `size()`, `name()`.",
      "**Leaves** (`File`) implement it directly.",
      "**Composites** (`Folder`) hold a list of `Node`s and implement each operation **by asking their children** — `size()` is the sum of `child->size()`.",
      "The recursion lives **inside the composite**, written once. Callers just call `size()` on whatever they have.",
    ] },
    { h: "The design question" },
    "Where do **child-management** methods (`add`, `remove`) go? On `Node`, so every node looks the same but a `File` has to reject `add` at run time? Or only on `Folder`, which is type-safe but means callers sometimes need to know they have a folder? This implementation puts them **only on `Folder`** — the common choice in C++, where type safety is cheap.",
    { h: "Modern C++" },
    "A **recursive `std::variant`** — `Node` holds `variant<File, Folder>`, and a `Folder` holds `vector<Node>` — gives the same tree as a **value**: copyable, comparable, no `unique_ptr`s to manage. Operations are free functions using `std::visit`. This flips the trade-off in the same way as Visitor: easy to add operations, harder to add node kinds.",
  ],

  analysis: {
    rows: [
      ["Run-time cost", "One virtual call per node visited; operations over the tree are O(nodes)"],
      ["Use it when", "Data is naturally a tree, and callers should not care whether they hold a leaf or a subtree"],
      ["Avoid it when", "The hierarchy is fixed and shallow — two explicit levels can be clearer than a recursive abstraction"],
    ],
    notes: [
      "**Visitor** is the usual partner: Composite gives the tree shape, Visitor adds new operations over it without editing every node class.",
      "**Iterator** can flatten a composite into a sequence, so callers can loop instead of recurse.",
      "Watch for **cycles**: a folder added to its own descendant makes `size()` recurse forever. Unique ownership (`unique_ptr` children) makes cycles impossible to build.",
      "Caching a folder's size makes repeated queries O(1), but every child change must invalidate the parent chain — children then need a back-pointer to their parent.",
    ],
  },

  code: {
    lang: "cpp",
    files: [
      { name: "before.cpp", note: "The problem: every function checks folder-or-file.", source: BEFORE },
      { name: "composite.cpp", note: "The classic pattern, which the animation follows.", source: AFTER, traced: true },
      { name: "modern.cpp", note: "The same tree as a recursive std::variant value.", source: MODERN },
    ],
  },
};
