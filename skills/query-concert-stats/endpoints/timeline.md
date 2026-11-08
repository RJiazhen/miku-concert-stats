---
name: query-concert-stats-timeline
description: Read the year-by-year series behind the timeline page with GET /api/v1/timeline — 場次 and 演出 totals, series stacking, character song counts and their yearly shares, new vs returning songs, series spans, and city coverage — with the same filters as the page. Use for "how did the number of shows change", "were recent years mostly new songs", "which characters sing more over time", or any trend / chart question.
---

# Timeline

Base URL: `https://miku-concert-stats.rjiazhen.top`

The annual series drawn by <https://miku-concert-stats.rjiazhen.top/timeline>: 場次 and 演出 totals per year, per-series stacking, character song counts and shares, new vs returning songs, series activity spans, and city coverage. The endpoint runs the page's own aggregation, so one request with the page's filters returns the page's numbers.

| Parameter | Values | Default |
| --- | --- | --- |
| `series` | comma-separated series ids, e.g. `81` or `81,82` | all |
| `yearFrom`, `yearTo` | four-digit calendar years; they clip the axis and drop 演出 outside it | open |
| `character` | comma-separated base character names | all |
| `producer` | comma-separated producer names | all |
| `city` | comma-separated Chinese city names, as in `cities.json` | all |
| `includeBroadcast` | `0` or `false` to count live 演出 only | **on** |
| `mergeVariants` | `1` to fold remixes, remasters, and covers into one song | off |
| `characterSongWeight` | `per-song` (each song adds 1 to every credited role) or `split` (a chorus song gives each role 1 / number of roles) | `per-song` |
| `newSongBaseline` | `catalog` or `filtered` | `catalog` |
| `includeSongIds` | `1` to add the song ids behind every year plus a `songs` name list | off |
| `includePerformances` | `0` to drop the per-演出 list | on |

**Its broadcast default differs from the ranking's.** The timeline page counts livestream, online, and VR 演出 by default so its totals agree with `/series`; unlike `rank`, omitting `includeBroadcast` here means they are **included**. Pass `includeBroadcast=0` for the song ranking's default. State which one you used.

- `years` is the continuous axis: it starts and ends at the first and last year with an included 演出, so empty years at either end are omitted, while gap years in between keep zero values; `catalogYears` is the catalogue-wide span before the year filter.
- `byYear[].shows` counts 場次 and `byYear[].performances` counts 演出 rows.
- `seriesByYear` stacks one series per row; its `series` field is the name, not an id. `seriesSpans` gives each series' first and last year.
- `characterSongByYear` is the distinct-song count per character bucket, the chart's stacked bars; `characterShareByYear` gives each bucket's share of that year's character songs, the optional right-axis lines. Both use `characterSongWeight`, so a duet counts 0.5 per role under `split`. Only characters registered on the site appear; unmatched credits are dropped, not bucketed.
- `songByYear` gives `newSongs`, `returning`, `distinctSongs`, and `newRatio`. "New" means first appearance in this catalogue, never a release date. Ask for `includeSongIds=1` only when you need to name the songs.
- `cityByYear` splits 演出 into Japan (`domestic`), abroad (`overseas`), and `unknownCountry`, with `newCities` and `overseasRatio`; `citySpans` is per city.
- `characterTotals` ranks the character buckets over the whole filtered dataset; it is what the chart legend orders by.
- `excluded` reports 演出 dropped for having no usable date (`undated`), for falling outside the year bounds (`byYear`), and how many 演出 / 場次 have no recognised city. Mention them instead of presenting the totals as complete.
- `performances` lists every included 演出 (oldest first) with `year`, `series`, `startDate`, `shows`, and its page `url` — use it to name the 演出 behind a year's total.
- Every parameter is optional. An unknown `series` id or `character` name returns `400`, so resolve them with `series.json` / `filters.json` first.

Shape, abridged — numbers change with every data update, so always quote the live response:

```json
{
  "options": { "includeBroadcast": true, "series": [81], "city": [], "character": [], "producer": [], "yearFrom": 2020, "yearTo": 2025, "mergeVariants": false, "characterSongWeight": "per-song", "newSongBaseline": "catalog" },
  "years": [2020, 2021, 2022, 2023, 2024, 2025],
  "byYear": [{ "year": 2024, "shows": 61, "performances": 23 }],
  "seriesByYear": [{ "year": 2024, "seriesId": 81, "series": "初音ミク「マジカルミライ」", "shows": 12, "performances": 2 }],
  "songByYear": [{ "year": 2024, "newSongs": 31, "returning": 70, "distinctSongs": 101, "newRatio": 0.3069 }],
  "excluded": { "undated": 0, "byYear": 12, "unknownCityPerformances": 3, "unknownCityShows": 4 },
  "totals": { "shows": 301, "performances": 120 },
  "url": "https://miku-concert-stats.rjiazhen.top/timeline"
}
```

## How to answer with it

**"How did the number of shows change year by year?"**

1. `GET /api/v1/timeline`, adding `series=<id>` for one series or `yearFrom` / `yearTo` to narrow the axis.
2. Read `byYear`: `shows` is 場次 and `performances` is 演出. Use `seriesByYear` to say which series drove a year.
3. To name the 演出 behind one year, filter `performances` on that `year`; do not add up setlist lines to build a total.
4. Say whether 配信 / 线上 / VR 演出 were counted; the endpoint includes them unless you pass `includeBroadcast=0`.

**"Were recent years mostly new songs or repeat performances?"**

- Read `songByYear` (`newSongs`, `returning`, `distinctSongs`, `newRatio`).
- `newSongs` is a catalogue first appearance, not a release date; `newRatio` is `newSongs / (newSongs + returning)` and is `null` when a year has nothing to classify.
- Add `includeSongIds=1` (and read the returned `songs` list) only when the answer must name the songs; otherwise keep the response small.
- `newSongBaseline=filtered` changes the baseline to the current filter set, so say which baseline you used when the numbers differ from the catalogue-wide view.

**"Which characters and cities appear more or less often over time?"**

- Read `characterSongByYear` (distinct songs per role), `characterShareByYear` (each role's share of that year), and `cityByYear` (Japan / abroad / unknown country, `newCities`, `overseasRatio`).
- Say which `characterSongWeight` you used: `per-song` lets a duet count for every role, `split` divides it.
- Only characters registered on the site are counted; producers, real singers, and choruses never become a character bucket.
- Cities the place list does not recognise are only counted in `excluded`, so do not name a city for them.

## Common mistakes

- Adding up per-演出 numbers from other endpoints instead of reading `byYear`; the totals then disagree with the site.
- Forgetting that broadcast 演出 are included by default here.
- Treating `newSongs` as newly released songs, or `newRatio` as a percentage to be multiplied again.
- Presenting totals while ignoring non-zero `excluded` counts.
