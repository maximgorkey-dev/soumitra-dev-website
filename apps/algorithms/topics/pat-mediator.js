/**
 * Mediator. A sign-up form whose widgets enable and disable each other: the
 * rules move out of the widgets and into one dialog object.
 */

import { frame } from "../core/trace.js";
import { OBJECTS, add, printed } from "./pat-common.js";

const BEFORE = `// Before: every widget holds pointers to the others and applies its own
// slice of the form's rules. The rules are spread across three classes.
#include <cstdio>
#include <string>

struct Button {
    bool enabled = true;
    void setEnabled(bool on) {
        if (on != enabled) std::printf("sign up: %s\\n", on ? "enabled" : "disabled");
        enabled = on;
    }
};

struct CodeField {
    Button* button = nullptr;            // knows the button
    bool* promoChecked = nullptr;        // and peeks at the checkbox
    bool enabled = false;
    std::string text;
    void setEnabled(bool on) {
        if (on != enabled) std::printf("code: %s\\n", on ? "enabled" : "disabled");
        enabled = on;
    }
    void type(const std::string& t) { text = t; button->setEnabled(!*promoChecked || !text.empty()); }
};

struct PromoCheckbox {
    CodeField* code = nullptr;           // knows the field
    Button* button = nullptr;            // and the button
    bool checked = false;
    void toggle() {
        checked = !checked;
        code->setEnabled(checked);
        if (!checked) code->text.clear();
        button->setEnabled(!checked || !code->text.empty());   // same rule, written twice
    }
};

int main() {
    Button button;
    CodeField code;
    PromoCheckbox promo;
    code.button = &button;
    code.promoChecked = &promo.checked;
    promo.code = &code;
    promo.button = &button;

    promo.toggle();
    code.type("SAVE10");
    promo.toggle();
}
`;

const AFTER = `// After: widgets only tell the dialog "I changed". The dialog owns every rule
// about how they affect each other, in one function.
#include <cstdio>
#include <string>

class Dialog;

class Widget {
public:
    explicit Widget(Dialog& d) : dialog_(d) {}
    virtual ~Widget() = default;
protected:
    void changed();                      // report to the mediator, nothing else
private:
    Dialog& dialog_;
};

class Toggle : public Widget {
public:
    using Widget::Widget;
    void click() { on_ = !on_; changed(); }
    bool on() const { return on_; }
private:
    bool on_ = false;
};

class TextField : public Widget {
public:
    TextField(Dialog& d, const char* name, bool enabled) : Widget(d), name_(name), enabled_(enabled) {}
    void type(const std::string& t) { text_ = t; changed(); }
    void clear() { text_.clear(); }
    bool empty() const { return text_.empty(); }
    void setEnabled(bool on) {
        if (on != enabled_) std::printf("%s: %s\\n", name_, on ? "enabled" : "disabled");
        enabled_ = on;
    }
private:
    const char* name_;
    bool enabled_;
    std::string text_;
};

class Dialog {
public:
    Toggle promo{*this};
    TextField code{*this, "code", false};
    TextField signUp{*this, "sign up", true};   // a button, modelled as a field for brevity

    void widgetChanged(Widget& w) {            // every rule of the form, in one place
        if (&w == &promo) {
            code.setEnabled(promo.on());
            if (!promo.on()) code.clear();
        }
        signUp.setEnabled(!promo.on() || !code.empty());
    }
};

void Widget::changed() { dialog_.widgetChanged(*this); }

int main() {
    Dialog form;
    form.promo.click();
    form.code.type("SAVE10");
    form.promo.click();
}
`;

const MODERN = `// Modern: widgets expose a plain callback and know nothing about any dialog.
// The form wires the rules up in its constructor, so widgets are reusable
// anywhere and the mediator is just the object that owns the lambdas.
#include <cstdio>
#include <functional>
#include <string>

struct Toggle {
    bool on = false;
    std::function<void()> onChange;
    void click() { on = !on; if (onChange) onChange(); }
};

struct Field {
    const char* name;
    bool enabled;
    std::string text;
    std::function<void()> onChange;
    void type(const std::string& t) { text = t; if (onChange) onChange(); }
    void setEnabled(bool v) {
        if (v != enabled) std::printf("%s: %s\\n", name, v ? "enabled" : "disabled");
        enabled = v;
    }
};

class SignUpForm {
public:
    SignUpForm() {
        promo.onChange = [this] {
            code.setEnabled(promo.on);
            if (!promo.on) code.text.clear();
            update();
        };
        code.onChange = [this] { update(); };
    }
    SignUpForm(const SignUpForm&) = delete;    // the lambdas capture this
    Toggle promo;
    Field code{"code", false, "", nullptr};
    Field signUp{"sign up", true, "", nullptr};
private:
    void update() { signUp.setEnabled(!promo.on || !code.text.empty()); }
};

int main() {
    SignUpForm form;
    form.promo.click();
    form.code.type("SAVE10");
    form.promo.click();
}
`;

