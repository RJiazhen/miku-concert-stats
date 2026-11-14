---
name: ingest-setlist-from-page
description: Reads a concert setlist from a URL, DOM path, CSS selector, or pasted table the user names, then imports it into the miku-concert-stats catalog or diffs it against the recorded 場次 rows and queues the conflict in tmp/ for confirmation. Use when the user supplies a page or element and asks to 读取歌单 / 录入 / 入库 / 核对 / 比对歌单, or says that page is the authoritative setlist for a 演出.
---

# 从指定页面录入歌单

> 用户给一个网址（或页面元素、直接贴过来的表格）并说「录入」时走这里。
> 一次补整段巡演、跨年份把某个系列的歌单补齐，走 [../update-concert-data/SKILL.md](../update-concert-data/SKILL.md)。

## 一句话判定

| 目录现状 | 动作 |
| --- | --- |
| 页面表格与已存 raw 一致，且逐场曲目与现有记录一致 | 只回「已录入」并列出证据，不跑管线、不改文件 |
| 目录里没有这个演出的场次层（或演出本身还没登记） | 补齐元数据后直接写入 |
| 有记录但与来源不一致 | 只写 `tmp/setlist-<id>-conflict.md`，等确认，不改数据 |

「一致」是**逐场**比较：场次怎么拆、每场唱什么、顺序如何，三者都对上才算一致。
顺序不同也是不一致。

## 0. 这个仓库的默认习惯

- **先查再动手**：用户常把已经录过的表再贴一次。先比对 `data/wiki-raw/` 与现有场次层，一致就直接回答，不要重跑一遍生成链。
- **不猜**：曲名对不上就留空并写进 note，绝不挑一个「看起来像」的 id。归属不明（`※`、没写城市）的行不分配。
- **证据齐全**：任何外部事实都带 `source`（可点开的 URL）、`accessedAt`（`YYYY-MM-DD`）、`confidence`（`high` 仅官方页，百科 `medium`）。
- **只改上游**：`data/wiki-setlists.json`、`data/performance-setlists.json`、`data/increments/0008-*.sql`、`public/data/catalog.sqlite*` 都是生成物，手改会在下一次生成时被覆盖。
- **有冲突先停**：只落 `tmp/`（已被 `.gitignore` 忽略）的对照 md，等用户确认后再写。
- **收尾即提交**：lint / test / typecheck 通过后直接提交并 push 当前分支；提交信息用简短祈使句英文，不加任何 co-author 尾注。
- **留服务器**：动了用户可见的数据就留一个 dev server（直接 `vp run dev`，读打印出的 `Local:` 地址，不要传 `--port`），并把该地址告诉用户。
- **回复**：中文、结论先行、不复述工具过程。

## 1. 接住输入

| 用户给的 | 处理 |
| --- | --- |
| 完整 URL + 元素（DOM path / CSS selector） | 只取元素命中的那张表；同页多表时不要靠猜，路径指向哪张就是哪张 |
| 完整 URL，没给元素 | 先看页面里有几张表；能唯一确定（含 `曲名` 表头的只有一张）就直接用，否则用 AskQuestion 问一次 |
| atwiki 页号（如 `79886`） | 视为 `https://w.atwiki.jp/hmiku/pages/79886.html` |
| 直接贴过来的表格 HTML / 文本 | 以贴的内容为准，不再抓页面；仍要做 rowspan / colspan 摊平 |
| 只给演出名或日期 | 这不是本 skill 的入口，先按名称查出页面，或让用户补页面 |

目标演出优先从页面标题、日期、城市推：`MIKU WITH YOU 2026` + 上海 → 演出 `13120`。
推不出、或一页覆盖多个演出时，只问一次（列出候选 id / 名称 / 日期）。

## 2. 来源能不能入库

