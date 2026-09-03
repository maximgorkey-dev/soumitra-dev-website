/**
 * The layout view.
 *
 * Canvas rather than SVG or DOM: a routed design is thousands of segments, and
 * that many nodes in the document makes pan and zoom crawl. Canvas also makes
 * level-of-detail natural — row bands, pins and labels each appear only once
 * they are big enough on screen to mean anything, which is what a real layout
 * viewer does and what stops the picture turning to mush when zoomed out.
 *
 * Coordinates are EDA convention: y increases upward, origin at the die's
 * lower-left corner. The canvas is the other way up, so every draw goes
 * through the transform in `sx`/`sy` rather than flipping the context, because
 * a flipped context also mirrors text.
 */

import { terminalPos } from "../core/metrics.js";

const CELL_COLORS = {
  comb: { fill: "#1c3d63", edge: "#3b82c4" },
  buf: { fill: "#12494a", edge: "#2dd4bf" },
  seq: { fill: "#5a3410", edge: "#f0883e" },
};

const PALETTE = {
  outside: "#0a0d12",
  dieFill: "#0f141b",
  dieEdge: "#2b3648",
  coreEdge: "#3f5570",
  rowBand: "rgba(255,255,255,0.022)",
  rowLine: "rgba(255,255,255,0.05)",
  siteLine: "rgba(255,255,255,0.03)",
  fly: "rgba(88,166,255,0.16)",
  flyClock: "rgba(45,212,191,0.26)",
  flyHot: "rgba(240,136,62,0.55)",
  pin: "rgba(230,237,243,0.55)",
  portIn: "#3fb950",
  portOut: "#a371f7",
  portClk: "#2dd4bf",
  text: "#e6edf3",
  textDim: "#9aa7b6",
  select: "#58a6ff",
};

