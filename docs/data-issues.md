# Known data issues

A log of confirmed data gaps and model tensions as of **2026-11-07**, for follow-up fixes (often one agent per item). Each entry covers: what we see, impact, evidence (catalog ids), and suggested direction; resolved items are marked **Resolved** with a verification method.

One-line data snapshot: the catalog has **233 演出**, of which **214 have setlists**, expanded to **449 场次 / 10,838 song rows**; of those 214, **202** have songs row-by-row from wiki / official tracklists and **12** still use VocaDB setlists. **244** source records cover all 214 setlisted 演出; pending review / conflict / uncertain 场次 are all 0. Among the **19** 演出 without setlists: **13** are marked cancelled, **1** upcoming (未来有你 2026 Chengdu), **3** are upcoming symphony dates, **1** is MIKU EXPO 2020 Barcelona with no setlist, and **1** is SNOW MIKU LIVE! 2027.

Terminology:

- **演出** — one `performances` row (one VocaDB release event / one city stop), `vocadb.net/E/<id>`.
- **场次** — one calendar day; if there are separate daytime and nighttime shows the same day, each counts as one 场次. Derived by `shared/event-schedule.ts`.
- **Series year** — `series_id` + `series_number`, used only for indexing and premiere logic, not as “one concert.”

---

## 1. Missing data (not in upstream)

### 1.1 Three 初音ミクシンフォニー 演出 with no setlist at all

**What we see**: Series 256 has 32 演出, all without `songList` on VocaDB. **29** already use the 初音ミク Wiki tracklist (see 3.1, 3.5); **3** 场次 are still empty:

| performance id | Date | City | Reason |
| --- | --- | --- | --- |
| 12740 | 2027-01-10 | Osaka | 2026–2027 tour has not reached Osaka yet |
| 13209 | 2027-03-13 | Yokohama | 2027 tour not held (VocaDB Draft) |
| 13210 | No date (Draft) | Tokyo | Same |

**Why**: Not “missing data” — **not happened yet**. Wiki tracklists are usually written after the show.

**Impact**: These 3 演出 contribute no songs to rankings; the 演出 page shows “still no setlist.”

**Suggestion**: After the show, add `data/wiki-raw/*.json` and `.cursor/skills/update-concert-data/scripts/wiki_raw_spec.py` (see `.cursor/skills/update-concert-data/SKILL.md`). If upstream adds `songList`, clear `data/cache/` before `pnpm collect` (see 4.1).

### 1.4 Overseas 演出 missing `country_code` at scale (Resolved)

**What we saw**: As of 2026-11, **129** of 232 演出 had empty `country_code` (including 4 empty strings); overseas stops in 2020 / 2024 / 2026 were almost all blank — timeline chart 6’s “unknown country” was this batch. A few rows had codes from upstream (China, Indonesia, etc.); the rest only had city and venue.

**Fix**: Manual table `data/show-locations.json` (country by city), maintained with `pnpm locations --sync` / `--set`; generated `data/increments/0013-show-locations.sql` only fills blanks:

```sql
UPDATE performances SET country_code = 'CA'
WHERE (country_code IS NULL OR trim(country_code) = '') AND id IN (…);
```

**Vs VocaDB**: Keep upstream `JP` / `CN` / `ID` unchanged; this table fills by **city of the 演出**, from official tour pages and venue city, not waiting for VocaDB. If upstream later disagrees, `pnpm locations --sync` / `--set` prints **conflict** and **does not overwrite** existing values. After fill, the only rows still without a country are **6** online 演出 (Twitch / オンライン), which are not in any country and default out of domestic/overseas splits.

**Verify**: `pnpm locations --missing` should be empty; `sqlite3 public/data/catalog.sqlite "SELECT country_code, count(*) FROM performances GROUP BY country_code"` should show only **6** `NULL` rows.

## 2. Model and semantic tension

### 2.1 `series_number` is a series-year label, not the calendar year

**What we see**: Multiple 演出 in a cross-year run share one `series_number`:

| 演出 | `series_number` | Actual date |
| --- | --- | --- |
| 2504 初音ミクシンフォニー 2018–2019 Tokyo | 2018 | 2018-11-24 |
| 2960 初音ミクシンフォニー 2018–2019 Osaka | **2018** | **2019-01-25** |
| 12739 2026–2027 〜Melodies on the Keys〜 Yokohama | 2026 | 2026-10-10 |
| 12740 2026–2027 〜Melodies on the Keys〜 Osaka | **2026** | **2027-01-10** |
| 2954/2955/2956 2020 〜5th Anniversary〜 | 2020 | 2020-09-21 ~ 2020-11-17 |

