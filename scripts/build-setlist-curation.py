#!/usr/bin/env python3
"""Writes data/performance-setlists.json from facts checked against official and wiki sources.

Every entry carries the URL it came from, the day it was read, and a confidence level:
  high    official ticket pages (magicalmirai.com)
  medium  fan wikis (Moegirlpedia, VocaDB Fandom)

Run: uv run scripts/build-setlist-curation.py
"""
import json
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB = ROOT / "public" / "data" / "catalog.sqlite"

MM = "https://magicalmirai.com"
MOE_2018 = "https://zh.moegirl.org.cn/未来有你·初音未来2018中国巡回演唱会"
MOE_2019 = "https://zh.moegirl.org.cn/未来有你·初音未来2019中国巡回演唱会"
FANDOM_2014_ID = "https://vocaloid.fandom.com/wiki/HATSUNE_MIKU_EXPO_2014_in_INDONESIA"
FANDOM_2014_US = "https://vocaloid.fandom.com/wiki/HATSUNE_MIKU_EXPO_2014_in_LOS_ANGELES_and_NEW_YORK"
FANDOM_2015_SH = "https://vocaloid.fandom.com/wiki/HATSUNE_MIKU_EXPO_2015_in_SHANGHAI"
FANDOM_SNOW_2018 = "https://vocaloid.fandom.com/wiki/SNOW_MIKU_LIVE!_2018"
FANDOM_SNOW_2019 = "https://vocaloid.fandom.com/wiki/SNOW_MIKU_LIVE!_2019"
FANDOM_SNOW_2015 = "https://vocaloid.fandom.com/wiki/SNOW_MIKU_LIVE!_2015_Presents_MIKU_EXPO_Live_Set"
FANDOM_KODO_2018 = "https://vocaloid.fandom.com/wiki/Hatsune_Miku_%C3%97_Kodo_Taiko_Special_Live_2018"
FANDOM_KODO_2023 = "https://vocaloid.fandom.com/wiki/Hatsune_Miku_%C3%97_Kodo_Taiko_Special_Live_2023"
FANDOM_MIKUPA_2011_SP = "https://vocaloid.fandom.com/wiki/Hatsune_Miku_Live_Party_2011_(Mikupa)/Sapporo"
FANDOM_MIKUPA_2013_SP = "https://vocaloid.fandom.com/wiki/Hatsune_Miku_Live_Party_2013_(MikuPa)/Sapporo"
ACCESSED = "2026-11-05"


def official(path: str, title: str) -> dict:
    """One official Magical Mirai source entry."""
    return {"url": f"{MM}/{path}", "title": title, "accessedAt": ACCESSED, "confidence": "high"}


def wiki(url: str, title: str, note: str) -> dict:
    """One fan-wiki source entry."""
    return {"url": url, "title": title, "accessedAt": ACCESSED, "confidence": "medium", "note": note}


def official_page(url: str, title: str, note: str) -> dict:
    """One official source that is not a magicalmirai.com ticket path, e.g. a web archive copy."""
    return {"url": url, "title": title, "accessedAt": ACCESSED, "confidence": "high", "note": note}


def source_note(list_id: int, position: int) -> str:
    """Reads the VocaDB note of one source line, so a correction starts from the real text."""
    db = sqlite3.connect(DB)
    try:
        row = db.execute(
            "SELECT notes FROM setlist_items WHERE song_list_id = ? AND position = ?", (list_id, position)
        ).fetchone()
    finally:
        db.close()
    return (row[0] if row else "") or ""


def fix_note(list_id: int, position: int, *, replace=(), append: str | None = None) -> str:
    """Builds a corrected note by replacing or appending to the stored text.

    Raises when a replacement changes nothing, so a stale correction cannot pass silently.
    """
    text = source_note(list_id, position)
    for old, new in replace:
        if old not in text:
            raise SystemExit(f"note {list_id}:{position} has no `{old}` to replace")
        text = text.replace(old, new)
    if append:
        text = f"{text}{append}"
    return text


performances: dict[str, dict] = {}


def add(pid: int, *, day_night=(), no_show=(), single_show=(), halves=None, conflict=False, sources, note: str) -> None:
    """Registers one curated 演出 entry."""
    entry: dict = {"note": note}
    if day_night:
        entry["dayNight"] = list(day_night)
    if no_show:
        entry["noShowDates"] = list(no_show)
    if single_show:
        entry["singleShowDates"] = list(single_show)
    if halves:
        entry["halves"] = halves
    if conflict:
        entry["conflict"] = True
    entry["sources"] = sources
    performances[str(pid)] = entry


