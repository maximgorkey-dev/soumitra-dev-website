/**
 * Shell wiring.
 *
 * Holds no algorithm knowledge and no drawing code: it picks an entry from the
 * catalogue, records its trace once, and then playback is nothing more than an
 * index into that array. Because frames are snapshots, stepping backwards,
 * scrubbing and jumping to the end are all the same operation.
 */

import { ALGORITHMS, DEFAULT_ID, byId, grouped } from "./core/catalog.js";
import { record } from "./core/trace.js";
import { createGraphView } from "./views/graph.js";

const el = (id) => document.getElementById(id);

/** One renderer per structure kind. Arrays and trees join this map later. */
const VIEWS = { graph: createGraphView };

/** Which tab panels exist, in bar order. */
const PANELS = ["explain", "code", "analysis", "run"];

const state = {
  algorithm: null,
  frames: [],
  index: 0,
  timer: null,
  view: null,
  // "builtin" for the bundled JavaScript generator, "server" once a compiled
  // submission has replaced it. Worth surfacing: the player looks identical
  // either way, and which trace is on screen is not otherwise guessable.
  source: "builtin",
  running: false,
};

/* ------------------------------------------------------------------ */
/* catalogue                                                           */
/* ------------------------------------------------------------------ */

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function renderCatalog() {
  el("catalog").innerHTML = grouped()
    .map(
      (s) => `
      <div class="cat-section">
        <h2 class="cat-section-name">${esc(s.section)}</h2>
        ${s.topics
          .map(
            (t) => `
          <div class="cat-topic">
            <h3 class="cat-topic-name">${esc(t.topic)}</h3>
            ${t.items
              .map(
                (a) => `<button class="cat-item" type="button" data-alg="${esc(a.id)}">${esc(a.title)}</button>`
              )
              .join("")}
          </div>`
          )
          .join("")}
      </div>`
    )
    .join("");

  el("catalog")
    .querySelectorAll("[data-alg]")
    .forEach((b) => b.addEventListener("click", () => select(b.dataset.alg)));
}

function markSelected(id) {
  el("catalog")
    .querySelectorAll("[data-alg]")
    .forEach((b) => b.classList.toggle("cat-item-active", b.dataset.alg === id));
}

/* ------------------------------------------------------------------ */
/* loading an algorithm                                                */
/* ------------------------------------------------------------------ */

function select(id) {
  const alg = byId(id);
  if (!alg) return;

  stop();
  state.algorithm = alg;
  markSelected(id);
  window.location.hash = id;

  el("alg-topic").textContent = `${alg.section} · ${alg.topic}`;
  el("alg-title").textContent = alg.title;
  el("alg-blurb").textContent = alg.blurb;

  renderExplanation(alg);
  renderCode(alg);
  renderAnalysis(alg);
  renderRun(alg);

  const makeView = VIEWS[alg.structure.kind];
  if (!makeView) {
    toast(`no renderer for structure kind "${alg.structure.kind}"`, true);
    return;
  }
  state.view = makeView(el("viz-stage"));
  state.view.setStructure(alg.structure);

  loadBuiltinTrace(alg);
}

/** Record the bundled generator and hand it to the player. */
function loadBuiltinTrace(alg) {
  try {
    loadFrames(record(alg.run(alg.structure)), "builtin");
  } catch (err) {
    state.frames = [];
    toast(err.message, true);
  }
}

/**
 * Point the player at a set of frames. The only difference between a trace
 * produced by the bundled generator and one produced by a compiled submission
 * is where the array came from, which is the whole benefit of frames being
 * plain snapshots.
 */
function loadFrames(frames, source) {
  stop();
  state.frames = frames;
  state.source = source;
  el("scrub").max = String(Math.max(0, frames.length - 1));

  const badge = el("viz-source");
  badge.hidden = source !== "server";
  badge.textContent = source === "server" ? "your code" : "";

  goto(0);
}

function renderExplanation(alg) {
  el("panel-explain").innerHTML = alg.explanation.map((p) => `<p>${esc(p)}</p>`).join("");
}

