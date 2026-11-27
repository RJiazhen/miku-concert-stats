#!/usr/bin/env python3
"""Renders docs/setlist-confirmation.md from the built catalog and the curation file.

Sections:
  0 Status snapshot
  1 Source records (adopted, no confirmation needed)
  2 Performances with date range only (no per-day times on wiki or official pages)
  3 Conflicts resolved from wiki this round (for verification)
  4 Shows whose notes stop at city level (settled via wiki)
  5 Full song lists with no row notes (inherited wholesale)
  6 Performances with no upstream setlist

Run: uv run .agents/skills/update-concert-data/scripts/confirmation-report.py
"""
import json
import sqlite3
from pathlib import Path

# Walk up to the directory that holds package.json: this script lives under
# .agents/skills/update-concert-data/scripts/ and still resolves repo-root paths.
ROOT = next(parent for parent in Path(__file__).resolve().parents if (parent / "package.json").exists())
DB = ROOT / "public" / "data" / "catalog.sqlite"
CURATION = ROOT / "data" / "performance-setlists.json"
TARGET = ROOT / "docs" / "setlist-confirmation.md"

SERIES = {
    81: "Magical Mirai",
    82: "MIKU EXPO",
    173: "MIKU WITH YOU",
    204: "SNOW MIKU",
    219: "Live Party",
    255: "Kodo",
    256: "Symphony",
}

db = sqlite3.connect(DB)
db.row_factory = sqlite3.Row
curation = json.loads(CURATION.read_text(encoding="utf-8"))


def rows(sql: str, params: tuple = ()) -> list[sqlite3.Row]:
    """Runs one read-only query."""
    return list(db.execute(sql, params))


# Two date conflicts already ruled in the confirmation checklist: what the wiki said vs what we adopted.
# Only these lack per-day times on both wiki and official pages; everything else is expanded from sources.
CHECKED_PAGES = {
    3792: ("SNOW MIKU LIVE! 2015 Presents MIKU EXPO Live Set", "only range"),
    5910: ("Hatsune Miku × Kodo Taiko Special Live 2023", "only range"),
}

RESOLVED_DATE_CONFLICTS = [
    (
        "MIKU EXPO 2015 in Shanghai (演出 1940)",
        "Fandom lists 6/26–6/27; VocaDB lists 6/27–6/28",
        "Official poster (SCLA, archived 2019-07-22) and Moegirl both say 6/27–6/28, with matinee 13:00 + evening 19:00 on each day (4 shows). "
        "Fandom’s 6/26–6/27 is not used; we expand to 4 shows on 6/27–6/28.",
        [
            "https://web.archive.org/web/20190722050158/http://www.scla.com.cn/hatsunemiku/",
            "https://zh.moegirl.org.cn/HATSUNE_MIKU_EXPO_2015_in_Shanghai",
        ],
    ),
    (
        "初音ミクライブパーティー 2011 Sapporo (演出 2526)",
        "Fandom only lists 8/17; VocaDB has 8/16–8/17",
        "5pb. official page (archived 2012-05-12) says 8/16–8/17, one show per day; matches VocaDB; Fandom not used.",
        ["https://web.archive.org/web/20120512094239/http://5pb.jp/mikupa/index_sapporo.html"],
    ),
]

out: list[str] = []
out.append("# Setlist data confirmation checklist")
out.append("")
out.append(
    "> Generate this file: `uv run .agents/skills/update-concert-data/scripts/confirmation-report.py` "
    "(reads `public/data/catalog.sqlite` and `data/performance-setlists.json`)."
)
out.append(
    "> This round checked Moegirl / VocaDB Fandom / official archives where possible: adopt when found; "
    "on conflict prefer wiki, listed in section 3."
)
out.append(
    "> Your input is only needed for section 2 (no per-day times on wiki) and section 6 (no upstream setlist)."
)
out.append("")