# ---------------------------------------------------------------- Magical Mirai
# Official ticket pages list the live shows per day; a day absent from that list is
# exhibition-only and must not be counted as a 場次.
add(
    2514,
    day_night=["2015-09-05"],
    no_show=["2015-09-06"],
    halves={"2015-09-04": ["night"]},
    sources=[official("2015/ticket.html", "マジカルミライ 2015 チケット")],
    note="官方票务页：9/4 只有夜公演；9/5 昼 + 夜；9/6 只有科学技術館企划展，没有 live，合计 3 场",
)
add(
    1398,
    day_night=["2016-09-10", "2016-09-11"],
    no_show=["2016-09-09"],
    sources=[official("2016/ticket.html", "マジカルミライ 2016 チケット")],
    note="官方票务页：live 只有 9/10、9/11 每天昼 + 夜；9/9 只有企划展",
)
add(
    1397,
    day_night=["2017-09-02", "2017-09-03"],
    sources=[official("2017/ticket.html", "マジカルミライ 2017 チケット")],
    note="官方票务页：9/1 只有夜公演；9/2、9/3 昼 + 夜，合计 5 场（另有 9/1 单独夜场计入）",
)
add(
    1561,
    day_night=["2018-08-25", "2018-08-26"],
    sources=[official("2018/osaka_ticket.html", "マジカルミライ 2018 OSAKA チケット")],
    note="官方票务页：8/25、8/26 各有昼公演 + 夜公演，共 4 场",
)
add(
    1745,
    day_night=["2018-09-01", "2018-09-02"],
    no_show=["2018-08-31"],
    sources=[official("2018/tokyo_ticket.html", "マジカルミライ 2018 TOKYO チケット")],
    note="官方票务页：只有 9/1、9/2 有昼 + 夜公演；8/31 未列入 live，按企划展日处理",
)
add(
    2515,
    day_night=["2019-08-10", "2019-08-11"],
    no_show=["2019-08-09"],
    sources=[official("2019/osaka_ticket.html", "マジカルミライ 2019 OSAKA チケット")],
    note="官方票务页：8/10、8/11 昼+夜共 4 场；8/9 只有企划展，没有 live",
)
add(
    2516,
    day_night=["2019-08-31", "2019-09-01"],
    halves={"2019-08-30": ["night"]},
    sources=[official("2019/tokyo_ticket.html", "マジカルミライ 2019 TOKYO チケット")],
    note="官方票务页：8/30 只有夜公演；8/31、9/1 昼+夜，合计 5 场",
)
add(
    2758,
    day_night=["2020-11-28", "2020-11-29"],
    no_show=["2020-11-27"],
    sources=[official("2020/osaka/ticket.html", "マジカルミライ 2020 OSAKA チケット")],
    note="官方票务页：11/28、11/29 为 3 部制（11:00 / 15:00 / 19:00）；11/27 只有企划展。本目录只有日场/夜场两层，按 1 部+2 部=日场、3 部=夜场折算",
)
add(
    2759,
    day_night=["2020-12-19", "2020-12-20"],
    halves={"2020-12-18": ["night"]},
    sources=[official("2020/tokyo/ticket.html", "マジカルミライ 2020 TOKYO チケット")],
    note="官方票务页：12/18 只有 3 部（19:00）；12/19、12/20 为 3 部制，按 1 部+2 部=日场、3 部=夜场折算",
)
add(
    3305,
    day_night=["2021-10-23", "2021-10-24"],
    halves={"2021-10-22": ["night"]},
    sources=[official("2021/osaka_ticket.html", "マジカルミライ 2021 OSAKA チケット")],
    note="官方票务页：10/22 只有夜公演；10/23、10/24 昼+夜，合计 5 场",
)
add(
    3306,
    day_night=["2021-11-05", "2021-11-06", "2021-11-07"],
    sources=[official("2021/tokyo_ticket.html", "マジカルミライ 2021 TOKYO チケット")],
    note="官方票务页：11/5–11/7 每天昼 + 夜，共 6 场",
)
add(
    4233,
    day_night=["2022-08-13", "2022-08-14"],
    halves={"2022-08-12": ["night"]},
    sources=[official("10th/osaka_ticket.html", "マジカルミライ 10th Anniversary OSAKA チケット")],
    note="官方票务页：8/12 只有夜公演；8/13、8/14 昼+夜，合计 5 场",
)
add(
    4234,
    day_night=["2022-09-02", "2022-09-03", "2022-09-04"],
    sources=[official("10th/tokyo_ticket.html", "マジカルミライ 10th Anniversary TOKYO チケット")],
    note="官方票务页：9/2–9/4 每天昼 + 夜，共 6 场",
)
add(
    4235,
    day_night=["2023-02-04", "2023-02-05"],
    sources=[official("10th/sapporo_ticket.html", "マジカルミライ 10th Anniversary SAPPORO チケット")],
    note="官方票务页：2/4、2/5 昼 + 夜，共 4 场",
)
add(
    6045,
    day_night=["2023-08-11", "2023-08-12", "2023-08-13"],
    sources=[official("2023/osaka_ticket.html", "マジカルミライ 2023 OSAKA チケット")],
    note="官方票务页：8/11–8/13 每天昼 + 夜，共 6 场",
)
add(
    6046,
    day_night=["2023-09-01", "2023-09-02", "2023-09-03"],
    sources=[official("2023/tokyo_ticket.html", "マジカルミライ 2023 TOKYO チケット")],
    note="官方票务页：9/1–9/3 每天昼 + 夜，共 6 场",
)
add(
    7214,
    day_night=["2024-08-17", "2024-08-18"],
    sources=[official("2024/fukuoka_ticket.html", "マジカルミライ 2024 FUKUOKA チケット")],
    note="官方票务页：8/17、8/18 昼 + 夜，共 4 场",
)
add(
    7215,
    day_night=["2024-08-30", "2024-08-31", "2024-09-01"],
    sources=[official("2024/tokyo_ticket.html", "マジカルミライ 2024 TOKYO チケット")],
    note="官方票务页：8/30–9/1 每天昼 + 夜，共 6 场",
)
add(
    7217,
    day_night=["2024-10-12", "2024-10-13", "2024-10-14"],
    sources=[official("2024/osaka_ticket.html", "マジカルミライ 2024 OSAKA チケット")],
    note="官方票务页：10/12–10/14 每天昼 + 夜，共 6 场",
)
add(
    8768,
    day_night=["2025-08-02", "2025-08-03"],
    halves={"2025-08-01": ["night"]},
    sources=[official("2025/sendai_ticket.html", "マジカルミライ 2025 SENDAI チケット")],
    note="官方票务页：8/1 只有夜公演；8/2、8/3 昼+夜，合计 5 场",
)
add(
    8769,
    day_night=["2025-08-09", "2025-08-10", "2025-08-11"],
    sources=[official("2025/osaka_ticket.html", "マジカルミライ 2025 OSAKA チケット")],
    note="官方票务页：8/9–8/11 每天昼 + 夜，共 6 场",
)
add(
    8770,
    day_night=["2025-08-29", "2025-08-30", "2025-08-31"],
    sources=[official("2025/tokyo_ticket.html", "マジカルミライ 2025 TOKYO チケット")],
    note="官方票务页：8/29–8/31 每天昼 + 夜，共 6 场",
)
add(
    12249,
    day_night=["2026-07-24", "2026-07-25", "2026-07-26"],
    sources=[official("2026/hamamatsu_ticket.html", "マジカルミライ 2026 HAMAMATSU チケット")],
    note="官方票务页：7/24–7/26 每天昼 + 夜，共 6 场",
)
add(
    12250,
    day_night=["2026-08-14", "2026-08-15", "2026-08-16"],
    sources=[official("2026/osaka_ticket.html", "マジカルミライ 2026 OSAKA チケット")],
    note="官方票务页：8/14–8/16 每天昼 + 夜，共 6 场",
)
add(
    12251,
    day_night=["2026-08-28", "2026-08-29", "2026-08-30"],
    sources=[official("2026/tokyo_ticket.html", "マジカルミライ 2026 TOKYO チケット")],
    note="官方票务页：8/28–8/30 每天昼 + 夜，共 6 场",
)

