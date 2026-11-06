#!/usr/bin/env python3
"""Writes data/performance-setlists.json from facts checked against official and wiki sources.

Every entry carries the URL it came from, the day it was read, and a confidence level:
  high    official ticket pages (magicalmirai.com)
  medium  fan wikis (Moegirlpedia, VocaDB Fandom)

Run: uv run scripts/build-setlist-curation.py
"""
import datetime
import json
import re
import sqlite3
import unicodedata
from pathlib import Path
from urllib.parse import urlparse

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
MIKUE_PO = "https://mikuexpo.com/jp2016/live"
MIKUE_TW = "https://mikuexpo.com/tw2016/"
MOE_EXPO2016 = "https://zh.moegirl.org.cn/MIKU_EXPO_2016"
MOE_EXPO2024 = "https://zh.moegirl.org.cn/MIKU_EXPO_2024"
MOE_EXPO2025 = "https://zh.moegirl.org.cn/MIKU_EXPO_2025"
MOE_EXPO2026 = "https://zh.moegirl.org.cn/MIKU_EXPO_2026"
MOE_MWY2024 = "https://zh.moegirl.org.cn/初音未来·未来有你2024演唱会"
MOE_SNOW2018 = "https://zh.moegirl.org.cn/SNOW_MIKU_LIVE!_2018"
MOE_SNOW2019 = "https://zh.moegirl.org.cn/SNOW_MIKU_LIVE!_2019"
MOE_KODO = "https://zh.moegirl.org.cn/初音未来×鼓童特别演唱会"
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


# Host suffix -> display name. The trailing space on the wiki entry keeps the generated
# sentences unchanged (`歌单来自初音ミク Wiki 的逐曲表`).
SITE_LABELS = (
    ("w.atwiki.jp", "初音ミク Wiki "),
    ("moegirl.org.cn", "萌娘百科"),
    ("fandom.com", "VocaDB Fandom"),
    ("sanka-gets.hatenablog.com", "Sanka Blog "),
    ("project-voltage.jp", "VOLTAGE Live！官方"),
    ("vocaloid.blog120.fc2.com", "初音ミクみく "),
)


def source_site_label(url: str) -> str:
    """Names the site a setlist table came from, for the generated title and 演出 note.

    Returns the display name with the separator that sentence needs; unknown hosts fall back
    to the bare host so a table read from any page still cites where it came from.
    """
    host = urlparse(url).netloc.lower()
    for suffix, label in SITE_LABELS:
        if host == suffix or host.endswith(f".{suffix}"):
            return label
    return host or "外部来源"


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


def dates_of(pid: int) -> list[str]:
    """Expands the performance's date range into calendar days, capped at two weeks."""
    db = sqlite3.connect(DB)
    try:
        row = db.execute("SELECT start_date, end_date FROM performances WHERE id = ?", (pid,)).fetchone()
    finally:
        db.close()
    if not row or not row[0]:
        raise SystemExit(f"performance {pid} has no start date")
    start, end = row[0], row[1] or row[0]
    if end < start:
        end = start
    days: list[str] = []
    cursor = datetime.date.fromisoformat(start)
    last = datetime.date.fromisoformat(end)
    while cursor <= last and len(days) < 14:
        days.append(cursor.isoformat())
        cursor += datetime.timedelta(days=1)
    return days


def add(pid: int, *, day_night=(), no_show=(), single_show=(), halves=None, conflict=False, sources, note: str) -> None:
    """Registers one curated 演出 entry; `"all"` means every day of the run."""
    entry: dict = {"note": note}
    if day_night == "all":
        day_night = dates_of(pid)
    if single_show == "all":
        single_show = dates_of(pid)
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
    2519,
    day_night=["2013-08-30"],
    sources=[
        wiki(
            "https://w.atwiki.jp/hmiku/pages/67111.html",
            "初音ミク Wiki：初音ミク「マジカルミライ 2013」",
            "8/30 横浜アリーナ 昼・夜各 1 场，共 2 场；24 曲，夜公演限定 3 曲",
        )
    ],
    note="百科：8/30 单日昼夜 2 场，24 曲；Weekender Girl、FREELY TOMORROW、1/6 -out of the gravity- 为夜公演限定",
)
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

