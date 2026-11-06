---
name: update-concert-data
description: Add or correct Hatsune Miku concert setlists in the miku-concert-stats catalog by collecting per-city, per-slot song lists from the 初音ミク Wiki (atwiki) and the official sites, filling in Chinese and English song titles from official names, voca.wiki and 萌娘百科, then rebuilding the derived 場次 layer and the review reports. Use when asked to 更新歌单数据, 补录某场演出, 对齐百科逐曲表, add a tour's setlist, 补歌名中文译名, fix a wrong setlist, or refresh docs/setlist-confirmation.md.
disable-model-invocation: true
---

# 更新演唱会歌单数据

> Cursor 专用内部流程，不发布到仓库根的 `skills/`（那是给外部 agent 的公开 skill）。

> 用户只给了一个网址 / 页面元素 / 贴过来的表格，要录入或核对**单场**歌单时，走
> [../ingest-setlist-from-page/SKILL.md](../ingest-setlist-from-page/SKILL.md)；
> 本文件负责从系列层面把整段巡演补齐。

一条歌单从百科表格到站点显示要过五道工序：**抓表 → 定归属 → 对曲名 → 展开场次 → 出报告**。
每一步都有脚本，手改中间产物会在下一次生成时被覆盖。

## 0. 先读这份事实

- 目录里一个「演出」是某城市的一站（`performances.id`，VocaDB 的 Event）；
  一个「场次」是某天的一场（`performance_show_setlists.show_key`，形如 `6045:2023-08-11:day`）。
- 同一份 VocaDB songList 常被十几个演出共用，且没有分场备注 —— 这正是要换成百科逐曲表的原因。
- 百科逐曲表在「区分」列标出差异：`公演替`（城市 / 日程）、`備考`（首日·次日、昼·夜）。
  没标的行 = 该表所有演出都唱。
- VocaDB 只是个曲名与歌曲 id 的字典；**曲目本身不再以它为准**。

## 1. 数据放在哪

| 路径 | 是什么 | 谁写 |
| --- | --- | --- |
| `data/wiki-raw/<key>.json` | 页面表格的原始单元格（含表头）+ `page` | **人工/agent 抓取后直接写入** |
| `scripts/wiki_raw_spec.py` | 每张 raw 表的标记 → 演出映射 | 手改 |
| `scripts/wiki_tour_tables.py` | 手抄的城市级表（EXPO 2014–2020、Live Party、鼓童、未来有你、魔法未来 2014） | 手改 |
| `data/wiki-setlists.json` | 逐行数据（`title` + `when`） | `wiki-setlists-source.py` |
| `data/wiki-title-aliases.json` | 百科写法 → catalog 写法 | 手改 |
| `data/song-titles.zh-CN.json` | 歌曲中文名（`id → { title, source, comment }`），页眉开关控制显示 | 手改，见 §5「中文译名与英文名」 |
| `data/increments/0015-song-english-names.sql` | VocaDB 没给英文名的 `songs.name_en` 补写 | 手改 |
| `data/wiki-songs.json` | catalog 里没有的歌（VocaDB 能查到） | `fetch-wiki-songs.py` |
| `data/increments/0009-wiki-songs.sql` | 上面那些歌的 `INSERT OR IGNORE` | `fetch-wiki-songs.py` |
| `data/wiki-repertoire.json` | catalog 和 VocaDB 都没有的曲目：类别、作曲者、备注、保留 id | **手改** |
| `data/increments/0010-wiki-repertoire.sql` | 上面那些曲目的 `INSERT OR IGNORE`（带 `category`） | `fetch-wiki-songs.py` |
| `data/performance-setlists.json` | 每个演出的 `setlist` / `slots` / `sources` / `note` | `build-setlist-curation.py` |
| `data/increments/0008-performance-setlists.sql` | 派生层（`performance_setlists` 等 4 张表） | `pnpm derive:setlists` |

`0008` 和 `0009` 都是生成物：不要手改，改上游再重跑。

## 2. 跑一遍的顺序

```bash
uv run scripts/wiki-setlists-source.py      # raw → data/wiki-setlists.json
uv run scripts/fetch-wiki-songs.py          # 缺失曲名 → data/wiki-songs.json + 0009
pnpm build:catalog                          # 让 0009 的歌进 catalog
uv run scripts/build-setlist-curation.py    # → data/performance-setlists.json
pnpm derive:setlists                        # → data/increments/0008-*.sql
pnpm build:catalog
pnpm report:confirmation                    # docs/setlist-confirmation.md
pnpm report:setlist-review --force          # docs/reports/setlist-review.md
pnpm test && pnpm lint && pnpm typecheck
```

