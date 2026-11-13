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
- **场替 (slot substitutions) live across `shows[]`, not in a separate field.** Compare items by `position` across every 場次 of the same 演出. When two or more different songs (or medleys) occupy the same `position` on different 場次, those songs are 场替 of one slot — the same printed 序号, different nights. Songs that appear in every 場次 at the same position are fixed programme rows, not 场替.
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
5. **Always surface 场替 when any exist.** Before writing the list, scan every `position` across `shows[]`. For each position that holds more than one song or medley, mark the substitution in the answer — do not print only one night's song as if the whole run shared it, and do not leave the reader to notice the difference themselves.
6. Link the 演出 as `https://miku-concert-stats.rjiazhen.top/shows/{id}`.

### How to write 场替

Put the alternate title in parentheses right after the song (or medley) name. Prefer the short form the user already understands:

| Answer language | Pattern | Example |
| --- | --- | --- |
| Chinese | `曲名（场替：另一曲）` | `爱之诗（场替：只做喜欢的事就好）` |
| English | `Song (rotation: Other Song)` | `Ai no Uta (rotation: Suki na Koto dake Yattereba Ii)` |
| Japanese | `曲名（場替：もう一曲）` | `愛の詩（場替：好きなことだけしてればいい）` |

Rules:

- **One slot, several alternatives.** Name one song first, then put every other song at that `position` inside the parentheses, separated by `、` / `,` / `、` as fits the language. Example: `爱之诗（场替：只做喜欢的事就好）`. Do not invent a third title that no 場次 played at that position.
- **Merged / "the setlist of this 演出" answers.** Prefer one programme line per printed slot. Fixed songs stay plain; every 场替 slot uses the parenthesis form above. Optionally add which 場次 played which alternative when the user cares about nights (`爱之诗（场替：只做喜欢的事就好；8/30、9/1 爱之诗 / 8/31 只做喜欢的事就好）`), but the parenthesis mark itself is mandatory whenever 场替 exist.
- **Single-場次 answers.** Still mark a song that is part of a 场替 slot: list that 場次's song, then put the other nights' song(s) in the parentheses so the reader knows it was not a fixed number. Example when answering only the 8/30 matinee: `爱之诗（场替：只做喜欢的事就好）`.
- **No 场替 → no mark.** Do not attach empty `（场替）` notes, and do not call a medley's internal parts 场替.
- Titles still come from `nameZh` / `nameEn` / `nameJa` for the answer language; the parenthesis only adds the alternate song name(s), never an id or a field name.

**"Which night played this song?"** — a song that appears in some but not all `shows[]` is a 场替 / replacement; say which 場次 had it and which did not instead of implying the whole run played it. When the same `position` holds a different song on the other nights, name that alternate with the parenthesis form above.

## Common mistakes

- Presenting a setlist as the event's own when `albumFallback` is non-null.
- Claiming a setlist exists when `hasSetlist` is false or `shows` is empty; say the catalogue has no record of that list.
- Dropping `uncertain` / `approximate` flags or the `reasons` behind them.
- Listing only one 場次's song at a 场替 slot without the parenthesis alternate, or implying every night shared that song.
- Counting `items` to produce a different "total songs performed" number than the API reports.
