/**
 * PIMPL, before and after: private members in the header recompile every
 * client, then the members move behind a pointer into the .cpp.
 */

import { add, box, promote, sceneWith } from "./pat-common.js";
import { pimpl as n } from "./pat-modern-notes.js";

const BEFORE = `// Before: the private members live in the header, so changing them rebuilds every client.
#include <cstdio>
#include <string>
#include <utility>

// ---- widget.h: included by every client ------------------------------
class Widget {
public:
    explicit Widget(std::string name) : name_(std::move(name)) {}
    void draw() const { std::printf("draw %s (clicks: %d)\\n", name_.c_str(), clicks_); }
private:
    std::string name_;      // add a member here and every file that includes widget.h rebuilds
    int clicks_ = 0;
};

// ---- client.cpp --------------------------------------------------------
int main() {
    Widget w("button");
    w.draw();
}
`;

const before = (edited) => ({
  objects: [
    box("hdr", "widget.h", "interface", 0.5, 0.02,
      ["class Widget {", "  std::string name_;", "  int clicks_;", ...(edited ? [add("  Theme theme_;  #include <theme.h>")] : []), "};"],
      edited ? "edited" : undefined),
    ...["a.cpp", "b.cpp", "c.cpp"].map((f, i) =>
      box(`c${i}`, f, "client", i / 2, 0.95, [edited ? "recompiles" : '#include "widget.h"'], edited ? "edited" : undefined)),
  ],
  links: [0, 1, 2].map((i) => ({ from: `c${i}`, to: "hdr", kind: "uses" })),
});

export const pimpl = promote(n, {
  before: { source: BEFORE, note: "The problem: private members in the header." },
  smell: [
    "A widely included header that **changes whenever a private member does**.",
    "Headers that **include heavy libraries** only because a private member needs them.",
    "A shared library whose **ABI breaks** each time a class gains a field.",
  ],
  frames: [
    { phase: "Before", note: "Without the idiom: Widget's private members are in widget.h, which three source files include.",
      detail: "Clients can't use the private members, but they still depend on them: the size and layout of Widget are in the header.",
      marks: before(false), metrics: [{ label: "files recompiled", value: "0" }] },
    { phase: "Before", note: "Change request: give Widget a theme. One private member is added, and every client recompiles.",
      detail: "The header now also includes theme.h, so every client includes it too.",
      marks: before(true), metrics: [{ label: "files recompiled", value: "3 clients" }] },
    { phase: "After", note: "With PIMPL: the header holds only a pointer to Widget::Impl, which is defined in widget.cpp.",
      detail: "The theme is added to Impl. widget.h is unchanged, so only widget.cpp recompiles.",
      marks: sceneWith(n, { impl: "edited" }, { impl: ["std::string name;", "int clicks;", "Theme theme;   // new", "#include <theme.h>"] }),
      metrics: [{ label: "files recompiled", value: "3 → 1 (widget.cpp)" }] },
  ],
});