/* ---------------------------------------------------------------- */

function beforeScene(edited) {
  const st = edited ? "edited" : "idle";
  return {
    objects: [
      { id: "promo", label: "PromoCheckbox", role: "concrete", x: 0, y: 0.04, state: st,
        lines: ["CodeField* code; Button* button;", "toggle: enable code, update button", ...(edited ? [add("Terms* terms;")] : [])] },
      { id: "code", label: "CodeField", role: "concrete", x: 1, y: 0.04, state: st,
        lines: ["Button* button; bool* promo;", "type: update button", ...(edited ? [add("Terms* terms;")] : [])] },
      { id: "button", label: "Button", role: "concrete", x: 0.5, y: 0.97, lines: ["setEnabled(on)"] },
      ...(edited ? [{ id: "terms", label: "TermsCheckbox", role: "concrete", x: 0.5, y: 0.5, state: "new",
        lines: [add("Button* button; CodeField* code;"), add("PromoCheckbox* promo;")] }] : []),
    ],
    links: [
      { from: "promo", to: "code", kind: "ref" },
      { from: "promo", to: "button", kind: "ref" },
      { from: "code", to: "button", kind: "ref" },
      ...(edited ? [
        { from: "terms", to: "button", kind: "ref" },
        { from: "terms", to: "promo", kind: "ref" },
        { from: "terms", to: "code", kind: "ref" },
      ] : []),
    ],
  };
}

function afterScene(s, { states = {}, msg = null } = {}) {
  const on = (v) => (v ? "enabled" : "disabled");
  return {
    objects: [
      { id: "dialog", label: "Dialog", role: "code", x: 0.5, y: 0.04, state: states.dialog,
        lines: ["widgetChanged(w):", "  code on ⇔ promo checked", "  sign up on ⇔ !promo || code typed"] },
      { id: "promo", label: "Toggle: promo", role: "concrete", x: 0, y: 0.92, state: states.promo,
        lines: [`checked = ${s.promo}`, "click(): changed()"] },
      { id: "code", label: "TextField: code", role: "concrete", x: 0.5, y: 0.92, state: states.code,
        lines: [`${on(s.code)}, text = "${s.text}"`, "type(): changed()"] },
      { id: "signup", label: "Button: sign up", role: "concrete", x: 1, y: 0.92, state: states.signup,
        lines: [on(s.signup)] },
    ],
    links: [
      { from: "dialog", to: "promo", kind: "owns" },
      { from: "dialog", to: "code", kind: "owns" },
      { from: "dialog", to: "signup", kind: "owns" },
    ],
    msg,
  };
}

