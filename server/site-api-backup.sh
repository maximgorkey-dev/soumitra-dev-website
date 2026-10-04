#!/usr/bin/env bash
# Consistent online SQLite backup plus note attachments, encrypted at rest,
# 14-day retention. Installed as /usr/local/bin/site-api-backup.sh and run
# nightly by site-api-backup.timer.
#
# Attachments never change after upload, so each one is encrypted once into
# $DIR/files/. A copy whose original has gone is kept for 14 more days, so any
# database backup still within retention can find every file it refers to.
set -euo pipefail
DB=/var/lib/site-api/data.db
FILES=/var/lib/site-api/files
DIR=/var/backups/site-api
KEY=/etc/site-api/backup.key
[ -f "$DB" ] || exit 0
mkdir -p "$DIR/files"
TS=$(date +%Y%m%d-%H%M%S)
TMP=$(mktemp /tmp/site-api-bk.XXXXXX.db)
trap 'rm -f "$TMP" "$TMP"-wal "$TMP"-shm' EXIT

python3 - "$DB" "$TMP" <<'PY'
import sqlite3, sys
src = sqlite3.connect(f"file:{sys.argv[1]}?mode=ro", uri=True)
dst = sqlite3.connect(sys.argv[2])
with dst:
    src.backup(dst)
dst.close()
src.close()
PY

gpg --batch --yes --quiet --symmetric --cipher-algo AES256 \
    --passphrase-file "$KEY" -o "$DIR/data-$TS.db.gpg" "$TMP"
chmod 600 "$DIR/data-$TS.db.gpg"
find "$DIR" -maxdepth 1 -name 'data-*.db.gpg' -mtime +14 -delete

if [ -d "$FILES" ]; then
    for f in "$FILES"/*; do
        id=$(basename "$f")
        [[ $id =~ ^[0-9a-f]{32}$ ]] || continue
        out="$DIR/files/$id.gpg"
        [ -f "$out" ] && continue
        gpg --batch --yes --quiet --symmetric --cipher-algo AES256 \
            --passphrase-file "$KEY" -o "$out.tmp" "$f"
        chmod 600 "$out.tmp"
        mv "$out.tmp" "$out"
    done
fi

# A backup copy's mtime is reset to "now" while its original exists, so the
# 14-day clock only starts once the original has been deleted.
for b in "$DIR"/files/*.gpg; do
    [ -e "$b" ] || continue
    id=$(basename "$b" .gpg)
    if [ -f "$FILES/$id" ]; then touch "$b"; fi
done
find "$DIR/files" -name '*.gpg' -mtime +14 -delete
find "$DIR/files" -name '*.tmp' -delete
