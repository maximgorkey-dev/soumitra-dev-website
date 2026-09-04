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

const state = {
  algorithm: null,
  frames: [],
  index: 0,
  timer: null,
  view: null,
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

  const makeView = VIEWS[alg.structure.kind];
  if (!makeView) {
    toast(`no renderer for structure kind "${alg.structure.kind}"`, true);
    return;
  }
  state.view = makeView(el("viz-stage"));
  state.view.setStructure(alg.structure);

  try {
    state.frames = record(alg.run(alg.structure));
  } catch (err) {
    state.frames = [];
    toast(err.message, true);
    return;
  }

  el("scrub").max = String(Math.max(0, state.frames.length - 1));
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
      for (const name of ["explain", "code", "analysis"]) {
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
