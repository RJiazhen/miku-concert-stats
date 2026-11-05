#!/usr/bin/env python3
"""Renders docs/setlist-confirmation.md from the built catalog and the curation file.

Sections:
  0 现状
  1 数据来源记录（已采用，无需确认）
  2 百科与官网都没写逐日时刻的演出（可保留现状）
  3 本轮按百科修正的冲突（供核对）
  4 备注只写到城市的场次（已由百科settle）
  5 整份歌单没有备注（整份沿用）
  6 上游没有歌单的演出

Run: uv run scripts/confirmation-report.py
"""
import json
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB = ROOT / "public" / "data" / "catalog.sqlite"
CURATION = ROOT / "data" / "performance-setlists.json"
TARGET = ROOT / "docs" / "setlist-confirmation.md"

SERIES = {81: "魔法未来", 82: "MIKU EXPO", 173: "未来有你", 204: "SNOW MIKU", 219: "Live Party", 255: "鼓童", 256: "交响乐"}

db = sqlite3.connect(DB)
db.row_factory = sqlite3.Row
curation = json.loads(CURATION.read_text(encoding="utf-8"))


def rows(sql: str, params: tuple = ()) -> list[sqlite3.Row]:
    """Runs one read-only query."""
    return list(db.execute(sql, params))


# 用户在确认清单里已裁决的两条日期冲突，各自记下「百科怎么说、最终按什么」。
# 第 2 节逐条记下查过哪个百科页面；没有独立条目的写明「没有条目」。
CHECKED_PAGES = {
    1399: ("HATSUNE MIKU EXPO 2016 Japan Tour", "only range"),
    1403: ("HATSUNE MIKU EXPO 2016 Japan Tour", "only range"),
    1924: ("HATSUNE MIKU EXPO 2016 NORTH AMERICA", "only range"),
    1941: ("HATSUNE MIKU EXPO 2016 NORTH AMERICA", "only range"),
    1943: ("HATSUNE MIKU EXPO 2016 China", "missing"),
    1942: ("HATSUNE MIKU EXPO 2016 China", "missing"),
    6518: ("HATSUNE MIKU EXPO 2024 North America", "only range"),
    6519: ("HATSUNE MIKU EXPO 2024 North America", "only range"),
    6520: ("HATSUNE MIKU EXPO 2024 North America", "only range"),
    6521: ("HATSUNE MIKU EXPO 2024 North America", "only range"),
    9353: ("HATSUNE MIKU EXPO 2025 ASIA", "only range"),
    9811: ("HATSUNE MIKU EXPO 2026 North America", "only range"),
    9815: ("HATSUNE MIKU EXPO 2026 North America", "only range"),
    9816: ("HATSUNE MIKU EXPO 2026 North America", "only range"),
    9823: ("HATSUNE MIKU EXPO 2026 North America", "only range"),
    7673: ("MIKU WITH YOU 2024", "only range"),
    7674: ("MIKU WITH YOU 2024", "only range"),
    7675: ("MIKU WITH YOU 2024", "only range"),
    9644: ("MIKU WITH YOU 2025", "only range"),
    3792: ("SNOW MIKU LIVE! 2015 Presents MIKU EXPO Live Set", "only range"),
    2422: ("SNOW MIKU LIVE! 2019", "only range"),
    2947: ("Hatsune Miku × Kodo Taiko Performing Arts Ensemble", "only range"),
    5910: ("Hatsune Miku × Kodo Taiko Special Live 2023", "only range"),
}

RESOLVED_DATE_CONFLICTS = [
    (
        "MIKU EXPO 2015 in Shanghai（演出 1940）",
        "Fandom 记 6/26–6/27，VocaDB 记 6/27–6/28",
        "官网海报（SCLA，2019-07-22 存档）与萌娘百科都写 6/27–6/28，两天各有昼场 13:00 + 夜场 19:00，共四场。"
        "Fandom 的 6/26–6/27 不采用，最终按 6/27–6/28 展开 4 场。",
        [
            "https://web.archive.org/web/20190722050158/http://www.scla.com.cn/hatsunemiku/",
            "https://zh.moegirl.org.cn/HATSUNE_MIKU_EXPO_2015_in_Shanghai",
        ],
    ),
    (
        "初音ミクライブパーティー 2011 Sapporo（演出 2526）",
        "Fandom 只写 8/17，VocaDB 记 8/16–8/17",
        "5pb. 官方页（2012-05-12 存档）写 8/16–8/17，两天各一场；与 VocaDB 一致，Fandom 不采用。",
        ["https://web.archive.org/web/20120512094239/http://5pb.jp/mikupa/index_sapporo.html"],
    ),
]

