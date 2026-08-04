/* Notes front end: Keep-style board backed by the API. */

const COLORS = ["default", "red", "orange", "yellow", "green", "teal", "blue", "purple", "pink", "gray"];
const CHECK_RE = /^(\s*)-\s\[( |x|X)\]\s?(.*)$/;

let notes = [];
let knownLabels = [];
let activeLabel = null;
let showArchived = false;
let searchTerm = "";
let composerColor = "default";

/* ---------- fetching ---------- */

async function loadNotes() {
  const params = new URLSearchParams();
  if (searchTerm) params.set("q", searchTerm);
  if (activeLabel) params.set("label", activeLabel);
  if (showArchived) params.set("archived", "true");

  const data = await API.get(`/api/notes?${params.toString()}`);
  notes = data.notes;
  knownLabels = data.labels;
  render();
}

const reloadSoon = debounce(() => loadNotes().catch((e) => toast(e.message, true)), 250);

/* ---------- checklist handling ---------- */

function renderBody(body) {
  if (!body) return "";
  return body
    .split("\n")
    .map((line, i) => {
      const m = line.match(CHECK_RE);
      if (!m) return `<div>${renderText(line) || "&nbsp;"}</div>`;
      const done = m[2].toLowerCase() === "x";
      return `
        <div class="check-line">
          <button class="check-box ${done ? "check-box-on" : ""}" data-check="${i}" aria-label="toggle">${done ? "&#10003;" : ""}</button>
          <span class="${done ? "check-done" : ""}">${renderText(m[3])}</span>
        </div>`;
    })
    .join("");
}

function toggleCheckLine(body, index) {
  const lines = body.split("\n");
  const m = lines[index] && lines[index].match(CHECK_RE);
  if (!m) return body;
  const done = m[2].toLowerCase() === "x";
  lines[index] = `${m[1]}- [${done ? " " : "x"}] ${m[3]}`;
  return lines.join("\n");
}

/* ---------- rendering ---------- */

