# 本地開發

[English](local-development.md) | [简体中文](local-development.zh-CN.md) | **繁體中文** | [日本語](local-development.ja.md)

## 工具：優先 Vite+

日常開發請優先使用 **[Vite+](https://viteplus.dev/)（`vp`）**：`vp install`、`vp dev`、`vp test`、`vp lint`，以及 `vp build` / `vp run <script>`。套件管理器仍是 pnpm（見 `package.json` 的 `packageManager`），由 Vite+ 驅動。只有不走 `vp` 時才直接寫 `pnpm <script>`。

## 安裝與執行

```bash
vp install
vp test
vp dev                 # 重建目錄後啟動 nuxt dev
vp dev --port 3165     # 可選埠
```

`vp` 來自 `vite-plus` 開發依賴。全新機器可先 `pnpm install` 一次，再用 `pnpm exec vp` 或 `node_modules/.bin/vp`。

並行 worktree 若碰到 Nuxt lock，可用 `NUXT_IGNORE_LOCK=1 vp dev`。

## 目錄建構

```bash
vp run build:catalog   # 由 schema + increments 產生 public/data/catalog.sqlite（及 .gz）
vp run build:api       # 靜態 /api/v1 資源
```

瀏覽站點不必先跑 `vp run collect`；倉庫裡已有的增量 SQL 足夠。

## 可選資料腳本

```bash
vp run collect                 # 從 VocaDB 重新整理（限速；快取在 data/cache/）
vp run collect:albums
vp run collect:vocalists
vp run collect:producers
vp run derive:setlists -- --check
vp run locations
vp run report:setlist
vp run report:producers
```

`.cursor/skills/` 下的百科採編腳本可能需要 `uv` / Python，與日常改 UI 無關。

## 本地預期缺口（無 Cloudflare）

| 功能 | 本地表現 |
| --- | --- |
| `POST /api/feedback` | **503**（`nuxt dev` 無 KV） |
| `POST /api/analytics/pageview` | **204** 空操作 |
| `/admin/*` | 只渲染外殼；`import.meta.dev` 下不跳轉 Access；無真實 KV 資料 |
| Web Analytics beacon | `NUXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN` 為空時不注入 |

## 生產建構（需要你自己的 Cloudflare 專案）

```bash
vp run build           # 或：pnpm build — 目錄 prebuild + nuxt build
pnpm exec wrangler --cwd .output deploy
```

細節見 [cloudflare.zh-Hant.md](cloudflare.zh-Hant.md)。
