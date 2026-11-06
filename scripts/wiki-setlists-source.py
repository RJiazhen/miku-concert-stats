#!/usr/bin/env python3
"""Builds data/wiki-setlists.json from the 初音ミク Wiki (atwiki) setlist pages.

The wiki prints one table per page and marks a row that only some cities or slots played in a
dedicated column (`大阪公演`, `メドレー東京公演`, `横浜 昼`, `A日程`, `公演替` …). A row without a
token belongs to every 演出 of that table. This script applies that rule once — per 演出 for the
city-level tables, per 場次 for the tables that split a day — and writes the list the loader
consumes, so the filtering is reviewable and never repeated at runtime.

Lines marked with `#` are repertoire VocaDB has no song entry for (classical pieces or
public-domain arrangements). They are kept out of the row list and recorded in the 演出 note.

Run: uv run scripts/wiki-setlists-source.py
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from wiki_raw_spec import RAW_SPEC  # noqa: E402
from wiki_tour_tables import LABELS, TOUR_ROWS, TOUR_TABLES  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
TARGET = ROOT / "data" / "wiki-setlists.json"
RAW_DIR = ROOT / "data" / "wiki-raw"
ACCESSED = "2026-11-06"
CITIES = ("札幌", "東京", "横浜", "神戸", "大阪", "名古屋", "福岡", "仙台")
# A 場次 marker such as `2023-06-04` or `2016-06-26:night`.
# Rows the wiki uses to label a stage segment rather than a song.
SEGMENTS = ("バンドメンバー紹介", "パート")
SHOW_MARKER = re.compile(r"^(?:\d{4}-\d{2}-\d{2}(?::(?:day|night))?|(?:day|night))$")

# page id -> (year label, url suffix)
PAGES = {
    "2016": "80167",
    "2017": "80237",
    "2018-2019": "80287",
    "2019": "80354",
    "2020": "80404",
    "2021": "80422",
    "2022": "80506",
    "2023": "80537",
    "2024": "80641",
    "2025": "80551",
    "2026": "80458",
}

# table key -> (page, performance ids by city)
TABLES: dict[str, tuple[str, dict[str, int | None]]] = {
    "2016": ("2016", {"東京": 2957}),
    "2017": ("2017", {"大阪": 2958, "東京": 2959}),
    "2018-2019": ("2018-2019", {"東京": 2504, "大阪": 2960}),
    "2019": ("2019", {"横浜": 2870, "大阪": 2871}),
    "2020-東京": ("2020", {"東京": 2954}),
    "2020-横浜大阪": ("2020", {"横浜": 2955, "大阪": 2956}),
    "2021": ("2021", {"横浜": 3710, "神戸": 3869}),
    "2022-東京大阪": ("2022", {"東京": 4322, "大阪": 4814}),
    "2022-横浜": ("2022", {"横浜": 4808}),
    "2023-東京": ("2023", {"東京": 4877}),
    "2023-横浜神戸": ("2023", {"横浜": 4878, "神戸": 4879}),
    "2024-東京": ("2024", {"東京": 12709}),
    "2024-横浜神戸": ("2024", {"横浜": 8033, "神戸": 8035}),
    "2025-札幌": ("2025", {"札幌": 8037}),
    "2025-大阪": ("2025", {"大阪": 8710}),
    "2025-東京": ("2025", {"東京": 8711}),
    "2025-横浜神戸": ("2025", {"横浜": 9267, "神戸": 9276}),
    "2026": ("2026", {"札幌": 12713, "東京": 12714}),
}

# `|title|note`; the note is also the 区分 marker, so a city name in it scopes the row.
# A leading `#` on the title marks repertoire VocaDB has no song entry for.
ROWS: dict[str, str] = {}

ROWS["2016"] = """
|未来序曲|オープニング
|ハジメテノオト|
|みくみくにしてあげる♪【してやんよ】|メドレー：2007年楽曲ヒストリー
|えれくとりっく・えんじぇぅ|メドレー
|恋スルVOC@LOID|メドレー
|初音ミクの消失|2008–2009年楽曲ヒストリー
|ロミオとシンデレラ|
|裏表ラバーズ|
|結ンデ開イテ羅刹ト骸|
|ODDS&ENDS|メドレー：SEGA project DIVAコーナー
|こっち向いて Baby|メドレー
|罪の名前|メドレー
|Starduster|
|炉心融解|メドレー：鏡音リン・鏡音レンメドレー
|ココロ|メドレー
|悪ノ娘|メドレー
|悪ノ召使|メドレー
|ロストワンの号哭|メドレー
|FREELY TOMORROW|メドレー：Mitchie M メドレー
|ビバハピ|メドレー
|からくりピエロ|メドレー：ボカロPピックアップ
|ドレミファロンド|メドレー
|ウミユリ海底譚|メドレー：最新楽曲メドレー
|ヒビカセ|メドレー
|ゴーストルール|メドレー
|千本桜|
|ぽっぴっぽー|アンコール
|Tell Your World|アンコール
|メルト|アンコール
"""

ROWS["2017"] = """
|未来序曲|オープニング
|Tell Your World|大阪公演
|千本桜|東京公演
|初音ミクの消失|メドレー
|初音ミクの激唱|メドレー
|炉心融解|メドレー
|ココロ|メドレー
|悪ノ娘|メドレー
|悪ノ召使|メドレー
|ロストワンの号哭|メドレー
|四季折の羽|
|Fire◎Flower|
|ODDS&ENDS|メドレー
|メルト|メドレー
|ゴーストルール|
|みくみくにしてあげる♪【してやんよ】|メドレー：初音ミク名曲 小編成
|Ievan Polkka|メドレー
|Nyan Cat|メドレー
|子猫のパヤパヤ|メドレー
|from Y to Y|メドレー大阪公演
|Reboot|メドレー大阪公演
|Starduster|メドレー大阪公演
|アンドロメダアンドロメダ|メドレー東京公演
|ダンスロボットダンス|メドレー東京公演
|リバースユニバース|メドレー東京公演
|エイリアンエイリアン|メドレー東京公演
|歌に形はないけれど|
|Connecting|
|脱げばいいってモンじゃない！|アンコール
|ぽっぴっぽー|アンコール
|ルカルカ★ナイトフィーバー|アンコール
|ハジメテノオト|アンコール
|桜ノ雨|アンコール
"""

ROWS["2018-2019"] = """
|39|オープニング
|初音ミクの消失|メドレー東京公演
|初音ミクの激唱|メドレー東京公演
|ロミオとシンデレラ|メドレー大阪公演
|ゴーストルール|メドレー大阪公演
|Just Be Friends|メドレー：巡音ルカ10周年
|ダブルラリアット|メドレー
|ルカルカ★ナイトフィーバー|メドレー
|メモリ|
|四季折の羽|
|Fire◎Flower|
|ロキ|
|耳のあるロボットの唄|メドレー：重音テト10周年
|吉原ラメント|メドレー
|おちゃめ機能|メドレー
|ハッピーシンセサイザ|メドレー：名曲小編成
|いーあるふぁんくらぶ|メドレー
|ちがう!!!|メドレー
|メルティランドナイトメア|
|好き！雪！本気マジック|メドレー東京公演
|Snow Fairy Story|メドレー東京公演
|スターナイトスノウ|メドレー東京公演
|Snow Fairy Story|メドレー大阪公演
|スターナイトスノウ|メドレー大阪公演
|リバースユニバース|メドレー大阪公演
|エイリアンエイリアン|メドレー大阪公演
|星のカケラ|
|ガールズフレンドシップ|
|卑怯戦隊うろたんだー|アンコール
|ray|アンコール
|たいせつなこと|アンコール
"""

ROWS["2019"] = """
|1/6 -out of the gravity-|オープニング
|39|横浜公演
|ray|大阪公演
|ワールズエンド・ダンスホール|メドレー：巡音ルカメドレー
|ルカルカ★ナイトフィーバー|メドレー
|メモリ|
|ロキ|メドレー：鏡音リン・鏡音レン
|右肩の蝶|メドレー
|ねぇ、どろどろさん|
|Nostalogic|MEIKO 15th Anniversary
|on the rocks|MEIKO 15th Anniversary
|ピアノ×フォルテ×スキャンダル|MEIKO 15th Anniversary
|ハッピーシンセサイザ|メドレー横浜公演：ピアノ五重奏
|いーあるふぁんくらぶ|メドレー横浜公演
|#スーパートルコ行進曲|メドレー横浜公演（VocaDB 无条目）
|嗚呼、素晴らしきニャン生|メドレー横浜公演
|#そりすべり|メドレー大阪公演：Christmas special（VocaDB 无条目）
|#White Christmas|メドレー大阪公演（VocaDB 无条目）
|#ジングルベル|メドレー大阪公演（VocaDB 无条目）
|Snow Song Show|メドレー大阪公演
|Catch the Wave|
|ODDS&ENDS|
|罪の名前|
|Bad ∞ End ∞ Night|メドレー
|Crazy ∞ nighT|メドレー
|Twilight ∞ nighT|メドレー
|EveR ∞ LastinG ∞ NighT|メドレー
|星のカケラ|
|たいせつなこと|
|カンタレラ|アンコール
|サンドリヨン|アンコール
|卑怯戦隊うろたんだー|アンコール
|SPiCa|アンコール
"""

ROWS["2020-東京"] = """
|未来序曲|オープニング
|Tell Your World|
|メルティランドナイトメア|昼公演
|ウミユリ海底譚|メドレー夜公演
|ヒビカセ|メドレー夜公演
|ゴーストルール|メドレー夜公演
|悪ノ娘|メドレー：5th Anniversary ver.
|悪ノ召使|メドレー
|Alice in Musicland|
|紅一葉|メドレー：和楽器とオーケストラ
|番凩|メドレー
|千年の独奏歌|メドレー
|Catch the Wave|
|カンタレラ|メドレー
|サンドリヨン|メドレー
|from Y to Y|昼公演
|歌に形はないけれど|夜公演
|初音ミクの消失|
|舞台|
|ブラック★ロックシューター|アンコール
|ハジメテノオト|アンコール・昼公演
|たいせつなこと|アンコール・夜公演
|メルト|アンコール
"""

ROWS["2020-横浜大阪"] = """
|舞台|オープニング
|メルト|
|白い雪のプリンセスは|
|深海少女|
|メランコリック|
|劣等上等|
|Alice in Musicland|
|ドクター＝ファンクビート|メドレー：KAITO 15th Anniversary
|番凩|メドレー
|千年の独奏歌|メドレー
|No Logic|
|初音ミクの消失|
|ワーワーワールド|
|依存香炉|
|ハジメテノオト|横浜 昼
|SPiCa|横浜 夜
|Connecting|大阪
|glow|
|ブラック★ロックシューター|アンコール
|Last Night, Good Night|アンコール
"""

ROWS["2021"] = """
|カンタレラ|
|サンドリヨン|
|ワールドイズマイン|
|千本桜|
|上弦の月|
|リモコン|メドレー：鏡音リン・鏡音レン
|劣等上等|メドレー
|ワールズエンド・ダンスホール|メドレー：巡音ルカ
|ルカルカ★ナイトフィーバー|メドレー
|タイムマシン|
|Reboot|横浜
|39|神戸
|あったかいと|
|ドクター＝ファンクビート|
|ピアノ×フォルテ×スキャンダル|
|ニジイロストーリーズ|
|シネマ|
|トンデモワンダーズ|
|Last Night, Good Night|アンコール
|magnet|アンコール
|怪人|アンコール
"""

ROWS["2022-東京大阪"] = """
|怪人|東京 昼
|未来序曲|東京 夜
|shake it！|大阪
|タイムリミット|
|悪ノ娘|メドレー
|悪ノ召使|メドレー
|ヴェノマニア公の狂気|
|それがあなたの幸せとしても|
|Bad ∞ End ∞ Night|メドレー
|Crazy ∞ nighT|メドレー
|Twilight ∞ nighT|メドレー
|EveR ∞ LastinG ∞ NighT|メドレー
|神っぽいな|メドレー：小編成1
|ショウタイム・ルーラー|メドレー
|上弦の月|メドレー：小編成2
|黄泉桜|メドレー
|炉心融解|メドレー：鏡音リン・鏡音レン
|ココロ|メドレー
|テレキャスタービーボーイ|メドレー
|初めての恋が終わる時|
|glow|
|闇色アリス|アンコール
|カンタレラ|アンコール・メドレー
|サンドリヨン|アンコール・メドレー
|メルト|東京 昼大阪
|ハジメテノオト|東京 夜
"""

ROWS["2022-横浜"] = """
|ヴァンパイア|
|ねぇねぇねぇ。|
|帝国少女|メドレー
|深海少女|メドレー
|リモコン|メドレー
|劣等上等|メドレー
|shake it！|
|それがあなたの幸せとしても|
|ODDS&ENDS|メドレー
|こっち向いて Baby|メドレー
|罪の名前|メドレー
|ビターチョコデコレーション|メドレー
|ショウタイム・ルーラー|メドレー
|テレキャスタービーボーイ|メドレー
|上弦の月|メドレー
|黄泉桜|メドレー
|タイムマシン|
|青を焚べて|
|大江戸ジュリアナイト|アンコール・メドレー
|千本桜|アンコール・メドレー
|Fire◎Flower|アンコール
|SPiCa|アンコール
"""

ROWS["2023-東京"] = """
|Tell Your World|
|転生林檎|
|shake it！|
|七つの罪と罰|メドレー：悪ノ交響曲 第1楽章
|ヴェノマニア公の狂気|メドレー：第2楽章
|悪食娘コンチータ|メドレー：第2楽章
|悪ノ娘|メドレー：第3楽章
|悪ノ召使|メドレー：第3楽章
|眠らせ姫からの贈り物|メドレー：第4楽章
|円尾坂の仕立屋|メドレー：第4楽章
|悪徳のジャッジメント|メドレー：第5楽章
|ネメシスの銃口|メドレー：第5楽章
|FLASH|メドレー
|黄昏を生きる|メドレー
|抜錨|
|アトラクトライト|
|ハジメテノオト|
|Birthday Song for ミク|
|愛言葉|アンコール
|rain stops, good-bye|アンコール・メドレー
|よつばのクローバー|アンコール・メドレー
|メルト|アンコール
"""

ROWS["2023-横浜神戸"] = """
|ダーリンダンス|
|初音ミクの消失|メドレー
|初音ミクの激唱|メドレー
|転生林檎|
|天樂 -双響-|
|shake it！|
|抜錨|
|FLASH|メドレー
|黄昏を生きる|メドレー
|みくみくにしてあげる♪【してやんよ】|メドレー：16th Anniversary
|私の時間|メドレー：16th Anniversary
|Starduster|メドレー：16th Anniversary
|七つの罪と罰|メドレー：悪ノ交響曲 第1楽章
|ヴェノマニア公の狂気|メドレー：第2楽章
|悪食娘コンチータ|メドレー：第2楽章
|悪ノ娘|メドレー：第3楽章
|悪ノ召使|メドレー：第3楽章
|眠らせ姫からの贈り物|メドレー：第4楽章
|円尾坂の仕立屋|メドレー：第4楽章
|悪徳のジャッジメント|メドレー：第5楽章
|ネメシスの銃口|メドレー：第5楽章
|Packaged|
|星のカケラ|アンコール
|39|アンコール
|ブループラネット|アンコール
|白い雪のプリンセスは|ダブルアンコール・神戸のみ
"""

ROWS["2024-東京"] = """
|サイハテ|
|テオ|
|アカツキアライヴァル|
|恋は戦争|
|君を捜す空|Synchronicity 3部作
|光と影の楽園|
|巡る世界のレクイエム|
|Afterglow|巡音ルカ15th Anniversary
|Just Be Friends|メドレー
|ダブルラリアット|メドレー
|ワールズエンド・ダンスホール|メドレー
|on the rocks|
|ジターバグ|
|カンタレラ|メドレー
|サンドリヨン|メドレー
|ヴィーナス|
|抜錨|アンコール・昼公演
|それがあなたの幸せとしても|アンコール・夜公演
|ACUTE|アンコール
|ハジメテノオト|アンコール・昼公演
|メルト|アンコール・夜公演
"""

ROWS["2024-横浜神戸"] = """
|ヒバナ (Reloaded)|
|ワールズエンド・ダンスホール|メドレー
|ルカルカ★ナイトフィーバー|メドレー
|メモリ|
|メランコリック|
|脱法ロック|
|ツギハギスタッカート|
|レッドランドマーカー|
|君を捜す空|Synchronicity 3部作
|光と影の楽園|
|巡る世界のレクイエム|
|Leia - Remind|
|星屑ユートピア|
|Yellow|メドレー
|DECORATOR|メドレー
|Catch the Wave|メドレー
|カンタレラ|メドレー
|サンドリヨン|メドレー
|Genesis|
|letter song|アンコール
|ReAct|アンコール
|ヴィーナス|アンコール
"""

ROWS["2025-札幌"] = """
|ステラ|
|Loading Memories|
|インタビュア|
|エゴロック|
|ヘッジホッグ|
|好き！雪！本気マジック|メドレー：SNOW MIKU歴代テーマ
|Snow Fairy Story|メドレー
|雪がとける前に|メドレー
|スターナイトスノウ|メドレー
|四角い地球を丸くする|メドレー
|アイ|メドレー
|ぽかぽかの星|メドレー
|Fondant Step|メドレー
|君色マリンスノウ|メドレー
|SnowMix♪|メドレー
|ハッピーチートデー|メドレー
|未来序曲|
|私の恋はヘルファイア|
|スノーマン|
|たいせつなこと|
|プレイオン|
|ハジメテノオト|アンコール・昼公演
|舞台|アンコール・夜公演
|クリスタルスノウ|アンコール
|Hand in Hand|アンコール
|SPiCa|アンコール・昼公演
|メルト|アンコール・夜公演
"""

ROWS["2025-大阪"] = """
|愛して愛して愛して|
|おこちゃま戦争|
|どりーみんチュチュ|
|レイニースノードロップ|
|きみとぼくのレゾナンス|
|悪ノ娘|メドレー
|悪ノ召使|メドレー
|Tell Your World|
|カンタレラ|メドレー
|サンドリヨン|メドレー
|抜錨|
|メルト|
|Blessing|アンコール
|Hand in Hand|アンコール
|プレイオン|アンコール
|ray|ダブルアンコール
"""

ROWS["2025-東京"] = """
|愛して愛して愛して|
|おこちゃま戦争|
|どりーみんチュチュ|
|レイニースノードロップ|
|きみとぼくのレゾナンス|
|ODDS&ENDS|
|ロミオとシンデレラ|
|Bad ∞ End ∞ Night|メドレー
|Crazy ∞ nighT|メドレー
|Twilight ∞ nighT|メドレー
|EveR ∞ LastinG ∞ NighT|メドレー
|上弦の月|
|初音ミクの消失|
|Blessing|アンコール
|Hand in Hand|アンコール
|プレイオン|アンコール
|命に嫌われている。|ダブルアンコール
"""

ROWS["2025-横浜神戸"] = """
|Blessing|
|愛して愛して愛して|
|ReAct|メドレー
|ACUTE|メドレー
|右肩の蝶|
|番凩|
|Dear|
|裏表ラバーズ|メドレー：wowaka Special
|ローリンガール|メドレー
|アンハッピーリフレイン|メドレー
|ワールズエンド・ダンスホール|メドレー
|アンノウン・マザーグース|
|Hand in Hand|
|メズマライザー|アンコール
|オーバーライド|アンコール
|ぽっぴっぽー|アンコール：10th メドレー
|未来序曲|アンコール：10th メドレー
|メモリ|アンコール：10th メドレー
|ガールズフレンドシップ|アンコール：10th メドレー
|たいせつなこと|アンコール：10th メドレー
|ピアノ×フォルテ×スキャンダル|アンコール：10th メドレー
|舞台|アンコール：10th メドレー
|怪人|アンコール：10th メドレー
|青を焚べて|アンコール：10th メドレー
|悪ノ娘|アンコール：10th メドレー
|悪ノ召使|アンコール：10th メドレー
|ヴィーナス|アンコール：10th メドレー
|39|アンコール：10th メドレー
|#ぽっぴっぽー（Grand Finale）|アンコール：10th メドレー（同曲の再演）
|プレイオン|アンコール
|メルト|アンコール・横浜
|#交響曲第9番|アンコール・神戸（VocaDB 无条目）
"""

ROWS["2026"] = """
|愛言葉V|
|混沌ブギ|
|再教育|
|抜錨|
|げんてん|札幌
|青炎|東京
|命に嫌われている。|
|#ピアノ協奏曲 第5番「皇帝」第1楽章|札幌：ピアノコンチェルト特集（VocaDB 无条目）
|#ピアノ協奏曲 第2番 第1楽章|東京：ピアノコンチェルト特集（VocaDB 无条目）
|天樂 -双響-|協奏曲札幌
|ツギハギスタッカート|協奏曲札幌
|メルティランドナイトメア|協奏曲札幌
|愛して愛して愛して|協奏曲札幌
|深海少女|協奏曲東京
|ウミユリ海底譚|協奏曲東京
|星のカケラ|協奏曲東京
|SPiCa|協奏曲東京
|青炎|札幌：KAITO名曲コーナー
|げんてん|東京：MEIKO名曲コーナー
|あったかいと|札幌
|二人の白地図|東京
|みかぼし|札幌
|夜舞うシルエット|東京
|ODDS&ENDS|
|ノンブレス・オブリージュ|アンコール
|SHIAWASE FOR YOU!|アンコール・札幌
|グリーンライツ・セレナーデ|アンコール・東京
|開演|アンコール
|メルト|アンコール・札幌
|Connecting|アンコール・東京
"""


def cities_in(mark: str) -> set[str]:
    """Returns the city names a 区分 marker names."""
    return {city for city in CITIES if city in mark}


def parse_row(line: str, key: str) -> tuple[str, str, str]:
    """Splits one tour row into marker, title, and note.

    Every row starts with `|`, so a row is either `|title|note` or `|marker|title|note`; the
    number of cells is what tells the two apart.
    """
    cells = [cell.strip() for cell in line.split("|")]
    if cells and cells[0] == "":
        cells = cells[1:]
    if not cells:
        raise SystemExit(f"{key}: empty row")
    if len(cells) >= 3:
        return cells[0], cells[1], cells[2]
    title = cells[0]
    note = cells[1] if len(cells) > 1 else ""
    if title == "":
        raise SystemExit(f"{key}: row without a title: {line!r}")
    return "", title, note


def row_scope(marker: str, markers: dict[str, list[int]], key: str) -> tuple[set[int] | None, str | None]:
    """Returns the 演出 a row selects and the 場次 token it is limited to, if any."""
    if marker == "":
        return None, None
    if SHOW_MARKER.match(marker):
        if marker not in markers:
            raise SystemExit(f"{key}: unknown 場次 marker {marker!r}")
        return None, marker
    if marker.startswith("!"):
        if marker not in markers:
            raise SystemExit(f"{key}: unknown exclusion marker {marker!r}")
        return set(markers.get("", [])) - set(markers[marker]), None
    # `パリ+ロンドン` names every token it lists.
    tokens = marker.split("+")
    ids: set[int] = set()
    for token in tokens:
        if token not in markers:
            raise SystemExit(f"{key}: unknown marker {token!r}")
        ids.update(markers[token])
    return ids, None


def tour_entries() -> list[dict]:
    """Builds the per-演出 entries of the tour tables, honouring 場次 markers."""
    entries: list[dict] = []
    for key, (page, markers) in TOUR_TABLES.items():
        url = f"https://w.atwiki.jp/hmiku/pages/{page}.html"
        rows = [parse_row(line, key) for line in TOUR_ROWS[key].strip().split("\n") if line.strip()]
        every = sorted(markers.get("", []))
        if not every:
            raise SystemExit(f"{key}: table names no default 演出")
        for pid in every:
            rows_out: list[dict] = []
            skipped: list[str] = []
            for marker, title, note in rows:
                ids, token = row_scope(marker, markers, key)
                if ids is not None and pid not in ids:
                    continue
                if title.startswith("#"):
                    skipped.append(title.lstrip("#"))
                    continue
                entry = {"title": title, "when": token or ""}
                if note:
                    entry["note"] = note
                rows_out.append(entry)
            if not any(not row["when"] for row in rows_out):
                raise SystemExit(f"{key} / {pid} has no shared row")
            item = {
                "performanceId": pid,
                "label": LABELS.get(pid, ""),
                "source": url,
                "accessedAt": ACCESSED,
                "rows": rows_out,
            }
            if skipped:
                item["notInVocaDB"] = skipped
            entries.append(item)
    return entries


def parse_constraint(text: str, default_ids: list[int]) -> tuple[set[int], int | None, str | None]:
    """Splits one marker constraint such as `6516#2:night` into ids, date index, and half."""
    pid_part, _, half = text.partition(":")
    day: int | None = None
    if "#" in pid_part:
        pid_part, _, raw_day = pid_part.partition("#")
        day = int(raw_day)
    ids = set(default_ids) if pid_part == "*" else {int(pid_part)}
    return ids, day, half or None


def slot_token(day: int | None, half: str | None) -> str:
    """Renders a 場次 constraint as the token the loader expands."""
    if day is None and half is None:
        return ""
    head = f"d{day}" if day is not None else ""
    if half is None:
        return head
    return f"{head}:{half}" if head else half


def raw_entries() -> list[dict]:
    """Builds entries from the saved cell grids under data/wiki-raw."""
    entries: list[dict] = []
    for key, spec in RAW_SPEC.items():
        path = RAW_DIR / f"{key}.json"
        if not path.exists():
            raise SystemExit(f"{key}: missing {path}")
        payload = json.loads(path.read_text(encoding="utf-8"))
        url = f"https://w.atwiki.jp/hmiku/pages/{payload['page']}.html"
        grid = payload["rows"]
        header = grid[0]
        if "曲名" not in header:
            raise SystemExit(f"{key}: header has no 曲名 column")
        title_at = header.index("曲名")
        marker_at = header.index("公演替") if "公演替" in header else None
        note_at = header.index("備考") if "備考" in header else None
        rows = grid[1:]

        ids = spec["performances"]
        parsed: list[tuple[str, str, str]] = []
        unattributed: list[str] = []
        for row in rows:
            title = row[title_at].strip() if title_at < len(row) else ""
            if title == "" or title.startswith("《") or title.startswith("MC"):
                continue
            if any(marker in title for marker in SEGMENTS):
                continue
            marker = row[marker_at].strip() if marker_at is not None and marker_at < len(row) else ""
            note = row[note_at].strip() if note_at is not None and note_at < len(row) else ""
            cleaned = marker.replace("※", "").strip()
            if marker and not cleaned:
                unattributed.append(title)
                continue
            if cleaned and cleaned not in spec["markers"]:
                raise SystemExit(f"{key}: unknown marker {marker!r} on {title!r}")
            parsed.append((cleaned, title, note))

        for pid in ids:
            def tokens_for(cleaned: str) -> list[str]:
                """Tokens of one row for this 演出; empty means it does not apply."""
                if cleaned == "":
                    return [""]
                found: list[str] = []
                for text in spec["markers"][cleaned]:
                    row_ids, day, half = parse_constraint(text, ids)
                    if pid not in row_ids:
                        continue
                    token = slot_token(day, half)
                    if token == "":
                        return [""]
                    if token not in found:
                        found.append(token)
                return found

            rows_out: list[dict] = []
            for cleaned, title, note in parsed:
                tokens = tokens_for(cleaned)
                if not tokens:
                    continue
                # A row that names several slots becomes one row per slot.
                for token in tokens:
                    entry = {"title": title, "when": token}
                    if note:
                        entry["note"] = note
                    rows_out.append(entry)
            if not any(not row["when"] for row in rows_out):
                raise SystemExit(f"{key} / {pid} has no shared row")
            item = {
                "performanceId": pid,
                "label": spec["labels"].get(pid, ""),
                "source": url,
                "accessedAt": ACCESSED,
                "rows": rows_out,
            }
            if unattributed:
                item["unattributed"] = unattributed
            entries.append(item)
    return entries


def main() -> None:
    """Filters every table per city and writes data/wiki-setlists.json."""
    entries = []
    for key, (page, by_city) in TABLES.items():
        url = f"https://w.atwiki.jp/hmiku/pages/{PAGES[page]}.html"
        rows = []
        for line in ROWS[key].strip().split("\n"):
            if not line.strip():
                continue
            cells = line.split("|")
            if len(cells) < 2 or cells[0].strip() != "":
                raise SystemExit(f"{key}: malformed row {line!r}")
            title = cells[1].strip()
            note = cells[2].strip() if len(cells) > 2 else ""
            rows.append((note, title, note))
        for city, pid in by_city.items():
            if pid is None:
                continue
            songs = []
            skipped = []
            for marker, title, note in rows:
                named = cities_in(marker)
                if named and city not in named:
                    continue
                if title.startswith("#"):
                    skipped.append(title.lstrip("#"))
                    continue
                entry = {"title": title}
                # A note that only names the city carries no programme information.
                display = note
                # The inner loop must not shadow the city being built.
                for mentioned in cities_in(note):
                    display = display.replace(mentioned, "")
                display = re.sub(r"[\s・:：()（）※、]+", "", display)
                display = re.sub(r"^(?:公演|のみ)+", "", display)
                if display:
                    entry["note"] = note
                songs.append(entry)
            if not songs:
                raise SystemExit(f"{key} / {city} produced no songs")
            if len({song['title'] for song in songs}) != len(songs):
                raise SystemExit(f"{key} / {city} has a duplicate title")
            item = {
                "performanceId": pid,
                "label": f"{city}公演",
                "source": url,
                "accessedAt": ACCESSED,
                "rows": [{"title": song["title"], "when": "", **({"note": song["note"]} if "note" in song else {})} for song in songs],
            }
            if skipped:
                item["notInVocaDB"] = skipped
            entries.append(item)
    entries.extend(tour_entries())
    entries.extend(raw_entries())
    entries.sort(key=lambda item: item["performanceId"])
    seen: set[int] = set()
    for item in entries:
        if item["performanceId"] in seen:
            raise SystemExit(f"performance {item['performanceId']} has two wiki tables")
        seen.add(item["performanceId"])
    payload = {
        "version": 1,
        "source": "初音ミク Wiki（atwiki）ライブセットリスト一覧",
        "rule": "区分（公演替・备注）列写了城市或日程的行只属于该城市或该场次；没写别的行属于该表的所有演出。标题以 # 开头的曲目 VocaDB 没有歌曲条目，只记在演出的 note。",
        "accessedAt": ACCESSED,
        "entries": entries,
    }
    TARGET.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {TARGET}: {len(entries)} entries")
    for item in entries:
        scoped = sum(1 for row in item["rows"] if row["when"])
        print(
            f"  {item['performanceId']:6d} {item['label'][:10]:10s} rows={len(item['rows']):3d}"
            f" scoped={scoped:2d} skipped={len(item.get('notInVocaDB', []))}"
        )


if __name__ == "__main__":
    main()