**Impact**: Year filters use `start_date`; series-year label (`series_number`) follows upstream, so Osaka on 2019-01-25 is series-year 2018. The site no longer uses year as nav hierarchy; pages are 系列 → 演出 → 场次 only. The mismatch mainly affects series-year premiere and setlist-diff grouping.

**Suggestion**: In the UI, clarify “series year” vs “date year” (e.g. label cross-year runs), or group by 演出 date year and store series year separately. **Do not** change `series_number` on your own — it comes from VocaDB.

### 2.2 Exhibition-only days inside a date range counted as 演出 days

**What we saw**: A 演出 has only `start_date`–`end_date`, no per-day program. Days in the range with only an exhibition (no live) were still counted as 场次:

- 2019 Osaka (2515): 8/9 exhibition only; 8/10–8/11 live.
- 2020 Osaka (2758): 11/27 exhibition only; 11/28–11/29 live.

**Resolved (2026-11-06)**: Use `data/performance-setlists.json` `performances.<id>.noShowDates` to drop dates. Verified exhibition days: 2015 Tokyo 9/06, 2016 Tokyo 9/09, 2018 Tokyo 8/31, 2019 Osaka 8/09, 2020 Osaka 11/27.

Verify:

```sql
SELECT performance_id, GROUP_CONCAT(show_key, ' ') FROM performance_show_setlists
 WHERE performance_id IN (2515, 2758) GROUP BY 1;
-- 2515: 8/10 day+night + 8/11 day+night (8/09 removed)
-- 2758: 11/28 day+night + 11/29 day+night (11/27 removed)
```

### 2.3 Day/night show data absent on VocaDB

**What we see**:

- `performances.showtime_local` non-empty **2 / 218** (manual 夏の終わりの39祭り and 未来有你 2026 Chengdu; all VocaDB rows still empty); `time_evidence` non-empty **2**; all `time_precision` are `day`.
- Series 81 (魔法未来), 173 (未来有你): **no pair of events on the same day**, so you cannot split day/night by event.
- `shared/showtime.ts` accepts **exactly one** `Showtime`/`開演` time; two times → `null`. Even if a single time is parsed later, `scripts/vocadb/normalize.ts` hard-codes `time_precision` to `'day'`, not `minute`.
- So far the only day/night evidence is setlist notes (`Daytime Shows`, `Nighttime Shows`, `1st/2nd Show`, `昼夜`): proves a song was day-only or night-only, not how many shows per day or start times.

**External verification (not in DB, usable as-is)**: Official ticket pages checked 2026-11-04; 40 rows with source and confidence. Pattern: 魔法未来 since 2019 is usually day+night daily, opening night often night-only; 未来有你 since 2018 is day 14:00 / night 19:30 on tour.

Confirmed year/city:

| Series | Year | Dates with two shows/day | Dates with one show |
| --- | --- | --- | --- |
| 魔法未来 | 2019 | Osaka 8/10–11; Tokyo 8/31, 9/1 | Tokyo 8/30 (night only) |
| 魔法未来 | 2020 | Osaka 11/28–29; Tokyo 12/19–20 (**3-part**) | Tokyo 12/18 (night only) |
| 魔法未来 | 2021 | Osaka 10/23–24; Tokyo 11/5–7 | Osaka 10/22 (night only) |
| 魔法未来 | 2022 | Osaka 8/13–14; Tokyo 9/2–4 | Osaka 8/12 (night only) |
| 魔法未来 | 2023 | Osaka 8/11–13; Tokyo 9/1–3; Sapporo 2/4–5 | — |
| 未来有你 | 2018 | Beijing 10/13; Shanghai 10/27–28; Chengdu 10/20 | — |
| 未来有你 | 2019 | Shanghai 11/2–3; Beijing 11/16 | Chengdu 11/9, Guangzhou 11/23–24 (night only) |

Unconfirmed or noteworthy:

1. **2020 魔法未来 is 3-part** (11:00 / 15:00 / 19:00), not standard day/night. Official labels are 1部/2部/3部; mapping to day (11:00, 15:00) + night (19:00) is model inference, not an official tag → confidence **medium**.
2. **2023 Osaka 8/11 VocaDB blurb is stale**: blurb had night only (March); official site added daytime 2023-04-06. External checks must record `accessedAt`; do not trust blurbs alone.
3. 2019 Shanghai 11/3 daytime added 9/11; per-day times not found on an official page → confidence **medium**.
4. 未来有你 2020 / 2021 had no city 场次 (one online show); no day/night data.

