# 貢獻指南

[English](CONTRIBUTING.md) | [简体中文](CONTRIBUTING.zh-CN.md) | **繁體中文** | [日本語](CONTRIBUTING.ja.md)

感謝參與初音未來演唱會曲目統計。

## 前置條件

- Node.js **≥ 22.12**
- [pnpm](https://pnpm.io/) 12（見 `package.json` 的 `packageManager`）
- 能編譯 `better-sqlite3` 的原生工具鏈（macOS 用 Xcode CLT，Linux 用 build-essential，Windows 用 MSVC）

日常改 UI、統計、測試或目錄**不需要** Cloudflare 帳號。

## 快速開始

```bash
pnpm install
pnpm test
vp dev            # 或 pnpm dev：先重建目錄再啟動 nuxt dev
```

開啟終端機印出的本地位址（預設 3000，也可用 `--port`）。

## 不依賴 Cloudflare 的部分

| 能力 | 本地 |
| --- | --- |
| 排行、時間線、系列/演出/單曲、搜尋 | 可以（`vp dev`） |
| 共享統計 / 歌單 / 首演邏輯 | 可以（`pnpm test`） |
| 重建 `catalog.sqlite` 與靜態 `/api/v1` | 可以 |
| 採集 / 派生腳本 | 可以（存取 VocaDB 需要網路；跑站不必先 collect） |
| 回饋提交 / 後台 / Access / Analytics Engine | 不行 — 見 [docs/cloudflare.zh-Hant.md](docs/cloudflare.zh-Hant.md) |

已提交的 `data/increments/*.sql` 足夠建構目錄。`pnpm collect` 是維護者重新整理上游用的。

## 文件索引

| 文件 | 用途 |
| --- | --- |
| [docs/local-development.zh-Hant.md](docs/local-development.zh-Hant.md) | 本地命令、預期缺口、可選資料腳本 |
| [docs/architecture.zh-Hant.md](docs/architecture.zh-Hant.md) | 模組與資料流 |
| [docs/cloudflare.zh-Hant.md](docs/cloudflare.zh-Hant.md) | 部署、KV、Access、分析（維護者） |
| [docs/data-pipeline.zh-CN.md](docs/data-pipeline.zh-CN.md) | 採編細則（簡體中文） |

## 測試

```bash
pnpm test
pnpm lint
pnpm typecheck
```

只為統計口徑、有外部規範的解析、少量真實 SQL 斷言寫測試。見 `.cursor/rules/testing.mdc`。

## Pull request

- 改動盡量小而聚焦。
- 不要提交金鑰、`.dev.vars` 或生產環境 Cloudflare 資源 id。
- 倉庫裡的 `wrangler.toml` 綁定 id 保持為空；在你自己的 Cloudflare 專案裡設定。