function renderCode(alg) {
  el("panel-code").innerHTML = `
    <p class="panel-lead">
      Reference implementation in ${esc(alg.code.lang.toUpperCase())}. It is the same logic the
      visualisation runs, written the way you would actually write it.
    </p>
    <div class="code-block">
      <div class="code-head">
        <span class="code-lang">${esc(alg.code.lang)}</span>
        <button class="code-copy" type="button" id="btn-copy">copy</button>
      </div>
      <pre><code class="language-${esc(alg.code.lang)}">${esc(alg.code.source)}</code></pre>
    </div>`;

  const block = el("panel-code").querySelector("code");
  if (window.hljs) window.hljs.highlightElement(block);

  el("btn-copy").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(alg.code.source);
      toast("copied");
    } catch {
      toast("could not copy", true);
    }
  });
}

function renderAnalysis(alg) {
  const a = alg.analysis;
  el("panel-analysis").innerHTML = `
    <dl class="complexity">
      <div><dt>Time</dt><dd>${esc(a.time)}</dd></div>
      <div><dt>Space</dt><dd>${esc(a.space)}</dd></div>
    </dl>
    <ul class="analysis-notes">${a.notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>`;
}

/* ------------------------------------------------------------------ */
/* running a submission on the server                                  */
/* ------------------------------------------------------------------ */

function renderRun(alg) {
  const panel = el("panel-run");
  const spec = alg.editable;

  if (!spec) {
    panel.innerHTML = `<p class="panel-lead">This entry has no server-side runner yet.</p>`;
    return;
  }

  panel.innerHTML = `
    <p class="panel-lead">
      Edit the body of <code>solve()</code> and run it. It is compiled with g++ on the server and
      executed in a sandbox with no network access and hard memory and CPU ceilings. The frames it
      prints drive the same player above, so your version of the algorithm animates itself.
    </p>

    <p class="run-sig">
      <span>your statements run inside</span>
      <code>${esc(spec.signature)}</code>
      <span>— the harness supplies the includes, reads the graph, builds the trace and owns
      <code>main()</code></span>
    </p>

    <div class="code-block run-editor">
      <div class="code-head">
        <span class="code-lang">${esc(spec.lang)}</span>
        <span class="run-hint">Ctrl+Enter runs · Tab indents</span>
        <button class="code-copy" type="button" id="btn-run-reset">reset</button>
      </div>
      <textarea id="run-body" class="run-body" spellcheck="false" autocomplete="off"
                aria-label="Body of solve()"></textarea>
    </div>

    <div class="run-actions">
      <button class="app-btn app-btn-primary app-btn-sm" type="button" id="btn-run-go">Compile and run</button>
      <button class="app-btn app-btn-ghost app-btn-sm" type="button" id="btn-run-builtin">Restore built-in trace</button>
      <span class="run-status" id="run-status"></span>
    </div>

    <pre class="run-output" id="run-output" hidden></pre>

    <details class="run-api">
      <summary>What you can call</summary>
      <dl>
        <div><dt><code>g.n</code></dt><dd>vertex count; vertices are <code>0 … n-1</code></dd></div>
        <div><dt><code>g.edges</code></dt><dd><code>std::vector&lt;viz::Edge&gt;</code> with <code>.u .v .w</code>, in the order drawn</dd></div>
        <div><dt><code>g.edge_count()</code></dt><dd>number of edges</dd></div>
        <div><dt><code>g.label(v)</code></dt><dd>the letter on the circle, for note text</dd></div>
        <div><dt><code>t.edge(i, s)</code></dt><dd>state of edge <code>i</code>: <code>viz::IDLE</code>, <code>CANDIDATE</code>, <code>ACCEPTED</code>, <code>REJECTED</code></dd></div>
        <div><dt><code>t.components(v)</code></dt><dd>one group id per vertex; renumbered for the colour palette</dd></div>
        <div><dt><code>t.metric(l, v)</code></dt><dd>running total beside the picture; same label replaces its value</dd></div>
        <div><dt><code>t.emit(p, n, d)</code></dt><dd>write one frame: phase, note, optional detail</dd></div>
      </dl>
      <p>
        Already included, and the body must not add its own: <code>&lt;algorithm&gt;</code>
        <code>&lt;cmath&gt;</code> <code>&lt;cstdint&gt;</code> <code>&lt;functional&gt;</code>
        <code>&lt;limits&gt;</code> <code>&lt;map&gt;</code> <code>&lt;numeric&gt;</code>
        <code>&lt;queue&gt;</code> <code>&lt;set&gt;</code> <code>&lt;string&gt;</code>
        <code>&lt;tuple&gt;</code> <code>&lt;utility&gt;</code> <code>&lt;vector&gt;</code>.
      </p>
      <p>
        Nothing may be printed directly — <code>emit()</code> is the only writer of stdout. A run is
        capped at 2000 frames, 4 seconds of CPU and 256 MB, with no network access.
      </p>
    </details>`;

  const editor = el("run-body");
  editor.value = spec.starter;

  el("btn-run-go").addEventListener("click", runOnServer);
  el("btn-run-reset").addEventListener("click", () => {
    editor.value = spec.starter;
    setRunStatus("reset to the starting version");
  });
  el("btn-run-builtin").addEventListener("click", () => {
    loadBuiltinTrace(alg);
    setRunStatus("showing the built-in trace again");
  });

  editor.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      runOnServer();
      return;
    }
    // Without this, Tab leaves the editor, which is never what is meant while
    // typing code.
    if (e.key === "Tab") {
      e.preventDefault();
      const { selectionStart: a, selectionEnd: b, value } = editor;
      editor.value = `${value.slice(0, a)}    ${value.slice(b)}`;
      editor.selectionStart = editor.selectionEnd = a + 4;
    }
  });
}

