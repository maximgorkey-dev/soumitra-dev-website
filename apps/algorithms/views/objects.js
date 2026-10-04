/**
 * Objects renderer, for the design-patterns section.
 *
 * Draws boxes (classes, objects or plain functions), the links between them
 * and at most one message in flight. Unlike the graph view the scene itself
 * changes between frames — the "before" and "after" code have different
 * boxes — so each frame redraws everything. A pattern scene is a dozen boxes,
 * so there is nothing to optimise.
 *
 * The frame fields are documented at the top of topics/pat-strategy.js.
 */

const NS = "http://www.w3.org/2000/svg";
const W = 760;
const H = 460;
const PAD_X = 20;
const PAD_Y = 14;
const CHAR = 7.3;     // advance of one 12px monospace glyph
const LINE = 16;
const HEAD = 26;

const make = (name, attrs = {}, text) => {
  const el = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) if (v !== undefined) el.setAttribute(k, String(v));
  if (text !== undefined) el.textContent = text;
  return el;
};

const lineText = (l) => (typeof l === "string" ? l : l.t);

/** Box geometry from its content, so boxes fit their text without a layout pass. */
function measure(o) {
  const lines = o.lines || [];
  const chars = Math.max(o.label.length, (o.stereo || "").length, ...lines.map((l) => lineText(l).length + 2));
  const w = Math.max(120, Math.ceil(chars * CHAR) + 24);
  const h = HEAD + (o.stereo ? 14 : 0) + lines.length * LINE + (lines.length ? 10 : 0);
  return { w, h };
}

/** Where the segment from a box's centre towards (tx, ty) leaves the box. */
function edgePoint(b, tx, ty) {
  const dx = tx - b.cx;
  const dy = ty - b.cy;
  if (!dx && !dy) return { x: b.cx, y: b.cy };
  const t = Math.min(dx ? b.w / 2 / Math.abs(dx) : Infinity, dy ? b.h / 2 / Math.abs(dy) : Infinity);
  return { x: b.cx + dx * t, y: b.cy + dy * t };
}

function defs() {
  const d = make("defs");
  const marker = (id, path, cls, refX) => {
    const m = make("marker", { id, viewBox: "0 0 12 12", refX, refY: 6, markerWidth: 11, markerHeight: 11, orient: "auto-start-reverse", class: cls });
    m.appendChild(make("path", { d: path }));
    d.appendChild(m);
  };
  marker("ov-arrow", "M1,1 L11,6 L1,11 z", "ov-mk", 11);
  marker("ov-arrow-msg", "M1,1 L11,6 L1,11 z", "ov-mk-msg", 11);
  marker("ov-arrow-ret", "M1,1 L11,6 L1,11 z", "ov-mk-ret", 11);
  marker("ov-tri", "M1,1 L11,6 L1,11 z", "ov-mk-tri", 11);
  marker("ov-diamond", "M1,6 L6,1 L11,6 L6,11 z", "ov-mk-dia", 1);
  return d;
}

