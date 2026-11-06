# 架构

统计 Crypton 主办的初音未来演唱会歌单，并在浏览器里比较各场、各系列、各年份的播放量区间。日常聚合不在服务器上跑。Cloudflare Worker 只做首屏 SSR，以及目录里找不到歌时的按需检索。

设计约束见 [docs/design.md](design.md)。本文件描述当前代码怎么跑。已确认但尚未修复的数据缺陷汇总在 [docs/data-issues.md](data-issues.md)。

收录系列由 `scripts/vocadb/collect.ts` 的 `SERIES_IDS` 固定为 VocaDB release-event series id：

| id | 当前目录中的系列名 |
| --- | --- |
| 81 | 初音ミク「マジカルミライ」 |
| 82 | MIKU EXPO |
| 173 | MIKU WITH YOU |
| 256 | 初音ミクシンフォニー |
| 219 | 初音ミクライブパーティー |
| 204 | SNOW MIKU LIVE! |
| 255 | 初音ミク×鼓童 |

`SERIES_IDS` 之外，`scripts/vocadb/collect.ts` 的 `STANDALONE_EVENTS` 补录 VocaDB 没挂到系列、但属于已收录系列的独立场次，并指定站内的 `series_id` 与系列年度号。目前只有 2010-03-09 的「ミクの日感謝祭39's Giving Day」（VocaDB 事件 2520，上游无 `seriesId`、`seriesNumber` 为 0），记作 `初音ミクライブパーティー` 2010。`data/increments/0004-standalone-events.sql` 是这次补录的 SQL，写入用 `INSERT OR IGNORE`，因此下一次 `pnpm collect` 把同一批行写进 0001 后它不再改变结果。

`data/increments/0005-kodo-series.sql` 以同样方式补录 255（初音ミク×鼓童）：2017 / 2018 / 2023 / 2026 四场有歌单，2020 场次上游标为取消、没有日期与歌单。这份 SQL 同样用 `INSERT OR IGNORE`，`pnpm collect` 把它写进 0001 后即成为空操作。

## 技术栈

- **Nuxt 4.6**，`srcDir` 为 `app/`。`shared/`、`scripts/`、`tests/`、`server/`、`data/` 留在根目录，`app/**` 通过 `~~/shared/*` 引用纯逻辑。
- **Nuxt UI 4 + Tailwind CSS 4**。`nuxt.config.ts` 注册 `@nuxt/ui`，颜色 token 在 `app/app.config.ts` 绑定为 `primary: miku`、`secondary: magenta`，色阶定义在 `app/assets/css/main.css` 的 `@theme`。
- **深色优先，默认跟随系统**。`@nuxtjs/color-mode`（由 Nuxt UI 注册）在 `html` 上加 `.dark`；页眉的 `UColorModeButton` 切换并记住选择。
- **字体不联网**：`ui.fonts: false`，使用系统字体栈，避免构建期请求字体服务。
- **图标本地打包**：`@iconify-json/lucide` + `icon.clientBundle.scan`，SSR 首屏不依赖 Iconify API。
- **Nitro `cloudflare_module`**：`deployConfig: true`、`nodeCompat: true`，产物写到 `.output`。

## 目录与模块

### 采集与 SQL

`scripts/vocadb/client.ts` 请求 VocaDB 公共 REST API。`User-Agent` 为 `miku-concert-stats/0.1 (+https://github.com/RJiazhen/miku-concert-stats)`。未缓存请求至少间隔 `MIN_INTERVAL_MS`（300ms），网络请求上限 `MAX_REQUESTS`（800）。缓存命中不睡眠、不计入上限。429 或 5xx 等 2 秒后重试一次。响应按 URL 的 SHA-256 存在 `data/cache/*.json`。该目录被 `.gitignore` 忽略，不提交。

`scripts/vocadb/collect.ts`（`pnpm collect`）拉取上述七个系列：系列详情、每场 `releaseEvents`、歌单分页（每页 50，`fields=Names,PVs,WebLinks`）；另外按 `STANDALONE_EVENTS` 补拉没有系列归属的场次。`scripts/vocadb/normalize.ts` 把 API 对象收成目录行。`scripts/vocadb/api-types.ts` 是这些响应的类型。

VocaDB 上没有歌单的演出可以由专辑曲目补位。`data/album-setlists.json` 为每个演出人工指定一张专辑，`scripts/vocadb/album-setlists.ts`（`pnpm collect:albums`，`pnpm collect` 末尾也会执行）只请求这些专辑的 `Tracks`，写出 `data/increments/0004-album-setlists.sql`：每张专辑一份 `song_lists` 行（`source = 'album'`、`album_id`、`medium`），曲目按碟号与轨号写进 `setlist_items`、`setlist_item_songs`，最后 `UPDATE performances ... WHERE song_list_id IS NULL` 把这批演出指向该歌单。这个条件保证 VocaDB 以后补上真歌单时专辑曲目不会覆盖它。曲目沿 `originalVersionId` 一路解析到原曲（专辑版可能是上一张专辑版本的再版，所以不能只跟一跳），播放量仍记在原曲上；没有原曲的串烧保留专辑曲目的 id 与标题。VocaDB 上 2018 年以后的蓝光条目没有曲目，所以多数系列年度只能用同一年度的 CD。

写入规则：

- 名称或简介命中「配信」或 `livestream` 的场次，`shared/premiere.ts` 的 `performanceRole` 标为 `broadcast`。「Online」单独出现仍是 `show`。
- 年度首演是同一系列年度（`series_id` + `series_number`）里第一个 `role = show` 且有开始日的演出；同日取较小的 performance id。规则原文存在 `edition_premieres.rule`。
- `shared/showtime.ts` 只在场馆国家为 `JP`、且简介里恰好一条合法的 `Showtime` 或「開演」`HH:MM` 时写入 `showtime_local`、`timezone = Asia/Tokyo` 和摘录。多条钟点不写入。VocaDB 日期保持 `time_precision = day`。
- 歌单对象没有公布时间，`song_lists.announced_at` 写 `NULL`。
- `shared/medley.ts`：`songType !== Mashup` 整行计为列出的那首歌。Mashup 只有备注或网页链接里能核到至少两条其他 VocaDB 歌曲 URL（`vocadb.net/S/{id}` 或 `Song/Details/{id}`）才拆开，角色为 `component`；否则进入 `medley_quarantine`，不进入区间分母。
- `shared/placeholder-song.ts`：`isPlaceholderSong` 检查歌名与全部译名，命中 VocaDB 的占位标记（`[Placeholder song]`、`[Unknown song]`、`[Temporary song]`、`[Custom song]`、`[Out of scope song]`、`[Unknown]`，忽略大小写与首尾空白）就整行丢弃，不写入 `setlist_items` / `songs`。占位曲 15591（`???`）在初音ミク×鼓童的三份歌单里出现 14 次，代表鼓童的太鼓独奏段落，不是歌曲；不丢弃会让 `???` 排到该系列第一。歌名本身不改写，只跳过整行。
- 视频只保留 niconico、YouTube、bilibili 的 PV 链接。

`scripts/sql/emit.ts` 把行变成 SQL 字面量，每条 `INSERT` 最多 80 行。`catalogTransaction` 包在事务里，先删目录表再插入。它不删除 `view_snapshots`、`milestones`、`conversion_formulas`。产物是 `data/increments/0001-vocadb-catalog.sql`。采集结束还会调用 `scripts/evaluate-conversion.ts` 重写 `0003-conversion.sql`。

`scripts/snapshot-youtube.ts`（`pnpm snapshot:youtube`）在 `YOUTUBE_API_KEY` 存在时，对目录里未禁用的 YouTube `platform_video_id` 调用 Data API v3 `videos.list`（`part=statistics`，每批 50 个 id）。没有数字 `viewCount` 的条目跳过，不写成 0。结果以 `INSERT OR IGNORE` 追加到 `data/increments/0002-youtube-snapshots.sql`。没有密钥时打印跳过并返回 0。

`scripts/build-catalog.ts`（`pnpm build:catalog`，也是 `predev` / `prebuild`）用 better-sqlite3 执行 `data/schema.sql`，再按文件名字典序执行 `data/increments/*.sql`，写出 `public/data/catalog.sqlite`，同时写一份 gzip 副本 `public/data/catalog.sqlite.gz`，并把 `sql.js` 的 `sql-wasm.wasm` 复制到 `public/sql-wasm.wasm`。这三个产物都在 `.gitignore` 里。

