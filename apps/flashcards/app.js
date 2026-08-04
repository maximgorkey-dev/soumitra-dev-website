/* Flash cards — static SPA. Progress is stored per signed-in user in localStorage. */

const STORE_PREFIX = "fc:v1";
const NEW_CARDS_PER_SESSION = 20;
const MAX_INTERVAL_DAYS = 730;
const MIN_EASE = 1.3;
const MATURE_INTERVAL = 21;

let userKey = "local";
let decks = [];
let session = null;

/* ---------- storage ---------- */

const storeKey = (deckId) => `${STORE_PREFIX}:${userKey}:${deckId}`;

function loadProgress(deckId) {
  try {
    return JSON.parse(localStorage.getItem(storeKey(deckId))) || {};
  } catch {
    return {};
  }
}

function saveProgress(deckId, progress) {
  try {
    localStorage.setItem(storeKey(deckId), JSON.stringify(progress));
  } catch {
    /* quota or private mode — reviews still work for this session */
  }
}

/* ---------- dates ---------- */

const todayISO = () => new Date().toISOString().slice(0, 10);

function addDaysISO(days) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/* ---------- scheduling (SM-2, simplified) ---------- */

function schedule(prev, grade) {
  let reps = prev?.reps ?? 0;
  let ease = prev?.ease ?? 2.5;
  let interval = prev?.interval ?? 0;
  let lapses = prev?.lapses ?? 0;

  if (grade === "again") {
    reps = 0;
    lapses += 1;
    ease = Math.max(MIN_EASE, ease - 0.2);
    interval = 0;
  } else if (grade === "hard") {
    ease = Math.max(MIN_EASE, ease - 0.15);
    interval = reps === 0 ? 1 : Math.max(1, Math.round(interval * 1.2));
    reps += 1;
  } else if (grade === "good") {
    if (reps === 0) interval = 1;
    else if (reps === 1) interval = 3;
    else interval = Math.max(1, Math.round(interval * ease));
    reps += 1;
  } else {
    ease += 0.15;
    if (reps === 0) interval = 2;
    else if (reps === 1) interval = 5;
    else interval = Math.max(1, Math.round(interval * ease * 1.3));
    reps += 1;
  }

  interval = Math.min(interval, MAX_INTERVAL_DAYS);
  return { reps, ease, interval, lapses, due: addDaysISO(interval) };
}

/* ---------- deck stats ---------- */

function deckStats(deck) {
  const progress = loadProgress(deck.id);
  const today = todayISO();
  let due = 0;
  let fresh = 0;
  let learned = 0;

  for (const card of deck.cards) {
    const st = progress[card.id];
    if (!st) fresh += 1;
    else {
      if (st.due <= today) due += 1;
      if (st.interval >= MATURE_INTERVAL) learned += 1;
    }
  }
  return { due, fresh, learned, total: deck.cards.length };
}

/* ---------- rendering helpers ---------- */

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* Allows `inline code` and line breaks in card text. */
function renderText(s) {
  return escapeHTML(s)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\n/g, "<br />");
}

const el = (id) => document.getElementById(id);

function showView(name) {
  for (const v of ["decks", "study", "done"]) el(`view-${v}`).hidden = v !== name;
}

/* ---------- deck list ---------- */

function renderDeckList() {
  const list = el("deck-list");
  list.innerHTML = "";

  if (!decks.length) {
    list.innerHTML = '<p class="deck-empty">No decks found.</p>';
    return;
  }

  for (const deck of decks) {
    const s = deckStats(deck);
    const studyable = s.due + s.fresh > 0;

    const card = document.createElement("div");
    card.className = "deck-card";
    card.innerHTML = `
      <h2>${escapeHTML(deck.name)}</h2>
      <p class="deck-desc">${escapeHTML(deck.description || "")}</p>
      <div class="deck-stats">
        <span class="stat stat-due">${s.due} due</span>
        <span class="stat stat-new">${s.fresh} new</span>
        <span class="stat stat-learned">${s.learned} learned</span>
        <span class="stat">${s.total} total</span>
      </div>
      <div class="deck-actions">
        <button class="app-btn app-btn-primary app-btn-sm" data-study="${escapeHTML(deck.id)}" ${studyable ? "" : "disabled"}>
          ${studyable ? "Study" : "All caught up"}
        </button>
        <button class="app-btn app-btn-ghost app-btn-sm" data-reset="${escapeHTML(deck.id)}">Reset progress</button>
      </div>`;
    list.appendChild(card);
  }

  list.querySelectorAll("[data-study]").forEach((b) =>
    b.addEventListener("click", () => startSession(b.dataset.study))
  );
  list.querySelectorAll("[data-reset]").forEach((b) =>
    b.addEventListener("click", () => {
      const deck = decks.find((d) => d.id === b.dataset.reset);
      if (confirm(`Reset all progress for "${deck.name}"? This cannot be undone.`)) {
        localStorage.removeItem(storeKey(deck.id));
        renderDeckList();
      }
    })
  );
}

