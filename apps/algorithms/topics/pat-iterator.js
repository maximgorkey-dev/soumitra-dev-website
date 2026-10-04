/**
 * Iterator. "Recently played" moves from a plain vector to a ring buffer:
 * loops that index the storage all break; loops over an iterator don't.
 * The run shows the iterator hiding the ring's wrap-around.
 */

import { frame } from "../core/trace.js";
import { OBJECTS, add, printed } from "./pat-common.js";

const BEFORE = `// Before: callers loop over the storage itself.
#include <cstdio>
#include <string>
#include <vector>

struct Recent {
    std::vector<std::string> songs;      // public, so every caller indexes it
};

void printAll(const Recent& r) {
    for (std::size_t i = 0; i < r.songs.size(); ++i) std::printf("%s\\n", r.songs[i].c_str());
}
int countLong(const Recent& r) {
    int n = 0;
    for (std::size_t i = 0; i < r.songs.size(); ++i) n += r.songs[i].size() > 5;
    return n;
}
bool contains(const Recent& r, const std::string& s) {
    for (std::size_t i = 0; i < r.songs.size(); ++i) if (r.songs[i] == s) return true;
    return false;
}
// Change request: keep only the last 3 songs, in a fixed ring buffer.
// Every loop above has to learn the wrap-around: songs[(start + i) % 3].

int main() {
    Recent r{{"verse", "chorus", "bridge"}};
    printAll(r);
    std::printf("long: %d, has chorus: %d\\n", countLong(r), contains(r, "chorus"));
}
`;

const AFTER = `// After: Recent hands out iterators, and only the iterator knows the layout.
#include <array>
#include <cstdio>
#include <initializer_list>
#include <string>

class Recent {
public:
    void play(const std::string& song) {
        buf_[(start_ + size_) % N] = song;
        if (size_ < N) ++size_;
        else start_ = (start_ + 1) % N;          // full: the oldest is overwritten
    }

    class iterator {
    public:
        iterator(const Recent* r, int k) : r_(r), k_(k) {}
        const std::string& operator*() const { return r_->buf_[(r_->start_ + k_) % N]; }
        iterator& operator++() { ++k_; return *this; }
        bool operator!=(const iterator& o) const { return k_ != o.k_; }
    private:
        const Recent* r_;
        int k_;                                  // songs counted from the oldest
    };
    iterator begin() const { return {this, 0}; }
    iterator end() const { return {this, size_}; }

private:
    static constexpr int N = 3;
    std::array<std::string, N> buf_;
    int start_ = 0, size_ = 0;
};

int main() {
    Recent recent;
    for (const char* s : {"intro", "verse", "chorus", "bridge"}) recent.play(s);

    for (const std::string& song : recent)       // begin(), *it, ++it, != end()
        std::printf("%s\\n", song.c_str());
}
`;

const MODERN = `// Modern: no iterator class at all. A view built from iota and transform
// yields the same sequence lazily. (C++23's std::generator is another way.)
#include <array>
#include <cstdio>
#include <ranges>
#include <string>

int main() {
    std::array<std::string, 3> buf{"bridge", "verse", "chorus"};
    const int start = 1, size = 3;
    auto songs = std::views::iota(0, size)
               | std::views::transform([&](int k) -> const std::string& { return buf[(start + k) % 3]; });
    for (const auto& s : songs) std::printf("%s\\n", s.c_str());
}
`;

/* ---------------------------------------------------------------- */

const LOOPS = [
  { id: "f1", label: "printAll()", x: 0 },
  { id: "f2", label: "countLong()", x: 0.5 },
  { id: "f3", label: "contains()", x: 1 },
];