**Direction**: New `data/show-schedules.json` (manual) + `shared/show-schedules.ts` (validating loader), keyed by VocaDB performance id per day — suggested structure:

**Done (2026-11-05, plan B)**: Manual list lives in `data/performance-setlists.json` `performances.<id>`: `dayNight` (day + night), `noShowDates` (exhibition only), `halves` (day-only or night-only). Validator: `shared/performance-setlists.ts`; 场次 derivation via extra args to `performanceSchedules`, materialized in `performance_setlists`. Day/night sources at 演出 level (`performance_setlist_sources`); pending items in `docs/reports/setlist-review.md` section A.

**Status (2026-11-06)**: `pending review = 0`, `conflict = 0`, `uncertain = 0`. Two former conflicts — MIKU EXPO 2015 Shanghai (Fandom 6/26–6/27 vs VocaDB 6/27–6/28) and Live Party 2011 Sapporo (Fandom 8/17 only vs VocaDB 8/16–8/17) — resolved using SCLA and 5pb official archives: **6/27–6/28 four shows / 8/16–8/17 two shows**, no longer open.

Verified from official tickets: 魔法未来 2015–2026 Tokyo / Osaka / Sapporo / Fukuoka / Sendai / Hamamatsu; 未来有你 2018–2019 four cities (萌娘百科); MIKU EXPO 2014 Indonesia / LA / NYC, SNOW MIKU 2018, Live Party 2013 Sapporo (VocaDB Fandom). 2019 Osaka 8/09, 2020 Osaka 11/27, 2018 Tokyo 8/31, 2015 Tokyo 9/06, 2016 Tokyo 9/09 confirmed exhibition-only and removed from 场次.

```json
{
  "performances": {
    "6045": {
      "dayNight": ["2023-08-11", "2023-08-12", "2023-08-13"],
      "note": "Official tickets: 8/11–8/13 day + night daily, 6 shows",
      "sources": [
        {
          "url": "https://magicalmirai.com/2023/osaka_ticket.html",
          "title": "マジカルミライ 2023 OSAKA チケット",
          "accessedAt": "2026-11-05",
          "confidence": "high"
        }
      ]
    }
  }
}
```

Code seam: `performanceSchedules(catalog, review, curatedDayNight, curatedNoShowDates, curatedHalves)` takes three maps — dates to split day/night, exhibition-only dates, day-only or night-only dates. Pages and stats read `performance_show_setlists`, so they need not parse again.

### 2.4 One setlist shared across cities — cannot prove which city played a song

**What we see**: One `song_list_id` can be shared by many 演出:

| song_list | Shared 演出 count | Notes |
| --- | --- | --- |
| 16544 | **17** | MIKU EXPO 2024 North America (6516–6531, 7186) |
| 26423 | 15 | 2026 North America (9811–9825) |
| 6571 | 10 | 2016 US (1859/1860/1924/1930–1936) |
| 22929 | 8 | 2025 Asia (9341, 9348–9353, 9555) |
| 7758 | 7 | — |
| 31 | 2 | 2012 Hong Kong 2524 / Taiwan 2525 |

**Impact**: Unless a note has `Day N` / city / `Taiwan only` etc., a row counts toward **all** 场次 of that 演出. That is the honest reading of “one list for the whole run,” but it inflates per-场次 song count (UI uses ≈).

Known example: song list 31 row 25 (Starduster) note `Taiwan only` → only 2525 Taiwan; other 24 rows belong to both Hong Kong and Taiwan.

**Suggestion**: Do not infer per-city diffs from shared lists; per-场次 precision needs the same manual file as 2.3.

**Handled (2026-11-05, plan B)**: 场次 layer in catalog. `pnpm derive:setlists` expands each source row to the 场次 it covers → `performance_show_setlist_items`; `/shows/{id}` lists songs per 场次, not via notes. Source lists unchanged; `/raw` cross-演出 diff and `/report` still read source layer. Gaps listed in `docs/reports/setlist-review.md`, confirmed into `data/performance-setlists.json`. See `docs/architecture.md` “Source setlist layer vs 场次 layer.”

### 2.5 `series_suffix` semantics inconsistent

**What we see**: Sometimes city (`Tokyo`, `Osaka`), sometimes medium (`VR`, `Online`), sometimes empty.

**Impact**: Usable for city matching only, not identity or classification.

**Suggestion**: Keep as-is; new code must not treat `series_suffix` as a unique key.

### 2.6 演出 with no city

**What we see**:

- `3224` (2021 Online): no city.
- `1619` (2017 China Festival): no city, two 场次.

**Impact**: City rankings bucket as `unknown`.

**Suggestion**: Optional display location for these; do not force online shows into a city.

---

## 3. Limits of curated data itself

### 3.1 Album tracklist fallback retired (mechanism kept)

**Status (2026-11-06)**: 26 symphony 演出 formerly used album tracks; **all now use wiki tracklists**: `performance_setlists.source_kind = 'wiki'`, row `evidence = 'wiki'`. `/shows`, rankings, coverage read 场次 layer — album tracks no longer appear on pages.

**What remains**: 11 album `song_lists` in DB; 26 演出 still point `performances.song_list_id` at them — affects source layer only (`/raw`). Derived layer fully overridden. Mechanism (`data/album-setlists.json` + `pnpm collect:albums`) kept for edge cases with no wiki page.

**Original limits (for reference)**:

1. **Blu-rays after 2018 have no tracks on VocaDB** (45288, 45291, 45290, 45289, 52465); only 2017 (30961) does.
2. **Same album tracklist for different cities in a year** (e.g. 2024 Tokyo/Yokohama/Kobe all 45255) — cannot prove city diffs; why wiki tracklists: Tokyo vs Yokohama/Kobe are different programs.
3. **2023 has two releases**: `39621` (Live at Suntory Hall) and `40398` (tour edition).

### 3.2 Placeholder song rules

**Status**: VocaDB placeholders (`[Placeholder song]`, `[Unknown song]`, etc.) drop entire rows; rules in `shared/placeholder-song.ts`. Started from 鼓童 lists where `???` (id 15591) appeared 14× for taiko segments.

**Risk**: Rule is global; a “meaningful” placeholder (e.g. one `???` for a whole arrangement) is dropped silently. None in catalog now; revisit if it appears.

### 3.3 Version-chain root anomalies (Resolved)

**What we saw**: `scripts/vocadb/album-setlists.ts` resolves album tracks along `originalVersionId` to a root; some roots are non-obvious:

- `ハジメテノオト` → `389595`, name `(Shortバージョン)`.
- `初音ミクの消失` → `295872`, not the well-known `2925`.

**Impact**: Songs hang on obscure ids; rankings and merge display confuse readers; quality report flags suspected dupes.

**Verification (atwiki + live setlists, 2026-11-06)**: 11 symphony 演出 setlists match 初音ミク Wiki tracklists line by line; issue is song id only.

- 2016 Tokyo (`80167`): #2 `ハジメテノオト` marked vocal; `初音ミクの消失` in “2008–2009 年楽曲ヒストリー” block.
- 2017 Osaka / Tokyo (`80237`): `初音ミクの消失` with `初音ミクの激唱`; `ハジメテノオト` encore, vocal.
- 2018–2019 Tokyo (`80287`): only `初音ミクの消失`, no `ハジメテノオト`.
- 2020 (`80404`): `ハジメテノオト` 5th Anniversary ver., Tokyo + Yokohama daytime only; Osaka swaps `Connecting`.
- 2023 (`80537`): Tokyo `ハジメテノオト`; Yokohama / Kobe `初音ミクの消失` (with `激唱`).
- 2025 (`80551`): Tokyo `初音ミクの消失`; `ハジメテノオト` only Sapporo daytime.

Actual usage of the two entries:

- `389595` (ハジメテノオト Short, 136s): **never performed**. Symphony uses full version; short never on stage.
- `295872` (初音ミクの消失, 110s): **the version played live**: MIKU EXPO 2016 Tokyo, マジカルミライ 2023 (~2:40), 初音ミク×鼓童 2017 — short ver. `2925` (-DEAD END-, 287s): **0** 演出 rows, never performed.

Id quirk from 0004 album chain: 0008 prefers “id already used in this 演出” (`build-setlist-curation.py` `prefer`), inheriting 389595 / 295872 — accidentally correct for 295872 as the live cut.

Also: **初音ミク×鼓童 2018 (2948) did not play 初音ミクの消失**; catalog never had that row — no change needed.

**Fix**:

- `389595` (ハジメテノオト Short) **removed from catalog**. Only entered via album chain, never performed: `data/increments/0011-manual-corrections.sql` repoints refs to `10951`, deletes `songs` / `videos` / `song_producers` / `song_vocalists`. 0004 regenerates it each run; 0011 runs after and is idempotent.
- `2925` (初音ミクの消失 -DEAD END-, 287s) **removed**: 0011 repoints `setlist_items` / `setlist_item_songs` / `performance_show_setlist_items` to `295872`, deletes `songs`, 3 PVs, credits. Long version has no 演出 — keeping it adds a never-performed song to rankings.
- Live version is **arranged short ~2:40**, not the upload; note in `data/song-notes.json`, “concert performance version” banner on song page. `shared/song-notes.ts` validates; `tests/song-notes.test.ts` checks keys.

