---
name: query-concert-stats
description: Answer Hatsune Miku concert setlist, song, producer, city, and series questions from the public JSON API at https://miku-concert-stats.rjiazhen.top. Use when asked how many times a song was performed, for a show's setlist, top songs, debut years, a producer's concert record, or city totals. When loaded with no question, it answers two demo questions and links to the site pages. No local files, database downloads, or external APIs are needed.
---

# Query Hatsune Miku concert statistics

Base URL: `https://miku-concert-stats.rjiazhen.top`

The site exposes a public, read-only JSON API. There is no key, account, or auth: send an HTTPS `GET` and parse the JSON. This document is also served at `/skill.md` as plain text.

Use only the endpoints below. Do not fetch the site's HTML pages to extract numbers, do not download the SQLite files, and do not call VocaDB or any other external API. Every number in an answer must come from this API.

## First call with no question

When you are first loaded — for example the user only sent the skill, pasted `/skill.md`, or wrote a greeting — and the user has not asked a question yet, do not reply with an empty prompt such as "what would you like to know". Answer these two questions immediately with live API data, so the user can see the site working:

1. **メルト has been performed how many times?** Report both counting modes: `show` (按场次) and `event` (按演出).
2. **What was the setlist of 初音ミク「マジカルミライ 2024」in TOKYO?** List the songs of one 場次, and say how many 場次 the 演出 has.

Run these requests, then present the answers:

```http
GET https://miku-concert-stats.rjiazhen.top/api/v1/search?q=メルト
GET https://miku-concert-stats.rjiazhen.top/api/v1/songs/1322.json
GET https://miku-concert-stats.rjiazhen.top/api/v1/performances/7215.json
```

- Take both counts from `counts.show` and `counts.event`; do not substitute the totals of one mode for the other.
- The setlist lives in `shows[]`; list `items[]` in printed order and give `showCount` as the number of 場次. If a medley row appears, print it as one item.
- Do not drop the counting-mode labels or the `approximate` / `uncertain` flags.
- If the numbers differ from an older copy of this document, trust the API.

End the reply by telling the user what else they can ask, and put these links on their own line so they can click through:

- Site: <https://miku-concert-stats.rjiazhen.top/>
- メルト song page: <https://miku-concert-stats.rjiazhen.top/songs/1322>
- マジカルミライ 2024 东京场 page: <https://miku-concert-stats.rjiazhen.top/shows/7215>
- Series page: <https://miku-concert-stats.rjiazhen.top/series/81>

After the demo, answer follow-up questions normally using the endpoints below.

## Endpoints

`GET /api/v1/index.json` is a machine-readable table of contents: counts, counting modes, supported filters, and every endpoint path.

| Request | What it returns |
| --- | --- |
| `GET /api/v1/filters.json` | Valid series ids, character names, producer names, and the year range |
| `GET /api/v1/search?q=<text>` | Songs, producers, and series matching a name |
| `GET /api/v1/rank?...` | Most performed songs; every site filter is supported |
| `GET /api/v1/debuts?year=<yyyy>` | Songs first performed in a year |
| `GET /api/v1/songs/{id}.json` | One song: counts, breakdowns, every 演出, coverage, PVs |
| `GET /api/v1/performances/{id}.json` | One 演出: one ordered setlist per 場次 |
| `GET /api/v1/producers/{id}.json` | One producer: credited songs and every 演出 |
| `GET /api/v1/series/{id}.json` | One series and its 演出 |
| `GET /api/v1/songs.json` | All song summaries (large; prefer search/rank) |
| `GET /api/v1/performances.json` | All 演出 as a flat index; use it to find an id |
| `GET /api/v1/producers.json` | Producer ranking |
| `GET /api/v1/series.json` | Series index |
| `GET /api/v1/cities.json` | City ranking |
| `GET /api/v1/reports/quality.json` | Data-quality report (missing PVs, album fallbacks, doubts) |
| `GET /api/v1/reports/setlist-differences.json` | Setlist difference report by series year |

Resolve names and ids with `filters.json` or `search` first. Never guess a series id, character name, or producer name.

## 1. `GET /api/v1/search?q=<text>`

`q` is 1–80 characters. Song titles match the original, Japanese, English, and Chinese names; producers and series match their names as a case-insensitive substring. Optional `type=songs|producers|series` (default `all`) and `limit` (default 10, maximum 25).