/* ---------- session ---------- */

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function startSession(deckId) {
  const deck = decks.find((d) => d.id === deckId);
  if (!deck) return;

  const progress = loadProgress(deckId);
  const today = todayISO();
  const due = [];
  const fresh = [];

  for (const card of deck.cards) {
    const st = progress[card.id];
    if (!st) fresh.push(card);
    else if (st.due <= today) due.push(card);
  }

  const queue = shuffle(due).concat(shuffle(fresh).slice(0, NEW_CARDS_PER_SESSION));
  if (!queue.length) return;

  session = { deck, progress, queue, done: 0, planned: queue.length, again: 0, revealed: false };
  el("study-deck-name").textContent = deck.name;
  showView("study");
  renderCard();
}

function renderCard() {
  const card = session.queue[0];
  session.revealed = false;

  el("card-front").innerHTML = renderText(card.front);
  el("card-back").innerHTML = renderText(card.back);
  el("card-back-wrap").hidden = true;
  el("card-divider").hidden = true;
  el("btn-reveal").hidden = false;
  el("grade-row").hidden = true;

  const tags = el("card-tags");
  tags.innerHTML = (card.tags || []).map((t) => `<li>${escapeHTML(t)}</li>`).join("");

  el("study-counter").textContent = `${session.done} / ${session.planned} · ${session.queue.length} left`;
  el("progress-fill").style.width = `${(session.done / (session.done + session.queue.length)) * 100}%`;
}

function reveal() {
  if (session.revealed) return;
  session.revealed = true;
  el("card-back-wrap").hidden = false;
  el("card-divider").hidden = false;
  el("btn-reveal").hidden = true;
  el("grade-row").hidden = false;
}

function grade(g) {
  if (!session || !session.revealed) return;

  const card = session.queue.shift();
  session.progress[card.id] = schedule(session.progress[card.id], g);
  saveProgress(session.deck.id, session.progress);

  if (g === "again") {
    session.again += 1;
    session.queue.push(card); // see it again before the session ends
  } else {
    session.done += 1;
  }

  if (session.queue.length) renderCard();
  else finishSession();
}

function finishSession() {
  const { done, again, deck } = session;
  const s = deckStats(deck);
  el("done-summary").textContent =
    `You reviewed ${done} card${done === 1 ? "" : "s"} in "${deck.name}"` +
    (again ? `, with ${again} marked Again.` : ".") +
    ` ${s.due + s.fresh} card${s.due + s.fresh === 1 ? "" : "s"} remain available today.`;
  showView("done");
  renderDeckList();
}

function exitSession() {
  session = null;
  renderDeckList();
  showView("decks");
}

/* ---------- events ---------- */

el("btn-reveal").addEventListener("click", reveal);
el("btn-exit").addEventListener("click", exitSession);
el("btn-back-decks").addEventListener("click", exitSession);
el("btn-again-deck").addEventListener("click", () => {
  const id = session?.deck.id;
  exitSession();
  if (id) startSession(id);
});
document.querySelectorAll("[data-grade]").forEach((b) =>
  b.addEventListener("click", () => grade(b.dataset.grade))
);

document.addEventListener("keydown", (e) => {
  if (el("view-study").hidden) return;
  if (e.key === " " || e.key === "Enter") {
    e.preventDefault();
    session.revealed ? grade("good") : reveal();
  } else if (e.key === "Escape") {
    exitSession();
  } else if (session.revealed && ["1", "2", "3", "4"].includes(e.key)) {
    grade({ 1: "again", 2: "hard", 3: "good", 4: "easy" }[e.key]);
  }
});

/* ---------- boot ---------- */

async function identify() {
  try {
    const r = await fetch("/oauth2/userinfo", { credentials: "same-origin" });
    if (!r.ok) return;
    const d = await r.json();
    if (d.email) {
      userKey = d.email;
      el("user-email").textContent = d.email;
    }
  } catch {
    /* not behind the proxy (e.g. local preview) — fall back to "local" */
  }
}

async function loadDecks() {
  const manifest = await fetch("decks/index.json", { cache: "no-cache" }).then((r) => {
    if (!r.ok) throw new Error(`decks/index.json returned ${r.status}`);
    return r.json();
  });

  const loaded = await Promise.all(
    manifest.decks.map(async (entry) => {
      const d = await fetch(`decks/${entry.file}`, { cache: "no-cache" }).then((r) => {
        if (!r.ok) throw new Error(`${entry.file} returned ${r.status}`);
        return r.json();
      });
      return {
        id: entry.id,
        name: d.name || entry.id,
        description: d.description || "",
        cards: (d.cards || []).map((c, i) => ({ ...c, id: c.id || `${entry.id}-${i}` })),
      };
    })
  );
  return loaded;
}

(async function init() {
  await identify();
  try {
    decks = await loadDecks();
    renderDeckList();
  } catch (err) {
    const p = el("load-error");
    p.textContent = `Could not load decks: ${err.message}`;
    p.hidden = false;
  }
})();
