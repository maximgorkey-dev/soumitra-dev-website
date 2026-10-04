# Deferred work

Items deliberately skipped to save tokens. Pick from the top when budget allows.
Lives under /apps/ so it sits behind the login, unlike the site root.

## Context change (2026-10-03)

The second Cursor account can no longer be used for personal work. The
algorithms plan in `apps/algorithms/ROADMAP.md` assumed that account would
write the algorithm modules; that content now has to come from this account,
so the roadmap's split of work no longer holds. The renderer and contract
work in it is still valid.

## EDA demo (`/eda/`)

- **Hold fixing.** The default registered adder shows about -21 ps hold slack
  because clock skew exceeds the shortest path's margin. Real flows insert
  delay buffers; nothing here does. The primer now explains this; a hold-fix
  step after timing is still not built.
- **Clock buffers are not legalised** into rows; they are timed at their ideal
  positions.
- **Skew balancing** (zero-skew merging, wire snaking) is not done.
- **Detail routing** is explained only, and timing uses global-route lengths
  rather than extracted parasitics.
- **Routing overlay readability** was not checked zoomed in after moving the
  layer above the cells.
- **Per-net route geometry** is not drawn; the overlay shows demand per tile
  boundary instead.

## Notes attachments (phase 2, shipped 2026-10-03)

- **Backups are on the same disk.** The nightly encrypted backup (database
  and, since 2026-10-04, attachments) goes to `/var/backups/site-api` on the
  VM itself, so losing the disk loses the backups too. Needs an off-site copy,
  for example a Cloud Storage bucket.
- **Orphaned files are swept, not deleted at once.** Every 6 hours the API marks
  files that no note, card or design refers to, and deletes them after 7 days.
  Until then they still count against the quota.
- **Non-image files always download**, including PDFs; nothing is previewed.
- **No resizing or compression** of pasted images, and no upload progress bar.
- **Images inside copied rich text** (for example a web page selection) are
  still dropped; only an image pasted on its own is uploaded.
- **Attachments are not included** in any user-facing export of notes (the
  server backup does include them).