# ---------------------------------------------------------------- 0. Status
source_rows = rows(
    """
    SELECT ps.performance_id, p.name, p.series_id, p.start_date, ps.resolution, ps.note,
           (SELECT COUNT(*) FROM performance_show_setlists s WHERE s.performance_id = ps.performance_id) AS shows,
           (SELECT MAX(item_count) FROM performance_show_setlists s WHERE s.performance_id = ps.performance_id) AS items,
           (SELECT MIN(confidence) FROM performance_setlist_sources src
             WHERE src.performance_id = ps.performance_id) AS confidence,
           (SELECT MIN(accessed_at) FROM performance_setlist_sources src
             WHERE src.performance_id = ps.performance_id) AS accessed,
           (SELECT GROUP_CONCAT(title, '<br>') FROM performance_setlist_sources src
             WHERE src.performance_id = ps.performance_id) AS titles,
           (SELECT MIN(url) FROM performance_setlist_sources src
             WHERE src.performance_id = ps.performance_id) AS url
    FROM performance_setlists ps JOIN performances p ON p.id = ps.performance_id
    WHERE EXISTS (SELECT 1 FROM performance_setlist_sources src WHERE src.performance_id = ps.performance_id)
    ORDER BY p.series_id, p.start_date
    """
)
shows_total = rows("SELECT COUNT(*) AS n FROM performance_show_setlists")[0]["n"]
perf_total = rows("SELECT COUNT(*) AS n FROM performance_setlists")[0]["n"]
items_total = rows("SELECT COUNT(*) AS n FROM performance_show_setlist_items")[0]["n"]
uncertain_shows = rows("SELECT COUNT(*) AS n FROM performance_show_setlists WHERE uncertain = 1")[0]["n"]
pending_review = rows("SELECT COUNT(*) AS n FROM performance_setlists WHERE pending_review = 1")[0]["n"]
conflicts = rows("SELECT COUNT(*) AS n FROM performance_setlists WHERE conflict = 1")[0]["n"]
official = rows("SELECT COUNT(*) AS n FROM performance_setlist_sources WHERE confidence = 'high'")[0]["n"]
wiki_count = rows("SELECT COUNT(*) AS n FROM performance_setlist_sources WHERE confidence = 'medium'")[0]["n"]

# Any performance with dayNight / singleShowDates / halves / noShowDates in curation is settled and excluded from section 2.
SETTLED = {
    int(key)
    for key, value in (curation.get("performances") or {}).items()
    if any(value.get(field) for field in ("dayNight", "singleShowDates", "halves", "noShowDates"))
}
pending_schedule = [row for row in rows(
    """
    SELECT p.id, p.series_id, p.name, p.start_date, p.end_date,
           (SELECT COUNT(*) FROM performance_show_setlists s WHERE s.performance_id = p.id) AS shows,
           (SELECT MAX(item_count) FROM performance_show_setlists s WHERE s.performance_id = p.id) AS items,
           (SELECT GROUP_CONCAT(title, ' / ') FROM performance_setlist_sources src
             WHERE src.performance_id = p.id) AS source_titles,
           (SELECT MIN(url) FROM performance_setlist_sources src
             WHERE src.performance_id = p.id) AS source_url
    FROM performances p JOIN performance_setlists ps ON ps.performance_id = p.id
    WHERE p.start_date IS NOT NULL AND p.end_date IS NOT NULL AND p.end_date > p.start_date
      AND ps.day_night_dates IS NULL AND ps.single_show_dates IS NULL
      AND (SELECT COUNT(*) FROM performance_show_setlists s WHERE s.performance_id = p.id)
          = CAST(julianday(p.end_date) - julianday(p.start_date) AS INTEGER) + 1
    ORDER BY p.series_id, p.start_date
    """
) if row["id"] not in SETTLED]

out.append("## 0. Status at a glance")
out.append("")
out.append(
    f"- The catalog expands **{perf_total}** 演出 (performances) into **{shows_total}** 场次 (shows) "
    f"and **{items_total}** setlist rows."
)
out.append(
    f"- **{len(source_rows)}** performances have source records: **{official}** official pages, "
    f"**{wiki_count}** wiki entries—all adopted as-is."
)
out.append(
    f"- Pending attribution review: **{pending_review}**; conflicts: **{conflicts}**; "
    f"shows marked uncertain: **{uncertain_shows}**."
)
outside_total = rows("SELECT COUNT(*) AS n FROM songs WHERE category <> 'vocaloid'")[0]["n"]
if outside_total:
    out.append(
        f"- **{outside_total}** non-VOCALOID tracks (classical arrangements, Kodo instrumentals, folk) "
        "are registered as ordinary songs with wiki sources and no vocalist; performance pages tag them "
        "as non-VocaDB."
    )
out.append(
    f"- **{len(pending_schedule)}** multi-day 演出 still have only a date range on wiki and official pages "
    "(no per-day show times)—see section 2."
)
out.append("")
out.append("---")
out.append("")