Cloudflare 只压缩固定内容类型，`application/vnd.sqlite3` 不在其中，所以浏览器下载 gzip 副本并用 `DecompressionStream('gzip')` 解压；不支持该 API 的浏览器退回未压缩文件。`nuxt.config.ts` 在构建时对 gzip 文件取 SHA-256 前 16 位写进 `runtimeConfig.public.catalogVersion`，下载 URL 变成 `/data/catalog.sqlite.gz?v=<hash>`；`nuxt dev` 直接读未压缩文件，避免重建后命中旧的 immutable 缓存。`routeRules` 让 Nitro 把它写进 Cloudflare 的 `_headers`：gzip 副本 `immutable` 缓存一年，未压缩文件保持 `must-revalidate` 并带上 `application/vnd.sqlite3`（`/raw` 的下载链接指向它）。

### 共享逻辑 `shared/`

`shared/types.ts` 定义 `Queryable`、目录行和 `Catalog`。`shared/catalog.ts` 的 `loadCatalog` 用只读 `SELECT` 把表读成对象。聚合在 TypeScript 里做，不在 SQL 里做。Node 脚本用 better-sqlite3，浏览器用 sql.js，两边都走这个加载器。

**三级术语（与 VocaDB、数据库列和页面文案的对应关系）**

| 层级 | 含义 | 数据来源 | 页面 |
| --- | --- | --- | --- |
| 系列 | 一个演唱会系列，如魔法未来 | `series` 行，`vocadb.net/Es/{id}` | 排行的系列筛选、各页标题、`/series/{id}` |
| 演出 | 一个城市站，即 VocaDB 的一个 release event | 一条 `performances` 行，`vocadb.net/E/{id}`；`series_id` 与 `series_number` 说明它属于哪个系列 | `/shows/{id}`；`/series/{id}` 是该系列的演出索引 |
| 场次 | 一天，或同一天有日场 / 夜场时的半天 | 由 `start_date`–`end_date` 推导，再并上 `data/performance-setlists.json` 的 `dayNight`；日夜证据也仍可来自歌单备注 | 排行「按场次」、`/shows` 页头的场次列表、歌曲页的覆盖数 |
| 场次歌单 | 一个场次的完整曲目 | `performance_show_setlist_items`，由源歌单展开 | `/shows/{id}` 的每个场次表、`/raw` 的「场次歌单」页 |

`系列年度` 是 `series_id` + `series_number` 的分组，只用于演出索引、年度首演与歌单对照，**不再**合并成一场演唱会。VocaDB 自身也是这个结构：一个 `releaseEvents` 行 = 一个演出，同一年同一系列的不同城市各有自己的事件 id。站内不改列名，`performances` 仍是一条演出，`edition_premieres` 仍存系列年度首演。

**源歌单层与场次层。** VocaDB 只为每个 release event 存**一个** `songList` 引用，同一份歌单会被多个演出共用（本目录最多 17 个），地区与场次差异只能写进行内备注。因此目录额外物化一层场次歌单：`scripts/derive-performance-setlists.ts`（`pnpm derive:setlists`）读已提交的 `0001`/`0004` 与 `data/performance-setlists.json`，用 `shared/performance-setlists.ts` 把每个源行展开到它覆盖的场次，写出 `data/increments/0008-performance-setlists.sql`。源层（`song_lists` / `setlist_items` / `setlist_item_songs`）保持 VocaDB 原样，继续供 `/raw` 跨演出对照与 `/report` 使用；场次层供 `/shows`、排行与公开 skill 使用。两者都有 `source_list_id` / `source_position` 可对回。

场次层六张表：`performance_setlists`（每演出一行：源歌单、`change`、`status`、`resolution`、`source_row_count`、`day_night_dates`、`no_show_dates`、`single_show_dates`、`conflict`、`pending_review`、`note`）、`performance_setlist_sources`（外部来源）、`performance_show_setlists`（每场次一行）、`performance_show_setlist_items`（每场次一整串有序曲目，`song_id` 与 `medley_id` 二选一）、`medleys` / `medley_songs`（串烧，当前为空表）。外部来源只记在演出层：检索都以 performance 为基准，逐场次的特殊情况写进 `performance_setlists.note`。

`data/performance-setlists.json` 的 `performances.<id>` 支持四组时间修正：`dayNight`（该日昼 + 夜两场）、`noShowDates`（该日只有企划展、没有 live）、`halves`（该日只有昼场或只有夜场，例如首日仅夜场）、`singleShowDates`（该日核实为只有一场）。四者都物化为 `day_night_dates` / `no_show_dates` / `single_show_dates`，场次由 `performanceSchedules` 一次算好，页面与统计直接读 `performance_show_setlists`。

`performances.<id>` 的 `dayNight` / `singleShowDates` / `halves` 也接受字符串 `all`，表示按演出的日期区间展开，用于「该城每天都有一场」或「每天昼夜各一场」这类整段结论。

**百科逐曲表是外包数据的主力。** 173 个演出里有 161 个的曲目逐条来自「初音ミク Wiki」（atwiki）的逐曲表。数据分三处：

- `data/wiki-raw/<key>.json`：页面表格的原始单元格（含表头），由浏览器抓取时原样落盘，便于复核。
- `scripts/wiki_raw_spec.py`：声明每张表的公演替标记选中哪些演出，标记可写成 `6516`、`6516#2`（第 2 个日期）、`*#1:day`（任意演出的第 1 个日期日场）等。
- `scripts/wiki_tour_tables.py`：早期手工抄录的城市级表格（交响乐、2014–2020 的 EXPO / Live Party / 鼓童）。

`scripts/wiki-setlists-source.py` 把三者统一成 `data/wiki-setlists.json` 的逐行数据（`title` + `when`），`scripts/build-setlist-curation.py` 再按每个场次挑行、解析成 `songs` 或 `slots`。桌面上看不到的差别（同一天昼/夜、不同日期、不同城市）都落在 `slots` 上，`shared/performance-setlists.ts` 按场次键精确匹配。

`when` 语法：`day`/`night`、`dN`（第 N 个日期）、`dN:day|night`、或不带标记（所有场次）。

曲名与 catalog 写法不同的（`DECORATER`、`右肩の蝶[39's Giving Day Edition]`、`キミぺディア`）记在 `data/wiki-title-aliases.json`。catalog 里没有的歌由 `scripts/fetch-wiki-songs.py` 按标题检索 VocaDB、用作曲者排除同名翻唱后写成 `data/wiki-songs.json` 与 `data/increments/0009-wiki-songs.sql`（`INSERT OR IGNORE`，`pnpm collect` 重写 `0001` 后仍在）。仍匹配不到的行不丢弃：`data/wiki-repertoire.json` 逐条给出类别（`classical` / `traditional` / `instrumental`，或确认是 VOCALOID 歌但检索只返回翻唱时的 `vocaloid`）、作曲者和备注，`fetch-wiki-songs.py` 据此写成 `data/increments/0010-wiki-repertoire.sql`：id 从 2,000,000,000 起免与 VocaDB 冲突，`songs.category` 标记不是 VOCALOID 歌曲，`artist_string` 只放作曲者、没有歌手，`source_url` 指向**印有该曲名的那一页**百科（不是索引页）。这样一场演出点开就是完整曲目，界面对这些行显示「非 VocaDB 曲目・类别」而不是假装缺歌手。同曲再演（`ぽっぴっぽー（Grand Finale）`）标 `skip`，只写进演出 `note`，避免重复计数。

演出没有 VocaDB 歌单但有百科逐曲表时（如交响乐 2026），`performance_setlists.source_list_id` 为 `NULL`、`source_kind = 'wiki'`，页头改为「百科逐曲表」并且不链 VocaDB。

**数据来源不再以 VocaDB 为主。** 实测 VocaDB 的场次与歌单缺漏较多（没有日夜场字段、共享歌单只靠行内备注、交响乐整年没有歌单），因此核实时按「官网 → 萌娘百科 → 初音ミク Wiki（atwiki）→ VocaDB Fandom」的顺序取数，冲突时优先采用官网与百科，我们自己的派生层承担合并，不改上游。

`performances.<id>.setlist` 用一份外部逐曲表**整体替换**该演出的 VocaDB 行：每首歌写 `id` / `title` / 可选 `note`（如 `メドレー：悪ノ交響曲 第2楽章`），并要求 `source` / `title` / `accessedAt` / `confidence`。派生时该演出的每个场次都用这份表，行级 `evidence = 'wiki'`，演出级 `resolution = 'external'`。id 必须存在于 catalog，构建期会校验；标题到 id 的映射由 `scripts/build-setlist-curation.py` 按归一化标题解析，解析失败直接报错而不是猜。

`statuses.<id>` 记录没有歌单行的演出结果（`cancelled` / `postponed` / `upcoming`），写入 `performance_status` 表。VocaDB 的状态字段没有「已取消」，取消场次在上游仍是 `Finished` 且没有日期，所以这是唯一能表达真实结果的地方；演出页据此显示「这场演出已取消」并给出公告链接。

