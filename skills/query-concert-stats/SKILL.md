---
name: query-concert-stats
description: Answer Hatsune Miku concert setlist and song-appearance questions from the miku-concert-stats catalog and public Worker APIs. Use when asked how many times a song was performed, for a show's setlist, a series' performances, debut years, ranking/counting semantics, or VocaDB attribution; includes the exact SQLite schema, SQL recipes, HTTP routes, and data-honesty rules.
---

# Query Hatsune Miku concert statistics

This is the skill for the site <https://miku-concert-stats.rjiazhen.top>. It explains how to answer setlist and song-appearance questions **from data**, without scraping the site's HTML. The site is a Nuxt 4 + Cloudflare Workers frontend; its aggregation runs in the browser against a SQLite catalog. The same catalog is downloadable, so an agent can compute answers locally.

## Contents

1. [Choose the right path](#1-choose-the-right-path)
2. [Three-level model, tables, pages](#2-three-level-model-tables-pages)
3. [Public HTTP surface and static assets](#3-public-http-surface-and-static-assets)
4. [Recommended catalog workflow](#4-recommended-catalog-workflow)
5. [Counting modes and hard rules](#5-counting-modes-and-hard-rules)
6. [Data honesty, attribution, and rate limits](#6-data-honesty-attribution-and-rate-limits)
7. [Copy-paste recipes](#7-copy-paste-recipes)
8. [Success criteria](#8-success-criteria)

## 1. Choose the right path

Use the cheapest correct path, in this order:

1. **Download the catalog once**, open it read-only, and compute with SQL plus the ported `shared/` logic. This is the only way to answer counts exactly, and it works offline after the download.
2. **Never scrape HTML pages** (`/`, `/songs/{id}`, `/shows/{id}`, `/series`, `/series/{id}`, `/cities`, `/raw`, `/report`) to extract numbers. Those pages are for humans; their tables are rendered from the same catalog and can change without notice.

The site is Chinese-first; answer in the language the user used. Keep the Chinese terms 系列 / 演出 / 场次 when they remove ambiguity.

## 2. Three-level model, tables, pages

The site uses exactly three levels. The wording matters because "show" in English can mean either 演出 or 场次.

| Level | Chinese | Meaning | Database | VocaDB | Page |
| --- | --- | --- | --- | --- | --- |
| Series | 系列 | A concert series, e.g. マジカルミライ | one `series` row; `series.id` is the VocaDB series id | `https://vocadb.net/Es/{id}` | `/series/{id}`, `/series` |
| Performance | 演出 | One city stop / one VocaDB release event | one `performances` row; `series_id` + `series_number` say which series year it belongs to | `https://vocadb.net/E/{id}` | `/shows/{id}` |
| Show | 场次 | One calendar day, or one half of a day that had a daytime and a night-time show | derived from `performances.start_date`–`end_date` plus setlist notes; not a table | — | the show list on `/shows/{id}`; the `show` ranking mode |

`系列年度` (`series_id` + `series_number`) is a grouping used for premieres and setlist comparison, **not** a fourth navigation level. Two city stops in the same series year are two 演出, not one.

Known VocaDB series ids in the current catalog (`scripts/vocadb/collect.ts` `SERIES_IDS`):

| id | Series |
| --- | --- |
| 81 | 初音ミク「マジカルミライ」 |
| 82 | MIKU EXPO |
| 173 | MIKU WITH YOU |
| 204 | SNOW MIKU LIVE! |
| 219 | 初音ミクライブパーティー |
| 255 | 初音ミク×鼓童 |
| 256 | 初音ミクシンフォニー |

The current built catalog has 7 `series` rows, 207 `performances`, 448 `songs`, 1,985 `setlist_items`, 1,985 `setlist_item_songs`, 177 `performance_setlists`, 287 `performance_show_setlists`, and 7,036 `performance_show_setlist_items`. Those numbers grow; query the catalog rather than quoting them as permanent facts.

### Two setlist layers

VocaDB stores **one** song list for a whole run and lets several 演出 share it, so a `song_lists` row is not any single show's setlist. This catalog therefore keeps two layers:

| Layer | Tables | Answers |
| --- | --- | --- |
| Source | `song_lists`, `setlist_items`, `setlist_item_songs` | "What does the VocaDB object contain?" Shared lists, raw notes, album fallbacks. Used by `/raw` and the difference report. |
| Per 場次 | `performance_setlists`, `performance_setlist_sources`, `performance_show_setlists`, `performance_show_setlist_items`, `medleys`, `medley_songs` | "What did this one show play?" One ordered setlist per 場次. Used by `/shows`, the ranking, and coverage. |

**Use the per-場次 layer whenever the question is about a specific show.** For example song list 9359 has 29 rows but every 未来有你 2019 stop played 25: the four `Chengdu, Guangzhou` lines only apply to Chengdu and Guangzhou. A `SELECT ... WHERE song_list_id = 9359` answers the wrong question.

### Tables an agent needs

| Table | One row is | Key columns |
| --- | --- | --- |
| `series` | a series | `id`, `name`, `name_ja`, `source_url` (`vocadb.net/Es/{id}`) |
| `performances` | one 演出 / release event / city stop | `id`, `series_id`, `name`, `name_ja`, `venue_name`, `country_code`, `start_date`, `end_date`, `role` (`show` / `broadcast`), `series_number`, `series_suffix`, `song_list_id`, `source_url` (`vocadb.net/E/{id}`, or the schedule source for an id at or above `3_000_000_000`, which marks a 演出 VocaDB does not list at all) |
| `song_lists` | one setlist attached to one or more performances | `id`, `name`, `source` (`vocadb` / `album`), `album_id`, `medium` (`bluray` / `cd` / `dvd`), `source_url` |
| `setlist_items` | one printed setlist line | `song_list_id`, `position`, `listed_song_id`, `notes` |
| `setlist_item_songs` | one song counted from a line | `song_list_id`, `position`, `song_id`, `role` (`listed` / `component`) |
| `performance_setlists` | the derived layer for one 演出 | `performance_id`, `source_list_id`, `source_kind` (`vocadb` / `album` / `wiki`; `source_list_id` is NULL for `wiki`), `change` (`none` / `filtered` / `curated`), `status` (`complete` / `partial` / `conflict` / `inherited`), `resolution` (`vocadb-note` / `vocadb-shared` / `external` / `unresolved`), `source_row_count`, `day_night_dates` (JSON array), `conflict`, `pending_review`, `note` |
| `performance_setlist_sources` | one outside source behind a 演出's attribution | `performance_id`, `url`, `title`, `accessed_at`, `confidence` (`high` / `medium` / `low`), `note`, `conflict` |
| `performance_show_setlists` | one 場次 of the derived layer | `performance_id`, `show_key`, `date`, `half` (`day` / `night` / NULL), `item_count`, `omitted_count`, `uncertain`, `reasons` (JSON array) |
| `performance_show_setlist_items` | one ordered song of one 場次 | `performance_id`, `show_key`, `position`, `source_position` (source row it came from; NULL for a hand-added row), `song_id`, `medley_id` (exactly one of the two is set), `evidence` (`note` / `shared` / `curated` / `wiki`), `notes` |
| `wiki`-sourced rows | a setlist taken from the Miku wiki: 161 of 181 performances, including every Symphony and every multi-city EXPO tour | `performance_setlist_items.evidence = 'wiki'`, `performance_setlists.source_kind = 'wiki'` (`source_list_id` is NULL only when VocaDB had no list at all); cite `performance_setlist_sources` |
| `medleys` / `medley_songs` | one complete medley and its parts | `id` / `medley_id`, `position`, `song_id`; currently empty (medley parts are stored as ordinary rows with a note) |
| `performance_status` | the real outcome of a 演出 that has no setlist row | `performance_id`, `status` (`cancelled` / `postponed` / `upcoming`), `note`, `source_url`, `accessed_at`. VocaDB files cancelled shows as `Finished` with no date, so this table is the only place a cancellation is recorded; `upcoming` marks a dated show that has not happened yet |
| `songs` | one song entry | `id`, `name`, `name_ja`, `name_en`, `artist_string`, `song_type`, `category`, `publish_date`, `source_url` (`vocadb.net/S/{id}`, or the wiki page when `category <> 'vocaloid'`) |
| `song_vocalists` | one credited vocalist of a song | `song_id`, `name`; this is the preferred cast source over `artist_string`. Empty for a non-VOCALOID row |
| `category` (on `songs`) | whether the row is a VOCALOID song | `vocaloid` (normal) or `classical` / `traditional` / `instrumental`. The last three are repertoire registered from a wiki setlist so a 場次 keeps its whole programme: no vocalist, `artist_string` holds the composer, and the row is **not** from VocaDB |
| `song_producers` | one producer-side credit of a song | `song_id`, `artist_id` (VocaDB artist id), `name`, `roles`; mirrors VocaDB's song-page "Producers" section (`Producer` category, plus Composer / Arranger / Voice manipulator roles), so lyricists are absent. This structured roster is authoritative for display and the producer filter; `artist_string` is only the fallback when the song entry records no producer. Disagreements are recorded in `docs/reports/producer-conflicts.md` (`pnpm report:producers`), so quote that instead of parsing `artist_string` |

`show_key` is stable: `{performanceId}:{YYYY-MM-DD}` for a single show, `{performanceId}:{YYYY-MM-DD}:day|night` when the day had both. A 演出 with no start date has no 場次 and contributes nothing to the `show` ranking.

`resolution` and `pending_review` are not decoration. `external` means VocaDB did not locate the show and an outside source did; `pending_review = 1` means the attribution is still open — no source located this show, or its sources contradict each other. A cite with `confidence = 'medium'` (fan wikis) is already adopted and does **not** set `pending_review`; keep citing `performance_setlist_sources` so the reader can judge the source.

Supporting tables: `medley_quarantine` (mashup lines that could not be split; excluded from counts), `videos` (PV links; `platform` is `niconico` / `youtube` / `bilibili`), `view_snapshots` (dated counts), `milestones`, `edition_premieres` (earliest non-broadcast 演出 of a series year), `performance_links`, `conversion_formulas`, `sources` (VocaDB attribution).

The authoritative schema is `data/schema.sql`; the loader is `shared/catalog.ts` (`loadCatalog`).

## 3. Public HTTP surface and static assets

The deployed Worker exposes **one public API route** plus static assets. Do not invent routes. The site never proxies VocaDB at request time; its data is baked into the catalog at build time.

Human-facing pages, all read-only views rather than APIs: `/` (ranking), `/songs/{id}`, `/shows/{id}`, `/series`, `/series/{id}`, `/cities`, `/raw`, `/report`. Use the catalog for numbers; open a page only when the user wants a link.

### `POST /api/feedback`

Public, write-only error report used by the floating “报告错误” button. It accepts the JSON shape in `shared/feedback.ts` and **never returns stored feedback content**.

- Body limit: **16 KiB** of UTF-8; empty, non-JSON, or invalid fields return **400**.
- Required: `description` (trimmed, non-empty, max **4000** characters).
- Optional: `sourceUrl` / `pageUrl` (absolute `http:` or `https:`, max **2000** characters each), `pageTitle` (max **300**), `collectedAt` (parseable ISO date), `viewport` (max **40**, clamped), `catalogVersion` (max **64**, clamped). Unknown fields are ignored.
- Success: `{ "ok": true, "id": "<uuid>" }`. No stored description is returned.
- Storage failure or a missing KV binding returns **503** with a Chinese message. (`nuxt dev` always has no binding, so local submissions return 503 by design.)
- There is no auth, captcha, dedupe, or app-level rate limit on this route. It is only for a real user asking to report a data problem; never use it as a test endpoint, a log sink, or a way to submit generated content.

```http
POST https://miku-concert-stats.rjiazhen.top/api/feedback
Content-Type: application/json

{
  "description": "The 2024 Osaka setlist is missing a song.",
  "sourceUrl": "https://vocadb.net/E/12345",
  "pageUrl": "https://miku-concert-stats.rjiazhen.top/shows/12345",
  "pageTitle": "初音ミク「マジカルミライ 2024」in OSAKA"
}
```

### Static assets

| Path | What it is | Headers |
| --- | --- | --- |
| `GET /data/catalog.sqlite.gz` | gzip-compressed SQLite catalog. The site uses `?v=<16 hex>` (first 16 hex chars of the gzip file's SHA-256) as a long-lived cache key. | `content-type: application/gzip`, `cache-control: public, max-age=31536000, immutable` |
| `GET /data/catalog.sqlite` | uncompressed catalog for direct reads and the `/raw` download link | `content-type: application/vnd.sqlite3`, `cache-control: public, max-age=0, must-revalidate` |
| `GET /sql-wasm.wasm` | sql.js WebAssembly runtime used by the browser; not data | static file |

Current build sizes are approximately **260 KB gzipped / 824 KB uncompressed**. Older docs say ~200 KB / 676 KB; the file grows as shows and songs are added, so treat the size as a range, not a fact to quote. Both SQLite files are build artifacts (git-ignored) produced by `pnpm build:catalog`; the gzip copy is what browsers download because Cloudflare does not compress the `application/vnd.sqlite3` content type.

The `?v=` hash is a browser cache key, not an API. If you need the freshest possible build in an automated job, prefer `/data/catalog.sqlite` (it revalidates) or download the gzip with a cache-busting URL and verify the schema/row counts.

## 4. Recommended catalog workflow

Download once, decompress, open read-only, then run SQL or port the shared functions.

```bash
BASE=https://miku-concert-stats.rjiazhen.top

# Fast path: gzip copy (about 260 KB in the current build).
curl -fL "$BASE/data/catalog.sqlite.gz" -o catalog.sqlite.gz
gunzip -c catalog.sqlite.gz > catalog.sqlite

# Fresh-read path when an edge cache might be stale (about 824 KB).
curl -fL "$BASE/data/catalog.sqlite" -o catalog.sqlite

sqlite3 catalog.sqlite 'SELECT count(*) FROM performances;'
```

Browser (the site's own path, `app/composables/useCatalog.ts`):

```ts
const response = await fetch('/data/catalog.sqlite.gz')
if (!response.body) throw new Error('missing catalog body')
const bytes = new Uint8Array(
  await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer(),
)
const SQL = await initSqlJs({ locateFile: () => '/sql-wasm.wasm' })
const db = new SQL.Database(bytes)
```

Node (read-only; never mutate the downloaded file):

```ts
import Database from 'better-sqlite3'
import { loadCatalog } from './shared/catalog.ts'

const db = new Database('catalog.sqlite', { readonly: true, fileMustExist: true })
const catalog = loadCatalog({
  all: (sql) => db.prepare(sql).all() as never[],
})
```

`loadCatalog` only needs `{ all(sql) }` returning column maps. It loads every table; aggregation deliberately stays in TypeScript, not SQL.

### Port or read these modules

Do not re-derive the rules from this document alone. The source of truth is the repository's `shared/` code:

| Module | What to use |
| --- | --- |
| `shared/catalog.ts` | `loadCatalog(db)` — the row loader and `Catalog` shape |
| `shared/stats.ts` | `rankSongAppearances` (counts), `compareBy` (series / series-year / year comparison), `observeWindow` (before/after snapshots), `representativeVideo` / `representativeVideoForSongs`, `playbackForSongs`, `summarizeBands`, `countedSongIds`, `songIdsForPerformance` |
| `shared/event-schedule.ts` | `performanceSchedules`, `showsForPerformance`, `showsForNotes`, `performanceDates`, `dayNightDatesFor` — the 场次 layer |
| `shared/song-variants.ts` | `parseSongVariants` + `variantSongIdsOf` / `canonicalSongId` — version merging from `data/song-variants.json` |
| `shared/edition-setlists.ts` | `parseSetlistMerges`, `partitionSongLists`, `buildSetlistDisplay` — cross-演出 setlist comparison |
| `shared/performance-setlists.ts` | `buildPerformanceSetlists`, `parsePerformanceSetlistCuration`, `catalogSchedules`, `showCountsByPerformance`, `setlistPerformanceIds`, `derivedItemsByShow`, `derivedItemSongIds`, `showSongIds` — the per-場次 layer, plus the two helpers the index pages use so a wiki-sourced 演出 is not reported as "no setlist" |
| `shared/rotation.ts` | `reviewRotations`, `parseRotationNotes`, `performanceCityKey`, `splitNote` — note → performance/场次 assignment |
| `shared/album-setlists.ts` | album-source detection and the exact Chinese notice text |

For a quick agent implementation, loading the catalog and calling `rankSongAppearances(catalog, options)` is much safer than writing a new SQL counter. The SQL recipes below are for inspection and for answers that do not depend on note-level rotation.

## 5. Counting modes and hard rules

### Default mode is `show` (按场次)

`rankSongAppearances(catalog, { mode: 'show' })` is the default. It counts each derived **场次**:

- A three-day run contributes **3**.
- A day with a daytime and a night-time show contributes **2** (derived from setlist notes such as `Daytime Shows` / `Nighttime Shows`; VocaDB has no structured day/night field).
- An undated performance has **no** 场次 and contributes **0** in `show` mode.
- A line with no show selectors is attributed to **every** 场次 of its 演出, because VocaDB stores one setlist for the whole run. A note naming a day, half, show number, or bare date narrows the line to matching 场次.
- If a note cannot be resolved, the line is still counted but the row is flagged `approximate` with `reasons` and `approximatePerformanceIds`. Report the approximation; do not present it as exact.

### `event` mode (按演出)

`rankSongAppearances(catalog, { mode: 'event' })` counts each `performances` row at most once:

- Two city stops in one series year count **2**.
- An undated performance still counts **1**.
- It does **not** merge city stops into one "series year" event.

Always state which mode you used. The same song can legitimately have different counts in the two modes. For example, with the catalog built on 2026-11-05, `メルト` (`songs.id = 1322`) has `event.count = 60` and `show.count = 76`; both have `performanceCount = 60` and `seriesCount = 7`.

### Exclusions that agents get wrong

- **Broadcasts / livestreams**: excluded by default when `performances.role = 'broadcast'`, and also when `name`, `name_ja`, or `series_suffix` matches `livestream`, `online`, `オンライン`, `VR`, `ＶＲ`, or `配信`. Pass `includeBroadcast: true` only when the user explicitly wants online/livestream appearances. A naive SQL `role = 'show'` filter is not enough for exact parity.
- **Medley components**: `setlist_item_songs.role = 'component'` rows are the split parts of a mashup. They are excluded by default. Pass `includeMedleyComponents: true` only when the user asks for medley components. `medley_quarantine` lines are never counted; they are the mashups that could not be split verifiably.
- **Versions**: remixes, remasters, voicebank versions, covers, and language versions are merged **only** when they are listed in `data/song-variants.json`. Without that file/index, count `songs.id` separately; never merge by title similarity or guess. When merged, `variantSongIds` tells you which ids were folded in.
- **Placeholder songs**: rows whose name matches VocaDB placeholder markers (for example `[Placeholder song]`, `[Unknown song]`, `[Temporary song]`, `[Custom song]`, `[Out of scope song]`, `[Unknown]`, case-insensitive) are dropped at collection time. They are not in `setlist_items` / `songs`; do not resurrect them.
- **Non-VOCALOID repertoire**: a 場次 keeps its complete programme, so `songs.category <> 'vocaloid'` rows (classical pieces, Kodo instrumentals, folk tunes) are ordinary songs in every count. They have no vocalist, `artist_string` holds the composer, `source_url` is the wiki, and `id >= 2000000000`. If the user asks for VOCALOID-song statistics only, add `AND category = 'vocaloid'` and say you did; a VOCALOID song VocaDB only lists as covers also carries a reserved id but keeps `category = 'vocaloid'`.
- **Missing data**: a performance with `song_list_id IS NULL` has no setlist and contributes nothing. Say "no setlist recorded"; do not invent one. A song missing from `song_vocalists` is "not recorded"; do not infer a cast from the title. Album-derived setlists are a fallback, not an upstream event setlist (see below).

### View counts: never estimate

The site never estimates views. Playback numbers come only from dated `view_snapshots` rows, which are collected from the YouTube Data API when `YOUTUBE_API_KEY` is configured. niconico and bilibili links are stored, but their view counts are not collected.

- `observeWindow` returns `status: 'insufficient'` when there is no snapshot on one side of an event. That means **not enough snapshots**, not zero and not a projection.
- `representativeVideo` picks an enabled Original PV, otherwise the enabled PV with the smallest VocaDB PV id. Do not switch videos between questions without saying so.
- If a user asks "how many views did this song get?", answer only with a dated snapshot (platform, `collected_at`, `view_count`, source) or say the site has no snapshot. Never invent, interpolate, or extrapolate a number.
- `playbackForSongs` / `summarizeBands` use fixed bands from `shared/bands.ts`: no snapshot, under 100k, 100k–1m, 1m–10m, 10m+.

## 6. Data honesty, attribution, and rate limits

### Cite VocaDB and link back

The catalog is derived from the [VocaDB public API](https://vocadb.net/api/). Reuse is allowed under the [VocaDB license](https://wiki.vocadb.net/docs/license) **with attribution and a link back to VocaDB**. When you report a song, performance, or series, include the stored source link:

- Song: `songs.source_url`, normally `https://vocadb.net/S/{id}`
- Performance: `performances.source_url`, normally `https://vocadb.net/E/{id}`
- Series: `series.source_url`, normally `https://vocadb.net/Es/{id}`
- Album fallback: `https://vocadb.net/Al/{album_id}`

Do not claim VocaDB endorses the site or your answer. Do not redistribute third-party cover art, lyrics, or official logos.

### Do not scrape, do not invent

- Use the catalog; do not fetch `/songs/{id}`, `/shows/{id}`, `/` to parse numbers. Page HTML is a rendered view, not an API.
- Do not invent producer or vocalist credits. `songs.artist_string` is the full credit; `songs.artist_string` may collapse a large cast to `feat. various`. Use `song_vocalists` first. The "制作人" column uses the structured `song_producers` roster first (authoritative, producer-side jobs only) and only falls back to the text before `feat.` when the song entry names no producer; VocaDB `Unknown producer(s)` / `Unknown artist` placeholders are dropped, and missing means "未记录". Free-text-only names that disagree with the structured roster are listed in `docs/reports/producer-conflicts.md`; quote that report instead of guessing.
- Do not invent a setlist that VocaDB does not have. Do not fill gaps from a studio album unless the catalog already records that fallback.
- Do not report a quarantined mashup line as one song. Do not report `role = 'component'` rows as standalone songs unless the user explicitly asks for components.

### Album-derived setlists (`song_lists.source = 'album'`)

Some performances have no VocaDB event song list. The project uses a curated release tracklist as a documented fallback:

- `song_lists.source = 'album'`
- `song_lists.album_id` is the VocaDB album id
- `song_lists.medium` is `bluray`, `cd`, or `dvd`
- the synthetic song-list id is `1_000_000_000 + album_id`

When you use such a list, label it with the notice from `shared/album-setlists.ts`:

> 歌单来自蓝光/CD/DVD《…》的曲目列表，不是 VocaDB 上该场演出的歌单。

In English: “The setlist comes from the tracklist of the Blu-ray/CD/DVD …, not from the performance's VocaDB event setlist.” Link the album page and do not present it as an upstream event setlist. Some city stops share one release; `data/album-setlists.json` documents which.

### VocaDB rate limits and User-Agent

The collection scripts (`scripts/vocadb/client.ts`) use:

- `User-Agent: miku-concert-stats/0.1 (+https://github.com/RJiazhen/miku-concert-stats)`
- at least **300 ms** between uncached requests (`MIN_INTERVAL_MS = 300`)
- a hard cap of **800** network requests (`MAX_REQUESTS = 800`)
- one retry after **2 s** on HTTP 429 or 5xx
- an on-disk cache keyed by URL SHA-256

If you hit VocaDB directly (for example to resolve a song id the catalog lacks), identify yourself with a similar descriptive User-Agent and a contact/repository URL, keep requests spaced out, and do not bulk-crawl. Do not scrape VocaDB HTML.

## 7. Copy-paste recipes

Each recipe ends with the fields to report. Numbers below are from the catalog built on 2026-11-05; re-run against the current catalog before quoting them.

### (a) “How many times was song X performed, by show and by event?”

**Open:** the catalog (not a page). **URL for a human:** <https://miku-concert-stats.rjiazhen.top/> (ranking page).

First resolve the song id. Never guess it from a title:

```sql
SELECT id, name, name_ja, name_en, artist_string, source_url
FROM songs
WHERE name = 'メルト' OR name_ja = 'メルト' OR name_en = 'Melt';
-- current: 1322 | メルト | ... | https://vocadb.net/S/1322
```

Use the site's function for the authoritative answer. Shared setlists and notes make a SQL-only count wrong:

```ts
import Database from 'better-sqlite3'
import { loadCatalog } from './shared/catalog.ts'
import { rankSongAppearances } from './shared/stats.ts'
import { parseSongVariants } from './shared/song-variants.ts'
import { readFileSync } from 'node:fs'

const db = new Database('catalog.sqlite', { readonly: true, fileMustExist: true })
const catalog = loadCatalog({ all: (sql) => db.prepare(sql).all() as never[] })
const variants = parseSongVariants(JSON.parse(readFileSync('data/song-variants.json', 'utf8')))

const byEvent = rankSongAppearances(catalog, { mode: 'event', variants })
  .find((row) => row.songId === 1322)
const byShow = rankSongAppearances(catalog, { mode: 'show', variants })
  .find((row) => row.songId === 1322)

// current: byEvent.count = 60, byShow.count = 76
// byShow.performanceCount = 60, byShow.seriesCount = 7
// The current メルト row is approximate=true: "city-only when city has several shows: 2".
```

For a quick event-mode sanity check, this SQL is useful but **not exact**:

```sql
SELECT COUNT(DISTINCT p.id) AS event_baseline
FROM setlist_item_songs sis
JOIN setlist_items si
  ON si.song_list_id = sis.song_list_id AND si.position = sis.position
JOIN performances p
  ON p.song_list_id = sis.song_list_id
WHERE sis.song_id = 1322
  AND sis.role = 'listed'
  AND p.role = 'show';
-- current: 63, while the site's exact event count is 60.
-- This difference comes from shared setlists whose notes assign a line to only some
-- city stops. Name-only broadcast rows are another reason a role-only SQL count can
-- disagree with the site; port isBroadcastAppearance for exact parity.
```

**Report:** `song.id`, `song.name`, `mode` (`event` or `show`), `count`, `performanceCount`, `seriesCount` (if useful), `firstYear`, `lastYear`, `approximate`, `reasons`, and `variantSongIds`. State the mode and the scope (all series vs filtered). For `show`, also say that undated performances contribute 0.

### (b) “Give me the ordered setlist for one performance/show.”

**Open:** the catalog. **URL for a human:** <https://miku-concert-stats.rjiazhen.top/shows/12251>. Clarify whether the user means a 演出 (performance, `/shows/{id}`) or one 场次 (a day/half within it).

**Start with the per-場次 layer.** It is the answer to "what did this show play", and it already applied the notes:

```sql
-- The setlist of one 場次 of performance 6045 (2023 Osaka, 2023-08-11 night show).
SELECT psi.position,
       psi.song_id,
       s.name,
       psi.evidence,
       psi.source_position,
       psi.notes
FROM performance_show_setlist_items psi
LEFT JOIN songs s ON s.id = psi.song_id
WHERE psi.performance_id = 6045
  AND psi.show_key = '6045:2023-08-11:night'
ORDER BY psi.position;
-- 24 rows. The source list has 39; the extra rows belong to other days and halves.
```

List every 場次 of that 演出, with its row count and how well it is pinned down:

```sql
SELECT show_key, date, half, item_count, omitted_count, uncertain, reasons
FROM performance_show_setlists
WHERE performance_id = 6045
ORDER BY date, half;
```

Report the 演出's attribution and any outside evidence alongside the rows:

```sql
SELECT status, resolution, change, conflict, pending_review,
       source_list_id, source_row_count, note
FROM performance_setlists
WHERE performance_id = 6045;

SELECT url, title, accessed_at, confidence, note, conflict
FROM performance_setlist_sources
WHERE performance_id = 6045;
```

If `medley_id` is set instead of `song_id`, the row is one medley: read `medleys` for its name and `medley_songs` for its parts.

The source layer still holds the printed order and the raw notes, and it is what `/raw` compares:

```sql
-- Ordered printed lines of the source list behind performance 12251 (song list 27886).
SELECT si.position,
       si.listed_song_id,
       s.name,
       s.artist_string,
       si.notes,
       sis.song_id,
       sis.role AS song_role
FROM setlist_items si
JOIN setlist_item_songs sis
  ON sis.song_list_id = si.song_list_id AND sis.position = si.position
LEFT JOIN songs s ON s.id = si.listed_song_id
WHERE si.song_list_id = 27886
ORDER BY si.position, sis.song_id;
```

Check whether the setlist is upstream or an album fallback:

```sql
SELECT p.id, p.name, p.start_date, p.end_date,
       sl.id AS song_list_id, sl.source, sl.album_id, sl.medium
FROM performances p
LEFT JOIN song_lists sl ON sl.id = p.song_list_id
WHERE p.id = 12251;
-- current: song_list_id = 27886, source = 'vocadb', album_id = NULL.
-- Album example: performance 2959 -> source = 'album', album_id = 30961, medium = 'bluray'.
```

Raw `notes` are not the parsed show assignment. In the built catalog you do not have to resolve them: `performance_show_setlist_items` already did. Only fall back to the parser when the catalog has no derived rows:

```ts
import { catalogSchedules, derivedItemsByShow } from './shared/performance-setlists.ts'

const shows = catalogSchedules(catalog).get(12251) ?? []
const byShow = derivedItemsByShow(catalog, 12251)
// byShow.get('12251:2026-08-28:day') is the ordered row list of that 場次.
```

```ts
import { reviewRotations } from './shared/rotation.ts'
import { performanceSchedules, showsForNotes } from './shared/event-schedule.ts'

const review = reviewRotations(catalog)
const performance = catalog.performances.find((row) => row.id === 12251)!
const shows = performanceSchedules(catalog, review).get(12251) ?? []
const line = review.lines.find((row) => row.songListId === 27886 && row.position === 3)
const labels = showsForNotes(line?.notes ?? null, performance, shows).map((show) => show.label)
// current: ['2026-08-28 日场', '2026-08-29 日场', '2026-08-30 日场']
```

Notes such as `Hamamatsu`, `Osaka`, `Tokyo`, `Daytime Shows`, and `Nighttime Shows` select city stops or halves; an empty note means every 场次 of that 演出. A derived row carries the same split in `evidence`: `note` means a note picked this 場次, `shared` means the whole list applies, `curated` means a hand-checked correction moved or added it.

**Report:** position, `song_id`, name, artist, and for medleys the medley name with its parts. Include `evidence`, the 演出's `resolution`, and any `performance_setlist_sources` row; `pending_review = 1` must be stated. When the catalog has no derived rows, fall back to raw notes and say the attribution came from the parser.

### (c) “List the performances of a series, with dates and cities.”

**Open:** the catalog. **URL for a human:** <https://miku-concert-stats.rjiazhen.top/series/81>. Series index: <https://miku-concert-stats.rjiazhen.top/series>.

```sql
-- Series row first, so the answer names the series.
SELECT id, name, name_ja, source_url
FROM series
WHERE id = 81;

-- One row per 演出 (city stop), newest first.
SELECT p.id,
       p.name,
       p.start_date,
       p.end_date,
       p.venue_name,
       p.country_code,
       p.role,
       p.series_number,
       p.series_suffix,
       p.song_list_id
FROM performances p
WHERE p.series_id = 81
ORDER BY p.start_date DESC, p.id DESC;
-- current first rows: 12251 Tokyo (2026-08-28..30), 12250 Osaka, 12249 Hamamatsu, ...
```

There is no `city` column. Derive it from `name`, `series_suffix`, and the aliases in `shared/rotation.ts` (`performanceCityKey`) or the aggregation in `shared/cities.ts`; do not guess. Get the 场次 count from `showCountsByPerformance(catalog, review).get(performance.id)` (`shared/performance-setlists.ts`): it reads the derived layer first, so a stop whose days were split by hand reports its real show count, and falls back to `performanceSchedules` for 演出 that have no derived rows. Do not count setlists with `song_list_id IS NOT NULL`: a wiki-sourced stop keeps that column NULL, so use `setlistPerformanceIds(catalog).has(id)` instead.

**Report:** `performance.id`, name, `start_date`–`end_date`, derived city, venue, country, `role` (broadcast flag), 场次 count, whether the 演出 has a setlist at all (`setlistPerformanceIds`), and `https://miku-concert-stats.rjiazhen.top/shows/{id}`. Group by `series_number` only when the user asks for a series-year view; it is not a separate 演出.

### (d) “Which songs debuted in a given series year?”

**Open:** the catalog. **URL for a human:** the series page, e.g. <https://miku-concert-stats.rjiazhen.top/series/81>. First clarify the intended meaning: “first appearance in this series” (below) or “first appearance anywhere in the catalog” (drop the series filter and use the year of `start_date`).

```sql
-- Songs whose first appearance in series 81 was series year 2024.
-- series_number is the series-year label, not always the calendar year.
WITH first_appearance AS (
  SELECT sis.song_id, MIN(p.series_number) AS first_series_number
  FROM setlist_item_songs sis
  JOIN performances p ON p.song_list_id = sis.song_list_id
  WHERE sis.role = 'listed'
    AND p.role = 'show'
    AND p.series_id = 81
    AND p.series_number IS NOT NULL
  GROUP BY sis.song_id
)
SELECT s.id, s.name, s.artist_string, s.source_url, f.first_series_number
FROM first_appearance f
JOIN songs s ON s.id = f.song_id
WHERE f.first_series_number = 2024
ORDER BY s.id;
-- current: 17 songs, including 1077 letter song, 1327 初めての恋が終わる時, 24149 ブリキノダンス.
```

If the user means “first ever anywhere”, use this shape instead:

```sql
WITH first_seen AS (
  SELECT sis.song_id, MIN(substr(p.start_date, 1, 4)) AS first_year
  FROM setlist_item_songs sis
  JOIN performances p ON p.song_list_id = sis.song_list_id
  WHERE sis.role = 'listed' AND p.role = 'show' AND p.start_date IS NOT NULL
  GROUP BY sis.song_id
)
SELECT s.id, s.name, s.artist_string, s.source_url, f.first_year
FROM first_seen f
JOIN songs s ON s.id = f.song_id
WHERE f.first_year = '2024'
ORDER BY s.id;
```

Both queries exclude `role = 'broadcast'` rows and medley components, and they do not merge variants. They do **not** apply the name-based broadcast heuristic (`isBroadcastAppearance`), so port that function or filter names as well for exact parity. If a song's first appearance is only on an album-derived setlist, say so and label it; the “debut” is then a tracklist fallback, not a confirmed live premiere.

**Report:** song id, name, artist, `source_url`, first series year (or first calendar year), whether any contributing setlist has `source = 'album'`, and the caveat that counts are based on the catalog's recorded setlists.

## 8. Success criteria

An answer is correct only if all of these hold:

- [ ] It answers the count/setlist question **without fetching any HTML page**; the catalog is the source.
- [ ] It states the counting mode: `event` (按演出) or `show` (按场次), and the filters (series, year, broadcast, medley, variants).
- [ ] It does not report `role = 'component'` medley parts as standalone songs unless the user explicitly asked, and it does not count quarantined mashups.
- [ ] It attributes data to VocaDB with a link (`/S/{id}`, `/E/{id}`, `/Es/{id}`) and mentions the VocaDB license/link-back requirement.
- [ ] It refuses to give a view count without a dated snapshot; if snapshots exist, it reports platform, `collected_at`, and `view_count`; if not, it says `insufficient` / no snapshot and does not estimate.
- [ ] It labels album-derived setlists (`song_lists.source = 'album'`) with the Chinese notice and does not present them as VocaDB event setlists.
- [ ] It does not invent producers, vocalists, setlists, cities, or missing songs; missing means “未记录 / not recorded”.
- [ ] It includes the catalog build date/version when the numbers may change, and reports `approximate` / `reasons` when the ranking is uncertain.