export function createView(canvas, { onHover } = {}) {
  const ctx = canvas.getContext("2d", { alpha: false });

  let design = null;
  let floorplan = null;
  let density = null; // { binsX, binsY, values }
  let target = 0.7;

  let width = 1;
  let height = 1;
  let dpr = 1;

  // World coordinate at the viewport's bottom-left, plus pixels per dbu.
  const cam = { x: 0, y: 0, scale: 0.02 };

  const show = { flylines: true, density: false, rows: true, pins: true, labels: true };
  let hovered = null;
  let selected = null;
  let needsDraw = false;

  /* ---------------- transform ---------------- */

  const sx = (wx) => (wx - cam.x) * cam.scale;
  const sy = (wy) => height - (wy - cam.y) * cam.scale;
  const wx = (px) => px / cam.scale + cam.x;
  const wy = (py) => (height - py) / cam.scale + cam.y;

  /* ---------------- sizing ---------------- */

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, Math.round(rect.width));
    height = Math.max(1, Math.round(rect.height));
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    schedule();
  }

  function fit() {
    if (!floorplan) return;
    const { die } = floorplan;
    const pad = 0.94;
    cam.scale = Math.min(width / die.w, height / die.h) * pad;
    cam.x = die.x + die.w / 2 - width / (2 * cam.scale);
    cam.y = die.y + die.h / 2 - height / (2 * cam.scale);
    schedule();
  }

  function zoomAt(px, py, factor) {
    const before = { x: wx(px), y: wy(py) };
    const next = Math.min(4, Math.max(0.0008, cam.scale * factor));
    cam.scale = next;
    cam.x = before.x - px / cam.scale;
    cam.y = before.y - (height - py) / cam.scale;
    schedule();
  }

  /* ---------------- drawing ---------------- */

  function schedule() {
    if (needsDraw) return;
    needsDraw = true;
    requestAnimationFrame(() => {
      needsDraw = false;
      draw();
    });
  }

  function draw() {
    ctx.fillStyle = PALETTE.outside;
    ctx.fillRect(0, 0, width, height);
    if (!design || !floorplan) {
      drawPlaceholder();
      return;
    }

    drawDie();
    if (show.rows) drawRows();
    if (show.density && density) drawDensity();
    if (show.flylines) drawFlylines();
    drawCells();
    drawPorts();
    drawOverlay();
  }

  function drawPlaceholder() {
    ctx.fillStyle = PALETTE.textDim;
    ctx.font = "13px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.fillText("no floorplan yet", width / 2, height / 2);
    ctx.textAlign = "left";
  }

  function drawDie() {
    const { die, core } = floorplan;
    ctx.fillStyle = PALETTE.dieFill;
    ctx.fillRect(sx(die.x), sy(die.y + die.h), die.w * cam.scale, die.h * cam.scale);
    ctx.lineWidth = 1;
    ctx.strokeStyle = PALETTE.dieEdge;
    ctx.strokeRect(sx(die.x), sy(die.y + die.h), die.w * cam.scale, die.h * cam.scale);

    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = PALETTE.coreEdge;
    ctx.strokeRect(sx(core.x), sy(core.y + core.h), core.w * cam.scale, core.h * cam.scale);
    ctx.setLineDash([]);
  }

  function drawRows() {
    const rowPx = floorplan.rowHeight * cam.scale;
    if (rowPx < 2.5) return;

    // Alternating bands read as "rows" at a glance without drawing lines that
    // would compete with the cells for attention.
    ctx.fillStyle = PALETTE.rowBand;
    for (const row of floorplan.rows) {
      if (row.index % 2) continue;
      ctx.fillRect(sx(row.x), sy(row.y + row.h), row.w * cam.scale, rowPx);
    }

    if (rowPx >= 9) {
      ctx.strokeStyle = PALETTE.rowLine;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (const row of floorplan.rows) {
        const y = Math.round(sy(row.y)) + 0.5;
        ctx.moveTo(sx(row.x), y);
        ctx.lineTo(sx(row.x + row.w), y);
      }
      ctx.stroke();
    }

    const sitePx = floorplan.siteWidth * cam.scale;
    if (sitePx >= 7) {
      ctx.strokeStyle = PALETTE.siteLine;
      ctx.beginPath();
      const { core } = floorplan;
      for (let i = 0; i <= floorplan.sitesPerRow; i++) {
        const x = Math.round(sx(core.x + i * floorplan.siteWidth)) + 0.5;
        ctx.moveTo(x, sy(core.y + core.h));
        ctx.lineTo(x, sy(core.y));
      }
      ctx.stroke();
    }
  }

  function drawDensity() {
    const { core } = floorplan;
    const bw = core.w / density.binsX;
    const bh = core.h / density.binsY;
    const scale = Math.max(target, 0.05);

    for (let j = 0; j < density.binsY; j++) {
      for (let i = 0; i < density.binsX; i++) {
        const v = density.values[j * density.binsX + i] / scale;
        if (v <= 0.02) continue;
        ctx.fillStyle = heat(v);
        ctx.fillRect(
          sx(core.x + i * bw),
          sy(core.y + (j + 1) * bh),
          bw * cam.scale + 0.5,
          bh * cam.scale + 0.5
        );
      }
    }
  }

  /** 0 = empty, 1 = exactly at target density, >1 = over. */
  function heat(v) {
    const t = Math.min(1.6, v) / 1.6;
    const r = Math.round(255 * Math.min(1, Math.max(0, t * 1.9 - 0.35)));
    const g = Math.round(210 * Math.min(1, Math.max(0, t * 1.7 - 0.15)));
    const b = Math.round(255 * Math.max(0, 1 - t * 1.8));
    return `rgba(${r},${g},${b},0.4)`;
  }

  function drawFlylines() {
    // Two passes so clock nets sit on top of the signal haze rather than
    // being lost in it.
    const signal = new Path2D();
    const clock = new Path2D();

    for (const net of design.nets) {
      if (!net.driver && net.terminals.length < 2) continue;
      const path = net.isClock ? clock : signal;
      const a = terminalPos(design, net.terminals[0]);
      for (let i = 1; i < net.terminals.length; i++) {
        const b = terminalPos(design, net.terminals[i]);
        path.moveTo(sx(a.x), sy(a.y));
        path.lineTo(sx(b.x), sy(b.y));
      }
    }

    ctx.lineWidth = 1;
    ctx.strokeStyle = PALETTE.fly;
    ctx.stroke(signal);
    ctx.strokeStyle = PALETTE.flyClock;
    ctx.stroke(clock);

    if (selected != null) drawCellNets(selected);
  }

  /** Every net touching one cell, drawn hot. This is the beginning of the
   *  cross-probing that timing analysis will lean on. */
  function drawCellNets(cellIndex) {
    const path = new Path2D();
    for (const net of design.nets) {
      if (!net.terminals.some((t) => !t.port && t.index === cellIndex)) continue;
      const a = terminalPos(design, net.terminals[0]);
      for (let i = 1; i < net.terminals.length; i++) {
        const b = terminalPos(design, net.terminals[i]);
        path.moveTo(sx(a.x), sy(a.y));
        path.lineTo(sx(b.x), sy(b.y));
      }
    }
    ctx.strokeStyle = PALETTE.flyHot;
    ctx.lineWidth = 1.4;
    ctx.stroke(path);
  }

  function drawCells() {
    const showEdge = cam.scale * 400 > 3;
    const showPins = show.pins && cam.scale * floorplan.siteWidth >= 5;
    const showText = show.labels && cam.scale * floorplan.rowHeight >= 26;

    for (const c of design.cells) {
      const x = sx(c.x);
      const y = sy(c.y + c.height);
      const w = Math.max(1, c.width * cam.scale);
      const h = Math.max(1, c.height * cam.scale);
      const col = CELL_COLORS[c.kind] || CELL_COLORS.comb;

      ctx.fillStyle = col.fill;
      ctx.fillRect(x, y, w, h);
      if (showEdge) {
        ctx.strokeStyle = col.edge;
        ctx.lineWidth = c.index === hovered || c.index === selected ? 2 : 1;
        ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
      }

      if (showPins) drawPins(c);

      if (showText && w > 26) {
        ctx.fillStyle = PALETTE.text;
        ctx.font = `${Math.min(11, Math.max(7, h * 0.3))}px ui-monospace, monospace`;
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.clip();
        ctx.fillText(c.type, x + 3, y + h * 0.42);
        if (h > 26) {
          ctx.fillStyle = PALETTE.textDim;
          ctx.fillText(c.name, x + 3, y + h * 0.78);
        }
        ctx.restore();
      }
    }
  }

  function drawPins(cell) {
    const pins = cellPins.get(cell.index);
    if (!pins) return;
    const s = Math.max(1.5, floorplan.siteWidth * cam.scale * 0.35);
    ctx.fillStyle = PALETTE.pin;
    for (const p of pins) {
      const px = sx(cell.x + p.dx);
      const py = sy(cell.y + (cell.orient === "FS" ? cell.height - p.dy : p.dy));
      ctx.fillRect(px - s / 2, py - s / 2, s, s);
    }
  }

  function drawPorts() {
    const r = 7;
    const showText = cam.scale * floorplan.rowHeight >= 10;
    ctx.font = "10px ui-monospace, monospace";

    for (const p of design.ports) {
      const isClk = /^(clk|clock)([_0-9]*)$/i.test(p.name);
      ctx.fillStyle = isClk ? PALETTE.portClk : p.dir === "input" ? PALETTE.portIn : PALETTE.portOut;
      const x = sx(p.x);
      const y = sy(p.y);
      ctx.beginPath();
      ctx.arc(x, y, r * 0.5, 0, Math.PI * 2);
      ctx.fill();

      if (!showText) continue;
      ctx.fillStyle = PALETTE.textDim;
      if (p.edge === "right") {
        ctx.textAlign = "right";
        ctx.fillText(p.name, x - r, y + 3);
      } else if (p.edge === "bottom") {
        ctx.textAlign = "center";
        ctx.fillText(p.name, x, y + r + 10);
      } else {
        ctx.textAlign = "left";
        ctx.fillText(p.name, x + r, y + 3);
      }
      ctx.textAlign = "left";
    }
  }

  /** Scale bar, so the picture has a size rather than just a shape. */
  function drawOverlay() {
    const targetPx = 90;
    const raw = targetPx / cam.scale; // dbu
    const pow = Math.pow(10, Math.floor(Math.log10(raw)));
    const nice = [1, 2, 5, 10].map((m) => m * pow).find((v) => v >= raw / 2) || pow;
    const px = nice * cam.scale;

    const x = 14;
    const y = height - 16;
    ctx.strokeStyle = PALETTE.textDim;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y - 4);
    ctx.lineTo(x, y);
    ctx.lineTo(x + px, y);
    ctx.lineTo(x + px, y - 4);
    ctx.stroke();
    ctx.fillStyle = PALETTE.textDim;
    ctx.font = "10px ui-monospace, monospace";
    ctx.fillText(`${(nice / 1000).toLocaleString()} um`, x, y - 7);
  }

  /* ---------------- pin cache ---------------- */

  // Pin offsets per cell, gathered from the nets once, so the renderer never
  // has to reach back into the cell library.
  const cellPins = new Map();
  function buildPinCache() {
    cellPins.clear();
    if (!design) return;
    for (const net of design.nets) {
      for (const t of net.terminals) {
        if (t.port) continue;
        let list = cellPins.get(t.index);
        if (!list) {
          list = [];
          cellPins.set(t.index, list);
        }
        list.push({ dx: t.dx, dy: t.dy, pin: t.pin });
      }
    }
  }

  /* ---------------- hit testing ---------------- */

  function pick(px, py) {
    if (!design) return null;
    const x = wx(px);
    const y = wy(py);
    // Reverse order so the most recently drawn cell wins, matching what the
    // eye sees when cells still overlap during global placement.
    for (let i = design.cells.length - 1; i >= 0; i--) {
      const c = design.cells[i];
      if (x >= c.x && x <= c.x + c.width && y >= c.y && y <= c.y + c.height) return c;
    }
    return null;
  }

  /* ---------------- input ---------------- */

  let drag = null;

  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    zoomAt(e.clientX - rect.left, e.clientY - rect.top, Math.exp(-e.deltaY * 0.0016));
  }, { passive: false });

  canvas.addEventListener("pointerdown", (e) => {
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    drag = { px, py, camX: cam.x, camY: cam.y, moved: false };
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener("pointermove", (e) => {
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    if (drag) {
      const dx = px - drag.px;
      const dy = py - drag.py;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) drag.moved = true;
      cam.x = drag.camX - dx / cam.scale;
      cam.y = drag.camY + dy / cam.scale;
      schedule();
      return;
    }

    const hit = pick(px, py);
    const next = hit ? hit.index : null;
    if (next !== hovered) {
      hovered = next;
      schedule();
    }
    if (onHover) onHover(hit, { x: wx(px), y: wy(py) });
  });

  canvas.addEventListener("pointerup", (e) => {
    const rect = canvas.getBoundingClientRect();
    if (drag && !drag.moved) {
      const hit = pick(e.clientX - rect.left, e.clientY - rect.top);
      selected = hit ? hit.index : null;
      schedule();
    }
    drag = null;
  });

  canvas.addEventListener("pointerleave", () => {
    if (hovered !== null) {
      hovered = null;
      schedule();
    }
    if (onHover) onHover(null, null);
  });

  const observer = new ResizeObserver(() => resize());
  observer.observe(canvas);
  resize();

  /* ---------------- public surface ---------------- */

  return {
    setDesign(next) {
      design = next;
      selected = null;
      hovered = null;
      floorplan = null;
      density = null;
      buildPinCache();
      schedule();
    },

    setFloorplan(fp) {
      floorplan = fp;
      fit();
    },

    /** Apply a frame from the worker: packed [x0,y0,x1,y1,...] in cell order. */
    setPositions(buf) {
      if (!design) return;
      const n = Math.min(design.cells.length, buf.length >> 1);
      for (let i = 0; i < n; i++) {
        design.cells[i].x = buf[2 * i];
        design.cells[i].y = buf[2 * i + 1];
      }
      schedule();
    },

    setDensity(next) {
      density = next;
      if (show.density) schedule();
    },

    setTarget(t) {
      target = t;
    },

    setPorts(list) {
      if (!design) return;
      for (const p of list) {
        const port = design.ports[p.index];
        if (port) {
          port.x = p.x;
          port.y = p.y;
          port.edge = p.edge;
        }
      }
      schedule();
    },

    toggle(key, value) {
      show[key] = value === undefined ? !show[key] : Boolean(value);
      schedule();
    },

    isOn: (key) => Boolean(show[key]),
    select(index) {
      selected = index;
      schedule();
    },
    selectedCell: () => (selected == null || !design ? null : design.cells[selected]),
    fit,
    resize,
    redraw: schedule,
    zoomBy: (f) => zoomAt(width / 2, height / 2, f),
    destroy: () => observer.disconnect(),
  };
}
