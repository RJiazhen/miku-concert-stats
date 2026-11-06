#!/usr/bin/env python3
"""Resolves the wiki setlist titles that the VocaDB catalog does not have yet.

The catalog's `songs` table only holds songs that appear on the VocaDB setlists we collected, so a
wiki setlist regularly cites songs VocaDB knows but our catalog never needed. This script looks
them up on the VocaDB API, accepts a hit only when a normalized name matches exactly, and writes:

  data/wiki-songs.json                     the resolved entries, human reviewable
  data/increments/0009-wiki-songs.sql      INSERT OR IGNORE rows so the catalog can reference them

Titles VocaDB cannot supply are not dropped: `data/wiki-repertoire.json` classifies the ones that
are real repertoire but not VOCALOID songs (classical pieces, Kodo instrumentals, folk tunes), and
this script writes them as ordinary `songs` rows with `category` set, a NULL artist, and the wiki
as `source_url`. That keeps a 場次 programme complete while marking the rows honestly.

  data/wiki-repertoire.json                hand-curated class per title, with its reserved id
  data/increments/0010-wiki-repertoire.sql the same rows as INSERT OR IGNORE

A title that neither VocaDB nor the repertoire file covers is printed as MISS and left to the
演出 note, so nothing is invented.

Run: uv run scripts/fetch-wiki-songs.py
"""
import json
import re
import sqlite3
import time
import unicodedata
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB = ROOT / "public" / "data" / "catalog.sqlite"
SETLISTS = ROOT / "data" / "wiki-setlists.json"
ALIASES = ROOT / "data" / "wiki-title-aliases.json"
REPERTOIRE = ROOT / "data" / "wiki-repertoire.json"
TARGET = ROOT / "data" / "wiki-songs.json"
INCREMENT = ROOT / "data" / "increments" / "0009-wiki-songs.sql"
REPERTOIRE_INCREMENT = ROOT / "data" / "increments" / "0010-wiki-repertoire.sql"
API = "https://vocadb.net/api"
UA = "miku-concert-stats/0.1 (+https://github.com/RJiazhen/miku-concert-stats)"
ACCESSED = "2026-11-06"
# Reserved id band for repertoire VocaDB does not list; mirrors LOCAL_SONG_ID_BASE in shared/repertoire.ts.
LOCAL_SONG_ID_BASE = 2_000_000_000
SETLIST_INDEX_URL = "https://w.atwiki.jp/hmiku/pages/61935.html"