| 来源 | 入库 | 说明 |
| --- | --- | --- |
| 初音ミク Wiki（`w.atwiki.jp/hmiku`） | 是 | 逐曲表主力，`confidence: medium` |
| 官方站（magicalmirai.com、mikuexpo.com、jvcmusic / FlyingDog、KARENT、官方票务页） | 是 | 日程与曲目，`confidence: high` |
| 萌娘百科、VocaDB Fandom | 是 | 带 CC BY-SA 署名 |
| VocaDB 公共 API | 是 | 与其他 wiki 同级：补曲名与歌曲 id，不决定曲目来源；已采集的数据不因它不同而改 |
| setlist.fm | **否** | 使用条款禁止保留副本（只能短暂缓存），也禁止抓取；只可在线核对 |
| LiveFans | **否** | `robots.txt` 屏蔽 AI 爬虫（GPTBot / ClaudeBot / GrokBot 等），不要自动抓 |
| Concert Archives / Discogs / VGMdb / 个人博客 / 视频简介 | 仅核对 | 可以把链接记成来源，但不整表照抄 |

用户点名要用被禁止的来源时，不要写库：说明限制，给官方页或百科的替代链接，必要时把差异写进 `tmp/` 的对照 md。

## 3. 把表读成网格

**atwiki**：按 [../update-concert-data/scrape-atwiki.md](../update-concert-data/scrape-atwiki.md) 的脚本做——
在同一域名下 `fetch` 页面 → `DOMParser` → 摊平 `rowspan` / `colspan` → 选表头以 `順` 开头且含 `曲名` 的表。
不要截图或视觉读表，合并单元格会让表格错行。

**其他站点**：同一套摊平逻辑，作用在用户给的元素上（`document.querySelector(<selector>)` 或按 DOM path 取到 table）。
只保留表头 + 数据行，不重排、不合并、不改写单元格文字。

保存格式如下，但**先别写进仓库**：按第 5 节比对，确认没有冲突后再落盘（第 6 节）。冲突时把网格写到 `tmp/setlist-<id>-new-grid.json` 作为对照证据。

```json
{ "page": "79886", "rows": [["順", "", "曲名", "作曲者", "公演替", "モジュ", "備考"], ["1", "-", "ローリンガール", "wawoka", "", "専用", ""]] }
```

- atwiki 用 `page`（页号）。其他站点用 `url`（完整 URL），不要伪造页号。
- `key` 用 `<系列>-<年份>`：`mm2026`、`mwy2026`、`expo2026-na`。同一巡演续办另建一个文件，不要覆盖旧表。
- `rows[0]` 必须含 `曲名`；否则先报错，不要硬塞。

## 4. 定位演出与场次

```sql
SELECT id, name, name_ja, venue_name, start_date, end_date, series_id, series_number
  FROM performances
 WHERE name LIKE '%2026%' OR name_ja LIKE '%2026%'
 ORDER BY start_date;
```

- 场地 / 日期 / 城市要能和页面上的日程对上。
- 演出**不在目录里**（VocaDB 没有这个 event）：按 `docs/data-issues.md` §4.5 补
  `data/increments/0005-manual-catalog.sql`，id 从 `3_000_000_000` 起
  （`LOCAL_PERFORMANCE_ID_BASE`），`source_url` 指向日程来源，`vocadb_status` 为 `NULL`；
  再在 `data/performance-setlists.json` 的 `statuses.<id>` 写 `upcoming`（若尚未举行）。
  先 `pnpm build:catalog`，后面的步骤才看得到这条演出。
- 一天几场看 `data/performance-setlists.json` 的 `performances.<id>`：`dayNight`、`halves`、
  `noShowDates`、`singleShowDates`。表里的 `公演替`（或 `備考` 里的 `昼公演` / `夜公演` / `1日目`）
  必须能落到这些场次上；落不上就是**场次结构冲突**，走第 5 节。

`.cursor/skills/update-concert-data/scripts/wiki_raw_spec.py` 的 `RAW_SPEC` 声明这张表覆盖哪些演出：

```python
"mwy2026": {
    "performances": [13120],
    "labels": {13120: "上海"},
    "markers": {
        "1日目昼": ["*#1:day"], "1日目夜": ["*#1:night"],
        "2日目昼": ["*#2:day"], "2日目夜": ["*#2:night"],
    },
},
```

约束语法：`6516` 全部场次、`6516#2` 第 2 个日期、`*#1` 任意演出的第 1 个日期、
`*:day` / `*:night` 半天、`6516#2:night` 指定日期与半天。一行写多个约束就展开成多行。
只有 `※` 的 `公演替` 表示「百科没写哪些城市」，不要归位，脚本会记进 `unattributed` 并写进演出 note。