两次 `pnpm build:catalog` 各有用途：第一次让后续步骤看到 `0009` 新增的歌；
最后一次产出站点实际加载的 `catalog.sqlite(.gz)`（`confirmation-report.py` 也直接读它）。

两个生成脚本都幂等：连跑两次，`data/wiki-setlists.json` 与 `data/performance-setlists.json`
的 `git diff` 应为空。（`0008` 首行的 `Generated:` 时间戳每次都会变，用 `pnpm derive:setlists --check`
判断它是否过期，别看 diff。）

## 3. 抓百科表格

`w.atwiki.jp` 对 curl 返回 403，用已登录的浏览器（`cursor-ide-browser`）在**同一域名下**
`fetch` 页面再 `DOMParser` 解表。完整脚本与表格陷阱见 [scrape-atwiki.md](scrape-atwiki.md)：
把 `Runtime.evaluate` 返回的网格数组原样写进 `data/wiki-raw/<key>.json`（`page` 填 atwiki 页号）。

> 不要用 `browser_navigate` + 截图核对表格，`rowspan` 会让表格错行；必须做 rowspan/colspan 展开。

## 4. 定归属

新建的 raw 表要在 `scripts/wiki_raw_spec.py` 的 `RAW_SPEC` 里登记：

```python
"mm2025": {
    "performances": [8768, 8769, 8770],          # 这张表覆盖的演出 id
    "labels": {8768: "仙台", 8769: "大阪", 8770: "东京"},  # 页面上显示的城市名
    "markers": {                                  # 公演替列的值 → 场次约束
        "仙台": ["8768"], "大阪": ["8769"], "東京": ["8770"],
        "昼公演": ["*:day"], "夜公演": ["*:night"],
    },
},
```

先查出演出 id：

```sql
SELECT id, name, start_date FROM performances WHERE name LIKE '%2027%' ORDER BY start_date;
```

约束语法（`parse_constraint`）：

| 写法 | 含义 |
| --- | --- |
| `6516` | 该演出的全部场次 |
| `6516#2` | 该演出第 2 个日期（按日期排序） |
| `*#1` | 本表任意演出的第 1 个日期 |
| `*:day` / `*:night` | 本表全部日场 / 夜场 |
| `6516#2:night` | 第 2 个日期的夜场 |

多个约束可以并列，一行命中多个就展开成多行。`公演替` 里只有 `※` 的行表示百科没写哪些城市唱，
**不要猜**：脚本会把它记进 `unattributed`，最终写进演出层 `note`。

没有 `公演替` 列、昼夜差异只写在 `備考` 的表（如魔法未来 2013 的 `夜公演限定`）用 `noteMarkers`：

```python
"mm2013": {
    "performances": [2519],
    "labels": {2519: "横浜"},
    "markers": {},
    "noteMarkers": {"夜公演限定": ["*:night"]},
},
```

小表（单城市、无日程切分）也可以直接手抄进 `wiki_tour_tables.py` 的 `TOUR_ROWS`，
标记写成城市名或 `day` / `night` / `2023-06-04`。

城市写在 `備考` 而不是 `公演替` 的表走不了 raw 路径（`RAW_SPEC` 只读 `公演替`），照 `TOUR_ROWS` 手抄。

交响乐又是另一种：它的表没有 `公演替` 列，城市差异写在 `備考` 里，所以模板在
`scripts/wiki-setlists-source.py` 的 `TABLES` / `ROWS`（键形如 `"2024-横滨神户"`，行内备注写城市名，
脚本按城市名过滤）。加新的一年时就照那里补一段。

## 5. 对曲名

解析顺序：`data/wiki-title-aliases.json` → catalog 的 `name/name_ja/name_en` 归一化匹配
（去括号、空格、标点，全角转半角、转小写）。

只有别名表放过**纯写法差异**：`DECORATER`→`DECORATOR`、`右肩の蝶[39's Giving Day Edition]`→`右肩の蝶`、
`キミぺディア`→`キミペディア`。改变曲目身份的写法不许进别名表。

catalog 里没有的歌由 `fetch-wiki-songs.py` 去 VocaDB 找：标题必须精确命中，且命中的条目
`artistString` 要含百科写的作曲者（同名翻唱极多，只靠标题会挂错）。规则都在 `COMPOSERS` 里，
新曲名补一条。搜不到就不写 —— **宁可缺，不要错**。

VocaDB 查不到、但确实是演过的曲目**必须登记**，否则演出页的歌单是残的。逐条加进
`data/wiki-repertoire.json`：