`tests/song-variants.test.ts` asserts neither `389595` nor `2925` in mapping. After merge: `ハジメテノオト` 46 rows / 21 演出; `初音ミクの消失` 57 rows / 34 演出.

### 3.4 Transitional increment SQL

**Status**: `data/increments/0005-manual-catalog.sql` is the only transitional seed file, all `INSERT OR IGNORE`: 39 感谢祭 2520, 鼓童 255, 未来有你 2026 Chengdu, デコミク LIVE 9401, plus 9 standalone 演出. 9401 differs: VocaDB event with no series (`seriesId` null), never hit by series loop — local series 900000000 and empty song list 24530 added. Nine off-VocaDB 演出 (ミクFES '09 / '24, 夏の終わりの39祭り, 夏祭初音鑑 大阪公演 / 東京公演, GALAXY LIVE 2020 / 2021, LAWSON 50th, ポケミク VOLTAGE Live): no VocaDB event; local series ids from 900000001.

**Later**: `pnpm collect` writes same upstream rows after `0001`; those statements become no-ops; 演出 still without VocaDB events stay in this file. Before removing a block, confirm `0001` has the series/event (`255`, `2520`, `9401`).

### 3.5 Songs no longer primarily from VocaDB

**Background**: VocaDB stores one `songList` per list, shared across cities (up to 17 演出); regional diffs only in row notes; symphony has no `songList`. Songs now from 初音ミク Wiki (atwiki) **tracklists** line by line.

**Status (2026-11-06)**: Of 191 演出 with songs, **179** row-by-row from wiki / official tracklists; **12** still VocaDB setlists with official ticket / Fandom / 萌娘 schedule sources. Each 演出 has ≥1 `performance_setlist_sources` (202 rows, 91 unique URLs) with `title` / `accessed_at` / `confidence` / `note`.

**Cost of the change**:

1. **Only 37 tables’ raw cells archived** (`data/wiki-raw/`). Other cited atwiki pages (symphony years, EXPO 2014–2020, Live Party, etc.) were hand-copied into scripts with URL and rows, but **raw tables not saved**.
2. **Sources are 演出-level only**, not per-row URL. `performance_show_setlist_items` only has `evidence` (`wiki` / `shared` / `note`) and original row notes. Per-row source pitfalls: see 3.6.
3. **Wiki can be wrong**. `evidence` = attribution rule, not “verified”; `confidence` default `medium` (`high` for official pages only).

**How to verify**: `docs/setlist-confirmation.md` (场次 × songs, notes, links per 演出) and `docs/reports/setlist-review.md`. Ingestion: `.cursor/skills/update-concert-data/SKILL.md`.

### 3.6 Registering non-VOCALOID songs

**Background**: Wiki tracklists include classical arrangements, 鼓童 instrumentals, folk/Christmas; no VocaDB entry. Those rows were excluded → incomplete 演出 pages.

**Status**: `songs.category` distinguishes `vocaloid` (default) vs `classical` / `traditional` / `instrumental`. Registered like normal songs:

- ids from `2_000_000_000` (`shared/repertoire.ts` `LOCAL_SONG_ID_BASE`), no VocaDB clash;
- `artist_string` = composer only, **no vocalist** (empty `song_vocalists`);
- `source_url` = wiki page naming the piece;
- row `evidence = 'wiki'`; UI “non-VocaDB song · category”; song page “not a VOCALOID song.”

Currently 20 (classical 5 / instrumental 8 / traditional 3 / VOCALOID covers found only on VocaDB 4).

**Risk**: They appear in rankings with VOCALOID songs. For “VOCALOID-only” stats, filter `AND songs.category = 'vocaloid'`.

### 3.7 Two pitfalls for per-row sources

`performance_show_setlist_items.evidence` is **attribution**, not a link; no DB CHECK (only `shared/catalog.ts` on load). When building per-row source buttons:

- `evidence = 'wiki'`: all `source_position` **NULL** → use `performance_setlist_sources` (演出-level). One SQL `LEFT JOIN setlist_items ON source_position` silently NULLs URLs for 8669 / 9894 rows (88%).
- `note` / `shared`: all have `source_position` → `performance_setlists.source_list_id → song_lists.source_url`.
- `curated`: **0** rows now; type and UI kept; may have `source_position` (manual assign) or not (manual row).
- `performance_setlists.change = 'curated'` is **another field** (179 rows) = “whole list replaced”; do not confuse with row `evidence`.

