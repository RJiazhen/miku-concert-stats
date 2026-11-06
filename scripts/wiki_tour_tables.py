"""Raw per-tour setlist tables copied from the 初音ミク Wiki (atwiki).

One entry per wiki page. `TOUR_TABLES[key] = (page_id, markers)` where `markers` maps the token
the wiki prints in its 公演替 column to the 演出 ids it selects:

  "大阪": [1943]          the row belongs to Osaka only
  "A日程": [2786, 2788]   the token stands for several 演出
  "!シアトル": [1859]     the row belongs to every 演出 except Seattle

A row whose marker is empty belongs to all 演出 of the table.

`TOUR_ROWS[key]` is `marker|title|note`; a leading `#` on the title marks repertoire VocaDB has no
song entry for (鼓童's own pieces, classical arrangements), recorded in the 演出 note instead.
A date or `date:half` marker selects one 場次 rather than a whole 演出.

Read by scripts/wiki-setlists-source.py.
"""

# page id + the token that scopes a row
TOUR_TABLES: dict[str, tuple[str, dict[str, list[int]]]] = {
    "expo2014-id": ("67130", {"": [1939]}),
    "expo2014-us": ("67131", {"": [1937, 1938]}),
    "expo2016-jp": ("67048", {"": [1399, 1400, 1401, 1402, 1403]}),
    "expo2016-na": (
        "67134",
        {"": [1859, 1860, 1924, 1930, 1931, 1932, 1933, 1934, 1935, 1936], "!シアトル": [1859]},
    ),
    "expo2016-tw": ("67135", {"": [1941], "day": [1941], "night": [1941]}),
    "expo2016-cn": ("67136", {"": [1942, 1943], "北京": [1942], "上海": [1943]}),
    "expo2018-eu": ("67138", {"": [1854, 1855, 1856], "パリ": [1854], "ケルン": [1855], "ロンドン": [1856]}),
    "expo2019-tw-hk": ("67139", {"": [2489, 2490], "台湾": [2489], "香港": [2490]}),
    "expo2020-eu": ("67140", {"": [2786, 2787, 2788, 2789], "A日程": [2786, 2788], "B日程": [2787, 2789]}),
    "expo2023-vr": ("67143", {"": [5751]}),
    "kodo2017": ("67219", {"": [2947]}),
    "kodo2018": ("67230", {"": [2948]}),
    "kodo2023": ("67232", {"": [5910], "2023-06-03": [5910], "2023-06-04": [5910]}),
    "mwy2020": ("67178", {"": [3250]}),
    "mwy2021": ("67180", {"": [4058]}),
    "mikuday2010": ("67147", {"": [2520]}),
    "lp2011-tokyo": ("67149", {"": [2523]}),
    "lp2011-sapporo": ("67150", {"": [2526]}),
    "lp2012-hk-tw": ("67153", {"": [2524, 2525]}),
    "lp2012-tokyo": ("67152", {"": [4056]}),
    "lp2013-sapporo": ("67154", {"": [2510]}),
    "lp2013-kansai": ("66967", {"": [2511]}),
    "mm2014": ("67113", {"": [2517, 2518]}),
}

# A 演出 that needs its own wording on the page, keyed by performance id.
LABELS: dict[int, str] = {
    1937: "洛杉矶 / 纽约",
    1939: "雅加达",
    3250: "线上",
    4058: "线上",
    5751: "线上",
    1403: "东京",
    1399: "福冈",
    1400: "大阪",
    1401: "名古屋",
    1402: "札幌",
    1938: "洛杉矶 / 纽约",
    1859: "西雅图",
    1860: "蒙特雷",
    1924: "墨西哥城",
    1930: "旧金山",
    1931: "洛杉矶",
    1932: "达拉斯",
    1933: "休斯敦",
    1934: "多伦多",
    1935: "芝加哥",
    1936: "纽约",
    1941: "台北",
    1942: "北京",
    1943: "上海",
    1854: "巴黎",
    1855: "科隆",
    1856: "伦敦",
    2489: "台北",
    2490: "香港",
    2786: "伦敦",
    2787: "巴黎",
    2788: "柏林",
    2789: "阿姆斯特丹",
    2524: "香港",
    2525: "台北",
    2526: "札幌",
    2510: "札幌",
    2511: "关西",
    2523: "东京",
    2520: "东京",
    4056: "东京",
    2517: "大阪",
    2518: "东京",
    2947: "NHK 大厅",
    2948: "NHK 大厅",
    5910: "NHK 大厅",
}