# ---------------------------------------------------------------- MIKU WITH YOU
add(
    2085,
    day_night=["2018-10-13"],
    sources=[wiki(MOE_2018, "萌娘百科：未来有你·初音未来2018中国巡回演唱会", "北京站 10/13 昼场 + 夜场；原定 10/14 两场被取消")],
    note="萌娘百科：北京站 10/13 昼 + 夜共 2 场；10/14 原定的两场被主办方取消",
)
add(
    2086,
    day_night=["2018-10-20"],
    sources=[wiki(MOE_2018, "萌娘百科：未来有你·初音未来2018中国巡回演唱会", "成都站 10/20 昼场 + 夜场；原定 10/21 两场被取消")],
    note="萌娘百科：成都站 10/20 昼 + 夜共 2 场；10/21 原定的两场被取消",
)
add(
    2087,
    day_night=["2018-10-27", "2018-10-28"],
    sources=[wiki(MOE_2018, "萌娘百科：未来有你·初音未来2018中国巡回演唱会", "上海站 10/27、10/28 各昼场 + 夜场")],
    note="萌娘百科：上海站 10/27、10/28 各昼 + 夜，共 4 场",
)
add(
    3752,
    day_night=["2019-11-02", "2019-11-03"],
    sources=[wiki(MOE_2019, "萌娘百科：未来有你·初音未来2019中国巡回演唱会", "上海站 11/2、11/3 各 14:00 昼场 + 19:00 夜场；歌单 A 版由上海、北京使用")],
    note="萌娘百科：上海站 11/2、11/3 各昼 + 夜，共 4 场；A 版歌单",
)
add(
    3753,
    sources=[wiki(MOE_2019, "萌娘百科：未来有你·初音未来2019中国巡回演唱会", "成都站 11/9 仅 19:00 夜场；歌单 B 版由成都、广州使用")],
    note="萌娘百科：成都站 11/9 仅夜场 1 场；B 版歌单",
)
add(
    3754,
    day_night=["2019-11-16"],
    sources=[wiki(MOE_2019, "萌娘百科：未来有你·初音未来2019中国巡回演唱会", "北京站 11/16 14:00 昼场 + 19:00 夜场；A 版歌单")],
    note="萌娘百科：北京站 11/16 昼 + 夜共 2 场；A 版歌单",
)
add(
    3755,
    day_night=["2019-11-23"],
    sources=[wiki(MOE_2019, "萌娘百科：未来有你·初音未来2019中国巡回演唱会", "广州站 11/23 昼+夜、11/24 仅夜场，共 3 场；B 版歌单")],
    note="萌娘百科：广州站 11/23 昼+夜、11/24 仅夜，共 3 场（与 docs/data-issues.md §2.3 记为 2 场不一致，按萌娘展开）",
)

