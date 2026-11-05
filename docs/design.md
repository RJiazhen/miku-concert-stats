# 初音未来演唱会曲目播放统计 — 设计

只读参考：`~/projects/others/open-personal-note/notes/ideas/hatsune-miku-concert-song-statistics.md`。

本文件在实现前固定范围、数据边界和模块划分。播放量、里程碑时间和开演钟点只写入有出处的值；缺数据时界面保持空态，不补造。

## 目标与范围

做一个可部署到 Cloudflare Workers 的 SSR 站点，统计 Crypton 主办的初音未来演唱会歌单，并在浏览器内比较各场、各系列、各年份的播放量区间。

收录范围（VocaDB 系列 id，类别均为 Concert）：

| 系列 | VocaDB series id |
| --- | --- |
| 初音ミク「マジカルミライ」 | 81 |
| MIKU EXPO | 82 |
| MIKU WITH YOU | 173 |
| 初音ミクシンフォニー | 256 |
| 初音ミクライブパーティー | 219 |
| SNOW MIKU LIVE! | 204 |

每条记录保存系列、演出、歌单行、歌曲、投稿和观测值，并分开保存「演出日期」与「系列年度首演」。年度首演取该 `series_id + series_number` 下第一个有日期、角色为 `show` 的演出；名称或简介命中配信 / livestream 的场次标为 `broadcast`，不参与首演。VocaDB 的 `date` 只到日，记为 `time_precision = day`。只有简介里出现可引用的 `Showtime` / `開演` 钟点，且场馆国家为 JP 时，才写入当地 `HH:MM` 与 `Asia/Tokyo`（日本无夏令时）。歌单公布时间在公开 API 的歌单对象上不存在，字段留空。

串烧（`songType = Mashup`）拆到组成歌曲后再计数。找不到可核验的组成歌曲时，该行进入未拆分隔离区，不按一条曲目计入区间统计。

播放量区间使用固定阈值：不足 10 万、10 万–100 万、100 万–1000 万、1000 万及以上，外加「尚无快照」。区间数量和占比按歌曲去重。同一歌曲在 niconico、YouTube、bilibili 上各选一条代表投稿：未禁用，优先 `pvType = Original`，其余按 VocaDB PV id 最小者。

歌单公布时间与首演日期是观察点。某侧没有快照时，结果标为样本不足，不外推曲线。

跨平台换算只在「同一歌曲、niconico 与 YouTube 都有快照」的配对上检验。分层为投稿年代（发布年份的十年）、播放量区间、投稿类型。训练集 / 留出集按歌曲 id 取模切分。全部门槛通过后才把公式版本写入数据库；否则界面继续分平台展示。原始快照保留。

## 非目标

- 不覆盖上表以外的活动、俱乐部或企划。
- 不抓取 niconico 非官方观看页接口，也不抓取哔哩哔哩播放量。公开资料表明里程碑达成时间没有面向全库的官方接口，故里程碑表结构保留，但没有可引用的达成时间就不插入行。
- 不把 VocaDB 简介里的「殿堂入り」字样当成带时间的里程碑。
- 不爬 YouTube 页面。没有 `YOUTUBE_API_KEY` 时跳过快照，不估计播放量。
- 不把日常聚合放到 Workers 上。Workers 只做首屏 SSR 和按需的缺歌检索。
- 不下载或再分发第三方封面、歌词和官方标识。

## 方案与取舍

**Nuxt 3 + Nitro `cloudflare-module`。** 需要 Vue（箭头函数约束）和 Workers SSR。相比 Next.js / vinext，少一层 React 兼容运行时，Nitro 直接产出 Worker。相比纯静态站，保留一个按需检索路由。代价是本地统计必须放在客户端，首屏在目录下载完成前只显示壳。

**SQL 增量文件是源，SQLite 是构建产物。** 规范要求把可审查的 SQL 提交到 Git。浏览器用 sql.js 只读打开构建出的 `catalog.sqlite`，再在本地用同一套 TypeScript 聚合。聚合不写第二套 SQL，避免 wasm SQL 与测试 SQL 漂移。代价是浏览器要下载整库；以当前六系列的规模（约两百场）可以接受。服务端不跑 better-sqlite3，原生模块进不了 Workers。Cloudflare 不压缩 sqlite 类型，所以构建同时写出 `catalog.sqlite.gz`，浏览器下载后自己解压。

