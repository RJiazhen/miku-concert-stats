# 本地開發

[English](local-development.md) | [简体中文](local-development.zh-CN.md) | **繁體中文** | [日本語](local-development.ja.md)

## 安裝與執行

```bash
pnpm install
pnpm test
vp dev                 # 重建目錄後啟動 nuxt dev
vp dev --port 3165     # 可選埠
```

`vp` 為 vite-plus。等價命令：`pnpm dev` → `scripts/dev.ts`。

並行 worktree 若碰到 Nuxt lock，可用 `NUXT_IGNORE_LOCK=1 vp dev`。

## 目錄建構

```bash
pnpm build:catalog     # 由 schema + increments 產生 public/data/catalog.sqlite（及 .gz）
pnpm build:api         # 靜態 /api/v1 資源
```

瀏覽站點不必先跑 `pnpm collect`；倉庫裡已有的增量 SQL 足夠。

## 可選資料腳本

```bash
pnpm collect                 # 從 VocaDB 重新整理（限速；快取在 data/cache/）
pnpm collect:albums
pnpm collect:vocalists
pnpm collect:producers
pnpm derive:setlists --check
pnpm locations
pnpm report:setlist
pnpm report:producers
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
pnpm build
pnpm exec wrangler --cwd .output deploy
```

細節見 [cloudflare.zh-Hant.md](cloudflare.zh-Hant.md)。
