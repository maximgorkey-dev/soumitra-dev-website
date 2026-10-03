/**
 * RAII and scope guards. Two files opened, an error halfway through, and what
 * happens to the files with and without destructors doing the cleanup.
 */

import { frame } from "../core/trace.js";
import { MEMORY, printed } from "./pat-common.js";

const BEFORE = `// Before: resources are acquired and released by hand. Every exit path has
// to remember to release them, and this one doesn't.
#include <cstdio>

int openFiles = 0;

struct Handle { const char* name; };

Handle* openFile(const char* name) {
    ++openFiles;
    std::printf("open %s\\n", name);
    return new Handle{name};
}

void closeFile(Handle* h) {
    --openFiles;
    std::printf("close %s\\n", h->name);
    delete h;
}

bool copy(const char* from, const char* to, bool diskFull) {
    Handle* in = openFile(from);
    Handle* out = openFile(to);
    if (diskFull) {
        std::printf("error: disk full, returning early\\n");
        return false;                   // in and out are never closed
    }
    closeFile(out);
    closeFile(in);
    return true;
}

int main() {
    copy("a.txt", "b.txt", true);
    std::printf("files still open: %d\\n", openFiles);
}
`;

const AFTER = `// After: the resource is owned by an object. The constructor acquires it and
// the destructor releases it, so leaving the scope by any route releases it.
#include <cstdio>
#include <stdexcept>

int openFiles = 0;

class File {
public:
    explicit File(const char* name) : name_(name) {
        ++openFiles;
        std::printf("open %s\\n", name_);
    }
    ~File() {
        --openFiles;
        std::printf("close %s\\n", name_);
    }
    File(const File&) = delete;             // one owner per file
    File& operator=(const File&) = delete;

private:
    const char* name_;
};

void copy(const char* from, const char* to) {
    File in(from);
    File out(to);
    throw std::runtime_error("disk full");  // an early return behaves the same
}

int main() {
    try {
        copy("a.txt", "b.txt");
    } catch (const std::exception& e) {
        std::printf("caught: %s\\n", e.what());
    }
    std::printf("files still open: %d\\n", openFiles);
}
`;

const MODERN = `// Modern: you rarely write the RAII class yourself. unique_ptr takes a custom
// deleter for C-style handles, and a scope guard runs any code on exit.
#include <cstdio>
#include <memory>
#include <utility>

struct FileCloser {
    void operator()(std::FILE* f) const {
        std::fclose(f);
        std::printf("fclose ran\\n");
    }
};
using FilePtr = std::unique_ptr<std::FILE, FileCloser>;

// A minimal scope guard (std::experimental::scope_exit, or Boost.Scope).
template <class F>
class ScopeExit {
public:
    explicit ScopeExit(F f) : f_(std::move(f)) {}
    ~ScopeExit() { f_(); }
    ScopeExit(const ScopeExit&) = delete;
    ScopeExit& operator=(const ScopeExit&) = delete;
private:
    F f_;
};

int main() {
    {
        FilePtr f(std::tmpfile());
        if (!f) return 1;
        std::fputs("hello", f.get());
        std::printf("wrote to a temp file\\n");
    }                                           // fclose runs here

    {
        ScopeExit guard([] { std::printf("guard: roll back half-finished work\\n"); });
        std::printf("doing work\\n");
    }                                           // and the guard here
}
`;

/* ---------------------------------------------------------------- */

const REGIONS = ["Stack", "Open files (OS)"];

