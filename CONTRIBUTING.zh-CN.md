# 贡献指南

[English](CONTRIBUTING.md) | **简体中文** | [繁體中文](CONTRIBUTING.zh-Hant.md) | [日本語](CONTRIBUTING.ja.md)

感谢参与初音未来演唱会曲目统计。

## 前置条件

- Node.js **≥ 22.12**
- [pnpm](https://pnpm.io/) 12（见 `package.json` 的 `packageManager`）
- 能编译 `better-sqlite3` 的原生工具链（macOS 用 Xcode CLT，Linux 用 build-essential，Windows 用 MSVC）

日常改 UI、统计、测试或目录**不需要** Cloudflare 账号。

## 快速开始

```bash
pnpm install
pnpm test
vp dev            # 或 pnpm dev：先重建目录再启动 nuxt dev
```

打开终端打印的本地地址（默认 3000，也可用 `--port`）。

## 不依赖 Cloudflare 的部分

| 能力 | 本地 |
| --- | --- |
| 排行、时间线、系列/演出/单曲、搜索 | 可以（`vp dev`） |
| 共享统计 / 歌单 / 首演逻辑 | 可以（`pnpm test`） |
| 重建 `catalog.sqlite` 与静态 `/api/v1` | 可以 |
| 采集 / 派生脚本 | 可以（访问 VocaDB 需要网络；跑站不必先 collect） |
| 反馈提交 / 后台 / Access / Analytics Engine | 不行 — 见 [docs/cloudflare.zh-CN.md](docs/cloudflare.zh-CN.md) |

已提交的 `data/increments/*.sql` 足够构建目录。`pnpm collect` 是维护者刷新上游用的。

## 文档索引

| 文档 | 用途 |
| --- | --- |
| [docs/local-development.zh-CN.md](docs/local-development.zh-CN.md) | 本地命令、预期缺口、可选数据脚本 |
| [docs/architecture.zh-CN.md](docs/architecture.zh-CN.md) | 模块与数据流 |
| [docs/cloudflare.zh-CN.md](docs/cloudflare.zh-CN.md) | 部署、KV、Access、分析（维护者） |
| [docs/data-pipeline.zh-CN.md](docs/data-pipeline.zh-CN.md) | 采编细则 |

## 测试

```bash
pnpm test
pnpm lint
pnpm typecheck
```

只为统计口径、有外部规范的解析、少量真实 SQL 断言写测试。见 `.cursor/rules/testing.mdc`。

## Pull request

- 改动尽量小而聚焦。
- 不要提交密钥、`.dev.vars` 或生产环境 Cloudflare 资源 id。
- 仓库里的 `wrangler.toml` 绑定 id 保持为空；在你自己的 Cloudflare 项目里配置。