# ---------------------------------------------------------------- 1. Source records
out.append("## 1. Source records (adopted, no confirmation needed)")
out.append("")
out.append(
    "Where we found show counts on official ticketing pages, Moegirl, or VocaDB Fandom, the data is "
    "already in the catalog; source, access date, and confidence live in `performance_setlist_sources` "
    "and appear in `/shows` footers."
)
out.append("")
out.append("| 演出 (performance) | Series | Date | Shows × tracks | Resolution | Confidence | Source |")
out.append("| --- | --- | --- | --- | --- | --- | --- |")
for row in source_rows:
    series = SERIES.get(row["series_id"], str(row["series_id"]))
    title = (row["titles"] or "").replace("|", "\\|")
    out.append(
        f"| {row['name']} ({row['performance_id']}) | {series} | {row['start_date'] or '—'} | "
        f"{row['shows']} × {row['items']} | {row['resolution']} | {row['confidence']} | "
        f"[{title}]({row['url']}) ({row['accessed']}) |"
    )
out.append("")
out.append(f"Total: {len(source_rows)} performances, {official + wiki_count} source rows.")
out.append("")
out.append("---")
out.append("")

# ---------------------------------------------------------------- 2. No per-day times
out.append(f"## 2. No per-day times on wiki or official pages ({len(pending_schedule)} performances)")
out.append("")
if pending_schedule:
    out.append(
        "These 演出 span multiple days, but sources checked only give a date range—no daily show count "
        "and no start times. We currently count **one 场次 per calendar day**. "
        "**If you know a stop has separate matinee and evening shows, tell us the stop name.**"
    )
else:
    out.append(
        "**Clear:** per-day show counts for all multi-day 演出 are verified from official or wiki sources "
        "and written into the catalog."
    )
out.append("")
current_series = None
for index, row in enumerate(pending_schedule, start=1):
    series = SERIES.get(row["series_id"], str(row["series_id"]))
    if series != current_series:
        current_series = series
        out.append(f"### {series}")
        out.append("")
    page, state = CHECKED_PAGES.get(row["id"], ("", "unknown"))
    if state == "missing":
        detail = (
            f"Checked: wiki has no entry for “{page}” (that year only has Japan / North America pages), "
            "and no per-day times"
        )
        link = ""
    elif state == "only range":
        detail = f"Checked: VocaDB Fandom “{page}” lists only a date range, no per-day times"
        link = f"https://vocaloid.fandom.com/wiki/{page.replace(' ', '_')}"
    elif row["source_titles"]:
        # Newer entries record their own sources; use them instead of an empty Fandom page.
        detail = (
            f"Checked: {row['source_titles']}—date range only or no daily show count, no per-day times"
        )
        link = row["source_url"] or ""
    else:
        detail = "Checked: existing sources give only a date range, no per-day times"
        link = ""
    out.append(
        f"**2.{index} · {row['name']}** (演出 {row['id']}, {row['start_date']} – {row['end_date']}, "
        f"currently {row['shows']} 场次 × {row['items']} tracks)"
    )
    out.append("")
    out.append(f"- {detail}")
    if link:
        out.append(f"  - {link}")
    out.append("")
    out.append("- [ ] One show per day—keep as-is")
    out.append("- [ ] Matinee + evening (note in comments: stop name + source)")
    out.append("")
    out.append("> Notes:")
    out.append("")
out.append("---")
out.append("")

# ---------------------------------------------------------------- 3. Resolved conflicts
out.append("## 3. Conflicts resolved from wiki this round (please verify)")
out.append("")
out.append(
    "Date conflicts you already ruled on, full show tables filled from official pages and Moegirl, "
    "and row-note fixes from wiki are listed here. **On conflict, prefer wiki / official pages**; "
    "we change our derived layer only, not VocaDB."
)
out.append("")
entry = 0

for title, conflict, resolution, urls in RESOLVED_DATE_CONFLICTS:
    entry += 1
    out.append(f"### 3.{entry} · {title} (processed per your ruling)")
    out.append("")
    out.append(f"- Conflict: {conflict}")
    out.append(f"- Resolution: {resolution}")
    for url in urls:
        out.append(f"- Source: {url}")
    out.append("")