```json
{
  "query": "melt",
  "type": "all",
  "counts": { "songs": 6, "producers": 0, "series": 0 },
  "songs": [
    {
      "id": 1322,
      "name": "メルト",
      "nameZh": "融化",
      "producer": "ryo",
      "characters": ["初音ミク"],
      "showCount": 90,
      "eventCount": 61,
      "firstYear": 2010,
      "approximate": false,
      "url": "https://miku-concert-stats.rjiazhen.top/songs/1322"
    }
  ],
  "producers": [],
  "series": []
}
```

Songs are ordered exact title first, then prefix, then substring; popularity breaks ties. If several different songs match and none is an exact title match, name the candidates and ask which one the user means.

## 2. `GET /api/v1/songs/{id}.json`

```json
{
  "song": { "id": 1322, "name": "メルト", "nameZh": "融化", "producer": "ryo", "producers": ["ryo"], "characters": ["初音ミク"], "category": "vocaloid", "categoryLabel": "VOCALOID 歌曲", "showCount": 90, "eventCount": 61, "firstYear": 2010, "lastYear": 2025, "approximate": false, "url": "..." },
  "counts": { "show": 90, "event": 61, "performanceCount": 61, "seriesCount": 7, "firstYear": 2010, "lastYear": 2025, "approximate": false, "reasons": [], "withBroadcast": null },
  "bySeries": [{ "seriesId": 82, "name": "MIKU EXPO", "showCount": 34, "eventCount": 29, "firstSeriesNumber": 2014, "lastSeriesNumber": 2025 }],
  "byYear": [{ "year": 2025, "showCount": 16, "eventCount": 12 }],
  "performances": [
    {
      "id": 9644,
      "name": "MIKU WITH YOU 2025",
      "startDate": "2025-12-20",
      "showKeys": ["9644:2025-12-20:day"],
      "showCount": 4,
      "coverage": { "total": 4, "covered": 4, "labels": ["12/20 日场", "..."] },
      "approximate": false,
      "reasons": [],
      "url": "..."
    }
  ],
  "variants": [],
  "videos": [
    {
      "vocadbPvId": 106710,
      "platform": "niconico",
      "url": "...",
      "title": "...",
      "author": "ryo",
      "pvType": "Original",
      "publishDate": "2007-12-07",
      "disabled": false,
      "latestSnapshot": null
    }
  ],
  "sourceUrl": "https://vocadb.net/S/1322",
  "url": "https://miku-concert-stats.rjiazhen.top/songs/1322"
}
```

- `counts.show` counts each 場次; `counts.event` counts each 演出 at most once.
- `performances[].coverage` answers "did it appear in every 場次 of that 演出?": `covered` of `total`, with the 場次 labels. `null` when the 演出 has no date or no 場次.
- `videos[].latestSnapshot` is `null` when no dated view count exists. Never estimate, interpolate, or extrapolate a view count.
- `variants` lists remixes, remasters, voicebank versions, covers, or language versions already folded into this song.

## 3. `GET /api/v1/rank`

Most performed songs, with the same filters as the site's ranking page.

| Parameter | Values | Default |
| --- | --- | --- |
| `mode` | `show` (按场次) or `event` (按演出) | `show` |
| `series` | comma-separated series ids, e.g. `81` or `81,82` | all |
| `yearFrom`, `yearTo` | four-digit calendar years | open |
| `character` | comma-separated base character names | all |
| `producer` | comma-separated producer names | all |
| `includeBroadcast` | `1` to count livestream / online / VR 演出 | off |
| `includeMedleyComponents` | `1` to count medley parts | off |
| `sort` | `count` / `show` / `event` / `firstYear` / `lastYear` / `id` / `name` | `count` |
| `order` | `asc` / `desc` | `desc` |
| `limit` | 1–100 | 20 |

- `series` cannot be combined with `yearFrom` / `yearTo`; request one filter at a time.
- `character` and `producer` only filter which songs appear; they never change a song's count.
- `includeMedleyComponents` is accepted for parity but changes nothing today: the catalogue records no unsplit medley, and medley rows are already expanded into their parts.
- `count` is the count under the requested filter. `showCount` / `eventCount` are the same filtered numbers; use `count` for the requested mode.

```json
{
  "mode": "show",
  "series": [81],
  "character": [],
  "producer": [],
  "includeBroadcast": false,
  "sort": "count",
  "order": "desc",
  "count": 235,
  "songs": [
    { "id": 89726, "name": "Hand in Hand", "count": 25, "showCount": 25, "eventCount": 9, "characters": ["初音ミク"], "producers": ["kz"], "url": "..." }
  ]
}
```

`count` in the response is the number of matching songs; the `songs` array holds at most `limit`.

