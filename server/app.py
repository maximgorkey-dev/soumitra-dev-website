"""Backing API for the authenticated apps on soumitra.dev.

Identity is established by oauth2-proxy and handed over by nginx in the
X-Auth-Email header. Nginx sets that header itself on every proxied request,
so a client cannot forge it, and this service binds to loopback only.
"""

from __future__ import annotations

import json
import os
import re
import sqlite3
import threading
import time
import urllib.error
import urllib.request
import uuid
from contextlib import contextmanager
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Iterator

from fastapi import Depends, FastAPI, Header, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

DB_PATH = Path(os.environ.get("SITE_API_DB", "/var/lib/site-api/data.db"))
SEED_DIR = Path(os.environ.get("SITE_API_SEED", "/opt/site-api/seed"))

MIN_EASE = 1.3
MAX_INTERVAL_DAYS = 730
MATURE_INTERVAL = 21
NOTE_COLORS = {"default", "red", "orange", "yellow", "green", "teal", "blue", "purple", "pink", "gray"}
MAX_SPAN = 4
MIN_NOTE_HEIGHT = 140
MAX_NOTE_HEIGHT = 1600
MAX_DESIGNS = 100
MAX_DESIGN_BYTES = 400_000

# Server-side C++ for the algorithms app. Nginx restricts /api/algorithms/ to
# the owner, so this is not the access control — it is the input contract.
CC_URL = os.environ.get("SITE_CC_URL", "http://127.0.0.1:8081/run")
CC_TIMEOUT = 45.0
CC_TOPICS = {"mst-kruskal", "mst-prim"}
MAX_CC_BODY = 20_000
MAX_CC_NODES = 64
MAX_CC_EDGES = 256
MAX_CC_WEIGHT = 1_000_000
CC_RUNS_PER_WINDOW = 10
CC_RATE_WINDOW = 60.0

# Vertex names are handed to the C++ harness as whitespace-separated tokens, so
# anything with a space in it would silently desynchronise the graph the program
# sees from the one on screen.
CC_LABEL_RE = re.compile(r"^[A-Za-z0-9_.-]{1,16}$")

app = FastAPI(title="soumitra.dev apps API", docs_url=None, redoc_url=None, openapi_url=None)


# --------------------------------------------------------------------------
# storage
# --------------------------------------------------------------------------

SCHEMA = """
CREATE TABLE IF NOT EXISTS meta (
  owner TEXT NOT NULL, key TEXT NOT NULL, value TEXT NOT NULL,
  PRIMARY KEY (owner, key)
);

CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  owner TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT 'default',
  labels TEXT NOT NULL DEFAULT '[]',
  pinned INTEGER NOT NULL DEFAULT 0,
  archived INTEGER NOT NULL DEFAULT 0,
  span_w INTEGER NOT NULL DEFAULT 1,
  height_px INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notes_owner ON notes (owner, archived, pinned, updated_at DESC);

CREATE TABLE IF NOT EXISTS decks (
  id TEXT PRIMARY KEY,
  owner TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_decks_owner ON decks (owner, name);

CREATE TABLE IF NOT EXISTS cards (
  id TEXT PRIMARY KEY,
  deck_id TEXT NOT NULL REFERENCES decks (id) ON DELETE CASCADE,
  owner TEXT NOT NULL,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  tags TEXT NOT NULL DEFAULT '[]',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cards_deck ON cards (deck_id, position);

CREATE TABLE IF NOT EXISTS reviews (
  owner TEXT NOT NULL,
  card_id TEXT NOT NULL REFERENCES cards (id) ON DELETE CASCADE,
  reps INTEGER NOT NULL DEFAULT 0,
  ease REAL NOT NULL DEFAULT 2.5,
  interval INTEGER NOT NULL DEFAULT 0,
  lapses INTEGER NOT NULL DEFAULT 0,
  due TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (owner, card_id)
);
CREATE INDEX IF NOT EXISTS idx_reviews_due ON reviews (owner, due);

-- Saved designs for the public EDA flow app. That app works fully without an
-- account, so this table only ever holds designs from someone who chose to
-- sign in and press Save.
CREATE TABLE IF NOT EXISTS designs (
  id TEXT PRIMARY KEY,
  owner TEXT NOT NULL,
  name TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_designs_owner ON designs (owner, updated_at DESC);
"""


def connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, timeout=10.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA busy_timeout = 10000")
    return conn


@contextmanager
def db() -> Iterator[sqlite3.Connection]:
    conn = connect()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