TOUR_ROWS: dict[str, str] = {}

TOUR_ROWS["expo2014-id"] = """
|千本桜|
|こっち向いて Baby|
|マージナル|
|恋色病棟|
|カラフル×メロディ|
|Fire◎Flower|
|右肩の蝶|
|メランコリック|
|ココロ|
|トリノコシティ|
|結ンデ開イテ羅刹ト骸|
|ロミオとシンデレラ|
|ピアノ×フォルテ×スキャンダル|
|Pane dhiria|
|千年の独奏歌|
|ぽっぴっぽー|
|白い雪のプリンセスは|
|Venus di Ujung Jari|印尼赛区获奖曲，首次披露
|ダブルラリアット|
|ルカルカ★ナイトフィーバー|
|秘密警察|
|Yellow|
|初音ミクの激唱|
|メルト|
|Tell Your World|安可
|みくみくにしてあげる♪|安可
|letter song|安可
"""

TOUR_ROWS["expo2014-us"] = """
|Sharing The World|EXPO'14 LA&NY 主题曲，首次披露
|千本桜|
|こっち向いて Baby|
|恋色病棟|
|カラフル×メロディ|
|Fire◎Flower|
|右肩の蝶|
|メランコリック|
|ココロ|
|Glass Wall|首次披露
|トリノコシティ|
|結ンデ開イテ羅刹ト骸|
|ロミオとシンデレラ|
|ピアノ×フォルテ×スキャンダル|
|Pane dhiria|
|Parades|首次披露
|ぽっぴっぽー|
|白い雪のプリンセスは|
|Just Be Friends（English ver.）|英语版
|ルカルカ★ナイトフィーバー|
|秘密警察|
|Yellow|
|ワールドイズマイン|
|メルト|
|Tell Your World|安可
|みくみくにしてあげる♪|安可
|letter song|安可
"""

TOUR_ROWS["expo2016-jp"] = """
|ワールドイズマイン|
|初音ミクの消失|
|裏表ラバーズ|
|アンハッピーリフレイン|
|ワールズエンド・ダンスホール|
|magnet|
|Weekender Girl|
|ありふれたせかいせいふく|
|愛言葉|
|Glass Wall|
|スノーマン|
|Change me|
|東京テディベア|
|右肩の蝶|
|リモコン|
|恋は戦争|
|Last Night, Good Night（Re:Dialed）|
|Ten Thousand Stars|乐曲比赛'16 大奖，首次披露
|ルカルカ★ナイトフィーバー|
|秘密警察|
|初音ミクの激唱|
|Tell Your World|
|Blue Star|EXPO'16 主题曲，首次披露
|積乱雲グラフィティ|安可，首次披露
|39|安可
|星のカケラ|双安可
"""

TOUR_ROWS["expo2016-na"] = """
|ワールドイズマイン|
|初音ミクの消失|
|裏表ラバーズ|
|アンハッピーリフレイン|
|ワールズエンド・ダンスホール|
|magnet|
|Weekender Girl|
|ありふれたせかいせいふく|
|深海少女|
|スノーマン|
|Change me|
|東京テディベア|
|右肩の蝶|
|リモコン|
|恋は戦争|
|Last Night, Good Night（Re:Dialed）|
|Ten Thousand Stars|乐曲比赛'16 大奖
|Just Be Friends|
|秘密警察|
|初音ミクの激唱|
|積乱雲グラフィティ|
|Tell Your World|
|Blue Star|EXPO'16 主题曲
|Sharing The World|安可
|!シアトル|Miku|西雅图以外各站；首次披露，嘉宾 Anamanaguchi
|39|安可
|星のカケラ|双安可
"""