## 4. `GET /api/v1/debuts?year=<yyyy>&series=<id>`

Songs whose first recorded appearance was that year. "Debut" here means the first performance recorded in this catalogue, not the song's release date.

- Without `series`: the first appearance anywhere (`firstYear`).
- With `series=81`: the first appearance inside that series, using its series year (`firstSeriesYear`), which is not always the calendar year.
- Optional `limit`, default 100, maximum 200. `count` is the total number of matches.

## 5. `GET /api/v1/performances.json` and `GET /api/v1/performances/{id}.json`

`performances.json` is a flat index of every 演出, newest first — the fastest way to turn "2024 Tokyo show" into an id.

```json
{
  "performances": [
    { "id": 7215, "name": "初音ミク「マジカルミライ 2024」in TOKYO", "series": { "id": 81, "name": "初音ミク「マジカルミライ」" }, "seriesNumber": 2024, "startDate": "2024-08-30", "endDate": "2024-09-01", "venue": "...", "showCount": 6, "hasSetlist": true, "broadcast": false, "status": null, "url": "..." }
  ]
}
```

`performances/{id}.json` adds the setlists and the attribution:

```json
{
  "id": 6045,
  "name": "初音ミク「マジカルミライ 2023」in OSAKA",
  "series": { "id": 81, "name": "初音ミク「マジカルミライ」" },
  "showCount": 6,
  "hasSetlist": true,
  "setlist": { "sourceKind": "wiki", "status": "complete", "resolution": "external", "pendingReview": false, "conflict": false },
  "albumFallback": null,
  "shows": [
    {
      "showKey": "6045:2023-08-11:day",
      "date": "2023-08-11",
      "half": "day",
      "label": "2023-08-11 日场",
      "itemCount": 24,
      "uncertain": false,
      "reasons": [],
      "items": [{ "position": 1, "songId": 445823, "name": "カルチャ", "evidence": "wiki", "notes": "初披露" }]
    }
  ],
  "sources": [{ "url": "...", "title": "...", "accessedAt": "2026-11-06", "confidence": "high" }],
  "links": [],
  "url": "..."
}
```

- Each object in `shows` is exactly one 場次. A three-day run normally has three; a day with a daytime and a night-time show has two.
- `items` is already in printed order. Medley rows use `medleyId`, `medleyName`, and `songs` instead of `songId`; list the medley as one item unless the user asks for its parts.
- `albumFallback` is non-null when the setlist is a Blu-ray/CD/DVD tracklist instead of the event's own list. Use its `notice` text and `albumUrl`, and never present it as an upstream event setlist.
- `setlist.status`, `resolution`, `pendingReview`, `shows[].uncertain`, and `shows[].reasons` carry the attribution quality. State them when they are not clean.

## 6. `GET /api/v1/producers.json` and `GET /api/v1/producers/{id}.json`

`producers.json` ranks producers by credited songs.

```json
{
  "producers": [
    {
      "id": "a45",
      "name": "DECO*27",
      "artistId": 45,
      "roles": ["producer", "composer", "arranger"],
      "songCount": 37,
      "performedSongCount": 37,
      "appearanceCount": 451,
      "performanceCount": 155,
      "showCount": 315,
      "firstYear": 2010,
      "lastYear": 2026,
      "topSongs": [{ "id": 14480, "name": "39" }],
      "url": "https://miku-concert-stats.rjiazhen.top/producers/DECO*27"
    }
  ]
}
```

`producers/{id}.json` adds `songs` (each with `roles`, `publishYear`, `showCount`, `performanceCount`) and `performances`. Use the `id` from `producers.json` or `search`; do not build one yourself.

- 曲目数 (`songCount`) counts distinct credited songs, variants counted separately.
- 演出曲目 (`performedSongCount`) counts credited songs that appeared in at least one 場次.
- 表演次数 (`appearanceCount`) sums each song's distinct 場次; 场次 (`showCount`) is the union across songs.
- A producer with no appearances is still listed, with `showCount: 0`.
- Producer names follow the site rule: structured producer-side credits first, free text only for songs without them.

## 7. `GET /api/v1/series.json`, `GET /api/v1/series/{id}.json`, `GET /api/v1/cities.json`

- `series.json` lists series with `performanceCount`, `showCount`, and the year range.
- `series/{id}.json` adds its `performances` (same shape as the flat index).
- `cities.json` ranks cities by 場次; `unknown` holds the 演出 whose label names no checked city, so do not invent one. There is no per-city page; the link is the city ranking page.

