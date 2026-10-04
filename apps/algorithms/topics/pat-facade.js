/**
 * Facade, before and after: callers that drive a video subsystem step by step,
 * then one convert() that does it for them.
 */

import { add, box, promote, sceneWith } from "./pat-common.js";
import { facade as n } from "./pat-structural.js";

const BEFORE = `// Before: every caller drives the subsystem itself, in the right order.
#include <cstdio>
#include <string>

struct Decoder { void decode(const std::string& f) { std::printf("decode %s\\n", f.c_str()); } };
struct Scaler  { void scale(int height) { std::printf("scale to %dp\\n", height); } };
struct Encoder { void encode(const std::string& fmt) { std::printf("encode as %s\\n", fmt.c_str()); } };

// One of several places that convert a video; each repeats the same steps.
std::string uploadHandler(const std::string& file) {
    Decoder d;
    Scaler s;
    Encoder e;
    d.decode(file);
    s.scale(1080);
    e.encode("mp4");
    return file.substr(0, file.rfind('.')) + ".mp4";
}

int main() {
    std::string out = uploadHandler("talk.mov");
    std::printf("done: %s\\n", out.c_str());
}
`;

const before = (edited) => {
  const caller = (id, label, x) => box(id, label, "client", x, 0.02,
    ["decode → scale → encode", ...(edited ? [add("normalise audio")] : [])], edited ? "edited" : undefined);
  return {
    objects: [
      caller("up", "uploadHandler()", 0), caller("batch", "batchJob()", 0.5), caller("cli", "cli convert", 1),
      box("d", "Decoder", "concrete", 0, 0.95), box("s", "Scaler", "concrete", 0.5, 0.95), box("e", "Encoder", "concrete", 1, 0.95),
    ],
    links: ["up", "batch", "cli"].flatMap((c) => ["d", "s", "e"].map((p) => ({ from: c, to: p, kind: "calls" }))),
  };
};

export const facade = promote(n, {
  before: { source: BEFORE, note: "The problem: every caller repeats the subsystem's steps." },
  smell: [
    "The **same sequence of subsystem calls** copied into several callers.",
    "Callers must know the subsystem's **classes, order and settings** to do one simple thing.",
    "A change to the sequence means **editing every caller**.",
  ],
  frames: [
    { phase: "Before", note: "Without the pattern: three callers each create a decoder, scaler and encoder and run them in order.",
      detail: "Each caller is coupled to all three classes, and the sequence is written out three times.",
      marks: before(false), metrics: [{ label: "places edited", value: "0" }] },
    { phase: "Before", note: "Change request: normalise the audio before encoding. All three callers have to change, in the same way.",
      marks: before(true), metrics: [{ label: "places edited", value: "3" }] },
    { phase: "After", note: "With Facade: VideoConverter::convert() holds the sequence. Callers make one call.",
      detail: "The audio step goes into convert(), once. The subsystem classes stay public for callers with unusual needs.",
      marks: sceneWith(n, { f: "edited" }, { f: ["convert(file, format)", "+ normalise audio"] }), metrics: [{ label: "places edited", value: "3 → 1" }] },
  ],
});