function setRunStatus(text, isError = false) {
  const node = el("run-status");
  if (!node) return;
  node.textContent = text;
  node.classList.toggle("run-status-error", isError);
}

function showRunOutput(text) {
  const node = el("run-output");
  if (!node) return;
  node.hidden = !text;
  node.textContent = text || "";
}

async function runOnServer() {
  const alg = state.algorithm;
  if (!alg?.editable || state.running) return;

  const body = el("run-body").value;
  state.running = true;
  el("btn-run-go").disabled = true;
  setRunStatus("compiling…");
  showRunOutput("");

  try {
    const response = await fetch("/api/algorithms/run", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: alg.editable.topic,
        body,
        // The graph on screen is the graph the program is given, so the two
        // cannot drift apart and make the animation describe something else.
        nodes: alg.structure.nodes.map((n) => ({ id: n.id })),
        edges: alg.structure.edges.map((e) => ({ u: e.u, v: e.v, w: e.w })),
      }),
    });

    // Owner-only in nginx, which answers a signed-in non-owner with 404 rather
    // than admitting the route exists.
    if (response.status === 404) {
      setRunStatus("server-side runs are not enabled for this account", true);
      return;
    }

    const data = await response.json().catch(() => null);
    if (!data) {
      setRunStatus(`the server returned ${response.status} with no explanation`, true);
      return;
    }
    if (data.detail) {
      setRunStatus(data.detail, true);
      return;
    }

    // A program can fail after emitting usable frames — a timeout halfway
    // through, say — so show whatever it managed before reporting the failure.
    if (Array.isArray(data.frames) && data.frames.length) {
      loadFrames(data.frames, "server");
    }

    if (data.ok) {
      const { compile = 0, run = 0 } = data.timings || {};
      setRunStatus(`${data.frames.length} frames · compiled in ${compile}s, ran in ${run}s`);
      showRunOutput([data.warnings, data.note, data.diagnostics].filter(Boolean).join("\n"));
      toast(`ran your code — ${data.frames.length} frames`);
    } else {
      setRunStatus(data.message || `failed at the ${data.stage} step`, true);
      showRunOutput(data.diagnostics || "");
    }
  } catch (err) {
    setRunStatus(`could not reach the server: ${err.message}`, true);
  } finally {
    state.running = false;
    el("btn-run-go").disabled = false;
  }
}