`lists.<songListId>` 是逐行更正，全部要求带 `source` 与 `accessedAt`：`notes`（用百科的逐日歌单改写 VocaDB 写错的城市 / 日 / 半场的备注）、`dropShows`（备注写了某场但该场其实没演，按场次 key 剔除）、`explainedLengths`（该场曲目数不同是有意为之，例如香港 23+1 安可、台湾 23+2，记下原因后不再报长度警告）、`assign` / `exclude` / `extra`（人工指定、丢弃、追加曲目）。`citiesPlayOneSetlist` 表示来源确认「每个城市只演一套节目」，此时只写城市的备注是准确的，不再标 `city-only when city has several shows`。

来源查证顺序是「VocaDB 备注 → 官方页 → 萌娘百科等 wiki → 录播」。**查到就直接采用，不再要求二次确认**：`pending_review` 只表示归属仍然悬空（没有任何来源定位到这一场，或来源之间互相矛盾），不是「来源置信度不高」。每条来源的 `url` / `accessed_at` / `confidence` / `note` 都留在 `performance_setlist_sources`，`/shows` 页脚按演出展示，`docs/setlist-confirmation.md` 第 1 节与 `docs/reports/setlist-review.md` 的 F 节各有一份汇总，只供核对来源、不需要逐条回复。

`shared/stats.ts`：

- `representativeVideo` / `representativeVideoForSongs`：某平台上未禁用的 PV 里，优先 `pvType = Original`，否则取最小的 VocaDB PV id。合并组会跨版本选一条代表投稿。
- `playbackForSongs` / `summarizeBands`：用最新快照落入 `shared/bands.ts` 的固定区间。
- `compareBy`：按系列、系列年度（`series_number`）或演出开始日期的公历年分组，组内按歌曲去重后算区间占比。
- `observeWindow`：观察点之前最近的快照与之后最早的快照。缺任一侧则 `insufficient`。
- `rankSongAppearances`：排行。`event`（按演出）对每条 `performances` 行最多计 1，同一年大阪 / 东京两个城市站各计一次；`show`（按场次，默认）直接按 `performance_show_setlist_items` 的 `show_key` 去重，因此共用歌单的替换曲不会算到没演它的场次。没有展开行的旧目录（测试夹具）回退到备注解析。默认排除 `role = broadcast` 以及名称、日文名、`series_suffix` 命中 livestream / online / オンライン / VR / 配信 的演出。每行带 `variantSongIds`，供页面标注「含 N 个版本」。
- 所有计数函数接受可选的 `SongVariantIndex`，默认不合并版本。

`shared/credit.ts` 也负责署名文本：`producerCredit` 取 `feat.` 之前的制作人，`displayArtistString` 保留完整署名，两者都过滤 VocaDB 的 `Unknown producer(s)` / `Unknown artist` 占位并返回 `null`（页面显示「未记录」）；`/raw` 的歌曲表仍用 `producerCredit` 展示原始署名，排行的「制作人」列与单曲页的版本卡片按下一段的规则取值。`scripts/vocadb/vocalists.ts`（`pnpm collect:vocalists`）请求每首歌的 `fields=Artists`，只保留 `categories` / `roles` 含 `Vocalist` 的条目，写成 `data/increments/0006-song-vocalists.sql` 的 `song_vocalists` 行（`song_id`、`name`）。`artist_string` 会把大编制合唱压成 `feat. various`（Hand in Hand 的现场翻唱实际是 KAITO、MEIKO、初音ミク、巡音ルカ、鏡音リン、鏡音レン），所以「演出角色」以这张表为先；表里没有该歌时退回 `artist_string` 的 `feat.` 名单。`SongRow.vocalists` 由 `shared/catalog.ts` 读取时拼好，`shared/characters.ts` 的 `assignCharacters` 优先用它。

`scripts/vocadb/producers.ts`（`pnpm collect:producers`）同样请求每首歌的 `fields=Artists`，把 `categories` 含 `Producer`、或 `roles` 含 `Composer` / `Arranger` / `VoiceManipulator` 的署名按 VocaDB `artist.id` 去重后，写入 `data/increments/0007-song-producers.sql` 的 `song_producers` 行（`song_id`、`artist_id`、`name`、`roles`）。`roles` 是可审计的证据：`Producer` 类别记作 `producer`，再按源顺序追加命中的角色并转小写（例如 `producer, composer`）；占位名（`Unknown producer(s)`）和没有 artist id 的署名不写入。这组条件取自 VocaDB 自身的「Producers」分区（`categories` 为 `Producer`，或角色为 Arranger / Composer / Voice manipulator；Lyricist 属于 Other artists），见 <https://wiki.vocadb.net/docs/song-entry-page> 与 <https://wiki.vocadb.net/docs/song-entry-editing>；`roles` 返回 `Default` 表示沿用 artist type 的默认角色，本身不算证据，所以这类署名只靠 `categories` 入选。因此 Publisher、Illustrator、Animator、Lyricist、Mixer、Mastering、Instrumentalist，以及只有 Label / Circle 的署名都不是制作人；`VoiceManipulator`（調声 / 調音）属于制作侧，特意保留。该增量只重写自己派生的 `song_producers`（先 `DELETE` 再 `INSERT OR IGNORE`），不触碰其他表，因此不会改动已有的音乐 / 歌单数据。

**制作人名单的规则（核对制作人数据时以这条为准）**

1. 歌曲条目里的制作人名单（`song_producers`，来自 VocaDB `fields=Artists`）为准。
2. 仅当歌曲条目没有任何制作人记录时，才用 `artist_string`（歌单里显示的署名）解析。
3. 两者冲突时显示仍按 ①，同时把冲突写进 `docs/reports/producer-conflicts.md`，人工确认后才改。

结构化名单只收录制作侧职务的证据：`Producer` 类别，以及 `Composer` / `Arranger` / `VoiceManipulator` 角色（`roles` 列保存小写证据）。Publisher、Illustrator、Animator、Lyricist、Mixer、Mastering、Instrumentalist，以及只有 Label / Circle 的署名不算制作人；`VoiceManipulator`（調声 / 調音）属于制作侧，特意保留。因此 `Tell Your World` 只显示 `kz`，不显示 VocaDB 标为 Publisher 的 `Google`；`supercell`、`OTOIRO`、`livetune`、`Various artists` 等社团、厂牌或整张合辑署名也不会混进制作人。`shared/producer-options.ts` 的 `producerNamesFor` 做单曲判断，`producerNamesForSongs` 把同一规则应用到合并版本组；`availableProducers` 从每行实际展示的 `producerList` 生成选项，筛选匹配同一名单，并写入 URL 的 `producer` 参数。

`shared/producer-conflicts.ts` 把每首歌的自由文本与结构化名单做集合比较，分成 `agree` / `structured-only` / `extra-in-text` / `extra-in-structured` / `conflicting`（两边各有对方没有的名字）。`scripts/producer-conflict-report.ts`（`pnpm report:producers`）写出 `docs/reports/producer-conflicts.md`，按冲突严重度排序，逐条列出结构化名字与 `roles` 证据、自由文本名字和精确差异，每类附「如何处理」；`--check` 供 CI 校验已提交的报告没有过期，每周工作流会重新生成并随 `docs/reports` 一起提交。报告只做记录，不改任何数据；结论要维护者确认后才落到 VocaDB 或本仓库。

`shared/song-variants.ts` 校验 `data/song-variants.json`：键是变体歌曲 id，值含 `canonical`、`kind`（`remix` / `remaster` / `voicebank` / `cover` / `language`）与可选 `note`。链式映射（canonical 本身也是变体）与自指会抛错。导出 `canonicalSongId`、`variantSongIdsOf`、`groupSongIds`。

`shared/setlist-slots.ts` 负责歌单槽位：

- `parseNoteSelectors` 把备注拆成 `{ city, day, show, half }`。`Fukuoka Day 1`、`DAY 2`、`Nighttime Shows`、`DAY 1 1st and 2nd Show` 都能识别；`Encore` 没有可用维度，返回空。
- `itemsMergeable` 判定两行是否同一槽位：演出集合不同时要求两边在日期与场次上对齐；同一场记录跨多天时，退回按备注的日期/日夜判定；任一侧没有备注时不合并。
- `groupRowsIntoSlots` 只合并**连续**且与槽位内每一行都互斥的行。

`shared/album-setlists.ts` 校验 `data/album-setlists.json`：键是 performance id，值含 `albumId`、`albumType`（`bluray` / `cd` / `dvd`）与可选 `note`。它给出合成歌单 id（`1_000_000_000 + albumId`，与 VocaDB 歌单 id 不重叠）、曲目到原曲的解析，以及中文来源文案。`albumSetlistSources` 从目录里挑出某份歌单对应的专辑，页面据此显示「歌单来自蓝光/CD《…》的曲目列表，不是 VocaDB 上该场演出的歌单」。

