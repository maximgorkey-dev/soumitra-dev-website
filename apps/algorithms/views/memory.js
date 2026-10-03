/**
 * Memory renderer, for the modern C++ idioms.
 *
 * Regions are columns (stack, heap, static data). Each holds blocks — an
 * object or a resource — drawn as a header and a column of cells. A cell can
 * point at another block, drawn as an arrow. An optional log along the bottom
 * shows what the program has done so far, which is where constructor and
 * destructor order becomes visible.
 *
 * Frame fields are documented in topics/pat-common.js.
 */

const NS = "http://www.w3.org/2000/svg";
const W = 760;
const H = 460;
const PAD = 14;
const GAP = 46;          // between columns, where cross-region arrows run
const HEAD = 24;
const CELL = 22;
const LOG_LINE = 17;
const LOG_MAX = 5;

const make = (name, attrs = {}, text) => {
  const el = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) if (v !== undefined) el.setAttribute(k, String(v));
  if (text !== undefined) el.textContent = text;
  return el;
};

export function createMemoryView(root) {
  let svg = null;

  function setStructure() {
    root.innerHTML = "";
    svg = make("svg", { viewBox: `0 0 ${W} ${H}`, class: "graph-svg mv-svg", preserveAspectRatio: "xMidYMid meet" });
    root.appendChild(svg);
  }

  function show(f) {
    const m = f.marks || {};
    const regions = m.regions || [];
    const log = m.log || [];
    svg.replaceChildren();

    const defs = make("defs");
    const mk = make("marker", { id: "mv-arrow", viewBox: "0 0 12 12", refX: 11, refY: 6, markerWidth: 10, markerHeight: 10, orient: "auto", class: "mv-mk" });
    mk.appendChild(make("path", { d: "M1,1 L11,6 L1,11 z" }));
    defs.appendChild(mk);
    const mkA = make("marker", { id: "mv-arrow-on", viewBox: "0 0 12 12", refX: 11, refY: 6, markerWidth: 10, markerHeight: 10, orient: "auto", class: "mv-mk-on" });
    mkA.appendChild(make("path", { d: "M1,1 L11,6 L1,11 z" }));
    defs.appendChild(mkA);
    svg.appendChild(defs);

    const logH = log.length ? Math.min(LOG_MAX, log.length) * LOG_LINE + 30 : 0;
    const areaH = H - logH - (logH ? 8 : 0);
    const n = Math.max(1, regions.length);
    const colW = (W - 2 * PAD - (n - 1) * GAP) / n;

    const colLayer = make("g");
    const blockLayer = make("g");
    const arrowLayer = make("g");

    const cols = new Map();
    regions.forEach((name, i) => {
      const x = PAD + i * (colW + GAP);
      cols.set(name, { x, i, y: 40 });
      colLayer.appendChild(make("rect", { x, y: 8, width: colW, height: areaH - 8, rx: 10, class: "mv-col" }));
      colLayer.appendChild(make("text", { x: x + 12, y: 27, class: "mv-col-name" }, name));
    });

    // Lay out blocks and remember where every cell and block header is.
    const geo = new Map();
    for (const b of m.blocks || []) {
      const c = cols.get(b.region);
      if (!c) continue;
      const cells = b.cells || [];
      const h = HEAD + cells.length * CELL + (cells.length ? 6 : 0);
      const x = c.x + 10;
      const w = colW - 20;
      const y = c.y;
      c.y += h + 12;
      geo.set(b.id, { b, x, y, w, h, col: c.i });

      const g = make("g", { class: "mv-block", "data-state": b.state || "idle" });
      g.appendChild(make("rect", { x, y, width: w, height: h, rx: 7 }));
      g.appendChild(make("text", { x: x + 10, y: y + 16, class: "mv-block-label" }, b.label + (b.state === "freed" ? "  (gone)" : "")));
      cells.forEach((cell, i) => {
        const cy = y + HEAD + i * CELL;
        g.appendChild(make("rect", { x: x + 6, y: cy, width: w - 12, height: CELL - 3, rx: 4,
          class: "mv-cell", "data-kind": cell.kind || "data", "data-state": cell.state || "idle" }));
        g.appendChild(make("text", { x: x + 14, y: cy + 14, class: "mv-cell-text", "data-kind": cell.kind || "data" }, cell.t));
      });
      blockLayer.appendChild(g);
    }

    // Arrows from pointer cells to their target block's header.
    for (const { b, x, y, w, col } of geo.values()) {
      (b.cells || []).forEach((cell, i) => {
        if (!cell.to || !geo.has(cell.to)) return;
        const t = geo.get(cell.to);
        const sy = y + HEAD + i * CELL + (CELL - 3) / 2;
        const ty = t.y + 12;
        let d;
        if (t.col > col) {
          d = `M${x + w - 6},${sy} C${x + w + 30},${sy} ${t.x - 30},${ty} ${t.x},${ty}`;
        } else if (t.col < col) {
          d = `M${x + 6},${sy} C${x - 30},${sy} ${t.x + t.w + 30},${ty} ${t.x + t.w},${ty}`;
        } else {
          const bulge = x + w + 26;
          d = `M${x + w - 6},${sy} C${bulge},${sy} ${bulge},${ty} ${t.x + t.w},${ty}`;
        }
        const on = cell.state === "active";
        arrowLayer.appendChild(make("path", { d, class: on ? "mv-ptr mv-ptr-on" : "mv-ptr", "marker-end": on ? "url(#mv-arrow-on)" : "url(#mv-arrow)" }));
      });
    }

    svg.append(colLayer, blockLayer, arrowLayer);

    if (log.length) {
      const y0 = H - logH;
      const g = make("g", { class: "mv-log" });
      g.appendChild(make("rect", { x: PAD, y: y0, width: W - 2 * PAD, height: logH - 2, rx: 8 }));
      g.appendChild(make("text", { x: PAD + 12, y: y0 + 17, class: "mv-log-head" }, "program output / events"));
      const tail = log.slice(-LOG_MAX);
      tail.forEach((line, i) => {
        g.appendChild(make("text", { x: PAD + 12, y: y0 + 34 + i * LOG_LINE, class: i === tail.length - 1 ? "mv-log-line mv-log-new" : "mv-log-line" }, line));
      });
      svg.appendChild(g);
    }
  }

  function clear() {
    if (svg) svg.replaceChildren();
  }

  return { setStructure, show, clear };
}