function beforeScene(edited) {
  return {
    objects: [
      { id: "data", label: "Recent", role: "code", x: 0.5, y: 0.04, state: edited ? "edited" : "idle",
        lines: edited ? [add("string buf[3]; int start, size")] : ["vector<string> songs   // public"] },
      ...LOOPS.map((l) => ({
        id: l.id, label: l.label, role: "client", x: l.x, y: 0.9, state: edited ? "edited" : "idle",
        lines: edited ? [add("songs[(start + i) % 3]")] : ["for i < songs.size():", "  songs[i]"],
      })),
    ],
    links: LOOPS.map((l) => ({ from: l.id, to: "data", kind: "uses", label: "indexes" })),
  };
}

const SLOTS = ["bridge", "verse", "chorus"];     // after four plays: slot 0 was overwritten

function afterScene({ states = {}, k = null, msg = null, edited = false } = {}) {
  const slot = k === null || k >= 3 ? null : (1 + k) % 3;
  return {
    objects: [
      { id: "loop", label: edited ? "printAll, countLong, contains" : "for (song : recent)", role: "client", x: 0, y: 0.04, state: states.loop,
        lines: edited ? ["for (s : recent)   // unchanged"] : ["it = begin(); it != end(); ++it", "  print(*it)"] },
      { id: "recent", label: "Recent", role: "code", x: 1, y: 0.04, state: states.recent || (edited ? "edited" : undefined),
        lines: [
          ...SLOTS.map((s, i) => `buf_[${i}] = ${s}${i === slot ? "   ◀" : ""}`),
          "start_ = 1, size_ = 3",
          ...(edited ? [add("begin(), end(), iterator")] : []),
        ] },
      { id: "it", label: "iterator", role: "concrete", x: 0.5, y: 0.92, state: states.it,
        lines: k === null ? ["k_ = songs from the oldest", "*it → buf_[(start_ + k_) % 3]"]
          : k >= 3 ? ["k_ = 3 == end().k_"] : [`k_ = ${k}`, `*it → buf_[(1 + ${k}) % 3] = buf_[${slot}]`] },    ],
    links: [
      { from: "loop", to: "recent", kind: "calls", label: "begin / end" },
      { from: "loop", to: "it", kind: "calls", label: "* ++ !=" },
      { from: "it", to: "recent", kind: "ref", label: "r_" },
    ],
    msg,
  };
}

function* run() {
  yield frame({
    phase: "Before",
    note: "Without the pattern: Recent exposes its vector, and three functions loop over it by index.",
    detail: "Each loop knows how the songs are stored: contiguous, oldest first, starting at 0.",
    marks: beforeScene(false),
    metrics: [{ label: "places edited", value: "0" }],
  });
  yield frame({
    phase: "Before",
    note: "Change request: keep only the last three songs, in a fixed ring buffer. Every loop has to learn the wrap-around.",
    detail: "The storage changed in one class, but the knowledge of it was copied into every caller.",
    marks: beforeScene(true),
    metrics: [{ label: "places edited", value: "4" }],
  });
  yield frame({
    phase: "After",
    note: "With Iterator: callers loop with begin(), *it, ++it and != end(). Only the iterator knows where the next song lives.",
    detail: "The same change now touches Recent and its iterator. The loops are written once against the iterator vocabulary and never change.",
    marks: afterScene({ edited: true }),
    metrics: [{ label: "places edited", value: "4 → 1" }],
  });

  yield frame({
    phase: "Run",
    note: "Four songs were played into three slots, so \"intro\" was overwritten by \"bridge\" in slot 0, and the oldest song is now in slot 1.",
    detail: "Storage order is bridge, verse, chorus. Play order is verse, chorus, bridge. Only the iterator has to care about the difference.",
    marks: afterScene({ states: { recent: "active" } }),
  });
  yield frame({
    phase: "Run",
    note: "The range-for calls begin(), which returns an iterator at k_ = 0: the oldest song.",
    marks: afterScene({ states: { loop: "active", it: "new" }, k: 0, msg: { from: "loop", to: "recent", label: "begin()" } }),
  });
  const songs = ["verse", "chorus", "bridge"];
  for (let k = 0; k < 3; k++) {
    yield frame({
      phase: "Run",
      note: k === 2
        ? `*it with k_ = 2 reads slot (1 + 2) % 3 = 0. The wrap-around happens inside operator*, and the loop never sees it.`
        : `${k ? "++it moves k_ to " + k + ", then " : ""}*it reads slot ${(1 + k) % 3}: "${songs[k]}".`,
      marks: afterScene({ states: { loop: "active", it: "active", recent: "dispatch" }, k, msg: { from: "loop", to: "it", label: k ? "++it, *it" : "*it" } }),
      metrics: [printed(songs[k])],
    });
  }
  yield frame({
    phase: "Run",
    note: "++it makes k_ = 3, which equals end(). it != end() is false, and the loop stops.",
    detail: "end() is just a position one past the last song. It is never dereferenced.",
    marks: afterScene({ states: { loop: "active", it: "dim" }, k: 3, msg: { from: "loop", to: "it", label: "++it, != end()" } }),
  });
  yield frame({
    phase: "Done",
    note: "Three songs in play order from a buffer that stores them out of order, and the loop is the same one-liner that works on a vector.",
    detail: "Because Recent speaks the iterator vocabulary, range-for works on it now, and so would std::find or std::count with a few type aliases added.",
    marks: afterScene(),
  });
}

