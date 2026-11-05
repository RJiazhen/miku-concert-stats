#!/usr/bin/env python3
"""Renders docs/setlist-confirmation.md from the built catalog.

The output is the hand-review sheet: what is already verified, what still needs a decision,
each item with its own checkbox lines and a fill-in area.

Run: uv run scripts/confirmation-report.py
"""
import json
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB = ROOT / "public" / "data" / "catalog.sqlite"
TARGET = ROOT / "docs" / "setlist-confirmation.md"

SERIES = {81: "魔法未来", 82: "MIKU EXPO", 173: "未来有你", 204: "SNOW MIKU", 219: "Live Party", 255: "鼓童", 256: "交响乐"}

db = sqlite3.connect(DB)
db.row_factory = sqlite3.Row


def rows(sql: str, params: tuple = ()) -> list[sqlite3.Row]:
    """Runs one read-only query."""
    return list(db.execute(sql, params))


def lines(*chunks: str) -> list[str]:
    """Flattens chunked output, dropping empty strings."""
    return [chunk for chunk in chunks if chunk]


out: list[str] = []
out.append("# 歌单数据待确认清单")
out.append("")
out.append("> 生成本文件：`uv run scripts/confirmation-report.py`（读 `public/data/catalog.sqlite`）。")
out.append("> 怎么回：勾选后把结论写进该条的「补充说明」，或者直接告诉我「2.3 每天只有一场」「3.1 应排除 X」这样的编号。")
out.append("> 勾选框各自独立一行；编号可以跨会话引用。")
out.append("> 详细逐条版本见 [docs/reports/setlist-review.md](reports/setlist-review.md)。")
out.append("")

# ---------------------------------------------------------------- 0. 已核实
verified = rows(
    """
    SELECT COUNT(*) AS n FROM performance_setlist_sources WHERE confidence = 'high'
    """
)[0]["n"]
verified_wiki = rows(
    """
    SELECT COUNT(*) AS n FROM performance_setlist_sources WHERE confidence = 'medium'
    """
)[0]["n"]
shows_total = rows("SELECT COUNT(*) AS n FROM performance_show_setlists")[0]["n"]
perf_total = rows("SELECT COUNT(*) AS n FROM performance_setlists")[0]["n"]
items_total = rows("SELECT COUNT(*) AS n FROM performance_show_setlist_items")[0]["n"]
pending_schedule = rows(
    """
    SELECT COUNT(*) AS n FROM performances p JOIN performance_setlists ps ON ps.performance_id = p.id
    WHERE p.start_date IS NOT NULL AND p.end_date IS NOT NULL AND p.end_date > p.start_date
      AND ps.day_night_dates IS NULL
    """
)[0]["n"]

out.append("## 0. 一句话现状")
out.append("")
out.append(f"- 目录里 {perf_total} 个演出已展开成 **{shows_total} 个场次**、{items_total} 条曲目。")
out.append(f"- 已用官方票务页核实 {verified} 条来源，用粉丝 wiki 核实 {verified_wiki} 条。")
out.append(f"- 还有 **{pending_schedule} 个跨天演出**没有日夜场证据，见第 2 节。")
out.append("")
out.append("**已核实、不需要你再确认的部分**：魔法未来 2015–2026 全部场次的逐日 / 日夜场；")
out.append("未来有你 2018、2019 四站；MIKU EXPO 2014 印尼。这 5 个企划展日已从场次里剔除：")
out.append("2015 东京 9/06、2016 东京 9/09、2018 东京 8/31、2019 大阪 8/09、2020 大阪 11/27。")
out.append("")
out.append("---")
out.append("")

# ---------------------------------------------------------------- 1. wiki 数据已采用
out.append("## 1. 已采用粉丝 wiki 的数据（8 条，请你过目）")
out.append("")
out.append("官方页没有对应信息，按约定直接采用了萌娘百科 / VocaDB Fandom，`pending_review = 1`。")
out.append("")
wiki_rows = rows(
    """
    SELECT ps.performance_id, p.name, ps.resolution, ps.note,
           (SELECT COUNT(*) FROM performance_show_setlists s WHERE s.performance_id = ps.performance_id) AS shows,
           (SELECT MAX(item_count) FROM performance_show_setlists s WHERE s.performance_id = ps.performance_id) AS items,
           (SELECT GROUP_CONCAT(title, ' | ') FROM performance_setlist_sources src
             WHERE src.performance_id = ps.performance_id) AS source_titles,
           (SELECT GROUP_CONCAT(url, '\n') FROM performance_setlist_sources src
             WHERE src.performance_id = ps.performance_id) AS source_urls,
           (SELECT MIN(confidence) FROM performance_setlist_sources src
             WHERE src.performance_id = ps.performance_id) AS confidence,
           (SELECT MIN(accessed_at) FROM performance_setlist_sources src
             WHERE src.performance_id = ps.performance_id) AS accessed
    FROM performance_setlists ps JOIN performances p ON p.id = ps.performance_id
    WHERE ps.pending_review = 1
    ORDER BY p.series_id, p.start_date
    """
)
for index, row in enumerate(wiki_rows, start=1):
    out.append(f"### 1.{index} · {row['name']}（演出 {row['performance_id']}）")
    out.append("")
    out.append(f"- 已采用：{row['shows']} 个场次 / 每场 {row['items']} 首")
    out.append(f"- 说明：{row['note']}")
    out.append(f"- 来源：{row['source_titles']}（{row['confidence']}，访问于 {row['accessed']}）")
    for url in (row["source_urls"] or "").split("\n"):
        if url:
            out.append(f"  - {url}")
    out.append("")
    out.append("- [ ] 认可，保留")
    out.append("- [ ] 部分需要修正（写在下方补充说明）")
    out.append("- [ ] 撤回，改回 VocaDB 只有日期的口径")
    out.append("")
    out.append("**补充说明**")
    out.append("")
    out.append("> ")
    out.append("> ")
    out.append("")
    out.append("---")
    out.append("")

