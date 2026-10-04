/**
 * Rule of zero, before and after: a class owning raw memory with five
 * hand-written special functions, then members that manage themselves.
 */

import { add, box, promote, sceneWith } from "./pat-common.js";
import { ruleOfZero as n } from "./pat-modern-notes.js";

const BEFORE = `// Before: a class that owns raw memory must write all five special functions.
#include <cstdio>
#include <cstring>
#include <utility>

class Document {
public:
    explicit Document(const char* t) : title_(new char[std::strlen(t) + 1]) { std::strcpy(title_, t); }
    ~Document() { delete[] title_; }
    Document(const Document& o) : Document(o.title_) {}
    Document& operator=(const Document& o) {
        if (this != &o) { Document tmp(o); std::swap(title_, tmp.title_); }
        return *this;
    }
    Document(Document&& o) noexcept : title_(std::exchange(o.title_, nullptr)) {}
    Document& operator=(Document&& o) noexcept { std::swap(title_, o.title_); return *this; }
    const char* title() const { return title_; }
private:
    char* title_;            // a second raw member means revisiting all five functions
};

int main() {
    Document a("Report");
    Document b = std::move(a);
    std::printf("moved: title=%s\\n", b.title());
}
`;

const FIVE = ["~Document()", "Document(const Document&)", "operator=(const Document&)", "Document(Document&&)", "operator=(Document&&)"];

const before = (edited) => ({
  objects: [
    box("doc", "Document", "code", 0.5, 0.02,
      ["char* title_;", ...(edited ? [add("int* pages_;  size_t n_;")] : [])], edited ? "edited" : undefined),
    ...FIVE.map((f, i) => box(`f${i}`, f, "concrete", ...[[0, 0.4], [1, 0.4], [0, 0.97], [0.5, 0.97], [1, 0.97]][i],
      [edited ? "edit: handle pages_ too" : "hand-written"], edited ? "edited" : undefined)),
  ],
  links: FIVE.map((_, i) => ({ from: "doc", to: `f${i}`, kind: "owns" })),
});

export const ruleOfZero = promote(n, {
  before: { source: BEFORE, note: "The problem: raw ownership needs all five special functions." },
  smell: [
    "A business class holding a **raw owning pointer** (`new` in the constructor, `delete` in the destructor).",
    "**Five special functions** written by hand — and a bug in any of them is a leak or a double free.",
    "Every new owned member means **revisiting all five**.",
  ],
  frames: [
    { phase: "Before", note: "Without the rule: Document owns a raw char buffer, so it must write a destructor, two copies and two moves.",
      detail: "Each one must agree with the others. A shallow copy is a double free; a missing destructor is a leak.",
      marks: before(false), metrics: [{ label: "special functions to maintain", value: "5" }] },
    { phase: "Before", note: "Change request: Document also owns a page array. All five functions have to handle the new member, correctly.",
      marks: before(true), metrics: [{ label: "special functions edited", value: "5" }] },
    { phase: "After", note: "With the rule of zero: the members are std::string, std::vector and std::unique_ptr, which manage themselves.",
      detail: "Document declares none of the five. Adding pages was one line: a std::vector member.",
      marks: sceneWith(n, { nu: "active", gen: "active", old: "dim" }), metrics: [{ label: "special functions to maintain", value: "5 → 0" }] },
  ],
});
