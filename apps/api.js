/* Shared helpers for the authenticated apps: API calls, toasts, modals, escaping. */

const API = {
  async request(method, path, body) {
    const opts = {
      method,
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    };
    if (body !== undefined) {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    }

    const res = await fetch(path, opts);

    // oauth2-proxy bounces expired sessions to Google; a redirect to an
    // opaque origin surfaces here as an HTML response or a 401.
    if (res.status === 401) {
      window.location.href = "/oauth2/start?rd=" + encodeURIComponent(window.location.pathname);
      throw new Error("session expired");
    }
    if (res.status === 204) return null;

    const text = await res.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Unexpected response from ${path}`);
      }
    }
    if (!res.ok) {
      const detail = data && data.detail ? data.detail : `${res.status} ${res.statusText}`;
      throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
    }
    return data;
  },

  get: (p) => API.request("GET", p),
  post: (p, b) => API.request("POST", p, b),
  patch: (p, b) => API.request("PATCH", p, b),
  del: (p) => API.request("DELETE", p),
};

/* ---------- escaping and light formatting ---------- */

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

/* Allows `inline code` and preserves line breaks. */
function renderText(s) {
  return escapeHTML(s)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\n/g, "<br />");
}

/* ---------- toast ---------- */

let toastTimer = null;

function toast(message, isError = false) {
  const node = document.getElementById("toast");
  if (!node) return;
  node.textContent = message;
  node.classList.toggle("app-toast-error", isError);
  node.classList.add("app-toast-show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove("app-toast-show"), isError ? 5000 : 2600);
}

/* ---------- modal ---------- */

/**
 * Opens a modal. `fields` is an array of
 * { name, label, type: "text"|"textarea"|"select", value, placeholder, rows, hint, options }.
 * Resolves with an object of values, or null if dismissed.
 */
function openModal({ title, subtitle, fields = [], confirmLabel = "Save", danger = false }) {
  return new Promise((resolve) => {
    const root = document.getElementById("modal-root");
    const backdrop = document.createElement("div");
    backdrop.className = "app-modal-backdrop";

    const body = fields
      .map((f) => {
        const id = `mf-${f.name}`;
        const hint = f.hint ? ` <span class="app-hint">${escapeHTML(f.hint)}</span>` : "";
        const label = `<label class="app-label" for="${id}">${escapeHTML(f.label)}${hint}</label>`;
        let control;
        if (f.type === "textarea") {
          control = `<textarea class="app-textarea" id="${id}" rows="${f.rows || 6}" placeholder="${escapeHTML(f.placeholder || "")}">${escapeHTML(f.value || "")}</textarea>`;
        } else if (f.type === "select") {
          const opts = (f.options || [])
            .map((o) => `<option value="${escapeHTML(o.value)}"${o.value === f.value ? " selected" : ""}>${escapeHTML(o.label)}</option>`)
            .join("");
          control = `<select class="app-select" id="${id}">${opts}</select>`;
        } else {
          control = `<input class="app-input" id="${id}" type="text" value="${escapeHTML(f.value || "")}" placeholder="${escapeHTML(f.placeholder || "")}" />`;
        }
        return `<div class="app-field">${label}${control}</div>`;
      })
      .join("");

    backdrop.innerHTML = `
      <div class="app-modal" role="dialog" aria-modal="true">
        <h2>${escapeHTML(title)}</h2>
        ${subtitle ? `<p class="app-modal-sub">${escapeHTML(subtitle)}</p>` : ""}
        <form id="modal-form">
          ${body}
          <div class="app-modal-actions">
            <button type="button" class="app-btn app-btn-ghost" data-act="cancel">Cancel</button>
            <button type="submit" class="app-btn ${danger ? "app-btn-danger" : "app-btn-primary"}">${escapeHTML(confirmLabel)}</button>
          </div>
        </form>
      </div>`;

    const close = (result) => {
      document.removeEventListener("keydown", onKey);
      backdrop.remove();
      resolve(result);
    };
    const onKey = (e) => {
      if (e.key === "Escape") { e.preventDefault(); close(null); }
    };

    backdrop.addEventListener("click", (e) => { if (e.target === backdrop) close(null); });
    backdrop.querySelector('[data-act="cancel"]').addEventListener("click", () => close(null));
    backdrop.querySelector("#modal-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const out = {};
      for (const f of fields) out[f.name] = document.getElementById(`mf-${f.name}`).value;
      close(out);
    });

    document.addEventListener("keydown", onKey);
    root.appendChild(backdrop);
    const first = backdrop.querySelector("input, textarea, select");
    if (first) { first.focus(); if (first.select) first.select(); }
  });
}

async function confirmModal({ title, subtitle, confirmLabel = "Delete" }) {
  const res = await openModal({ title, subtitle, fields: [], confirmLabel, danger: true });
  return res !== null;
}

/* ---------- misc ---------- */

const el = (id) => document.getElementById(id);

function parseTags(raw) {
  return String(raw || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function debounce(fn, ms) {
  let t = null;
  const wrapped = (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
  wrapped.flush = (...args) => {
    clearTimeout(t);
    fn(...args);
  };
  return wrapped;
}

async function loadIdentity() {
  try {
    const me = await API.get("/api/me");
    const node = el("user-email");
    if (node && me.email) node.textContent = me.email;
    return me.email;
  } catch {
    return null;
  }
}