function relTime(iso) {
  const then = new Date(iso);
  const mins = Math.round((Date.now() - then.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  if (mins < 10080) return `${Math.round(mins / 1440)}d ago`;
  return then.toLocaleDateString();
}

function noteHTML(note) {
  const labels = note.labels.map((l) => `<span class="chip">${escapeHTML(l)}</span>`).join("");
  return `
    <button class="note-pin ${note.pinned ? "note-pin-on" : ""}" data-pin="${note.id}"
            title="${note.pinned ? "Unpin" : "Pin"}">${note.pinned ? "&#9733;" : "&#9734;"}</button>
    ${note.title ? `<h3 class="note-title">${escapeHTML(note.title)}</h3>` : ""}
    <div class="note-body" data-body="${note.id}">${renderBody(note.body)}</div>
    ${labels ? `<div class="note-labels">${labels}</div>` : ""}
    <div class="note-foot">
      <span class="note-time">${relTime(note.updated_at)}</span>
      <button class="note-act" data-edit="${note.id}">Edit</button>
      <button class="note-act" data-color="${note.id}">Color</button>
      <button class="note-act" data-archive="${note.id}">${note.archived ? "Unarchive" : "Archive"}</button>
      <button class="note-act note-act-danger" data-del="${note.id}">Delete</button>
    </div>`;
}

function render() {
  const pinned = notes.filter((n) => n.pinned);
  const others = notes.filter((n) => !n.pinned);

  const fill = (container, items) => {
    container.innerHTML = "";
    for (const note of items) {
      const node = document.createElement("article");
      node.className = `note note-${note.color}`;
      node.innerHTML = noteHTML(note);
      container.appendChild(node);
    }
  };

  el("pinned-section").hidden = pinned.length === 0;
  el("others-heading").hidden = pinned.length === 0 || others.length === 0;
  fill(el("board-pinned"), pinned);
  fill(el("board-others"), others);

  const empty = notes.length === 0;
  el("empty-state").hidden = !empty;
  if (empty) {
    el("empty-text").textContent = searchTerm
      ? `No notes match "${searchTerm}".`
      : activeLabel
        ? `No notes labelled "${activeLabel}".`
        : showArchived
          ? "Nothing archived."
          : "No notes yet. Write your first one above.";
  }

  renderLabelFilters();
  bindNoteEvents();
}

function renderLabelFilters() {
  const bar = el("label-filters");
  bar.innerHTML = knownLabels
    .map(
      (l) =>
        `<button class="chip chip-btn ${l === activeLabel ? "chip-active" : ""}" data-label="${escapeHTML(l)}">${escapeHTML(l)}</button>`
    )
    .join("");
  bar.querySelectorAll("[data-label]").forEach((b) =>
    b.addEventListener("click", () => {
      activeLabel = activeLabel === b.dataset.label ? null : b.dataset.label;
      loadNotes().catch((e) => toast(e.message, true));
    })
  );
}

function bindNoteEvents() {
  document.querySelectorAll("[data-pin]").forEach((b) =>
    b.addEventListener("click", () => patchNote(b.dataset.pin, { pinned: !findNote(b.dataset.pin).pinned }))
  );
  document.querySelectorAll("[data-archive]").forEach((b) =>
    b.addEventListener("click", async () => {
      const note = findNote(b.dataset.archive);
      await patchNote(note.id, { archived: !note.archived });
      toast(note.archived ? "Unarchived" : "Archived");
    })
  );
  document.querySelectorAll("[data-del]").forEach((b) =>
    b.addEventListener("click", () => deleteNote(b.dataset.del))
  );
  document.querySelectorAll("[data-edit]").forEach((b) =>
    b.addEventListener("click", () => editNote(b.dataset.edit))
  );
  document.querySelectorAll("[data-color]").forEach((b) =>
    b.addEventListener("click", () => pickColor(b.dataset.color))
  );
  document.querySelectorAll("[data-body]").forEach((wrap) =>
    wrap.querySelectorAll("[data-check]").forEach((box) =>
      box.addEventListener("click", () => {
        const note = findNote(wrap.dataset.body);
        patchNote(note.id, { body: toggleCheckLine(note.body, Number(box.dataset.check)) });
      })
    )
  );
}

const findNote = (id) => notes.find((n) => n.id === id);

/* ---------- mutations ---------- */

function flashSaved(text = "Saved") {
  const node = el("save-state");
  node.textContent = text;
  node.classList.add("save-state-show");
  setTimeout(() => node.classList.remove("save-state-show"), 1400);
}

async function patchNote(id, patch) {
  const note = findNote(id);
  if (note) Object.assign(note, patch); // optimistic
  render();
  try {
    const updated = await API.patch(`/api/notes/${id}`, patch);
    Object.assign(findNote(id) || {}, updated);
    flashSaved();
  } catch (err) {
    toast(err.message, true);
    loadNotes().catch(() => {});
  }
}

async function deleteNote(id) {
  const note = findNote(id);
  const ok = await confirmModal({
    title: "Delete this note?",
    subtitle: (note.title || note.body || "").slice(0, 140) || "Empty note",
  });
  if (!ok) return;
  try {
    await API.del(`/api/notes/${id}`);
    notes = notes.filter((n) => n.id !== id);
    render();
    toast("Note deleted");
  } catch (err) {
    toast(err.message, true);
  }
}

async function pickColor(id) {
  const note = findNote(id);
  const res = await openModal({
    title: "Note color",
    fields: [
      {
        name: "color",
        label: "Color",
        type: "select",
        value: note.color,
        options: COLORS.map((c) => ({ value: c, label: c === "default" ? "None" : c })),
      },
    ],
  });
  if (!res) return;
  patchNote(id, { color: res.color });
}

async function editNote(id) {
  const note = findNote(id);
  const res = await openModal({
    title: "Edit note",
    fields: [
      { name: "title", label: "Title", value: note.title },
      {
        name: "body",
        label: "Body",
        hint: "use - [ ] for checklist items",
        type: "textarea",
        rows: 12,
        value: note.body,
      },
      { name: "labels", label: "Labels", hint: "comma separated", value: note.labels.join(", ") },
    ],
  });
  if (!res) return;
  patchNote(id, {
    title: res.title.trim(),
    body: res.body,
    labels: parseTags(res.labels),
  });
}

/* ---------- composer ---------- */

function renderComposerColors() {
  el("composer-colors").innerHTML = COLORS.map(
    (c) =>
      `<button type="button" class="swatch ${c === "default" ? "swatch-default" : ""} ${c === composerColor ? "swatch-active" : ""}"
        data-swatch="${c}" title="${c}" style="${c === "default" ? "" : `background: var(--note-${c}, #888)`}"></button>`
  ).join("");

  // Colours come from the stylesheet, so read them off a probe element.
  el("composer-colors")
    .querySelectorAll("[data-swatch]")
    .forEach((b) => {
      const c = b.dataset.swatch;
      if (c !== "default") {
        const probe = document.createElement("div");
        probe.className = `note-${c}`;
        document.body.appendChild(probe);
        b.style.background = getComputedStyle(probe).getPropertyValue("--note").trim() || "#888";
        probe.remove();
      }
      b.addEventListener("click", () => {
        composerColor = c;
        renderComposerColors();
      });
    });
}

function openComposer() {
  el("composer-trigger").hidden = true;
  el("composer-form").hidden = false;
  el("composer-title").focus();
}

function closeComposer() {
  el("composer-form").hidden = true;
  el("composer-trigger").hidden = false;
  el("composer-title").value = "";
  el("composer-body").value = "";
  el("composer-labels").value = "";
  composerColor = "default";
  renderComposerColors();
}

async function submitComposer(e) {
  e.preventDefault();
  const title = el("composer-title").value.trim();
  const body = el("composer-body").value;
  if (!title && !body.trim()) {
    closeComposer();
    return;
  }
  try {
    await API.post("/api/notes", {
      title,
      body,
      color: composerColor,
      labels: parseTags(el("composer-labels").value),
    });
    closeComposer();
    await loadNotes();
    toast("Note added");
  } catch (err) {
    toast(err.message, true);
  }
}

/* ---------- events ---------- */

el("composer-trigger").addEventListener("click", openComposer);
el("composer-trigger").addEventListener("focus", openComposer);
el("composer-close").addEventListener("click", closeComposer);
el("composer-form").addEventListener("submit", submitComposer);
el("composer-body").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submitComposer(e);
});

el("search").addEventListener("input", (e) => {
  searchTerm = e.target.value.trim();
  reloadSoon();
});

el("btn-archive-toggle").addEventListener("click", () => {
  showArchived = !showArchived;
  el("btn-archive-toggle").textContent = showArchived ? "Show active" : "Show archive";
  loadNotes().catch((e) => toast(e.message, true));
});

document.addEventListener("keydown", (e) => {
  if (document.querySelector(".app-modal-backdrop")) return;
  const typing = ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName);
  if (e.key === "/" && !typing) {
    e.preventDefault();
    el("search").focus();
  } else if (e.key === "n" && !typing) {
    e.preventDefault();
    openComposer();
  } else if (e.key === "Escape" && !el("composer-form").hidden) {
    closeComposer();
  }
});

/* ---------- boot ---------- */

(async function init() {
  renderComposerColors();
  await loadIdentity();
  try {
    await loadNotes();
  } catch (err) {
    const p = el("load-error");
    p.textContent = `Could not load notes: ${err.message}`;
    p.hidden = false;
  }
})();
