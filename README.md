# 初音未来演唱会曲目统计

统计 Crypton 主办的初音未来演唱会歌单，并在浏览器里比较各场、各系列、各年份的播放量区间。日常聚合不在服务器上跑。Cloudflare Worker 只负责首屏 SSR，以及目录里找不到歌时的按需检索。

收录系列：マジカルミライ、MIKU EXPO、MIKU WITH YOU、初音ミクシンフォニー、初音ミクライブパーティー、SNOW MIKU LIVE!。

模块划分、数据流，以及怎么跑、构建和部署，见 [docs/architecture.md](docs/architecture.md)。

外部 AI agent 的调用说明（目录、公开路由、SQL 示例与计数口径）见 [`skills/query-concert-stats/SKILL.md`](skills/query-concert-stats/SKILL.md)。

## 安装给外部 agent

这个 skill 放在仓库根的 `skills/` 目录，遵循公开的 Agent Skills 布局，不依赖 Cursor。任何支持该生态的工具（Claude Code、Codex、Gemini CLI、Cursor 等）都可以安装：

```bash
npx skills add RJiazhen/miku-concert-stats@query-concert-stats
npx skills add RJiazhen/miku-concert-stats@query-concert-stats -g   # 全局安装
```

它不需要任何密钥或账号，只读取公开数据。装不了 npm 包的 agent 可以直接读 [`skills/query-concert-stats/SKILL.md`](skills/query-concert-stats/SKILL.md)。

## 站点

| 路由 | 内容 |
| --- | --- |
| `/` | 曲目排行：按场次（默认）或按演出计数，支持系列、年份、角色、关键词筛选，筛选条件写入 URL |
| `/raw` | 原始数据：跨演出歌单对照、逐张数据表、质量报告，每行附 VocaDB / 平台来源链接 |
| `/report` | 歌单差异核验：同一系列年度不同演出的曲目数量与正片/安可段差异，按严重程度分级 |
| `/songs/{id}` | 单曲详情：其他版本、出场记录、各平台投稿 |
| `/shows/{id}` | 一个演出的场次列表、歌单与轮换解析结果 |
| `/series` | 系列与演出总览：全部系列的关键数字，以及可按系列筛选的全部演出表 |
| `/series/{id}` | 系列主页：该系列的全部演出，链到各自演出页 |

页眉有一个全局搜索框：先在本地目录里找，目录里没有时才向 VocaDB 查询；窄屏时折叠成悬浮搜索面板。
播放量相关页面（单场播放量、比较、观察窗、换算）目前没有快照数据，已从导航隐藏，直接访问会重定向到首页。拿到快照后删掉对应页面的 `definePageMeta({ middleware: 'retired' })` 与恢复导航项即可。

## 数据从哪来

