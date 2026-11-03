/**
 * Every problem in the catalogue, filterable by technique or theme, tier (with
 * your override), difficulty and release year. Data comes from catalog-data.js,
 * which tools/leet-catalog.mjs generates from CATALOG.md. Your overrides and
 * ticks live in localStorage under the same keys the walkthrough pages use.
 */

import { FAMILIES, THEMES, PROBLEMS, BUILT, ANIMATED } from "/apps/leet/catalog-data.js";

const el = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const store = {
  get: (k, d = null) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } },
  set: (k, v) => { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} },
};

const TIERS = ["core", "stretch", "rare"];
const DIFFS = { E: "Easy", M: "Medium", H: "Hard" };
const BUILT_SET = new Set(BUILT);
const ANIMATED_SET = new Set(ANIMATED);
const PATTERN = new Map(FAMILIES.flatMap((f) => f.patterns.map((p) => [p.id, p])));

/* LeetCode numbers follow release order; boundaries from the catalogue's table. */
const YEARS = [[450, 2016], [800, 2017], [1000, 2018], [1300, 2019], [1700, 2020], [2100, 2021], [2500, 2022], [3000, 2023], [3400, 2024]];
const yearOf = (n) => (YEARS.find(([lim]) => n < lim) || [0, 2025])[1];

const defaultTier = (n) => PROBLEMS[n]?.tier || PATTERN.get(PROBLEMS[n]?.pattern)?.tier || "core";
const tierOf = (n) => store.get(`leet-tier:lc-${n}`, defaultTier(n));
const done = (n) => store.get(`leet-done:${n}`) === "1";

const saved = JSON.parse(store.get("leet-browse", "{}"));
const f = {
  view: saved.view || "tech",
  sort: saved.sort || "ladder",
  tiers: new Set(saved.tiers || ["core"]),
  diffs: new Set(saved.diffs || ["M", "H"]),
  year: saved.year || 0,
  q: "",
  hideDone: !!saved.hideDone,
  built: !!saved.built,
};
const save = () => store.set("leet-browse", JSON.stringify({ ...f, tiers: [...f.tiers], diffs: [...f.diffs], q: undefined }));

function visible(n) {
  const p = PROBLEMS[n];
  const q = f.q.trim().toLowerCase();
  if (q && !(String(n) === q || (p && (p.title.toLowerCase().includes(q) || p.pattern.toLowerCase() === q)))) return false;
  if (!p) return !q && f.tiers.size === TIERS.length && f.diffs.size === 3 && !f.year && !f.built && !(f.hideDone && done(n));
  if (!f.tiers.has(tierOf(n)) || !f.diffs.has(p.d)) return false;
  if (f.year && yearOf(n) < f.year) return false;
  if (f.hideDone && done(n)) return false;
  if (f.built && !BUILT_SET.has(n)) return false;
  return true;
}

const order = (nums) => (f.sort === "new" ? [...nums].sort((a, b) => b - a) : nums);

function row(n, { showPattern = false } = {}) {
  const p = PROBLEMS[n];
  if (!p) {
    return `<li class="lb-item"><span class="lb-num">${n}</span>
      <a class="lb-title" href="https://leetcode.com/problemset/?search=${n}" target="_blank" rel="noopener noreferrer">LeetCode ${n}</a>
      <span class="lb-dim">not placed in a technique yet</span></li>`;
  }
  const t = tierOf(n);
  return `<li class="lb-item${done(n) ? " lb-done" : ""}">
    <input type="checkbox" class="lb-tick" data-done="${n}" ${done(n) ? "checked" : ""} aria-label="Done" />
    <span class="lb-num">${n}</span>
    <a class="lb-title" href="https://leetcode.com/problems/${esc(p.slug)}/" target="_blank" rel="noopener noreferrer">${esc(p.title)}</a>
    ${p.canonical ? `<span class="lb-star" title="The pattern's canonical problem">★</span>` : ""}
    <span class="leet-diff leet-diff-${p.d}">${DIFFS[p.d]}</span>
    ${p.premium ? `<span class="leet-tag" title="Premium">P</span>` : ""}
    <span class="lb-dim">${yearOf(n) >= 2025 ? "2025+" : yearOf(n)}</span>
    ${showPattern ? `<span class="leet-tag">${esc(p.pattern)}</span>` : ""}
    <select class="lb-tier${t !== defaultTier(n) ? " lb-tier-own" : ""}" data-tier="${n}" aria-label="Tier">
      ${TIERS.map((x) => `<option ${x === t ? "selected" : ""}>${x}</option>`).join("")}
    </select>
    ${ANIMATED_SET.has(n) ? `<a class="app-btn app-btn-primary app-btn-sm lb-open" href="/apps/leet/#lc-${n}">Walkthrough</a>`
      : BUILT_SET.has(n) ? `<a class="app-btn app-btn-ghost app-btn-sm lb-open" href="/apps/leet/#lc-${n}" title="Explanation, solution and tests, without an animation">Page</a>` : ""}
  </li>`;
}

