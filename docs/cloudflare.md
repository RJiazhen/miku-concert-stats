# Cloudflare deploy and maintainer ops

**English** | [简体中文](cloudflare.zh-CN.md) | [繁體中文](cloudflare.zh-Hant.md) | [日本語](cloudflare.ja.md)

This project hosts production on Cloudflare Workers. **Forks and local UI work do not need these bindings filled.** Keep real account / KV / Access values out of git; use the dashboard, Wrangler secrets, or a gitignored `.dev.vars`.

## Bindings in `wrangler.toml` (template)

| Binding / var | Purpose | Repo default |
| --- | --- | --- |
| `FEEDBACK` KV `id` | Feedback storage | empty string |
| `ACCESS_TEAM_DOMAIN` / `ACCESS_AUD` | Cloudflare Access for `/admin` and admin APIs | empty |
| `NUXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN` | Public Web Analytics beacon | empty |
| `CF_ACCOUNT_TAG` | Account id for GraphQL analytics | empty |
| `CF_ANALYTICS_HOST` | Host filter for analytics | empty |
| `PAGEVIEWS` Analytics Engine | First-party pageviews | dataset name only |
| Secret `CF_ANALYTICS_API_TOKEN` | Account Analytics Read | `wrangler secret put` only |

Empty Access vars → all admin APIs **401** (fail closed). Missing KV → public feedback **503**.

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