# ---------------------------------------------------------------- MIKU EXPO
add(
    1939,
    day_night=["2014-05-29"],
    halves={"2014-05-28": ["night"]},
    sources=[wiki(FANDOM_2014_ID, "VocaDB Fandom: HATSUNE MIKU EXPO 2014 in INDONESIA", "5/28 1st Show 19:30；5/29 2nd Show 13:00、3rd Show 19:30")],
    note="Fandom：5/28 只有 1 场（19:30），5/29 有 2 场（13:00、19:30），共 3 场；歌单 27 行",
)
add(
    1937,
    single_show=["2014-10-11", "2014-10-12"],
    sources=[
        wiki(
            FANDOM_2014_US,
            "VocaDB Fandom: HATSUNE MIKU EXPO 2014 in LOS ANGELES and NEW YORK",
            "LA：10/11 19:00、10/12 12:30，各一场",
        )
    ],
    note="Fandom：洛杉矶 10/11（19:00）与 10/12（12:30）各一场，每天一场",
)
add(
    1938,
    single_show=["2014-10-17", "2014-10-18"],
    sources=[
        wiki(
            FANDOM_2014_US,
            "VocaDB Fandom: HATSUNE MIKU EXPO 2014 in LOS ANGELES and NEW YORK",
            "NY：10/17 20:30、10/18 18:30，各一场",
        )
    ],
    note="Fandom：纽约 10/17（20:30）与 10/18（18:30）各一场，每天一场",
)
add(
    1940,
    day_night=["2015-06-27", "2015-06-28"],
    sources=[
        official_page(
            "https://web.archive.org/web/20190722050158/http://www.scla.com.cn/hatsunemiku/",
            "SCLA 官方页（2019-07-22 存档）：初音未来2015上海演唱会",
            "官网海报写 6.27–6.28，与 VocaDB 一致；Fandom 的 6/26–6/27 是错的",
        ),
        wiki(
            "https://zh.moegirl.org.cn/HATSUNE_MIKU_EXPO_2015_in_Shanghai",
            "萌娘百科：HATSUNE MIKU EXPO 2015 in Shanghai",
            "6/27、6/28 各昼场 13:00 + 夜场 19:00，两天四场",
        ),
    ],
    note="官方海报 6/27–6/28；萌娘百科：两天共四场（每天昼 + 夜）。Fandom 的 6/26–6/27 不采用",
)

