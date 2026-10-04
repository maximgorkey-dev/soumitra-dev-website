/**
 * Objects-view frames from a program's own run.
 *
 * A listing that includes server/cc/pattrace.hpp writes one event line per
 * TRACE_NEW / TRACE_CALL / TRACE_DEL, each starting with the ASCII record
 * separator, interleaved with what the program prints:
 *
 *   \x1e{"ev":"new","id":"0x55d0…","to":"","label":"Card"}
 *   \x1e{"ev":"call","id":"0x55d0…","to":"0x55d1…","label":"pay(510)"}
 *   charge card 510
 *
 * Every event becomes one frame, and the printed lines that follow it are
 * that frame's "printed" metrics, as in the hand-written animations.
 */

import { frame } from "./trace.js";

export const EVENT_MARK = "\x1e";
const MAX_EVENTS = 400;
const MAX_BOXES = 16;

/** Split stdout into ordered items: { event } or { line }. */
export function splitOutput(stdout) {
  const items = [];
  const lines = (stdout || "").replace(/\n$/, "").split("\n");
  if (lines.length === 1 && lines[0] === "") return items;
  for (const line of lines) {
    if (line.startsWith(EVENT_MARK)) {
      try {
        const e = JSON.parse(line.slice(1));
        if (e && typeof e.ev === "string") items.push({ event: e });
      } catch {
        // A truncated last line (output cap, crash) is dropped, not shown as text.
      }
    } else {
      items.push({ line });
    }
  }
  return items;
}

/** What the program printed, without the event lines. */
export const printedLines = (items) => items.filter((i) => "line" in i).map((i) => i.line);

/** Pointer keys look like 0x…; anything else ("main") is a named caller. */
const isPointer = (k) => /^0x[0-9a-f]+$/i.test(k) || k === "(nil)";

/**
 * Build frames from the items. Returns { frames, events, boxes } and is empty
 * when the program emitted no events.
 */
export function framesFromRun(items) {
  const events = items.filter((i) => i.event).slice(0, MAX_EVENTS);
  if (!events.length) return { frames: [], events: 0, boxes: 0 };

  // Boxes are per object lifetime: an address reused after a delete is a new box.
  const boxes = [];                 // { id, label, role, born, died }
  const live = new Map();           // key → box
  const boxFor = (key, label, step) => {
    let b = live.get(key);
    if (!b) {
      if (boxes.length >= MAX_BOXES) return null;
      b = { id: `b${boxes.length}`, label: label || (isPointer(key) ? "object" : key),
            role: isPointer(key) ? "concrete" : "client", born: step, died: Infinity };
      boxes.push(b);
      live.set(key, b);
    }
    return b;
  };

  // First pass: who exists when, so positions can be fixed for the whole run.
  const steps = [];
  let s = 0;
  for (const it of items) {
    if (!it.event) {
      if (steps.length) steps[steps.length - 1].printed.push(it.line);
      else steps.push({ e: null, printed: [it.line] });
      continue;
    }
    if (s >= MAX_EVENTS) break;
    const e = it.event;
    const id = String(e.id ?? "");
    const step = { e, printed: [] };
    if (e.ev === "new") {
      const old = live.get(id);
      if (old) { old.died = steps.length; live.delete(id); }
      step.a = boxFor(id, String(e.label || ""), steps.length);
    } else if (e.ev === "call") {
      step.a = boxFor(id, "", steps.length);
      step.b = boxFor(String(e.to ?? ""), "", steps.length);
    } else if (e.ev === "del") {
      step.a = live.get(id) || null;
      if (step.a) { step.a.died = steps.length; live.delete(id); }
    }
    steps.push(step);
    s++;
  }

  // Named callers along the top; objects in rows of up to four below.
  const clients = boxes.filter((b) => b.role === "client");
  const objects = boxes.filter((b) => b.role !== "client");
  const spread = (i, n) => (n <= 1 ? 0.5 : i / (n - 1));
  const pos = new Map();
  clients.forEach((b, i) => pos.set(b.id, { x: spread(i, clients.length), y: 0.02 }));
  const rows = Math.ceil(objects.length / 4) || 1;
  objects.forEach((b, i) => {
    const r = Math.floor(i / 4);
    const inRow = Math.min(4, objects.length - r * 4);
    const y = clients.length ? 0.45 + (rows === 1 ? 0.5 : (r / (rows - 1)) * 0.52) : (rows === 1 ? 0.5 : r / (rows - 1));
    pos.set(b.id, { x: spread(i % 4, inRow), y });
  });

  const lastCall = new Map();       // box id → last message it received
  const links = new Map();          // "from>to" → link
  const frames = [];
  steps.forEach((st, i) => {
    const states = {};
    let note = "The program starts.";
    let msg = null;
    const e = st.e;
    if (e?.ev === "new" && st.a) {
      states[st.a.id] = "new";
      note = `A ${st.a.label} is created.`;
    } else if (e?.ev === "call" && st.a && st.b) {
      const label = String(e.label || "call");
      states[st.a.id] = "active";
      states[st.b.id] = st.a === st.b ? "active" : "dispatch";
      if (st.a !== st.b) {
        msg = { from: st.a.id, to: st.b.id, label };
        links.set(`${st.a.id}>${st.b.id}`, { from: st.a.id, to: st.b.id, kind: "calls" });
      }
      lastCall.set(st.b.id, label);
      note = st.a === st.b ? `${st.a.label} calls its own ${label}.` : `${st.a.label} calls ${label} on ${st.b.label}.`;
    } else if (e?.ev === "del" && st.a) {
      note = `The ${st.a.label} is destroyed.`;
    } else if (e?.ev === "del") {
      note = "An object that was never traced is destroyed.";
    } else if (e) {
      note = `An event the app doesn't know (${String(e.ev).slice(0, 20)}), or one past the ${MAX_BOXES}-box limit.`;
    }

    const shown = boxes.filter((b) => b.born <= i);
    const ids = new Set(shown.map((b) => b.id));
    frames.push(frame({
      phase: "Your run",
      note,
      detail: i === 0 ? "Built from the TRACE_ events your program wrote. Each event is one step." : "",
      marks: {
        objects: shown.map((b) => ({
          id: b.id, label: b.label, role: b.role, ...pos.get(b.id),
          state: states[b.id] || (b.died <= i ? "dim" : "idle"),
          lines: [b.died <= i ? "destroyed" : lastCall.has(b.id) ? `last: ${lastCall.get(b.id)}` : "—"],
        })),
        links: [...links.values()].filter((l) => ids.has(l.from) && ids.has(l.to)),
        msg,
      },
      metrics: st.printed.map((value) => ({ label: "printed", value })),
    }));
  });

  return { frames, events: events.length, boxes: boxes.length };
}
