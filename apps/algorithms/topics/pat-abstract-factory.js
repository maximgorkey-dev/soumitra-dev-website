/**
 * Abstract Factory, before and after: a UI that checks the platform for each
 * widget, then one factory object per family.
 */

import { add, box, promote, sceneWith } from "./pat-common.js";
import { abstractFactory as n } from "./pat-creational.js";

const BEFORE = `// Before: every widget is chosen separately, so nothing stops two families mixing.
#include <cstdio>

enum class Platform { Win, Mac };

struct WinButton   { void paint() const { std::printf("[Windows] button\\n"); } };
struct WinCheckbox { void paint() const { std::printf("[Windows] checkbox\\n"); } };
struct MacButton   { void paint() const { std::printf("[macOS] button\\n"); } };
struct MacCheckbox { void paint() const { std::printf("[macOS] checkbox\\n"); } };

void buildUi(Platform p) {
    if (p == Platform::Win) WinButton{}.paint();   else MacButton{}.paint();
    if (p == Platform::Win) WinCheckbox{}.paint(); else MacCheckbox{}.paint();
    // One wrong branch here gives a Windows button next to a macOS checkbox.
}

int main() {
    buildUi(Platform::Win);
    buildUi(Platform::Mac);
}
`;

const before = (edited) => ({
  objects: [
    box("ui", "buildUi(platform)", "code", 0.5, 0.02,
      ["if Win: WinButton else MacButton", "if Win: WinCheckbox else MacCheckbox",
        ...(edited ? [add("Linux branch in each if"), add("a slider: a third if")] : [])],
      edited ? "edited" : undefined),
    box("wb", "WinButton", "concrete", 0, 0.95),
    box("wc", "WinCheckbox", "concrete", 0.33, 0.95),
    box("mb", "MacButton", "concrete", 0.66, 0.95),
    box("mc", "MacCheckbox", "concrete", 1, 0.95),
  ],
  links: ["wb", "wc", "mb", "mc"].map((id) => ({ from: "ui", to: id, kind: "calls" })),
});

export const abstractFactory = promote(n, {
  before: { source: BEFORE, note: "The problem: each widget checks the platform on its own." },
  smell: [
    "The same **platform (or backend) check** repeated for every object created.",
    "Nothing in the types stops a **mixed family** — a Windows button beside a macOS checkbox.",
    "A new family means **editing every check**.",
  ],
  frames: [
    { phase: "Before", note: "Without the pattern: buildUi() checks the platform once per widget and constructs each one itself.",
      detail: "The products must match, but only the programmer's care keeps them matching.",
      marks: before(false), metrics: [{ label: "platform checks", value: "2" }] },
    { phase: "Before", note: "Change request: add Linux. Every check grows a branch — and each is a fresh chance to mix families.",
      marks: before(true), metrics: [{ label: "platform checks", value: "2, each edited" }] },
    { phase: "After", note: "With Abstract Factory: buildUi() takes one GuiFactory and asks it for every widget. The family is chosen once, by choosing the factory.",
      detail: "Linux is one new LinuxFactory class. buildUi() is untouched, and can't mix families because it never chooses.",
      marks: sceneWith(n, { app: "active", gf: "dispatch" }), metrics: [{ label: "platform checks", value: "2 → 0 (one choice in main)" }] },
  ],
});
