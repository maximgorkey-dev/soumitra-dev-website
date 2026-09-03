/**
 * Side panels: the stage pipeline, the metrics table, the tool log and the
 * convergence sparkline.
 *
 * The two audiences for this app want different things from the same run. The
 * log is written the way a real tool writes one, which is the fastest way for
 * someone who does this for a living to see whether the numbers are sane. The
 * explainers exist for everyone else, and stay folded away until asked for.
 */

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ------------------------------------------------------------------ */
/* stage explainers                                                    */
/* ------------------------------------------------------------------ */

export const EXPLAINERS = {
  netlist: {
    title: "Netlist",
    what:
      "The design as gates and the connections between them, already mapped onto cells from the library. " +
      "Turning RTL into this is synthesis, which is a separate problem and out of scope here — every design " +
      "in this app starts already mapped.",
    metric:
      "Cell, net and pin counts, plus fanout. Fanout is how many inputs a single output drives; a net with " +
      "more loads than its driver can comfortably pull is a problem later stages have to fix.",
    why:
      "Everything downstream is a consequence of this graph. Placement knows only connectivity — it has no " +
      "idea what the circuit computes, and it would place a multiplier and a random graph the same way.",
  },
  floorplan: {
    title: "Floorplan",
    what:
      "Decides how much silicon the design gets and cuts it into standard-cell rows. Core area is total cell " +
      "area divided by the target utilisation, shaped to the requested aspect ratio and then rounded to whole " +
      "rows and sites. Primary inputs and outputs are pinned to the die edge.",
    metric:
      "Utilisation is the fraction of the core occupied by cells. Rows x sites is the placement grid: every " +
      "legal cell origin sits on one of those intersections.",
    why:
      "Utilisation is the most consequential number in the flow. Too low and you are paying for empty silicon; " +
      "too high and the placer has nowhere to spread cells, and later the router has nowhere to put wires.",
  },
  place: {
    title: "Global placement",
    what:
      "Positions every cell to minimise wirelength while keeping density roughly even. Nets behave as springs " +
      "pulling connected cells together, and a density field pushes cells out of crowded bins. Cells are still " +
      "at arbitrary coordinates and may still overlap when this finishes.",
    metric:
      "HPWL, half-perimeter wirelength, is the sum over nets of their bounding-box half-perimeter — the standard " +
      "stand-in for routed length, because it is exact for two- and three-pin nets and costs almost nothing to " +
      "recompute. Overflow is the share of cell area sitting above target density.",
    why:
      "Watch the two numbers pull against each other. Minimising wirelength alone collapses the design onto a " +
      "single point, since zero wirelength is the optimum; spreading alone ignores connectivity entirely. What " +
      "you end up looking at is the compromise, and the fixed IO on the die edge is what gives it direction.",
  },
  legalize: {
    title: "Legalisation",
    what:
      "Snaps cells onto the row and site grid and removes every overlap while moving them as little as possible. " +
      "Cells are handled in order of increasing x; each is trial-fitted into its preferred row and a band of " +
      "neighbours, and goes wherever total displacement grows least. Cells forced against each other form " +
      "clusters that are positioned as a unit.",
    metric:
      "Displacement is how far cells had to travel. The wirelength delta is the price of legality, and it is " +
      "expected to be positive.",
    why:
      "Global placement was solving a relaxed problem in which cells could overlap, so the wirelength it " +
      "reported was never actually achievable. A small positive delta here is the sign of a good global " +
      "placement — it means the answer was nearly legal already.",
  },
};

export const PLANNED_NOTE =
  "Clock tree synthesis, routing and timing analysis are the next stages to build. The data model already " +
  "carries what they need: nets know their driver, the library carries capacitance and drive resistance, and " +
  "the technology defines routing layers with preferred directions.";

/* ------------------------------------------------------------------ */
/* stage pipeline                                                      */
/* ------------------------------------------------------------------ */

export function createStageBar(root, { stages, planned, onInfo }) {
  root.innerHTML =
    stages
      .map(
        (s) => `
      <div class="stage" data-stage="${esc(s.id)}" data-status="idle">
        <span class="stage-dot"></span>
        <span class="stage-body">
          <span class="stage-label">${esc(s.label)}</span>
          <span class="stage-metric" data-metric="${esc(s.id)}"></span>
        </span>
        <button class="stage-info" type="button" data-info="${esc(s.id)}"
                aria-label="What does ${esc(s.label)} do?">?</button>
      </div>`
      )
      .join("") +
    planned
      .map(
        (s) => `
      <div class="stage stage-planned" data-status="planned" title="Not built yet">
        <span class="stage-dot"></span>
        <span class="stage-body">
          <span class="stage-label">${esc(s.label)}</span>
          <span class="stage-metric">planned</span>
        </span>
      </div>`
      )
      .join("");

  root.querySelectorAll("[data-info]").forEach((btn) => {
    btn.addEventListener("click", () => onInfo(btn.dataset.info));
  });

  const node = (id) => root.querySelector(`[data-stage="${id}"]`);

  return {
    setStatus(id, status) {
      const n = node(id);
      if (n) n.dataset.status = status;
    },
    setMetric(id, text) {
      const n = root.querySelector(`[data-metric="${id}"]`);
      if (n) n.textContent = text;
    },
    reset() {
      for (const s of stages) {
        this.setStatus(s.id, "idle");
        this.setMetric(s.id, "");
      }
    },
  };
}

