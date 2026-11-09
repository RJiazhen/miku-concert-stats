# 贡献指南

[English](CONTRIBUTING.md) | **简体中文** | [繁體中文](CONTRIBUTING.zh-Hant.md) | [日本語](CONTRIBUTING.ja.md)

感谢参与初音未来演唱会曲目统计。

## 前置条件

- Node.js **≥ 22.12**
- [pnpm](https://pnpm.io/) 12（见 `package.json` 的 `packageManager`）— Vite+ 底层会用到它
- 能编译 `better-sqlite3` 的原生工具链（macOS 用 Xcode CLT，Linux 用 build-essential，Windows 用 MSVC）

**日常开发请优先使用 [Vite+](https://viteplus.dev/)（`vp`）** 做安装、开发服务器、测试、lint 与构建。仓库已在 `devDependencies` 中带上 `vite-plus`；首次安装后使用 `node_modules` 里的 `vp`。只有 Vite+ 没包住的脚本才直接用 `pnpm`（例如 `vp run collect` / `pnpm collect`）。

日常改 UI、统计、测试或目录**不需要** Cloudflare 账号。

## 快速开始

```bash
vp install
vp test
vp dev            # 先重建目录再启动 nuxt dev
```

打开终端打印的本地地址（默认 3000，也可用 `--port`）。

## 不依赖 Cloudflare 的部分

| 能力 | 本地 |
| --- | --- |
| 排行、时间线、系列/演出/单曲、搜索 | 可以（`vp dev`） |
| 共享统计 / 歌单 / 首演逻辑 | 可以（`vp test`） |
| 重建 `catalog.sqlite` 与静态 `/api/v1` | 可以（`vp run build:catalog`） |
| 采集 / 派生脚本 | 可以（`vp run collect…`；访问 VocaDB 需要网络；跑站不必先 collect） |
| 反馈提交 / 后台 / Access / Analytics Engine | 不行 — 见 [cloudflare.zh-CN.md](cloudflare.zh-CN.md) |

已提交的 `data/increments/*.sql` 足够构建目录。`vp run collect` 是维护者刷新上游用的。

## 文档索引

| 文档 | 用途 |
| --- | --- |
| [local-development.zh-CN.md](local-development.zh-CN.md) | 本地命令、预期缺口、可选数据脚本 |
| [architecture.zh-CN.md](architecture.zh-CN.md) | 模块与数据流 |
| [cloudflare.zh-CN.md](cloudflare.zh-CN.md) | 部署、KV、Access、分析（维护者） |
| [data-pipeline.zh-CN.md](data-pipeline.zh-CN.md) | 采编细则 |

## 测试

```bash
vp test
vp lint
vp run typecheck   # 或：pnpm typecheck
```

只为统计口径、有外部规范的解析、少量真实 SQL 断言写测试。见 `.cursor/rules/testing.mdc`。

## Pull request

- 改动尽量小而聚焦。
- 不要提交密钥、`.dev.vars` 或生产环境 Cloudflare 资源 id。
- Access / 分析等账号变量不要写进 git（放控制台）；fork 请把 `FEEDBACK` KV namespace id 换成自己的。
