---
name: query-concert-stats
description: Answer Hatsune Miku concert setlist and song-appearance questions from the public JSON API at https://miku-concert-stats.rjiazhen.top. Use when asked how many times a song was performed, for a show's setlist, a series' performances, top songs, or debut years. No local files, database downloads, or external APIs are needed.
---

# Query Hatsune Miku concert statistics

Base URL: `https://miku-concert-stats.rjiazhen.top`

The site exposes a public, read-only JSON API. There is no key, account, or auth: send an HTTPS `GET` and parse the JSON. This document is also served at `/skill.md` as plain text.

Use only the endpoints below. Do not fetch the site's HTML pages to extract numbers, do not download the SQLite files, and do not call VocaDB or any other external API. Every number in an answer must come from this API.

## Endpoints

| Request | What it returns |
| --- | --- |
| `GET /api/v1/search?q=<title>` | Songs matching a title, with counts |
| `GET /api/v1/songs/{id}.json` | One song with counts, breakdowns, and every performance |
| `GET /api/v1/rank?mode=show&limit=20` | Most performed songs, optionally by series or year |
| `GET /api/v1/debuts?year=2024` | Songs first performed in a year |
| `GET /api/v1/series.json` | All series with counts |
| `GET /api/v1/series/{id}.json` | One series and its performances |
| `GET /api/v1/performances/{id}.json` | One 演出 and its per-場次 setlists |
| `GET /api/v1/songs.json` | Full song summary (large; prefer search/rank) |

## 1. `GET /api/v1/search?q=<title>`

The cheapest way to resolve a song. `q` is 1–80 characters; matching is case-insensitive against the original, Japanese, English, and Chinese titles.

```http
GET https://miku-concert-stats.rjiazhen.top/api/v1/search?q=melt
```

```json
{
  "query": "melt",
  "count": 2,
  "songs": [
    {
      "id": 1322,
      "name": "メルト",
      "nameJa": "メルト",
      "nameEn": "Melt",
      "nameZh": "融化",
      "producer": "ryo",
      "showCount": 90,
      "eventCount": 61,
      "firstYear": 2010,
      "approximate": false,
      "url": "https://miku-concert-stats.rjiazhen.top/songs/1322"
    }
  ]
}
```

- Optional `limit`, default 10, maximum 25.
- Results are already ordered: exact title match first, then prefix, then substring; popularity breaks ties.
- If several different songs match and none is an exact title match, name the candidates and ask which one the user means.

## 2. `GET /api/v1/songs/{id}.json`

Full detail for one song.

```json
{
  "song": { "id": 1322, "name": "メルト", "nameZh": "融化", "producer": "ryo", "category": "vocaloid", "showCount": 90, "eventCount": 61, "firstYear": 2010, "lastYear": 2025, "approximate": false, "url": "..." },
  "counts": {
    "show": 90,
    "event": 61,
    "performanceCount": 61,
    "seriesCount": 7,
    "firstYear": 2010,
    "lastYear": 2025,
    "approximate": false,
    "reasons": []
  },
  "bySeries": [
    { "seriesId": 82, "name": "MIKU EXPO", "showCount": 34, "eventCount": 29, "firstSeriesNumber": 2014, "lastSeriesNumber": 2025 }
  ],
  "byYear": [{ "year": 2025, "showCount": 16, "eventCount": 12 }],
  "performances": [
    { "id": 9644, "name": "...", "startDate": "2025-12-20", "seriesId": 173, "seriesNumber": 2025, "showKeys": ["9644:2025-12-20:day"], "showCount": 4, "approximate": false, "reasons": [] }
  ],
  "variants": [],
  "sourceUrl": "https://vocadb.net/S/1322",
  "url": "https://miku-concert-stats.rjiazhen.top/songs/1322"
}
```

- `counts.show` counts each 場次; `counts.event` counts each 演出 at most once.
- `bySeries` answers "how many times in this series"; `byYear` answers "how many times in this calendar year".
- `performances[].showKeys` lists the exact 場次 the song played. `showCount` there is the number of those 場次.
- `variants` lists remixes, remasters, voicebank versions, covers, or language versions already folded into this song.

## 3. `GET /api/v1/rank`

