/**
 * NVI, before and after: public virtuals where each override must repeat the
 * checks, then a non-virtual save() around a private doSave().
 */

import { add, box, promote, sceneWith } from "./pat-common.js";
import { nvi as n } from "./pat-modern-notes.js";

const BEFORE = `// Before: save() is public and virtual, so every override must repeat the checks itself.
#include <cstdio>
#include <string>

class Storage {
public:
    virtual ~Storage() = default;
    virtual void save(const std::string& key, const std::string& value) = 0;
};

class FileStorage : public Storage {
public:
    void save(const std::string& key, const std::string& value) override {
        std::printf("check key: %s\\n", key.c_str());
        std::printf("write %s=%s to file\\n", key.c_str(), value.c_str());
        std::printf("saved %s\\n", key.c_str());
    }
};

class CloudStorage : public Storage {
public:
    void save(const std::string& key, const std::string& value) override {
        std::printf("upload %s=%s\\n", key.c_str(), value.c_str());   // no check, no log: forgotten
    }
};

int main() {
    FileStorage file;
    Storage& store = file;
    store.save("k", "v");
}
`;

const before = (edited) => ({
  objects: [
    box("client", "Caller", "client", 0, 0.02, ['store.save("k", "v")']),
    box("base", "Storage", "interface", 1, 0.02, ["public: virtual save(k, v) = 0"]),
    box("file", "FileStorage", "concrete", 0, 0.95,
      ["save(): check, write, log", ...(edited ? [add("lock / unlock")] : [])], edited ? "edited" : undefined),
    box("cloud", "CloudStorage", "concrete", 1, 0.95,
      ["save(): upload", "// forgot check and log", ...(edited ? [add("lock / unlock")] : [])], "edited"),
  ],
  links: [
    { from: "client", to: "base", kind: "calls" },
    { from: "file", to: "base", kind: "implements" },
    { from: "cloud", to: "base", kind: "implements" },
  ],
});

export const nvi = promote(n, {
  before: { source: BEFORE, note: "The problem: each override repeats, or forgets, the checks." },
  smell: [
    "**Public virtual** functions whose every override starts with the same checks and ends with the same logging.",
    "One override that **forgets** them, found only when its path fails.",
    "A rule for every call (locking, timing) that must be **added to every subclass**.",
  ],
  frames: [
    { phase: "Before", note: "Without the idiom: save() is public and virtual, so each subclass writes the whole thing, checks included.",
      detail: "CloudStorage has already forgotten the key check and the log line. Nothing in the base class can stop it.",
      marks: before(false), metrics: [{ label: "places edited", value: "0" }] },
    { phase: "Before", note: "Change request: lock around every save. Each subclass has to add it, and the next new one has to remember.",
      marks: before(true), metrics: [{ label: "places edited", value: "every subclass" }] },
    { phase: "After", note: "With NVI: the public save() is non-virtual and does the checks, logging and locking. Subclasses override only the private doSave().",
      detail: "The lock is added once, in Storage::save(). No subclass can skip it.",
      marks: sceneWith(n, { base: "edited" }, { base: ["public:  save(k, v)  // non-virtual", "  check, lock, doSave(), log", "private: virtual doSave() = 0"] }),
      metrics: [{ label: "places edited", value: "every subclass → 1" }] },
  ],
});