### 3.8 Id alignment and “do not rewrite for VocaDB”

**Policy**: VocaDB is peer to official sites, 萌娘百科, 初音ミク Wiki — reference, not authority (`.cursor/rules/data-sources.mdc`).

- Keep existing VocaDB ids for 演出, series, songs for interoperability.
- Reserved ranges when VocaDB has no row: songs from `2_000_000_000` (`LOCAL_SONG_ID_BASE`), 演出 from `3_000_000_000` (`LOCAL_PERFORMANCE_ID_BASE`), series from `900_000_000`. Do not wait for VocaDB or swap ids on existing refs.
- VocaDB later renaming, date changes, deleted events, or lists conflicting with wiki do **not** auto-rewrite this project: manual/wiki data after `0001` (`INSERT OR IGNORE` / `UPDATE`) survives `pnpm collect` rewriting `0001`.
- Two ids for same object = duplicate; resolve manually per §4.5 / `data/song-variants.json` / `data/setlist-merges.json`; no “upstream wins.”
- After `pnpm collect`, compare 演出 count, 场次 count, `pnpm derive:setlists --check`; if one 演出 missing, check VocaDB deleted event — do not delete local data.
- Song titles do not follow VocaDB default name: 404329 upstream default is emoji `🔪、🔪、🔪`; `names` list and wiki tracklist use `ナイフ、ナイフ、ナイフ`. Catalog `name` / `name_ja` keep upstream; display title in `data/song-aliases.json` `title` (other forms in `aliases` for search only); English names in `0012`, Chinese `刀, 刀, 刀` in `data/song-titles.zh-CN.json`; resolution in `shared/song-aliases.ts`; `pnpm collect` does not touch these files.

## 4. Collection pipeline notes

### 4.1 Cache hides upstream updates

**What we see**: `scripts/vocadb/client.ts` reads `data/cache/<sha256(url)>.json` first. Upstream adds setlist or changes schedule → `pnpm collect` still sees old response.

**Impact**: If symphony gets `songList` on VocaDB, you never see it without clearing cache.

**Suggestion**: Before refreshing a series, delete cache files for that series and related events, then `pnpm collect`.

### 4.2 Cancelled shows not recognizable

**What we saw**: `performances.vocadb_status` only `Finished / Approved / Draft`, no Cancelled. Cancelled stops stored as `Finished` with no date:

- `2886` 鼓童 2020 (`Twitter (Postponement)` then `Twitter (Cancellation)`)
- `2853`–`2861`, `2878`–`2880` MIKU EXPO 2020 US/Canada (`Twitter (Cancellation)`)

**Resolved (2026-11-06)**: `performance_status` table with `status` (`cancelled` / `postponed` / `upcoming`), announcement `source_url`, access date. **13 `cancelled`** (12 MIKU EXPO 2020 stops + 鼓童 2020); 演出 page shows “这场演出已取消” with announcement link; index no longer mixes with “date TBD.”

### 4.3 Fourteen 演出 with no date

`2853`–`2861`, `2878`–`2880`, `2886`, `13210`. Also no setlist → excluded from rankings; index shows “date unknown.” No fix required now; affects 场次 vs 演出 counts (场次: no; 演出: still 1).

### 4.4 Manual attribution of 39's Giving Day

**What we see**: `2520` has no upstream `seriesId`, `seriesNumber` 0; `STANDALONE_EVENTS` puts it in series 219 / year 2010 → page title “初音未来演唱会派对 2010.”

**Effect**: Diff report adds extra 2010↔2011 adjacent-year pair.

**To standalone**: VocaDB has series `218 ミクの日大感謝祭` (Draft, 0 shows); add to `SERIES_IDS` and Chinese title in `data/series-titles.zh-CN.json`.

### 4.5 演出 not on VocaDB (manual seed)

VocaDB series 173 only has 2026 Shanghai (13120). Chengdu 2026-12-26 announced at Shanghai finale; no VocaDB event → row from `data/increments/0005-manual-catalog.sql`:

| id | 演出 | Date | Data |
| --- | --- | --- | --- |
| 3000000001 | MIKU WITH YOU 2026 in Chengdu | 2026-12-26 19:00 | Chengdu Financial City Performing Arts Center, single show, no setlist yet |

Conventions:

- **Ids from 3,000,000,000** (`shared/repertoire.ts` `LOCAL_PERFORMANCE_ID_BASE`), disjoint from VocaDB releaseEvent ids; scripts calling `vocadb.net/api/releaseEvents/{id}` must skip this range.
- `source_url` is schedule/announcement, not `vocadb.net/E/{id}`; `vocadb_status` NULL → UI “演出来源” not “VocaDB 演出.”
- Seed file `INSERT OR IGNORE` after `0001`; `pnpm collect` drops and rebuilds `performances`.
- Upcoming: `data/performance-setlists.json` `statuses.<id>` `status: "upcoming"` → `pnpm derive:setlists` writes `performance_status`; page “这场演出尚未举行.”
- Setlist after show per `.cursor/skills/update-concert-data/SKILL.md` → `data/wiki-raw/` + `wiki_raw_spec.py` (`RAW_SPEC` `mwy2026` points at 13120 only; Chengdu table needs new key or add id to `performances`).

**Variant: VocaDB event outside any collected series**. デコミク LIVE starring 初音ミク『Hello』 is event 9401, `seriesId` null, skipped by series loop → `0005-manual-catalog.sql`:

| id | 演出 | Date | Data |
| --- | --- | --- | --- |
| 9401 | デコミク LIVE starring 初音ミク『Hello』 | 2026-02-14 day + night | 国立代々木競技場第一体育館; wiki tracklist 27 songs × 2 shows |

- Unlike Chengdu, 9401 is real VocaDB id: `source_url` `https://vocadb.net/E/9401`, `vocadb_status` `Finished`.
- No series → local **series 900000000** (`デコミク LIVE starring 初音ミク`) + `edition_premieres`; local series from 900,000,000.
- VocaDB song list 24530 has **only first 10 rows** (through 《チェリーポップ》); `performances.song_list_id` 24530 for rankings/coverage; all 27 rows from wiki (`performance_setlists.source_kind = 'wiki'`). Rows 5–6 `Daytime`/`Nighttime` match wiki day/night swap.
- `pnpm collect` does not pull 24530 rows into `setlist_items`; if list completes later, wiki tracklist still replaces wholesale (wiki wins).
- Chinese series name in `data/series-titles.zh-CN.json` (Japanese series need translation; `tests/series-titles.test.ts`).

### 4.6 Manual 演出 name corrections

Upstream names sometimes omit city: 13120 on VocaDB is only `MIKU WITH YOU 2026` (Shanghai-only series at the time); after Chengdu, names must differ. Display-only fixes in `data/increments/0011-manual-corrections.sql` `UPDATE` `name` / `name_ja` / `series_suffix`, after `0001` so collect does not drop them.

| id | Upstream name | Catalog name | `series_suffix` |
| --- | --- | --- | --- |
| 13120 | MIKU WITH YOU 2026 | MIKU WITH YOU 2026 in Shanghai | `in Shanghai` |
| 3000000001 | (none upstream) | MIKU WITH YOU 2026 in Chengdu | `in Chengdu` |
| 1619 | HATSUNE MIKU with YOU 2017 CHINA FESTIVAL | MIKU WITH YOU 2017 in Shanghai | `in Shanghai` |

Conventions:

- Match upstream 2024/2025 pattern `MIKU WITH YOU <year> in <city>`; Chinese e.g. 「初音未来·未来有你2026演唱会 上海站」.
- 1619 is the only 演出 still using old `HATSUNE MIKU with YOU` branding; without `MIKU WITH YOU` in the name, `shared/series-titles.ts` cannot show 「未来有你」— aligned with 2018+ stops after rename.
- Only those columns; not `venue_name`, dates, `song_list_id`; `series_suffix` must be `in <city>` for `data/place-names.zh-CN.json` (e.g. `in Shanghai` → 「上海」).
- Before new corrections, check upstream did not fix in `0001`; if city already in `0001`, remove the `UPDATE`.

---

## 5. Presentation-layer nits

