/**
 * Sequence renderer: arrays, strings, stacks, queues, bits.
 *
 * A frame draws one or more rows, top to bottom. The first is usually the
 * input; later rows hold the auxiliary structure — a stack, a deque, a prefix
 * array — which is what lets one renderer cover two pointers, sliding windows,
 * monotonic stacks and dynamic programming over a line.
 *
 *   marks.rows [{
 *     name      shown at the left
 *     values    [number | string | null]; null draws an empty slot
 *     labels?   per-cell captions above, replacing the indices; false hides them
 *     cells?    { index: state }  idle | active | compared | selected | sorted |
 *                                 excluded | pivot | found
 *     pointers? [{ name, at }]    drawn under the cell, stacked when they share one
 *     ranges?   [{ from, to, label?, state? }]  bracket above, inclusive;
 *                                 state: window (default) | best | done
 *   }]
 *
 * Values live in the frame rather than in the structure, because they change:
 * elements are swapped, sums accumulate, stacks grow and shrink.
 */

const NS = "http://www.w3.org/2000/svg";
const W = 760;
const PAD = 14;
const NAME_W = 96;
const CELL_H = 38;
const MAX_CELL_W = 58;
const MIN_CELL_W = 24;
const INDEX_H = 15;
const RANGE_H = 22;
const PTR_LINE = 15;
const ROW_GAP = 18;

const make = (name, attrs = {}, text) => {
  const el = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) if (v !== undefined) el.setAttribute(k, String(v));
  if (text !== undefined) el.textContent = text;
  return el;
};

export function createSequenceView(root) {
  let svg = null;

  function setStructure() {
    root.innerHTML = "";
    svg = make("svg", { viewBox: `0 0 ${W} 200`, class: "graph-svg sv-svg", preserveAspectRatio: "xMidYMin meet" });
    root.appendChild(svg);
  }

  function show(f) {
    const rows = (f.marks || {}).rows || [];
    svg.replaceChildren();
    const defs = make("defs");
    const mk = make("marker", { id: "sv-tip", viewBox: "0 0 10 10", refX: 5, refY: 1, markerWidth: 8, markerHeight: 8, orient: "auto" });
    mk.appendChild(make("path", { d: "M0,9 L5,0 L10,9 z", class: "sv-tip" }));
    defs.appendChild(mk);
    svg.appendChild(defs);

    // One cell width for every row, so columns line up between rows.
    // Pointers may sit one past the end (a half-open hi, an end iterator).
    const longest = Math.max(1, ...rows.map((r) =>
      Math.max((r.values || []).length, ...(r.pointers || []).map((p) => p.at + 1))));
    const cw = Math.max(MIN_CELL_W, Math.min(MAX_CELL_W, Math.floor((W - 2 * PAD - NAME_W) / longest)));
    const x0 = PAD + NAME_W;
    let y = PAD;

    for (const r of rows) {
      const values = r.values || [];
      const ranges = r.ranges || [];
      const g = make("g", { class: "sv-row" });

      // Ranges, each on its own level, outermost first.
      ranges.forEach((rg, k) => {
        const ry = y + k * RANGE_H;
        const xa = x0 + rg.from * cw + 3;
        const xb = x0 + (rg.to + 1) * cw - 3;
        const st = rg.state || "window";
        g.appendChild(make("path", { d: `M${xa},${ry + RANGE_H - 2} v-6 H${xb} v6`, class: "sv-range", "data-state": st }));
        if (rg.label) g.appendChild(make("text", { x: (xa + xb) / 2, y: ry + 10, "text-anchor": "middle", class: "sv-range-label", "data-state": st }, rg.label));
      });
      y += ranges.length * RANGE_H;

      if (r.labels !== false) {
        values.forEach((_, i) => {
          const cap = Array.isArray(r.labels) ? r.labels[i] : i;
          g.appendChild(make("text", { x: x0 + i * cw + cw / 2, y: y + 11, "text-anchor": "middle", class: "sv-index" }, String(cap ?? "")));
        });
        y += INDEX_H;
      }

      g.appendChild(make("text", { x: PAD, y: y + CELL_H / 2 + 4, class: "sv-name" }, r.name || ""));

      if (!values.length) {
        g.appendChild(make("rect", { x: x0, y, width: cw, height: CELL_H, rx: 6, class: "sv-cell sv-empty" }));
        g.appendChild(make("text", { x: x0 + cw + 10, y: y + CELL_H / 2 + 4, class: "sv-index" }, "empty"));
      }
      values.forEach((v, i) => {
        const state = (r.cells || {})[i] || "idle";
        const x = x0 + i * cw;
        g.appendChild(make("rect", { x: x + 2, y, width: cw - 4, height: CELL_H, rx: 6, class: v === null ? "sv-cell sv-empty" : "sv-cell", "data-state": state }));
        if (v !== null && v !== undefined) {
          const t = String(v);
          const size = t.length <= 2 ? 15 : t.length <= 4 ? 12.5 : 10.5;
          g.appendChild(make("text", { x: x + cw / 2, y: y + CELL_H / 2 + size / 3, "text-anchor": "middle", class: "sv-val", "data-state": state, "font-size": size }, t));
        }
      });
      y += CELL_H;

      // Pointers under their cell; several on one cell stack downwards.
      const byCell = new Map();
      for (const p of r.pointers || []) {
        if (!byCell.has(p.at)) byCell.set(p.at, []);
        byCell.get(p.at).push(p.name);
      }
      let deepest = 0;
      for (const [at, names] of byCell) {
        const cx = x0 + at * cw + cw / 2;
        g.appendChild(make("line", { x1: cx, y1: y + 12, x2: cx, y2: y + 4, class: "sv-ptr", "marker-end": "url(#sv-tip)" }));
        names.forEach((name, k) => {
          g.appendChild(make("text", { x: cx, y: y + 24 + k * PTR_LINE, "text-anchor": "middle", class: "sv-ptr-label" }, name));
        });
        deepest = Math.max(deepest, names.length);
      }
      y += deepest ? 14 + deepest * PTR_LINE : 0;

      svg.appendChild(g);
      y += ROW_GAP;
    }

    svg.setAttribute("viewBox", `0 0 ${W} ${Math.max(160, y - ROW_GAP + PAD)}`);
  }

  function clear() {
    if (svg) svg.replaceChildren();
  }

  return { setStructure, show, clear };
}