function* run() {
  yield frame({
    phase: "Before",
    note: "Without the pattern: the widgets hold pointers to each other and each applies part of the form's rules.",
    detail: "The rule \"sign up is enabled unless a promo is ticked with no code\" is written twice — once in the checkbox, once in the field.",
    marks: beforeScene(false),
    metrics: [{ label: "widget-to-widget links", value: "3" }],
  });
  yield frame({
    phase: "Before",
    note: "Change request: a \"terms accepted\" box that must also gate the button. Three classes change, and the links multiply.",
    detail: "With n widgets that react to each other there can be n·(n−1) links. None of these widgets can be reused on another form.",
    marks: beforeScene(true),
    metrics: [{ label: "widget-to-widget links", value: "6" }],
  });

  const s = { promo: false, code: false, text: "", signup: true };
  yield frame({
    phase: "After",
    note: "With Mediator: widgets only report \"I changed\" to the dialog. Every rule lives in Dialog::widgetChanged.",
    detail: "No widget knows any other widget exists. The links all go through one hub.",
    marks: afterScene(s),
    metrics: [{ label: "widget-to-widget links", value: "0" }],
  });

  // 1. tick the promo box
  s.promo = true;
  yield frame({
    phase: "Run",
    note: "The user ticks \"I have a promo code\". The toggle flips itself and calls changed() — that's all it knows to do.",
    marks: afterScene(s, { states: { promo: "active", dialog: "active" }, msg: { from: "promo", to: "dialog", label: "changed()" } }),
  });
  s.code = true;
  yield frame({
    phase: "Run",
    note: "The dialog applies its first rule: the promo is checked, so the code field is enabled.",
    marks: afterScene(s, { states: { dialog: "active", code: "new" }, msg: { from: "dialog", to: "code", label: "setEnabled(true)" } }),
    metrics: [printed("code: enabled")],
  });
  s.signup = false;
  yield frame({
    phase: "Run",
    note: "And its second: a promo is ticked but no code is typed, so sign up is disabled.",
    marks: afterScene(s, { states: { dialog: "active", signup: "edited" }, msg: { from: "dialog", to: "signup", label: "setEnabled(false)" } }),
    metrics: [printed("sign up: disabled")],
  });

  // 2. type a code
  s.text = "SAVE10";
  yield frame({
    phase: "Run",
    note: "The user types SAVE10. The field stores it and reports changed().",
    marks: afterScene(s, { states: { code: "active", dialog: "active" }, msg: { from: "code", to: "dialog", label: "changed()" } }),
  });
  s.signup = true;
  yield frame({
    phase: "Run",
    note: "A code is present now, so the dialog enables sign up.",
    marks: afterScene(s, { states: { dialog: "active", signup: "new" }, msg: { from: "dialog", to: "signup", label: "setEnabled(true)" } }),
    metrics: [printed("sign up: enabled")],
  });

  // 3. untick
  s.promo = false;
  yield frame({
    phase: "Run",
    note: "The user unticks the promo box. Changed() again — the toggle has no idea what that implies.",
    marks: afterScene(s, { states: { promo: "active", dialog: "active" }, msg: { from: "promo", to: "dialog", label: "changed()" } }),
  });
  s.code = false;
  s.text = "";
  yield frame({
    phase: "Run",
    note: "The dialog disables and clears the code field. Sign up stays enabled: no promo means no code is needed.",
    detail: "setEnabled only prints when the state actually changes, so the button is silent here.",
    marks: afterScene(s, { states: { dialog: "active", code: "dim" }, msg: { from: "dialog", to: "code", label: "setEnabled(false)" } }),
    metrics: [printed("code: disabled")],
  });

  yield frame({
    phase: "Done",
    note: "Three user actions, five reactions, and every one of them was decided in a single function.",
    detail: "Adding the terms box now means one new widget and one new line in widgetChanged — no other widget changes.",
    marks: afterScene(s),
    metrics: [{ label: "widget-to-widget links", value: "0" }],
  });
}

export const mediator = {
  id: "pat-mediator",
  section: "Design patterns",
  topic: "Behavioural",
  title: "Mediator",
  blurb: "Objects talk through one coordinator instead of to each other, so they don't need to know each other.",
  structure: OBJECTS,
  run,

  explanation: [
    { tip: "**In one line:** colleagues report events to one hub; the hub holds every rule about how they affect each other." },
    "Forms, games, chat rooms, air traffic control: groups of objects whose behaviour depends on each other. Wire them directly and you get a **web of pointers**, with the rules smeared across every class.",
    { h: "The smell" },
    { list: [
      "Widgets hold **pointers to other widgets**.",
      "The **same rule is written in several places** (here, \"when is sign up enabled?\").",
      "Adding one participant means **editing many classes**, and the links grow towards *n·(n−1)*.",
      "No widget can be **reused** on another form, because each one knows its neighbours.",
    ] },
    { h: "The fix" },
    { list: [
      "Each colleague knows **only the mediator** and tells it `changed()`.",
      "The mediator **decides what happens**: which others to update, and how.",
      "All the interaction rules sit in **one function**, readable in one place.",
      "Colleagues become **reusable**: a toggle is just a toggle.",
    ] },
    { h: "The trap" },
    "The mediator can become a **god object** — every rule of a large screen in one class. Split it by concern (one mediator per panel or feature) before it gets there.",
    { h: "Modern C++" },
    "Give widgets a plain **`std::function` callback** and let the form wire **lambdas** in its constructor. Widgets then don't even know a mediator type exists. Watch lifetimes: lambdas that capture `this` make the form non-copyable and non-movable.",
  ],

  analysis: {
    rows: [
      ["Run-time cost", "One extra call per event, through the hub"],
      ["Use it when", "A group of objects interacts in many-to-many ways and the coupling is getting out of hand"],
      ["Avoid it when", "Two objects talk in one direction — a direct call or an observer is simpler"],
    ],
    notes: [
      "**Observer** is one-to-many broadcast with no rules; Mediator is many-to-many coordination *with* rules. Mediators are often built on observer-style callbacks.",
      "**Facade** also sits in front of several objects, but the objects don't know the facade exists; with Mediator they report to it.",
      "Event buses and message brokers are mediators scaled up: publishers and subscribers know only the bus.",
    ],
  },

  code: {
    lang: "cpp",
    files: [
      { name: "before.cpp", note: "The problem: widgets wired to each other, rules duplicated.", source: BEFORE },
      { name: "mediator.cpp", note: "The classic pattern, which the animation follows.", source: AFTER, traced: true },
      { name: "modern.cpp", note: "Callbacks wired by the form; widgets know nothing about it.", source: MODERN },
    ],
  },
};
