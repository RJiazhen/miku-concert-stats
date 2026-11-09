# Cloudflare 部署与维护

[English](cloudflare.md) | **简体中文** | [繁體中文](cloudflare.zh-Hant.md) | [日本語](cloudflare.ja.md)

生产环境跑在 Cloudflare Workers 上。**Fork 与本地改 UI 不必填写这些绑定。** 真实的账号 / KV / Access 值不要进 git；用控制台、Wrangler secret 或已忽略的 `.dev.vars`。

## `wrangler.toml` 绑定（模板）

| 绑定 / 变量 | 用途 | 仓库默认 |
| --- | --- | --- |
| `FEEDBACK` KV `id` | 反馈存储 | 空字符串 |
| `ACCESS_TEAM_DOMAIN` / `ACCESS_AUD` | `/admin` 与管理 API 的 Access | 空 |
| `NUXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN` | Web Analytics beacon | 空 |
| `CF_ACCOUNT_TAG` | GraphQL 分析用账户 id | 空 |
| `CF_ANALYTICS_HOST` | 分析 host 过滤 | 空 |
| `PAGEVIEWS` Analytics Engine | 第一方浏览量 | 仅 dataset 名 |
| Secret `CF_ANALYTICS_API_TOKEN` | Account Analytics Read | 只用 `wrangler secret put` |

Access 为空 → 管理接口全部 **401**。无 KV → 公开反馈 **503**。

## Access destination

Self-hosted 应用至少包含：

- `/admin`、`/admin/*`
- `/api/admin/*`
- `/api/feedback/*`（管理用 list/status/detail）

不要写成 `/api/feedback*`，否则会挡住公开的 `POST /api/feedback`。

## 后台

- `/admin` 在配置 Access 后会转到 `/admin/feedback`
- `/admin/feedback`、`/admin/data`、`/admin/system`、`/admin/analytics`
- 公开页眉不链到后台；Access 登录后直接输入 URL

## 部署

```bash
pnpm build
pnpm exec wrangler --cwd .output deploy
```

Workers Builds 在 `main` 上通常执行 `pnpm build` 再 `npx wrangler deploy`，并设 `NODE_VERSION=22`。使用 `PAGEVIEWS` 前请在控制台启用 Analytics Engine（未启用时上传可能报 `code 10089`）。

## 本地预期

`nuxt dev` 不挂 FEEDBACK KV。开发模式下后台外壳不跳转 Access。见 [local-development.zh-CN.md](local-development.zh-CN.md)。
