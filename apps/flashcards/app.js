/* Flash cards front end. All content and scheduling live in the API. */

const NEW_PER_SESSION = 20;

let decks = [];
let manageDeck = null;
let manageCards = [];
let session = null;

/* ---------- views ---------- */

function showView(name) {
  for (const v of ["decks", "manage", "study", "done"]) el(`view-${v}`).hidden = v !== name;
}

/* ---------- deck list ---------- */

async function refreshDecks() {
  const data = await API.get("/api/decks");
  decks = data.decks;
  renderDeckList();
}

function renderDeckList() {
  const list = el("deck-list");
  list.innerHTML = "";

  if (!decks.length) {
    list.innerHTML = `
      <div class="app-empty">
        <span class="app-empty-icon">&#9635;</span>
        You have no decks yet. Create one to get started.
      </div>`;
    return;
  }

  for (const deck of decks) {
    const c = deck.counts;
    const studyable = c.due + c.new > 0;

    const node = document.createElement("div");
    node.className = "deck-card";
    node.innerHTML = `
      <h2>${escapeHTML(deck.name)}</h2>
      <p class="deck-desc">${escapeHTML(deck.description || "")}</p>
      <div class="deck-stats">
        <span class="chip stat-due">${c.due} due</span>
        <span class="chip stat-new">${c.new} new</span>
        <span class="chip stat-learned">${c.learned} learned</span>
        <span class="chip">${c.total} total</span>
      </div>
      <div class="deck-actions">
        <button class="app-btn app-btn-primary app-btn-sm" data-study="${deck.id}" ${studyable ? "" : "disabled"}>
          ${studyable ? "Study" : c.total ? "All caught up" : "No cards yet"}
        </button>
        <button class="app-btn app-btn-ghost app-btn-sm" data-manage="${deck.id}">Edit cards</button>
      </div>`;
    list.appendChild(node);
  }

  list.querySelectorAll("[data-study]").forEach((b) =>
    b.addEventListener("click", () => startSession(b.dataset.study))
  );
  list.querySelectorAll("[data-manage]").forEach((b) =>
    b.addEventListener("click", () => openManage(b.dataset.manage))
  );
}

async function newDeck() {
  const res = await openModal({
    title: "New deck",
    fields: [
      { name: "name", label: "Name", placeholder: "Rust ownership" },
      { name: "description", label: "Description", type: "textarea", rows: 2, placeholder: "Optional" },
    ],
    confirmLabel: "Create",
  });
  if (!res || !res.name.trim()) return;

  try {
    const deck = await API.post("/api/decks", { name: res.name.trim(), description: res.description.trim() });
    toast(`Created "${deck.name}"`);
    await refreshDecks();
    openManage(deck.id);
  } catch (err) {
    toast(err.message, true);
  }
}

/* ---------- deck editor ---------- */

async function openManage(deckId) {
  try {
    const data = await API.get(`/api/decks/${deckId}/cards`);
    manageDeck = data.deck;
    manageCards = data.cards;
    el("manage-deck-name").textContent = manageDeck.name;
    el("manage-deck-desc").textContent = manageDeck.description || "";
    renderCardList();
    showView("manage");
    window.scrollTo({ top: 0 });
  } catch (err) {
    toast(err.message, true);
  }
}

function renderCardList() {
  el("card-count").textContent = `${manageCards.length} card${manageCards.length === 1 ? "" : "s"}`;
  const list = el("card-list");
  list.innerHTML = "";

  if (!manageCards.length) {
    list.innerHTML = `<div class="app-empty">No cards yet. Add one above, or use bulk import.</div>`;
    return;
  }

  manageCards.forEach((card, i) => {
    const row = document.createElement("div");
    row.className = "card-row";
    row.innerHTML = `
      <span class="card-row-num">${i + 1}</span>
      <div class="card-row-body">
        <div class="card-row-front">${renderRich(card.front)}</div>
        <div class="card-row-back">${renderRich(card.back)}</div>
        ${card.tags.length ? `<div class="card-row-tags">${card.tags.map((t) => `<span class="chip">${escapeHTML(t)}</span>`).join("")}</div>` : ""}
      </div>
      <div class="card-row-actions">
        <button class="app-btn app-btn-ghost app-btn-sm" data-edit="${card.id}">Edit</button>
        <button class="app-btn app-btn-danger app-btn-sm" data-del="${card.id}">Delete</button>
      </div>`;
    list.appendChild(row);
  });

  enhanceCode(list);

  list.querySelectorAll("[data-edit]").forEach((b) =>
    b.addEventListener("click", () => editCard(b.dataset.edit))
  );
  list.querySelectorAll("[data-del]").forEach((b) =>
    b.addEventListener("click", () => deleteCard(b.dataset.del))
  );
}