TOUR_ROWS["expo2016-tw"] = """
|ワールドイズマイン|
|初音ミクの消失|
|裏表ラバーズ|
|アンハッピーリフレイン|
|ワールズエンド・ダンスホール|
|magnet|
|Weekender Girl|
|day|深海少女|昼场
|night|恋は戦争|夜场
|celluloid|首次披露
|スノーマン|
|Change me|
|day|東京テディベア|昼场
|night|炉心融解|夜场
|右肩の蝶|
|リモコン|
|いーあるふぁんくらぶ（Chinese ver.）|中文版，首次披露
|Last Night, Good Night（Re:Dialed）|
|Ten Thousand Stars|乐曲比赛'16 大奖
|Just Be Friends|
|千本桜|
|初音ミクの激唱|
|Tell Your World|
|Blue Star|EXPO'16 主题曲
|紡唄 -つむぎうた-（Chinese ver.）|安可，中文版
|秘密警察|安可
|39|安可
|星のカケラ|双安可
"""

TOUR_ROWS["expo2016-cn"] = """
|ワールドイズマイン|
|ストリーミングハート|首次披露
|裏表ラバーズ|
|アンハッピーリフレイン|
|ワールズエンド・ダンスホール|
|深海少女|
|月西江|
|北京|愛言葉|北京限定
|右肩の蝶|
|上海|東京テディベア|
|北京|炉心融解|
|リモコン|
|いーあるふぁんくらぶ（Chinese ver.）|中文版
|紡唄 -つむぎうた-（Chinese ver.）|中文版
|スノーマン|
|Change me|
|Ten Thousand Stars|乐曲比赛'16 大奖
|Last Night, Good Night（Re:Dialed）|
|Just Be Friends|
|気まぐれメルシィ|首次披露
|上海|秘密警察|上海限定
|初音ミクの激唱|
|ODDS&ENDS|
|Blue Star|EXPO'16 主题曲
|Tell Your World|安可
|初音ミクの消失|安可
|39|安可
|歌に形はないけれど（Chinese ver.）|安可，中文版
"""

TOUR_ROWS["expo2018-eu"] = """
|千本桜|
|ゴーストルール|
|秘密警察|
|エイリアンエイリアン|
|アンノウン・マザーグース|
|Glass Wall|
|ドクター＝ファンクビート|
|ピアノ×フォルテ×スキャンダル|
|ロキ|
|リモコン|
|劣等上等|
|Cybernetic|首次披露
|パリ|砂の惑星|
|ケルン|深海少女|
|ロンドン|glow|
|パリ|ロミオとシンデレラ|
|ケルン|えれくとりっく・えんじぇぅ|
|ロンドン|初音ミクの消失|
|パリ|ワールズエンド・ダンスホール|
|ケルン|ビバハピ|
|ロンドン|裏表ラバーズ|
|星屑ユートピア|
|パリ+ロンドン|Just Be Friends|
|ケルン|ルカルカ★ナイトフィーバー|
|Birthday|
|気まぐれメルシィ|
|Satisfaction|
|初音ミクの激唱|
|メルト|
|パリ+ロンドン|歌に形はないけれど|
|ケルン|ハジメテノオト|
|魔法みたいなミュージック！|安可，EXPO'18 Europe 主题曲，首次披露
|ワールドイズマイン|安可
|Tell Your World|安可
"""