# ---------------------------------------------------------------- SNOW MIKU / 鼓童 / Live Party
# These pages only give a date range, so the source settles the date span but not a split.
add(
    1618,
    day_night=["2018-02-09", "2018-02-10"],
    sources=[
        wiki(
            FANDOM_SNOW_2018,
            "VocaDB Fandom: SNOW MIKU LIVE! 2018",
            "2/9–2/10；票种分「18 歳以下＝昼场」「2 階グループ席＝夜场」，说明每天有昼、夜两场",
        )
    ],
    note="Fandom：票种区分昼场（18 岁以下票）与夜场（2 楼团体席），按每天昼 + 夜各一场处理，共 4 场",
)
add(
    2422,
    sources=[wiki(FANDOM_SNOW_2019, "VocaDB Fandom: SNOW MIKU LIVE! 2019", "仅给出 2/9–2/10，未写逐日时刻")],
    note="Fandom 只有日期区间 2/9–2/10，没有逐日时刻；按每天一场处理",
)
add(
    3792,
    sources=[wiki(FANDOM_SNOW_2015, "VocaDB Fandom: SNOW MIKU LIVE! 2015 Presents MIKU EXPO Live Set", "仅给出 2/7–2/8，未写逐日时刻")],
    note="Fandom 只有日期区间 2/7–2/8，没有逐日时刻；按每天一场处理",
)
add(
    2948,
    day_night=["2018-06-02"],
    halves={"2018-06-03": ["day"]},
    sources=[
        wiki(
            FANDOM_KODO_2018,
            "VocaDB Fandom: Hatsune Miku × Kodo Taiko Special Live 2018",
            "转载官方公演情报：6/2 開場 12:00 / 開演 13:00 与 開場 18:00 / 開演 19:00 两场；6/3 只有 開演 13:00 一场",
        )
    ],
    note="官方公演情报：6/2 昼 + 夜两场，6/3 只有昼场，共 3 场",
)
add(
    5910,
    sources=[wiki(FANDOM_KODO_2023, "VocaDB Fandom: Hatsune Miku × Kodo Taiko Special Live 2023", "仅给出 6/3–6/4，未写逐日时刻")],
    note="Fandom 只有日期区间 6/3–6/4，没有逐日时刻；按每天一场处理",
)
add(
    2510,
    day_night=["2013-02-09", "2013-02-10"],
    sources=[
        wiki(
            FANDOM_MIKUPA_2013_SP,
            "VocaDB Fandom: Hatsune Miku Live Party 2013 (MikuPa)/Sapporo",
            "2/9 13:00 与 18:00；2/10 12:00 与 17:00",
        )
    ],
    note="Fandom：2/9（13:00、18:00）与 2/10（12:00、17:00）各有两场，共 4 场",
)
add(
    2526,
    single_show=["2011-08-16", "2011-08-17"],
    sources=[
        official_page(
            "https://web.archive.org/web/20120512094239/http://5pb.jp/mikupa/index_sapporo.html",
            "5pb. 官方页（2012-05-12 存档）：ミクパ♪ 札幌",
            "日期 8/16–8/17，两天各一场，与 VocaDB 一致",
        )
    ],
    note="官方页：8/16、8/17 各一场，共 2 场。Fandom 只写 8/17，不采用",
)

lists: dict[str, dict] = {}

