/**
 * The interview-problem layer on top of the shared player.
 *
 * app.js calls mount() for every topic it selects on this page. A topic with a
 * `problem` gets the Problem and Solve tabs, a study / attempt-first switch and
 * a tier override. Choices are kept per problem in localStorage; nothing is sent
 * anywhere except the test program, to the same sandbox the other apps use.
 */

import { buildHarness, parseVerdicts } from "/apps/algorithms/core/leet-harness.js";

const DIFFICULTY = { E: "Easy", M: "Medium", H: "Hard" };
const TIERS = ["core", "stretch", "rare"];

const store = {
  get: (k, d = null) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
};
const revealed = new Set();

export const tierOf = (alg) => store.get(`leet-tier:${alg.id}`, alg.problem?.tier || "core");

let api = null;

export function mount(alg, shell) {
  api = shell;
  if (!alg.problem) return;
  const study = !alg.problem.tests;
  document.body.classList.toggle("leet-study", study);
  if (study) {
    api.el("leet-mode").innerHTML = "";
    api.el("panel-solve").innerHTML = "";
  } else {
    renderMode(alg);
  }
  renderProblem(alg);
  if (!study) renderSolve(alg);
  applyMode(alg);
  api.showTab("problem");
}

/* ------------------------------------------------------------------ */
/* study or attempt first                                              */
/* ------------------------------------------------------------------ */

const modeOf = (alg) => store.get(`leet-mode:${alg.id}`, store.get("leet-mode", "study"));
const hidden = (alg) => !!alg.problem.tests && modeOf(alg) === "attempt" && !revealed.has(alg.id);

function renderMode(alg) {
  const box = api.el("leet-mode");
  const mode = modeOf(alg);
  box.innerHTML = `
    <div class="leet-switch" role="group" aria-label="Mode">
      <button type="button" data-mode="study" class="${mode === "study" ? "on" : ""}">Study</button>
      <button type="button" data-mode="attempt" class="${mode === "attempt" ? "on" : ""}">Attempt first</button>
    </div>`;
  box.querySelectorAll("[data-mode]").forEach((b) =>
    b.addEventListener("click", () => {
      store.set(`leet-mode:${alg.id}`, b.dataset.mode);
      store.set("leet-mode", b.dataset.mode);
      revealed.delete(alg.id);
      renderMode(alg);
      renderProblem(alg);
      renderSolve(alg);
      applyMode(alg);
    })
  );
}

function applyMode(alg) {
  const hide = hidden(alg);
  document.body.classList.toggle("leet-attempt", hide);
  const active = document.querySelector(".tab-active")?.dataset.tab;
  if (hide && !["problem", "solve"].includes(active)) api.showTab("problem");
}

function reveal(alg, why) {
  if (!hidden(alg)) return;
  revealed.add(alg.id);
  renderProblem(alg);
  renderSolve(alg, true);
  applyMode(alg);
  if (why) api.toast(why);
}

/* ------------------------------------------------------------------ */
/* problem tab                                                         */
/* ------------------------------------------------------------------ */