export function createObjectsView(root) {
  let svg = null;

  function setStructure() {
    root.innerHTML = "";
    svg = make("svg", { viewBox: `0 0 ${W} ${H}`, class: "graph-svg ov-svg", preserveAspectRatio: "xMidYMid meet" });
    root.appendChild(svg);
  }

  function show(f) {
    const marks = f.marks || {};
    svg.replaceChildren(defs());

    const boxes = new Map();
    for (const o of marks.objects || []) {
      const { w, h } = measure(o);
      const cx = PAD_X + w / 2 + o.x * (W - 2 * PAD_X - w);
      const cy = PAD_Y + h / 2 + o.y * (H - 2 * PAD_Y - h);
      boxes.set(o.id, { o, w, h, cx, cy });
    }

    const linkLayer = make("g");
    const boxLayer = make("g");
    const msgLayer = make("g");

    for (const l of marks.links || []) {
      const a = boxes.get(l.from);
      const b = boxes.get(l.to);
      if (!a || !b) continue;
      const p = edgePoint(a, b.cx, b.cy);
      const q = edgePoint(b, a.cx, a.cy);
      const kind = l.kind || "calls";
      const line = make("line", {
        x1: p.x, y1: p.y, x2: q.x, y2: q.y,
        class: "ov-link", "data-kind": kind, "data-state": l.state || "idle",
        "marker-end": kind === "implements" ? "url(#ov-tri)" : kind === "owns" ? undefined : "url(#ov-arrow)",
        "marker-start": kind === "owns" ? "url(#ov-diamond)" : undefined,
      });
      linkLayer.appendChild(line);
      if (l.label) {
        // Labels sit a little along the line from the source, so two links
        // leaving one box do not stack their labels at a shared midpoint.
        const t = kind === "ref" ? 0.55 : 0.5;
        const lx = p.x + (q.x - p.x) * t;
        const ly = p.y + (q.y - p.y) * t;
        linkLayer.appendChild(make("text", { x: lx + 8, y: ly - 6, class: "ov-link-label", "data-kind": kind }, l.label));
      }
    }

    for (const { o, w, h, cx, cy } of boxes.values()) {
      const g = make("g", { class: "ov-box", "data-role": o.role || "concrete", "data-state": o.state || "idle" });
      const x = cx - w / 2;
      const y = cy - h / 2;
      g.appendChild(make("rect", { x, y, width: w, height: h, rx: 8 }));
      let ty = y + 18;
      if (o.stereo) {
        g.appendChild(make("text", { x: cx, y: ty - 2, "text-anchor": "middle", class: "ov-stereo" }, o.stereo));
        ty += 14;
      }
      g.appendChild(make("text", { x: cx, y: ty, "text-anchor": "middle", class: "ov-title" }, o.label));
      const lines = o.lines || [];
      if (lines.length) {
        g.appendChild(make("line", { x1: x, y1: ty + 8, x2: x + w, y2: ty + 8, class: "ov-rule" }));
        lines.forEach((l, i) => {
          const added = typeof l !== "string" && l.add;
          g.appendChild(make("text", { x: x + 12, y: ty + 24 + i * LINE, class: added ? "ov-line ov-line-add" : "ov-line" },
            (added ? "+ " : "") + lineText(l)));
        });
      }
      if (o.href) {
        const a = make("a", { href: `#${o.href}`, class: "ov-box-link" });
        a.appendChild(make("title", {}, `Open ${o.label}`));
        a.appendChild(g);
        boxLayer.appendChild(a);
      } else {
        boxLayer.appendChild(g);
      }
    }

    const m = marks.msg;
    if (m && boxes.has(m.from) && boxes.has(m.to)) {
      const a = boxes.get(m.from);
      const b = boxes.get(m.to);
      // Offset sideways so a call and its return do not overlap the static
      // link between the same two boxes.
      const dx = b.cx - a.cx;
      const dy = b.cy - a.cy;
      const len = Math.hypot(dx, dy) || 1;
      const off = m.back ? -18 : 18;
      const nx = (-dy / len) * off;
      const ny = (dx / len) * off;
      const p = edgePoint(a, b.cx, b.cy);
      const q = edgePoint(b, a.cx, a.cy);
      msgLayer.appendChild(make("line", {
        x1: p.x + nx, y1: p.y + ny, x2: q.x + nx, y2: q.y + ny,
        class: m.back ? "ov-msg ov-msg-ret" : "ov-msg",
        "marker-end": m.back ? "url(#ov-arrow-ret)" : "url(#ov-arrow-msg)",
      }));
      // Slide the label outward along the normal until it clears every box;
      // boxes in a tight row would otherwise hide it.
      const cw = m.label.length * CHAR + 16;
      const ux = nx / Math.abs(off);
      const uy = ny / Math.abs(off);
      const clear = (x, y) => [...boxes.values()].every((b) =>
        Math.abs(x - b.cx) > (b.w + cw) / 2 + 4 || Math.abs(y - b.cy) > (b.h + 22) / 2 + 4);
      let mx = (p.x + q.x) / 2 + nx * 1.6;
      let my = (p.y + q.y) / 2 + ny * 1.6;
      for (let k = 1; k <= 14 && !clear(mx, my); k++) {
        mx = (p.x + q.x) / 2 + ux * (Math.abs(off) * 1.6 + k * 10);
        my = (p.y + q.y) / 2 + uy * (Math.abs(off) * 1.6 + k * 10);
      }
      const chip = make("g", { class: m.back ? "ov-chip ov-chip-ret" : "ov-chip" });
      chip.appendChild(make("rect", { x: mx - cw / 2, y: my - 11, width: cw, height: 22, rx: 6 }));
      chip.appendChild(make("text", { x: mx, y: my + 4, "text-anchor": "middle" }, m.label));
      msgLayer.appendChild(chip);
    }

    svg.append(linkLayer, boxLayer, msgLayer);
  }

  function clear() {
    if (svg) svg.replaceChildren();
  }

  return { setStructure, show, clear };
}
