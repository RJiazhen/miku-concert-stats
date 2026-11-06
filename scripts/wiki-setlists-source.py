#!/usr/bin/env python3
"""Builds data/wiki-setlists.json from the 初音ミク Wiki (atwiki) setlist pages.

The wiki prints one table per page, marking a city-specific row in the 区分 column
(`大阪公演`, `メドレー東京公演`, `横浜 昼`, `神戸` …). A row without a city token belongs to
every city of that table. This script applies that rule once and writes the per-演出 list the
loader consumes, so the filtering is reviewable and never repeated at runtime.

Lines marked with `#` are repertoire VocaDB has no song entry for (classical pieces or
public-domain arrangements). They are kept out of the row list and recorded in the 演出 note.

Run: uv run scripts/wiki-setlists-source.py
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TARGET = ROOT / "data" / "wiki-setlists.json"
ACCESSED = "2026-11-06"
CITIES = ("札幌", "東京", "横浜", "神戸", "大阪", "名古屋", "福岡", "仙台")

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
                "songs": songs,
            }
            if skipped:
                item["notInVocaDB"] = skipped
            entries.append(item)
    entries.sort(key=lambda item: item["performanceId"])
    payload = {
        "version": 1,
        "source": "初音ミク Wiki（atwiki）ライブセットリスト一覧",
        "rule": "区分（备注）列写了城市的行只属于该城市；没写城市的行属于该表的所有城市；标题以 # 开头的曲目 VocaDB 没有歌曲条目，只记在演出的 note。",
        "accessedAt": ACCESSED,
        "entries": entries,
    }
    TARGET.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {TARGET}: {len(entries)} entries")
    for item in entries:
        print(f"  {item['performanceId']:6d} {item['label']:8s} songs={len(item['songs']):3d} skipped={len(item.get('notInVocaDB', []))}")


if __name__ == "__main__":
    main()
