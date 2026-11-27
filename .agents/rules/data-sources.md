# Data sources and id alignment

This project’s catalog does not treat upstream VocaDB as authoritative. VocaDB is a **peer reference alongside other wikis**: use it to fill song titles, song ids, and show dates when available; do not wait on it when it is missing.

## Source order

1. Official: official sites, ticket pages, official albums / track lists, announcements.
2. Encyclopedias: 初音ミク Wiki (atwiki), Moegirl, VocaDB Fandom.
3. VocaDB public API.

On conflict, prefer official, then encyclopedias, then VocaDB. **No source owns the record**: whatever a source contributed is booked under `performance_setlist_sources` / `songs.source_url`. Do not rewrite an already recorded source because VocaDB disagrees.

## Id alignment

- Prefer VocaDB ids when they exist: reuse them for `performances.id`, `series.id`, and `songs.id` for interoperability.
- Only when VocaDB has no entry, use reserved ranges: songs from `2_000_000_000`, performances from `3_000_000_000`, series from `900_000_000` (`shared/repertoire.ts`).
- Alignment is “when convenient,” not a goal: new local rows need not wait for a matching VocaDB entry, and do not renumber existing references just to match a VocaDB id.

## When this catalog disagrees with VocaDB

- **Keep collected data.** Missing shows, renamed events, date changes, deleted or newly added setlists upstream are not reasons to delete or rewrite this project’s records.
- `pnpm collect` / `vp run collect` rewrites `0001` wholesale. After a run, compare performance and 场次 counts: if a previously collected show disappeared, restore it with `INSERT OR IGNORE` under `data/increments/` (including schedule sources); do not accept the deletion. `vp run derive:setlists -- --check` reporting “unknown performance” is the same signal.
- Do not drop a show from stats, rankings, or indexes because VocaDB lacks it; do not let a VocaDB setlist overwrite an encyclopedia track table (encyclopedia full replace of VocaDB rows is allowed; the reverse is not).
- Change display fields (name, date, venue) only with official or encyclopedia evidence; human corrections in `data/increments/` stay after `0001` and stay idempotent.
- Two ids for the same show/song: resolve manually via `data/setlist-merges.json`, `data/song-variants.json`, or `docs/data-issues.md` — never auto-replace with “upstream wins.”
- Record the difference: note in `docs/data-issues.md` or the relevant review report what we kept and how it differs from VocaDB.

## Curation judgments

- Adding a show: prove schedule and setlist from official/encyclopedia first; if only VocaDB has it, ingest as VocaDB-only and set `confidence`.
- Adding a song: resolve title via local catalog, then encyclopedia title, then VocaDB search; if still unknown, register a local song (`data/wiki-repertoire.json`) — do not skip.
- Producer credits: prefer VocaDB structured credits, but official album credits win on conflict; log conflicts in `docs/reports/producer-conflicts.md` for human decision.
- Before re-running collect, confirm it will not wipe manual `INSERT OR IGNORE` rows; afterward check performance/场次 counts and `vp run derive:setlists -- --check`.
