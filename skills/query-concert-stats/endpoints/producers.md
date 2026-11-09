---
name: query-concert-stats-producers
description: Read a producer's catalogue record — credited songs, performed songs, appearance and 場次 totals, year range, top songs, and every 演出 — with GET /api/v1/producers.json and /api/v1/producers/{id}.json. Use for "how did producer X do in concerts", "which DECO*27 songs were played", or a producer leaderboard.
---

# Producers

Base URL: `https://miku-concert-stats.rjiazhen.top`

Producer pages (and these two endpoints) list **only the songs this catalogue has recorded**, i.e. songs credited to that producer that appear in this site's concert setlists, with their merged variants. They are **not** the producer's complete discography: a producer with a long career may show a handful of songs here, and one of their well-known works can be absent because no recorded setlist includes it. Say that plainly instead of implying the producer's other songs do not exist, and use outside sources for the full works list.

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
      "topSongs": [{ "id": 14480, "name": "39", "nameJa": "39", "nameEn": "39", "nameZh": "39" }],
      "url": "https://miku-concert-stats.rjiazhen.top/producers/DECO*27"
    }
  ]
}
```

`producers/{id}.json` adds `songs` (each with `roles`, `publishYear`, `showCount`, `performanceCount`) and `performances`. Use the `id` from `producers.json` or `search`; do not build one yourself.

- 曲目数 (`songCount`) counts distinct credited songs **in this catalogue**, variants counted separately; it is not a discography total, and it includes songs with `showCount: 0` that never entered a counted 場次 (kz: 22 songs, 5 at zero).
- 演出曲目 (`performedSongCount`) counts credited songs that appeared in at least one 場次. A gap between the two means some catalogued credits contributed no counted 場次 — never read it as songs missing from the producer's career.
- 表演次数 (`appearanceCount`) sums each song's distinct 場次; 场次 (`showCount`) is the union across songs.
- `performanceCount` is the number of distinct 演出 credited.
- A song with two credited producers is counted for each, so summing `songCount` across producers exceeds the catalogue total; never present such a sum as a database total.
- A producer with no appearances is still listed, with `showCount: 0`.
- `topSongs` holds at most one song: the producer's most-performed 代表作 in the catalogued 場次, and an empty array when nothing was performed.
- Producer names follow the site rule: structured producer-side credits first, free text only for songs without them. Keep the official spelling (`DECO*27`, `kz`, `ryo`, `Mitchie M`) and do not translate a name.
- Songs and 演出 in both payloads are already localized: `topSongs[]`, `songs[]`, and `performances[]` carry the song name fields and the 演出 name fields, and `performances[].seriesNameEn` / `seriesNameZh` give the series in the user's language. Use those instead of translating the catalog Japanese.

## How to answer with it

1. `GET /api/v1/search?q=<name>&type=producers`, or find the row in `producers.json`.
2. `GET /api/v1/producers/{id}.json` for the per-song and per-演出 detail.
3. Report `songCount`, `performedSongCount`, `appearanceCount`, `showCount`, the year range, and the top songs — in plain words, not field names.
4. State that these are the producer's songs recorded in this catalogue's setlists, not their complete works. Do not present `songCount` as a discography total, and do not answer "not their song" when a favourite is missing.
5. Link the producer page with the `url` from the payload (`/producers/{name}`), labelling it with the producer name.

## Common mistakes

- Calling `songCount` a discography total, or summing it across producers.
- Treating a missing well-known song as evidence the producer did not write it.
- Reporting `appearanceCount` and `showCount` as if they were the same number.