```json
"交響曲第9番": {
  "id": 2000000003,
  "category": "classical",
  "artist": "ベートーヴェン",
  "note": "贝多芬《第九交响曲》，神戸公演安可的管弦乐版"
},
"ぽっぴっぽー（Grand Finale）": { "id": null, "skip": true, "category": "vocaloid", "artist": "ラマーズP", "note": "…" }
```

- `id` 从 2,000,000,000 起（`shared/repertoire.ts` 的 `LOCAL_SONG_ID_BASE`），**只分配一次**，
  保证不与 VocaDB 的 song id 冲突。这些 id 没有 VocaDB 页面，`collect:producers` / `collect:vocalists`
  已经按上界跳过它们；新增调用 VocaDB 歌曲接口的脚本也要照做。
- `category`：`classical`（古典・管弦乐）、`traditional`（民谣・圣诞曲等传统曲）、
  `instrumental`（鼓童原创器乐曲）、`vocaloid`（确实是 VOCALOID 歌，只是 VocaDB 只返回同名翻唱）。
  前三类没有歌手，`artist` 填作曲者；`songs.artist_string` 只有名字、不带 `feat.`。
- `skip: true` 只给「同一场里再演一遍同一首」（会重复计数），它会写进演出 `note` 但不进曲目。
- `note` 是中文说明，会显示在曲目页，讲清类别和出处。

舞台段落行（`MC…`、`《アンコール》`、`バンドメンバー紹介`、`…パート`）不是曲目，
`wiki-setlists-source.py` 已经跳过，不要登记。

### 中文译名与英文名

中文曲名不走 catalog，写在 `data/song-titles.zh-CN.json`（`id → { title, source, comment }`）；
英文名走 `songs.name_en`，VocaDB 没给时补在 `data/increments/0015-song-english-names.sql`（`UPDATE`，可重复执行）。
新歌单第一次出现的歌，逐首查 `data/song-titles.zh-CN.json` 有没有它的 id，没有就按下面的顺序补，
**不许因为查不到就跳过**：

1. **官方中文译名**。Crypton / 初音未来官方中文频道、官方 bilibili 号、官方专辑的中文曲名优先，
   `source` 写 `官方中译`。