TOUR_ROWS["expo2019-tw-hk"] = """
|みんなみくみくにしてあげる♪|
|ビバハピ|
|アンノウン・マザーグース|
|キレキャリオン|首次披露
|Sharing The World|
|Pane dhiria|
|Nostalogic（MEIKO-SAN mix）|
|台湾|脱法ロック|
|香港|右肩の蝶|
|台湾|スイートマジック|
|香港|東京テディベア|
|台湾|8HIT|
|香港|リモコン|
|劣等上等|
|Cybernetic|
|台湾|Yellow|
|香港|Satisfaction|
|ドリームレス・ドリームス|
|ルカルカ★ナイトフィーバー|
|台湾|Hello, Worker|
|香港|ダブルラリアット|
|Never Die|首次披露
|Miku|
|Blue Star|
|ワールドイズマイン|
|台湾|メルト|
|香港|ODDS&ENDS|
|ラッキー☆オーブ|EXPO'19 主题曲，首次披露
|Decade|安可
|魔法みたいなミュージック！|安可
|Tell Your World|安可
"""

TOUR_ROWS["expo2020-eu"] = """
|テオ|
|A日程|ラズベリー＊モンスター|伦敦 / 柏林 / 巴塞罗那场次
|B日程|ヒビカセ|巴黎 / 阿姆斯特丹场次
|ワールドイズマイン|
|A日程|スイートマジック|
|B日程|ココロ|
|A日程|脱法ロック|
|B日程|右肩の蝶|
|8HIT|
|あったかいと|
|ラムネイドブルーの憧憬|
|ハイパーリアリティショウ|首次披露
|Miku|
|MikuFiesta|乐曲比赛'20 大奖，首次披露
|A日程|No Logic|
|B日程|Never Die|
|それがあなたの幸せとしても|
|Jump for Joy|
|A日程|ローリンガール|
|B日程|アンハッピーリフレイン|
|ヒバナ|
|大江戸ジュリアナイト|
|Decade|
|Blue Star|
|魔法みたいなミュージック！|
|ODDS&ENDS|
|Tell Your World|
|Sharing The World|安可
|劣等上等|安可
|ラッキー☆オーブ|安可
"""

TOUR_ROWS["expo2023-vr"] = """
|ナイフ、ナイフ、ナイフ|首次披露
|Acceleration（Breeze Remix）|首次披露
|フロイライン＝ビブリォチカ|首次披露
|リテラシー|首次披露
|Midnight Surf|首次披露
|1+1|首次披露，乐曲指定枠
|ワンダーラスト|首次披露
|vivid|首次披露
|Karma|首次披露
|エゴロック（long ver.）|首次披露
|しんでしまうとはなさけない！|首次披露
|Plaything|乐曲比赛'23 大奖，首次披露
|Tell Your World|
|imaginary love story|EXPO'23 主题曲，首次披露
"""

TOUR_ROWS["kodo2017"] = """
|千本桜|
|ゴーストルール|
|初音ミクの消失|
|エイリアンエイリアン|首次披露
|ワールズエンド・ダンスホール|
|紅一葉|首次披露
|からくりピエロ|
|ロミオとシンデレラ|
|裏表ラバーズ|
|#巴|鼓童原创曲
|#蜂の風|鼓童原创曲
|リモコン|
|いーあるふぁんくらぶ|原曲版首次上演
|celluloid|
|Packaged|
|積乱雲グラフィティ|
|#SHAKE|鼓童原创曲
|ワールドイズマイン|
|初音ミクの激唱|
|39|
|Tell Your World|
|桜ノ雨|首次披露
"""

