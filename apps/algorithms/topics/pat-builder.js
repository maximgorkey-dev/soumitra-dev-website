/**
 * Builder. An HTTP request with several optional settings: a positional
 * constructor nobody can read, then a builder that names each option.
 */

import { frame } from "../core/trace.js";
import { OBJECTS, add, printed } from "./pat-common.js";

const BEFORE = `// Before: one constructor with every option, in a fixed order.
#include <cstdio>
#include <string>
#include <utility>
#include <vector>

class Request {
public:
    Request(std::string url, std::vector<std::string> headers, int timeout, bool redirects, bool compress)
        : url_(std::move(url)), headers_(std::move(headers)), timeout_(timeout),
          redirects_(redirects), compress_(compress) {}
    void describe() const {
        std::printf("GET %s (%zu headers, timeout %ds%s%s)\\n", url_.c_str(), headers_.size(), timeout_,
                    redirects_ ? ", redirects" : "", compress_ ? ", gzip" : "");
    }
private:
    std::string url_;
    std::vector<std::string> headers_;
    int timeout_;
    bool redirects_, compress_;
};

int main() {
    // Which bool is which? Adding a "retries" option changes every call like this one.
    Request r("https://example.com", {"Accept: text/html", "Authorization: token"}, 5, true, false);
    r.describe();
}
`;

const AFTER = `// After: a builder names each option; build() makes the finished, immutable request.
#include <cstdio>
#include <string>
#include <utility>
#include <vector>

class Request {
public:
    class Builder;
    static Builder to(std::string url);

    void describe() const {
        std::printf("GET %s (%zu headers, timeout %ds)\\n", url_.c_str(), headers_.size(), timeout_);
    }

private:
    Request(std::string url, std::vector<std::string> headers, int timeout)
        : url_(std::move(url)), headers_(std::move(headers)), timeout_(timeout) {}
    std::string url_;
    std::vector<std::string> headers_;
    int timeout_;
};

class Request::Builder {
public:
    explicit Builder(std::string url) : url_(std::move(url)) {}
    Builder& header(std::string h) { headers_.push_back(std::move(h)); return *this; }
    Builder& timeout(int seconds) { timeout_ = seconds; return *this; }
    Request build() const { return Request(url_, headers_, timeout_ > 0 ? timeout_ : 30); }
private:
    std::string url_;
    std::vector<std::string> headers_;
    int timeout_ = 30;
};

Request::Builder Request::to(std::string url) { return Builder(std::move(url)); }

int main() {
    Request r = Request::to("https://example.com")
                    .header("Accept: text/html")
                    .header("Authorization: token")
                    .timeout(5)
                    .build();
    r.describe();
}
`;

const MODERN = `// C++20: for plain data with defaults, designated initialisers often replace a builder.
#include <cstdio>
#include <string>
#include <vector>

struct Options {
    std::string url;
    std::vector<std::string> headers = {};
    int timeout = 30;
};

int main() {
    Options o{.url = "https://example.org", .timeout = 10};    // named, the rest defaulted
    std::printf("GET %s (%zu headers, timeout %ds)\\n", o.url.c_str(), o.headers.size(), o.timeout);
}
`;

/* ---------------------------------------------------------------- */

function beforeScene(edited) {
  return {
    objects: [
      { id: "call", label: "main()", role: "client", x: 0.5, y: 0.04, state: edited ? "edited" : "idle",
        lines: ['Request r("https://…",', "  {…, …}, 5, true, false" + (edited ? "" : ");"), ...(edited ? [add("  , 3);  // retries")] : [])] },
      { id: "req", label: "Request", role: "code", x: 0.5, y: 0.95, state: edited ? "edited" : "idle",
        lines: ["Request(url, headers, timeout,", "        redirects, compress" + (edited ? "," : ")"), ...(edited ? [add("        retries)")] : [])] },
    ],
    links: [{ from: "call", to: "req", kind: "calls" }],
  };
}

const URL = '"https://example.com"';

function afterScene({ states = {}, msg = null, fields = null, built = false, edited = false } = {}) {
  return {
    objects: [
      { id: "client", label: "main()", role: "client", x: 0, y: 0.04, state: states.client || (edited ? "dim" : undefined),
        lines: ["Request::to(url)", "  .header(…).header(…)", "  .timeout(5)", "  .build()"] },
      { id: "b", label: "Request::Builder", role: "code", x: 1, y: 0.04, state: states.b || (edited ? "edited" : undefined),
        lines: fields || ["url_", "headers_ = {}", "timeout_ = 30", ...(edited ? [add("retries_ = 0;  retries(n)")] : [])] },
      ...(built ? [{ id: "r", label: "Request", role: "concrete", x: 0.5, y: 0.95, state: states.r,
        lines: [`url ${URL}`, "2 headers", "timeout 5s", "// private ctor, no setters"] }] : []),
    ],
    links: [
      { from: "client", to: "b", kind: "calls" },
      ...(built ? [{ from: "b", to: "r", kind: "calls" }] : []),
    ],
    msg,
  };
}

