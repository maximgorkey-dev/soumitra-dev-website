/**
 * Persistence.
 *
 * This app is public and works with no account at all, so saving has two
 * backends and the UI picks whichever is available:
 *
 *   signed in   designs go to /api/designs and follow you between devices
 *   anonymous   designs go to localStorage, and share links carry a design
 *               in the URL with no server involved at all
 *
 * The sign-in probe is just the design list request. Nginx answers it with a
 * JSON 401 for the design endpoints rather than the usual redirect to Google,
 * precisely so that an anonymous visitor can be detected without being bounced
 * to a login page they never asked for.
 *
 * Share links store the *source* of a design — which preset, or the netlist
 * text, plus constraints — not a placement. Placement is reproducible because
 * the placer is seeded from the design name, so the recipient sees exactly
 * what the sender saw, from a link short enough to paste.
 */

const LS_DESIGNS = "eda.designs.v1";
const LS_SESSION = "eda.session.v1";

/* ------------------------------------------------------------------ */
/* account                                                             */
/* ------------------------------------------------------------------ */

export async function probeAccount() {
  try {
    const res = await fetch("/api/designs", {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    });
    if (res.status === 401 || res.status === 403) return { signedIn: false, designs: [] };
    if (!res.ok) return { signedIn: false, designs: [], error: `${res.status}` };
    const data = await res.json();
    return { signedIn: true, email: data.email || null, designs: data.designs || [] };
  } catch {
    // Offline, or the API is not reachable. Anonymous mode still works.
    return { signedIn: false, designs: [], offline: true };
  }
}

/* ------------------------------------------------------------------ */
/* remote                                                              */
/* ------------------------------------------------------------------ */

async function api(method, path, body) {
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
  if (res.status === 204) return null;
  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`unexpected response from ${path}`);
    }
  }
  if (!res.ok) {
    const detail = data && data.detail ? data.detail : `${res.status} ${res.statusText}`;
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  return data;
}

export const remote = {
  list: () => api("GET", "/api/designs").then((d) => d.designs || []),
  create: (name, payload) => api("POST", "/api/designs", { name, payload }),
  update: (id, patch) => api("PATCH", `/api/designs/${id}`, patch),
  load: (id) => api("GET", `/api/designs/${id}`),
  remove: (id) => api("DELETE", `/api/designs/${id}`),
};

/* ------------------------------------------------------------------ */
/* local                                                               */
/* ------------------------------------------------------------------ */

function readLocal() {
  try {
    const raw = localStorage.getItem(LS_DESIGNS);
    const val = raw ? JSON.parse(raw) : [];
    return Array.isArray(val) ? val : [];
  } catch {
    return [];
  }
}

function writeLocal(list) {
  try {
    localStorage.setItem(LS_DESIGNS, JSON.stringify(list.slice(0, 40)));
    return true;
  } catch {
    return false; // private browsing, or the quota is full
  }
}

export const local = {
  list: () => readLocal().map(({ id, name, updated_at }) => ({ id, name, updated_at })),
  create(name, payload) {
    const list = readLocal();
    const entry = {
      id: `l${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      name,
      payload,
      updated_at: new Date().toISOString(),
    };
    list.unshift(entry);
    writeLocal(list);
    return entry;
  },
  update(id, patch) {
    const list = readLocal();
    const entry = list.find((d) => d.id === id);
    if (!entry) return null;
    Object.assign(entry, patch, { updated_at: new Date().toISOString() });
    writeLocal(list);
    return entry;
  },
  load: (id) => readLocal().find((d) => d.id === id) || null,
  remove(id) {
    writeLocal(readLocal().filter((d) => d.id !== id));
  },
};

/** Whichever backend is live. */
export function store(signedIn) {
  return signedIn ? remote : local;
}

/* ------------------------------------------------------------------ */
/* last session                                                        */
/* ------------------------------------------------------------------ */

export function rememberSession(state) {
  try {
    localStorage.setItem(LS_SESSION, JSON.stringify(state));
  } catch {
    /* not important enough to report */
  }
}

export function recallSession() {
  try {
    const raw = localStorage.getItem(LS_SESSION);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* share links                                                         */
/* ------------------------------------------------------------------ */

function b64url(text) {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function unb64url(text) {
  const padded = text.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export function encodeShare(state) {
  return b64url(JSON.stringify(state));
}

export function decodeShare(hash) {
  const raw = String(hash || "").replace(/^#/, "");
  if (!raw.startsWith("d=")) return null;
  try {
    const state = JSON.parse(unb64url(raw.slice(2)));
    return state && typeof state === "object" ? state : null;
  } catch {
    return null;
  }
}

export function shareURL(state) {
  const url = new URL(window.location.href);
  url.hash = `d=${encodeShare(state)}`;
  return url.toString();
}