`shared/edition-setlists.ts` 负责跨歌单合并（`/raw` 的对照视图与 `/shows` 的单份歌单）：

- `parseSetlistMerges` 校验 `data/setlist-merges.json`（键是 `song_list_id`，值为 `group` 与可选 `note`）。
- `partitionSongLists` 把一个系列年度的歌单分成合并组与独立歌单。
- `buildSetlistDisplay` 选演出最多的歌单作骨架，其余歌单用 LCS 对齐；重复曲目折叠进已有行；最后按槽位分组并给出行号、`演出` 标签与完整演出名。每个演出都演出的行不写演出标签。

`shared/setlist-diff.ts` 生成差异报告：单份歌单的结构指标（行数、去重曲目、正片/安可行数、分天替换行数）、两份歌单的 LCS 与差异曲目、五级分类（`identical` / `order-only` / `count-differs` / `segment-differs` / `probably-different-program`）。`scripts/setlist-diff-report.ts` 把它写成 `docs/reports/setlist-differences.{md,csv}`，`--check` 只比对不写入，CI 使用。

`shared/event-schedule.ts` 是三级模型里的场次层：

- `performanceDates` 把 `start_date`–`end_date`（含首尾）展开为日期；缺开始日返回空，倒序或非法的结束日收为开始日，最长 14 天。
- `showsForPerformance` 每个日期一个场次；`dayNightDates` 里的日期拆成 `日场` / `夜场`。key 为 `{performanceId}:{date}` 或 `{performanceId}:{date}:day|night`，label 为 `2020-11-28` / `2023-08-11 日场`。
- `dayNightDatesFor` 从备注读日夜证据：`Daytime` / `Nighttime` / `Afternoon` / `Evening` / 昼夜 / 昼公演 / 夜公演 / `1st Show` / `2nd Show`。备注写了 `Day N` 或裸日期时只标那一天，没写则标整个演出。VocaDB 没有结构化的日夜字段（`showtime_local`、`time_evidence` 均为空），所以一天默认就是一场，只有备注证明当天有日场 + 夜场时才拆开。
- `showsForNotes` 把一行分到场次：备注写了天、半天、场次号或裸日期时收窄到对应场次；否则计入该演出的全部场次。VocaDB 一份歌单对应整个 run，这是对「同一份歌单在每一场都演」的诚实读法。
- `performanceSchedules` 为整个目录算出场次表，排行、歌曲页覆盖数和 `/shows` 页头共用。第三到第五参数 `curatedDayNight` / `curatedNoShowDates` / `curatedHalves` 接收人工核实结果：`dayNight` 把一天拆成日场 + 夜场，`noShowDates` 去掉只有企划展的日子，`halves` 指定某天只有昼场或只有夜场。`data/performance-setlists.json` 的 `performances.<id>` 经 `shared/performance-setlists.ts` 转成这三张映射，并物化到 `performance_setlists`，页面与统计都读 `performance_show_setlists`，所以口径一致。

`shared/performance-setlists.ts` 是场次层的核心：

- `parsePerformanceSetlistCuration` 校验 `data/performance-setlists.json`（演出来源、`dayNight`、逐曲校正），`validateCurationAgainstCatalog` 再核对 id、场次 key 与日期区间。
- `buildPerformanceSetlists` 把源歌单展开到每个场次：`performanceSchedules` 得到场次 → `showsForNotes` 收窄每一行 → 按源行号排序并重新编号。`assign` 可以把一行改派给别的城市的场次，`exclude` 整行丢弃，`extra` 追加源歌单没有的曲目。
- `resolution` 取值 `vocadb-note`（备注到日期/半场）、`vocadb-shared`（整份无备注，含专辑补位）、`external`（外部来源定位）、`unresolved`（都没有）。`pending_review` 只在归属真的悬空时为 1：没有来源定位到这一场（`unresolved`）或来源之间互相矛盾（`conflict`）。`conflict` 表示与 VocaDB 或 `docs/data-issues.md` 的既有结论不一致且未裁决。
- `catalogDayNight` / `catalogSchedules` / `derivedItemSongIds` / `showSongIds` 供页面与统计共用，避免各自再解析一遍。

`shared/setlist-review.ts` 生成待二次确认清单：A 日夜场待核实、B 曲目归属待确认、C 行数不一致、D 全份歌单无备注、E 人工校正，以及 F 数据来源记录（已采用，不需要确认）。`scripts/setlist-review-report.ts`（`pnpm report:setlist-review`）写出 `docs/reports/setlist-review.md`，已存在时默认不覆盖以保护勾选，`--force` 才重写；`--check` 只校验格式（小节齐全、勾选框各占一行）。

`scripts/confirmation-report.py`（`pnpm report:confirmation`，Python + uv）写出给人看的 `docs/setlist-confirmation.md`：数据来源记录、百科也没写逐日时刻的演出、本轮按百科修正的冲突、城市级定案、整份无备注、上游无歌单。每节末尾留填写区，冲突节按「原问题 / 处理 / 来源」逐条列出。`scripts/build-setlist-curation.py`（`uv run`）是核实结果的唯一入口，它读 catalog 的原始备注、套用更正文案后再写出 `data/performance-setlists.json`。两份文件的分工是：`setlist-review.md` 逐条列出供程序校验格式，`setlist-confirmation.md` 按决策类型归并供人逐节回复。

`shared/rotation.ts` 解析歌单备注，把一行分到共享该歌单的场次。空备注表示该歌单的全部演出且不算不确定。备注按 `/`、`／`、逗号、顿号、分号、换行切开，`8/31` 这类日期斜杠保留。城市来自 `CITY_ALIASES`，也会从演出名推导（`MIKU EXPO 2026 Glendale`、`…」in HAMAMATSU`），所以新增城市不必先改清单。识别 `day N` / `DAY 1 1st Show` / `1日目` / `第2天`、`初日`、`千秋楽` / `最終日`、`両日` / `全日`、裸日期（`2024-08-31`、`8/31`、`8月31日`）、昼夜 / 1st·2nd show。没有写城市的 `Day N` 会落到每个城市自己的第 N 天，而不是随便挑一个城市。`reviewRotations` 再做长度一致性检查，与众数不同的演出记入 `shows`。

备注的最终分类：

- `unknown format`：看起来在选日期却落不到任何一天（例如 `Day 9`）。保留为警告；当前目录里为 0 行。
- `unmatched city`：备注写了城市，但该歌单有多场且没有这个城市。单场歌单上的城市名视为背景说明，不算警告。
- `city-only when city has several shows: N`：只写了城市，该城市在这个歌单里有 N 场。`formatRotationReason` 输出 `共 N 场`，行仍然是 `uncertain`。
- `day with day/night shows`：日期落在同日多场，或备注写明了日场 / 夜场，无法进一步区分。
- `setlist length mismatch: N vs expected M`：该场解析出的曲目数与该歌单的常见长度不同。

不是轮换信息的片段（`Encore`、乐队介绍、活动名、链接、开演时间等）不产生 reason，而是收集到 `RotationParse.info`，页面用灰色原样显示，读者不会看到解析器状态。

`shared/show-coverage.ts` 统计一首歌在一个演出里演出了几个场次，给歌曲页的出场记录用：

- 分母是该演出推导出的场次数；没有日期或没有歌单的演出没有可比的场次，不进入结果。
- 分子直接读场次层 `performance_show_setlist_items`：歌曲出现在哪些 `show_key` 就是覆盖几场，不再在运行时解析备注。没有展开行的旧目录（测试夹具）回退到 `showsForNotes`。
- 不再跨城市汇总：大阪与东京各算各的演出，一份只在东京出现的歌单不会改变大阪那行的覆盖数。
- 显示为 `本演出全部 N 场`（全覆盖）或 `N 场中 M 场`（部分覆盖）。只有 1 个场次的演出不显示，避免每行都写「本演出全部 1 场」。
- 备注已经给出 `共 N 场`（`city-only when city has several shows: N`）的行不再显示覆盖数，由该警告独占数字，避免同一格出现两个不同总数。`/shows` 与 `SetlistTable` 是按演出的视图，不显示覆盖数。


`shared/song-titles.ts` 校验并格式化中文歌名。`shared/series-titles.ts` 校验 `data/series-titles.zh-CN.json`，按系列名查出中文名，并把演出名里的系列标签换成中文名而保留系列年度年份；没有条目的系列（如 `MIKU EXPO`）或语言为 `original` 时原样返回。`shared/characters.ts` 把声库名收成角色。`shared/lookup.ts` 做目录内子串匹配，并把 VocaDB 搜索结果收成最多 5 条投稿链接。