## 8. Reports

- `reports/quality.json`: `summary` counts, plus `songsWithoutVideo`, `incompletePerformances`, `albumFallbackPerformances`, `uncertainLines`, `mismatchedShows`, `duplicateCandidates`, `pendingReview`. Use it when the user asks "what data is missing or doubtful?"; do not call a gap an error on its own.
- `reports/setlist-differences.json`: every same-series-year pair of setlists, with `severity` (`identical` / `order-only` / `count-differs` / `segment-differs` / `probably-different-program`), the LCS ratio, and the songs only one side performed.

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

- Broadcasts / livestreams / online / VR shows are excluded from song counts unless `includeBroadcast=1`. `broadcast: true` marks them in series, performance, and flat-index payloads.
- Medley rows are expanded into their parts rather than counted as one song, and quarantined unsplittable mashups are never counted.
- Variants are merged only as listed in the song's `variants` array; do not merge songs by title similarity yourself.
- `approximate: true` means some setlist lines could not be pinned to one 場次. Quote the approximation and its `reasons`; do not present it as exact.
- `category` other than `vocaloid` means the catalogue row is classical, traditional, or instrumental repertoire kept so a 場次 shows its full programme. It has no VOCALOID vocalist credit.
- The API has no view estimates. Use `videos[].latestSnapshot` when it is present, and say "no snapshot" when it is `null`.

## Workflows

**"How many times was song X performed?"**

1. `GET /api/v1/search?q=<X>` and pick the song.
2. Read `showCount` and `eventCount`. Quote both or state the chosen mode.
3. For a breakdown, `GET /api/v1/songs/{id}.json` and use `bySeries` / `byYear`.
4. If `approximate` is true, report it and its reasons.

**"Which shows did song X play, and was it at every 場次?"**

1. `GET /api/v1/songs/{id}.json`.
2. Read `performances[]`: `id`, `name`, `startDate`, `showCount`, `coverage`.
3. `coverage` reads `本演出全部 N 场` when `covered === total`, otherwise `N 场中 M 场` with the labels.
4. Link each 演出 as `https://miku-concert-stats.rjiazhen.top/shows/{id}`.

**"Give me the setlist for show / performance X."**

1. Find the id in `performances.json`, `series/{id}.json`, or a song's `performances[]`.
2. `GET /api/v1/performances/{id}.json`.
3. List each `shows[]` entry separately; that is the real 場次-level setlist. Keep printed order.
4. Clarify 演出 vs 場次 when the user says "show": a 演出 can contain several 場次.

**"List a series' performances."**

1. `GET /api/v1/series.json` to find the series id (or `filters.json`).
2. `GET /api/v1/series/{id}.json`.
3. Report date, venue, `showCount`, `hasSetlist`, `status`, and the `/shows/{id}` link.

**"What were the top songs in series / year / for a character or producer?"**

- `GET /api/v1/rank?mode=show&series=<id>&limit=...`, using `yearFrom` / `yearTo`, `character`, or `producer` as needed.
- Never mix `series` with year bounds in one request.

**"How did producer X do in concerts?"**

1. `GET /api/v1/search?q=<name>&type=producers`, or find the row in `producers.json`.
2. `GET /api/v1/producers/{id}.json`.
3. Report `songCount`, `performedSongCount`, `appearanceCount`, `showCount`, the year range, and the top songs.

**"Which cities hosted the most shows?"**

- `GET /api/v1/cities.json`; mention `unknown.concerts` when it is non-zero.

**"Which songs debuted in year / series year?"**

- `GET /api/v1/debuts?year=<year>`, adding `series=<id>` for a series-year debut.
- Say that "debut" means first appearance in this catalogue's recorded setlists.

## Answer checklist

- [ ] Used only `/api/v1` endpoints; no HTML scraping, no SQLite download, no VocaDB or other external API.
- [ ] Named the counting mode (`show` or `event`) and any filter (series / year / character / producer / broadcast).
- [ ] Reported `approximate` and its reasons when true.
- [ ] Did not claim a setlist exists when `hasSetlist` is false or `shows` is empty.
- [ ] Did not count broadcast shows as live appearances unless the user asked for them.
- [ ] Did not invent view counts, producers, vocalists, cities, or missing songs.
- [ ] Included the relevant `url` (`/songs/{id}`, `/shows/{id}`, `/series/{id}`, `/producers/{name}`) and, when citing upstream data, `sourceUrl`.
- [ ] Ended with clickable site links when the user has no specific follow-up, and answered the two demo questions first when no question was asked at all.
