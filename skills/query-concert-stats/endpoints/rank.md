---
name: query-concert-stats-rank
description: Rank the most performed songs with GET /api/v1/rank, filtered by series, year range, character, or producer, in 按场次 or 按演出 mode. Use for "top songs of 魔法未来", "most played songs of 2024", "what does 初音ミク sing most", or any ranking / leaderboard question.
---

# Song ranking

Base URL: `https://miku-concert-stats.rjiazhen.top`

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
- Rows with a count of 0 never enter the ranking.

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

## How to answer with it

**"What were the top songs in a series / year / for a character or producer?"**

- `GET /api/v1/rank?mode=show&series=<id>&limit=...`, using `yearFrom` / `yearTo`, `character`, or `producer` as needed.
- Resolve the series id with `series.json` or `filters.json` and the character / producer names with `filters.json`; never guess them.
- Never mix `series` with year bounds in one request — issue two requests if the user asks for both.
- Report the mode and the filters, because the same song legitimately has a different number under `show` and `event`.
- When the ranking is meant as "the most popular songs" rather than an exhaustive list, say how many songs matched (`count`) versus how many you printed.

## Common mistakes

- Reading `count` (number of matching songs) as a song's performance count; each row also has its own `count`.
- Filtering by a producer and then claiming the ranking is of all songs the producer wrote — it only ranks songs recorded in this catalogue's setlists.
- Leaving `includeBroadcast` on when comparing against a page that excludes livestreams (the ranking page excludes them by default).
