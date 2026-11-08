---
name: query-concert-stats-series
description: List concert series and their year span with GET /api/v1/series.json, or read one series and every 演出 in it with GET /api/v1/series/{id}.json. Use for "how many 演出 did 魔法未来 have", "when did 未来有你 start and end", or "list a series' shows".
---

# Series

Base URL: `https://miku-concert-stats.rjiazhen.top`

- `series.json` lists series with `performanceCount`, `showCount`, and the year range.
- `series/{id}.json` adds its `performances` (same shape as the flat index).
- The range follows the calendar of recorded 演出, so it can reach into a future, not-yet-performed year (シンフォニー currently ends at 2027); a last year of 2027 is not evidence that 2027 songs were performed.
- `MIKU EXPO` has no Chinese title and keeps its official Latin spelling; translate other series yourself (マジカルミライ → 魔法未来 / Magical Mirai, MIKU WITH YOU → 未来有你, シンフォニー → 交响乐).
- Series ids of `900000000` and above are local placeholders for one-off lives with no VocaDB series. Never print one; name the series.

## How to answer with it

**"List a series' performances."**

1. `GET /api/v1/series.json` to find the series id (or `filters.json`).
2. `GET /api/v1/series/{id}.json`.
3. Report date, venue, `showCount`, `hasSetlist`, `status`, and the `/shows/{id}` link, one 演出 per city stop.

**"How big is a series?"** — quote `performanceCount` (演出, i.e. city stops) and `showCount` (場次) as different numbers, and say which one you are giving.

## Common mistakes

- Merging one series year's city stops into a single show; each stop is its own 演出.
- Reading a future year in the span as proof that those songs were already performed.
- Inventing a Chinese name for a series that is officially Latin.