# Columns added after the first release. SQLite has no ADD COLUMN IF NOT EXISTS,
# so each is applied only when absent. ADD COLUMN never rewrites existing rows.
MIGRATIONS: list[tuple[str, str, str]] = [
    ("notes", "span_w", "ALTER TABLE notes ADD COLUMN span_w INTEGER NOT NULL DEFAULT 1"),
    ("notes", "height_px", "ALTER TABLE notes ADD COLUMN height_px INTEGER NOT NULL DEFAULT 0"),
]


def migrate(conn: sqlite3.Connection) -> list[str]:
    applied: list[str] = []
    for table, column, sql in MIGRATIONS:
        existing = {r["name"] for r in conn.execute(f"PRAGMA table_info({table})")}
        if column not in existing:
            conn.execute(sql)
            applied.append(f"{table}.{column}")
    return applied


@app.on_event("startup")
def init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = connect()
    try:
        conn.execute("PRAGMA journal_mode = WAL")
        conn.executescript(SCHEMA)
        applied = migrate(conn)
        conn.commit()
        if applied:
            print(f"applied migrations: {', '.join(applied)}", flush=True)
    finally:
        conn.close()


# --------------------------------------------------------------------------
# identity
# --------------------------------------------------------------------------

def current_user(x_auth_email: str | None = Header(default=None)) -> str:
    if not x_auth_email or "@" not in x_auth_email:
        raise HTTPException(status_code=401, detail="no verified identity on request")
    return x_auth_email.strip().lower()


User = Depends(current_user)


# --------------------------------------------------------------------------
# helpers
# --------------------------------------------------------------------------

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def today_iso() -> str:
    return date.today().isoformat()


def due_after(days: int) -> str:
    return (date.today() + timedelta(days=days)).isoformat()


def new_id() -> str:
    return uuid.uuid4().hex[:16]


def loads_list(raw: str) -> list[str]:
    try:
        val = json.loads(raw)
        return [str(x) for x in val] if isinstance(val, list) else []
    except (ValueError, TypeError):
        return []


def clamp_span(value: Any) -> int:
    """Board width in grid columns. The front end clamps again to what fits."""
    try:
        return max(1, min(MAX_SPAN, int(value)))
    except (TypeError, ValueError):
        return 1


def clamp_height(value: Any) -> int:
    """0 means grow to fit the content; anything else is a pinned pixel height."""
    try:
        px = int(value)
    except (TypeError, ValueError):
        return 0
    if px <= 0:
        return 0
    return max(MIN_NOTE_HEIGHT, min(MAX_NOTE_HEIGHT, px))


def clean_labels(labels: list[str] | None) -> list[str]:
    if not labels:
        return []
    out: list[str] = []
    for lab in labels:
        lab = str(lab).strip()[:40]
        if lab and lab not in out:
            out.append(lab)
    return out[:20]


def schedule(prev: sqlite3.Row | None, grade: str) -> dict[str, Any]:
    """SM-2, simplified. Mirrors what the browser used to do locally."""
    reps = prev["reps"] if prev else 0
    ease = prev["ease"] if prev else 2.5
    interval = prev["interval"] if prev else 0
    lapses = prev["lapses"] if prev else 0

    if grade == "again":
        reps, interval, lapses = 0, 0, lapses + 1
        ease = max(MIN_EASE, ease - 0.2)
    elif grade == "hard":
        ease = max(MIN_EASE, ease - 0.15)
        interval = 1 if reps == 0 else max(1, round(interval * 1.2))
        reps += 1
    elif grade == "good":
        interval = 1 if reps == 0 else (3 if reps == 1 else max(1, round(interval * ease)))
        reps += 1
    elif grade == "easy":
        ease += 0.15
        interval = 2 if reps == 0 else (5 if reps == 1 else max(1, round(interval * ease * 1.3)))
        reps += 1
    else:
        raise HTTPException(status_code=400, detail="grade must be again, hard, good or easy")

    interval = min(int(interval), MAX_INTERVAL_DAYS)
    return {
        "reps": reps,
        "ease": round(float(ease), 4),
        "interval": interval,
        "lapses": lapses,
        "due": due_after(interval),
    }