Most performed songs. Parameters:

| Parameter | Values | Default |
| --- | --- | --- |
| `mode` | `show` (按场次) or `event` (按演出) | `show` |
| `series` | comma-separated series ids, e.g. `81` or `81,82` | all |
| `yearFrom`, `yearTo` | four-digit calendar years | open |
| `limit` | 1–100 | 20 |

`series` cannot be combined with `yearFrom` / `yearTo`; request one filter at a time.

```http
GET https://miku-concert-stats.rjiazhen.top/api/v1/rank?mode=show&series=81&limit=5
```

```json
{
  "mode": "show",
  "series": [81],
  "count": 235,
  "songs": [
    { "id": 89726, "name": "Hand in Hand", "count": 25, "showCount": 132, "eventCount": 33, "producer": "kz", "url": "..." }
  ]
}
```

`count` is the count under the requested filter. `showCount` / `eventCount` are the song's totals across the whole catalog; do not confuse them with `count`.

## 4. `GET /api/v1/debuts?year=<yyyy>&series=<id>`

Songs whose first recorded appearance was that year. This is the honest "debut" definition in this catalog: the first performance recorded here, not the song's release date.

- Without `series`: the first appearance anywhere (`firstYear`).
- With `series=81`: the first appearance inside that series, using its series year (`firstSeriesYear`), which is not always the calendar year.
- Optional `limit`, default 100, maximum 200.

```json
{
  "year": 2024,
  "series": 81,
  "count": 16,
  "songs": [
    { "id": 1077, "name": "letter song", "firstYear": 2013, "firstSeriesYear": 2024, "showCount": 40, "url": "..." }
  ]
}
```

## 5. `GET /api/v1/series.json` and `GET /api/v1/series/{id}.json`

`series.json` is a short index:

```json
{
  "series": [
    { "id": 81, "name": "初音ミク「マジカルミライ」", "performanceCount": 28, "showCount": 131, "firstYear": 2013, "lastYear": 2026, "url": "..." }
  ]
}
```

`series/{id}.json` adds the performances:

```json
{
  "series": {
    "id": 81,
    "name": "初音ミク「マジカルミライ」",
    "performances": [
      { "id": 12251, "name": "初音ミク「マジカルミライ 2026」in TOKYO", "startDate": "2026-08-28", "endDate": "2026-08-30", "venue": "...", "countryCode": "JP", "showCount": 3, "hasSetlist": true, "broadcast": false, "status": null, "url": "..." }
    ]
  }
}
```

- `performanceCount` and `showCount` here include broadcasts; check `performances[].broadcast` before counting a 演出 as a live show.
- `hasSetlist: false` means no setlist is recorded. Do not fill it in.
- `status` is `cancelled`, `postponed`, `upcoming`, or `null`.
- Sort or filter `performances` yourself; the array is newest first.

## 6. `GET /api/v1/performances/{id}.json`

One 演出 (one city stop / one VocaDB release event), with one ordered setlist per 場次.

```json
{
  "id": 6045,
  "name": "初音ミク「マジカルミライ 2023」in OSAKA",
  "series": { "id": 81, "name": "初音ミク「マジカルミライ」" },
  "startDate": "2023-08-11",
  "endDate": "2023-08-13",
  "showCount": 6,
  "hasSetlist": true,
  "broadcast": false,
  "setlist": { "sourceKind": "wiki", "status": "complete", "resolution": "external", "pendingReview": false },
  "shows": [
    {
      "showKey": "6045:2023-08-11:day",
      "date": "2023-08-11",
      "half": "day",
      "label": "2023-08-11 日场",
      "itemCount": 24,
      "uncertain": false,
      "reasons": [],
      "items": [
        { "position": 1, "songId": 445823, "name": "カルチャ", "nameJa": "カルチャ", "evidence": "wiki", "notes": "初披露" }
      ]
    }
  ],
  "sources": [{ "url": "...", "title": "...", "accessedAt": "2026-11-06", "confidence": "high" }],
  "links": [],
  "url": "https://miku-concert-stats.rjiazhen.top/shows/6045"
}
```

