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

/**
 * One entry per chip in the stage bar, including the steps this app does not
 * run. `goal`, `optimises` and `constrained` are the short answers — what the
 * stage is for and what it is allowed to trade away — and `goal` doubles as the
 * live caption while the stage runs. Everything else is for the reader who
 * stopped to ask.
 */
export const EXPLAINERS = {
  synthesis: {
    title: "Synthesis",
    anchor: "synthesis",
    planned: true,
    goal: "Turn RTL into library cells. Not run here — designs arrive already mapped.",
    what:
      "Compiles register-transfer-level code into a gate-level netlist. Roughly: elaborate the RTL into generic " +
      "boolean logic and registers, optimise that logic, then technology-map it — cover the boolean network with " +
      "real cells from the library, picking sizes and drive strengths as it goes.",
    optimises:
      "Area, timing and power at once, and which one wins is set by the constraints you hand it. The same RTL " +
      "will come out two or three times larger when it has to run fast.",
    constrained:
      "The cell library, and the timing constraints: clock periods, input arrival and output required times.",
    why:
      "Synthesis is where the design stops being a description and becomes a circuit, but it is a fundamentally " +
      "different problem from placement — logic covering rather than geometry — so this app starts downstream of " +
      "it. Every preset here is a gate-level netlist built by hand in code, which is exactly the form a placer " +
      "expects to be given.",
    fails:
      "Bad constraints. Under-constrain it and it optimises for area and misses timing by a mile; " +
      "over-constrain it and it throws enormous parallel structures at a path that never needed them.",
  },
  netlist: {
    title: "Netlist",
    anchor: "netlist",
    goal: "Read the gate-level design and check it holds together. Nothing is optimised yet.",
    what:
      "The design as gates and the connections between them, already mapped onto cells from the library. " +
      "This stage compiles the text into a graph, resolves nets to their drivers and loads, and rejects the " +
      "things a placer cannot recover from — a net with no driver, or two.",
    optimises:
      "Nothing. This is a parse and a sanity check, and it is the one stage in the flow with no cost function.",
    constrained: "The cell library: a type that is not in it cannot be instantiated.",
    metric:
      "Cell, net and pin counts, plus fanout. Fanout is how many inputs a single output drives; a net with " +
      "more loads than its driver can comfortably pull is a problem later stages have to fix.",
    why:
      "Everything downstream is a consequence of this graph. Placement knows only connectivity — it has no " +
      "idea what the circuit computes, and it would place a multiplier and a random graph the same way.",
  },
  floorplan: {
    title: "Floorplan",
    anchor: "floorplan",
    goal: "Choose how much silicon the design gets, and cut it into rows.",
    what:
      "Decides the die and core size and cuts the core into standard-cell rows. Core area is total cell " +
      "area divided by the target utilisation, shaped to the requested aspect ratio and then rounded to whole " +
      "rows and sites. Primary inputs and outputs are pinned to the die edge.",
    optimises:
      "Area, against the room every later stage needs. There is no iteration here — it is a sizing decision, " +
      "and the two sliders on the left are the whole input.",
    constrained:
      "Cells cannot straddle rows, so total area fitting is not enough: the widths have to pack into rows. " +
      "If they will not, the core is widened until they do.",
    metric:
      "Utilisation is the fraction of the core occupied by cells. Rows x sites is the placement grid: every " +
      "legal cell origin sits on one of those intersections.",
    why:
      "Utilisation is the most consequential number in the flow. Too low and you are paying for empty silicon; " +
      "too high and the placer has nowhere to spread cells, and later the router has nowhere to put wires.",
    fails:
      "Pushing utilisation up until the placer cannot spread and the router cannot finish. The symptom appears " +
      "two stages later, which is what makes it expensive.",
  },
  place: {
    title: "Global placement",
    anchor: "place",
    goal: "Minimise wirelength while forcing density under the ceiling. The two fight each other.",
    what:
      "Positions every cell to minimise wirelength while keeping density roughly even. Nets behave as springs " +
      "pulling connected cells together, and a density field pushes cells out of crowded bins. Cells are still " +
      "at arbitrary coordinates and may still overlap when this finishes.",
    optimises:
      "Half-perimeter wirelength, subject to bin density staying under a ceiling. Wirelength is the objective; " +
      "density is the constraint, and it is enforced by a force that grows until the constraint is met.",
    constrained:
      "The core boundary, the fixed IO pins on the die edge, and the density ceiling. Nothing else — the placer " +
      "has no notion of timing at this point.",
    metric:
      "HPWL, half-perimeter wirelength, is the sum over nets of their bounding-box half-perimeter — the standard " +
      "stand-in for routed length, because it is exact for two- and three-pin nets and costs almost nothing to " +
      "recompute. Overflow is the share of cell area sitting above target density.",
    why:
      "Watch the two numbers pull against each other. Minimising wirelength alone collapses the design onto a " +
      "single point, since zero wirelength is the optimum; spreading alone ignores connectivity entirely. What " +
      "you end up looking at is the compromise, and the fixed IO on the die edge is what gives it direction.",
    fails:
      "Spreading too hard, too early. Push the density force up to converge faster and every cell asks to move " +
      "outside the core, clamps to the boundary, and the design piles up along the edges.",
  },
  legalize: {
    title: "Legalisation",
    anchor: "legalize",
    goal: "Remove every overlap and snap to the grid, moving cells as little as possible.",
    what:
      "Snaps cells onto the row and site grid and removes every overlap while moving them as little as possible. " +
      "Cells are handled in order of increasing x; each is trial-fitted into its preferred row and a band of " +
      "neighbours, and goes wherever total displacement grows least. Cells forced against each other form " +
      "clusters that are positioned as a unit.",
    optimises:
      "Total displacement from the global placement, because displacement is what spends the quality the " +
      "previous stage bought. Wirelength is not optimised here — it is only paid.",
    constrained:
      "Legality is absolute, not a preference: no overlaps, every origin on a site, every cell inside a row.",
    metric:
      "Displacement is how far cells had to travel. The wirelength delta is the price of legality, and it is " +
      "expected to be positive.",
    why:
      "Global placement was solving a relaxed problem in which cells could overlap, so the wirelength it " +
      "reported was never actually achievable. A small positive delta here is the sign of a good global " +
      "placement — it means the answer was nearly legal already.",
    fails:
      "A tight core. Assigning in x order leaves each row with a gap too narrow to use, and a wide cell " +
      "arriving late finds every row short even though the free area added up is ample.",
  },
  cts: {
    title: "Clock tree synthesis",
    anchor: "cts",
    planned: true,
    goal: "Build the clock network so every flop is clocked at nearly the same instant.",
    what:
      "The clock reaches thousands of flip-flops, and until now it has been one net with an impossible fanout. " +
      "CTS replaces it with a tree of buffers and inverters, inserted and placed so the delay from the clock " +
      "source to each endpoint is as nearly equal as it can be made.",
    optimises:
      "Skew — the spread in arrival times across endpoints — and after that insertion delay, the absolute " +
      "latency from source to endpoint, plus the power the tree burns. Clock nets switch every cycle and are " +
      "routinely a large share of a chip's dynamic power.",
    constrained:
      "Legal placement for the buffers it inserts, and the space left over after the standard cells. It runs " +
      "after placement because delay depends on distance, and before routing, because the clock gets first " +
      "claim on routing resources.",
    why:
      "Skew is stolen directly from the setup timing budget of every path in the design, so a sloppy clock tree " +
      "makes every other stage's job harder. It is also the last stage that inserts significant new cells, " +
      "which is why the placement it is handed has to have room to spare.",
    fails:
      "Chasing zero skew regardless of cost, and paying for it in buffer count and clock power.",
  },
  groute: {
    title: "Global routing",
    anchor: "groute",
    planned: true,
    goal: "Plan a rough path for every net through a coarse grid, without overusing any region.",
    what:
      "Divides the core into a coarse grid of tiles and decides, for each net, which tiles it passes through " +
      "and roughly on which metal layers. No actual wire geometry yet — this is capacity planning.",
    optimises:
      "Total wirelength and via count, subject to no tile carrying more nets than it has tracks for. Congestion " +
      "is the number that matters, and the usual approach is rip-up and reroute: route everything, find the " +
      "overfull tiles, tear out the nets crossing them and route them again at a higher cost.",
    constrained:
      "Track capacity per tile per layer, and the preferred direction of each metal layer — layers alternate " +
      "horizontal and vertical so that crossings are possible at all.",
    why:
      "This is the stage that tells you whether the floorplan was honest. A design that placed beautifully at " +
      "high utilisation can turn out to be unroutable, and the fix is upstream: more area, or a placement that " +
      "was congestion-aware in the first place.",
    fails:
      "Congestion that cannot be relieved by rerouting, which sends you back to placement or floorplanning.",
  },
  droute: {
    title: "Detail routing",
    anchor: "droute",
    planned: true,
    goal: "Commit every net to real wires on real tracks, with no design-rule violations.",
    what:
      "Turns the global route's plan into actual metal: specific tracks, specific segments, specific vias, for " +
      "every net in the design. This is where a layout becomes manufacturable, and it is by a wide margin the " +
      "most computationally expensive stage in the flow.",
    optimises:
      "Getting to zero violations first, then wirelength, via count and yield-related preferences such as " +
      "avoiding minimum-width runs where a wider one is free.",
    constrained:
      "The design rules, which are numerous, non-local and unforgiving — spacing, minimum area, via enclosure, " +
      "end-of-line, and at modern nodes rules that depend on what is nearby for some distance.",
    why:
      "Everything before this was a model. The parasitic resistance and capacitance extracted from the real " +
      "geometry is what timing is finally signed off against, and it is common for a design that looked closed " +
      "on estimates to open back up here.",
    fails:
      "A handful of stubborn violations in one congested corner, each fix creating the next.",
  },
  sta: {
    title: "Static timing analysis",
    anchor: "sta",
    planned: true,
    goal: "Prove every path meets timing in every condition, without simulating anything.",
    what:
      "Computes the arrival time of every signal at every pin and compares it against when it was required, " +
      "for all paths at once. Static means it never simulates: it makes no assumption about what data the " +
      "circuit will see, so it is exhaustive over inputs in a way simulation cannot be.",
    optimises:
      "Nothing by itself — STA is the measurement. What it produces is slack, required time minus arrival " +
      "time, and the two headline numbers are worst negative slack and total negative slack. Optimisation is " +
      "what the other stages do in response.",
    constrained:
      "Setup, which needs the data to arrive early enough, and hold, which needs it to arrive late enough. " +
      "The two pull in opposite directions, and both must hold across process, voltage and temperature corners.",
    why:
      "STA runs continuously through the flow, not once at the end — after synthesis on estimates, after " +
      "placement on better ones, and after routing on extracted parasitics. Timing closure is the loop of " +
      "measuring, fixing and re-measuring, and it is where most of the schedule on a real chip actually goes.",
    fails:
      "Fixing a setup violation by slowing a path down and opening a hold violation somewhere else.",
  },
};