def note_row(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "title": row["title"],
        "body": row["body"],
        "color": row["color"],
        "labels": loads_list(row["labels"]),
        "pinned": bool(row["pinned"]),
        "archived": bool(row["archived"]),
        "span_w": row["span_w"],
        "height_px": row["height_px"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def card_row(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "deck_id": row["deck_id"],
        "front": row["front"],
        "back": row["back"],
        "tags": loads_list(row["tags"]),
        "position": row["position"],
    }


def owned_deck(conn: sqlite3.Connection, owner: str, deck_id: str) -> sqlite3.Row:
    row = conn.execute("SELECT * FROM decks WHERE id = ? AND owner = ?", (deck_id, owner)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="deck not found")
    return row


def ensure_seeded(conn: sqlite3.Connection, owner: str) -> None:
    """One-time import of the bundled starter decks for a new user."""
    if conn.execute("SELECT 1 FROM meta WHERE owner = ? AND key = 'seeded_v1'", (owner,)).fetchone():
        return
    if SEED_DIR.is_dir():
        for path in sorted(SEED_DIR.glob("*.json")):
            if path.name == "index.json":
                continue
            try:
                data = json.loads(path.read_text(encoding="utf-8"))
            except (OSError, ValueError):
                continue
            cards = data.get("cards") or []
            if not cards:
                continue
            ts = now_iso()
            deck_id = new_id()
            conn.execute(
                "INSERT INTO decks (id, owner, name, description, created_at, updated_at)"
                " VALUES (?, ?, ?, ?, ?, ?)",
                (deck_id, owner, str(data.get("name") or path.stem)[:120],
                 str(data.get("description") or "")[:500], ts, ts),
            )
            conn.executemany(
                "INSERT INTO cards (id, deck_id, owner, front, back, tags, position, created_at, updated_at)"
                " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [
                    (new_id(), deck_id, owner, str(c.get("front", ""))[:4000],
                     str(c.get("back", ""))[:4000], json.dumps(clean_labels(c.get("tags"))), i, ts, ts)
                    for i, c in enumerate(cards)
                ],
            )
    conn.execute(
        "INSERT OR REPLACE INTO meta (owner, key, value) VALUES (?, 'seeded_v1', ?)", (owner, now_iso())
    )


# --------------------------------------------------------------------------
# models
# --------------------------------------------------------------------------

class NoteIn(BaseModel):
    title: str = Field(default="", max_length=300)
    body: str = Field(default="", max_length=50000)
    color: str = "default"
    labels: list[str] | None = None
    pinned: bool = False
    span_w: int = 1
    height_px: int = 0


class NotePatch(BaseModel):
    title: str | None = Field(default=None, max_length=300)
    body: str | None = Field(default=None, max_length=50000)
    color: str | None = None
    labels: list[str] | None = None
    pinned: bool | None = None
    archived: bool | None = None
    span_w: int | None = None
    height_px: int | None = None


class DeckIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str = Field(default="", max_length=500)


class DeckPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=500)


class CardIn(BaseModel):
    front: str = Field(min_length=1, max_length=4000)
    back: str = Field(default="", max_length=4000)
    tags: list[str] | None = None


class CardPatch(BaseModel):
    front: str | None = Field(default=None, min_length=1, max_length=4000)
    back: str | None = Field(default=None, max_length=4000)
    tags: list[str] | None = None
    position: int | None = None


class BulkIn(BaseModel):
    text: str = Field(max_length=200000)
    separator: str = "tab"


class ReviewIn(BaseModel):
    card_id: str
    grade: str


class DesignIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    payload: dict[str, Any]


class DesignPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    payload: dict[str, Any] | None = None


# --------------------------------------------------------------------------
# identity endpoint
# --------------------------------------------------------------------------

@app.get("/api/me")
def me(user: str = User) -> dict[str, Any]:
    with db() as conn:
        ensure_seeded(conn, user)
    return {"email": user}


# --------------------------------------------------------------------------
# notes
# --------------------------------------------------------------------------

@app.get("/api/notes")
def list_notes(
    user: str = User,
    q: str | None = Query(default=None, max_length=200),
    label: str | None = Query(default=None, max_length=40),
    archived: bool = False,
) -> dict[str, Any]:
    sql = "SELECT * FROM notes WHERE owner = ? AND archived = ?"
    args: list[Any] = [user, 1 if archived else 0]
    if q:
        sql += " AND (title LIKE ? OR body LIKE ?)"
        args += [f"%{q}%", f"%{q}%"]
    if label:
        sql += " AND labels LIKE ?"
        args.append(f'%"{label}"%')
    sql += " ORDER BY pinned DESC, updated_at DESC"

    with db() as conn:
        rows = conn.execute(sql, args).fetchall()
        all_labels = conn.execute("SELECT labels FROM notes WHERE owner = ?", (user,)).fetchall()

    known: list[str] = []
    for r in all_labels:
        for lab in loads_list(r["labels"]):
            if lab not in known:
                known.append(lab)

    return {"notes": [note_row(r) for r in rows], "labels": sorted(known)}