async function addCard(e) {
  e.preventDefault();
  const front = el("new-front").value.trim();
  const back = el("new-back").value.trim();
  if (!front) return;

  try {
    await API.post(`/api/decks/${manageDeck.id}/cards`, {
      front,
      back,
      tags: parseTags(el("new-tags").value),
    });
    el("new-front").value = "";
    el("new-back").value = "";
    el("new-tags").value = "";
    el("new-front").focus();
    toast("Card added");
    await openManage(manageDeck.id);
    await refreshDecks();
  } catch (err) {
    toast(err.message, true);
  }
}

async function editCard(cardId) {
  const card = manageCards.find((c) => c.id === cardId);
  if (!card) return;

  const res = await openModal({
    title: "Edit card",
    fields: [
      { name: "front", label: "Question", type: "textarea", rows: 3, value: card.front },
      { name: "back", label: "Answer", type: "textarea", rows: 5, value: card.back },
      { name: "tags", label: "Tags", hint: "comma separated", value: card.tags.join(", ") },
    ],
  });
  if (!res || !res.front.trim()) return;

  try {
    await API.patch(`/api/cards/${cardId}`, {
      front: res.front.trim(),
      back: res.back.trim(),
      tags: parseTags(res.tags),
    });
    toast("Card updated");
    await openManage(manageDeck.id);
  } catch (err) {
    toast(err.message, true);
  }
}

async function deleteCard(cardId) {
  const card = manageCards.find((c) => c.id === cardId);
  if (!card) return;
  const ok = await confirmModal({
    title: "Delete this card?",
    subtitle: card.front.slice(0, 140),
  });
  if (!ok) return;

  try {
    await API.del(`/api/cards/${cardId}`);
    toast("Card deleted");
    await openManage(manageDeck.id);
    await refreshDecks();
  } catch (err) {
    toast(err.message, true);
  }
}

async function renameDeck() {
  const res = await openModal({
    title: "Rename deck",
    fields: [
      { name: "name", label: "Name", value: manageDeck.name },
      { name: "description", label: "Description", type: "textarea", rows: 2, value: manageDeck.description || "" },
    ],
  });
  if (!res || !res.name.trim()) return;

  try {
    await API.patch(`/api/decks/${manageDeck.id}`, {
      name: res.name.trim(),
      description: res.description.trim(),
    });
    toast("Deck updated");
    await openManage(manageDeck.id);
    await refreshDecks();
  } catch (err) {
    toast(err.message, true);
  }
}

async function deleteDeck() {
  const ok = await confirmModal({
    title: `Delete "${manageDeck.name}"?`,
    subtitle: `This removes the deck, its ${manageCards.length} card(s) and all review history. This cannot be undone.`,
  });
  if (!ok) return;

  try {
    await API.del(`/api/decks/${manageDeck.id}`);
    toast("Deck deleted");
    manageDeck = null;
    await refreshDecks();
    showView("decks");
  } catch (err) {
    toast(err.message, true);
  }
}

async function bulkImport() {
  const res = await openModal({
    title: "Bulk import cards",
    subtitle: "One card per line. Question and answer separated by the character you choose. An optional third column adds comma-separated tags.",
    fields: [
      {
        name: "separator",
        label: "Separator",
        type: "select",
        value: "tab",
        options: [
          { value: "tab", label: "Tab (paste straight from a spreadsheet)" },
          { value: "comma", label: "Comma" },
          { value: "semicolon", label: "Semicolon" },
          { value: "pipe", label: "Pipe |" },
        ],
      },
      {
        name: "text",
        label: "Cards",
        type: "textarea",
        rows: 10,
        placeholder: "What is RAII?\tResource Acquisition Is Initialization\tidioms\nWhat is a data race?\tConcurrent unsynchronized access where one is a write",
      },
    ],
    confirmLabel: "Import",
  });
  if (!res || !res.text.trim()) return;

  try {
    const out = await API.post(`/api/decks/${manageDeck.id}/cards/bulk`, {
      text: res.text,
      separator: res.separator,
    });
    toast(`Imported ${out.created} card(s)${out.skipped ? `, skipped ${out.skipped} incomplete line(s)` : ""}`);
    await openManage(manageDeck.id);
    await refreshDecks();
  } catch (err) {
    toast(err.message, true);
  }
}

