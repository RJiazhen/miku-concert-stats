---
name: query-concert-stats-performances
description: Read one 演出's ordered setlist per 場次, its attribution quality, album fallback, and sources from GET /api/v1/performances/{id}.json, or find a 演出 id in the flat GET /api/v1/performances.json index. Use for "what was the setlist of X", "how many 場次 did the show have", "which night played which song", or to turn a show name into an id.
---

# 演出 and setlists

Base URL: `https://miku-concert-stats.rjiazhen.top`

`GET /api/v1/performances.json` is a flat index of every 演出, newest first — the fastest way to turn "2024 Tokyo show" into an id.

```json
{
  "performances": [
    { "id": 7215, "name": "初音ミク「マジカルミライ 2024」in TOKYO", "nameJa": "初音ミク「マジカルミライ 2024」in TOKYO", "nameEn": "Magical Mirai 2024 in Tokyo", "nameZh": "魔法未来 2024 东京", "series": { "id": 81, "name": "初音ミク「マジカルミライ」", "nameEn": "Magical Mirai", "nameZh": "魔法未来" }, "seriesNumber": 2024, "startDate": "2024-08-30", "endDate": "2024-09-01", "venue": "幕張メッセ", "venueEn": "Makuhari Messe", "showCount": 6, "hasSetlist": true, "broadcast": false, "status": null, "url": "..." }
  ]
}
```

`GET /api/v1/performances/{id}.json` adds the setlists and the attribution:

```json
{
  "id": 6045,
  "name": "初音ミク「マジカルミライ 2023」in OSAKA",
  "nameJa": "初音ミク「マジカルミライ 2023」in OSAKA",
  "nameEn": "Magical Mirai 2023 in Osaka",
  "nameZh": "魔法未来 2023 大阪",
  "series": { "id": 81, "name": "初音ミク「マジカルミライ」", "nameEn": "Magical Mirai", "nameZh": "魔法未来" },
  "venue": "インテックス大阪",
  "venueEn": "Intex Osaka",
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
      "items": [{ "position": 1, "songId": 445823, "name": "カルチャ", "nameJa": "カルチャ", "nameEn": "culture", "nameZh": "文化", "evidence": "wiki", "notes": "初披露" }]
    }
  ],
  "sources": [{ "url": "...", "title": "...", "accessedAt": "2026-11-06", "confidence": "high" }],
  "links": [],
  "url": "..."
}
```

- Names are already localized. The 演出 carries `name` / `nameJa` / `nameEn` / `nameZh` (the translated ones also replace the series label and checked place names), `series` carries `name` / `nameEn` / `nameZh`, `venue` carries `venueEn`, and every setlist item and medley part carries all four song titles. Read the field for the user's language instead of translating the catalog Japanese.
- `shows[].label` is Chinese (`2023-08-11 日场`). Answering in another language, write the date plus `half` (`day` → matinee, `night` → evening) yourself instead of quoting the label.
- Each object in `shows` is exactly one 場次. A three-day run normally has three; a day with a daytime and a night-time show has two.
- `items` is already in printed order. Medley rows use `medleyId`, `medleyName`, and `songs` instead of `songId`; list the medley as one item unless the user asks for its parts. `medleyName` is catalog text, while each entry in `songs` still carries its own localized titles.
- `albumFallback` is non-null when the setlist is a Blu-ray/CD/DVD tracklist instead of the event's own list. Use its `notice` text and `albumUrl`, and never present it as an upstream event setlist.
- `setlist.status`, `resolution`, `pendingReview`, `shows[].uncertain`, and `shows[].reasons` carry the attribution quality. State them when they are not clean.
- `broadcast: true` marks a livestream / online / VR 演出; `status` is only set for a hand-checked outcome such as `cancelled` or `upcoming`.
- Every 演出 with a recorded setlist is counted: per-場次 rows come from whichever source recorded the list, including 演出 whose only list is a transcribed wiki table with no upstream VocaDB entry. `hasSetlist` and the counts agree.

## How to answer with it

**"Give me the setlist for show / performance X."**

1. Find the id in `performances.json`, `series/{id}.json`, or a song's `performances[]`.
2. `GET /api/v1/performances/{id}.json`.
3. List each `shows[]` entry separately; that is the real 場次-level setlist. Keep printed order.
4. Clarify 演出 vs 場次 when the user says "show": a 演出 can contain several 場次, so name which 場次 each list belongs to.
5. Link the 演出 as `https://miku-concert-stats.rjiazhen.top/shows/{id}`.

**"Which night played this song?"** — a song that appears in some but not all `shows[]` is a replacement; say which 場次 had it and which did not instead of implying the whole run played it.

## Common mistakes

- Presenting a setlist as the event's own when `albumFallback` is non-null.
- Claiming a setlist exists when `hasSetlist` is false or `shows` is empty; say the catalogue has no record of that list.
- Dropping `uncertain` / `approximate` flags or the `reasons` behind them.
- Counting `items` to produce a different "total songs performed" number than the API reports.