@app.post("/api/notes", status_code=201)
def create_note(payload: NoteIn, user: str = User) -> dict[str, Any]:
    color = payload.color if payload.color in NOTE_COLORS else "default"
    ts = now_iso()
    note_id = new_id()
    with db() as conn:
        conn.execute(
            "INSERT INTO notes (id, owner, title, body, color, labels, pinned, archived,"
            " span_w, height_px, created_at, updated_at)"
            " VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)",
            (note_id, user, payload.title, payload.body, color,
             json.dumps(clean_labels(payload.labels)), int(payload.pinned),
             clamp_span(payload.span_w), clamp_height(payload.height_px), ts, ts),
        )
        row = conn.execute("SELECT * FROM notes WHERE id = ?", (note_id,)).fetchone()
    return note_row(row)


@app.patch("/api/notes/{note_id}")
def update_note(note_id: str, payload: NotePatch, user: str = User) -> dict[str, Any]:
    sets: list[str] = []
    args: list[Any] = []
    if payload.title is not None:
        sets.append("title = ?"); args.append(payload.title)
    if payload.body is not None:
        sets.append("body = ?"); args.append(payload.body)
    if payload.color is not None:
        sets.append("color = ?"); args.append(payload.color if payload.color in NOTE_COLORS else "default")
    if payload.labels is not None:
        sets.append("labels = ?"); args.append(json.dumps(clean_labels(payload.labels)))
    if payload.pinned is not None:
        sets.append("pinned = ?"); args.append(int(payload.pinned))
    if payload.archived is not None:
        sets.append("archived = ?"); args.append(int(payload.archived))

    # Geometry is presentation only. Bumping updated_at for a resize would
    # reorder the board mid-drag and misreport when the note was last edited.
    geometry_only = not sets
    if payload.span_w is not None:
        sets.append("span_w = ?"); args.append(clamp_span(payload.span_w))
    if payload.height_px is not None:
        sets.append("height_px = ?"); args.append(clamp_height(payload.height_px))

    if not sets:
        raise HTTPException(status_code=400, detail="nothing to update")

    if not geometry_only:
        sets.append("updated_at = ?"); args.append(now_iso())
    args += [note_id, user]

    with db() as conn:
        cur = conn.execute(f"UPDATE notes SET {', '.join(sets)} WHERE id = ? AND owner = ?", args)
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="note not found")
        row = conn.execute("SELECT * FROM notes WHERE id = ?", (note_id,)).fetchone()
    return note_row(row)


@app.delete("/api/notes/{note_id}", status_code=204)
def delete_note(note_id: str, user: str = User) -> JSONResponse:
    with db() as conn:
        cur = conn.execute("DELETE FROM notes WHERE id = ? AND owner = ?", (note_id, user))
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="note not found")
    return JSONResponse(status_code=204, content=None)


# --------------------------------------------------------------------------
# decks
# --------------------------------------------------------------------------

@app.get("/api/decks")
def list_decks(user: str = User) -> dict[str, Any]:
    today = today_iso()
    with db() as conn:
        ensure_seeded(conn, user)
        rows = conn.execute(
            """
            SELECT d.*,
              (SELECT COUNT(*) FROM cards c WHERE c.deck_id = d.id) AS total,
              (SELECT COUNT(*) FROM cards c LEFT JOIN reviews r
                 ON r.card_id = c.id AND r.owner = ?
               WHERE c.deck_id = d.id AND r.card_id IS NULL) AS fresh,
              (SELECT COUNT(*) FROM cards c JOIN reviews r
                 ON r.card_id = c.id AND r.owner = ?
               WHERE c.deck_id = d.id AND r.due <= ?) AS due,
              (SELECT COUNT(*) FROM cards c JOIN reviews r
                 ON r.card_id = c.id AND r.owner = ?
               WHERE c.deck_id = d.id AND r.interval >= ?) AS learned
            FROM decks d WHERE d.owner = ? ORDER BY d.name COLLATE NOCASE
            """,
            (user, user, today, user, MATURE_INTERVAL, user),
        ).fetchall()

    return {
        "decks": [
            {
                "id": r["id"], "name": r["name"], "description": r["description"],
                "counts": {"total": r["total"], "new": r["fresh"], "due": r["due"], "learned": r["learned"]},
            }
            for r in rows
        ]
    }


@app.post("/api/decks", status_code=201)
def create_deck(payload: DeckIn, user: str = User) -> dict[str, Any]:
    ts = now_iso()
    deck_id = new_id()
    with db() as conn:
        conn.execute(
            "INSERT INTO decks (id, owner, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
            (deck_id, user, payload.name, payload.description, ts, ts),
        )
    return {"id": deck_id, "name": payload.name, "description": payload.description,
            "counts": {"total": 0, "new": 0, "due": 0, "learned": 0}}