function renderProblem(alg) {
  const p = alg.problem;
  const { esc, inline } = api;
  const hide = hidden(alg);
  const tier = tierOf(alg);
  const hints = p.hints || [];
  // Study pages have no attempt mode, so their hints always unfold one at a time.
  const hintsShown = hide || p.study ? Number(store.get(`leet-hints:${alg.id}`, "0")) : hints.length;
  const paras = (x, cls = "") => [].concat(x || []).map((s) => `<p${cls ? ` class="${cls}"` : ""}>${inline(s)}</p>`).join("");
  const list = (h, items) => (items?.length ? `<h3 class="ex-h">${h}</h3><ul class="ex-list">${items.map((t) => `<li>${inline(t)}</li>`).join("")}</ul>` : "");

  api.el("panel-problem").innerHTML = `
    <div class="leet-meta">
      <span class="leet-diff leet-diff-${esc(p.difficulty)}">${esc(DIFFICULTY[p.difficulty] || p.difficulty)}</span>
      <label class="leet-tier">tier
        <select class="app-select app-select-sm" id="leet-tier">
          ${TIERS.map((t) => `<option value="${t}" ${t === tier ? "selected" : ""}>${t}</option>`).join("")}
        </select>
        ${tier !== p.tier ? `<span class="leet-override">yours; default ${esc(p.tier)}</span>` : ""}
      </label>
      <span class="leet-tag">${esc(p.pattern)}</span>
      ${(p.themes || []).map((t) => `<span class="leet-tag leet-theme">${esc(t)}</span>`).join("")}
      <a class="app-btn app-btn-ghost app-btn-sm leet-open" href="https://leetcode.com/problems/${esc(p.slug)}/"
         target="_blank" rel="noopener noreferrer">Open on LeetCode ↗</a>
    </div>
    ${p.see
      ? `<p class="leet-see">No animation for this one. <a href="#lc-${esc(p.see)}">${esc(p.see)}</a> animates the same pattern.</p>`
      : ""}

    <h3 class="ex-h">The problem, in brief</h3>
    ${p.statement.map((s) => `<p>${inline(s)}</p>`).join("")}
    ${list("Concepts that come together", p.concepts)}

    ${hints.length ? `<h3 class="ex-h">Hints</h3>
    <ol class="leet-hints">
      ${hints.slice(0, hintsShown).map((h) => `<li>${inline(h)}</li>`).join("")}
    </ol>` : ""}
    ${hintsShown < hints.length
      ? `<button class="app-btn app-btn-ghost app-btn-sm" type="button" id="leet-hint">Show hint ${hintsShown + 1} of ${hints.length}</button>`
      : ""}

    ${hide
      ? `<div class="leet-locked">
           <p>The brute force, the invariant, the traps and the walkthrough unlock when your solution passes
           every test, or whenever you choose.</p>
           <button class="app-btn app-btn-ghost app-btn-sm" type="button" id="leet-reveal">Reveal everything</button>
         </div>`
      : `
    ${p.brute ? `<h3 class="ex-h">Brute force, and where it breaks</h3>${paras(p.brute)}` : ""}
    ${p.invariant ? `<h3 class="ex-h">The invariant</h3>${paras(p.invariant, "ex-tip")}` : ""}
    ${list("Traps", p.traps)}
    ${list("Follow-ups an L6 interviewer may ask", p.followUps)}`}`;

  api.el("leet-tier").addEventListener("change", (e) => {
    store.set(`leet-tier:${alg.id}`, e.target.value);
    renderProblem(alg);
    api.refreshCatalog?.();
  });
  api.el("leet-hint")?.addEventListener("click", () => {
    store.set(`leet-hints:${alg.id}`, String(hintsShown + 1));
    renderProblem(alg);
  });
  api.el("leet-reveal")?.addEventListener("click", () => reveal(alg));
}

/* ------------------------------------------------------------------ */
/* solve tab                                                           */
/* ------------------------------------------------------------------ */

function renderSolve(alg, keepResults = false) {
  const t = alg.problem.tests;
  const panel = api.el("panel-solve");
  const prior = keepResults ? api.el("leet-results")?.innerHTML || "" : "";
  const draftKey = `leet-draft:${alg.id}`;

  panel.innerHTML = `
    <p class="panel-lead">
      Write the LeetCode-shaped <code>class Solution</code>. It is compiled with g++ (C++20, -O1) in the
      sandbox and checked against the reference on ${t.cases.length} named cases${t.random ? `, ${t.random.count} hidden random cases` : ""}${t.stress ? ` and one large stress input` : ""}.
      <code>&lt;bits/stdc++.h&gt;</code> and <code>using namespace std</code> are already in place. The CPU limit is 4 seconds.
    </p>
    <div class="code-block run-editor">
      <div class="code-head">
        <span class="code-lang">solution.cpp</span>
        <span class="run-hint">Ctrl+Enter runs · Tab indents · your draft is kept in this browser</span>
      </div>
      <textarea id="leet-code" class="run-body run-body-tall" spellcheck="false" autocomplete="off"
                aria-label="Your solution"></textarea>
    </div>
    <div class="run-actions">
      <button class="app-btn app-btn-primary app-btn-sm" type="button" id="leet-run">Run tests</button>
      <button class="app-btn app-btn-ghost app-btn-sm" type="button" id="leet-starter">Reset to the starter</button>
      ${t.brute ? `<button class="app-btn app-btn-ghost app-btn-sm" type="button" id="leet-brute">Load the brute force</button>` : ""}
      ${hidden(alg) ? "" : `<button class="app-btn app-btn-ghost app-btn-sm" type="button" id="leet-ref">Load the reference</button>`}
      <span class="run-status" id="leet-status"></span>
    </div>
    <div id="leet-results">${prior}</div>`;

  const editor = api.el("leet-code");
  editor.value = store.get(draftKey, t.starter);
  editor.addEventListener("input", () => store.set(draftKey, editor.value));
  const load = (src, msg) => { editor.value = src; store.set(draftKey, src); status(msg); };
  api.el("leet-starter").addEventListener("click", () => load(t.starter, "back to the starter"));
  api.el("leet-brute")?.addEventListener("click", () => load(t.brute, "brute force loaded: run it to see where it breaks"));
  api.el("leet-ref")?.addEventListener("click", () => load(t.reference, "reference loaded"));
  api.el("leet-run").addEventListener("click", () => runTests(alg));
  editor.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); runTests(alg); return; }
    if (e.key === "Tab") {
      e.preventDefault();
      const { selectionStart: a, selectionEnd: b, value } = editor;
      editor.value = `${value.slice(0, a)}    ${value.slice(b)}`;
      editor.selectionStart = editor.selectionEnd = a + 4;
      store.set(draftKey, editor.value);
    }
  });

  function status(text, bad = false) {
    const s = api.el("leet-status");
    s.textContent = text;
    s.classList.toggle("run-status-error", bad);
  }
}

