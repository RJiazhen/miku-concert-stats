---
name: query-concert-stats-reports
description: Read the catalogue's own data-quality report and setlist-difference report with GET /api/v1/reports/quality.json and /api/v1/reports/setlist-differences.json. Use for "what data is missing or doubtful", "which songs have no PV", "which shows lack a setlist", or to compare two setlists of the same series year.
---

# Reports

Base URL: `https://miku-concert-stats.rjiazhen.top`

## `GET /api/v1/reports/quality.json`

- `summary` counts, plus `songsWithoutVideo`, `incompletePerformances`, `albumFallbackPerformances`, `uncertainLines`, `mismatchedShows`, `duplicateCandidates`, `pendingReview`.
- Use it when the user asks "what data is missing or doubtful?"; do not call a gap an error on its own.
- `albumFallbackPerformances` lists 演出 whose setlist is a Blu-ray/CD/DVD tracklist; `incompletePerformances` lists 演出 with no setlist or no date; `uncertainLines` gives sample setlist lines whose 場次 attribution is open.
- Report gaps in plain words (「某场演出还没有歌单」), not with field names or file names.

## `GET /api/v1/reports/setlist-differences.json`

Every same-series-year pair of setlists, with `severity` (`identical` / `order-only` / `count-differs` / `segment-differs` / `probably-different-program`), the LCS ratio, and the songs only one side performed. `adjacentEditions` compares consecutive series years for reference only.

## How to answer with it

1. Pick the matching report and quote its counts.
2. Name the 演出 / song with the `name` fields in the payload — `nameEn` / `nameZh` when the user is not reading Japanese — and link their `url`; never print an id.
3. Do not turn "no snapshot" or "no setlist" into "does not exist", and do not treat `pendingReview` as "the number is wrong" — it means the attribution is still open.

## Common mistakes

- Presenting a quality gap as a data error.
- Printing the report's internal sample keys instead of plain descriptions.
- Using `adjacentEditions` as if the pairs were the same programme.