@app.patch("/api/decks/{deck_id}")
def update_deck(deck_id: str, payload: DeckPatch, user: str = User) -> dict[str, Any]:
    sets: list[str] = []
    args: list[Any] = []
    if payload.name is not None:
        sets.append("name = ?"); args.append(payload.name)
    if payload.description is not None:
        sets.append("description = ?"); args.append(payload.description)
    if not sets:
        raise HTTPException(status_code=400, detail="nothing to update")
    sets.append("updated_at = ?"); args.append(now_iso())
    args += [deck_id, user]

    with db() as conn:
        cur = conn.execute(f"UPDATE decks SET {', '.join(sets)} WHERE id = ? AND owner = ?", args)
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="deck not found")
        row = conn.execute("SELECT * FROM decks WHERE id = ?", (deck_id,)).fetchone()
    return {"id": row["id"], "name": row["name"], "description": row["description"]}


@app.delete("/api/decks/{deck_id}", status_code=204)
def delete_deck(deck_id: str, user: str = User) -> JSONResponse:
    with db() as conn:
        card_ids = [r["id"] for r in conn.execute("SELECT id FROM cards WHERE deck_id = ?", (deck_id,))]
        cur = conn.execute("DELETE FROM decks WHERE id = ? AND owner = ?", (deck_id, user))
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="deck not found")
        if card_ids:
            conn.executemany("DELETE FROM reviews WHERE card_id = ?", [(cid,) for cid in card_ids])
    return JSONResponse(status_code=204, content=None)


@app.get("/api/decks/{deck_id}/export")
def export_deck(deck_id: str, user: str = User) -> dict[str, Any]:
    with db() as conn:
        deck = owned_deck(conn, user, deck_id)
        cards = conn.execute(
            "SELECT * FROM cards WHERE deck_id = ? ORDER BY position, created_at", (deck_id,)
        ).fetchall()
    return {
        "name": deck["name"],
        "description": deck["description"],
        "cards": [{"front": c["front"], "back": c["back"], "tags": loads_list(c["tags"])} for c in cards],
    }


# --------------------------------------------------------------------------
# cards
# --------------------------------------------------------------------------

@app.get("/api/decks/{deck_id}/cards")
def list_cards(deck_id: str, user: str = User) -> dict[str, Any]:
    with db() as conn:
        deck = owned_deck(conn, user, deck_id)
        rows = conn.execute(
            "SELECT * FROM cards WHERE deck_id = ? ORDER BY position, created_at", (deck_id,)
        ).fetchall()
    return {"deck": {"id": deck["id"], "name": deck["name"], "description": deck["description"]},
            "cards": [card_row(r) for r in rows]}


@app.post("/api/decks/{deck_id}/cards", status_code=201)
def create_card(deck_id: str, payload: CardIn, user: str = User) -> dict[str, Any]:
    ts = now_iso()
    card_id = new_id()
    with db() as conn:
        owned_deck(conn, user, deck_id)
        pos = conn.execute(
            "SELECT COALESCE(MAX(position), -1) + 1 AS p FROM cards WHERE deck_id = ?", (deck_id,)
        ).fetchone()["p"]
        conn.execute(
            "INSERT INTO cards (id, deck_id, owner, front, back, tags, position, created_at, updated_at)"
            " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (card_id, deck_id, user, payload.front, payload.back,
             json.dumps(clean_labels(payload.tags)), pos, ts, ts),
        )
        conn.execute("UPDATE decks SET updated_at = ? WHERE id = ?", (ts, deck_id))
        row = conn.execute("SELECT * FROM cards WHERE id = ?", (card_id,)).fetchone()
    return card_row(row)


@app.post("/api/decks/{deck_id}/cards/bulk", status_code=201)
def bulk_create_cards(deck_id: str, payload: BulkIn, user: str = User) -> dict[str, Any]:
    sep = {"tab": "\t", "comma": ",", "pipe": "|", "semicolon": ";"}.get(payload.separator, "\t")
    ts = now_iso()
    rows: list[tuple] = []
    skipped = 0

    with db() as conn:
        owned_deck(conn, user, deck_id)
        pos = conn.execute(
            "SELECT COALESCE(MAX(position), -1) + 1 AS p FROM cards WHERE deck_id = ?", (deck_id,)
        ).fetchone()["p"]

        for line in payload.text.splitlines():
            line = line.strip()
            if not line:
                continue
            parts = [p.strip() for p in line.split(sep)]
            front = parts[0][:4000] if parts else ""
            back = parts[1][:4000] if len(parts) > 1 else ""
            if not front or not back:
                skipped += 1
                continue
            tags = clean_labels(parts[2].split(",")) if len(parts) > 2 and parts[2] else []
            rows.append((new_id(), deck_id, user, front, back, json.dumps(tags), pos, ts, ts))
            pos += 1

        if rows:
            conn.executemany(
                "INSERT INTO cards (id, deck_id, owner, front, back, tags, position, created_at, updated_at)"
                " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                rows,
            )
            conn.execute("UPDATE decks SET updated_at = ? WHERE id = ?", (ts, deck_id))

    return {"created": len(rows), "skipped": skipped}


