---
name: query-concert-stats-debuts
description: List songs whose first recorded performance was a given year, or a given series year, with GET /api/v1/debuts?year=&series=. Use for "which songs debuted in 2024", "new songs of 魔法未来 2023", or "when did this song first appear in the catalogue".
---

# Debuts

Base URL: `https://miku-concert-stats.rjiazhen.top`

Songs whose first recorded appearance was that year. "Debut" here means the first performance recorded in this catalogue, not the song's release date.

- Without `series`: the first appearance anywhere (`firstYear`).
- With `series=81`: the first appearance inside that series, using its series year (`firstSeriesYear`), which is not always the calendar year.
- Optional `limit`, default 100, maximum 200. `count` is the total number of matches.

## How to answer with it

- `GET /api/v1/debuts?year=<year>`, adding `series=<id>` for a series-year debut.
- Say that "debut" means first appearance in this catalogue's recorded setlists. If the user means a release date, the API cannot answer that part — use an outside source and mark it.
- When the list is longer than `limit`, report `count` and say how many you are printing.

## Common mistakes

- Presenting a catalogue first appearance as the song's release date.
- Using the calendar year for a series-year question; with `series`, the year is the series year.
- Treating a song absent from `debuts` as having never been performed — it may have debuted earlier.