# ---------------------------------------------------------------- 2. 跨天但无日夜场证据
out.append("## 2. 跨多天但还没有日夜场证据（{n} 个演出）".format(n=pending_schedule))
out.append("")
out.append("这些演出在官网 / wiki 上都没查到场次表，当前按「每个日历天 = 一个场次」计算。")
out.append("如果是「每天只有一场」，现状就是对的，勾第一项即可；如果查到昼夜两场，请把来源给我。")
out.append("")
pending = rows(
    """
    SELECT p.id, p.series_id, p.name, p.start_date, p.end_date, ps.status,
           (SELECT COUNT(*) FROM performance_show_setlists s WHERE s.performance_id = p.id) AS shows,
           (SELECT MAX(item_count) FROM performance_show_setlists s WHERE s.performance_id = p.id) AS items
    FROM performances p JOIN performance_setlists ps ON ps.performance_id = p.id
    WHERE p.start_date IS NOT NULL AND p.end_date IS NOT NULL AND p.end_date > p.start_date
      AND ps.day_night_dates IS NULL
    ORDER BY p.series_id, p.start_date
    """
)
current_series = None
for index, row in enumerate(pending, start=1):
    series = SERIES.get(row["series_id"], str(row["series_id"]))
    if series != current_series:
        current_series = series
        out.append(f"### {series}")
        out.append("")
    out.append(f"**2.{index} · {row['name']}**（演出 {row['id']}，{row['start_date']} – {row['end_date']}，当前 {row['shows']} 场 × {row['items']} 首）")
    out.append("")
    out.append("- [ ] 每天只有一场，当前正确")
    out.append("- [ ] 有昼夜两场，已补来源（写在补充说明）")
    out.append("- [ ] 有展览日要剔除（写在补充说明）")
    out.append("- [ ] 无法确认，保持现状")
    out.append("")
    out.append("> 补充：")
    out.append("")
out.append("---")
out.append("")

# ---------------------------------------------------------------- 3. 单场曲目数异常
out.append("## 3. 单场曲目数与同歌单不一致（需判断是多唱还是漏记）")
out.append("")
mismatch = rows(
    """
    SELECT s.performance_id, p.name, s.show_key, s.item_count, s.reasons, s.omitted_count
    FROM performance_show_setlists s JOIN performances p ON p.id = s.performance_id
    WHERE s.reasons LIKE '%length mismatch%'
    ORDER BY p.series_id, p.start_date, s.show_key
    """
)
for index, row in enumerate(mismatch, start=1):
    reasons = json.loads(row["reasons"])
    expected = next((r.split("expected ")[-1] for r in reasons if "expected" in r), "?")
    out.append(f"### 3.{index} · {row['name']} · {row['show_key']}")
    out.append("")
    out.append(f"- 本场 {row['item_count']} 首，同歌单其他场次多为 {expected} 首，省略 {row['omitted_count']} 行")
    out.append(f"- 原因：{'；'.join(reasons)}")
    out.append("")
    out.append("- [ ] 确认本场就是这个曲目数")
    out.append("- [ ] 应排除多余曲目（写在补充说明）")
    out.append("- [ ] 应补充缺失曲目（写在补充说明）")
    out.append("- [ ] 无法确认，保留警告")
    out.append("")
    out.append("**补充说明**")
    out.append("")
    out.append("> ")
    out.append("")
out.append("---")
out.append("")

