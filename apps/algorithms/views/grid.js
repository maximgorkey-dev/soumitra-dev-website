/**
 * Grid renderer: 2D dynamic programming tables, mazes, matrices.
 *
 * A frame draws one or more grids, top to bottom. A DP topic usually has one
 * table; a search topic has the board. Arrows carry what makes a 2D picture
 * teach: which earlier cells a DP entry was built from, or which cell a search
 * reached this one from.
 *
 *   marks.grids [{
 *     name?       caption above the grid
 *     values      [[number | string | null]] row-major; null draws an empty cell
 *     rowLabels?  [string]  at the left; omitted shows row indices, false hides them
 *     colLabels?  [string]  above; omitted shows column indices, false hides them
 *     rowMarks?   { r: state }  highlights a row label (active | compared | found)
 *     colMarks?   { c: state }  highlights a column label
 *     cells?      { "r,c": state }  idle | active | compared | selected | found |
 *                                    excluded | pivot | wall | frontier | visited | path
 *     arrows?     [{ from: [r, c], to: [r, c], state? }]  state: idle | active | path
 *   }]
 *
 * Values live in the frame, as in the sequence view: a DP table fills in and a
 * search writes distances as it goes.
 */

const NS = "http://www.w3.org/2000/svg";
const W = 760;
const PAD = 14;
const MAX_CELL = 50;
const MIN_CELL = 22;
const LABEL = 26;
const NAME_H = 20;
const GRID_GAP = 22;

const make = (name, attrs = {}, text) => {
  const el = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) if (v !== undefined) el.setAttribute(k, String(v));
  if (text !== undefined) el.textContent = text;
  return el;
};

export function createGridView(root) {
  let svg = null;

  function setStructure() {
    root.innerHTML = "";
    svg = make("svg", { viewBox: `0 0 ${W} 200`, class: "graph-svg gv-svg", preserveAspectRatio: "xMidYMin meet" });
    root.appendChild(svg);
  }

  function show(f) {
    const grids = (f.marks || {}).grids || [];
    svg.replaceChildren();
    const defs = make("defs");
    for (const st of ["idle", "active", "path"]) {
      const mk = make("marker", { id: `gv-tip-${st}`, viewBox: "0 0 10 10", refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: "auto-start-reverse" });
      mk.appendChild(make("path", { d: "M0,0 L10,5 L0,10 z", class: "gv-tip", "data-state": st }));
      defs.appendChild(mk);
    }
    svg.appendChild(defs);

    let y = PAD;
    for (const g of grids) {
      const values = g.values || [];
      const rows = values.length;
      const cols = Math.max(1, ...values.map((r) => r.length));
      const hasRowLabels = g.rowLabels !== false;
      const hasColLabels = g.colLabels !== false;
      const lw = hasRowLabels ? LABEL : 0;
      const cs = Math.max(MIN_CELL, Math.min(MAX_CELL, Math.floor((W - 2 * PAD - lw) / cols)));
      const x0 = Math.round((W - lw - cols * cs) / 2) + lw;
      const layer = make("g", { class: "gv-grid" });

      if (g.name) {
        layer.appendChild(make("text", { x: x0, y: y + 12, class: "gv-name" }, g.name));
        y += NAME_H;
      }
      if (hasColLabels) {
        for (let c = 0; c < cols; c++) {
          const cap = Array.isArray(g.colLabels) ? g.colLabels[c] : c;
          layer.appendChild(make("text", { x: x0 + c * cs + cs / 2, y: y + 13, "text-anchor": "middle", class: "gv-label", "data-state": (g.colMarks || {})[c] || "idle" }, String(cap ?? "")));
        }
        y += LABEL - 6;
      }
      const top = y;
      const cx = (c) => x0 + c * cs + cs / 2;
      const cy = (r) => top + r * cs + cs / 2;

      for (let r = 0; r < rows; r++) {
        if (hasRowLabels) {
          const cap = Array.isArray(g.rowLabels) ? g.rowLabels[r] : r;
          layer.appendChild(make("text", { x: x0 - 8, y: cy(r) + 4, "text-anchor": "end", class: "gv-label", "data-state": (g.rowMarks || {})[r] || "idle" }, String(cap ?? "")));
        }
        for (let c = 0; c < cols; c++) {
          const v = values[r][c];
          const state = (g.cells || {})[`${r},${c}`] || "idle";
          layer.appendChild(make("rect", { x: x0 + c * cs + 1.5, y: top + r * cs + 1.5, width: cs - 3, height: cs - 3, rx: 4, class: "gv-cell", "data-state": state }));
          if (v !== null && v !== undefined && state !== "wall") {
            const t = String(v);
            const size = Math.min(15, cs * 0.4) * (t.length <= 2 ? 1 : t.length <= 3 ? 0.82 : 0.68);
            layer.appendChild(make("text", { x: cx(c), y: cy(r) + size / 3, "text-anchor": "middle", class: "gv-val", "data-state": state, "font-size": size.toFixed(1) }, t));
          }
        }
      }

      // Arrows above the cells, trimmed so they start and end inside the cell edges.
      for (const a of g.arrows || []) {
        const st = a.state || "idle";
        const [x1, y1, x2, y2] = [cx(a.from[1]), cy(a.from[0]), cx(a.to[1]), cy(a.to[0])];
        const len = Math.hypot(x2 - x1, y2 - y1) || 1;
        const trim = cs * 0.3;
        const ux = (x2 - x1) / len;
        const uy = (y2 - y1) / len;
        layer.appendChild(make("line", {
          x1: x1 + ux * trim, y1: y1 + uy * trim, x2: x2 - ux * trim, y2: y2 - uy * trim,
          class: "gv-arrow", "data-state": st, "marker-end": `url(#gv-tip-${st})`,
        }));
      }

      svg.appendChild(layer);
      y = top + rows * cs + GRID_GAP;
    }

    svg.setAttribute("viewBox", `0 0 ${W} ${Math.max(160, y - GRID_GAP + PAD)}`);
  }

  function clear() {
    if (svg) svg.replaceChildren();
  }

  return { setStructure, show, clear };
}
