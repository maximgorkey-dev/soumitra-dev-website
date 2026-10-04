/**
 * Factory Method, before and after: a dialog that switches on the platform to
 * pick its button, then one virtual createButton() per dialog subclass.
 */

import { add, box, promote, sceneWith } from "./pat-common.js";
import { factoryMethod as n } from "./pat-creational.js";

const BEFORE = `// Before: the dialog picks the concrete button itself, with a switch on the platform.
#include <cstdio>
#include <memory>

enum class Platform { Win, Mac };

struct Button {
    virtual ~Button() = default;
    virtual void draw() const = 0;
};
struct WinButton : Button { void draw() const override { std::printf("draw a Windows button\\n"); } };
struct MacButton : Button { void draw() const override { std::printf("draw a macOS button\\n"); } };

class Dialog {
public:
    explicit Dialog(Platform p) : p_(p) {}
    void render() const {
        std::unique_ptr<Button> b;
        switch (p_) {                  // every new platform edits this class
            case Platform::Win: b = std::make_unique<WinButton>(); break;
            case Platform::Mac: b = std::make_unique<MacButton>(); break;
        }
        b->draw();
    }
private:
    Platform p_;
};

int main() {
    Dialog(Platform::Win).render();
    Dialog(Platform::Mac).render();
}
`;

const before = (edited) => ({
  objects: [
    box("dialog", "Dialog", "code", 0.5, 0.02,
      ["render():", "  switch (platform)", "    Win → new WinButton", "    Mac → new MacButton", ...(edited ? [add("    Linux → new GtkButton")] : []), "  b->draw()"],
      edited ? "edited" : undefined),
    box("wb", "WinButton", "concrete", 0, 0.95),
    box("mb", "MacButton", "concrete", edited ? 0.5 : 1, 0.95),
    ...(edited ? [box("gb", "GtkButton", "concrete", 1, 0.95, [], "new")] : []),
  ],
  links: ["wb", "mb", ...(edited ? ["gb"] : [])].map((id) => ({ from: "dialog", to: id, kind: "calls" })),
});

export const factoryMethod = promote(n, {
  before: { source: BEFORE, note: "The problem: the dialog names every concrete button." },
  smell: [
    "A class that **names concrete types** it creates, usually in a `switch` or `if` chain.",
    "The class's real job (`render()`) is mixed up with **choosing what to build**.",
    "Every new variant **edits the class**, which is shared by all the others.",
  ],
  frames: [
    { phase: "Before", note: "Without the pattern: Dialog::render() switches on the platform and constructs the button itself.",
      detail: "The rendering logic and the choice of button class are tangled in one function.",
      marks: before(false), metrics: [{ label: "places edited", value: "0" }] },
    { phase: "Before", note: "Change request: support Linux. Dialog gains a new case — the shared class every platform depends on is edited again.",
      marks: before(true), metrics: [{ label: "places edited", value: "1 shared class" }] },
    { phase: "After", note: "With Factory Method: render() calls a virtual createButton(), and each Dialog subclass overrides it to pick its button.",
      detail: "Linux is a new LinuxDialog subclass with its own createButton(). Dialog itself is never edited again.",
      marks: sceneWith(n, { wd: "new", md: "new", dialog: "active" }), metrics: [{ label: "places edited", value: "shared class → new subclass" }] },
  ],
});