## 5. 先比对，再决定写不写

先确认 catalog 是新的：`pnpm build:catalog`。然后逐场取出已有曲目：

```bash
sqlite3 public/data/catalog.sqlite "
SELECT i.show_key, i.position, COALESCE(s.name_ja, s.name, '?')
  FROM performance_show_setlist_items i
  LEFT JOIN songs s ON s.id = i.song_id
 WHERE i.performance_id = <id>
 ORDER BY i.show_key, i.position;"
```

比较规则与 `.cursor/skills/update-concert-data/scripts/build-setlist-curation.py` 的 `normalize_title` 一致：NFKC、去掉括号内容、
去掉空白与常见标点、转小写；再套 `data/wiki-title-aliases.json` 的纯写法差异。
新表先按 §4 的 markers 展开到 `show_key`（没有标记的行属于该演出所有场次），再逐场比较。

| 结果 | 动作 |
| --- | --- |
| 每个 `show_key` 的曲目集合与顺序都相同 | 回「已录入」+ 演出 id / 场次数 / 每场条数 / 现有来源 URL，停 |
| 目录里这个演出没有任何 `performance_show_setlist_items` | 直接进入第 6 节 |
| 曲目增删、顺序变化、某首歌换了场次、或场次结构变化 | 写 `tmp/setlist-<id>-conflict.md`（模板见文末），停 |

同一个演出涉及多个 id 时，每节一个 id；也可以共用一个 `tmp/setlist-conflict-<YYYY-MM-DD>.md`。
md 写完后不要动任何 `data/` 文件，也不要提交。

如果用户明确说「以这个页面为准，直接覆盖」，这次可以跳过等待，但仍要把差异写进 md 并在回复里贴出摘要。

## 6. 写入（没有冲突时）

顺序不能乱：

```bash
# 0. 先把网格写进 data/wiki-raw/<key>.json，并在 .cursor/skills/update-concert-data/scripts/wiki_raw_spec.py 的 RAW_SPEC 登记
uv run .cursor/skills/update-concert-data/scripts/wiki-setlists-source.py     # raw → data/wiki-setlists.json
uv run .cursor/skills/update-concert-data/scripts/fetch-wiki-songs.py         # 缺失曲名 → data/wiki-songs.json + 0009
pnpm build:catalog                         # 让 0009 的歌进 catalog
uv run .cursor/skills/update-concert-data/scripts/build-setlist-curation.py   # → data/performance-setlists.json
pnpm derive:setlists                       # → data/increments/0008-*.sql
pnpm build:catalog                         # 站点实际加载的 catalog
pnpm report:confirmation                   # docs/setlist-confirmation.md
pnpm report:setlist                        # docs/reports/setlist-differences（改数据后必跑）
```

- 来源标题与 note 的前缀由来源 URL 决定（`.cursor/skills/update-concert-data/scripts/build-setlist-curation.py` 的 `source_site_label`）：atwiki 写「初音ミク Wiki」，萌娘百科、VocaDB Fandom 各自成文，其他域名回落成主机名。所以 `url` 字段要填真页址，不要借 atwiki 页号。
- 若来源还确认了日程（某天两场、只有一场、某天只有企划展），在
  `.cursor/skills/update-concert-data/scripts/build-setlist-curation.py` 里按现有 `add(...)` 加一条。注意：同一演出如果有百科逐曲表，
  这个 `add()` 的 `sources` 会被逐曲表的来源整条替换（`existing["sources"] = [source_entry]`），
  需要留档的日程证据写进 `note`。
- 曲名解析不出来的行**不会**丢，会进演出 `note` 的「未登记」列表。处理方式二选一：
  - 纯写法差异 → `data/wiki-title-aliases.json`（如 `キミぺディア` → `キミペディア`）；
  - catalog / VocaDB 都没有的曲目 → `data/wiki-repertoire.json`，id 从 `2_000_000_000` 起只分配一次，
    标 `category`（`classical` / `traditional` / `instrumental` / `vocaloid`），同曲再演用 `skip: true`。
  改完重跑本节命令，直到 note 里不再有「未登记」。
