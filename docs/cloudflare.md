# Cloudflare deploy and maintainer ops

**English** | [简体中文](cloudflare.zh-CN.md) | [繁體中文](cloudflare.zh-Hant.md) | [日本語](cloudflare.ja.md)

This project hosts production on Cloudflare Workers. **Forks and local UI work do not need Access / analytics vars.** Prefer the Cloudflare dashboard for account-specific settings so git stays free of them.

## What lives where

| Binding / var | Purpose | In git `wrangler.toml`? |
| --- | --- | --- |
| `FEEDBACK` KV `id` | Feedback storage | **Yes** — resource id required for `wrangler deploy` (not a secret; forks replace with their own namespace) |
| `PAGEVIEWS` Analytics Engine | First-party pageviews | **Yes** — dataset name only |
| `ACCESS_TEAM_DOMAIN` / `ACCESS_AUD` | Cloudflare Access for `/admin` and admin APIs | **No** — dashboard Variables only |
| `CF_ACCOUNT_TAG` / `CF_ANALYTICS_HOST` | First-party Analytics Engine query scope | **No** — dashboard Variables |
| Secret `CF_ANALYTICS_API_TOKEN` | Account Analytics Read | **No** — dashboard Secrets / `wrangler secret put` |

Do **not** commit those vars as empty strings: `wrangler deploy` would overwrite dashboard values with `""` and lock admin/analytics. Omit them from the file instead.

Missing Access on the Worker → all admin APIs **401** (fail closed). Missing KV binding → public feedback **503**.

## Access destinations

Self-hosted Access app destinations must include:

- `/admin`, `/admin/*`
- `/api/admin/*`
- `/api/feedback/*` (admin list/status/detail only)

Do **not** use `/api/feedback*` — that would also gate the public `POST /api/feedback`.

## Admin surface

- `/admin` → redirects to `/admin/feedback` when Access is configured
- `/admin/feedback`, `/admin/data`, `/admin/system`, `/admin/analytics`
- Pages are not linked from the public chrome; open the URL directly after Access login

## Deploy

```bash
pnpm build
pnpm exec wrangler --cwd .output deploy
```

Workers Builds on `main` typically runs `pnpm build` then `npx wrangler deploy` with `NODE_VERSION=22`. Enable Analytics Engine in the account console before relying on `PAGEVIEWS` (upload may fail with `code 10089` if disabled).

## Local expectation

`nuxt dev` does not attach the FEEDBACK KV binding. Admin shell skips Access redirect in development. See [local-development.md](local-development.md).