`shared/performance-name.ts` 的 `shortPerformanceName` 去掉演出名里已由「系列」列显示的系列名与年份，留下城市、系列后缀或周年说明；匹配时兼容 `初音ミク「マジカルミライ」` + 2013 与 `初音ミク「マジカルミライ 2013」` 两种写法。

`shared/place-names.ts` 校验 `data/place-names.zh-CN.json`，并按站点语言把演出名里的地点换成中文名。拉丁字母的键按整词、不区分大小写匹配，长键优先（`東京都` 先于 `東京`）；语言为 `original` 时原样返回。

`shared/cities.ts` 把 `performances` 聚合成城市排行。城市由 `place-names.zh-CN.json` 的中文名与 `shared/rotation.ts` 的 `CITY_ALIASES` 共同识别：按 `series_suffix` → `name` → `name_ja` → `venue_name` 依次匹配，长拼写优先，所以 `Washington D.C.` 不会被 `Washington` 抢走。中文名去掉末尾「都 / 市」后作为分组键，`東京都`、`東京`、`TOKYO` 因此同组（`京都` 这类会短于两个字的名字保留后缀）。演出数是不同 `performances` 行数；场次是每行覆盖的演出日数，传入 `showCounts` 时会把日场 / 夜场拆开（`start_date`–`end_date` 闭区间，无日期或倒序的区间计 1 个场次，最长 14 天）。配信、线上与 VR 行默认剔除；识别不出城市的行只汇总到 `unknown`，不编造城市。

`shared/overview.ts` 给 `/series` 总览页供数：`buildSeriesOverview` 按 `series_id` 汇总每系列的演出数、场次、年份跨度与首末演出日期，按首次演出日期升序；`buildPerformanceOverview` 把全部演出摊平成一行一条，日期倒序、无日期的排在最后，并带场馆、场次与「有没有歌单」。两者都接受可选的 `showCounts`（`performanceSchedules` 的场次数），没传时按日历天计场次。

### 页面、组件、服务端

页面在挂载后调用 `app/composables/useCatalog.ts` 的 `load`。服务端渲染不打开 wasm。客户端只下载一次 `/data/catalog.sqlite.gz?v=<hash>`，在浏览器里解压成 sqlite 字节，用 `/sql-wasm.wasm` 初始化 sql.js，再 `loadCatalog`。结果放在 Nuxt `useState` 里，各页共用。

| 路由 | 文件 | 做什么 |
| --- | --- | --- |
| `/` | `app/pages/index.vue` | 排行。`UTable` + TanStack 排序，按场次（默认）或按演出统计；系列、年份、配信、串烧、角色、制作人筛选；筛选写入 URL query（`mode=event` 切到按演出，`producer` 记录制作人）；合并版本行显示「含 N 个版本」（N 含原版）；「制作人」列只显示 `feat.` 之前的制作人，宽度受限并带完整署名气泡；「歌手」列限宽 236px，最多直接显示 3 个彩色应援色标签，其余收进末尾的 `+N` 按钮，悬停时气泡用同样的标签列出剩余角色；「演出数」列展示去重后的演出行数（按演出统计时与次数列相同，因此该模式隐藏此列）；歌曲列限宽 288px |
| `/raw` | `app/pages/raw.vue` | 原始数据。跨演出歌单对照（同一系列年度多个演出的歌单并排，`SetlistTable`）、13 张数据表（每张 100 行分页）、质量报告（缺 PV、无歌单演出、专辑曲目补位、未解析备注、串烧隔离、疑似重复） |
| `/cities` | `app/pages/cities/index.vue` | 城市排行。`UTable` 排序；列出演出数与场次（演出日，含日场 / 夜场）、最早/最晚年份，城市名附 VocaDB 原始拼写；无法归属城市的线上演出单独提示 |
| `/report` | `app/pages/report.vue` | 差异核验。按范围/分级/合并状态筛选，列出差异曲目并链到 VocaDB，可复制 Markdown；范围是同一系列年度或相邻系列年度 |
| `/songs/{id}` | `app/pages/songs/[id].vue` | 单曲详情。页头写原版的投稿日期与演出角色；没有并入其他版本时不渲染「其他版本」卡片，有则只列并入的版本，每条给出类型、制作人与歌手（制作人先取该版本的 `song_producers`，没有时才退回 `artist_string` 的 `feat.` 前并去掉 VocaDB 的 `Unknown producer(s)` 占位；歌手取自 `song_vocalists`，没有该歌的名单时退回 `feat.` 名单，解析不到时用原版的）；出场记录备注列写明本演出覆盖几个场次；相关投稿有快照时附播放量 |
| `/shows/{id}` | `app/pages/shows/[id].vue` | 一个演出的场次列表、轮换解析结果与长度一致性；歌单来自专辑时显示来源提示。面包屑只有 系列 → 演出 两级，系列项链到 `/series/{id}` |
| `/series` | `app/pages/series/index.vue` | 系列与演出总览。上半是系列表（演出数、场次、年份跨度、首次与最近演出），下半是全部演出的表（日期、演出、系列、场馆、场次），可按系列筛选与排序；两张表都链到 `/series/{id}` 与 `/shows/{id}` |
| `/series/{id}` | `app/pages/series/[id].vue` | 系列主页：该系列的全部演出（每个城市站一行，列出日期、场馆与场次数并链到 `/shows/{id}`），带年份跨度、演出数与场次合计，页头链回 `/series` 总览。站内只有 系列 → 演出 → 场次 三级，不再有年度索引页 |

`edition_premieres` 表与 `series_number` 列保留（来自 VocaDB，用于系列年度首演与歌单差异对照），但**不再**是导航层级：页面只按 系列 → 演出 → 场次 展示，`series_number` 只在需要时作为演出旁的年份标签出现。

`app/components/SiteSearch.vue` 是页眉的全局搜索：宽屏是常驻输入框加浮层结果，窄屏是顶栏按钮打开的全屏浮层。它先跑 `localSongMatches`，本地没有命中时才请求 `/api/lookup`；结果链到 `/songs/{id}`，也可以带着关键词跳到排行。

外部 AI agent 如何使用目录、公开 HTTP 路由与计数口径，见 [`skills/query-concert-stats/SKILL.md`](../skills/query-concert-stats/SKILL.md)。该目录是可安装给任意外部 agent 的公开 skill 布局（`npx skills add RJiazhen/miku-concert-stats@query-concert-stats`）。

仓库内部的歌单采编流程（抓百科逐曲表 → 对曲名 → 展开场次 → 出报告）见 [`.cursor/skills/update-concert-data/SKILL.md`](../.cursor/skills/update-concert-data/SKILL.md)；它只作为 Cursor 内部 skill 使用，不对外发布。

`app/pages/catalog.vue`、`compare.vue`、`windows.vue`、`correlation.vue` 保留实现，但都带 `definePageMeta({ middleware: 'retired' })`，直接访问会重定向到首页。`app/middleware/retired.ts` 是唯一的重定向实现；拿到播放量快照后删掉页面上的这一行并恢复导航项即可。

`app/components/SetlistTable.vue` 是 `/raw` 与 `/shows` 共用的歌单表：槽位用 `rowspan` 合并序号单元格，末尾一列在演出页是「场次」（该行属于这个演出的哪一天 / 日场 / 夜场），在 `/raw` 的跨演出对照是「演出」（该行属于哪个城市站）；每个场次都演出的行留空。列是「序号 / 歌曲 / 歌手 / 场次或演出 / 数据说明」，不显示 VocaDB 原始备注；「数据说明」先用 `formatRotationReason` 写成黄色警告，再把 `info` 里的原始背景片段用灰色原文附在末尾。`/shows` 会传入 `currentPerformanceId`、`currentCity` 与系列名：页头已经写出当前演出与场次，因此只属于当前演出的行留空，确实属于其他演出的行只显示 `shortPerformanceName` 留下的城市等短名（再经 `localizePlace`），完整演出名保留在气泡里；`/raw` 不传这些 prop，仍显示 VocaDB 完整名。

`/shows` 页头在标题下用一行写出具体演出信息：日期（单日或 `start – end` 区间）、城市、场馆，以及目录有记录时的开演时间；再下一行是场次列表（`2023-08-11 日场` / `夜场` 这类），然后是所属系列并链到 `/series/{id}`。空字段直接省略，日期与场馆的拼接由 `shared/performance-header.ts` 的 `performanceHeaderFacts` 统一处理，场次由 `shared/event-schedule.ts` 推导。