**目录以 VocaDB 公共 REST API 为准。** `https://vocadb.net/api/`，JSON，自定义 User-Agent，请求间隔 ≥ 300ms，并缓存原始响应。数据库内容按 [VocaDB License](https://wiki.vocadb.net/docs/license) 为 CC BY，页面给出返回链接。官方站点（如 magicalmirai.com）只作为演出上已有的 web link 保存，不另爬 HTML。代价是开演钟点多数缺失，日期精度停在「日」。

**YouTube Data API v3 `videos.list`（`part=statistics`，每次最多 50 个 id）仅在密钥存在时调用。** 这是历史曲线的采样起点；每周工作流追加快照。密钥缺失时工作流仍更新目录，并在日志中说明跳过播放量。

**换算公式默认不发布。** 首版没有成对历史快照，门槛不可能通过。用带 `SAMPLE` 标记的测试夹具验证门槛逻辑，夹具不进入 `data/increments`。

## 模块与职责

| 模块 | 职责 |
| --- | --- |
| 采集 | 拉取系列、演出、歌单、歌曲与 PV；标示配信场；解析有证据的开演钟点；隔离无法拆分的串烧 |
| SQL | 表结构、转义后的增量、应用到 SQLite |
| 统计 | 代表投稿、区间、跨系列/年份比较、观察点前后差值 |
| 换算 | 分层相关、对数拟合、训练/留出门槛、公式版本行 |
| 站点 | SSR 壳、客户端读库、筛选与图表、出处 |
| 检索 | `GET /api/lookup`：仅当用户查询尚未满足于本地目录时，向 VocaDB 查最多 5 首歌曲及其已登记 PV 链接 |
| 工作流 | CI 跑 lint、类型检查、测试和目录构建；每周采集并在有 diff 时提交 SQL |

## 路径

新增（本分支从空仓库实现）：

- `docs/design.md`
- `package.json`、`pnpm-lock.yaml`、`tsconfig.json`、`nuxt.config.ts`、`eslint.config.mjs`、`vitest.config.ts`、`wrangler.toml`、`.gitignore`、`.github/workflows/ci.yml`、`.github/workflows/weekly-collect.yml`
- `data/schema.sql`、`data/increments/0001-vocadb-catalog.sql`（采集后写入）
- `scripts/vocadb/client.ts`、`scripts/vocadb/normalize.ts`、`scripts/vocadb/collect.ts`
- `scripts/sql/emit.ts`、`scripts/build-catalog.ts`、`scripts/snapshot-youtube.ts`
- `shared/types.ts`、`shared/bands.ts`、`shared/premiere.ts`、`shared/showtime.ts`、`shared/medley.ts`、`shared/stats.ts`、`shared/correlation.ts`、`shared/catalog.ts`
- `tests/premiere.test.ts`、`tests/showtime.test.ts`、`tests/medley.test.ts`、`tests/stats.test.ts`、`tests/correlation.test.ts`、`tests/catalog.test.ts`
- `server/api/lookup.get.ts`
- `app.vue`、`layouts/default.vue`、`assets/css/main.css`
- `pages/index.vue`、`pages/compare.vue`、`pages/windows.vue`、`pages/correlation.vue`、`pages/lookup.vue`
- `components/SiteHeader.vue`、`components/CatalogView.vue`、`composables/useCatalog.ts`

修改：

- `README.md`：运行方式、VocaDB 署名、播放量空态说明

只读参考：

- 上文 idea 笔记
- [VocaDB Public API](https://wiki.vocadb.net/docs/public-api)、[Events](https://wiki.vocadb.net/docs/events)、[License](https://wiki.vocadb.net/docs/license)
- [YouTube videos.list](https://developers.google.com/youtube/v3/docs/videos/list)
- [GitHub Actions schedule](https://docs.github.com/actions/using-workflows/events-that-trigger-workflows#schedule)
- [Cloudflare Workers 全栈路由](https://developers.cloudflare.com/workers/static-assets/routing/full-stack-application/)

`public/data/catalog.sqlite`（以及发给浏览器的 gzip 副本 `catalog.sqlite.gz`）与 sql.js wasm 由构建复制，不作为源文件提交。

## 数据流

```mermaid
flowchart LR
  subgraph sources [来源]
    VocaDB["VocaDB REST API"]
    YT["YouTube Data API v3"]
  end
  subgraph repo [仓库]
    SQL["data/schema.sql + increments"]
    Build["scripts/build-catalog.ts"]
    SQLite["catalog.sqlite"]
  end
  subgraph edge [Cloudflare Worker]
    SSR["Nuxt SSR 壳"]
    Lookup["/api/lookup"]
  end
  subgraph browser [浏览器]
    Wasm["sql.js"]
    Stats["shared/stats.ts"]
  end
  VocaDB --> SQL
  YT -->|"仅当有 API key 且每周一次"| SQL
  SQL --> Build --> SQLite --> Wasm --> Stats
  SSR --> browser
  Lookup -->|"用户主动检索，最多 5 条"| VocaDB
```

系列年度首演规则在写入 SQL 前于 `shared/premiere.ts` 计算，并落表 `edition_premieres`（表名保留，含义是「系列年度第一个演出」），便于复核。

换算发布门槛（同时满足才 `status = published`）：

- 训练不少于 40 对，留出不少于 15 对
- 两侧 Pearson |r| ≥ 0.8（对数播放量）
- 两侧中位绝对百分比误差 ≤ 25%
- 任一层若样本 ≥ 8，该层留出 MAPE ≤ 40%

公式形式固定为 `log10(youtube) = a + b * log10(niconico)`，系数、样本期、误差与版本号写入 `conversion_formulas`。未发布时 `formula_json` 为空。

## 风险与验证

| 风险 | 处理 |
| --- | --- |
| VocaDB 日期是午夜 UTC，不是开演时刻 | 精度为 day；钟点必须带简介原文摘录 |
| 同一系列年度多城、后至配信被当成首演 | `broadcast` 排除；首演取最早 `show` |
| 串烧被当成一首歌 | 无组成歌曲则隔离，不进分母 |
| 无密钥时站点看起来「没有统计」 | 空态写明原因；测试断言快照不会被填上猜测值 |
| 换算在小样本上过拟合 | 默认不发布；门槛用 SAMPLE 夹具单测 |
| 每周任务打满 API | 六系列、≥300ms 间隔、自定义 UA；超过预算则失败而不分片狂刷 |
| Workers 上误跑统计或原生 sqlite | 聚合只在客户端；服务端路由只用 `fetch` |

验证：

- `pnpm test` 覆盖首演、钟点解析、串烧、区间、观察窗、换算门槛
- `pnpm test` 中的目录测试打开已提交 SQL，核对 2014 年マジカルミライ首演是大阪场 `2014-08-30` 而不是东京场 `2014-09-20`，且 `view_snapshots` 与 `milestones` 在没有 YouTube 采集时为 0 行
- `pnpm lint`、`pnpm typecheck`
- 浏览器走通首页筛选、比较、观察窗、换算页和缺歌检索

## 歌曲出现次数排行

在播放量区间之外，首页按歌曲统计「出现过多少次」。聚合仍是 `shared/stats.ts` 里的纯函数，读已加载的目录行（`setlist_item_songs`、`setlist_items`、`songs`、`performances`、`series`），不另写 SQL。

三级单位与 VocaDB 对齐：系列（`series`）> 演出（一条 `performances` 行 = 一个 VocaDB release event = 一个城市站）> 场次（一天，或同一天日场 / 夜场各一场）。

两种计数：

- `show`（按场次，默认）：按 `shared/event-schedule.ts` 推导的场次计数。三日巡演计 3；同日日场 + 夜场计 2；没有日期的演出没有场次。备注写了天 / 半天 / 场次号时只计对应场次，否则一行计入该演出的全部场次。解析不了的场次仍给出约数，并标不确定。
- `event`（按演出）：每条 `performances` 行最多计 1。同一年大阪与东京各计一次，不再按 `series_id` + `series_number` 合并。

筛选：

- 系列 id 列表。省略或空列表表示全部系列。
- 年份闭区间，取演出 `start_date` 的公历年。没有日期的演出在设置了任一年份边界时不计入。
- `includeBroadcast` 为 false 时排除 `role = broadcast`，以及名称、日文名或 `series_suffix` 命中 livestream、online、オンライン、VR、ＶＲ、配信的演出。演出简介没有单独落在 `performances` 上；`performance_links.description` 多是外链标题（例如现场场次的 “Online Live Information”），不参与排除。
- `includeMedleyComponents` 为 false 时只计 `setlist_item_songs.role = listed`（直接列出的曲目）。`component` 仅在为 true 时计入。未能拆分的串烧不写入 `setlist_item_songs`，两种模式都不计。

每行输出歌曲 id、名称（`songs.name`）、制作人署名、次数、出现过的演出数、最早年份、最晚年份。次数为 0 的歌曲不输出。默认按次数降序、歌曲 id 升序。`seriesCount` 仍保留在返回值里但不再展示；表格的「演出数」用 `performanceCount`（去重后的演出行数，两种统计模式都一样）。

首页改为这张可排序的表，并提供模式、系列多选、年份、配信/VR、串烧组成的控件。覆盖说明写明：默认按场次统计，按演出时每个城市站各算一次。原来的单场播放量页移到 `/catalog`。顶栏增加两个入口。

## 歌单备注与逐场解析

`setlist_items.notes` 保存 VocaDB 歌单行的自由文本。采集已经写入该列，原始响应在 `data/cache`，已提交的 `data/increments/0001-vocadb-catalog.sql` 含这些备注（例如歌单 17933 的「愛の詩」与「サイハテ」）。空备注表示该歌单下的每个演出都演出了这首歌。不为此重新请求网络。

`shared/rotation.ts` 把备注拆成场次集合。城市名对齐到共用该 `song_list_id` 的演出（名称、日文名、场馆、`series_suffix`）。`Day N` 是该城市按日期排序后的第 N 个不同日期；日期来自 `start_date` 到 `end_date`（含首尾）。一场演出覆盖多日时，这些日仍对应同一条演出记录。

不确定时保留已识别出的场次，并记下原因：只写了城市但该城市有多场或多日；某一日存在日夜场或备注写了 daytime / nighttime / 1st / 2nd show；格式无法识别；城市对不上任何演出。

同一歌单内，解析后统计每场的歌单行数。与该歌单行数的众数不同的场次记为 `setlist length mismatch: X vs expected Y`，并把因此受影响的行（有备注、或被排除出该场的行）标成不确定。

按场次的排行使用解析结果，并用 `showsForNotes` 把一行收窄到 `Day N` / 日场 / 夜场所指的场次。次数不可靠时显示「≈」，悬停列出尚未确认具体场次数的演出。页上另列未解决的行和演出。演出页 `/shows/:id` 展示场次列表、原始备注与解析结果；系列主页 `/series/:id` 列出该系列的全部演出，并从排行、演出页链入。

外观由 Nuxt UI 的 color mode 控制，默认跟随系统，系统无偏好时回落到深色。`html.dark` 由 `@nuxtjs/color-mode` 写入，页眉的 `UColorModeButton` 切换并记忆。深色是艺术方向基准：近黑背景配青绿 `#39C5BB` 与洋红 `#E12885` 的径向光晕；浅色同样必须可用。光晕画在固定的 `-z-10` 层，不进入正文层，避免影响对比度。

## 歌名中文

`data/song-titles.zh-CN.json` 是按 VocaDB 歌曲 id 索引的对象。键是十进制 id 字符串。没有把握的歌不写进行去。

```json
{
  "1326": {
    "title": "世界第一公主殿下",
    "source": "vocadb-alias",
    "comment": "可选"
  }
}
```

`title` 非空。`source` 为字面量 `vocadb-alias`（来自缓存的 VocaDB `names[]` 中文别名），或一条能核对的 URL / 简短出处说明。`comment` 可省略。`shared/song-titles.ts` 校验并按 id 取出。测试要求每个 id 都在已提交目录里。

顶栏用「中文歌名」开关（`USwitch`）控制是否显示中文，记在 `localStorage` 键 `miku-concert-stats-song-lang`（`zh` / `original`）。没有记录时，`navigator.language` 以 `zh` 开头则用中文。服务端和注水先显示原文，挂载后再读本地选择，避免注水不一致。选中中文且该歌有译文时，译文作主标题，原文用灰色小字换行显示在译文下方；否则只显示原文。各页歌曲名走同一个 `SongTitle` 组件。

## 演出角色

`data/characters.json` 把固定的角色本名映射到匹配规则，用来合并声库变体。键是显示名，例如 `初音ミク`。值含 `patterns`（锚定在名称开头的正则）、可选 `aliases`（整段或作为前缀的别名，如英语名）与可选 `color`（应援色的 `#rrggbb`，渲染歌手标签时用作边框色，并以 12% 透明度作底色）。`初音ミク Append (Unknown)`、`初音ミク V4X (Original)`、`初音ミク V4X (Dark)` 都落到 `初音ミク`。对不上任何规则的名字保持未匹配，不猜测；没有 `color` 的角色标签不带颜色。

一首歌的演唱者优先取 `song_vocalists` 表：`scripts/vocadb/vocalists.ts`（`pnpm collect:vocalists`）对每首歌请求 VocaDB 的 `fields=Artists`，只保留 `categories` 或 `roles` 含 `Vocalist` 的条目，名字用条目的 `name`，否则用嵌套 `artist.name`，写成 `data/increments/0006-song-vocalists.sql`。`artist_string` 会把大编制合唱压成 `feat. various`（例如 Hand in Hand 的现场翻唱实际由 KAITO、MEIKO、初音ミク、巡音ルカ、鏡音リン、鏡音レン 演唱），所以这份名单才是「演出角色」的来源。库里没有该歌的名单时，退回 `songs.artist_string` 里第一次出现的 `feat.` 之后的名单，按逗号拆开；`feat.` 前面的制作人不算角色。

结果在读取目录时推导，不另写 SQL 列。排行、演出、系列年度索引和播放量页的歌曲行显示「歌手」。排行可按一个角色筛选。

`shared/credit.ts` 负责署名文本：`producerCredit` 取 `feat.` 之前的制作人，`displayArtistString` 保留完整署名，两者都会丢掉 VocaDB 的名字占位（`Unknown producer(s)`、`Unknown artist` 等，不指向任何作者），只由占位组成的署名返回 `null`，页面显示「未记录」。页头、站内搜索结果与 `/raw` 的歌曲表都走这两个函数；单曲页的「其他版本」卡片按下面的制作人规则取值。排行的「制作人」列先取结构化的 `song_producers` 名单，只有该行（含合并的版本组）没有任何结构化署名时才退回 `producerCredit`；Publisher、Illustrator、厂牌 / 社团等署名不是制作人，`VoiceManipulator`（調声 / 調音）保留。

制作人署名以歌曲条目为准：`song_producers`（VocaDB `fields=Artists` 里的制作侧署名）是权威名单，`artist_string` 只在歌曲条目没有任何制作人记录时作为回退；两者冲突时显示仍用结构化名单，并把差异写进由 `pnpm report:producers` 生成的 `docs/reports/producer-conflicts.md`，维护者确认后才改。

## 实现步骤

1. **模式与纯函数** — `data/schema.sql`，`shared/premiere.ts`，`shared/showtime.ts`，`shared/medley.ts`，`shared/bands.ts`，`shared/stats.ts`，`shared/correlation.ts` 及对应 `tests/*`。
2. **采集与 SQL** — `scripts/vocadb/*`，`scripts/sql/emit.ts`，`scripts/build-catalog.ts`，`scripts/snapshot-youtube.ts`；运行一次采集生成 `data/increments/0001-vocadb-catalog.sql`；`tests/catalog.test.ts`。
3. **站点** — Nuxt 页面、`composables/useCatalog.ts`、`server/api/lookup.get.ts`、署名与空态。
4. **发布自动化** — `wrangler.toml`、CI、每周工作流；README。

## 版本合并

`data/song-variants.json` 是人工核对的清单，只收录确认属于同一首歌的 remix、remaster、声库、翻唱与语言版本。`shared/song-variants.ts` 拒绝链式映射与自指。统计函数接受 `SongVariantIndex`：计数时先归一到 canonical id 再按演出或场次去重，代表投稿在合并组内选，排行行带上 `variantSongIds`，页面标注「含 N 个版本」时 N 含原版（`variantSongIds.length + 1`）。单曲页的「其他版本」卡片只列并入的其他版本（没有并入版本时整块不渲染）：类型、制作人与歌手。制作人先取该版本的 `song_producers`，没有时才取署名 `feat.` 之前的部分，并去掉 VocaDB 的 `Unknown producer(s)` 占位（它不指向任何作者）；歌手取 `song_vocalists` 里该变体自己的名单，没有时退回 `feat.` 名单，仍解析不到才改用原版的角色。原版的投稿日期与演出角色留在页头。清单之外的重复条目不会被自动合并，`/raw` 的「疑似重复但未合并」会持续列出候选。

## 歌单槽位与跨地区合并

同一槽位的替换曲目在 VocaDB 里是相邻但序号不同的多行。`shared/setlist-slots.ts` 判定两行是否可以共用一个序号：演出集合不同时要求日期与场次对齐；同一场记录跨多天时按备注的日期/日夜/场次判定；任一侧没有备注就不合并。只有连续且与槽位内每一行都互斥的行才会合并。

同一系列年度不同演出的歌单（例如 2019 マジカルミライ 东京与大阪）只在 `/raw` 的跨演出对照里用 `data/setlist-merges.json` 人工分组后并排展示，**不再**作为该系列年度的合并歌单；如果其中一份歌单被轮换检查标出长度不一致，说明各演出曲目数量对不上，则拆开单独显示，不参与合并。`shared/edition-setlists.ts` 以演出最多的歌单为骨架，其余用 LCS 对齐，重复曲目折叠成一行并合并演出集合。渲染时槽位用 `rowspan` 共享序号，末尾「演出」列说明该行属于哪个演出；每个演出都演出的行留空，不写说明。

## 差异核验报告

`shared/setlist-diff.ts` 计算同一系列年度歌单对（以及相邻系列年度）的结构差异：行数、正片与安可行数、共有与独有曲目、LCS 覆盖率、是否已合并。分级为 `identical`、`order-only`、`count-differs`、`segment-differs`、`probably-different-program`。`pnpm report:setlist` 写出 `docs/reports/setlist-differences.{md,csv}`，`--check` 供 CI 校验；`/report` 在浏览器里用同一份纯函数渲染，可复制 Markdown。相邻系列年度只作参考，不参与分级统计。

## 界面

Nuxt 4 + Nuxt UI 4 + Tailwind 4。目录迁到 `app/`，`shared/` 留在根目录，页面用 `~~/shared/*` 引用纯逻辑。页眉是毛玻璃吸顶条，导航只保留「排行 / 原始数据 / 核验 / 检索」；播放量相关页面在拿到快照前由 `middleware/retired.ts` 重定向到首页。排行用 `UTable` 与 TanStack 排序，筛选条件写入 URL query，刷新与分享都能复原。

## 页眉搜索

搜索放在页眉，不单独占一个页面。宽屏是常驻输入框，结果浮层显示目录内命中与「查看全部」；窄屏折叠成顶栏按钮，点开是全屏浮层。目录里没有命中时才请求 `/api/lookup`，远程结果只给 VocaDB 链接。排行表的「制作人」列先显示 VocaDB 结构化的 `song_producers` 名单，没有时才退回 `feat.` 之前的自由文本；宽度受限，悬停看完整署名；「歌手」列负责角色，用应援色标签，最多直接显示 3 个，其余收进 `+N` 按钮的气泡。「演出数」列给出该曲出现过的演出数（与统计模式无关），「系列数」不再展示。`/raw` 的歌曲表同样用「制作人」列显示 `producerCredit`，另外用「歌手」列显示解析后的角色，不再显示 `artist_string` 原文。
