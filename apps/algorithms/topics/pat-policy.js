/**
 * Policy-based design, before and after: a logger that checks run-time flags
 * on every call, then behaviours chosen as template parameters.
 */

import { add, box, promote, sceneWith } from "./pat-common.js";
import { policy as n } from "./pat-modern-notes.js";

const BEFORE = `// Before: the logger's behaviours are run-time flags, checked on every call.
#include <cstdio>
#include <string>

enum class Sink { Console, Null };

struct Logger {
    bool timestamp;
    Sink sink;
    void log(const std::string& msg) const {
        std::string s = timestamp ? "[12:00] " + msg : msg;   // decided again on every call
        if (sink == Sink::Console) std::puts(s.c_str());      // a file sink edits this function
    }
};

int main() {
    Logger{false, Sink::Console}.log("boot");
    Logger{true, Sink::Console}.log("boot");
    Logger{false, Sink::Null}.log("boot");
    std::puts("(null sink: nothing printed)");
}
`;

const before = (edited) => ({
  objects: [
    box("caller", "main()", "client", 0.5, 0.02, ["Logger{false, Console}.log(…)"]),
    box("log", "Logger", "code", 0.5, 0.95,
      ["bool timestamp;  Sink sink;", "log(msg):", "  if (timestamp) prefix", "  if (sink == Console) puts",
        ...(edited ? [add("  else if (sink == File) fwrite")] : [])],
      edited ? "edited" : undefined),
  ],
  links: [{ from: "caller", to: "log", kind: "calls" }],
});

export const policy = promote(n, {
  before: { source: BEFORE, note: "The problem: behaviour flags tested at run time, inside one class." },
  smell: [
    "A class configured by **flags or enums** that it tests **on every call**, though they never change after construction.",
    "Each new behaviour is **another branch** inside the same function.",
    "Unused behaviours still cost a **check at run time** and code in the binary.",
  ],
  frames: [
    { phase: "Before", note: "Without the idiom: Logger stores a timestamp flag and a sink enum, and log() tests both every time.",
      detail: "The flags are fixed when the logger is made, but the cost and the branches are paid on every message.",
      marks: before(false), metrics: [{ label: "places edited", value: "0" }] },
    { phase: "Before", note: "Change request: a file sink. log() grows another branch, and every logger carries it.",
      marks: before(true), metrics: [{ label: "places edited", value: "log() itself" }] },
    { phase: "After", note: "With policies: Logger<Format, Sink> takes each behaviour as a template parameter and calls it directly.",
      detail: "A file sink is a new four-line File policy; Logger isn't edited. Each combination is compiled with no branches at all.",
      marks: sceneWith(n, { host: "active" }), metrics: [{ label: "places edited", value: "log() → a new policy" }] },
  ],
});