/* ------------------------------------------------------------------ */
/* metrics table                                                       */
/* ------------------------------------------------------------------ */

export function createMetrics(root) {
  return {
    /** rows: [{ label, value, tone }] or a "---" string for a separator. */
    set(rows) {
      root.innerHTML = rows
        .map((r) => {
          if (r === "---") return '<div class="metric-sep"></div>';
          const tone = r.tone ? ` metric-${r.tone}` : "";
          return `<div class="metric">
              <span class="metric-label">${esc(r.label)}</span>
              <span class="metric-value${tone}">${esc(r.value)}</span>
            </div>`;
        })
        .join("");
    },
    clear() {
      root.innerHTML = "";
    },
  };
}

/* ------------------------------------------------------------------ */
/* tool log                                                            */
/* ------------------------------------------------------------------ */

export function createLog(root, { limit = 400 } = {}) {
  let count = 0;

  return {
    add(level, text) {
      const line = document.createElement("div");
      line.className = `log-line log-${level}`;
      line.textContent = text;
      root.appendChild(line);
      count += 1;
      // Trim from the front so a long run cannot grow the DOM without bound.
      while (count > limit && root.firstChild) {
        root.removeChild(root.firstChild);
        count -= 1;
      }
      root.scrollTop = root.scrollHeight;
    },
    banner(text) {
      this.add("banner", text);
    },
    clear() {
      root.innerHTML = "";
      count = 0;
    },
  };
}

/* ------------------------------------------------------------------ */
/* convergence sparkline                                               */
/* ------------------------------------------------------------------ */

/**
 * Wirelength and overflow against iteration. Two series on independent
 * vertical scales, because they have different units and the shape of each
 * curve is the interesting part, not their ratio.
 */
export function createSparkline(canvas) {
  const ctx = canvas.getContext("2d");
  let data = [];

  function draw() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.clearRect(0, 0, w, h);
    if (data.length < 2) return;

    const pad = 3;
    const series = (key, color) => {
      let lo = Infinity;
      let hi = -Infinity;
      for (const d of data) {
        const v = d[key];
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
      const span = hi - lo || 1;
      ctx.beginPath();
      data.forEach((d, i) => {
        const x = pad + (i * (w - 2 * pad)) / (data.length - 1);
        const y = h - pad - ((d[key] - lo) / span) * (h - 2 * pad);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    };

    series("overflow", "#f0883e");
    series("hpwl", "#58a6ff");
  }

  return {
    push(point) {
      data.push(point);
      draw();
    },
    set(points) {
      data = points.slice();
      draw();
    },
    clear() {
      data = [];
      draw();
    },
    redraw: draw,
  };
}

/* ------------------------------------------------------------------ */
/* explainer drawer                                                    */
/* ------------------------------------------------------------------ */

export function createExplainer(root) {
  return {
    show(id) {
      const e = EXPLAINERS[id];
      if (!e) return;
      root.hidden = false;
      root.innerHTML = `
        <div class="explain-head">
          <h3>${esc(e.title)}</h3>
          <button class="explain-close" type="button" aria-label="Close">&times;</button>
        </div>
        <p><span class="explain-tag">What it does</span>${esc(e.what)}</p>
        <p><span class="explain-tag">The numbers</span>${esc(e.metric)}</p>
        <p><span class="explain-tag">Why it matters</span>${esc(e.why)}</p>`;
      root.querySelector(".explain-close").addEventListener("click", () => {
        root.hidden = true;
      });
    },
    hide() {
      root.hidden = true;
    },
  };
}

/* ------------------------------------------------------------------ */
/* formatting                                                          */
/* ------------------------------------------------------------------ */

export const fmt = {
  um: (dbu, dp = 2) => `${(dbu / 1000).toFixed(dp)} um`,
  um2: (dbu2, dp = 2) => `${(dbu2 / 1e6).toFixed(dp)} um2`,
  mm: (dbu) => `${(dbu / 1e6).toFixed(3)} mm`,
  pct: (frac, dp = 1) => `${(100 * frac).toFixed(dp)}%`,
  signedPct: (frac, dp = 1) => `${frac >= 0 ? "+" : ""}${(100 * frac).toFixed(dp)}%`,
  int: (v) => Number(v).toLocaleString(),
  ps: (v) => `${Number(v).toFixed(0)} ps`,
};