2. **民间约定俗成的译名**。先查 [voca.wiki](https://voca.wiki)（术力口百科）条目 infobox 的 `歌曲名称` 栏，
   第三行通常就是通行译名（`サンドリヨン` → `Cendrillon` → `灰姑娘`）；再查
   [萌娘百科](https://zh.moegirl.org.cn)的条目名与正文首段。`source` 写 `vocawiki` 或 `萌娘百科`。
   两站都能直接抓源码（`https://voca.wiki/api.php?action=parse&page=<标题>&prop=wikitext&format=json`），
   比截图核对可靠。早前从 VocaDB 别名表取的 `vocadb-alias` 也算这一档，但要当心繁体和音译。
3. **自己翻译**。前两档都没有才动手，`source` 写 `人工核定`，`comment` 写清依据（如「直译」）。
   宁可直译也不编造。

补充规则：

- **假名形式的英文词直接保留英文**：曲名本身是英文语句的假名写法时（`クリスタルスノウ` → `Crystal Snow`、
  `サンドリヨン` → `Cendrillon`、`ダンスロボットダンス` → `Dance Robot Dance`），
  中文显示名直接用这个英文，不再译成中文；同时把它写进 `songs.name_en`，让 `shared/lookup.ts` 的检索也能命中。
  判断标准是原曲有没有官方英文名，不要自行把片假名音译成英文。
- 资料给的是 `中文/English` 混排时按这个拆：前半进 `title`，英文进 `name_en`，**不要**把英文留在中文名里，
  也不要塞进 `comment`。
- 一个 id 只留一个显示名；第二种通行写法写进 `comment`（`另译：…`）。
- 中文名与日文原名完全相同的（`心拍数♯0822`、`再教育`、`巴`）不要登记：`formatSongTitle` 遇到同名只显示原名，
  写进去只会虚增映射条数。
- 非 VOCALOID 曲目换来源：古典曲目查 zh.wikipedia 的条目名（`第5号钢琴协奏曲 (贝多芬)`、`Sleigh Ride` → `滑雪橇`），
  鼓童这类器乐曲多半是汉字同名，只需简繁转换（`LION（獅子吼）` → `LION（狮子吼）`，`source` 写 `简繁转换`）。
- 键按数值升序，`title` 与 `source` 不能为空，id 必须真的在 catalog 里，否则 `tests/song-titles.test.ts` 会挂；
  那个测试只校验已登记的条目，**不会提示你漏了哪首**。
- 一次补很多条时，先列一张 `tmp/` 下的对照表（id / 原名 / 现名 / 建议 / 依据）给人过目，再写回 JSON。

## 6. 展开场次

`build-setlist-curation.py` 把每行 `when` 判给具体 `show_key`：`""` 表示所有场次，
`day` / `night` 匹配半天，`d2` 是第 2 个日期，`d2:night` 是第 2 个日期的夜场。
命中后写进 `performance-setlists.json`：

```json
"setlist": {
  "source": "https://w.atwiki.jp/hmiku/pages/67127.html",
  "title": "初音ミク Wiki：…（仙台）",
  "accessedAt": "2026-11-06",
  "confidence": "medium",
  "label": "仙台",
  "songs":  [ /* 默认歌单，场次没命中 slot 时用 */ ],
  "slots":  [ { "match": "8768:2025-08-02:day", "songs": [ /* … */ ] } ]
}
```

`slots.match` 必须写完整 `show_key`。`shared/performance-setlists.ts` 按
`show_key → 日期:半天 → 日期 → 半天` 的顺序找第一个命中的 slot。

新演出的日程本身（哪天有几场）由 `add(...)` 决定，写在同一脚本前半部分；
`dayNight=[…]` 表示这些日期有昼场和夜场，`halves={…}` 表示某天只有一种。日程来源同样要记进 `sources`。

演出在 VocaDB 完全没有 songList 时，`performance_setlists.source_list_id` 会是 `NULL`、
`source_kind='wiki'`，页面会自动去掉 VocaDB 链接 —— 不需要特殊处理。

## 7. 验收

`pnpm derive:setlists` 的末行必须同时满足：

```
… 0 pending review, 0 conflicts
```

`fetch-wiki-songs.py` 会在某个手工登记的曲名后来出现在 catalog 里时打印 `NOTE … is now in the catalog`，
看到就把它从 `data/wiki-repertoire.json` 删掉，避免同一首歌两条记录。

每个演出都必须至少有一条来源（`performance_setlist_sources`）。下面的查询有结果就是漏登记：

```sql
SELECT ps.performance_id, p.name FROM performance_setlists ps
  JOIN performances p ON p.id = ps.performance_id
 WHERE NOT EXISTS (SELECT 1 FROM performance_setlist_sources s WHERE s.performance_id = ps.performance_id);
```

`source_kind='vocadb'` 的演出用 VocaDB 歌单本身配日程来源（官方票务页 / Fandom / 萌娘），
`source_kind='wiki'` 的演出用逐曲表页面；两者都要有链接。

演出层 `note` 里不应再出现「未计入」的曲名（同曲再演的 `skip` 除外）——那说明有一条歌单行没登记。
曲目页对非 VOCALOID 行显示「非 VocaDB 曲目・类别」并要求 `songs.category <> 'vocaloid'`。

再加两条 SQL：

```sql
SELECT COUNT(*) FROM performance_show_setlists WHERE uncertain = 1;   -- 必须是 0
SELECT show_key, item_count FROM performance_show_setlists
 WHERE performance_id = <id> ORDER BY show_key;                        -- 逐场核对条数
```

- 同一演出的各场条数应等于百科「曲数」；差异必须能在 `note` 里解释（城市替换、安可追加）。
- `uncertain` 出现 `setlist length mismatch` 通常是行归属错了（跨城市串行、昼夜没分开）；
  **不要**用 `explainedLengths` 压掉，先查因。百科来源的演出本来就不做长度比对。
- `tests/catalog.test.ts` 里钉了总演出数、wiki-only 演出 id 列表、若干逐场条数，改动后要一起更新。
- 抽两条页面确认渲染：`/shows/<id>`（场次标题、逐曲来源、note 横幅）与 `/raw`。

新歌单还要查一遍还没中文名的曲目（中文名在 JSON 里，SQL 查不到，只能两边对照）：

```python
import json, sqlite3

db = sqlite3.connect("public/data/catalog.sqlite")
known = json.load(open("data/song-titles.zh-CN.json"))
missing = [row for row in db.execute("SELECT id, name FROM songs WHERE name_en IS NULL") if str(row[0]) not in known]
print(missing)  # 每一条都要么在 JSON 里有中文名，要么本来就是英文/汉字名
```

## 8. 收尾

- 汇报口径：本次新增/改动的演出数、新增歌曲数、未匹配的曲目标题、还没中文／英文名的曲目、仍无歌单的演出。
- 提交信息写清改了什么源；**不要**加 Cursor 的 co-author trailer。
- 只要 `docs/setlist-confirmation.md` 的「待核实 / 冲突」不再是 0，就不要提交 —— 先修数据。