演出、歌单、曲名和投稿链接来自 [VocaDB 公共 API](https://vocadb.net/api/)。转载这些数据库内容时请链回 [VocaDB](https://vocadb.net/)，许可说明见 [VocaDB License](https://wiki.vocadb.net/docs/license)。本站不下载封面、歌词或官方标识。

播放量只来自每周一次的 YouTube Data API `videos.list` 快照，且只有配置了 `YOUTUBE_API_KEY` 才会采集。没有密钥时工作流仍更新目录，并跳过播放量，不会填入估计值。

niconico 与哔哩哔哩只保存 VocaDB 上的投稿链接。不调用 niconico 非官方观看页接口，也不抓取哔哩哔哩播放量。

年度首演是同一系列年度里最早的现场演出。名称或简介出现「配信」或 livestream 的演出不参与首演。VocaDB 的日期只到日；开演钟点只在场馆位于日本、且简介里恰好有一条 Showtime 或「開演」时写入。

串烧（`songType = Mashup`）只有在备注或网页链接里能核到至少两首其他 VocaDB 歌曲时才拆开计数，否则该行隔离，不进入区间分母。

## 人工维护的清单

| 文件 | 作用 |
| --- | --- |
| `data/song-variants.json` | 把 remix、remaster、声库、翻唱、语言版本并入同一首歌，排行与统计按合并后的歌计数 |
| `data/setlist-merges.json` | 同一系列年度不同演出的歌单并排对照（例如 2019 マジカルミライ 东京与大阪） |
| `data/song-titles.zh-CN.json` | 歌曲中文名，页眉开关控制是否显示 |
| `data/place-names.zh-CN.json` | 演出名里的地点中文名，跟随页眉同一个开关切换 |
| `data/characters.json` | 声库名到角色的映射与应援色，用于「歌手」列 |

两个清单都只收录人工核对过的条目，格式与校验规则见 [docs/architecture.md](docs/architecture.md)。

## 本地运行

```bash
pnpm install
pnpm test
pnpm build:catalog
pnpm dev
```

Node 22 或更高（Nuxt 4 与 Nuxt UI 4 要求 ≥ 22.12）。

`pnpm collect` 会按至少 300 毫秒的间隔请求 VocaDB，并把原始响应缓存在 `data/cache/`（不提交）。增量 SQL 写到 `data/increments/`。`pnpm collect:vocalists` 单独重写 `0006-song-vocalists.sql`（每首歌的出演声库名单），`pnpm collect:producers` 重写自己派生的 `0007-song-producers.sql`（`categories` 含 `Producer` 或 `roles` 含 `Composer` / `Arranger` / `VoiceManipulator` 的署名，与 VocaDB「Producers」分区一致，按 VocaDB artist id 去重，`roles` 列保留小写证据；Publisher / Illustrator / Animator / Lyricist / Mixer / Mastering / Instrumentalist 与只有 Label / Circle 的署名不算制作人，`VoiceManipulator`（調声 / 調音）保留）；排行的「制作人」列与筛选优先用这张表，只有该行没有任何结构化署名时才退回自由文本，新增或改动的歌曲要重跑一次再 `pnpm build:catalog`。

YouTube 快照：

```bash
cp .env.example .env
# 填入 YOUTUBE_API_KEY 后
pnpm snapshot:youtube
```

生成报表：

```bash
pnpm report:setlist            # 重写 docs/reports/setlist-differences.{md,csv}
pnpm report:setlist --check    # 只校验已提交的报告是否过期（CI 使用）
pnpm report:producers          # 重写 docs/reports/producer-conflicts.md（制作人署名冲突）
pnpm report:producers --check  # 只校验已提交的制作人冲突报告是否过期（CI 使用）
```

## 构建与部署

```bash
pnpm build
pnpm exec wrangler --cwd .output deploy
```

线上地址：<https://miku-concert-stats.rjiazhen.top>

Workers Builds（Git 集成）监听 `main`，push 后自动构建并部署。面板里的配置：

- Build command `pnpm build`（依赖由 Workers Builds 先跑 `pnpm install --frozen-lockfile`）。
- Deploy command `npx wrangler deploy`。`nuxt build` 会生成 `.wrangler/deploy/config.json` 指向 `.output/server/wrangler.json`，所以根目录直接 deploy 即可；不要写 `--cwd .output`，那会让 wrangler 在构建产物缺失时直接报 `Missing file or directory`。
- 环境变量 `NODE_VERSION=22`。

Previews（非 `main` 分支）用同一套 Build command，deploy 换成 `npx wrangler versions upload`，只上传版本、不影响生产；`NODE_VERSION=22` 单独配在 previews 里。

`catalog.sqlite` 是构建产物。构建同时写出 `catalog.sqlite.gz`：Cloudflare 不压缩 sqlite 类型，浏览器改为下载 gzip 副本（约 200 KB，未压缩时 676 KB）并在本地解压，URL 带构建时的内容哈希，可以长期缓存。每周工作流只提交 `data/increments/*.sql` 与 `docs/reports/`，因此数据更新后要再触发一次部署才会出现在线上。

## 后台（维护者）

站点的任何页面都不链接这个地址，只能直接输入 URL：

<https://miku-concert-stats.rjiazhen.top/admin>

`/admin` 默认 302 到反馈收件箱 `/admin/feedback`。后台由 Cloudflare Access 保护：未登录的页面请求会被 Worker 302 到团队 Access 登录页，并把原路径作为 `redirect_url` 带回，页面本身没有密码框。Worker 还会在每个 `/api/feedback` 与 `/api/admin` 管理接口上自行校验 `Cf-Access-Jwt-Assertion`（RS256 签名、`aud`、`iss`、`exp`/`nbf`），校验失败一律返回 401 且不返回任何数据；`wrangler.toml` 里 `ACCESS_TEAM_DOMAIN` 或 `ACCESS_AUD` 为空时同样全部 401。

后台使用 Nuxt UI 的 Dashboard 布局，包含：

- `/admin/feedback`：反馈收件箱，按「全部 / 未解决 / 已解决」筛选、搜索描述与链接，并可手动标记状态。不提供删除或归档：记录在提交 180 天后自动过期。
- `/admin/data`：从公开站点的 `catalog.sqlite` 读取目录规模、歌单来源、视频平台分布与数据新鲜度。
- `/admin/system`：Access、登录身份、FEEDBACK 绑定、目录版本与运行环境；不展示任何密钥或 JWT。

Access 应用必须把 `/admin`、`/admin/*`、`/api/admin/*`、`/api/feedback/*` 加进 destinations（不要用 `/api/feedback*`，否则会拦住公开的提交接口）。完整步骤见 [docs/architecture.md](docs/architecture.md#wranglertoml)。

`POST /api/feedback` 保持公开，站点访客无需登录。

## 测试

`pnpm test` 覆盖首演选择、开演钟点、串烧拆分、播放量区间、观察窗、换算门槛、版本合并、歌单槽位合并、跨地区合并与差异报告分级。目录测试会打开已提交的 SQL，核对 2014 年マジカルミライ年度首演是大阪演出 `2014-08-30`，并断言 2019 东京/大阪对照视图是 37 行、2024 系列年度的替换曲目共享序号。

`pnpm lint`、`pnpm typecheck` 分别跑 ESLint 与 `tsc --noEmit` + `nuxt typecheck`。