corrections = [
    (
        "初音ミク「マジカルミライ 2021」in OSAKA (演出 3305)",
        "VocaDB tagged スノーマン as “Day 1 / Day 3”, making Osaka Day 3 count 26 tracks",
        "VocaDB Fandom per-day lists: Osaka Days 1–3 each have 25 tracks; スノーマン only on Day 1. "
        "Row limited to Day 1; Day 3 back to 25.",
        "https://vocaloid.fandom.com/wiki/Hatsune_Miku_Magical_Mirai_2021",
    ),
    (
        "初音ミク「マジカルミライ 2024」in OSAKA (演出 7217)",
        "VocaDB only had “Osaka Day 1”, so Osaka Day 3 had only 18 tracks",
        "Fandom splits Osaka into “Day 1 & 3” and “Day 2”; Days 1 and 3 share the same list. "
        "Added Osaka Day 3 on matching rows; all six shows back to 24 tracks.",
        "https://vocaloid.fandom.com/wiki/Hatsune_Miku_Magical_Mirai_2024",
    ),
    (
        "MIKU EXPO 2024 San Jose (演出 6518)",
        "VocaDB attributed the third setlist to San Jose Day 2, yielding 26 on Day 2 and 20 on Day 1",
        "Fandom’s three lists state the third is San Jose Day 1. Moved rows from Day 2 to Day 1; "
        "both days back to 23 tracks.",
        "https://vocaloid.fandom.com/wiki/HATSUNE_MIKU_EXPO_2024_North_America",
    ),
    (
        "初音ミクライブパーティー 2012 Hong Kong (演出 2524)",
        "Hong Kong 24 vs Taiwan 25 tracks flagged as inconsistent by length check",
        "Fandom: 23 fixed + 1 encore in HK, 2 encores in TW. 24/25 is intentional; marked explained, "
        "no longer warned.",
        "https://vocaloid.fandom.com/wiki/Hatsune_Miku_Live_Party_2012_(Mikupa)/Hong_Kong_and_Taiwan",
    ),
    (
        "MIKU EXPO 2016 Japan 5 cities (演出 1399 / 1400 / 1401 / 1402 / 1403)",
        "VocaDB had date ranges only; one show per day → 7 场次",
        "Official jp2016/live and Moegirl: Fukuoka 3/23–3/24 evening only; Osaka 3/29, Nagoya 3/31, "
        "Sapporo 4/5 matinee + evening; Tokyo 4/9–4/10 matinee + evening. Total 12 shows.",
        "https://mikuexpo.com/jp2016/live",
    ),
    (
        "MIKU EXPO 2016 North America (演出 1924 / 1930 / 1936 … 10 cities)",
        "VocaDB date ranges only; 10 cities → 11 场次 by calendar day",
        "Moegirl per-city table: San Francisco 4/30 and New York 5/28 matinee + evening; Mexico City "
        "6/4 one show, 6/5 two; other 7 cities one each. Total 14 shows.",
        "https://zh.moegirl.org.cn/MIKU_EXPO_2016",
    ),
    (
        "MIKU EXPO 2016 mainland China (演出 1942 / 1943) and Taiwan (演出 1941)",
        "Mainland: 4 场次 (one per day); Taiwan: 2 场次 (one per day)",
        "Moegirl: Shanghai and Beijing each matinee + evening daily (13:00 / 18:00), 8 shows; "
        "official tw2016: New Taipei 6/25 evening only, 6/26 matinee + evening, 3 shows.",
        "https://mikuexpo.com/tw2016/",
    ),
    (
        "MIKU EXPO 2024 / 2025 / 2026 and MIKU WITH YOU 2024",
        "VocaDB date ranges only; multi-day cities counted one 场次 per day",
        "Moegirl totals: 2024 NA 17 cities 21 shows, 2025 Asia 8 cities 9 shows, 2026 NA 15 cities 19 shows, "
        "same start time per date → one show per date; MIKU WITH YOU 2024 three cities 12 shows "
        "= 3 × 2 days × matinee + evening, 23 tracks each.",
        "https://zh.moegirl.org.cn/MIKU_EXPO_2024",
    ),
    (
        "SNOW MIKU LIVE! 2019 (演出 2422) and 初音ミク×鼓童 2017 (演出 2947)",
        "Counted as 2 shows (one per day)",
        "Moegirl: SNOW MIKU 2019 on 2/9 and 2/10 matinee + evening each (4 shows); Kodo 2017 on 3/4 "
        "evening 19:00 only, 3/5 matinee 13:00 only (2 shows, split day/night).",
        "https://zh.moegirl.org.cn/SNOW_MIKU_LIVE!_2019",
    ),
    (
        "初音ミク×鼓童スペシャルライブ２０１８ (演出 2948)",
        "VocaDB date range only; one per day → 2 场次",
        "Fandom repost of official notice: 6/2 at 13:00 and 19:00, 6/3 at 13:00 only. Updated to 3 shows.",
        "https://vocaloid.fandom.com/wiki/Hatsune_Miku_×_Kodo_Taiko_Special_Live_2018",
    ),
]
for title, conflict, resolution, url in corrections:
    entry += 1
    out.append(f"### 3.{entry} · {title}")
    out.append("")
    out.append(f"- Issue: {conflict}")
    out.append(f"- Resolution: {resolution}")
    out.append(f"- Source: {url}")
    out.append("")

