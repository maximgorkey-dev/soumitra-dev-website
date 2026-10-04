/**
 * Shared vocabulary for design-pattern topics.
 *
 * Objects view (views/objects.js), used by behavioural and structural patterns:
 *   marks.objects  [{ id, label, stereo?, lines: [string | { t, add }], x, y, role, state? }]
 *                  x, y place the box, normalised 0..1 (0 = flush left / top).
 *                  role: client | interface | concrete | code
 *                  state: idle | active | edited | new | dim | dispatch
 *   marks.links    [{ from, to, kind, label?, state? }]
 *                  kind: implements | owns | ref | calls | uses
 *   marks.msg      { from, to, label, back? } — one call or return in flight
 *
 * Memory view (views/memory.js), used by the modern C++ idioms:
 *   marks.regions  column names, left to right, e.g. ["Stack", "Heap", "Static"]
 *   marks.blocks   [{ id, region, label, cells: [{ t, kind?, to?, state? }], state? }]
 *                  stacked top to bottom in array order within their region.
 *                  cell kind: data | ptr | vptr | tag | buf | fn; `to` is a block id
 *                  block state: idle | active | new | freed | leaked | dim
 *   marks.log      lines of program activity so far, newest last
 *
 * Every topic:
 *   metrics        a "printed" row appears on exactly the frame where the C++
 *                  prints that line. The self-test compiles the file marked
 *                  `traced: true` and checks its output against those rows.
 *
 * Explanation blocks: a string is a paragraph; { h } a heading; { list } a
 * bullet list; { tip } a call-out. Inside any of them **bold** and `code` work.
 */

import { frame } from "../core/trace.js";

export const OBJECTS = { kind: "objects" };
export const MEMORY = { kind: "memory" };

/** A line shown as newly added inside a box. */
export const add = (t) => ({ t, add: true });

/** The metric row the self-test checks against the real program's output. */
export const printed = (value) => ({ label: "printed", value });

/**
 * A one-page pattern: one diagram and a few steps over it, rather than a
 * before/after story. Each step may set box states, override box lines, put
 * a message in flight, and list the lines the program prints at that point.
 *
 *   scene  { objects, links }
 *   steps  [{ note, detail?, phase?, states?, lines?: { id: [...] }, msg?, printed?: [...] }]
 */
export function note({ id, topic, title, blurb, scene, steps, explanation, analysis, code }) {
  function* run() {
    for (const s of steps) {
      yield frame({
        phase: s.phase || "How it works",
        note: s.note,
        detail: s.detail || "",
        marks: {
          objects: scene.objects
            .filter((o) => !(s.hide || []).includes(o.id))
            .map((o) => ({ ...o, state: (s.states || {})[o.id] || o.state, lines: (s.lines || {})[o.id] || o.lines })),
          links: scene.links.filter((l) => !(s.hide || []).includes(l.from) && !(s.hide || []).includes(l.to)),
          msg: s.msg || null,
        },
        metrics: (s.printed || []).map(printed),
      });
    }
  }
  return { id, section: "Design patterns", topic, title, blurb, structure: OBJECTS, run, explanation, analysis, code };
}