function* run() {
  // ---- before ----
  const main = (line, state) => ({ id: "main", region: "Stack", label: "main()", state, cells: [{ t: line }] });
  let log = [];

  yield frame({
    phase: "Before",
    note: "Without RAII: copy() opens two files through raw handles and must close them by hand.",
    detail: "A raw pointer is just an address. Destroying the pointer does nothing to what it points at.",
    marks: { regions: REGIONS, blocks: [main("copy(a.txt, b.txt)")], log },
    metrics: [{ label: "files open", value: "0" }],
  });

  const rawFrame = (inTo, outTo, state) => ({ id: "copy", region: "Stack", label: "copy() locals", state,
    cells: [{ t: inTo ? "Handle* in" : "Handle* in  = ?", kind: "ptr", to: inTo }, { t: outTo ? "Handle* out" : "Handle* out = ?", kind: "ptr", to: outTo }] });
  const fileA = (state) => ({ id: "a", region: "Open files (OS)", label: "a.txt", state, cells: [{ t: "open handle" }] });
  const fileB = (state) => ({ id: "b", region: "Open files (OS)", label: "b.txt", state, cells: [{ t: "open handle" }] });

  log = ["open a.txt"];
  yield frame({
    phase: "Before",
    note: "openFile(\"a.txt\") acquires a file and returns a raw pointer to it.",
    marks: { regions: REGIONS, blocks: [main("copy(a.txt, b.txt)"), rawFrame("a", null, "active"), fileA("new")], log },
    metrics: [{ label: "files open", value: "1" }],
  });
  log = [...log, "open b.txt"];
  yield frame({
    phase: "Before",
    note: "The second file is opened the same way.",
    marks: { regions: REGIONS, blocks: [main("copy(a.txt, b.txt)"), rawFrame("a", "b", "active"), fileA(), fileB("new")], log },
    metrics: [{ label: "files open", value: "2" }],
  });
  log = [...log, "error: disk full, returning early"];
  yield frame({
    phase: "Before",
    note: "An error: copy() returns early, before reaching the closeFile() calls.",
    detail: "The pointers in and out vanish with copy()'s stack frame. The files they pointed at do not.",
    marks: { regions: REGIONS, blocks: [main("copy(a.txt, b.txt)", "active"), { ...rawFrame(null, null), state: "freed" }, fileA("leaked"), fileB("leaked")], log },
    metrics: [{ label: "files open", value: "2" }],
  });
  log = [...log, "files still open: 2"];
  yield frame({
    phase: "Before",
    note: "Two files leaked. Nothing in the program refers to them any more, so nothing can close them.",
    detail: "Every new early return, every exception from a function called in between, is another place to forget. Exceptions make it impossible to see them all.",
    marks: { regions: REGIONS, blocks: [main("after copy()"), fileA("leaked"), fileB("leaked")], log },
    metrics: [{ label: "files open", value: "2" }],
  });

  // ---- after ----
  log = [];
  const fileObj = (id, name, to, state) => ({ id, region: "Stack", label: `File ${id === "fin" ? "in" : "out"}`, state,
    cells: [{ t: `name_ = "${name}"` }, { t: "owns the open file", kind: "ptr", to, state: state === "active" ? "active" : undefined }] });

  yield frame({
    phase: "After",
    note: "With RAII: a File object owns the open file. The constructor opens it; the destructor closes it.",
    detail: "RAII — Resource Acquisition Is Initialisation. The real idea is the other half: release is destruction, and C++ guarantees destructors run.",
    marks: { regions: REGIONS, blocks: [main("try { copy(a, b) }")], log },
    metrics: [{ label: "files open", value: "0" }],
  });

  log = ["open a.txt"];
  yield frame({
    phase: "Run",
    note: "File in(\"a.txt\"): the constructor opens the file.",
    marks: { regions: REGIONS, blocks: [main("try { copy(a, b) }"), fileObj("fin", "a.txt", "a", "new"), fileA("new")], log },
    metrics: [{ label: "files open", value: "1" }, printed("open a.txt")],
  });
  log = [...log, "open b.txt"];
  yield frame({
    phase: "Run",
    note: "File out(\"b.txt\"): the second object, constructed after the first.",
    marks: { regions: REGIONS, blocks: [main("try { copy(a, b) }"), fileObj("fin", "a.txt", "a"), fileObj("fout", "b.txt", "b", "new"), fileA(), fileB("new")], log },
    metrics: [{ label: "files open", value: "2" }, printed("open b.txt")],
  });
  log = [...log, "— throw runtime_error(\"disk full\") —"];
  yield frame({
    phase: "Unwind",
    note: "An exception is thrown. C++ now unwinds the stack: every fully constructed local is destroyed, in reverse order.",
    detail: "This is the guarantee RAII relies on. It holds for return, break, goto out of scope and exceptions alike.",
    marks: { regions: REGIONS, blocks: [main("try { copy(a, b) }"), fileObj("fin", "a.txt", "a"), fileObj("fout", "b.txt", "b", "active"), fileA(), fileB("active")], log },
    metrics: [{ label: "files open", value: "2" }],
  });
  log = [...log, "close b.txt"];
  yield frame({
    phase: "Unwind",
    note: "~File() runs for out first — the last object constructed is the first destroyed — and closes b.txt.",
    marks: { regions: REGIONS, blocks: [main("try { copy(a, b) }"), fileObj("fin", "a.txt", "a", "active"), { ...fileObj("fout", "b.txt", null), state: "freed", cells: [] }, fileA("active"), fileB("freed")], log },
    metrics: [{ label: "files open", value: "1" }, printed("close b.txt")],
  });
  log = [...log, "close a.txt"];
  yield frame({
    phase: "Unwind",
    note: "Then ~File() for in closes a.txt.",
    detail: "Reverse order matters: something constructed later may depend on something earlier (a writer on its file), so it must be gone first.",
    marks: { regions: REGIONS, blocks: [main("try { copy(a, b) }", "active"), { ...fileObj("fin", "a.txt", null), state: "freed", cells: [] }, fileA("freed")], log },
    metrics: [{ label: "files open", value: "0" }, printed("close a.txt")],
  });
  log = [...log, "caught: disk full"];
  yield frame({
    phase: "Run",
    note: "Only now does the catch block in main() run. By then, every resource is already released.",
    marks: { regions: REGIONS, blocks: [main("catch (exception& e)", "active")], log },
    metrics: [{ label: "files open", value: "0" }, printed("caught: disk full")],
  });
  log = [...log, "files still open: 0"];
  yield frame({
    phase: "Done",
    note: "Nothing leaked, and copy() contains no cleanup code at all.",
    detail: "The cleanup is written once, in ~File(), and runs on every path out of every scope that holds a File — including paths that didn't exist when ~File() was written.",
    marks: { regions: REGIONS, blocks: [main("after copy()")], log },
    metrics: [{ label: "files open", value: "0" }, printed("files still open: 0")],
  });
}