let running = false;

async function runTests(alg) {
  if (running) return;
  const t = alg.problem.tests;
  const code = api.el("leet-code").value;
  const source = buildHarness(t, code);
  const userLine = source.split("\n").indexOf("// ---------------------------------------------------------------- your code") + 2;
  const status = (text, bad = false) => {
    const s = api.el("leet-status");
    s.textContent = text;
    s.classList.toggle("run-status-error", bad);
  };
  const results = api.el("leet-results");
  const { esc } = api;

  running = true;
  api.el("leet-run").disabled = true;
  status("compiling…");
  results.innerHTML = "";
  try {
    const r = await fetch("/api/algorithms/program", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source }),
    });
    if (r.status === 404) return status("server-side runs are not enabled for this account", true);
    const data = await r.json().catch(() => null);
    if (!data) return status(`the server returned ${r.status} with no explanation`, true);
    if (data.detail) return status(typeof data.detail === "string" ? data.detail : "the request was refused", true);

    if (data.stage === "compile" && !data.ok) {
      // Diagnostics name harness lines; shift them so line 1 is the first line of your code.
      const lines = code.split("\n").length;
      const shift = (l) => Number(l) - userLine + 1;
      const diag = String(data.diagnostics || "")
        .replace(/line (\d+):(\d+):/g, (m, l, c) => (shift(l) >= 1 && shift(l) <= lines ? `line ${shift(l)}:${c}:` : "harness:"))
        .replace(/^(\s*)(\d+)( \|)/gm, (m, sp, l, bar) => `${sp}${shift(l) >= 1 && shift(l) <= lines ? shift(l) : "-"}${bar}`);
      status("did not compile", true);
      results.innerHTML = `<pre class="run-output">${esc(diag)}</pre>`;
      return;
    }

    const { rows, done } = parseVerdicts(data.stdout);
    const failed = rows.filter((x) => x.verdict !== "pass").length;
    results.innerHTML = `
      <ul class="leet-verdicts">
        ${rows.map((x) => `<li class="leet-${x.verdict}"><span>${x.verdict === "pass" ? "✓" : x.verdict === "fail" ? "✗" : "⏱"}</span>${esc(x.text)}</li>`).join("")}
      </ul>
      ${!data.ok ? `<pre class="run-output">${esc([data.message, data.stderr].filter(Boolean).join("\n"))}</pre>` : ""}`;

    const { compile = 0, run = 0 } = data.timings || {};
    const allPassed = data.ok && done && !failed && done.split("/")[0] === done.split("/")[1];
    if (allPassed) {
      reveal(alg, "every test passed: the walkthrough is unlocked");
      status(`all ${done.split("/")[1]} checks passed · compiled in ${compile}s, ran in ${run}s`);
    } else {
      status(done ? `${done} checks passed` : data.message || `stopped at the ${data.stage} step`, true);
    }
  } catch (err) {
    status(`could not reach the server: ${err.message}`, true);
  } finally {
    running = false;
    const b = api.el("leet-run");
    if (b) b.disabled = false;
  }
}