# Row-note corrections and “one setlist per city” lists, read straight from curation
note_lists = {
    key: value
    for key, value in (curation.get("lists") or {}).items()
    if value.get("notes") or value.get("dropShows") or value.get("explainedLengths")
}
if note_lists:
    out.append("### 3.%d · Row-note corrections summary" % (entry + 1))
    out.append("")
    out.append("| Source list | Rows touched | Notes | Source |")
    out.append("| --- | --- | --- | --- |")
    for key, value in note_lists.items():
        touched = sorted(set(value.get("notes") or {}) | set(value.get("dropShows") or {}), key=int)
        explanation = []
        if value.get("notes"):
            explanation.append(f"rewrote notes on {len(value['notes'])} rows")
        if value.get("dropShows"):
            explanation.append(f"dropped {len(value['dropShows'])} out-of-scope rows")
        if value.get("explainedLengths"):
            explanation.append(f"explained {len(value['explainedLengths'])} length deltas")
        out.append(
            f"| [{key}](https://vocadb.net/L/{key}) | {', '.join(touched) or '—'} | {'; '.join(explanation)}"
            f"{' (' + value['note'] + ')' if value.get('note') else ''} | {value.get('source', '—')} |"
        )
    out.append("")
out.append("---")
out.append("")

# ---------------------------------------------------------------- 4. City-level notes
settled = {
    key: value
    for key, value in (curation.get("lists") or {}).items()
    if value.get("citiesPlayOneSetlist")
}
out.append(f"## 4. Notes that stop at city level ({len(settled)} lists, settled via wiki)")
out.append("")
out.append(
    "These source lists note cities only (e.g. `Osaka`, `Shanghai, Beijing`). Wiki gives city-level setlists, "
    "meaning “city only” implies **all 场次 in that city share one program**; applied per city, "
    "no longer marked uncertain."
)
out.append("")
out.append("| Source list | Basis | Source |")
out.append("| --- | --- | --- |")
for key, value in settled.items():
    source = value.get("source", "")
    link = f"[source]({source})" if source.startswith("http") else "—"
    out.append(f"| [{key}](https://vocadb.net/L/{key}) | {value.get('note', '')} | {link} |")
out.append("")
out.append("---")
out.append("")

# ---------------------------------------------------------------- 4b. Wiki track lists
wiki_lists = rows(
    """
    SELECT ps.performance_id, p.name, p.series_id, ps.note,
           (SELECT COUNT(*) FROM performance_show_setlist_items i WHERE i.performance_id = ps.performance_id) AS items,
           (SELECT COUNT(*) FROM performance_show_setlists s WHERE s.performance_id = ps.performance_id) AS shows,
           (SELECT GROUP_CONCAT(DISTINCT src.title) FROM performance_setlist_sources src
             WHERE src.performance_id = ps.performance_id) AS titles,
           (SELECT MIN(src.url) FROM performance_setlist_sources src
             WHERE src.performance_id = ps.performance_id) AS url
    FROM performance_setlists ps JOIN performances p ON p.id = ps.performance_id
    WHERE EXISTS (
      SELECT 1 FROM performance_show_setlist_items i
      WHERE i.performance_id = ps.performance_id AND i.evidence = 'wiki'
    )
    ORDER BY p.series_id, p.start_date
    """
)
out.append(f"## 4b. Performances with per-track wiki setlists ({len(wiki_lists)})")
out.append("")
out.append(
    "These 演出 use the 初音ミク Wiki per-performance track tables: VocaDB songLists are either "
    "shared across cities or missing (Symphony uses album tracklists). Wiki tables separate "
    "公演替 / day-night / 场次; each row has source and メドレー segment labels for line-by-line review."
)
out.append("")
out.append("| 演出 (performance) | Series | Shows × tracks | Note | Source |")
out.append("| --- | --- | --- | --- | --- |")
for row in wiki_lists:
    title = (row["titles"] or "").replace("|", "\\|")
    series = SERIES.get(row["series_id"], str(row["series_id"]))
    out.append(
        f"| {row['name']} ({row['performance_id']}) | {series} | {row['shows']} × {row['items']} | "
        f"{row['note'] or ''} | [{title}]({row['url']}) |"
    )