/* ------------------------------------------------------------------ */
/* playback                                                            */
/* ------------------------------------------------------------------ */

function goto(i) {
  if (!state.frames.length) return;
  state.index = Math.max(0, Math.min(i, state.frames.length - 1));
  const f = state.frames[state.index];

  state.view.show(f);
  el("viz-phase").textContent = f.phase || "";
  el("viz-note").textContent = f.note || "";
  el("viz-detail").textContent = f.detail || "";
  el("viz-metrics").innerHTML = (f.metrics || [])
    .map(
      (m) => `<span class="metric-chip"><span>${esc(m.label)}</span><strong>${esc(m.value)}</strong></span>`
    )
    .join("");

  el("scrub").value = String(state.index);
  el("counter").textContent = `${state.index + 1} / ${state.frames.length}`;

  const atEnd = state.index >= state.frames.length - 1;
  el("btn-prev").disabled = state.index === 0;
  el("btn-first").disabled = state.index === 0;
  el("btn-next").disabled = atEnd;
  el("btn-last").disabled = atEnd;
  if (atEnd) stop();
}

function play() {
  if (state.timer) return;
  // Replaying from the start when already finished is what a viewer means by
  // pressing play on a finished animation.
  if (state.index >= state.frames.length - 1) goto(0);
  el("btn-play").textContent = "Pause";
  const tick = () => {
    if (state.index >= state.frames.length - 1) return stop();
    goto(state.index + 1);
    if (state.timer) state.timer = setTimeout(tick, Number(el("speed").value));
  };
  state.timer = setTimeout(tick, Number(el("speed").value));
}

function stop() {
  if (state.timer) clearTimeout(state.timer);
  state.timer = null;
  el("btn-play").textContent = "Play";
}

/* ------------------------------------------------------------------ */
/* small helpers                                                       */
/* ------------------------------------------------------------------ */

let toastTimer = null;
function toast(message, isError = false) {
  const node = el("toast");
  node.textContent = message;
  node.classList.toggle("app-toast-error", isError);
  node.classList.add("app-toast-show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove("app-toast-show"), isError ? 5000 : 2000);
}

function initControls() {
  el("btn-first").addEventListener("click", () => (stop(), goto(0)));
  el("btn-prev").addEventListener("click", () => (stop(), goto(state.index - 1)));
  el("btn-next").addEventListener("click", () => (stop(), goto(state.index + 1)));
  el("btn-last").addEventListener("click", () => (stop(), goto(state.frames.length - 1)));
  el("btn-play").addEventListener("click", () => (state.timer ? stop() : play()));
  el("scrub").addEventListener("input", () => (stop(), goto(Number(el("scrub").value))));

  document.querySelectorAll("[data-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-tab]").forEach((b) => b.classList.toggle("tab-active", b === btn));
      for (const name of PANELS) {
        el(`panel-${name}`).hidden = name !== btn.dataset.tab;
      }
    });
  });

  // Arrow keys are how anyone actually steps through an animation.
  document.addEventListener("keydown", (e) => {
    if (e.target.matches("input, textarea, select")) return;
    if (e.key === "ArrowRight") (stop(), goto(state.index + 1));
    else if (e.key === "ArrowLeft") (stop(), goto(state.index - 1));
    else if (e.key === " ") {
      e.preventDefault();
      state.timer ? stop() : play();
    }
  });
}

function boot() {
  renderCatalog();
  initControls();

  const fromHash = window.location.hash.slice(1);
  select(ALGORITHMS.some((a) => a.id === fromHash) ? fromHash : DEFAULT_ID);

  fetch("/api/me", { credentials: "same-origin" })
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      if (d && d.email) el("user-email").textContent = d.email;
    })
    .catch(() => {});
}

boot();
