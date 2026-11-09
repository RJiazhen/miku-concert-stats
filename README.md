# Hatsune Miku Concert Setlist Stats

**English** | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-Hant.md) | [日本語](README.ja.md)

Browser-side statistics for Crypton-produced Hatsune Miku concert setlists. Compare songs across shows, series, and years without running aggregation on the server. The Cloudflare Worker only serves SSR and a few APIs (feedback, admin, dynamic `/api/v1`); ranking and search run on a catalog downloaded into the browser.

**Live site:** <https://miku-concert-stats.rjiazhen.top>

## Series covered

マジカルミライ, MIKU EXPO, MIKU WITH YOU, 初音ミクシンフォニー, 初音ミクライブパーティー, SNOW MIKU LIVE!, and related catalogue entries curated in-repo.

## Site map

| Route | Content |
| --- | --- |
| `/` | Song ranking (by show count or performance), with series / year / character / keyword filters |
| `/raw` | Raw tables, cross-show setlist compare, quality reports |
| `/report` | Setlist difference review between shows in the same series year |
| `/songs/{id}` | Song detail: variants, appearances, PV links |
| `/shows/{id}` | One performance: dates, setlist, rotation notes |
| `/series` | Series overview and filterable show list |
| `/series/{id}` | One series and its performances |
| `/timeline` | Timeline views across years |
| `/producers` | Producer rankings |

Header search matches song, producer, series, show, and place names in the local catalog only.

## Data sources

Primary evidence: official pages and encyclopedias (Hatsune Miku Wiki, Moegirlpedia, etc.). [VocaDB](https://vocadb.net/) is a peer reference for names, song ids, and dates—not the sole authority. When redistributing VocaDB-derived content, link back to VocaDB and follow the [VocaDB License](https://wiki.vocadb.net/docs/license). This project does not host cover art, lyrics, or official trademarks.

## AI skill

Install the public Agent Skill (no API keys):

```bash
npx skills add RJiazhen/miku-concert-stats@query-concert-stats
```

Or point an agent at <https://miku-concert-stats.rjiazhen.top/skill.md> / [`skills/query-concert-stats/SKILL.md`](skills/query-concert-stats/SKILL.md).

## Develop / contribute

See [`CONTRIBUTING.md`](CONTRIBUTING.md) and [`docs/local-development.md`](docs/local-development.md). Most UI, stats, tests, and catalog work run **without** a Cloudflare account. Deploy and admin ops: [`docs/cloudflare.md`](docs/cloudflare.md). Architecture overview: [`docs/architecture.md`](docs/architecture.md).

## License

[MIT](LICENSE)