export const iterator = {
  id: "pat-iterator",
  section: "Design patterns",
  topic: "Behavioural",
  title: "Iterator",
  blurb: "Walk the elements of a collection without knowing how it is stored.",
  structure: OBJECTS,
  run,

  explanation: [
    { tip: "**In one line:** a small object that remembers a position in a collection and knows how to move to the next element." },
    "Iterator is the pattern C++ **built its standard library on**. Every container, every algorithm and the range-for loop speak the same small vocabulary, so `std::sort` works on a vector, an array or your own type.",
    { h: "The smell" },
    { list: [
      "Callers **index the storage** directly: `songs[i]`, `node->next`, `start + i`.",
      "A change of layout — vector to ring buffer, array to tree — **breaks every loop**.",
      "Each caller repeats the same traversal logic, and the copies drift.",
    ] },
    { h: "The C++ iterator vocabulary" },
    { list: [
      "`begin()` and `end()` give a **start position** and a **one-past-the-end** marker.",
      "`*it` reads the element; `++it` advances; `it != end` tests for the end.",
      "**Categories** say what else works: random access (`it + 5`), bidirectional (`--it`), forward, input.",
      "Since C++20, `end()` can be a **sentinel** of a different type — useful for \"until a condition\" ranges.",
    ] },
    { h: "Modern C++" },
    { list: [
      "**Ranges** (`std::views::filter`, `transform`) are iterators composed lazily — see Ranges pipelines.",
      "**Generators** (`std::generator`, C++23) let you write an iterator as a simple function with `co_yield`.",
    ] },
  ],

  analysis: {
    rows: [
      ["Use it when", "A custom collection or sequence should work with range-for and standard algorithms"],
      ["Cost", "Usually zero: iterators inline to pointer arithmetic or a counter"],
      ["Watch for", "Invalidation — modifying a container can leave existing iterators dangling"],
    ],
    notes: [
      "`std::vector::push_back` may reallocate and invalidate **every** iterator into the vector.",
      "For standard algorithms, add `value_type`, `difference_type`, `operator==` and a post-increment; C++20 checks these with the `std::forward_iterator` concept.",
      "Iterators separate **traversal from storage**; Visitor separates **operations from structure**. Both let a collection change shape without its users noticing.",
    ],
  },

  code: {
    lang: "cpp",
    files: [
      { name: "before.cpp", note: "The problem: every caller indexes the storage.", source: BEFORE },
      { name: "iterator.cpp", note: "The classic pattern, which the animation follows.", source: AFTER, traced: true },
      { name: "modern.cpp", note: "The same traversal as a lazy ranges view.", source: MODERN },
    ],
  },
};