# The composer the wiki lists for each ambiguous title. VocaDB search returns covers and
# same-titled songs by other producers, so the credit is what tells the intended entry apart.
COMPOSERS = {
    "闇色アリス": "samfree", "黄泉桜": "hinayukki", "Afterglow": "ジミーサムP",
    "ジターバグ": "栗山夕璃", "Leia - Remind": "ゆよゆっぺ", "Fondant Step": "Heavenz",
    "君色マリンスノウ": "カルロス袴田", "ハッピーチートデー": "れるりり",
    "クリスタルスノウ": "Aqu3ra", "愛言葉V": "DECO*27", "再教育": "Neru",
    "ノンブレス・オブリージュ": "ピノキオピー", "SHIAWASE FOR YOU!": "いよわ",
    "開演": "まらしぃ", "二人の白地図": "PolyphonicBranch", "ステラ": "骨盤P",
    "Loading Memories": "せきこみごはん", "エゴロック": "すりぃ", "ヘッジホッグ": "Noz.",
    "私の恋はヘルファイア": "SLAVE.V-V-R", "スノーマン": "halyosy", "プレイオン": "Mitchie M",
    "みかぼし": "3106", "夜舞うシルエット": "宮守文学", "愛して愛して愛して": "きくお",
    "おこちゃま戦争": "Giga", "どりーみんチュチュ": "emon", "レイニースノードロップ": "Re:nG",
    "きみとぼくのレゾナンス": "斜め上P", "げんてん": "大漠波新", "青炎": "せきこみごはん",
    "ヴィーナス": "ナナホシ管弦楽団", "君を捜す空": "ひとしずく", "光と影の楽園": "ひとしずく",
    "巡る世界のレクイエム": "ひとしずく", "メズマライザー": "サツキ", "オーバーライド": "吉田夜世",
    "ReAct": "黒うさ", "ACUTE": "黒うさ", "Dear": "19's Sound Factory", "番凩": "hinayukki",
    "紅一葉": "黒うさ", "千年の独奏歌": "yanagi", "ニジイロストーリーズ": "OSTER project",
    "トンデモワンダーズ": "sasakure.UK", "ワーワーワールド": "Giga", "依存香炉": "DECO*27",
    "帝国少女": "R Sound Design", "ビターチョコデコレーション": "syudou",
    "ねぇねぇねぇ。": "ピノキオピー", "おちゃめ機能": "コジマジP", "タイムリミット": "North-T",
    "ショウタイム・ルーラー": "カラスヤサボウ", "四角い地球を丸くする": "TOKOTOKO",
    "アイ": "DECO*27", "ぽかぽかの星": "はるまきごはん", "雪がとける前に": "doriko",
    "Nyan Cat": "daniwellP", "子猫のパヤパヤ": "ワンカップP", "脱げばいいってモンじゃない！": "デッドボールP",
    "ダンスロボットダンス": "ナユタン星人", "スーパートルコ行進曲": "ガルナ",
    "嗚呼、素晴らしきニャン生": "Nem", "Snow Song Show": "sasakure.UK",
    "Crazy ∞ nighT": "ひとしずく", "Twilight ∞ nighT": "ひとしずく", "EveR ∞ LastinG ∞ NighT": "ひとしずく",
    "ちがう!!!": "カルロス袴田", "吉原ラメント": "亜沙", "Ievan Polkka": "Otomania",
    # デコミク LIVE『Hello』(9401) 的 DECO*27 曲目：同名翻唱很多，必须用作曲者把原创挑出来。
    "Reunion": "DECO*27", "アンドロイドガール": "DECO*27", "キメラ": "DECO*27",
    "サラマンダー": "DECO*27", "ラビットホール (Reloaded)": "DECO*27", "おじゃま虫": "DECO*27",
    "チェリーポップ": "DECO*27", "妄想感傷代償連盟": "DECO*27",
    "弱虫モンブラン (Reloaded)": "DECO*27", "モザイクロール (Reloaded)": "DECO*27",
    "愛迷エレジー (Reloaded)": "DECO*27", "シンデレラ": "DECO*27", "アニマル": "DECO*27",
    "モニタリング": "DECO*27", "妄想税": "DECO*27", "マシュマロ": "DECO*27",
    "テレパシ": "DECO*27", "ハートアラモード": "DECO*27", "ハオ": "DECO*27",
    # ミクFES '09（夏）: the wiki credits the producer of each block; VocaDB has many同名 covers.
    "電気の恋人-I am Programmer's Song-": "MOSAIC.WAV", "HATUNEtive": "MOSAIC.WAV",
    "私は人間じゃないから。": "デッドボールP", "とある娼婦の恋": "デッドボールP",
    "牛乳飲め！": "デッドボールP", "木枯らしの朝": "デッドボールP", "筆おろし": "デッドボールP",
    "ファインダー(DSLR remix-re:edit)": "kz", "Far Away": "kz", "Heart Beat": "kz",
    "Crosslight": "kz", "またね": "ryo",
    # 初音ミク GALAXY LIVE 2020 / 2021
    "水色侵略": "ナユタン星人", "バイオレンストリガー": "八王子P", "マカロン": "ATOLS",
    "世界の真ん中を歩く": "夏代孝明", "カガリビト": "millstones", "未来最終戦争": "DIVELA",
    "ロンリーユニバース": "Aqu3ra",
    # MIKU FES '24（春） / LAWSON 50th / 夏祭初音鑑
    "THUNDERBOLT": "jon-YAKITORY", "プシ": "r-906", "アイドル戦士": "Mitchie M",
    "シアンブルー": "ポリスピカデリー", "インビテーション！": "加賀", "Mad Lovers": "八王子P",
    # ポケモン feat. 初音ミク VOLTAGE Live！
    "ミライどんなだろう": "Mitchie M", "エスパーエスパー": "ナユタン星人",
    "戦闘！初音ミク": "cosMo", "メロメロイド": "かいりきベア",
    "ゴー！ビッパ団": "ワンダフル☆オポチュニティ！", "ガッチュー！": "Giga",
    "俺ゴーストタイプ": "syudou", "ひゅ〜どろどろ": "栗山夕璃",
    "ファサード・クエスチョン": "サツキ", "PARTY ROCK ETERNITY": "八王子P",
    "チャンピオン": "Kanaria", "オーパーツ": "煮ル果実", "Encounter": "Orangestar",
    "きみとそらをとぶ": "傘村トータ", "むげんのチケット": "まらしぃ",
    "しんかしんかしんか": "原口沙輔", "ドキドキ！": "すりぃ", "たびのまえ、たびのあと": "いよわ",
    "ポケットのモンスター": "ピノキオピー", "ボルテッカー": "DECO*27", "電気予報": "稲葉曇",
    "JUVENILE": "じん", "スパイラル・メロディーズ": "Omoi", "Glorious Day": "Eve",
    "アフターエポックス": "sasakure.UK", "たびだちのうた": "烏屋茶房",
    "クロスロード": "kz",
    # Aliases above rewrite these to the VocaDB spelling before the composer check.
    "ファインダー": "kz", "ヘッドフォン・アディクション": "KEI",
    # The VocaDB credit uses a different romanisation/name for the same producer.
    "インビテーション！": "ネギシャワーP", "ゴー！ビッパ団": "じーざすP",
    "たびだちのうた": "カラスヤサボウ",
}


