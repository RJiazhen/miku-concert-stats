---
name: query-concert-stats-cities
description: Rank cities by 演出 and 場次 with GET /api/v1/cities.json, including the original spellings of each city and the unrecognised-city bucket. Use for "which cities hosted the most shows", "was the tour in Europe", or a city total.
---

# Cities

Base URL: `https://miku-concert-stats.rjiazhen.top`

- `cities.json` ranks cities by 場次; each row carries `city` (the Chinese name), `cityEn` (the English name; the Chinese name when no checked Latin spelling exists), `originalNames` (other spellings in the catalogue), `concerts` (演出), `shows`, the year range, and the 演出 behind it.
- Each 演出 inside a city row carries `name` / `nameJa` / `nameEn` / `nameZh`, so the label is ready in the user's language.
- `unknown` holds the 演出 whose label names no checked city, so do not invent one.
- The `city=` filter on `timeline` takes the Chinese `city` value, never `cityEn`.
- There is no per-city page; the link to share is the city ranking page `https://miku-concert-stats.rjiazhen.top/cities`.
- 演出 and 場次 are different numbers; mention which one the user is comparing.

## How to answer with it

**"Which cities hosted the most shows?"**

- `GET /api/v1/cities.json`, then quote the top rows with both `concerts` and `shows` when the distinction matters.
- Mention `unknown.concerts` when it is non-zero, so the ranking is not presented as complete.
- Show `city` in Chinese, `cityEn` in English, and the catalog spelling in Japanese; `originalNames` is only for disambiguation or for searching elsewhere.

## Common mistakes

- Naming a city for the `unknown` bucket.
- Treating `concerts` (演出) as 場次.
- Building a per-city URL; there is no such page.