function renderTech() {
  let shown = 0;
  const html = FAMILIES.map((fam) => {
    const pats = fam.patterns.map((pat) => {
      const nums = order(pat.problems).filter(visible);
      shown += nums.length;
      if (!nums.length) return "";
      return `<div class="lb-pattern">
        <h3><span class="leet-tag">${esc(pat.id)}</span> ${esc(pat.name)} <span class="lb-dim">${esc(pat.tier)}</span></h3>
        ${pat.insight ? `<p class="lb-insight">${esc(pat.insight[0].toUpperCase() + pat.insight.slice(1))}</p>` : ""}
        <ul class="lb-items">${nums.map((n) => row(n)).join("")}</ul>
      </div>`;
    }).join("");
    return pats ? `<details class="lb-family" open><summary>${esc(fam.id)}. ${esc(fam.name)}</summary>${pats}</details>` : "";
  }).join("");
  return [html, shown];
}

function renderThemes() {
  let shown = 0;
  const html = THEMES.map((th) => {
    const groups = th.groups.map((g) => {
      const nums = order(g.nums).filter(visible);
      shown += nums.length;
      return nums.length ? `<div class="lb-pattern"><h3>${esc(g.label)}</h3><ul class="lb-items">${nums.map((n) => row(n, { showPattern: true })).join("")}</ul></div>` : "";
    }).join("");
    return groups ? `<details class="lb-family" open><summary>${esc(th.id)}. ${esc(th.name)}</summary>${groups}</details>` : "";
  }).join("");
  return [html, shown];
}

function render() {
  for (const [id, key] of [["f-view", "view"], ["f-sort", "sort"]]) {
    el(id).querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.v === f[key]));
  }
  el("f-tier").innerHTML = TIERS.map((t) => `<button type="button" class="lb-chip${f.tiers.has(t) ? " on" : ""}" data-t="${t}">${t}</button>`).join("");
  el("f-diff").innerHTML = Object.entries(DIFFS).map(([k, v]) => `<button type="button" class="lb-chip${f.diffs.has(k) ? " on" : ""}" data-d="${k}">${v}</button>`).join("");
  el("f-year").value = String(f.year);
  el("f-done").checked = f.hideDone;
  el("f-built").checked = f.built;

  const [html, shown] = f.view === "tech" ? renderTech() : renderThemes();
  el("lb-list").innerHTML = html || `<p class="lb-dim">Nothing matches these filters.</p>`;
  const total = Object.keys(PROBLEMS).length;
  const nDone = Object.keys(PROBLEMS).filter(done).length;
  el("lb-summary").textContent = `${shown} shown${f.view === "theme" ? " (a problem can appear under several themes)" : ""} of ${total} problems in ${PATTERN.size} patterns · ${nDone} done · ${BUILT.length} with a page, ${ANIMATED.length} of them animated.`;
}

function wire() {
  for (const [id, key] of [["f-view", "view"], ["f-sort", "sort"]]) {
    el(id).addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (b) { f[key] = b.dataset.v; save(); render(); }
    });
  }
  const toggle = (set, v) => (set.has(v) ? set.delete(v) : set.add(v));
  el("f-tier").addEventListener("click", (e) => { const b = e.target.closest("[data-t]"); if (b) { toggle(f.tiers, b.dataset.t); save(); render(); } });
  el("f-diff").addEventListener("click", (e) => { const b = e.target.closest("[data-d]"); if (b) { toggle(f.diffs, b.dataset.d); save(); render(); } });
  el("f-year").addEventListener("change", (e) => { f.year = Number(e.target.value); save(); render(); });
  el("f-done").addEventListener("change", (e) => { f.hideDone = e.target.checked; save(); render(); });
  el("f-built").addEventListener("change", (e) => { f.built = e.target.checked; save(); render(); });
  el("f-q").addEventListener("input", (e) => { f.q = e.target.value; render(); });

  el("lb-list").addEventListener("change", (e) => {
    const d = e.target.dataset;
    if (d.done) { store.set(`leet-done:${d.done}`, e.target.checked ? "1" : null); render(); }
    if (d.tier) {
      const n = Number(d.tier);
      store.set(`leet-tier:lc-${n}`, e.target.value === defaultTier(n) ? null : e.target.value);
      render();
    }
  });
}

wire();
render();
