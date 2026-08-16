"""Backing API for the authenticated apps on soumitra.dev.

Identity is established by oauth2-proxy and handed over by nginx in the
X-Auth-Email header. Nginx sets that header itself on every proxied request,
so a client cannot forge it, and this service binds to loopback only.
"""

from __future__ import annotations

import json
import os
import sqlite3
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
def study(deck_id: str, user: str = User, limit_new: int = Query(default=20, ge=0, le=200)) -> dict[str, Any]:
    today = today_iso()
    with db() as conn:
        deck = owned_deck(conn, user, deck_id)
        due = conn.execute(
            """
            SELECT c.*, r.reps, r.ease, r.interval, r.lapses, r.due
            FROM cards c JOIN reviews r ON r.card_id = c.id AND r.owner = ?
            WHERE c.deck_id = ? AND r.due <= ? ORDER BY r.due, c.position
            """,
            (user, deck_id, today),
        ).fetchall()
        fresh = conn.execute(
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
        "cards": [pack(r, True) for r in due] + [pack(r, False) for r in fresh],
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


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