def norm(title: str) -> str:
    """Normalizes a title so names from different sites compare equal."""
    s = unicodedata.normalize("NFKC", title)
    s = re.sub(r"[\(（].*?[\)）]", "", s)
    s = re.sub(r"[\s・,，、。．.~〜\-–—'\"’]", "", s)
    return s.lower()


def catalog_titles(db_path: Path) -> set[str]:
    """Returns every normalized title VocaDB supplies; the reserved-id rows are excluded."""
    db = sqlite3.connect(db_path)
    try:
        rows = db.execute(
            "SELECT name, name_ja, name_en FROM songs WHERE id < ?", (LOCAL_SONG_ID_BASE,)
        ).fetchall()
    finally:
        db.close()
    titles = set()
    for name, name_ja, name_en in rows:
        for candidate in (name, name_ja, name_en):
            if candidate:
                titles.add(norm(candidate))
    return titles


def repertoire() -> dict[str, dict]:
    """Returns the hand-curated non-VocaDB repertoire, keyed by wiki title."""
    if not REPERTOIRE.exists():
        return {}
    return json.loads(REPERTOIRE.read_text(encoding="utf-8"))["songs"]


def aliases() -> dict[str, str]:
    """Returns the hand-written wiki-title aliases."""
    if not ALIASES.exists():
        return {}
    return json.loads(ALIASES.read_text(encoding="utf-8"))["aliases"]


def wanted_titles() -> list[str]:
    """Returns the wiki titles, in first-seen order, deduplicated by normalized form."""
    payload = json.loads(SETLISTS.read_text(encoding="utf-8"))
    rewrite = aliases()
    seen: dict[str, str] = {}
    for entry in payload["entries"]:
        for row in entry["rows"]:
            title = rewrite.get(row["title"], row["title"])
            seen.setdefault(norm(title), title)
    return list(seen.values())