TOUR_ROWS["kodo2018"] = """
|みんなみくみくにしてあげる♪|
|ラズベリー＊モンスター|
|ヒビカセ|
|ビバハピ|首次披露
|ロキ|首次披露
|いーあるふぁんくらぶ|
|#三宅|鼓童原创曲
|#南部牛追歌|鼓童原创曲
|独りんぼエンヴィー|
|結ンデ開イテ羅刹ト骸|
|ワールズエンド・ダンスホール|
|ルカルカ★ナイトフィーバー|
|#能菅＋平胴|鼓童原创曲
|#巴|鼓童原创曲
|#巡 -MEGURU-|鼓童原创曲
|初音ミクの激唱|
|8HIT|日本国内首次披露
|リモコン|
|#族|鼓童原创曲
|ワールドイズマイン|
|Tell Your World|
|ハジメテノオト|
|Satisfaction|安可
|千本桜|安可
|桜ノ雨|安可
|メルト|安可
"""

TOUR_ROWS["kodo2023"] = """
|NEPPUU〜熱風〜|鼓童'23 主题曲，首次披露
|Sweet Devil|
|ヒバナ -Reloaded-|
|太陽系デスコ|
|#いのち もやしてたたけよ|鼓童原创曲
|2023-06-03|#巴|鼓童原创曲，首日
|2023-06-04|#三宅|鼓童原创曲，次日
|祭りだヘイカモン|首次披露
|どりーみんチュチュ|
|大江戸ジュリアナイト|
|Amazing Dolce|
|#LION（獅子吼）|鼓童原创曲
|glow|
|僕が夢を捨てて大人になるまで|
|#BURNING|鼓童原创曲
|劣等上等|
|リモコン|
|いーあるふぁんくらぶ|
|#巡 -MEGURU-|鼓童原创曲
|ワールドイズマイン|
|グリーンライツ・セレナーデ|
|Tell Your World|
|千本桜|安可
|blessing|安可
|Hand in Hand|安可
"""

TOUR_ROWS["mwy2020"] = """
|Tell Your World|
|Sweet Devil|
|砂の惑星|
|FREELY TOMORROW|
|COME BACK〜重返巅峰〜|乐曲比赛'19 大奖
|きみとぼくのレゾナンス|
|Amazing Dolce|
|Gimme×Gimme|
|劣等上等|
|ルカルカ★ナイトフィーバー|
|みかぼし|
|Calc.|
|踏步, 出发|乐曲比赛'20 大奖，首次披露
|Pick Me Up|乐曲比赛'18 大奖
|shake it！|
|ぽかぽかの星|
|ワールドイズマイン|
|Hand in Hand|
"""

TOUR_ROWS["mwy2021"] = """
|ゴーストルール|
|太陽系デスコ|
|Pick Me Up|乐曲比赛'18 大奖
|ワールズエンド・ダンスホール|
|インタビュア|
|踏步, 出发|乐曲比赛'20 大奖
|シャボン|
|すろぉもぉしょん|
|COME BACK〜重返巅峰〜|乐曲比赛'19 大奖
|星空クロノグラフ|
|レイニースノードロップ|
|ドクター＝ファンクビート|
|ロキ|
|DECORATER|
|Hand in Hand|
|ハジメテノオト|
|My Stage With You|WITH YOU'21 主题曲，首次披露
"""

TOUR_ROWS["mikuday2010"] = """
|ハジメテノオト|首次披露
|Project Diva desu.|首次披露
|ワールドイズマイン|
|えれくとりっく・えんじぇぅ|首次披露
|サウンド|首次披露，嘉宾 baker
|恋スルVOC@LOID|
|Dear cocoa girls|首次披露
|StargazeR|首次披露
|The secret garden|首次披露
|ミラクルペイント|メドレー①
|Innocence|メドレー①
|ハト|メドレー①
|みくみく菌にご注意♪|メドレー①
|ぽっぴっぽー|メドレー①
|サヨナラ・グッバイ|メドレー①
|ミラクルペイント|嘉宾 OSTER project 版
|ロミオとシンデレラ|嘉宾 doriko
|Dear|嘉宾 19's Sound Factory
|裏表ラバーズ|首次披露
|パズル|首次披露
|VOiCE|首次披露
|1/6 -out of the gravity-|首次披露，嘉宾 ぼーかりおどP
|星屑ユートピア|首次披露
|ダブルラリアット|首次披露，嘉宾 アゴアニキ
|Just Be Friends|首次披露
|magnet|首次披露
|Alice|首次披露
|あなたの歌姫|
|moon|
|初音ミクの消失|
|炉心融解|
|ココロ|嘉宾 baker
|右肩の蝶[39's Giving Day Edition]|
|Promise|嘉宾 samfree
|from Y to Y|
|サイハテ|嘉宾 小林オニキス
|ストロボナイツ|
|SPiCa|嘉宾 とく
|愛言葉|安可，嘉宾 DECO*27
|メルト|安可
"""

