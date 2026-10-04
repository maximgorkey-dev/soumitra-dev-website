#!/usr/bin/env python3
"""Add cards that were appended to a seed deck after users had imported it.

site-api imports each seed file once per user, so later additions never
reach existing decks. This adds, to every user who imported the file, the
seed cards whose front is not already in their deck of the same name.
Existing cards and their review history are untouched. A user who deleted
the whole deck is skipped; a card they deleted individually is re-added.

    sudo -u siteapi python3 tools/seed-topup.py /opt/site-api/seed/design-patterns.json [--dry-run]
"""

import json
import sqlite3
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

DB = Path("/var/lib/site-api/data.db")


def main() -> None:
    args = [a for a in sys.argv[1:] if a != "--dry-run"]
    dry = "--dry-run" in sys.argv
    seed = Path(args[0])
    data = json.loads(seed.read_text(encoding="utf-8"))
    name = str(data.get("name") or seed.stem)[:120]
    cards = data.get("cards") or []

    conn = sqlite3.connect(DB, timeout=10.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    owners = [r["owner"] for r in conn.execute("SELECT owner FROM meta WHERE key = ?", (f"seed:{seed.name}",))]
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    with conn:
        for owner in owners:
            deck = conn.execute("SELECT id FROM decks WHERE owner = ? AND name = ?", (owner, name)).fetchone()
            if deck is None:
                print(f"{owner}: no deck named {name!r}, skipped")
                continue
            have = {r["front"] for r in conn.execute("SELECT front FROM cards WHERE deck_id = ?", (deck["id"],))}
            pos = conn.execute("SELECT COALESCE(MAX(position), -1) FROM cards WHERE deck_id = ?", (deck["id"],)).fetchone()[0]
            new = [c for c in cards if str(c.get("front", ""))[:4000] not in have]
            print(f"{owner}: {len(new)} new card(s)")
            if dry:
                continue
            for c in new:
                pos += 1
                conn.execute(
                    "INSERT INTO cards (id, deck_id, owner, front, back, tags, position, created_at, updated_at)"
                    " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    (uuid.uuid4().hex[:16], deck["id"], owner, str(c.get("front", ""))[:4000], str(c.get("back", ""))[:4000],
                     json.dumps([str(t) for t in c.get("tags") or []]), pos, now, now),
                )
            conn.execute("UPDATE decks SET updated_at = ? WHERE id = ?", (now, deck["id"]))


if __name__ == "__main__":
    main()
