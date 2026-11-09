# 初音未来演唱会曲目统计

[English](README.md) | **简体中文** | [繁體中文](README.zh-Hant.md) | [日本語](README.ja.md)

统计 Crypton 主办的初音未来演唱会歌单，并在浏览器里比较各场、各系列、各年份的曲目构成。日常聚合不在服务器上跑。Cloudflare Worker 只负责首屏 SSR 与少量接口（反馈、后台、动态 `/api/v1`）；排行与搜索都在浏览器下载的本地目录上完成。

**线上站点：** <https://miku-concert-stats.rjiazhen.top>

## 收录系列

マジカルミライ、MIKU EXPO、MIKU WITH YOU、初音ミクシンフォニー、初音ミクライブパーティー、SNOW MIKU LIVE!，以及仓库内补录的相关演出。

## 站点地图

| 路由 | 内容 |
| --- | --- |
| `/` | 曲目排行（按场次或按演出），支持系列 / 年份 / 角色 / 关键词筛选 |
| `/raw` | 原始数据、跨演出歌单对照、质量报告 |
| `/report` | 同一系列年度不同演出的歌单差异核验 |
| `/songs/{id}` | 单曲详情：版本、出场、投稿链接 |
| `/shows/{id}` | 一场演出的日程、歌单与轮换说明 |
| `/series` | 系列总览与可筛选演出表 |
| `/series/{id}` | 系列主页 |
| `/timeline` | 时间线 |
| `/producers` | 制作人排行 |

页眉搜索只在已下载的本地目录里匹配歌名、制作人、系列、演出与地点。

## 数据来源

优先官方与百科（初音ミク Wiki、萌娘百科等）。[VocaDB](https://vocadb.net/) 与百科同级，用于补曲名、歌曲 id 与日期，不独占权威。转载 VocaDB 相关内容请链回 VocaDB，并遵守 [VocaDB License](https://wiki.vocadb.net/docs/license)。本站不托管封面、歌词或官方标识。

## AI skill

无需密钥即可安装公开 Agent Skill：

```bash
npx skills add RJiazhen/miku-concert-stats@query-concert-stats
```

也可把 <https://miku-concert-stats.rjiazhen.top/skill.md> 或 [`skills/query-concert-stats/SKILL.md`](skills/query-concert-stats/SKILL.md) 交给 AI。

## 开发 / 贡献

见 [`CONTRIBUTING.zh-CN.md`](CONTRIBUTING.zh-CN.md) 与 [`docs/local-development.zh-CN.md`](docs/local-development.zh-CN.md)。**多数** UI、统计、测试与目录构建不需要 Cloudflare 账号。部署与后台见 [`docs/cloudflare.zh-CN.md`](docs/cloudflare.zh-CN.md)。架构概览见 [`docs/architecture.zh-CN.md`](docs/architecture.zh-CN.md)。

## 许可

[MIT](LICENSE)