TOUR_ROWS["lp2011-tokyo"] = """
|Ievan Polkka|特别披露
|こっち向いて Baby|首次披露
|二息歩行|首次披露，嘉宾 DECO*27
|アルビノ|首次披露，嘉宾 buzzG
|え？あぁ、そう。|首次披露
|ぽっぴっぽー|メドレー①
|トリノコシティ|メドレー①
|キャットフード|メドレー①
|崩壊歌姫-disruptive diva-|メドレー①
|白い雪のプリンセスは|メドレー①
|ワールズエンド・ダンスホール|メドレー①
|ダブルラリアット|メドレー①
|No Logic|メドレー①
|RIP=RELEASE|メドレー①
|Japanese Ninja No.1|メドレー①
|ルカルカ★ナイトフィーバー|メドレー①
|結ンデ開イテ羅刹ト骸|
|ローリンガール|
|trick and treat|
|悪ノ娘|
|悪ノ召使|
|いろは唄|
|炉心融解|メドレー②
|ココロ|メドレー②
|メランコリック|メドレー②
|リンリンシグナル|メドレー②
|SPICE!|メドレー②
|Fire◎Flower|メドレー②
|Packaged|メドレー②
|＊ハロー、プラネット。|メドレー②
|マージナル|メドレー②
|初音ミクの激唱|メドレー②
|歌に形はないけれど|
|Yellow|
|タイムマシン|嘉宾 164、40mP
|ARiA|
|カラフル×メロディ|安可，嘉宾 OSTER project
|メルト|安可
|初めての恋が終わる時|双安可
"""

TOUR_ROWS["lp2011-sapporo"] = """
|星のカケラ|首次披露
|こっち向いて Baby|
|二息歩行|
|アルビノ|
|え？あぁ、そう。|
|ローリンガール|
|結ンデ開イテ羅刹ト骸|
|いろは唄|
|悪ノ娘|
|悪ノ召使|
|Fire◎Flower|
|メランコリック|
|初めての恋が終わる時|
|初音ミクの激唱|
|RIP=RELEASE|
|ルカルカ★ナイトフィーバー|
|私の時間|首次披露
|ぽっぴっぽー|
|＊ハロー、プラネット。|
|歌に形はないけれど|
|Yellow|
|タイムマシン|
|ARiA|
|メルト|
|カラフル×メロディ|安可
|Starduster|安可，首次披露
"""

TOUR_ROWS["lp2012-hk-tw"] = """
|みくみくにしてあげる♪|
|恋色病棟|
|カラフル×メロディ|
|ロミオとシンデレラ|
|ローリンガール|
|trick and treat|
|メランコリック|
|ココロ|
|右肩の蝶|
|Fire◎Flower|
|私の時間|
|ぽっぴっぽー|
|Yellow|
|トリノコシティ|
|初音ミクの激唱|
|RIP=RELEASE|
|ダブルラリアット|
|ルカルカ★ナイトフィーバー|
|歌に形はないけれど|
|初めての恋が終わる時|
|こっち向いて Baby|
|白い雪のプリンセスは|
|Tell Your World|
|メルト|安可
|Starduster|安可
"""

