---
name: query-concert-stats-songs
description: Read one song's performance counts, per-series and per-year breakdowns, every 演出 it appeared in with 場次 coverage, its merged variants, and its PVs from GET /api/v1/songs/{id}.json, or list every song summary with GET /api/v1/songs.json. Use for "how many times was song X performed", "which shows played it", "did it play every 場次", or "how many versions exist".
---

# Songs

Base URL: `https://miku-concert-stats.rjiazhen.top`

## `GET /api/v1/songs/{id}.json`

`search` already returns `showCount` / `eventCount`, so open this payload only when the answer needs `bySeries`, `byYear`, `performances[]`, `variants`, or `videos`. A failed detail request does not invalidate counts you already read from `search`; say which part is missing instead of dropping the whole answer.

```json
{
  "song": { "id": 1322, "name": "メルト", "nameJa": "メルト", "nameEn": "Melt", "nameZh": "融化", "producer": "ryo", "producers": ["ryo"], "characters": ["初音ミク"], "category": "vocaloid", "categoryLabel": "VOCALOID 歌曲", "showCount": 90, "eventCount": 61, "firstYear": 2010, "lastYear": 2025, "approximate": false, "firstPerformance": { "id": 3000000002, "name": "ミクFES '09（夏）", "nameJa": "ミクFES '09（夏）", "nameEn": "MikuFES '09（夏）", "nameZh": "初音未来FES '09（夏）", "startDate": "2009-08-31" }, "url": "..." },
  "counts": { "show": 90, "event": 61, "performanceCount": 61, "seriesCount": 7, "firstYear": 2010, "lastYear": 2025, "approximate": false, "reasons": [], "withBroadcast": null },
  "bySeries": [{ "seriesId": 82, "name": "MIKU EXPO", "nameEn": "MIKU EXPO", "nameZh": "MIKU EXPO", "showCount": 34, "eventCount": 29, "firstSeriesNumber": 2014, "lastSeriesNumber": 2025 }],
  "byYear": [{ "year": 2025, "showCount": 16, "eventCount": 12 }],
  "performances": [
    {
      "id": 9644,
      "name": "MIKU WITH YOU 2025",
      "nameJa": "MIKU WITH YOU 2025",
      "nameEn": "MIKU WITH YOU 2025",
      "nameZh": "未来有你 2025",
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
  "url": "https://miku-concert-stats.rjiazhen.top/songs/1322"
}
```

- Names are already localized: `song`, every `bySeries[]` row, every `performances[]` row, `firstPerformance`, and `variants[]` carry `name` / `nameJa` / `nameEn` / `nameZh`; series rows carry `name` / `nameEn` / `nameZh`. Use the field for the user's language (`nameZh` for Chinese, `nameEn` for English, `name` for Japanese) instead of translating the catalog Japanese.
- When that field is `null` (193 of 571 songs have no `nameZh`), follow the front-door order: `nameZh` → `nameEn` when the Japanese title is katakana-only (ノヴァ → Nova) → `nameJa` → `name`. So 秘密警察 keeps its kanji while ステラ becomes Stella, and a Latin title such as `Tell Your World` is used as-is. Never invent a title.
- `counts.show` counts each 場次; `counts.event` counts each 演出 at most once. `counts.withBroadcast` holds the livestream-inclusive pair when it differs from the default.
- `bySeries` / `byYear` use the same two modes; `firstSeriesNumber` / `lastSeriesNumber` are series years, not always the calendar year.
- `performances[].coverage` answers "did it appear in every 場次 of that 演出?": `covered` of `total`, with the 場次 labels. `null` when the 演出 has no date or no 場次. The labels are Chinese (`12/20 日场`); when answering in another language, write the date plus the day/night half yourself instead of quoting `日场` / `夜场`.
- `approximate: true` means some setlist lines could not be pinned to one 場次. Quote it and its `reasons` instead of presenting a flat number.
- `variants` lists remixes, remasters, voicebank versions, covers, or language versions already folded into this song, each with the same four name fields.
- `videos[].latestSnapshot` is `null` when no dated view count exists. Never estimate, interpolate, or extrapolate a view count; look it up elsewhere if needed and mark it as an outside source.
- `withBroadcast: null` means the two counting modes coincide for this song, not that broadcast data is missing.

## `GET /api/v1/songs.json`

Every song summary in one payload, ordered by `showCount`. Large — prefer `search` or `rank` unless the question really needs the whole list. `showCount: 0` rows are part of the response; they are songs the catalogue has a setlist row for, not a discography.

## How to answer with it

**"How many times was song X performed?"**

1. `GET /api/v1/search?q=<X>` and pick the song.
2. Read `showCount` and `eventCount`. Quote both, or state the chosen mode.
3. For a breakdown, read `bySeries` / `byYear` from `songs/{id}.json`.
4. If `approximate` is true, report it and its reasons.

**"Which shows did it play, and was it at every 場次?"**

1. `GET /api/v1/songs/{id}.json`.
2. Read `performances[]`: `id`, `name` (plus `nameEn` / `nameZh` for the user's language), `startDate`, `showCount`, `coverage`.
3. `coverage` is `{ total, covered, labels }` or `null`; say `N 场中 M 场` with the labels only when `0 < covered < total`. Full coverage needs no note, and `covered === 0` still reads `N 场中 0 场`.
4. Link each 演出 as `https://miku-concert-stats.rjiazhen.top/shows/{id}`, labelled with its name.

## Common mistakes

- Adding up printed setlist lines to "correct" a count, or treating `showCount: 0` as "never performed".
- Quoting a variant's numbers separately as if it were a different song; `variants` are already folded into the canonical song.
- Presenting `videos[].latestSnapshot: null` as zero views.