`partitionSongLists` 只按 `data/setlist-merges.json` 分组；`displaySides` 在此之上把被轮换检查标出「歌单长度不一致」的歌单单独拆出来，界面上提示「不与同组合并」。同一系列不同演出的歌曲数量对不上时不合并，按多份歌单分别显示。

`app/components/SiteHeader.vue` 是吸顶毛玻璃导航：品牌（`public/logo.png` 徽标）、五个入口（歌曲 / 系列 / 城市 / 原始数据 / 核验）、中文名称开关（`USwitch`，只在客户端生效，同时控制中文歌名、中文地点与中文系列名）、`UColorModeButton`。站点图标同样指向 `/logo.png`（`nuxt.config.ts` 的 `app.head.link`）。`app/components/HeroBackdrop.vue` 画固定的青绿/洋红径向光晕与细网格，不进入正文层。

`app/composables/useSongLanguage.ts` 保存歌名语言，`localStorage` 键 `miku-concert-stats-song-lang`（`zh` / `original`），并暴露 `showChinese` 布尔绑定给开关。服务端和首屏先显示原文，挂载后再读选择，避免注水不一致。

`app/composables/usePlaceNames.ts` 读写同一个语言状态，并暴露 `localizePlace`，把演出名里的地点换成当前语言的地名。`/songs`、`/shows`、`/series` 与 `SetlistTable` 的演出名都经过它；`/raw` 保留 VocaDB 原文。

`app/composables/useSeriesTitles.ts` 复用同一语言状态，暴露 `localizeSeries`（系列名换成当前语言）、`seriesTitle`（主名加原文注释）与 `localizePerformanceSeries`（只换演出名里的系列标签，系列年度年份保留）。排行的系列筛选、`/series` 标题与面包屑、`/shows` 标题、`/songs` 的「系列」列与 `/report` 的组合标题都经过它；`/raw` 与已退役的 `/catalog`、`/windows` 保留 VocaDB 原文。路由与查询串仍只用数字 `series_id`，本地化只作用于显示文本。

`app/composables/useSongLookup.ts` 提供 `songById` / `songName`；`useSongVariants.ts` 与 `useSetlistMerges.ts` 在模块加载时解析各自的 JSON 清单。

`app/components/FeedbackWidget.vue` 是固定右下角的「报告错误」悬浮按钮（`UButton` + `i-lucide-message-square-warning`，窄屏只显示图标，底部留 `env(safe-area-inset-bottom)`），挂在 `app/layouts/default.vue`，所以每个页面都有。点击打开 `UModal`：

- 只读灰底字段只有两个，由页面当场采集：页面链接（含查询串）与页面标题。`readonly` 而不是 `disabled`，文字仍可选中复制。不采集视口、采集时间、目录版本，也不采集 IP、User-Agent 等指纹信息。
- 弹窗只有标题「报告错误」，没有副标题；可编辑项只有「问题描述」与「正确的数据来源（可选）」。
- 「问题描述」必填，最多 4000 字；「正确的数据来源（可选）」只在非空时校验为 http/https，最多 2000 字符。
- 提交中按钮进入 pending，失败保留草稿并显示服务端返回的中文原因。

`app/composables/useFeedbackDraft.ts` 把描述与来源链接写进 `localStorage` 键 `miku-feedback-draft`，每次输入即写、重新打开弹窗或刷新页面都会恢复；关闭 / 取消都不清除，只有提交成功后才删除。`localStorage` 的读写全部包在 `try/catch` 里，SSR、无痕模式和损坏的 JSON 都退回空草稿。

`server/api/lookup.get.ts` 只在浏览器请求 `GET /api/lookup?q=` 时搜索 VocaDB `/api/songs`（`maxResults=5`，`fields=PVs`）。查询长度须为 1–80。失败返回 400 或 502。

`server/api/feedback.post.ts` 接收悬浮按钮的报告。请求体上限 16 KB，必须是 JSON；`shared/feedback.ts` 的 `parseFeedbackPayload` 去掉首尾空白、校验长度与 URL 协议，再写成 `feedback:<服务器 ISO 时间>:<uuid>` 存进 KV，`expirationTtl` 为 180 天。没有绑定（`nuxt dev` 总是如此）或 KV 写入失败时返回 503 与中文提示，客户端保留草稿。描述内容不会写进任何日志。

`server/api/feedback/list.get.ts`、`server/api/feedback/[id].get.ts` 与 `server/api/feedback/status.post.ts` 组成维护者后台的数据接口；页面在 `app/pages/admin/` 下，统一使用 `app/layouts/admin.vue`（Nuxt UI 的 `UDashboardGroup` + `UDashboardSidebar` + `UDashboardNavbar`）提供完整后台外壳：固定侧栏、顶部导航、登录状态、主题切换与返回站点入口。后台不挂在任何公共导航、页脚或组件里，只能直接输入 URL；`useHead` 写 `robots: noindex, nofollow`。

`/admin` 由 `app/pages/admin/index.vue` 通过 `definePageMeta({ redirect: '/admin/feedback' })` 默认跳到反馈收件箱。其余页面：

- `/admin/feedback`：反馈收件箱，筛选、搜索、状态切换。
- `/admin/data`：用 `useCatalog` 在浏览器读取公开的 `catalog.sqlite`，展示歌曲 / 演出 / 系列 / 歌单 / 视频规模、平台分布与数据新鲜度。
- `/admin/system`：`/api/admin/session` 返回的 Access、身份、KV、目录版本与运行环境。

`server/middleware/admin-guard.ts` 在页面渲染前运行：只处理 `GET` / `HEAD` 的 `/admin` 与 `/admin/*`。没有 `Cf-Access-Jwt-Assertion` 时用 `shared/admin.ts` 的 `buildAccessLoginUrl` 302 到 `https://<ACCESS_TEAM_DOMAIN>/cdn-cgi/access/login/<hostname>?kid=<ACCESS_AUD>&redirect_url=<原路径>`；已经带着 token 但校验失败时不重定向，避免 Access 登录与失效 token 之间循环，改由页面显示「登录状态无效」。本地 `nuxt dev` 会通过 Cloudflare 模拟读到真实 `[vars]`，但 127.0.0.1 不是 Access 的 destination，所以 `import.meta.dev` 下只渲染后台外壳并提示不会跳转。`ACCESS_TEAM_DOMAIN` 或 `ACCESS_AUD` 为空时同样不跳转，页面会提示配置缺失。

`server/api/admin/session.get.ts` 返回 `{ configured, identity, storage, catalogVersion, environment, serverTime }`；`configured: false` 时身份为 `null`，让本地开发能渲染配置提示，配置完成后没有有效 token 仍是 401。鉴权成功的身份会由 guard 写入 `event.context.adminSession`，后台布局在 SSR 首屏直接读取，避免为了显示邮箱再发一次请求。

身份完全由 Cloudflare Access 负责，页面里没有密码框。`server/utils/access.ts` 读取 `Cf-Access-Jwt-Assertion` 请求头，用 WebCrypto 验证 RS256 签名（不引入 `jose` 之类的依赖），再校验 `iss` 必须等于 `https://<ACCESS_TEAM_DOMAIN>`、`aud` 必须包含 `ACCESS_AUD`，`exp` 已过期或 `nbf` 尚未生效都拒绝（允许 30 秒时钟偏差），`alg` 只接受 `RS256`（`none` 与 HMAC 混淆直接拒绝）。团队 JWKS 从 `https://<ACCESS_TEAM_DOMAIN>/cdn-cgi/access/certs` 用 `fetch` 取，模块级缓存 5 分钟；取不到就拒绝，密钥轮换最迟 5 分钟后生效。

`server/utils/feedback.ts` 的 `assertFeedbackIdentity(event)` 是数据接口的唯一入口，list / detail / status 三个路由都在任何 KV 访问之前 `await` 它。任何失败——缺少请求头、绑定为空、签名错误、claim 不符、JWKS 不可达——都抛出同一个 `401 Unauthorized`，body 只有 `data: null`，不返回反馈内容、条数或原因；`ACCESS_TEAM_DOMAIN` 或 `ACCESS_AUD` 为空时同样全部 401（fail closed）。验证成功的身份（`sub` / `email`）只在 Worker 内部使用，不写进日志；后台页面只通过受 Access 保护的 session 接口显示邮箱。

`GET /api/feedback/list` 按时间倒序返回最新 50 条（`limit` 最大 200），每条带 `status`；`GET /api/feedback/:id?receivedAt=<ISO>` 读单条；`POST /api/feedback/status` 接收 `{ id, receivedAt, status }`，用同一个 KV key 与同样的 `FEEDBACK_TTL_SECONDS` 重写整条记录，状态只接受 `open` / `resolved`，旧记录缺 `status` 时按 `open` 解析。