export const raii = {
  id: "pat-raii",
  section: "Design patterns",
  topic: "Modern C++",
  title: "RAII and scope guards",
  blurb: "Tie every resource to an object's lifetime, so destructors release it on every path out of a scope — exceptions included.",
  structure: MEMORY,
  run,

  explanation: [
    { tip: "**In one line:** acquire a resource in a constructor, release it in the destructor, and let scope do the rest." },
    "RAII is **the** C++ idiom — the one the language is built around, and the reason C++ doesn't need `finally` or a garbage collector. Memory, files, locks, sockets, database transactions, GPU buffers: anything you must give back is a resource, and RAII is how C++ gives it back.",
    { h: "The smell" },
    { list: [
      "**Paired calls**: `open` / `close`, `lock` / `unlock`, `new` / `delete`, with code in between.",
      "Every **early return** needs its own cleanup, and every new one is a chance to forget.",
      "Any function called in between can **throw**, creating an exit path that is invisible in the source.",
      "Cleanup code is **duplicated** on every path and grows with each resource added.",
    ] },
    { h: "The fix" },
    { list: [
      "Wrap the resource in a class. The **constructor acquires**; the **destructor releases**.",
      "Hold the object **by value** in the scope that uses it.",
      "C++ guarantees destructors of fully constructed locals run when the scope exits — by `return`, `break`, or **exception** (*stack unwinding*).",
      "Destruction is in **reverse order** of construction, so later objects that depend on earlier ones are gone first.",
      "Delete the copy operations (or define them carefully): **two owners would release twice**.",
    ] },
    { h: "You rarely write it yourself" },
    { list: [
      "**Memory**: `std::unique_ptr`, `std::shared_ptr`, `std::vector`, `std::string`.",
      "**Locks**: `std::lock_guard`, `std::scoped_lock`, `std::unique_lock`.",
      "**C handles**: `std::unique_ptr<FILE, Closer>` with a custom deleter, as in the modern listing.",
      "**Anything else**: a *scope guard* — an object that runs a lambda in its destructor (`std::experimental::scope_exit`, Boost.Scope).",
    ] },
    { h: "Rules that follow from it" },
    { list: [
      "**Rule of zero**: if every member manages itself, your class needs no destructor, copy or move operations at all.",
      "**Destructors must not throw** — one running during unwinding that throws calls `std::terminate`.",
      "A naked `new` in application code is a smell: who owns the result?",
    ] },
  ],

  analysis: {
    rows: [
      ["Run-time cost", "None beyond the release itself; destructor calls are inserted at compile time"],
      ["Use it when", "Always, for anything that must be released — this is the default in C++"],
      ["Watch out for", "Resources whose release can fail (flush, commit): report failure from an explicit call, not the destructor"],
    ],
    notes: [
      "Unwinding only happens if the exception is **caught** somewhere. An uncaught exception may terminate without running destructors — one reason `main` often has a catch-all.",
      "A partially constructed object's destructor does **not** run, but its already-constructed members' destructors do. So acquire each resource in its own member, not several in one constructor body.",
      "`std::lock_guard` is the purest RAII: it has no methods except its constructor and destructor.",
      "Garbage-collected languages reclaim memory but not files or locks, which is why they need `finally`, `using` or `with`. RAII handles both with one mechanism.",
    ],
  },

  code: {
    lang: "cpp",
    files: [
      { name: "before.cpp", note: "The problem: manual cleanup, skipped by an early return.", source: BEFORE },
      { name: "raii.cpp", note: "A RAII class, which the animation follows.", source: AFTER, traced: true },
      { name: "modern.cpp", note: "unique_ptr with a custom deleter, and a scope guard.", source: MODERN },
    ],
  },
};