function* run() {
  yield frame({
    phase: "Before",
    note: "Without the pattern: Request takes every option in one constructor, in a fixed order.",
    detail: "At the call site, 5, true, false says nothing. Swap the two bools by mistake and it still compiles.",
    marks: beforeScene(false),
    metrics: [{ label: "places edited", value: "0" }],
  });
  yield frame({
    phase: "Before",
    note: "Change request: add a retries option. The constructor changes, and so does every call — even those that don't care about retries.",
    detail: "Default arguments help only for the last parameters. Options in the middle still have to be spelled out.",
    marks: beforeScene(true),
    metrics: [{ label: "places edited", value: "every caller" }],
  });
  yield frame({
    phase: "After",
    note: "With Builder: Request::Builder has one method per option, each with a default. A new option is one field and one method.",
    detail: "Callers that don't need retries don't change. The Request itself has a private constructor, so it can only come from build().",
    marks: afterScene({ edited: true }),
    metrics: [{ label: "places edited", value: "every caller → 1" }],
  });

  yield frame({
    phase: "Run",
    note: "Request::to(url) starts a builder holding the one required field. Everything else starts at its default.",
    marks: afterScene({ states: { client: "active", b: "new" }, fields: [`url_ = ${URL}`, "headers_ = {}", "timeout_ = 30"],
      msg: { from: "client", to: "b", label: "to(url)" } }),
    metrics: [],
  });
  yield frame({
    phase: "Run",
    note: "Each .header(…) adds one header and returns the builder itself, so the next call chains onto it.",
    marks: afterScene({ states: { client: "active", b: "active" }, fields: [`url_ = ${URL}`, "headers_ = {Accept, Auth}", "timeout_ = 30"],
      msg: { from: "client", to: "b", label: ".header() .header()" } }),
    metrics: [],
  });
  yield frame({
    phase: "Run",
    note: ".timeout(5) overrides one default and leaves the rest alone.",
    marks: afterScene({ states: { client: "active", b: "active" }, fields: [`url_ = ${URL}`, "headers_ = {Accept, Auth}", "timeout_ = 5"],
      msg: { from: "client", to: "b", label: ".timeout(5)" } }),
    metrics: [],
  });
  yield frame({
    phase: "Run",
    note: ".build() checks the settings and makes the finished Request. A half-configured Request can never exist.",
    detail: "build() is the one place for validation: here a timeout of zero or less falls back to 30 seconds.",
    marks: afterScene({ built: true, states: { b: "active", r: "new" }, fields: [`url_ = ${URL}`, "headers_ = {Accept, Auth}", "timeout_ = 5"],
      msg: { from: "b", to: "r", label: "build()" } }),
    metrics: [printed("GET https://example.com (2 headers, timeout 5s)")],
  });
  yield frame({
    phase: "Done",
    note: "Every option is named at the call site, unneeded ones are left out, and the result can't be changed afterwards.",
    detail: "For plain data with no validation, C++20 designated initialisers do the same job with no builder at all — see modern.cpp.",
    marks: afterScene({ built: true, fields: [`url_ = ${URL}`, "headers_ = {Accept, Auth}", "timeout_ = 5"] }),
    metrics: [{ label: "options named at the call site", value: "3 of 3" }],
  });
}

export const builder = {
  id: "pat-builder",
  section: "Design patterns",
  topic: "Creational",
  title: "Builder",
  blurb: "Assemble a complex object step by step through a readable chain of calls, instead of one constructor with many parameters.",
  structure: OBJECTS,
  run,

  explanation: [
    { tip: "**In one line:** a helper object with one method per option, each returning itself, and a final `build()` that produces the finished object." },
    "Constructors with many parameters are **unreadable** at the call site and **brittle** when options are added. Builder names each option and lets you set only the ones you care about.",
    { h: "The smell" },
    { list: [
      "Constructors with **long parameter lists**, especially several `bool`s in a row.",
      "**Telescoping constructors**: one overload per combination of options.",
      "Objects created half-configured and **fixed up with setters** afterwards, so they can be seen in an invalid state.",
    ] },
    { h: "How it works" },
    { list: [
      "A **`Builder`** holds the fields, with **defaults**.",
      "Each setter **returns `*this`**, so calls chain into a sentence.",
      "**`build()`** checks the combination is valid and returns the finished, often **immutable**, object.",
    ] },
    { h: "Modern C++" },
    { list: [
      "**Designated initialisers** (C++20): `Request{.url = \"…\", .timeout = 10}` — named, defaulted, no builder. Use them for plain aggregates.",
      "Keep Builder when construction needs **validation**, **computed fields**, or the result should be **immutable** with private members.",
      "Setters can be `&&`-qualified (`Builder&& header(...) &&`) so a builder is consumed by `build()` and can't be reused by accident.",
    ] },
  ],

  analysis: {
    rows: [
      ["Use it when", "Many optional parameters, invariants to check, or an immutable result"],
      ["Avoid it when", "A few fields with defaults — designated initialisers say the same thing in one line"],
      ["Related", "Abstract Factory creates families in one call; Builder creates one complex object in many"],
    ],
    notes: [
      "The GoF version also has a *Director* that runs a fixed sequence of builder steps — useful when the same recipe builds different representations (an HTML and a PDF document).",
      "Fluent interfaces are easy to over-use: if the chain has one or two calls, a constructor is clearer.",
    ],
  },

  code: {
    lang: "cpp",
    files: [
      { name: "before.cpp", note: "The problem: one constructor with every option, in order.", source: BEFORE },
      { name: "builder.cpp", note: "The classic pattern, which the animation follows.", source: AFTER, traced: true },
      { name: "modern.cpp", note: "The C++20 alternative for plain data: designated initialisers.", source: MODERN },
    ],
  },
};