- `fetch-wiki-songs.py` 打印 `NOTE … is now in the catalog` 时，把那条从 `data/wiki-repertoire.json` 删掉。

## 7. 验收

```bash
pnpm derive:setlists --check        # 生成物是否最新
pnpm report:setlist --check         # 差异报告是否过期（第 6 节已重生成）
NUXT_IGNORE_LOCK=1 pnpm test
NUXT_IGNORE_LOCK=1 pnpm lint
NUXT_IGNORE_LOCK=1 pnpm typecheck
NUXT_IGNORE_LOCK=1 pnpm build
```

`pnpm derive:setlists` 的最后一行必须是 `0 pending review, 0 conflicts`。再加三条 SQL：

```sql
SELECT COUNT(*) FROM performance_show_setlists WHERE uncertain = 1;          -- 必须 0
SELECT show_key, item_count FROM performance_show_setlists
 WHERE performance_id = <id> ORDER BY show_key;                              -- 与来源逐场核对
SELECT COUNT(*) FROM performance_setlists ps
 WHERE ps.performance_id = <id>
   AND NOT EXISTS (SELECT 1 FROM performance_setlist_sources s WHERE s.performance_id = ps.performance_id); -- 必须 0
```

- `setlist length mismatch` 通常是行归属错了（昼夜没分开、跨城市串行），先查因，不要用 `explainedLengths` 压掉。
- `tests/catalog.test.ts` 钉了 wiki-only 演出 id 列表与若干逐场条数；改动后一起更新，不要放宽断言。
- 演出总数 / 有歌单数 / 场次数 / 曲目数变了，就同步 `docs/data-issues.md` 开头的数字。
- 起 dev server 并抽查 `/shows/<id>`（场次标题、逐曲表、note 横幅）与 `/series/<id>`：

```bash
screen -dmS miku-dev zsh -lc 'cd <repo> && NUXT_IGNORE_LOCK=1 vp run dev >> tmp/dev-server.log 2>&1'
```

从日志读 `Local: http://127.0.0.1:<port>/`。`vp run dev` / `vp dev` 与 `pnpm dev` 等价（都走 `scripts/dev.ts`）；`screen` 比 `nohup` 可靠。

## 8. 收尾

- 只 `git add` 本次涉及的路径（先 `git status --short` 确认没有别的任务的改动），提交并 push。
- 汇报口径：演出 id / 名称、这张表覆盖几个场次、每场条数、新增多少首、仍未匹配的曲目标题、
  后续动作（等确认 / 已部署 / dev server 地址）。
- `docs/setlist-confirmation.md` 的「待核实 / 冲突」不为 0 时不要提交，先修数据。

## 冲突文件模板（`tmp/setlist-<id>-conflict.md`）

```markdown
# 歌单核对：<演出名>（<id>）

## 结论

有冲突，**尚未写入**。确认后回复「采用新来源」或指明只补哪几首。

## 来源

- URL：
- 元素：`div#contents > table...`（DOM path / selector）
- 页面标题：
- 抓取方式：浏览器同源 fetch + DOMParser（rowspan / colspan 已摊平）／ 用户贴的 HTML
- 抓取时间：
- 原始网格：`tmp/setlist-<id>-new-grid.json`（已落盘则写 `data/wiki-raw/<key>.json`）

## 目标演出

- id / 名称 / 系列 / 日期：
- 现有来源：

## 逐场对照

| 场次 | 现有 | 新来源 | 差异 |
| --- | --- | --- | --- |
| `<id>:2026-10-31:day` | 1. A 2. B | 1. A 2. C | 第 2 首不同 |

## 差异汇总

- 新增：…
- 缺失：…
- 顺序变化：…
- 场次结构：…（例如来源写每天昼夜两场，目录只记了一场）

## 建议

采用新来源整体替换，还是只补新增曲目；说明理由与影响（排行、覆盖数、note）。

## 待确认

- [ ] 采用新来源整体替换
- [ ] 保留现有，仅补录新增曲目
- [ ] 先不动，我要再核对
```
