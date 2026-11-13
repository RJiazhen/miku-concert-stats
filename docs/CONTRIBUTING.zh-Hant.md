# 貢獻指南

[English](CONTRIBUTING.md) | [简体中文](CONTRIBUTING.zh-CN.md) | **繁體中文** | [日本語](CONTRIBUTING.ja.md)

感謝參與初音未來演唱會曲目統計。

## 前置條件

- Node.js **≥ 22.12**
- [pnpm](https://pnpm.io/) 12（見 `package.json` 的 `packageManager`）— Vite+ 底層會用到它
- 能編譯 `better-sqlite3` 的原生工具鏈（macOS 用 Xcode CLT，Linux 用 build-essential，Windows 用 MSVC）

**日常開發請優先使用 [Vite+](https://viteplus.dev/)（`vp`）** 做安裝、開發伺服器、測試、lint 與建構。倉庫已在 `devDependencies` 中帶上 `vite-plus`；首次安裝後使用 `node_modules` 裡的 `vp`。只有 Vite+ 沒包住的腳本才直接用 `pnpm`（例如 `vp run collect` / `pnpm collect`）。

日常改 UI、統計、測試或目錄**不需要** Cloudflare 帳號。

## 快速開始

```bash
vp install
vp test
vp dev            # 先重建目錄再啟動 nuxt dev
```

開啟終端機印出的本地位址（預設 3000，也可用 `--port`）。

## 不依賴 Cloudflare 的部分

| 能力 | 本地 |
| --- | --- |
| 排行、時間線、系列/演出/單曲、搜尋 | 可以（`vp dev`） |
| 共享統計 / 歌單 / 首演邏輯 | 可以（`vp test`） |
| 重建 `catalog.sqlite` 與靜態 `/api/v1` | 可以（`vp run build:catalog`） |
| 採集 / 派生腳本 | 可以（`vp run collect…`；存取 VocaDB 需要網路；跑站不必先 collect） |
| 回饋提交 / 後台 / Access / Analytics Engine | 不行 — 見 [cloudflare.zh-Hant.md](cloudflare.zh-Hant.md) |

已提交的 `data/increments/*.sql` 足夠建構目錄。`vp run collect` 是維護者重新整理上游用的。

## 文件索引

| 文件 | 用途 |
| --- | --- |
| [local-development.zh-Hant.md](local-development.zh-Hant.md) | 本地命令、預期缺口、可選資料腳本 |
| [architecture.zh-Hant.md](architecture.zh-Hant.md) | 模組與資料流 |
| [cloudflare.zh-Hant.md](cloudflare.zh-Hant.md) | 部署、KV、Access、分析（維護者） |
| [data-pipeline.zh-CN.md](data-pipeline.zh-CN.md) | 採編細則（簡體中文） |

## 測試

```bash
vp test
vp lint
vp run typecheck   # 或：pnpm typecheck
```

只為統計口徑、有外部規範的解析、少量真實 SQL 斷言寫測試。見 `.cursor/rules/testing.mdc`。

## Pull request

- 改動盡量小而聚焦。
- 不要提交金鑰、`.dev.vars` 或生產環境 Cloudflare 資源 id。
- Access / 分析等帳號變數不要寫進 git（放控制台）；fork 請把 `FEEDBACK` KV namespace id 換成自己的。