export const PLANNED_NOTE =
  "Clock tree synthesis, routing and timing analysis are the next stages to build. The data model already " +
  "carries what they need: nets know their driver, the library carries capacitance and drive resistance, and " +
  "the technology defines routing layers with preferred directions. Every chip in the bar above explains " +
  "itself — the greyed ones included — and there is a longer primer at /eda/guide/.";

/* ------------------------------------------------------------------ */
/* stage pipeline                                                      */
/* ------------------------------------------------------------------ */

/**
 * The pipeline chips. Stages this app runs are live; the ones before and after
 * it are dashed and dimmed but still carry a `?`, because "what is CTS" is a
 * question the greyed chips provoke and refusing to answer it would be a
 * strange choice.
 */
export function createStageBar(root, { upstream = [], stages, planned = [], onInfo }) {
  const chip = (s, kind) => {
    const live = kind === "live";
    const note = kind === "upstream" ? "upstream" : "planned";
    return `
      <div class="stage${live ? "" : " stage-planned"}"
           ${live ? `data-stage="${esc(s.id)}" data-status="idle"` : 'data-status="planned"'}
           ${live ? "" : 'title="Explained here, but not run by this app"'}>
        <span class="stage-dot"></span>
        <span class="stage-body">
          <span class="stage-label">${esc(s.label)}</span>
          <span class="stage-metric"${live ? ` data-metric="${esc(s.id)}"` : ""}>${live ? "" : note}</span>
        </span>
        <button class="stage-info" type="button" data-info="${esc(s.id)}"
                aria-label="What does ${esc(s.label)} do?">?</button>
      </div>`;
  };

  root.innerHTML =
    upstream.map((s) => chip(s, "upstream")).join("") +
    stages.map((s) => chip(s, "live")).join("") +
    planned.map((s) => chip(s, "planned")).join("");

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
  const para = (tag, text) => (text ? `<p><span class="explain-tag">${tag}</span>${esc(text)}</p>` : "");

  return {
    show(id) {
      const e = EXPLAINERS[id];
      if (!e) return;
      root.hidden = false;
      root.innerHTML = `
        <div class="explain-head">
          <div>
            <h3>${esc(e.title)}</h3>
            ${e.planned ? '<span class="explain-badge">not run in this demo</span>' : ""}
          </div>
          <button class="explain-close" type="button" aria-label="Close">&times;</button>
        </div>
        ${para("What it does", e.what)}
        ${para("What it optimises", e.optimises)}
        ${para("What constrains it", e.constrained)}
        ${para("The numbers", e.metric)}
        ${para("Why it matters", e.why)}
        ${para("How it goes wrong", e.fails)}
        <a class="explain-more" href="/eda/guide/#${esc(e.anchor || id)}">
          Read this in the primer &rarr;
        </a>`;
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
/* live objective strip                                                */
/* ------------------------------------------------------------------ */

/**
 * The caption under the stage bar: which stage is running, what it is trying
 * to achieve, and — while placement runs — the objective and the constraint as
 * live numbers with a direction.
 *
 * This exists because the interesting thing about global placement is not the
 * final number, it is watching wirelength climb while overflow falls and
 * understanding that the trade is deliberate. That story is invisible if the
 * only way to read it is a metrics table that settles a second later.
 */
export function createFocusStrip(root) {
  const arrow = (delta) => (delta < -1e-9 ? "falling" : delta > 1e-9 ? "rising" : "flat");

  return {
    setStage(id, { label = "" } = {}) {
      const e = EXPLAINERS[id];
      root.hidden = false;
      root.dataset.stage = id;
      root.querySelector(".focus-stage").textContent = e ? e.title : label || id;
      root.querySelector(".focus-goal").textContent = e && e.goal ? e.goal : "";
    },

    /** gauges: [{ role, label, value, trend, note }] — role tags the colour. */
    setGauges(gauges) {
      root.querySelector(".focus-gauges").innerHTML = gauges
        .map(
          (g) => `<span class="gauge gauge-${esc(g.role)}">
            <span class="gauge-label">${esc(g.label)}</span>
            <span class="gauge-value">${esc(g.value)}</span>
            ${g.trend ? `<span class="gauge-trend gauge-${esc(arrow(g.trend))}"></span>` : ""}
            ${g.note ? `<span class="gauge-note">${esc(g.note)}</span>` : ""}
          </span>`
        )
        .join("");
    },

    clearGauges() {
      root.querySelector(".focus-gauges").innerHTML = "";
    },

    reset() {
      // Unhidden even when idle. If the strip only appeared once a stage was
      // running it would shorten the canvas mid-run, and the frame between the
      // resize and the redraw is a blank canvas.
      root.hidden = false;
      root.dataset.stage = "";
      root.querySelector(".focus-stage").textContent = "Idle";
      root.querySelector(".focus-goal").textContent = "Press Run to walk the design through the flow.";
      this.clearGauges();
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