@app.patch("/api/cards/{card_id}")
def update_card(card_id: str, payload: CardPatch, user: str = User) -> dict[str, Any]:
    sets: list[str] = []
    args: list[Any] = []
    if payload.front is not None:
        sets.append("front = ?"); args.append(payload.front)
    if payload.back is not None:
        sets.append("back = ?"); args.append(payload.back)
    if payload.tags is not None:
        sets.append("tags = ?"); args.append(json.dumps(clean_labels(payload.tags)))
    if payload.position is not None:
        sets.append("position = ?"); args.append(int(payload.position))
    if not sets:
        raise HTTPException(status_code=400, detail="nothing to update")
    sets.append("updated_at = ?"); args.append(now_iso())
    args += [card_id, user]

    with db() as conn:
        cur = conn.execute(f"UPDATE cards SET {', '.join(sets)} WHERE id = ? AND owner = ?", args)
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="card not found")
        row = conn.execute("SELECT * FROM cards WHERE id = ?", (card_id,)).fetchone()
    return card_row(row)


@app.delete("/api/cards/{card_id}", status_code=204)
def delete_card(card_id: str, user: str = User) -> JSONResponse:
    with db() as conn:
        cur = conn.execute("DELETE FROM cards WHERE id = ? AND owner = ?", (card_id, user))
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="card not found")
        conn.execute("DELETE FROM reviews WHERE card_id = ? AND owner = ?", (card_id, user))
    return JSONResponse(status_code=204, content=None)


# --------------------------------------------------------------------------
# study
# --------------------------------------------------------------------------

@app.get("/api/decks/{deck_id}/study")
def study(
    deck_id: str,
    user: str = User,
    limit_new: int = Query(default=20, ge=0, le=200),
    mode: str = Query(default="review", pattern="^(review|cram)$"),
) -> dict[str, Any]:
    """
    review — cards due today, plus a capped number never seen before.
    cram   — the whole deck regardless of schedule, for free practice. The
             client does not post reviews for a cram run, so the spacing that
             `review` depends on is left untouched.
    """
    today = today_iso()
    with db() as conn:
        deck = owned_deck(conn, user, deck_id)
        if mode == "cram":
            scheduled = conn.execute(
                "SELECT * FROM cards WHERE deck_id = ? ORDER BY position", (deck_id,)
            ).fetchall()
            unseen: list[sqlite3.Row] = []
        else:
            scheduled = conn.execute(
                """
                SELECT c.*, r.reps, r.ease, r.interval, r.lapses, r.due
                FROM cards c JOIN reviews r ON r.card_id = c.id AND r.owner = ?
                WHERE c.deck_id = ? AND r.due <= ? ORDER BY r.due, c.position
                """,
                (user, deck_id, today),
            ).fetchall()
            unseen = conn.execute(
                """
                SELECT c.* FROM cards c LEFT JOIN reviews r ON r.card_id = c.id AND r.owner = ?
                WHERE c.deck_id = ? AND r.card_id IS NULL ORDER BY c.position LIMIT ?
                """,
                (user, deck_id, limit_new),
            ).fetchall()

    def pack(row: sqlite3.Row, seen: bool) -> dict[str, Any]:
        out = card_row(row)
        out["seen"] = seen
        return out

    return {
        "deck": {"id": deck["id"], "name": deck["name"]},
        "mode": mode,
        "cards": [pack(r, True) for r in scheduled] + [pack(r, False) for r in unseen],
    }


@app.post("/api/reviews")
def record_review(payload: ReviewIn, user: str = User) -> dict[str, Any]:
    with db() as conn:
        card = conn.execute(
            "SELECT id FROM cards WHERE id = ? AND owner = ?", (payload.card_id, user)
        ).fetchone()
        if card is None:
            raise HTTPException(status_code=404, detail="card not found")
        prev = conn.execute(
            "SELECT * FROM reviews WHERE owner = ? AND card_id = ?", (user, payload.card_id)
        ).fetchone()
        state = schedule(prev, payload.grade)
        conn.execute(
            "INSERT INTO reviews (owner, card_id, reps, ease, interval, lapses, due, updated_at)"
            " VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
            " ON CONFLICT (owner, card_id) DO UPDATE SET"
            " reps = excluded.reps, ease = excluded.ease, interval = excluded.interval,"
            " lapses = excluded.lapses, due = excluded.due, updated_at = excluded.updated_at",
            (user, payload.card_id, state["reps"], state["ease"], state["interval"],
             state["lapses"], state["due"], now_iso()),
        )
    return state