- Each object in `shows` is exactly one 場次. A three-day run normally has three; a day with a daytime and a night-time show has two.
- `items` is already in printed order. Medley rows use `medleyId`, `medleyName`, and `songs` instead of `songId`; list the medley as one item unless the user asks for its parts.
- `setlist.status`, `resolution`, `pendingReview`, `shows[].uncertain`, and `shows[].reasons` carry the attribution quality. State them when they are not clean.

## Counting: 场次 vs 演出

The site uses exactly three levels:

| Level | Chinese | Meaning |
| --- | --- | --- |
| Series | 系列 | A concert series, e.g. マジカルミライ |
| Performance | 演出 | One city stop / one release event |
| Show | 场次 | One calendar day, or one day-half when a day had two shows |

Two counting modes exist, and the same song can legitimately differ between them:

- **`show` (按场次, site default)** — one point per 場次. A three-day run counts 3; a day with a day and a night show counts 2. A 演出 with no date has no 場次 and contributes 0.
- **`event` (按演出)** — one point per 演出 (city stop), at most once. Two city stops in one series year count 2. An undated 演出 still counts 1.

Always say which mode you used. When the user does not specify, use `show`, because that is the site's default.

Exclusions and flags already applied by the API:

- Broadcasts / livestreams / online / VR shows are excluded from song counts. `broadcast: true` marks them in series and performance payloads.
- Medley components and quarantined unsplittable mashups are not counted as separate songs.
- Variants are merged only as listed in the song's `variants` array; do not merge songs by title similarity yourself.
- `approximate: true` means some setlist lines could not be pinned to one 場次. Quote the approximation and its `reasons`; do not present it as exact.
- `category` other than `vocaloid` means the catalogue row is classical, traditional, or instrumental repertoire kept so a 場次 shows its full programme. It has no VOCALOID vocalist credit.
- The API has no view counts and no playback estimates. Do not invent, interpolate, or extrapolate one.

## Workflows

**"How many times was song X performed?"**

1. `GET /api/v1/search?q=<X>` and pick the song.
2. Read `showCount` and `eventCount`. Quote both or state the chosen mode.
3. For a breakdown, `GET /api/v1/songs/{id}.json` and use `bySeries` / `byYear`.
4. If `approximate` is true, report it and its reasons.

**"Which shows did song X play?"**

1. `GET /api/v1/songs/{id}.json`.
2. Read `performances[]`: `id`, `name`, `startDate`, `showCount`, `showKeys`.
3. Link each 演出 as `https://miku-concert-stats.rjiazhen.top/shows/{id}`.

**"Give me the setlist for show / performance X."**

1. If the user gives a song, series, or date but no id, find the performance id in `series/{id}.json` or in a song's `performances[]`.
2. `GET /api/v1/performances/{id}.json`.
3. List each `shows[]` entry separately; that is the real 場次-level setlist. Keep printed order.
4. Clarify 演出 vs 場次 when the user says "show": a 演出 can contain several 場次.

**"List a series' performances."**

1. `GET /api/v1/series.json` to find the series id.
2. `GET /api/v1/series/{id}.json`.
3. Report date, venue, `showCount`, `hasSetlist`, `status`, and the `/shows/{id}` link.

**"What were the top songs in series / year?"**

- `GET /api/v1/rank?mode=show&series=<id>&limit=...`, or use `yearFrom` / `yearTo` instead of `series`.
- Never mix `series` with year bounds in one request.

**"Which songs debuted in year / series year?"**

- `GET /api/v1/debuts?year=<year>`, adding `series=<id>` for a series-year debut.
- Say that "debut" means first appearance in this catalog's recorded setlists.

## Answer checklist

- [ ] Used only `/api/v1` endpoints; no HTML scraping, no SQLite download, no VocaDB or other external API.
- [ ] Named the counting mode (`show` or `event`) and any filter (series / year).
- [ ] Reported `approximate` and its reasons when true.
- [ ] Did not claim a setlist exists when `hasSetlist` is false or `shows` is empty.
- [ ] Did not count broadcast shows as live appearances.
- [ ] Did not invent view counts, producers, vocalists, cities, or missing songs.
- [ ] Included the relevant `url` (`/songs/{id}`, `/shows/{id}`, `/series/{id}`) and, when citing upstream data, `sourceUrl`.