out.append("")
out.append("---")
out.append("")

# ---------------------------------------------------------------- 5. No row notes
inherited = rows(
    """
    SELECT ps.source_list_id, sl.name, sl.source, COUNT(DISTINCT ps.performance_id) AS performances,
           COUNT(s.show_key) AS shows, MAX(ps.source_row_count) AS list_rows
    FROM performance_setlists ps
    JOIN performance_show_setlists s ON s.performance_id = ps.performance_id
    LEFT JOIN song_lists sl ON sl.id = ps.source_list_id
    WHERE ps.status = 'inherited'
    GROUP BY ps.source_list_id
    ORDER BY COUNT(DISTINCT ps.performance_id) DESC, ps.source_list_id
    """
)
if inherited:
    out.append("## 5. Full lists with no row notes (inherited wholesale)")
    out.append("")
    out.append(
        "These source lists have no per-row notes; each 演出 takes the full track list. "
        "Spot-check is enough—no line-by-line reply needed."
    )
    out.append("")
    out.append("| Source list | Name | Type | Performances | 场次 | Rows |")
    out.append("| --- | --- | --- | --- | --- | --- |")
    for row in inherited:
        name = (row["name"] or "").replace("|", "\\|")
        if len(name) > 40:
            name = name[:38] + "…"
        out.append(
            f"| [{row['source_list_id']}](https://vocadb.net/L/{row['source_list_id']}) | {name} | {row['source']} | "
            f"{row['performances']} | {row['shows']} | {row['list_rows']} |"
        )
    out.append("")
    out.append("- [ ] Confirmed: these lists truly have one program; wholesale inherit is correct")
    out.append("")
    out.append("**Additional notes**")
    out.append("")
    out.append("> ")
    out.append("")
out.append("---")
out.append("")

# ---------------------------------------------------------------- 6. No setlist
missing = rows(
    """
    SELECT p.id, p.series_id, p.name, p.start_date, p.vocadb_status, p.source_url AS page_url,
           st.status AS status, st.note AS status_note, st.source_url AS status_source,
           st.accessed_at AS status_accessed
    FROM performances p
    LEFT JOIN performance_status st ON st.performance_id = p.id
    WHERE p.song_list_id IS NULL
      AND NOT EXISTS (SELECT 1 FROM performance_setlists ps WHERE ps.performance_id = p.id)
    ORDER BY p.series_id, p.start_date
    """
)
out.append(f"## 6. Performances still without a setlist ({len(missing)})")
out.append("")
out.append(
    "No upstream songList and no wiki per-track table yet. Cancelled 场次 are in `performance_status`; "
    "performance pages show “cancelled” with announcement links; upcoming stays empty."
)
out.append("")
out.append("| 演出 (performance) | Series | Date | Status | VocaDB | Source |")
out.append("| --- | --- | --- | --- | --- | --- |")
for row in missing:
    series = SERIES.get(row["series_id"], str(row["series_id"]))
    if row["status"] == "cancelled":
        state = "**Cancelled**"
    elif row["status"] == "postponed":
        state = "Postponed"
    elif row["status"] == "upcoming":
        state = "Upcoming"
    else:
        state = "Unlabeled"
    source = f"[announcement]({row['status_source']})" if row["status_source"] else "—"
    vocadb = row["vocadb_status"] or ("—" if "vocadb.net" not in (row["page_url"] or "") else "Not recorded")
    out.append(
        f"| [{row['id']}]({row['page_url']}) {row['name']} | {series} | "
        f"{row['start_date'] or 'none'} | {state} | {vocadb} | {source} |"
    )
out.append("")
out.append("- [ ] Leave empty for now until physical release or official setlist")
out.append("- [ ] Some held shows need manual ingest (note in comments)")
out.append("")
out.append("**Additional notes**")
out.append("")
out.append("> ")
out.append("")

TARGET.write_text("\n".join(out), encoding="utf-8")
print(f"Wrote {TARGET} ({len(out)} lines)")
print(
    f"sources={len(source_rows)} pending_schedule={len(pending_schedule)} "
    f"settled_cities={len(settled)} inherited={len(inherited)} missing={len(missing)}"
)