# ---------------------------------------------------------------- 逐曲备注更正（以百科为准）
# Magical Mirai 2021 (9909): スノーマン was day-1 only; VocaDB also tagged Osaka day 3,
# which gave 大阪 Day 3 26 songs instead of the 25 the wiki lists for all three days.
lists["9909"] = {
    "source": "https://vocaloid.fandom.com/wiki/Hatsune_Miku_Magical_Mirai_2021",
    "accessedAt": ACCESSED,
    "confidence": "medium",
    "note": "萌娘百科 / VocaDB Fandom 的逐日歌单：大阪与东京 Day 1–3 各 25 首",
    "notes": {"15": fix_note(9909, 15, replace=[("Day 1 OSAKA / Day 3 OSAKA / Day 1 TOKYO", "Day 1 OSAKA / Day 1 TOKYO")])},
}

# Magical Mirai 2024 (17933): 大阪 Day 1 与 Day 3 是同一套节目，VocaDB 只写了 Day 1。
lists["17933"] = {
    "source": "https://vocaloid.fandom.com/wiki/Hatsune_Miku_Magical_Mirai_2024",
    "accessedAt": ACCESSED,
    "confidence": "medium",
    "note": "Fandom：大阪分「Day 1 & 3」与「Day 2」两套；VocaDB 少了 Day 3",
    "notes": {
        str(position): fix_note(17933, position, append=" / Osaka Day 3")
        for position in (4, 6, 21, 23, 25, 27)
    },
}

# MIKU EXPO 2024 North America (16544): San Jose Day 1 played the third setlist, not Day 2.
lists["16544"] = {
    "source": "https://vocaloid.fandom.com/wiki/HATSUNE_MIKU_EXPO_2024_North_America",
    "accessedAt": ACCESSED,
    "confidence": "medium",
    "note": "Fandom 的三套歌单把第三套归给 San Jose Day 1；VocaDB 写成 Day 2",
    "notes": {
        str(position): fix_note(16544, position, replace=[("San Jose (Day 2)", "San Jose (Day 1)")])
        for position in (13, 17, 20)
    },
}

# Live Party 2012 Hong Kong & Taiwan (31): the wiki says 23 songs + 1 encore in Hong Kong and
# 23 + 2 in Taiwan, so the 24 vs 25 difference is by design, not a parsing error.
lists["31"] = {
    "source": "https://vocaloid.fandom.com/wiki/Hatsune_Miku_Live_Party_2012_(Mikupa)/Hong_Kong_and_Taiwan",
    "accessedAt": ACCESSED,
    "confidence": "medium",
    "note": "Fandom：23 首固定 + 香港 1 首安可、台湾 2 首安可",
    "explainedLengths": {
        "2524:2012-10-02": "香港 23 首 + 1 首安可 = 24 首（台湾多一首安可）",
    },
}

# 每个城市只演一套节目的歌单：百科给出城市级歌单，说明「只写城市」的备注是准确的，
# 那句「该城市有多场」的提示可以撤掉。
CITY_WIDE = {
    7852: ("Hatsune Miku Magical Mirai 2018", "大阪与东京各一套 27 首歌单，各城市所有场次相同"),
    7986: ("MIKU WITH YOU 2018", "北京 / 成都 / 上海各一套歌单，同城各场相同"),
    9359: ("MIKU WITH YOU 2019", "A 版（上海、北京）与 B 版（成都、广州），同城各场相同"),
    17933: ("Hatsune Miku Magical Mirai 2024", "福冈 / 东京 / 大阪各自的场次共用一套；大阪 Day 1 & 3 相同"),
    20912: ("Hatsune Miku Magical Mirai 2025", "仙台 / 大阪 / 东京各自的场次共用一套"),
    27886: ("Hatsune Miku Magical Mirai 2026", "滨松 / 大阪 / 东京各自的场次共用一套"),
}
for list_id, (page, note) in CITY_WIDE.items():
    entry = lists.setdefault(str(list_id), {})
    entry["source"] = f"https://vocaloid.fandom.com/wiki/{page.replace(' ', '_')}"
    entry.setdefault("accessedAt", ACCESSED)
    entry.setdefault("confidence", "medium")
    entry["note"] = f"{entry.get('note', '')}{'；' if entry.get('note') else ''}{note}"
    entry["citiesPlayOneSetlist"] = True

curation = {"version": 1, "performances": performances, "lists": lists}
target = ROOT / "data" / "performance-setlists.json"
target.write_text(json.dumps(curation, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Wrote {target} with {len(performances)} performances")