1. **MIKU EXPO has no Chinese series title** (keep official Latin); not in `data/series-titles.zh-CN.json`. `MIKU WITH YOU` uses official 「未来有你」. Add `MIKU EXPO` translation later if wanted; `tests/series-titles.test.ts` requires Chinese for Japanese series names, not Latin series.
2. **Quality report only aggregates** — does not list each 演出 without setlist or start date (19 now, by `setlistPerformanceIds`; wiki-sourced 演出 no longer counted). Use public API quality report or local `nuxt dev` `/raw` `performances` table.
3. **Public nav: 系列 → 演出 → 场次 only**; `/series/{id}` is series home; `/editions` removed; `series_number` remains for premiere and setlist diff.
4. **Diff report must be regenerated**: after parser changes run `pnpm report:setlist` or CI `pnpm report:setlist --check` fails.
5. **Chinese song titles and character mapping** ([#5](https://github.com/RJiazhen/miku-concert-stats/issues/5)): `data/song-titles.zh-CN.json` has 397 entries, 67.3% of 590 catalog songs; gap by “needs Chinese” is smaller: many performance titles are Latin (`Tell Your World`); many Japanese titles match Chinese (`劣等上等`, `炉心融解`, …) and need not be registered; real gap is few kana-heavy titles. `data/characters.json` 22 rules cover all voicebank strings in catalog; 25 unmatched vocalist strings are not characters — 6 are VocaDB `feat. various` folds, 7 also producers, 16 live singers/bands/groups; `女声1 (AquesTalk)` is non-character synth. List: `pnpm report:names` → `tmp/name-coverage.md` (not in repo); [#43](https://github.com/RJiazhen/miku-concert-stats/issues/43) for 6 `various` without real names.
6. **Labels / groups excluded from producer stats**: `data/producer-flags.json` marks 14 non-person credits, default off on `/producers`, totals, filters, header search, timeline producer filter, `scripts/build-api.ts` export; toggle “include labels/groups” on `/producers`. List:
   - Labels / studios: `OTOIRO` (DECO*27 label, `artist_string` only), `Rockwell` (`Ar/60068`, VocaDB type Producer, ruled studio).
   - Orchestras / bands / circles: `東京フィルハーモニー交響楽団` (`Ar/54531` OtherGroup), `鼓童` (`Ar/56929` OtherGroup), `BUMP OF CHICKEN` (`Ar/95308` Band), `Last Note.` (`Ar/30` Band), `Anamanaguchi` (`Ar/46762` Band), `MOSAIC.WAV` (`Ar/1452` Circle).
   - Collab / group credits: `HoneyWorks` (`Ar/855` OtherGroup), `1640mP` (`Ar/237` OtherGroup), `ELS` (`Ar/55068` OtherGroup), `supercell` (`Ar/249` OtherGroup), `WONDERFUL★OPPORTUNITY!` (with じーざすP, no VocaDB entry).
   - Title not a person: `愛知民謡（編曲：鼓童）`.

   `support` (non-core collab) still counted with flag; no personal credits to fold yet. Raw `song_producers` / `artist_string` unchanged; `pnpm collect` does not touch this file.

---

## 6. Suggested fix priority

| Priority | Item | Rationale |
| --- | --- | --- |
| Done | 2.4 shared multi-city list → 场次 layer (`pnpm derive:setlists`) | Each 场次 has full song list; `/shows` no longer relies on notes |
| Done | 2.3 day/night (`data/performance-setlists.json`) | `pending review = 0`, `conflict = 0`, `uncertain = 0` |
| Done | 2.2 exhibition days excluded | 5 verified exhibition days removed from 场次 |
| Done | 4.2 cancelled show labels | `performance_status`, 13 `cancelled` |
| Done | Wiki tracklists for songs (3.5) | 179 / 191 演出; regional diffs not via notes |
| Done | Non-VOCALOID registration (3.6) | 20 entries; 演出 pages complete |
| — | 3.3 version-chain manual merge ([#23](https://github.com/RJiazhen/miku-concert-stats/issues/23)) | Resolved: `389595`, `2925` removed (0011-manual-corrections); song page concert-version note |
| Medium | 3.5 raw table backfill | 52 cited atwiki pages without archived tables |
| Low | 1.1 remaining 3 symphony setlists | Shows not held; wait for wiki |
| Low | 4.4 39's Giving Day as own series | New series + titles; limited payoff |

---

## 7. General requirements when fixing

- Manual data in `data/*.json` with `shared/*.ts` validators and `tests/`; do not write `catalog.sqlite` / `catalog.sqlite.gz` directly.
- Catalog seeds: `data/increments/NNNN-*.sql`, all `INSERT OR IGNORE`, header comment for source and obsolescence.
- External verification must record `source` and `accessedAt`; do not treat VocaDB free-text blurbs as schedule facts (2023 Osaka example in 2.3).
- After changes: `pnpm lint`, `pnpm test`, `pnpm typecheck`, `pnpm build`, and `pnpm report:setlist` (if needed) + `pnpm report:setlist --check`.
- Doc comments on new/changed `shared/` functions; testable data logic, not hidden in templates.