# --------------------------------------------------------------------------
# saved designs (public EDA flow app)
# --------------------------------------------------------------------------

def design_payload(raw: str) -> dict[str, Any]:
    try:
        val = json.loads(raw)
    except ValueError:
        raise HTTPException(status_code=500, detail="stored design is unreadable")
    return val if isinstance(val, dict) else {}


def dump_payload(payload: dict[str, Any]) -> str:
    raw = json.dumps(payload, separators=(",", ":"))
    if len(raw.encode("utf-8")) > MAX_DESIGN_BYTES:
        raise HTTPException(status_code=413, detail="design is too large to save")
    return raw


@app.get("/api/designs")
def list_designs(user: str = User) -> dict[str, Any]:
    """
    Doubles as the sign-in probe for the EDA app, which is served publicly and
    needs to know whether saving is available without bouncing an anonymous
    visitor to Google. Nginx answers this path with a JSON 401 instead of the
    usual redirect, and the client reads that as "anonymous, use local storage".

    Deliberately does not call ensure_seeded: merely opening a public page
    should not conjure a set of starter flash-card decks.
    """
    with db() as conn:
        rows = conn.execute(
            "SELECT id, name, created_at, updated_at FROM designs"
            " WHERE owner = ? ORDER BY updated_at DESC",
            (user,),
        ).fetchall()
    return {"email": user, "designs": [dict(r) for r in rows]}


@app.post("/api/designs", status_code=201)
def create_design(payload: DesignIn, user: str = User) -> dict[str, Any]:
    raw = dump_payload(payload.payload)
    ts = now_iso()
    design_id = new_id()
    with db() as conn:
        held = conn.execute("SELECT COUNT(*) AS n FROM designs WHERE owner = ?", (user,)).fetchone()["n"]
        if held >= MAX_DESIGNS:
            raise HTTPException(status_code=409, detail=f"limit of {MAX_DESIGNS} saved designs reached")
        conn.execute(
            "INSERT INTO designs (id, owner, name, payload, created_at, updated_at)"
            " VALUES (?, ?, ?, ?, ?, ?)",
            (design_id, user, payload.name, raw, ts, ts),
        )
    return {"id": design_id, "name": payload.name, "created_at": ts, "updated_at": ts}


@app.get("/api/designs/{design_id}")
def get_design(design_id: str, user: str = User) -> dict[str, Any]:
    with db() as conn:
        row = conn.execute(
            "SELECT * FROM designs WHERE id = ? AND owner = ?", (design_id, user)
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="design not found")
    return {
        "id": row["id"],
        "name": row["name"],
        "payload": design_payload(row["payload"]),
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


@app.patch("/api/designs/{design_id}")
def update_design(design_id: str, payload: DesignPatch, user: str = User) -> dict[str, Any]:
    sets: list[str] = []
    args: list[Any] = []
    if payload.name is not None:
        sets.append("name = ?"); args.append(payload.name)
    if payload.payload is not None:
        sets.append("payload = ?"); args.append(dump_payload(payload.payload))
    if not sets:
        raise HTTPException(status_code=400, detail="nothing to update")

    ts = now_iso()
    sets.append("updated_at = ?"); args.append(ts)
    args += [design_id, user]

    with db() as conn:
        cur = conn.execute(f"UPDATE designs SET {', '.join(sets)} WHERE id = ? AND owner = ?", args)
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="design not found")
        row = conn.execute("SELECT id, name, created_at, updated_at FROM designs WHERE id = ?", (design_id,)).fetchone()
    return dict(row)


@app.delete("/api/designs/{design_id}", status_code=204)
def delete_design(design_id: str, user: str = User) -> JSONResponse:
    with db() as conn:
        cur = conn.execute("DELETE FROM designs WHERE id = ? AND owner = ?", (design_id, user))
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="design not found")
    return JSONResponse(status_code=204, content=None)


# --------------------------------------------------------------------------
# algorithms: server-side C++
# --------------------------------------------------------------------------
#
# This endpoint hands code to a compiler. Two boundaries keep that reasonable,
# and neither of them is this function.
#
# Who may call it is decided in nginx: /api/algorithms/ is gated by
# /oauth2/auth-ops, the same owner-only subrequest that protects /_ops/, so a
# signed-in visitor who is not the owner gets a 404 and never learns it exists.
#
# What the code may do once compiled is decided by server/cc/runner.py, which
# runs it under bubblewrap with no network namespace, no writable filesystem and
# hard resource limits.
#
# What is left for this function is the input contract: bound the payload, and
# make sure the graph the program is given is the graph that was drawn.