收件箱页提供 `全部 / 未解决 / 已解决` 筛选、各自计数（计数来自已加载的那一页，不发第二次请求）与跨描述 / 页面标题 / 页面链接 / 来源链接的客户端搜索。明确不提供删除与归档：KV 本身就是只追加的日志，记录在提交 180 天后由 TTL 自动过期，保留原始描述比腾出空间更重要，也避免误删唯一证据。

`server/api/feedback.post.ts` 保持公开且行为不变：它不校验身份，只在写入成功后返回 `{ ok, id }`。

## 数据流

```mermaid
flowchart TD
  vocadb["VocaDB public API"]
  cache["data/cache SHA-256 JSON"]
  collect["scripts/vocadb/collect.ts"]
  albums["data/album-setlists.json"]
  collectalbums["scripts/vocadb/album-setlists.ts"]
  youtube["YouTube Data API videos.list"]
  snap["scripts/snapshot-youtube.ts"]
  inc1["data/increments/0001-vocadb-catalog.sql"]
  inc2["data/increments/0002-youtube-snapshots.sql"]
  inc4["data/increments/0004-album-setlists.sql"]
  eval["scripts/evaluate-conversion.ts"]
  inc3["data/increments/0003-conversion.sql"]
  schema["data/schema.sql"]
  build["scripts/build-catalog.ts"]
  sqlite["public/data/catalog.sqlite"]
  gzip["public/data/catalog.sqlite.gz"]
  wasm["public/sql-wasm.wasm"]
  browser["sql.js in the browser"]
  shared["shared/stats rotation variants slots diff"]
  pages["app/pages + Nuxt UI"]
  widget["FeedbackWidget"]
  feedback["POST /api/feedback"]
  feedbackkv["KV binding FEEDBACK"]
  admin["/admin（隐藏后台，默认跳 /admin/feedback）"]
  adminapi["feedback + admin session APIs"]
  access["Cloudflare Access（登录重定向 + JWKS）"]
  worker["Nitro Worker SSR"]
  lookup["GET /api/lookup"]
  report["docs/reports"]

  vocadb --> collect
  collect --> cache
  cache --> collect
  collect --> inc1
  collect --> eval
  vocadb --> collectalbums
  albums --> collectalbums
  collect --> collectalbums
  collectalbums --> inc4
  youtube --> snap
  snap --> inc2
  snap --> eval
  schema --> build
  inc1 --> build
  inc2 --> build
  inc4 --> build
  inc3 --> build
  eval --> inc3
  build --> sqlite
  build --> gzip
  build --> wasm
  gzip --> browser
  wasm --> browser
  browser --> shared
  shared --> pages
  worker --> pages
  pages --> widget
  widget -->|"description + sourceUrl + page URL/title"| feedback
  feedback --> feedbackkv
  adminapi -->|"先校验 Access 身份"| access
  adminapi --> feedbackkv
  admin -->|"未登录时 302"| access
  admin -->|"直接输入 URL"| adminapi
  pages -->|"local miss only"| lookup
  lookup --> vocadb
  sqlite --> report
  report --> pages
```

## 配置与清单文件

### `wrangler.toml`

对象。`name`、`compatibility_date`、`compatibility_flags` 之外，还有反馈功能需要的三组配置：

- `[[kv_namespaces]]`：`binding = "FEEDBACK"`，`id` 由 `pnpm exec wrangler kv namespace create FEEDBACK` 生成（当前是 `777b49ffd2744f12a54fc3611ff791e9`）。`nuxt build` 会把它抄进 `.output/server/wrangler.json`，部署时生效。换账号或删掉命名空间后必须重新创建并替换 id。
- `[vars] ACCESS_TEAM_DOMAIN` / `ACCESS_AUD`：Cloudflare Access 应用的团队域名（如 `example.cloudflareaccess.com`，不带 `https://`，写 `https://` 也能被规范化）与 Audience（AUD）标签。仓库里已填好 2026-11-04 创建的应用；**任意一项为空时所有管理接口都返回 401 且没有 payload**，所以忘记填只会锁死后台，不会泄露反馈。
- 手工步骤：在 Zero Trust > Access > Applications 为 Worker 主机名新建 Self-hosted 应用，路径 destination 至少填 `/admin`、`/admin/*`、`/api/admin/*` 与 `/api/feedback/*`，策略只允许维护者邮箱；再把这个应用的 AUD 标签与团队域名填进 `[vars]` 并重新部署。`/admin` 与 `/admin/*` 让 Access 在边缘完成页面登录重定向，也让 Worker 自己拼出的登录 URL 能回到正确路径；`/api/admin/*` 覆盖 session 接口。注意不要写成 `/api/feedback*`：那会把公开的 `POST /api/feedback` 一起拦在 Access 后面，访客就无法提交反馈了；`/api/feedback/*` 只覆盖 `list` / `status` / `<id>` 这些管理路径。
- 旧的 `FEEDBACK_TOKEN` secret 已不再被读取，管理接口也不接受 query / body 里的 `token`；如需清理线上的历史 secret，可执行 `pnpm exec wrangler secret delete FEEDBACK_TOKEN`。

`nuxt dev` 不把 `FEEDBACK` 绑定交给路由，因此开发环境提交固定返回 503，可以稳定验证降级路径；Cloudflare 模拟会把 `[vars]` 带进开发环境，但 127.0.0.1 不是 Access 的 destination，所以 `/admin` 不会跳转，只渲染后台外壳并提示本地不读取真实反馈。要看真实数据请在浏览器里完成 Access 登录后打开线上页面。

### `data/song-variants.json`

对象。键是变体歌曲 id 的十进制字符串，值是 `canonical`（并入的歌曲 id）、`kind`、可选 `note`。只能一级映射，不允许 A → B → C。单曲页的版本备注取自 `variantVersionNote`：`kind` 与标题差异之外，`cover` 还会用变体歌曲自己的署名解析出演出角色，附在全角括号里（如 `翻唱（鏡音リン、鏡音レン）`）；解析不到角色时不加括号。

### `data/setlist-merges.json`

对象。键是 `song_list_id`，值是 `group`（同一组合共用）与可选 `note`。用 LCS 覆盖率人工确认过才写入；`docs/reports/setlist-differences.md` 会列出未合并的候选。

### `data/album-setlists.json`

对象。键是 VocaDB performance id，值是 `albumId`（VocaDB 专辑 id）、`albumType`（`bluray` / `cd` / `dvd`）与可选 `note`。只收录人工核对过的对应关系：同一系列年度有多座城市时共用该系列年度的官方专辑，并在 `note` 里写明这是系列年度级对应。没有发行专辑的年份（2026、2027）不写。目录里的歌单 id 是 `1_000_000_000 + albumId`，`song_lists.source = 'album'`，`medium` 取这里的 `albumType`。曲目沿 `originalVersionId` 解析到原曲，因此排行榜与播放量仍落在原曲上。核对单个场次时查询 `sqlite3 public/data/catalog.sqlite "SELECT id, name, album_id, medium FROM song_lists WHERE id = 1000000000 + <albumId>"`，或直接打开 `/shows/{performanceId}` 看来源提示；例如 2017 系列年度东京演出（演出 2959）指向专辑 30961（蓝光）。

### `data/song-titles.zh-CN.json`

对象。键是 VocaDB 歌曲 id，值含非空 `title`、非空 `source` 与可选 `comment`。

### `data/place-names.zh-CN.json`

对象。键是 VocaDB 演出名里的地点写法（拉丁字母或日文），值是中文名。键不能只差大小写；渲染时长键优先，拉丁键按整词匹配。只收录人工核对过的地点，没收录的写法保持原样。

### `data/series-titles.zh-CN.json`

对象。键是目录里 `series.name` 的原文（日文或拉丁字母），值是中文系列名。只收录人工核对过的译名；`MIKU EXPO` 没有收录，使用官方拉丁写法，显示时保持原文。渲染时键必须与 `series.name` 完全一致，缺条目时回退原文，不会显示空字符串；`localizeSeriesInName` 还会把演出名里的系列标签换掉并保留系列年度年份（`初音ミク「マジカルミライ 2024」` → `魔法未来 2024`，`MIKU WITH YOU 2024 in Shanghai` → `未来有你 2024 in Shanghai`）。

### `data/characters.json`

对象。键是展示用的角色名。值含 `patterns`（锚定名称开头的正则）、可选 `aliases`（整段或前缀别名）与可选 `color`（应援色 `#rrggbb`，非法值会让解析抛错）。排行页的角色筛选项不按这个顺序列出，而是取当前排行中实际出现的角色，按出现次数从多到少排列，并带上次数。歌手列的标签用 `color` 作边框、同色 12% 透明度作底色；`shared/character-chips.ts` 的 `splitCharacterChips` 只让前 3 个角色直接显示，其余收进末尾的 `+N` 按钮，悬停时用同样的彩色标签在气泡里列出剩余角色。