TOUR_ROWS["lp2012-tokyo"] = """
|星のカケラ|
|初めての恋が終わる時|
|二息歩行|
|アルビノ|嘉宾 buzzG
|え？あぁ、そう。|
|マージナル|嘉宾 OSTER project
|恋色病棟|
|ローリンガール|
|私の時間|
|ぽっぴっぽー|嘉宾 ラマーズP
|＊ハロー、プラネット。|
|結ンデ開イテ羅刹ト骸|
|初音ミクの激唱|
|RIP=RELEASE|
|ダブルラリアット|嘉宾 アゴアニキ
|ルカルカ★ナイトフィーバー|
|メランコリック|
|ココロ|
|いろは唄|
|悪ノ娘|
|悪ノ召使|
|Fire◎Flower|
|Pane dhiria|首次披露
|白い雪のプリンセスは|
|こっち向いて Baby|
|Yellow|
|タイムマシン|
|ARiA|嘉宾 とくP
|みくみくにしてあげる♪|
|カラフル×メロディ|安可
|歌に形はないけれど|安可
|メルト|安可
|Starduster|安可，首次披露
"""

TOUR_ROWS["lp2013-sapporo"] = """
|千本桜|首次披露
|恋色病棟|
|カラフル×メロディ|
|私の時間|
|Yellow|
|ぽっぴっぽー|
|トリノコシティ|
|メランコリック|
|ココロ|
|Fire◎Flower|
|右肩の蝶|
|ローリンガール|
|結ンデ開イテ羅刹ト骸|
|ロミオとシンデレラ|
|ピアノ×フォルテ×スキャンダル|首次披露
|Pane dhiria|
|千年の独奏歌|首次披露
|ダブルラリアット|
|ルカルカ★ナイトフィーバー|
|初めての恋が終わる時|
|こっち向いて Baby|
|白い雪のプリンセスは|
|初音ミクの激唱|
|Tell Your World|
|メルト|安可
|letter song|安可，首次披露
"""

TOUR_ROWS["lp2013-kansai"] = """
|秘密警察|首次披露
|マージナル|
|二息歩行|
|え？あぁ、そう。|
|恋色病棟|
|カラフル×メロディ|
|＊ハロー、プラネット。|
|いろは唄|
|メランコリック|
|ココロ|
|ぽっぴっぽー|
|白い雪のプリンセスは|
|アルビノ|
|ロミオとシンデレラ|
|ローリンガール|
|結ンデ開イテ羅刹ト骸|
|Pane dhiria|
|千年の独奏歌|
|RIP=RELEASE|
|ダブルラリアット|
|ルカルカ★ナイトフィーバー|
|私の時間|
|みくみくにしてあげる♪|
|ピアノ×フォルテ×スキャンダル|
|トリノコシティ|
|歌に形はないけれど|
|Yellow|
|タイムマシン|
|ARiA|
|右肩の蝶|
|Fire◎Flower|
|初めての恋が終わる時|
|千本桜|
|こっち向いて Baby|
|初音ミクの激唱|
|メルト|
|Tell Your World|安可
|letter song|安可
|Starduster|双安可
"""

TOUR_ROWS["mm2014"] = """
|カゲロウデイズ|首次披露
|二次元ドリームフィーバー|
|心臓デモクラシー|首次披露
|ありふれたせかいせいふく|
|スキキライ|
|からくりピエロ|
|Weekender Girl|
|FREELY TOMORROW|
|深海少女|
|ピアノ×フォルテ×スキャンダル|
|erase or zero|
|glow|
|Hello, Worker|
|アカツキアライヴァル|首次披露
|ワンダーランドと羊の歌|首次披露
|Tell Your World|
|東京テディベア|
|Last Night, Good Night（Re:Dialed）|
|キャットフード|
|EARTH DAY|首次披露
|ゆめゆめ|
|ODDS&ENDS|
|Sweet Devil|安可
|shake it！|安可
|39|安可
"""