# ---------------------------------------------------------------- 4. 备注只到城市
out.append("## 4. 备注只写到城市的场次（按演出汇总）")
out.append("")
out.append("这些演出的歌单备注只写城市（如 `Shanghai, Beijing`），没有写到具体日期或昼夜。")
out.append("派生层按「该城市的所有场次都演」处理，因此每一场都拿到了同一份曲目。")
out.append("需要你确认的方向：这种「城市级共用」是否就是这么读的，还是其实有分场差异。")
out.append("")
city_only = rows(
    """
    SELECT s.performance_id, p.name, p.series_id, p.start_date, COUNT(*) AS shows,
           MAX(s.item_count) AS items, GROUP_CONCAT(DISTINCT s.reasons) AS reasons
    FROM performance_show_setlists s JOIN performances p ON p.id = s.performance_id
    WHERE s.uncertain = 1 AND s.reasons LIKE '%city-only%' AND s.reasons NOT LIKE '%mismatch%'
    GROUP BY s.performance_id
    ORDER BY p.series_id, p.start_date
    """
)
current_series = None
for index, row in enumerate(city_only, start=1):
    series = SERIES.get(row["series_id"], str(row["series_id"]))
    if series != current_series:
        current_series = series
        out.append(f"### {series}")
        out.append("")
    out.append(f"**4.{index} · {row['name']}**（演出 {row['performance_id']}，{row['shows']} 个场次 × {row['items']} 首）")
    out.append("")
    out.append("- [ ] 就是城市级共用，各场同一份曲目")
    out.append("- [ ] 其实有分场差异（写在补充说明）")
    out.append("- [ ] 无法确认，保留警告")
    out.append("")
    out.append("> 补充：")
    out.append("")
out.append("---")
out.append("")

# ---------------------------------------------------------------- 5. 整份无备注
out.append("## 5. 整份歌单没有任何备注（整份沿用）")
out.append("")
out.append("这些源歌单一行备注都没有，所以每个演出都拿整套曲目。抽样确认即可，不必逐条回。")
out.append("")
inherited = rows(
    """
    SELECT ps.source_list_id, sl.name, sl.source, COUNT(DISTINCT ps.performance_id) AS performances,
           COUNT(s.show_key) AS shows, MAX(ps.source_row_count) AS list_rows,
           GROUP_CONCAT(DISTINCT p.series_id) AS series
    FROM performance_setlists ps
    JOIN performance_show_setlists s ON s.performance_id = ps.performance_id
    LEFT JOIN song_lists sl ON sl.id = ps.source_list_id
    JOIN performances p ON p.id = ps.performance_id
    WHERE ps.status = 'inherited'
    GROUP BY ps.source_list_id
    ORDER BY COUNT(DISTINCT ps.performance_id) DESC, ps.source_list_id
    """
)
out.append("| 源歌单 | 名称 | 类型 | 演出数 | 场次数 | 行数 |")
out.append("| --- | --- | --- | --- | --- | --- |")
for row in inherited:
    name = (row["name"] or "").replace("|", "\\|")
    if len(name) > 42:
        name = name[:40] + "…"
    out.append(
        f"| [{row['source_list_id']}](https://vocadb.net/L/{row['source_list_id']}) | {name} | {row['source']} | "
        f"{row['performances']} | {row['shows']} | {row['list_rows']} |"
    )
out.append("")
out.append("- [ ] 这些歌单确实只有一套曲目，整份沿用正确")
out.append("- [ ] 其中有分站替换曲（写在补充说明：源歌单 id + 城市 + 曲目）")
out.append("- [ ] 无法确认，保持现状")
out.append("")
out.append("**补充说明**")
out.append("")
out.append("> ")
out.append("> ")
out.append("")
out.append("---")
out.append("")

# ---------------------------------------------------------------- 6. 仍缺数据的演出
out.append("## 6. 上游没有歌单的演出（本轮不处理，仅列出）")
out.append("")
missing = rows(
    """
    SELECT p.id, p.series_id, p.name, p.start_date, p.vocadb_status
    FROM performances p WHERE p.song_list_id IS NULL
    ORDER BY p.series_id, p.start_date
    """
)
out.append(f"共 {len(missing)} 个，多数是已取消或尚未举行：")
out.append("")
out.append("| 演出 | 系列 | 日期 | VocaDB 状态 |")
out.append("| --- | --- | --- | --- |")
for row in missing:
    series = SERIES.get(row["series_id"], str(row["series_id"]))
    out.append(f"| [{row['id']}](https://vocadb.net/E/{row['id']}) {row['name']} | {series} | {row['start_date'] or '无'} | {row['vocadb_status']} |")
out.append("")
out.append("- [ ] 都先留空，等实体发行或官方歌单")
out.append("- [ ] 其中有已举行的场次需要补录（写在补充说明）")
out.append("")
out.append("**补充说明**")
out.append("")
out.append("> ")
out.append("")
out.append("---")
out.append("")

TARGET.write_text("\n".join(out), encoding="utf-8")
print(f"Wrote {TARGET} ({len(out)} lines)")
print(f"pending schedule={pending_schedule}, wiki={len(wiki_rows)}, mismatch={len(mismatch)}, city-only={len(city_only)}, inherited={len(inherited)}, missing={len(missing)}")