def search(title: str, originals_only: bool = False) -> list[dict]:
    """Returns up to twenty VocaDB song entries for one free-text query."""
    params = {"query": title, "maxResults": 20, "fields": "Names", "lang": "Default"}
    if originals_only:
        params["songTypes"] = "Original"
    query = urllib.parse.urlencode(params)
    request = urllib.request.Request(f"{API}/songs?{query}", headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.load(response).get("items", [])
    except Exception as error:  # noqa: BLE001 - a failed lookup is reported, not fatal
        print(f"  lookup failed for {title}: {error}")
        return []


def matches(title: str, song: dict) -> bool:
    """Whether a VocaDB entry carries the requested name or one of its aliases."""
    wanted = norm(title)
    names = [song.get("name") or "", song.get("defaultName") or ""]
    names += [entry.get("value") or "" for entry in song.get("names") or []]
    return any(norm(name) == wanted for name in names if name)


def credit_matches(composer: str, artist_string: str | None) -> bool:
    """Whether a VocaDB credit names the wiki composer, ignoring spacing and trailing `P`."""
    haystack = norm(artist_string or "")
    wanted = norm(composer)
    if not wanted:
        return True
    # Wiki credits carry asides such as `カルロス袴田（サイゼP）`; compare the leading name too.
    head = norm(re.split(r"[\(（×,，]", composer)[0])
    return wanted in haystack or (head != "" and head in haystack)


def pick(title: str, items: list[dict]) -> dict | None:
    """Chooses the entry whose credit matches the wiki composer, preferring the original.

    A cover by another producer can share the exact title, so an artist hint that no candidate
    satisfies leaves the title unresolved instead of guessing.
    """
    candidates = [item for item in items if matches(title, item)]
    if not candidates:
        return None
    composer = COMPOSERS.get(title)
    if composer:
        credited = [item for item in candidates if credit_matches(composer, item.get("artistString"))]
        if not credited:
            return None
        candidates = credited
    def score(item: dict) -> tuple:
        """Ranks candidates: the original first, then the earliest publication."""
        return (
            0 if item.get("songType") == "Original" else 1,
            item.get("publishDate") or "9999",
            item.get("id") or 0,
        )
    return sorted(candidates, key=score)[0]


def sql_literal(value: str | int | None) -> str:
    """Renders one SQL literal."""
    if value is None:
        return "NULL"
    if isinstance(value, int):
        return str(value)
    return f"'{value.replace(chr(39), chr(39) * 2)}'"


def citing_pages() -> dict[str, str]:
    """Maps each wiki title to the first page that cites it, so a registered row links to evidence."""
    payload = json.loads(SETLISTS.read_text(encoding="utf-8"))
    pages: dict[str, str] = {}
    for entry in payload["entries"]:
        for row in entry["rows"]:
            pages.setdefault(row["title"], entry["source"])
    return pages


def write_repertoire_increment(entries: dict[str, dict], accessed: str) -> None:
    """Writes the non-VocaDB songs as `INSERT OR IGNORE` rows carrying their category."""
    columns = (
        "INSERT OR IGNORE INTO songs "
        "(id, name, name_ja, name_en, artist_string, song_type, category, publish_date, length_seconds, source_url, retrieved_at) "
        "VALUES"
    )
    pages = citing_pages()
    rows: list[str] = []
    for title, entry in sorted(entries.items(), key=lambda item: item[1]["id"] or 0):
        if entry.get("skip") or entry.get("id") is None:
            continue
        rows.append(
            "("
            + ", ".join(
                [
                    sql_literal(entry["id"]),
                    sql_literal(title),
                    sql_literal(title),
                    "NULL",
                    sql_literal(entry.get("artist")),
                    sql_literal("Original"),
                    sql_literal(entry["category"]),
                    "NULL",
                    "NULL",
                    # Link the page that actually prints the title, not the wiki index.
                    sql_literal(entry.get("source") or pages.get(title) or SETLIST_INDEX_URL),
                    sql_literal(f"{accessed}T00:00:00.000Z"),
                ]
            )
            + ")"
        )
    header = [
        "-- Repertoire the 初音ミク Wiki setlists cite but VocaDB has no song for: classical pieces,",
        "-- Kodo instrumentals, folk tunes. Registered so a 場次 shows its complete programme.",
        "-- Generated by scripts/fetch-wiki-songs.py from data/wiki-repertoire.json.",
        "-- source_url is the wiki page that prints the title, so every row can be traced back.",
        "-- INSERT OR IGNORE keeps this a no-op if a future VocaDB sync ever carries the same id.",
        "",
    ]
    REPERTOIRE_INCREMENT.write_text("\n".join(header) + columns + "\n" + ",\n".join(rows) + ";\n", encoding="utf-8")


def main() -> None:
    """Looks up the missing titles and writes the JSON plus the SQL increments."""
    known = catalog_titles(DB)
    existing = json.loads(TARGET.read_text(encoding="utf-8")) if TARGET.exists() else {"songs": {}}
    resolved: dict[str, dict] = dict(existing.get("songs") or {})
    extra = repertoire()
    unresolved: list[str] = []

    # VocaDB keeps growing: a title registered by hand can gain a real entry later. Say so instead
    # of quietly keeping two rows for one song.
    for title, entry in extra.items():
        if entry.get("skip"):
            continue
        if norm(title) in known:
            print(f"NOTE  {title} is now in the catalog; drop it from data/wiki-repertoire.json")

    for title in wanted_titles():
        key = norm(title)
        if key in known:
            continue
        if title in resolved:
            continue
        # A hand-classified repertoire title keeps its reserved id instead of a VocaDB lookup.
        if title in extra:
            print(f"REPO  {title} -> {extra[title].get('id')} ({extra[title]['category']})")
            continue
        hit = pick(title, search(title, originals_only=True)) or pick(title, search(title))
        if hit is None:
            unresolved.append(title)
            print(f"MISS  {title}")
        else:
            resolved[title] = {
                "id": hit["id"],
                "title": title,
                "artistString": hit.get("artistString"),
                "songType": hit.get("songType"),
                "publishDate": (hit.get("publishDate") or "")[:10] or None,
                "lengthSeconds": hit.get("lengthSeconds"),
                "sourceUrl": f"https://vocadb.net/S/{hit['id']}",
            }
            print(f"OK    {title} -> {hit['id']}")
        time.sleep(0.35)

    payload = {
        "version": 1,
        "accessedAt": ACCESSED,
        "source": "https://vocadb.net/api/songs",
        "note": "百科歌单里出现、但当前 catalog 没有的歌曲。名称用百科标题，别名匹配 VocaDB 的 name / aliases。",
        "songs": resolved,
    }
    TARGET.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    columns = (
        "INSERT OR IGNORE INTO songs "
        "(id, name, name_ja, name_en, artist_string, song_type, publish_date, length_seconds, source_url, retrieved_at) VALUES"
    )
    values = []
    for entry in sorted(resolved.values(), key=lambda item: item["id"]):
        values.append(
            "("
            + ", ".join(
                [
                    sql_literal(entry["id"]),
                    sql_literal(entry["title"]),
                    "NULL",
                    "NULL",
                    sql_literal(entry.get("artistString")),
                    sql_literal(entry.get("songType") or "Original"),
                    sql_literal(entry.get("publishDate")),
                    sql_literal(entry.get("lengthSeconds")),
                    sql_literal(entry["sourceUrl"]),
                    sql_literal(f"{ACCESSED}T00:00:00.000Z"),
                ]
            )
            + ")"
        )
    header = [
        "-- Songs cited by the 初音ミク Wiki setlists that the VocaDB setlists never referenced.",
        "-- Generated by scripts/fetch-wiki-songs.py; re-run it after adding new wiki setlists.",
        "-- INSERT OR IGNORE keeps the row 0001 already wrote when the song is upstream.",
        f"-- Source: {API}/songs, accessed {ACCESSED}",
        "",
    ]
    INCREMENT.write_text("\n".join(header) + columns + "\n" + ",\n".join(values) + ";\n", encoding="utf-8")
    write_repertoire_increment(extra, ACCESSED)
    print(f"\nresolved {len(resolved)}; wrote {TARGET}, {INCREMENT}, {REPERTOIRE_INCREMENT}")
    print("repertoire:", sum(1 for entry in extra.values() if not entry.get("skip")), "songs")
    pages = citing_pages()
    missing = [title for title, entry in extra.items() if not entry.get("skip") and title not in pages]
    if missing:
        print("repertoire without a citing page:", ", ".join(missing))
    print("unresolved:", ", ".join(unresolved) if unresolved else "(none)")


if __name__ == "__main__":
    main()