async function exportDeck() {
  try {
    const data = await API.get(`/api/decks/${manageDeck.id}/export`);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${manageDeck.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast("Deck exported");
  } catch (err) {
    toast(err.message, true);
  }
}

/* ---------- study ---------- */

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function startSession(deckId) {
  try {
    const data = await API.get(`/api/decks/${deckId}/study?limit_new=${NEW_PER_SESSION}`);
    const due = data.cards.filter((c) => c.seen);
    const fresh = data.cards.filter((c) => !c.seen);
    const queue = shuffle(due).concat(shuffle(fresh));
    if (!queue.length) {
      toast("Nothing due in this deck right now");
      return;
    }

    session = { deck: data.deck, queue, done: 0, planned: queue.length, again: 0, revealed: false };
    el("study-deck-name").textContent = data.deck.name;
    showView("study");
    renderCard();
    window.scrollTo({ top: 0 });
  } catch (err) {
    toast(err.message, true);
  }
}

function renderCard() {
  const card = session.queue[0];
  session.revealed = false;

  el("card-front").innerHTML = renderRich(card.front);
  el("card-back").innerHTML = renderRich(card.back);
  el("card-back-wrap").hidden = true;
  el("card-divider").hidden = true;
  el("btn-reveal").hidden = false;
  el("grade-row").hidden = true;
  el("card-tags").innerHTML = card.tags.map((t) => `<li>${escapeHTML(t)}</li>`).join("");
  enhanceCode(el("card"));

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

async function grade(g) {
  if (!session || !session.revealed) return;
  const card = session.queue.shift();
  session.revealed = false;

  if (g === "again") {
    session.again += 1;
    session.queue.push(card);
  } else {
    session.done += 1;
  }

  if (session.queue.length) renderCard();
  else finishSession();

  try {
    await API.post("/api/reviews", { card_id: card.id, grade: g });
  } catch (err) {
    toast(`Could not save that review: ${err.message}`, true);
  }
}

async function finishSession() {
  const { done, again, deck } = session;
  el("done-summary").textContent =
    `You reviewed ${done} card${done === 1 ? "" : "s"} in "${deck.name}"` +
    (again ? `, with ${again} marked Again.` : ".");
  showView("done");
  await refreshDecks();
}

function exitSession() {
  session = null;
  showView("decks");
  refreshDecks().catch(() => {});
}

/* ---------- events ---------- */

el("btn-new-deck").addEventListener("click", newDeck);
el("btn-manage-back").addEventListener("click", () => { showView("decks"); refreshDecks().catch(() => {}); });
el("btn-edit-deck").addEventListener("click", renameDeck);
el("btn-delete-deck").addEventListener("click", deleteDeck);
el("btn-import").addEventListener("click", bulkImport);
el("btn-export").addEventListener("click", exportDeck);
el("card-form").addEventListener("submit", addCard);

el("btn-reveal").addEventListener("click", reveal);
el("btn-exit").addEventListener("click", exitSession);
el("btn-back-decks").addEventListener("click", exitSession);
el("btn-again-deck").addEventListener("click", () => {
  const id = session?.deck.id;
  session = null;
  if (id) startSession(id);
});
document.querySelectorAll("[data-grade]").forEach((b) =>
  b.addEventListener("click", () => grade(b.dataset.grade))
);

document.addEventListener("keydown", (e) => {
  if (el("view-study").hidden || !session) return;
  if (document.querySelector(".app-modal-backdrop")) return;
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

(async function init() {
  await loadIdentity();
  try {
    await refreshDecks();
  } catch (err) {
    const p = el("load-error");
    p.textContent = `Could not load decks: ${err.message}`;
    p.hidden = false;
  }
})();