## 运行、构建、测试、部署

```bash
pnpm install
pnpm dev --port 3001
```

`predev` 会先跑 `build-catalog`。补抓专辑曲目（只请求 `data/album-setlists.json` 里的专辑）时运行 `pnpm collect:albums`；它会重写 `data/increments/0004-album-setlists.sql`，不会碰 `0001`。改过源歌单或 `data/performance-setlists.json` 之后必须重算场次层，否则 `/shows` 与排行仍是旧数据：

```bash
pnpm derive:setlists          # 重写 data/increments/0008-performance-setlists.sql
pnpm derive:setlists --check  # CI 用，只比对不写入
pnpm report:setlist-review    # 重写 docs/reports/setlist-review.md（已存在时需 --force）
pnpm report:confirmation      # 重写给人看的 docs/setlist-confirmation.md
```

开发服务器已占用 Nuxt 锁时，另开的检查要跳过锁：

```bash
NUXT_IGNORE_LOCK=1 pnpm lint
NUXT_IGNORE_LOCK=1 pnpm typecheck
NUXT_IGNORE_LOCK=1 pnpm test
NUXT_IGNORE_LOCK=1 pnpm build
```

`pnpm typecheck` 是 `tsc --noEmit` 再加 `nuxt typecheck`。`pnpm test` 是 `vitest run`。`pnpm build` 同样先重建目录，再 `nuxt build`。

部署到 Cloudflare Workers：

```bash
pnpm build
pnpm exec wrangler --cwd .output deploy
```

后台不再使用 secret，改由 Cloudflare Access 登录。2026-11-04 已创建应用 `miku-concert-stats feedback admin`（destinations：`/admin`、`/admin/*`、`/api/admin/*`、`/api/feedback/*`，策略 `my-cloudflare-account`），两项 `[vars]` 已填好。重建或换账号时的步骤：

1. 在 Zero Trust > Access > Applications 为 Worker 主机名新建 Self-hosted 应用，路径 destination 填 `/admin`、`/admin/*`、`/api/admin/*` 与 `/api/feedback/*`（不要用 `/api/feedback*`，否则会拦住公开的 `POST /api/feedback`）。
2. 加一条 Allow 策略，只放行维护者邮箱（需要的话再加 MFA）。
3. 复制应用的 Audience（AUD）标签与团队域名，填进 `wrangler.toml` 的 `[vars]`，再重新部署。

```toml
[vars]
ACCESS_TEAM_DOMAIN = "summer-thunder-62e1.cloudflareaccess.com"
ACCESS_AUD = "87de2159d583fb4b7536e98227178ba3150fc953ef3a3f817e2f8334cdd00e4b"
```

任意一项为空时后台整体 401，不会返回任何反馈数据。之后在浏览器打开 <https://miku-concert-stats.rjiazhen.top/admin>，未登录会先 302 到团队 Access 登录页（页面本身没有密码框），登录后回到 `/admin/feedback`。命令行要拿 JSON 时可以交给 `cloudflared` 带上 Access 头：

```bash
cloudflared access curl "https://miku-concert-stats.rjiazhen.top/api/feedback/list?limit=200" | jq
```

返回 `{ count, items }`，`items` 按提交时间倒序，每条含 `id`、`receivedAt`、`status`、`description`、`sourceUrl`、`pageUrl`、`pageTitle`；`collectedAt` 由服务端在缺省时补成 `receivedAt`，旧记录还可能带 `viewport`、`catalogVersion`，且缺 `status` 时按 `open` 返回。需要更多条目时加 `&limit=200`（上限 200）。反馈在 KV 里保留 180 天，过期自动删除。没有做 IP 限流、验证码或去重，只限制了请求体大小与字段长度。

线上地址：<https://miku-concert-stats.rjiazhen.top>

Workers Builds（Git 集成）的配置要求：

- 生产分支 `main`（`origin/main` 必须包含完整代码，不能只有 README）。
- Build command `pnpm build`（Workers Builds 会先自动跑 `pnpm install --frozen-lockfile`）。
- Deploy command `npx wrangler deploy`。`nuxt build` 生成 `.wrangler/deploy/config.json`，把根目录配置重定向到 `.output/server/wrangler.json`。不要加 `--cwd .output`：构建未产出 `.output` 时 wrangler 会报 `Missing file or directory`，而空的 Build command 正是导致 Builds 全部失败的原因。
- 环境变量 `NODE_VERSION=22`。

Previews（非 `main` 分支）的 Build command 相同，deploy command 是 `npx wrangler versions upload`，只上传版本不发布；它的 `NODE_VERSION=22` 与生产是两份独立配置。

`catalog.sqlite` 是构建产物，所以数据提交后需要再触发一次部署才会更新线上。

### GitHub Actions

`.github/workflows/ci.yml`（`ci`）在指向 `main` 的 push，以及所有 pull request 上运行。Node 22，`pnpm install --frozen-lockfile`，然后 `pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build:catalog`、`pnpm derive:setlists --check`、`pnpm report:setlist --check`、`pnpm report:setlist-review --check`、`pnpm report:producers --check`。

`.github/workflows/weekly-collect.yml`（`weekly-collect`）在每周一 16:00 UTC 和手动触发时运行。它执行 `pnpm collect`、`pnpm collect:producers`、`pnpm derive:setlists`、`pnpm snapshot:youtube`、`pnpm report:setlist` 与 `pnpm report:producers`，`data/increments` 或 `docs/reports` 有差异时由 `github-actions[bot]` 提交并推送。待确认清单不在自动提交范围内：它可能已被人勾选，需要人工跑 `pnpm report:setlist-review`。

## 协作与提交约定

### 收尾即提交

有一个明确的修改任务（用户提出或 subagent 完成）并且 `lint` / `test` / `typecheck` / `build` 通过后，直接提交并 push 到当前工作分支，不需要先问用户。提交信息用简短的祈使句英文，与现有历史一致；不要加任何 co-author trailer（含 Cursor）。

`main` 是开发与生产共用的分支：本地在短分支上开发，完成后合回 `main` 并 push；Workers Builds 的生产分支配的就是 `main`，所以只有 push 到 `main` 之后线上才会更新。`feat/initial-build` 已废弃，不再作为开发分支使用。

### 并发任务用 worktree

多任务并行时，不要在同一条工作树里让多个 agent 同时改同一批文件。担心互相干扰就按全局 checkout 规则新开 worktree：

```bash
git -C "$HOME/projects/full-stack/miku-concert-stats.worktrees/main" worktree add \
  "$HOME/projects/full-stack/miku-concert-stats.worktrees/<branch-name>" -b <branch-name>
```

目录名等于分支名，并把该文件夹加进旁边的 `miku-concert-stats.code-workspace`。只有明确会同时改动同一文件（例如都改 `app/pages/index.vue`）时才需要拆 worktree；无关的改动可以在同一工作树里先后完成。

### 提交范围

只 `git add` 本次任务涉及的具体路径，不要 `git add -A`：工作树里可能还有别的任务尚未提交的改动。提交前先 `git status --short` 确认只有预期文件，提交后再用 `git status --short` 确认干净。

### 网页任务开本地服务器

凡是改动用户可见行为的任务（页面、组件、样式、筛选、UI 里展示的数据），收尾时都要留一个本地开发服务器在运行，方便用户随时打开检查；只跑通 `build` / `test` 不算完成。

本机 Node 26.x 下直接 `pnpm dev` 会在 `@nuxt/cli` 同步 allowed hosts 时崩掉（`options.hostname.toLowerCase is not a function`），必须显式指定 host：

```bash
NUXT_IGNORE_LOCK=1 pnpm dev --host 127.0.0.1 --port <port>
```

用后台 / detached 的方式启动，让它在本任务结束后继续存活。

端口按工作树分配，避免互相抢占：主工作树 `main` 用 `3117`，`feat/album-tracklist-fallback` 用 `3123`，`feat/feedback-widget` 用 `3131`，`feat/series-overview` 用 `3139`。新工作树自己挑一个没被占用的端口并记录下来（本节或任务报告）；同一端口上已有 Nuxt 进程时，`NUXT_IGNORE_LOCK=1` 用来绕开 `.nuxt` 的锁。

任务结尾要把服务器地址（如 `http://127.0.0.1:3117/`）告诉用户。服务器是热更新的，改完代码不用重启；只有 `public/data/catalog.sqlite.gz` 重新生成时才需要硬刷新页面。

`.nuxt`、`.output`、`public/data/catalog.sqlite*` 都是构建 / 开发产物，已被 git 忽略，任何时候都不要提交。
