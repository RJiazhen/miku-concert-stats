# Cloudflare 部署與維護

[English](cloudflare.md) | [简体中文](cloudflare.zh-CN.md) | **繁體中文** | [日本語](cloudflare.ja.md)

生產環境跑在 Cloudflare Workers 上。**Fork 與本地改 UI 不必填寫這些綁定。** 真實的帳號 / KV / Access 值不要進 git；用控制台、Wrangler secret 或已忽略的 `.dev.vars`。

## `wrangler.toml` 綁定（模板）

| 綁定 / 變數 | 用途 | 倉庫預設 |
| --- | --- | --- |
| `FEEDBACK` KV `id` | 回饋儲存 | 空字串 |
| `ACCESS_TEAM_DOMAIN` / `ACCESS_AUD` | `/admin` 與管理 API 的 Access | 空 |
| `NUXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN` | Web Analytics beacon | 空 |
| `CF_ACCOUNT_TAG` | GraphQL 分析用帳戶 id | 空 |
| `CF_ANALYTICS_HOST` | 分析 host 過濾 | 空 |
| `PAGEVIEWS` Analytics Engine | 第一方瀏覽量 | 僅 dataset 名 |
| Secret `CF_ANALYTICS_API_TOKEN` | Account Analytics Read | 只用 `wrangler secret put` |

Access 為空 → 管理介面全部 **401**。無 KV → 公開回饋 **503**。

## Access destination

Self-hosted 應用至少包含：

- `/admin`、`/admin/*`
- `/api/admin/*`
- `/api/feedback/*`（管理用 list/status/detail）

不要寫成 `/api/feedback*`，否則會擋住公開的 `POST /api/feedback`。

## 後台

- `/admin` 在設定 Access 後會轉到 `/admin/feedback`
- `/admin/feedback`、`/admin/data`、`/admin/system`、`/admin/analytics`
- 公開頁眉不連到後台；Access 登入後直接輸入 URL

## 部署

```bash
pnpm build
pnpm exec wrangler --cwd .output deploy
```

Workers Builds 在 `main` 上通常執行 `pnpm build` 再 `npx wrangler deploy`，並設 `NODE_VERSION=22`。使用 `PAGEVIEWS` 前請在控制台啟用 Analytics Engine（未啟用時上傳可能報 `code 10089`）。

## 本地預期

`nuxt dev` 不掛 FEEDBACK KV。開發模式下後台外殼不跳轉 Access。見 [local-development.zh-Hant.md](local-development.zh-Hant.md)。