out: list[str] = []
out.append("# 歌单数据核对清单")
out.append("")
out.append("> 生成本文件：`uv run scripts/confirmation-report.py`（读 `public/data/catalog.sqlite` 与 `data/performance-setlists.json`）。")
out.append("> 本轮已按你的要求先去查萌娘百科 / VocaDB Fandom / 官方存档页：能查到的直接采用，冲突的优先用百科，并在第 3 节列出。")
out.append("> 需要你回的只剩第 2 节（百科也没写逐日时刻的部分）与第 6 节（上游没有歌单）。")
out.append("")

# ---------------------------------------------------------------- 0. 现状
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

pending_schedule = rows(
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
    ORDER BY p.series_id, p.start_date
    """
)

out.append("## 0. 一句话现状")
out.append("")
out.append(f"- 目录里 {perf_total} 个演出已展开成 **{shows_total} 个场次**、{items_total} 条曲目。")
out.append(f"- 来源记录 {len(source_rows)} 个演出：官方页 {official} 条、百科 {wiki_count} 条，全部已直接采用。")
out.append(f"- 待核实归属 {pending_review} 个、冲突 {conflicts} 个、带不确定标记的场次 {uncertain_shows} 个。")
out.append(f"- 还剩 **{len(pending_schedule)} 个跨天演出**：百科与官网都只写日期区间，没有逐日时刻，见第 2 节。")
out.append("")
out.append("---")
out.append("")

# ---------------------------------------------------------------- 1. 数据来源记录
out.append("## 1. 数据来源记录（已采用，无需确认）")
out.append("")
out.append("凡是从官方票务页、萌娘百科或 VocaDB Fandom 查到场次的演出，数据已经直接采用；")
out.append("来源、访问日期与置信度都写进 catalog 的 `performance_setlist_sources`，也在 `/shows` 页脚显示。")
out.append("")
out.append("| 演出 | 系列 | 日期 | 场次 × 曲目 | 归属 | 置信度 | 来源 |")
out.append("| --- | --- | --- | --- | --- | --- | --- |")
for row in source_rows:
    series = SERIES.get(row["series_id"], str(row["series_id"]))
    title = (row["titles"] or "").replace("|", "\\|")
    out.append(
        f"| {row['name']}（{row['performance_id']}） | {series} | {row['start_date'] or '—'} | "
        f"{row['shows']} × {row['items']} | {row['resolution']} | {row['confidence']} | "
        f"[{title}]({row['url']})（{row['accessed']}） |"
    )
out.append("")
out.append(f"共 {len(source_rows)} 个演出、{official + wiki_count} 条来源记录。")
out.append("")
out.append("---")
out.append("")

# ---------------------------------------------------------------- 2. 无逐日时刻
out.append(f"## 2. 百科与官网都没写逐日时刻（{len(pending_schedule)} 个演出）")
out.append("")
out.append("这些演出跨多天，但我查过的来源都只给日期区间：既没写每天几场，也没写开演时间。")
out.append("当前按「每个日历天 = 一个场次」计算。**如果你知道其中哪一站有昼夜两场，告诉我站名即可**，我按同样格式补进去。")
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
        detail = f"已查：百科没有「{page}」这一条目（该年只有日本 / 北美页），也没有逐日时刻"
        link = ""
    else:
        detail = f"已查：VocaDB Fandom「{page}」，只写日期区间，没有逐日时刻"
        link = f"https://vocaloid.fandom.com/wiki/{page.replace(' ', '_')}"
    out.append(f"**2.{index} · {row['name']}**（演出 {row['id']}，{row['start_date']} – {row['end_date']}，当前 {row['shows']} 场 × {row['items']} 首）")
    out.append("")
    out.append(f"- {detail}")
    if link:
        out.append(f"  - {link}")
    out.append("")
    out.append("- [ ] 每天只有一场，保持现状即可")
    out.append("- [ ] 有昼夜两场（写在补充说明：站名 + 来源）")
    out.append("")
    out.append("> 补充：")
    out.append("")
out.append("---")
out.append("")

# ---------------------------------------------------------------- 3. 修正的冲突
out.append("## 3. 本轮按百科修正的冲突（请核对）")
out.append("")
out.append("你已裁决的两条日期冲突，加上我按百科改掉的 4 处备注问题，都列在这里。")
out.append("处理原则：**冲突时优先采用百科 / 官方页**，改的是我们自己的派生层，不动 VocaDB。")
out.append("")
entry = 0

for title, conflict, resolution, urls in RESOLVED_DATE_CONFLICTS:
    entry += 1
    out.append(f"### 3.{entry} · {title}（已按你的裁决处理）")
    out.append("")
    out.append(f"- 冲突：{conflict}")
    out.append(f"- 处理：{resolution}")
    for url in urls:
        out.append(f"- 来源：{url}")
    out.append("")

corrections = [
    (
        "初音ミク「マジカルミライ 2021」in OSAKA（演出 3305）",
        "VocaDB 把《スノーマン》标成「Day 1 / Day 3」，导致大阪 Day 3 变成 26 首",
        "VocaDB Fandom 的逐日歌单：大阪 Day 1–3 各 25 首，《スノーマン》只在 Day 1。已把该行改成只在 Day 1，Day 3 回到 25 首。",
        "https://vocaloid.fandom.com/wiki/Hatsune_Miku_Magical_Mirai_2021",
    ),
    (
        "初音ミク「マジカルミライ 2024」in OSAKA（演出 7217）",
        "VocaDB 只写「Osaka Day 1」，大阪 Day 3 因此只有 18 首",
        "Fandom 把大阪分成「Day 1 & 3」与「Day 2」两套歌单，Day 1 与 Day 3 相同。已给对应行补上 Osaka Day 3，六个场次都回到 24 首。",
        "https://vocaloid.fandom.com/wiki/Hatsune_Miku_Magical_Mirai_2024",
    ),
    (
        "MIKU EXPO 2024 San Jose（演出 6518）",
        "VocaDB 把第三套歌单归给 San Jose Day 2，导致 Day 2 累加成 26 首、Day 1 只剩 20 首",
        "Fandom 的三套歌单写明第三套是 San Jose Day 1。已把相关行从 Day 2 改到 Day 1，两天都回到 23 首。",
        "https://vocaloid.fandom.com/wiki/HATSUNE_MIKU_EXPO_2024_North_America",
    ),
    (
        "初音ミクライブパーティー 2012 Hong Kong（演出 2524）",
        "香港 24 首、台湾 25 首，被长度检查标成不一致",
        "Fandom：23 首固定 + 香港 1 首安可、台湾 2 首安可。24 / 25 是有意为之，已记为已解释，不再报警告。",
        "https://vocaloid.fandom.com/wiki/Hatsune_Miku_Live_Party_2012_(Mikupa)/Hong_Kong_and_Taiwan",
    ),
    (
        "初音ミク×鼓童スペシャルライブ２０１８（演出 2948）",
        "VocaDB 只有日期区间，按每天一场算成 2 场",
        "Fandom 转载的官方公演情报：6/2 有 13:00 与 19:00 两场，6/3 只有 13:00 一场。已改成 3 场。",
        "https://vocaloid.fandom.com/wiki/Hatsune_Miku_×_Kodo_Taiko_Special_Live_2018",
    ),
]
for title, conflict, resolution, url in corrections:
    entry += 1
    out.append(f"### 3.{entry} · {title}")
    out.append("")
    out.append(f"- 原问题：{conflict}")
    out.append(f"- 处理：{resolution}")
    out.append(f"- 来源：{url}")
    out.append("")

# 逐行备注更正与「同城一套节目」的清单，直接读 curation 文件
note_lists = {
    key: value
    for key, value in (curation.get("lists") or {}).items()
    if value.get("notes") or value.get("dropShows") or value.get("explainedLengths")
}
if note_lists:
    out.append("### 3.%d · 逐行备注更正汇总" % (entry + 1))
    out.append("")
    out.append("| 源歌单 | 更正的行 | 说明 | 来源 |")
    out.append("| --- | --- | --- | --- |")
    for key, value in note_lists.items():
        touched = sorted(set(value.get("notes") or {}) | set(value.get("dropShows") or {}), key=int)
        explanation = []
        if value.get("notes"):
            explanation.append(f"改写备注 {len(value['notes'])} 行")
        if value.get("dropShows"):
            explanation.append(f"移除越界的行 {len(value['dropShows'])} 行")
        if value.get("explainedLengths"):
            explanation.append(f"已解释长度差 {len(value['explainedLengths'])} 处")
        out.append(
            f"| [{key}](https://vocadb.net/L/{key}) | {', '.join(touched) or '—'} | {'；'.join(explanation)}"
            f"{'（' + value['note'] + '）' if value.get('note') else ''} | {value.get('source', '—')} |"
        )
    out.append("")
out.append("---")
out.append("")

# ---------------------------------------------------------------- 4. 城市级共用
settled = {
    key: value
    for key, value in (curation.get("lists") or {}).items()
    if value.get("citiesPlayOneSetlist")
}
out.append(f"## 4. 备注只写到城市的场次（{len(settled)} 份歌单，已由百科定案）")
out.append("")
out.append("这些歌单的备注只写城市（如 `Osaka`、`Shanghai, Beijing`）。百科给出的是城市级歌单，")
out.append("说明「只写城市」本来就等于「这座城市的所有场次都演」，所以已按城市套用到该城全部场次，不再标不确定。")
out.append("")
out.append("| 源歌单 | 定案依据 | 来源 |")
out.append("| --- | --- | --- |")
for key, value in settled.items():
    source = value.get("source", "")
    link = f"[来源]({source})" if source.startswith("http") else "—"
    out.append(f"| [{key}](https://vocadb.net/L/{key}) | {value.get('note', '')} | {link} |")
out.append("")
out.append("---")
out.append("")

# ---------------------------------------------------------------- 5. 整份无备注
out.append("## 5. 整份歌单没有任何备注（整份沿用）")
out.append("")
out.append("这些源歌单一行备注都没有，每个演出都拿整套曲目。抽样确认即可，不必逐条回。")
out.append("")
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
out.append("| 源歌单 | 名称 | 类型 | 演出数 | 场次数 | 行数 |")
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
out.append("- [ ] 这些歌单确实只有一套曲目，整份沿用正确")
out.append("- [ ] 其中有分站替换曲（写在补充说明：源歌单 id + 城市 + 曲目）")
out.append("")
out.append("**补充说明**")
out.append("")
out.append("> ")
out.append("")
out.append("---")
out.append("")

# ---------------------------------------------------------------- 6. 无歌单
missing = rows(
    """
    SELECT p.id, p.series_id, p.name, p.start_date, p.vocadb_status
    FROM performances p WHERE p.song_list_id IS NULL
    ORDER BY p.series_id, p.start_date
    """
)
out.append(f"## 6. 上游没有歌单的演出（{len(missing)} 个）")
out.append("")
out.append("多数是已取消或尚未举行。等实体发行或官方歌单出现再补。")
out.append("")
out.append("| 演出 | 系列 | 日期 | VocaDB 状态 |")
out.append("| --- | --- | --- | --- |")
for row in missing:
    series = SERIES.get(row["series_id"], str(row["series_id"]))
    out.append(
        f"| [{row['id']}](https://vocadb.net/E/{row['id']}) {row['name']} | {series} | "
        f"{row['start_date'] or '无'} | {row['vocadb_status']} |"
    )
out.append("")
out.append("- [ ] 都先留空，等实体发行或官方歌单")
out.append("- [ ] 其中有已举行的场次需要补录（写在补充说明）")
out.append("")
out.append("**补充说明**")
out.append("")
out.append("> ")
out.append("")

TARGET.write_text("\n".join(out), encoding="utf-8")
print(f"Wrote {TARGET} ({len(out)} lines)")
print(
    f"sources={len(source_rows)} pending_schedule={len(pending_schedule)} "
    f"settled_cities={len(settled)} inherited={len(inherited)} missing={len(missing)}"
)
