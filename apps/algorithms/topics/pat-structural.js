/**
 * Structural patterns, one page each: Facade. Adapter and Bridge have their
 * own before/after topics.
 */

import { note } from "./pat-common.js";

const cpp = (name, source, noteText = "A complete program; the steps above follow its output.") =>
  ({ lang: "cpp", files: [{ name, note: noteText, source, traced: true }] });

/* ------------------------------------------------------------------ */

export const facade = note({
  id: "pat-facade",
  topic: "Structural",
  title: "Facade",
  blurb: "Give a complicated subsystem one simple entry point for the common case.",
  scene: {
    objects: [
      { id: "client", label: "main()", role: "client", x: 0.5, y: 0.04, lines: ['convert("talk.mov", "mp4")'] },
      { id: "f", label: "VideoConverter", role: "code", x: 0.5, y: 0.45, lines: ["convert(file, format)"] },
      { id: "d", label: "Decoder", role: "concrete", x: 0, y: 0.95, lines: ["open, decode frames"] },
      { id: "s", label: "Scaler", role: "concrete", x: 0.5, y: 0.95, lines: ["resize, colour space"] },
      { id: "e", label: "Encoder", role: "concrete", x: 1, y: 0.95, lines: ["codec, bitrate, mux"] },
    ],
    links: [
      { from: "client", to: "f", kind: "calls" },
      { from: "f", to: "d", kind: "calls" }, { from: "f", to: "s", kind: "calls" }, { from: "f", to: "e", kind: "calls" },
    ],
  },
  steps: [
    { note: "The client wants one thing: convert a file. It calls one method on the facade.",
      detail: "Without the facade, every caller would need to know the three subsystems, their order, and their configuration.",
      states: { client: "active", f: "active" }, msg: { from: "client", to: "f", label: "convert()" } },
    { note: "The facade drives the subsystems in the right order: decode…",
      states: { f: "active", d: "active" }, msg: { from: "f", to: "d", label: "decode" }, printed: ["decode talk.mov"] },
    { note: "…scale…", states: { f: "active", s: "active" }, msg: { from: "f", to: "s", label: "scale" }, printed: ["scale to 1080p"] },
    { note: "…and encode.", states: { f: "active", e: "active" }, msg: { from: "f", to: "e", label: "encode" }, printed: ["encode as mp4"] },
    { note: "The subsystems are still public. Callers with unusual needs can use them directly; the facade covers the common path.",
      states: { client: "active" }, printed: ["done: talk.mp4"] },
  ],
  explanation: [
    { tip: "**In one line:** one class with a few high-level methods that orchestrate a complicated set of lower-level classes." },
    "Large subsystems — media codecs, compilers, cloud SDKs — expose dozens of classes because they must support every use. Most callers need one or two common operations. A Facade **packages the common path**.",
    { h: "How it works" },
    { list: [
      "The facade **knows the subsystem**: which classes, in which order, with which settings.",
      "Clients **know only the facade**, so they are decoupled from the subsystem's internals.",
      "The subsystem stays **available** for advanced use — a facade adds a door, it doesn't wall anything off.",
    ] },
    { h: "Watch out for" },
    "Facades attract features until they become a **god class** that does everything. Keep a facade to the common cases, and add a second facade for a different audience rather than growing one forever.",
  ],
  analysis: {
    rows: [
      ["Use it when", "A subsystem is complex and most callers need the same few operations"],
      ["Avoid it when", "It would only forward one call to one class — that's an extra layer for nothing"],
      ["Related", "Adapter changes an interface; Facade simplifies many; Mediator coordinates peers that know it"],
    ],
    notes: [
      "A library's top-level free functions (`std::filesystem::copy`) often act as facades over more detailed APIs.",
      "Facades are a natural place for a stable API boundary while internals change.",
    ],
  },
  code: cpp("facade.cpp", `#include <cstdio>
#include <string>

// A subsystem with several parts, each with its own detailed API.
struct Decoder { void decode(const std::string& f) { std::printf("decode %s\\n", f.c_str()); } };
struct Scaler  { void scale(int height) { std::printf("scale to %dp\\n", height); } };
struct Encoder { void encode(const std::string& fmt) { std::printf("encode as %s\\n", fmt.c_str()); } };

// The facade: one call for the common case.
class VideoConverter {
public:
    std::string convert(const std::string& file, const std::string& format) {
        decoder_.decode(file);
        scaler_.scale(1080);
        encoder_.encode(format);
        return file.substr(0, file.rfind('.')) + "." + format;
    }
private:
    Decoder decoder_;
    Scaler scaler_;
    Encoder encoder_;
};

int main() {
    VideoConverter converter;
    std::string out = converter.convert("talk.mov", "mp4");
    std::printf("done: %s\\n", out.c_str());
}
`),
});