add(
    13120,
    day_night=["2026-10-31", "2026-11-01"],
    sources=[
        wiki(
            "https://w.atwiki.jp/hmiku/pages/79886.html",
            "初音ミク Wiki：未来有你・HATSUNE MIKU WITH YOU 2026",
            "逐曲表按 1日目昼 / 1日目夜 / 2日目昼 / 2日目夜 分四份，故两天各昼夜两场",
        )
    ],
    note="两天各昼场 + 夜场，共 4 场；逐曲表每天昼/夜各换一首",
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
    day_night="all",
    sources=[
        official_page(
            "https://snowmiku.com/2015/live_ticket.html",
            "SNOW MIKU LIVE! 2015 公式チケット页",
            "2/7、2/8 それぞれ昼夜公演の1日2回、全4公演",
        )
    ],
    note="官方页：2/7、2/8 每天昼场 + 夜场，共 4 场",
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
    day_night=["2023-06-03"],
    halves={"2023-06-04": ["day"]},
    sources=[
        official_page(
            "https://www.kodo.or.jp/performance/performance_kodo/42586",
            "鼓童 公式サイト：初音ミク×鼓童スペシャルライブ2023 ～結～",
            "開演 06.03 13:00 / 19:00、06.04 13:00",
        )
    ],
    note="官方页：6/3 有 13:00 与 19:00 两场，6/4 只有 13:00 一场，共 3 场",
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


# ---------------------------------------------------------------- MIKU EXPO 2016（官网 + 萌娘百科）
# 官方 jp2016/live 与萌娘百科的场次表一致：日本 5 城 12 场，中国内地 2 城 8 场，台湾 1 城 3 场，
# 北美 10 城 14 场。逐条按下表展开，不再用「一个日历天 = 一场」的默认值。
expo2016_jp = [
    official_page(MIKUE_PO, "HATSUNE MIKU EXPO 2016 Japan Tour LIVE（官方）", "福冈 3/23、3/24 均仅夜场 19:00"),
    wiki(MOE_EXPO2016, "萌娘百科：MIKU EXPO 2016", "日本 5 城 12 场，逐日入场 / 演出时间表"),
]
add(1399, halves={"2016-03-23": ["night"], "2016-03-24": ["night"]}, sources=expo2016_jp,
    note="官方与萌娘百科：福冈 3/23、3/24 均只有夜场（18:00 入场 / 19:00 开演），共 2 场")
add(1400, day_night=["2016-03-29"], sources=expo2016_jp,
    note="官方与萌娘百科：大阪 3/29 昼场 14:00 + 夜场 19:00，共 2 场")
add(1401, day_night=["2016-03-31"], sources=expo2016_jp,
    note="官方与萌娘百科：名古屋 3/31 昼场 14:00 + 夜场 19:00，共 2 场")
add(1402, day_night=["2016-04-05"], sources=expo2016_jp,
    note="官方与萌娘百科：札幌 4/5 昼场 14:00 + 夜场 19:00，共 2 场")
add(1403, day_night=["2016-04-09", "2016-04-10"], sources=expo2016_jp,
    note="官方与萌娘百科：东京 4/9、4/10 各有昼场 14:00 + 夜场 19:00，共 4 场")

expo2016_na = [
    wiki(MOE_EXPO2016, "萌娘百科：MIKU EXPO 2016", "北美 10 城 14 场，逐城入场 / 演出时间表"),
]
add(1930, day_night=["2016-04-30"], sources=expo2016_na,
    note="萌娘百科：旧金山 4/30 昼场 13:30 + 夜场 19:00 入场，共 2 场")
add(1936, day_night=["2016-05-28"], sources=expo2016_na,
    note="萌娘百科：纽约 5/28 昼场 13:30 + 夜场 20:00 开演，共 2 场")
add(1924, day_night=["2016-06-05"], single_show=["2016-06-04"], sources=expo2016_na,
    note="萌娘百科：墨西哥城 6/4 只有 14:30 一场；6/5 有 14:30 与 20:30 两场，共 3 场")
for pid, city in ((1859, "西雅图 4/23"), (1860, "蒙特雷 6/1"), (1931, "洛杉矶 5/6"), (1932, "达拉斯 5/14"),
                  (1933, "休斯敦 5/17"), (1934, "多伦多 5/20"), (1935, "芝加哥 5/25")):
    add(pid, single_show="all", sources=expo2016_na, note=f"萌娘百科：{city} 只有一场")

expo2016_cn = [
    wiki(MOE_EXPO2016, "萌娘百科：MIKU EXPO 2016", "中国内地共 8 场，每日昼场 13:00 / 夜场 18:00 开演"),
]
add(1942, day_night=["2016-12-10", "2016-12-11"], sources=expo2016_cn,
    note="萌娘百科：北京 12/10、12/11 每日昼场 13:00 + 夜场 18:00，共 4 场")
add(1943, day_night=["2016-12-03", "2016-12-04"], sources=expo2016_cn,
    note="萌娘百科：上海 12/3、12/4 每日昼场 13:00 + 夜场 18:00，共 4 场")
add(1941, day_night=["2016-06-26"], halves={"2016-06-25": ["night"]},
    sources=[
        official_page(MIKUE_TW, "HATSUNE MIKU EXPO 2016 IN TAIWAN（官方）", "6/25 19:00 一场；6/26 14:00 与 19:00 两场"),
        wiki(MOE_EXPO2016, "萌娘百科：MIKU EXPO 2016", "台湾 6/25–26 共三场"),
    ],
    note="官方与萌娘百科：新北 6/25 只有夜场 19:00；6/26 有 14:00 与 19:00 两场，共 3 场")

# ---------------------------------------------------------------- MIKU EXPO 2024 / 2025 / 2026（萌娘百科）
# 萌娘百科给出总场次：2024 北美 17 城 21 场、2025 亚洲 8 城 9 场、2026 北美 15 城 19 场，
# 且明确「所有场次的开演时间相同」，因此每个日期只有一场。
expo2024 = [wiki(MOE_EXPO2024, "萌娘百科：MIKU EXPO 2024", "17 城 21 场；圣何塞、凤凰城、丹佛、达拉斯各两场")]
for pid, dates in (
    (6518, ["2024-04-08", "2024-04-09"]),
    (6519, ["2024-04-14", "2024-04-15"]),
    (6520, ["2024-04-21", "2024-04-22"]),
    (6521, ["2024-04-24", "2024-04-25"]),
):
    add(pid, single_show=dates, sources=expo2024, note="萌娘百科：该站两天各演一场，共 2 场")
for pid in (6516, 6517, 6522, 6523, 6524, 6525, 6526, 6527, 6528, 6529, 6530, 6531, 7186):
    add(pid, single_show="all", sources=expo2024, note="萌娘百科：该站只有一场")

expo2025 = [wiki(MOE_EXPO2025, "萌娘百科：MIKU EXPO 2025", "8 城 9 场；只有首尔两场，其余各一场")]
add(9353, single_show=["2025-11-29", "2025-11-30"], sources=expo2025, note="萌娘百科：首尔两天各一场，共 2 场")

expo2026 = [wiki(MOE_EXPO2026, "萌娘百科：MIKU EXPO 2026", "北美 15 城 19 场；芝加哥、圣何塞、洛杉矶、波士顿各两场")]
for pid, dates in (
    (9811, ["2026-04-12", "2026-04-13"]),
    (9815, ["2026-04-22", "2026-04-23"]),
    (9816, ["2026-04-25", "2026-04-26"]),
    (9823, ["2026-05-10", "2026-05-11"]),
):
    add(pid, single_show=dates, sources=expo2026, note="萌娘百科：该站两天各演一场，共 2 场")

# ---------------------------------------------------------------- 未来有你 2024（萌娘百科）
# 萌娘百科：三地共 12 场 = 3 城 × 2 天 × 昼夜两场；每场 23 首。
mwy2024 = [wiki(MOE_MWY2024, "萌娘百科：初音未来·未来有你2024演唱会", "三地共 12 场，每场 23 首")]
for pid in (7673, 7674, 7675):
    add(pid, day_night="all", sources=mwy2024, note="萌娘百科：三地各 2 天、每天昼夜两场，合计 12 场")

# ---------------------------------------------------------------- SNOW MIKU / 鼓童（萌娘百科）
add(2422, day_night=["2019-02-09", "2019-02-10"],
    sources=[wiki(MOE_SNOW2019, "萌娘百科：SNOW MIKU LIVE! 2019", "2/9、2/10 各有昼场 13:00 入场与夜场")],
    note="萌娘百科：2/9、2/10 各有昼 + 夜两场，共 4 场")
add(2947, halves={"2017-03-04": ["night"], "2017-03-05": ["day"]},
    sources=[wiki(MOE_KODO, "萌娘百科：初音未来×鼓童特别演唱会", "3/4 开演 19:00；3/5 开演 13:00")],
    note="萌娘百科：3/4 只有夜场 19:00，3/5 只有昼场 13:00，共 2 场")

# ---------------------------------------------------------------- デコミク LIVE『Hello』（初音ミク Wiki）
# VocaDB event 9401 不属于任何收录的系列，由 data/increments/0015-decomiku-hello.sql 补进目录；
# 逐曲表在 data/wiki-raw/decomiku2026.json。百科写明单日昼夜 2 场、每场 27 首。
add(
    9401,
    day_night=["2026-02-14"],
    sources=[
        wiki(
            "https://w.atwiki.jp/hmiku/pages/72956.html",
            "初音ミク Wiki：デコミク LIVE starring 初音ミク『Hello』",
            "2/14 国立代々木競技場第一体育館 昼・夜各 1 场，共 2 场，每场 27 首",
        )
    ],
    note="百科：2026-02-14 单日昼夜 2 场，每场 27 首",
)

# ---------------------------------------------------------------- 系列外单场演出（官方页 / 百科逐曲表）
# VocaDB 的七个系列之外，还有一批单独举办、只在百科或官方报告里留下逐曲表的演出。
# 它们由 data/increments/0016-standalone-lives.sql 补进目录，曲目来自 data/wiki-raw/ 下的表。
add(
    3000000002,
    sources=[
        wiki(
            "https://w.atwiki.jp/hmiku/pages/67185.html",
            "初音ミク Wiki：ミクFES '09（夏）",
            "2009-08-31 新木場STUDIO COAST 单场，28 首",
        )
    ],
    note="2009-08-31 新木場STUDIO COAST 单场，28 首",
)
add(
    3000000003,
    sources=[
        wiki(
            "https://w.atwiki.jp/hmiku/pages/67186.html",
            "初音ミク Wiki：MIKU FES '24（春）",
            "2024-03-31 日本武道館 单场，23 首；另有 4 段 DJ 表演未计入",
        )
    ],
    note="2024-03-31 日本武道館 单场，23 首；4 段 DJ 表演不计入曲目",
)
add(
    3000000004,
    sources=[
        wiki(
            "https://w.atwiki.jp/vocalive/pages/167.html",
            "初音ミクライブ総合 Wiki：夏の終わりの39祭り",
            "2012-08-29 19:00 横滨赤レンガ倉庫水幕舞台，单场 4 首",
        )
    ],
    note="2012-08-29 19:00 横滨赤レンガ倉庫水幕舞台，单场 4 首",
)
add(
    3000000005,
    day_night="all",
    sources=[
        wiki(
            "https://blog.piapro.net/2013/06/livehatsune-appeanrace.html",
            "初音ミク公式ブログ：夏祭初音鑑 大阪公演 開催決定",
            "2013-08-03–07 グランフロント大阪 ナレッジシアター，5 天共 27 场",
        ),
        wiki(
            "https://sanka-gets.hatenablog.com/entry/ar308119",
            "Sanka Blog：夏祭初音鑑 大阪公演レポート",
            "大阪公演的 11 首节目；大阪是东京之前的先行公演，曲目与东京差异较大",
        ),
    ],
    note="大阪先行公演：2013-08-03–07 グランフロント大阪 ナレッジシアター，5 天共 27 场（每天场次不完全相同）。"
    "本目录只有日场/夜场两层，按每天昼夜两场折算成 10 个场次；真实场次以本条为准。"
    "大阪版更接近先行版本，曲目与东京正式公演差异较大；报道只留下这一套 11 首，可能含日替曲目，暂未找到完整可信资料。",
)
add(
    3000000010,
    day_night="all",
    sources=[
        wiki(
            "https://prtimes.jp/main/html/rd/p/000000106.000007006.html",
            "KADOKAWA：夏祭初音鑑 東京公演 開催告知",
            "2013-08-21–29 ベルサール秋葉原 B1F，9 天共 38 场",
        ),
        wiki(
            "https://dengekionline.com/elem/000/000/671/671042/",
            "電撃オンライン：夏祭初音鑑 東京公演 場次安排",
            "工作日 12:00 / 14:30 / 17:00 / 19:30 共 4 场，周末 10:30 / 13:00 / 15:30 / 18:00 / 20:30 共 5 场，每场约 90 分钟",
        ),
        wiki(
            "http://vocaloid.blog120.fc2.com/blog-entry-16607.html",
            "初音ミクみく：夏祭初音鑑 東京会場レポート",
            "报告列出东京会场的 20 首曲目（含プロローグ / アンコール / エンディング）",
        ),
    ],
    note="东京正式公演：2013-08-21–29 ベルサール秋葉原 B1F，9 天共 38 场（工作日 4 场、周末 5 场，每场约 90 分钟）。"
    "本目录只有日场/夜场两层，按每天昼夜两场折算成 18 个场次；真实场次以本条为准。"
    "报道留下的 20 首来自东京会场的演出报告，东京场次多、可能含日替曲目，暂未找到逐日完整的可信资料。",
)
add(
    3000000006,
    sources=[
        wiki(
            "https://w.atwiki.jp/hmiku/pages/67209.html",
            "初音ミク Wiki：初音ミク GALAXY LIVE 2020",
            "2020-09-26–27 在线演唱会，两天同一套 8 首",
        )
    ],
    note="2020-09-26–27 在线演唱会，两天同一套 8 首",
)
add(
    3000000007,
    sources=[
        wiki(
            "https://w.atwiki.jp/hmiku/pages/67211.html",
            "初音ミク Wiki：初音ミク GALAXY LIVE 2021",
            "2021-12-18–19 在线演唱会，两天同一套 12 首",
        )
    ],
    note="2021-12-18–19 在线演唱会，两天同一套 12 首",
)
add(
    3000000008,
    day_night=["2026-01-17"],
    halves={"2026-01-18": ["day"]},
    sources=[
        wiki(
            "https://w.atwiki.jp/hmiku/pages/68447.html",
            "初音ミク Wiki：初音ミク LAWSON 50th Anniversary Special LIVE",
            "2026-01-17 昼+夜、01-18 仅昼，共 3 场；每场 24 首，第 8 首按场次替换",
        )
    ],
    note="2026-01-17 横浜アリーナ 昼+夜、01-18 仅昼，共 3 场；每场 24 首，第 8 首按场次替换",
)
add(
    3000000009,
    day_night="all",
    sources=[
        wiki(
            "https://www.project-voltage.jp/live2026/afterreport.html",
            "VOLTAGE Live！ 官方 AFTER REPORT",
            "2026-03-20–22 LaLa arena TOKYO-BAY，每天昼 12:00 + 夜 18:00，共 6 场；官方歌单 27 首",
        )
    ],
    note="2026-03-20–22 LaLa arena TOKYO-BAY，每天昼 12:00 + 夜 18:00，共 6 场；每场 27 首",
)

# ---------------------------------------------------------------- 演出状态（取消 / 延期）
# VocaDB 只有 Finished / Approved / Draft，没有「已取消」，所以这 13 场在索引里只显示「日期未知」。
# 来源取该演出 performance_links 里的取消公告，原文写得很清楚。
def link_of(pid: int, want: str) -> str:
    """Returns the first web link of a 演出 whose description contains `want`, else its Website link."""
    db = sqlite3.connect(DB)
    try:
        rows = db.execute(
            "SELECT url, description FROM performance_links WHERE performance_id = ? ORDER BY url", (pid,)
        ).fetchall()
    finally:
        db.close()
    for url, description in rows:
        if description and want.lower() in description.lower():
            return url
    for url, description in rows:
        if description and description.strip().lower() == "website":
            return url
    return "https://mikuexpo.com/usaca2020/"


statuses: dict[str, dict] = {}
CANCELLED = {
    2853: "MIKU EXPO 2020 Vancouver",
    2854: "MIKU EXPO 2020 San Jose",
    2855: "MIKU EXPO 2020 Dallas",
    2856: "MIKU EXPO 2020 Atlanta",
    2857: "MIKU EXPO 2020 Washington D.C.",
    2858: "MIKU EXPO 2020 Asbury Park",
    2859: "MIKU EXPO 2020 Boston",
    2860: "MIKU EXPO 2020 Chicago",
    2861: "MIKU EXPO 2020 Toronto",
    2878: "MIKU EXPO 2020 Los Angeles",
    2879: "MIKU EXPO 2020 Orlando",
    2880: "MIKU EXPO 2020 Montreal",
    2886: "初音ミク×鼓童スペシャルライブ２０２０～結～",
}
for pid, name in CANCELLED.items():
    statuses[str(pid)] = {
        "status": "cancelled",
        "note": f"{name} 因 2020 年疫情取消，VocaDB 仍记为 Finished 且没有日期",
        "source": link_of(pid, "Cancellation"),
        "accessedAt": ACCESSED,
    }

# ---------------------------------------------------------------- 演出状态（尚未举行）
# 成都站是上海站收官（2026-11-01）当天公布的，VocaDB 的系列 173 里还没有这条 event，
# 所以它由 data/increments/0011-manual-performances.sql 补进目录。单场演出、暂无歌单。
UPCOMING = {
    3_000_000_001: {
        "note": "2026-12-26 19:00 成都金融城演艺中心，上海站收官时公布定档与开票；演出尚未举行，暂无歌单",
        "source": "https://zh.moegirl.org.cn/初音未来·未来有你2026演唱会",
    },
}
for pid, upcoming in UPCOMING.items():
    statuses[str(pid)] = {
        "status": "upcoming",
        "note": upcoming["note"],
        "source": upcoming["source"],
        "accessedAt": "2026-11-06",
    }

# ---------------------------------------------------------------- 百科歌单：初音ミクシンフォニー
# 交响乐在 VocaDB 没有任何 songList，之前只能用专辑 tracklist 补位；专辑是混编的，
# 与逐曲表对不上（东京与横滨/神戸本来就是两套节目）。这里改用「初音ミク Wiki」的逐曲表，
# 每场每城一份，行内保留メドレー 的段落说明。
WIKI_SETLISTS = json.loads((ROOT / "data" / "wiki-setlists.json").read_text(encoding="utf-8"))
WIKI_SONGS = json.loads((ROOT / "data" / "wiki-songs.json").read_text(encoding="utf-8"))["songs"]
WIKI_ALIASES = json.loads((ROOT / "data" / "wiki-title-aliases.json").read_text(encoding="utf-8"))["aliases"]
WIKI_REPERTOIRE = json.loads((ROOT / "data" / "wiki-repertoire.json").read_text(encoding="utf-8"))["songs"]
CATEGORY_LABELS = {
    "classical": "古典・管弦乐曲",
    "traditional": "民谣・传统曲",
    "instrumental": "器乐曲",
    "vocaloid": "VOCALOID 歌曲",
}


def song_ids_by_title() -> dict[str, list[int]]:
    """Indexes catalog songs plus the wiki-only songs by normalized title."""
    db = sqlite3.connect(DB)
    try:
        rows = db.execute("SELECT id, name, name_ja, name_en FROM songs").fetchall()
    finally:
        db.close()
    index: dict[str, list[int]] = {}
    for song_id, name, name_ja, name_en in rows:
        for candidate in (name, name_ja, name_en):
            key = normalize_title(candidate or "")
            if key:
                index.setdefault(key, []).append(song_id)
    for entry in WIKI_SONGS.values():
        key = normalize_title(entry["title"])
        if key:
            index.setdefault(key, []).append(entry["id"])
    # Repertoire rows are in the catalog after 0010, but index them anyway so the build does not
    # depend on the order of the two increments.
    for title, entry in WIKI_REPERTOIRE.items():
        key = normalize_title(title)
        if key and entry.get("id") is not None:
            index.setdefault(key, []).append(entry["id"])
    return index


def normalize_title(title: str) -> str:
    """Strips parentheses, spaces, and punctuation so titles from different sites compare equal."""
    title = unicodedata.normalize("NFKC", title)
    title = re.sub(r"[\(（].*?[\)）]", "", title)
    title = re.sub(r"[\s・,，、。．.~〜\-–—'\"\u2019]", "", title)
    return title.lower()


TITLE_INDEX = song_ids_by_title()


def resolve_song(title: str, prefer: set[int]) -> int | None:
    """Maps a wiki title to a catalog id, preferring an id the 演出 already used."""
    title = WIKI_ALIASES.get(title, title)
    hits = TITLE_INDEX.get(normalize_title(title), [])
    if not hits:
        return None
    for hit in hits:
        if hit in prefer:
            return hit
    return min(hits)


def translate_rows(rows: list[dict], prefer: set[int]) -> tuple[list[dict], list[str]]:
    """Maps wiki titles to catalog song ids, collecting the ones that do not resolve.

    A repertoire entry marked `skip` is a repeat of a song already on the same list, so it stays
    out of the rows and is reported instead of double counting.
    """
    songs: list[dict] = []
    unresolved: list[str] = []
    for song in rows:
        title = song["title"]
        repertoire = WIKI_REPERTOIRE.get(title)
        if repertoire is not None and repertoire.get("skip"):
            unresolved.append(title)
            continue
        # A hand-registered row keeps its reserved id even when its normalized title collides with
        # a VocaDB original (e.g. `恋は戦争(future retro remix by kz)` vs `恋は戦争`).
        if repertoire is not None and repertoire.get("id") is not None:
            song_id = repertoire["id"]
        else:
            song_id = resolve_song(title, prefer)
        if song_id is None:
            unresolved.append(title)
            continue
        entry = {"id": song_id, "title": title}
        if song.get("note"):
            entry["note"] = song["note"]
        songs.append(entry)
    return songs, unresolved


def non_vocaloid_titles(rows: list[dict]) -> list[str]:
    """Titles of the rows the catalog registered outside VocaDB, in first-seen order."""
    seen: list[str] = []
    for row in rows:
        entry = WIKI_REPERTOIRE.get(row["title"])
        if entry is None or entry.get("skip") or entry.get("category") == "vocaloid":
            continue
        if row["title"] not in seen:
            seen.append(row["title"])
    return seen


def quote_titles(titles: list[str]) -> str:
    """Joins titles with corner brackets so a title containing `、` stays readable."""
    return "、".join(f"「{title}」" for title in titles)


def performance_name(pid: int) -> str:
    """Reads the catalog name of one 演出, for the source title."""
    db = sqlite3.connect(DB)
    try:
        row = db.execute("SELECT name FROM performances WHERE id = ?", (pid,)).fetchone()
    finally:
        db.close()
    return row[0] if row else "演唱会"


SHOW_CACHE: dict[int, list[tuple[str, str, str | None]]] = {}


def show_rows(pid: int) -> list[tuple[str, str, str | None]]:
    """Reads the 場次 keys, dates, and halves of one 演出 from the built catalog."""
    if pid not in SHOW_CACHE:
        db = sqlite3.connect(DB)
        try:
            SHOW_CACHE[pid] = db.execute(
                "SELECT show_key, date, half FROM performance_show_setlists WHERE performance_id = ? ORDER BY show_key",
                (pid,),
            ).fetchall()
        finally:
            db.close()
    return SHOW_CACHE[pid]


def show_matches(pid: int, show_key: str, when: str) -> bool:
    """Whether a row restricted to `when` was played at this 場次.

    `when` is `day`, `night`, `dN` (the Nth distinct date), `dN:day|night`, or a date.
    """
    if when == "":
        return True
    rows = show_rows(pid)
    dates = sorted({date for _, date, _ in rows})
    row = next((entry for entry in rows if entry[0] == show_key), None)
    if row is None:
        return False
    _, date, half = row
    head, _, raw_half = when.partition(":")
    if head.startswith("d") and head[1:].isdigit():
        index = int(head[1:])
        if len(dates) < index or date != dates[index - 1]:
            return False
    elif re.fullmatch(r"\d{4}-\d{2}-\d{2}", head):
        if date != head:
            return False
    elif head in ("day", "night"):
        if half != head:
            return False
    elif head:
        raise SystemExit(f"unknown slot token {when!r} for {pid}")
    if raw_half and half != raw_half:
        return False
    return True


def preferred_songs(pid: int) -> set[int]:
    """Song ids the 演出 already used, so a shared title resolves to the same entry."""
    db = sqlite3.connect(DB)
    try:
        return {
            row[0]
            for row in db.execute(
                "SELECT song_id FROM performance_show_setlist_items WHERE performance_id = ? AND song_id IS NOT NULL",
                (pid,),
            ).fetchall()
        }
    finally:
        db.close()


for item in WIKI_SETLISTS["entries"]:
    pid = item["performanceId"]
    prefer = preferred_songs(pid)
    rows = item["rows"]
    scoped = [row for row in rows if row["when"]]
    songs, unresolved = translate_rows([row for row in rows if not row["when"]], prefer)
    slots = []
    if scoped:
        for show_key, _, _ in show_rows(pid):
            played = [row for row in rows if show_matches(pid, show_key, row["when"])]
            slot_songs, slot_unresolved = translate_rows(played, prefer)
            for title in slot_unresolved:
                if title not in unresolved:
                    unresolved.append(title)
            if slot_songs:
                slots.append({"match": show_key, "songs": slot_songs})
        if not slots:
            print(f"  warn: {pid} has constrained rows but no 場次 to place them")
    # The default list is the union, used only if a 場次 somehow matches no slot.
    if scoped:
        songs, union_unresolved = translate_rows(rows, prefer)
        for title in union_unresolved:
            if title not in unresolved:
                unresolved.append(title)
    skipped = unresolved
    unattributed = item.get("unattributed") or []
    outside = non_vocaloid_titles(rows)
    label = item["label"] or "本场"
    site = source_site_label(item["source"])
    if len(slots) > 1:
        note = f"歌单来自{site}的逐曲表（{label}），按场次分 {len(slots)} 份"
    elif slots:
        note = f"歌单来自{site}的逐曲表（{label}），{len(songs)} 行，另有 1 场单独一份"
    else:
        note = f"歌单来自{site}的逐曲表（{label}），{len(songs)} 行"
    if outside:
        categories = sorted({WIKI_REPERTOIRE[title]["category"] for title in outside})
        kinds = "、".join(CATEGORY_LABELS[category] for category in categories)
        note += f"；其中 {len(outside)} 首不是 VOCALOID 歌曲（{kinds}），按普通曲目登记、没有对应歌手"
    if unattributed:
        note += f"；百科对这 {len(unattributed)} 首只标了 ※、没写属于哪些城市，无法归位：" + quote_titles(unattributed)
    if skipped:
        note += f"；另有 {len(skipped)} 首未登记（同曲再演或检索未命中），未计入：" + quote_titles(skipped)
    title = f"{site.strip()}：{performance_name(pid)}（{label}）"
    source_entry = {
        "url": item["source"],
        "title": title,
        "accessedAt": item["accessedAt"],
        "confidence": "medium",
        "note": f"逐曲表，含メドレー 拆分；{len(songs)} 行",
    }
    existing = performances.setdefault(str(pid), {})
    existing["setlist"] = {
        "source": item["source"],
        "title": title,
        "accessedAt": item["accessedAt"],
        "confidence": "medium",
        "label": label,
        "songs": songs,
    }
    if slots:
        existing["setlist"]["slots"] = slots
    existing["sources"] = [source_entry]
    existing["note"] = note

# 逐曲表循环会用表格说明覆盖 note；只看日程的百科证据在这里补回，避免昼夜结构无处留档。
SCHEDULE_NOTES = {
    9401: "2026-02-14 国立代々木競技場第一体育館 昼・夜 2 场，每场 27 首；VocaDB 歌单 24530 只录了前 10 行，但同样把《ストリーミングハート》标成 Daytime、《キメラ》标成 Nighttime，昼夜结构一致",
    3000000002: "2009-08-31 新木場STUDIO COAST 单场，28 首，约 2 小时 30 分",
    3000000003: "2024-03-31 日本武道館 单场，23 首，另有 4 段 DJ 表演",
    3000000004: "2012-08-29 19:00 横滨赤レンガ倉庫水幕舞台，单场 4 首",
    3000000005: "2013-08-03–07 大阪先行公演，5 天共 27 场（每天场次不完全相同）；大阪版更接近先行版本，与东京正式公演曲目差异较大；"
    "本目录只有日场/夜场两层，27 场在站内折算为 10 个场次；报道只留下这一套 11 首，可能有日替曲目，暂未找到完整可信资料",
    3000000010: "2013-08-21–29 东京正式公演，工作日 4 场、周末 5 场，9 天共 38 场，每场约 90 分钟；"
    "本目录只有日场/夜场两层，38 场在站内折算为 18 个场次；20 首来自东京会场的演出报告，可能有日替曲目，暂未找到逐日完整资料",
    3000000006: "2020-09-26–27 在线演唱会，两天同一套 8 首",
    3000000007: "2021-12-18–19 在线演唱会，两天同一套 12 首",
    3000000008: "2026-01-17 昼+夜、01-18 仅昼，共 3 场；每场 24 首，第 8 首按场次替换",
    3000000009: "2026-03-20–22 每天昼 12:00 + 夜 18:00，共 6 场；每场 27 首",
}
for pid, schedule_note in SCHEDULE_NOTES.items():
    entry = performances.get(str(pid))
    if entry is not None:
        entry["note"] = f"{entry.get('note', '')}；日程来源：{schedule_note}"

# 逐曲表循环只保留表本身的来源；官方日程页另有信息，追加在演出来源里。
EXTRA_SOURCES = {
    "3000000002": [
        official_page(
            "https://blog.piapro.net/2009/09/fes09.html",
            "初音ミク公式ブログ：ミクFES '09（夏）アフターリポート",
            "2009-08-31 新木場STUDIO COAST",
        )
    ],
    "3000000003": [
        official_page("https://mikufes24spring.jp/", "MIKU FES '24（春）公式サイト", "2024-03-31 日本武道館")
    ],
    "3000000004": [
        wiki(
            "https://dengekionline.com/elem/000/000/528/528109/index-2.html",
            "電撃オンライン：夏の終わりの39祭り レポート",
            "2012-08-29 横滨赤レンガ倉庫，水幕舞台",
        )
    ],
    "3000000005": [
        official_page(
            "http://kc-i.jp/hatsuap/",
            "夏祭初音鑑 公式特設ページ",
            "2013-08-03–07 大阪・梅田 グランフロント大阪",
        ),
        official_page(
            "https://blog.piapro.net/2013/06/livehatsune-appeanrace.html",
            "初音ミク公式ブログ：夏祭初音鑑 大阪公演 開催決定",
            "2013-08-03–07，5 天共 27 场",
        ),
    ],
    "3000000010": [
        official_page(
            "http://kc-i.jp/hatsuap/",
            "夏祭初音鑑 公式特設ページ",
            "2013-08-21–29 ベルサール秋葉原",
        ),
        wiki(
            "https://prtimes.jp/main/html/rd/p/000000106.000007006.html",
            "KADOKAWA：夏祭初音鑑 東京公演 開催告知",
            "2013-08-21–29 ベルサール秋葉原 B1F，9 天共 38 场",
        ),
        wiki(
            "https://dengekionline.com/elem/000/000/671/671042/",
            "電撃オンライン：夏祭初音鑑 東京公演 スケジュール",
            "工作日 4 场、周末 5 场，每场约 90 分钟",
        ),
        wiki(
            "https://ascii.jp/elem/000/000/818/818660/",
            "ASCII.jp：夏祭初音鑑 東京公演",
            "9 天共 38 场",
        ),
    ],
    "3000000006": [official_page("https://galaxy-live.net/", "初音ミク GALAXY LIVE 公式サイト", "2020 在线演唱会")],
    "3000000007": [official_page("https://galaxy-live.net/", "初音ミク GALAXY LIVE 公式サイト", "2021 在线演唱会")],
    "3000000008": [
        official_page(
            "https://l-tike.com/lawson50thmiku/",
            "ローソン 50th Anniversary Special LIVE 特設サイト",
            "2026-01-17 昼+夜、01-18 仅昼",
        )
    ],
    "3000000009": [
        official_page(
            "https://www.project-voltage.jp/live2026/",
            "ポケモン feat. 初音ミク VOLTAGE Live！ 公式サイト",
            "2026-03-20–22 每天昼 12:00 + 夜 18:00，共 6 场",
        )
    ],
}
for pid, extra in EXTRA_SOURCES.items():
    entry = performances.get(pid)
    if entry is not None:
        for source in extra:
            source["accessedAt"] = "2026-11-06"
        entry["sources"] = extra + entry.get("sources", [])

# 神戸 2023 比横浜多一首「白い雪のプリンセスは」（ダブルアンコール，神戸限定），
# 所以两地的曲目数本来就不同；记下原因后不再报长度警告。
lists.setdefault("1000040398", {}).update({
    "source": "https://w.atwiki.jp/hmiku/pages/80537.html",
    "accessedAt": ACCESSED,
    "confidence": "medium",
    "note": "百科逐曲表：横浜 25 行；神戸多一首神戸限定的ダブルアンコール",
    "explainedLengths": {
        "4878:2023-10-14": "横浜 25 行（神戸比少一首神戸限定ダブルアンコール）",
        "4879:2023-12-23": "神戸限定ダブルアンコール「白い雪のプリンセスは」",
    },
})

# 演出页的读者提示：日程只写到「每天有日场/夜场」时，真实场次数只能放这里。
PAGE_NOTES = {
    "3000000005": "大阪是东京正式公演之前的先行公演，曲目与东京差异较大。5 天（8/3–8/7）共 27 场，"
    "本目录只区分日场 / 夜场，因此页面上是 10 个场次；另可能含日替曲目，暂未找到完整可信的逐场资料。",
    "3000000010": "东京是正式公演，9 天（8/21–8/29）共 38 场：工作日每天 4 场、周末每天 5 场，每场约 90 分钟。"
    "本目录只区分日场 / 夜场，因此页面上是 18 个场次；20 首来自演出报告，可能含日替曲目，暂未找到逐日完整资料。",
}
for pid, page_note in PAGE_NOTES.items():
    entry = performances.setdefault(pid, {})
    entry["pageNote"] = page_note

curation = {"version": 1, "performances": performances, "lists": lists, "statuses": statuses}
target = ROOT / "data" / "performance-setlists.json"
target.write_text(json.dumps(curation, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Wrote {target} with {len(performances)} performances")
