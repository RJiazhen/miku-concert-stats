# 初音未来演唱会曲目播放统计

统计 Crypton 主办的初音未来演唱会歌单，并在浏览器里比较各场、各系列、各年份的播放量区间。日常聚合不在服务器上跑。Cloudflare Worker 只负责首屏 SSR，以及目录里找不到歌时的按需检索。

收录系列：マジカルミライ、MIKU EXPO、MIKU WITH YOU、初音ミクシンフォニー、初音ミクライブパーティー、SNOW MIKU LIVE!。

## 数据从哪来

演出、歌单、曲名和投稿链接来自 [VocaDB 公共 API](https://vocadb.net/api/)。转载这些数据库内容时请链回 [VocaDB](https://vocadb.net/)，许可说明见 [VocaDB License](https://wiki.vocadb.net/docs/license)。本站不下载封面、歌词或官方标识。

播放量只来自每周一次的 YouTube Data API `videos.list` 快照，且只有配置了 `YOUTUBE_API_KEY` 才会采集。没有密钥时工作流仍更新目录，并跳过播放量，不会填入估计值。页面上这些歌显示为「尚无快照」。

niconico 与哔哩哔哩只保存 VocaDB 上的投稿链接。不调用 niconico 非官方观看页接口，也不抓取哔哩哔哩播放量。里程碑表保留，但没有可引用的达成时间时不插入行。

首演是同一年版里最早的现场场次。名称或简介出现「配信」或 livestream 的场次不参与首演。VocaDB 的日期只到日。开演钟点只在场馆位于日本、且简介里恰好有一条 Showtime 或「開演」时写入。

串烧（`songType = Mashup`）只有在备注或网页链接里能核到至少两首其他 VocaDB 歌曲时才拆开计数，否则该行隔离，不进入区间分母。

跨平台换算默认不发布。niconico 与 YouTube 的配对样本还不足以通过设计文档里的门槛时，界面继续分平台显示。

## 本地运行

```bash
pnpm install
pnpm test
pnpm build:catalog
pnpm dev
```

`pnpm collect` 会按至少 300 毫秒的间隔请求 VocaDB，并把原始响应缓存在 `data/cache/`（不提交）。增量 SQL 写到 `data/increments/`。

YouTube 快照：

```bash
cp .env.example .env
# 填入 YOUTUBE_API_KEY 后
pnpm snapshot:youtube
```

部署到 Cloudflare Workers：

```bash
pnpm build
pnpm exec wrangler --cwd .output deploy
```

## 测试

`pnpm test` 覆盖首演选择、开演钟点、串烧拆分、播放量区间、观察窗和换算门槛。目录测试会打开已提交的 SQL，确认 2014 年マジカルミライ的首演是大阪场 `2014-08-30`，并且在没有 YouTube 采集时 `view_snapshots` 与 `milestones` 都是 0 行。
