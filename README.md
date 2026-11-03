# 初音未来演唱会曲目统计

统计 Crypton 主办的初音未来演唱会歌单，并在浏览器里比较各场、各系列、各年份的播放量区间。日常聚合不在服务器上跑。Cloudflare Worker 只负责首屏 SSR，以及目录里找不到歌时的按需检索。

收录系列：マジカルミライ、MIKU EXPO、MIKU WITH YOU、初音ミクシンフォニー、初音ミクライブパーティー、SNOW MIKU LIVE!。

模块划分、数据流，以及怎么跑、构建和部署，见 [docs/architecture.md](docs/architecture.md)。

## 站点

| 路由 | 内容 |
| --- | --- |
| `/` | 曲目排行：按歌单或按场次数，支持系列、年份、角色、关键词筛选，筛选条件写入 URL |
| `/raw` | 原始数据：按年版合并歌单、逐张数据表、质量报告，每行附 VocaDB / 平台来源链接 |
| `/report` | 歌单差异核验：同系列不同场的曲目数量与正片/安可段差异，按严重程度分级 |
| `/songs/{id}` | 单曲详情：合并的版本、出场记录、各平台投稿 |
| `/shows/{id}` | 单场歌单与轮换解析结果 |
| `/editions/{seriesId}/{number}` | 一个年版的合并歌单与场次列表 |
| `/lookup` | 目录内检索；本地没有命中时才向 VocaDB 查询 |

播放量相关页面（单场播放量、比较、观察窗、换算）目前没有快照数据，已从导航隐藏，直接访问会重定向到首页。拿到快照后删掉对应页面的 `definePageMeta({ middleware: 'retired' })` 与恢复导航项即可。

## 数据从哪来

演出、歌单、曲名和投稿链接来自 [VocaDB 公共 API](https://vocadb.net/api/)。转载这些数据库内容时请链回 [VocaDB](https://vocadb.net/)，许可说明见 [VocaDB License](https://wiki.vocadb.net/docs/license)。本站不下载封面、歌词或官方标识。

播放量只来自每周一次的 YouTube Data API `videos.list` 快照，且只有配置了 `YOUTUBE_API_KEY` 才会采集。没有密钥时工作流仍更新目录，并跳过播放量，不会填入估计值。

niconico 与哔哩哔哩只保存 VocaDB 上的投稿链接。不调用 niconico 非官方观看页接口，也不抓取哔哩哔哩播放量。

首演是同一年版里最早的现场场次。名称或简介出现「配信」或 livestream 的场次不参与首演。VocaDB 的日期只到日；开演钟点只在场馆位于日本、且简介里恰好有一条 Showtime 或「開演」时写入。

串烧（`songType = Mashup`）只有在备注或网页链接里能核到至少两首其他 VocaDB 歌曲时才拆开计数，否则该行隔离，不进入区间分母。

## 人工维护的清单

| 文件 | 作用 |
| --- | --- |
| `data/song-variants.json` | 把 remix、remaster、声库、翻唱、语言版本并入同一首歌，排行与统计按合并后的歌计数 |
| `data/setlist-merges.json` | 同一年版不同地区的歌单合并成一份视图（例如 2019 マジカルミライ 东京与大阪） |
| `data/song-titles.zh-CN.json` | 歌曲中文名，页眉开关控制是否显示 |
| `data/characters.json` | 声库名到角色的映射，用于「演出角色」 |

两个清单都只收录人工核对过的条目，格式与校验规则见 [docs/architecture.md](docs/architecture.md)。

## 本地运行

```bash
pnpm install
pnpm test
pnpm build:catalog
pnpm dev
```

Node 22 或更高（Nuxt 4 与 Nuxt UI 4 要求 ≥ 22.12）。

`pnpm collect` 会按至少 300 毫秒的间隔请求 VocaDB，并把原始响应缓存在 `data/cache/`（不提交）。增量 SQL 写到 `data/increments/`。

YouTube 快照：

```bash
cp .env.example .env
# 填入 YOUTUBE_API_KEY 后
pnpm snapshot:youtube
```

生成歌单差异报告：

```bash
pnpm report:setlist          # 重写 docs/reports/setlist-differences.{md,csv}
pnpm report:setlist --check  # 只校验已提交的报告是否过期（CI 使用）
```

## 构建与部署

```bash
pnpm build
pnpm exec wrangler --cwd .output deploy
```

线上地址：<https://miku-concert-stats.zc791.workers.dev>

仓库已指向 Cloudflare Worker，但 Workers Builds 仍需要面板确认两件事：生产分支为 `main`，deploy command 为 `npx wrangler deploy --cwd .output`（Nitro 把部署配置写在 `.output/wrangler.json`，根目录 `wrangler.toml` 没有 `main` 字段）。构建命令用 `pnpm install --frozen-lockfile && pnpm build`，环境变量 `NODE_VERSION=22`。

`catalog.sqlite` 是构建产物。每周工作流只提交 `data/increments/*.sql` 与 `docs/reports/`，因此数据更新后要再触发一次部署才会出现在线上。

## 测试

`pnpm test` 覆盖首演选择、开演钟点、串烧拆分、播放量区间、观察窗、换算门槛、版本合并、歌单槽位合并、跨地区合并与差异报告分级。目录测试会打开已提交的 SQL，核对 2014 年マジカルミライ首演是大阪场 `2014-08-30`，并断言 2019 东京/大阪合并后是 37 行、2024 年版的替换曲目共享序号。

`pnpm lint`、`pnpm typecheck` 分别跑 ESLint 与 `tsc --noEmit` + `nuxt typecheck`。
