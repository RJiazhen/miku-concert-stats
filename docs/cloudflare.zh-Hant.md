# Cloudflare 部署與維護

[English](cloudflare.md) | [简体中文](cloudflare.zh-CN.md) | **繁體中文** | [日本語](cloudflare.ja.md)

生產環境跑在 Cloudflare Workers 上。**Fork 與本地改 UI 不必設定 Access / 分析變數。** 帳號相關設定優先放在 Cloudflare 控制台，避免寫進 git。

## 放哪裡

| 綁定 / 變數 | 用途 | 是否寫入倉庫 `wrangler.toml` |
| --- | --- | --- |
| `FEEDBACK` KV `id` | 回饋儲存 | **是** — `wrangler deploy` 需要資源 id（不是金鑰；fork 請換成自己的命名空間） |
| `PAGEVIEWS` Analytics Engine | 第一方瀏覽量 | **是** — 僅 dataset 名 |
| `ACCESS_TEAM_DOMAIN` / `ACCESS_AUD` | `/admin` 與管理 API 的 Access | **否** — 只放控制台 Variables |
| `CF_ACCOUNT_TAG` / `CF_ANALYTICS_HOST` | 第一方 Analytics Engine 查詢範圍 | **否** — 控制台 Variables |
| Secret `CF_ANALYTICS_API_TOKEN` | Account Analytics Read | **否** — Secrets / `wrangler secret put` |

不要把這些變數提交成空字串：`wrangler deploy` 會用 `""` 覆蓋控制台裡的值。應直接從檔案中省略。

Worker 上缺少 Access → 管理介面全部 **401**。缺少 KV 綁定 → 公開回饋 **503**。

## Access destination

Self-hosted 應用至少包含：

- `/admin`、`/admin/*`
- `/api/admin/*`
- `/api/feedback/*`

不要寫成 `/api/feedback*`。

## 後台

- `/admin` → `/admin/feedback`
- `/admin/feedback`、`/admin/data`、`/admin/system`、`/admin/analytics`

## 部署（生產）

```bash
pnpm build
pnpm exec wrangler --cwd .output deploy
```

Workers Builds：`pnpm build` → `npx wrangler deploy`，`NODE_VERSION=22`。開啟 Preview 時不要改生產分支或生產 Deploy command。

## 分支 Preview（Worker Previews）

非 `main` 使用 **Worker Previews**（`npx wrangler preview`），不再用 `npx wrangler versions upload`。`wrangler.toml` 需有可為空的 `[previews]` 表（勿在 `[[...]]` 陣列後寫行內 `previews = { }`）；Preview 不繼承生產綁定。本倉庫預設空塊，不把 preview `FEEDBACK` / `PAGEVIEWS` 指到生產資源。

本機：`pnpm build` 後 `pnpm exec wrangler preview`。Workers Builds 保留現有 GitHub 整合；**Settings → Build → Branch control** 啟用 **Enable Preview Builds**；舊 Worker 需在 **Settings → Builds** 的 **Set up Worker Previews** 做一次性不可逆切換，Preview command 為 `npx wrangler preview`。詳見 [cloudflare.md](cloudflare.md)。

## 本地預期

見 [local-development.zh-Hant.md](local-development.zh-Hant.md)。