class GraphNodeIn(BaseModel):
    id: str = Field(min_length=1, max_length=16)


class GraphEdgeIn(BaseModel):
    u: str = Field(min_length=1, max_length=16)
    v: str = Field(min_length=1, max_length=16)
    w: int


class AlgoRunIn(BaseModel):
    topic: str = Field(min_length=1, max_length=60)
    body: str = Field(max_length=MAX_CC_BODY)
    nodes: list[GraphNodeIn]
    edges: list[GraphEdgeIn]


_cc_hits: dict[str, list[float]] = {}
_cc_lock = threading.Lock()


def cc_rate_check(user: str) -> None:
    """
    A compile costs a second of CPU and 110 MB on a box with under 500 MB spare,
    so the cost of a stuck retry loop in the browser is real even with a single
    authorised caller. In-process and per-worker, which is sufficient: there is
    one uvicorn worker, and the runner independently refuses concurrent jobs.
    """
    now = time.monotonic()
    with _cc_lock:
        hits = [t for t in _cc_hits.get(user, []) if now - t < CC_RATE_WINDOW]
        if len(hits) >= CC_RUNS_PER_WINDOW:
            wait = int(CC_RATE_WINDOW - (now - hits[0])) + 1
            raise HTTPException(status_code=429, detail=f"too many runs; try again in {wait}s")
        hits.append(now)
        _cc_hits[user] = hits


def cc_normalise_graph(payload: AlgoRunIn) -> tuple[int, list[list[int]], list[str]]:
    """
    Turn the drawn graph into what the harness reads on stdin: a vertex count,
    edges as 0-based index triples, and the labels in vertex order. Edge order is
    preserved because frames address edges by their index in this list, and the
    renderer drew them in the same order.
    """
    if not payload.nodes:
        raise HTTPException(status_code=400, detail="the graph has no vertices")
    if len(payload.nodes) > MAX_CC_NODES:
        raise HTTPException(status_code=400, detail=f"at most {MAX_CC_NODES} vertices")
    if len(payload.edges) > MAX_CC_EDGES:
        raise HTTPException(status_code=400, detail=f"at most {MAX_CC_EDGES} edges")

    index: dict[str, int] = {}
    labels: list[str] = []
    for node in payload.nodes:
        name = node.id.strip()
        if not CC_LABEL_RE.match(name):
            raise HTTPException(status_code=400, detail=f"unusable vertex name {node.id!r}")
        if name in index:
            raise HTTPException(status_code=400, detail=f"duplicate vertex {name!r}")
        index[name] = len(labels)
        labels.append(name)

    edges: list[list[int]] = []
    for edge in payload.edges:
        if edge.u not in index or edge.v not in index:
            raise HTTPException(status_code=400, detail="an edge refers to an unknown vertex")
        if abs(edge.w) > MAX_CC_WEIGHT:
            raise HTTPException(status_code=400, detail="an edge weight is out of range")
        edges.append([index[edge.u], index[edge.v], edge.w])

    return len(labels), edges, labels


@app.post("/api/algorithms/run")
def run_algorithm(payload: AlgoRunIn, user: str = User) -> dict[str, Any]:
    if payload.topic not in CC_TOPICS:
        raise HTTPException(status_code=400, detail=f"no server-side runner for {payload.topic!r}")
    if not payload.body.strip():
        raise HTTPException(status_code=400, detail="there is nothing to compile")

    # The harness owns the preprocessor, so a body carrying its own directives
    # has misread the contract. Saying so is worth a clear error. It is not a
    # security check and is not relied on as one: #include cannot reach anything
    # interesting from inside the sandbox anyway.
    for directive in ("#include", "#pragma"):
        if directive in payload.body:
            raise HTTPException(
                status_code=400,
                detail=f"remove the {directive} — the harness supplies the standard headers",
            )

    n, edges, labels = cc_normalise_graph(payload)
    cc_rate_check(user)

    request = urllib.request.Request(
        CC_URL,
        data=json.dumps({"topic": payload.topic, "body": payload.body,
                         "n": n, "edges": edges, "labels": labels}).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=CC_TIMEOUT) as response:
            return json.loads(response.read())
    except urllib.error.HTTPError as exc:
        # The runner answers refusals with a JSON body of the same shape, so pass
        # its explanation through rather than flattening it to a bare 502.
        try:
            return json.loads(exc.read())
        except (ValueError, OSError):
            raise HTTPException(status_code=502, detail="the runner returned an unreadable error")
    except (urllib.error.URLError, TimeoutError, OSError):
        raise HTTPException(status_code=503, detail="the compiler service is not responding")


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
