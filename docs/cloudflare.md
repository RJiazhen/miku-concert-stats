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

## Deploy (production)

```bash
pnpm build
pnpm exec wrangler --cwd .output deploy
```

Workers Builds on `main` typically runs `pnpm build` then `npx wrangler deploy` with `NODE_VERSION=22`. Enable Analytics Engine in the account console before relying on `PAGEVIEWS` (upload may fail with `code 10089` if disabled). Do **not** change the production branch or production deploy command when enabling Previews.

## Branch Previews (Worker Previews)

Non-`main` branches use **Worker Previews**, not `npx wrangler versions upload`. Project wrangler must be `>= 4.135.0` (this repo pins `^4.149.0`).

### Config in git

`wrangler.toml` includes a required `previews` block. It may be empty. Prefer a `[previews]` table header (not an inline `previews = { }` placed after `[[kv_namespaces]]` / `[[analytics_engine_datasets]]`), or TOML attaches the key to the previous array entry and Nitro’s generated `.output/server/wrangler.json` never gets a top-level `previews` — then `wrangler preview` fails. Previews **do not inherit** production bindings or vars.

This repo keeps `previews` empty on purpose: do **not** point preview `FEEDBACK` KV or `PAGEVIEWS` at production resources unless maintainers explicitly choose to share them. Without preview-safe bindings, public pages still SSR; feedback returns **503** and admin/analytics stay unavailable (same as missing bindings in production).

To add isolated preview resources later, put them under the `previews` block (for example `[[previews.kv_namespaces]]`, `[[previews.analytics_engine_datasets]]`) and keep production ids only at the top level. See [Configuration](https://developers.cloudflare.com/workers/previews/configuration/).

### Owner-manual CLI (supported today)

Manual non-production previews work **without** the dashboard **Set up Worker Previews** / **Enable Preview Builds** switch:

```bash
pnpm build
pnpm exec wrangler preview
```

Optional flags such as `--name`, `--tag`, and `--message` pin a stable preview name and a unique deploy tag. `nuxt build` writes `.wrangler/deploy/config.json` so root `wrangler` resolves to `.output` (same as Workers Builds). Do **not** pass `--cwd .output` for Builds or `wrangler preview` when that redirect exists. A successful run prints a stable **Preview URL** (latest for the branch name) and a **Unique Deployment URL** (one deploy). Review of this PR can use that manual URL; the irreversible dashboard migration is **not** required for a working owner preview.

### Workers Builds automatic PR previews (optional; not enabled)

Keep the GitHub app **cloudflare-workers-and-pages** / check name **Workers Builds: miku-concert-stats**. Do not replace it with a new CI deploy path unless that integration is proven broken.

Recommended Builds settings (do not alter production deploy):

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Build command | `pnpm build` |
| Deploy command (production) | `npx wrangler deploy` |
| Preview command | `npx wrangler preview` |
| `NODE_VERSION` | `22` (production and preview configs are separate) |

Automatic Workers Builds PR preview comments still need dashboard **Preview Builds**. That path is separate from owner-manual `wrangler preview` above.

**Enable Preview Builds** (only when maintainers approve automatic PR previews): Worker → **Settings → Build → Branch control** → enable **Enable Preview Builds**.

**Existing Workers connected before Worker Previews** keep the old `versions upload` model for Builds until a **one-time, irreversible** dashboard switch (do **not** flip this unless maintainers explicitly approve it):

1. Worker → **Settings → Builds**
2. In the **Set up Worker Previews** banner, select **Set up**
3. Configure Preview vars/bindings if needed (or leave unset to match empty `previews`)
4. Confirm Preview command is `npx wrangler preview`
5. Select **Switch to Worker Previews**

Until that switch is done, automatic PR preview checks may still run the old preview path (or fail immediately with empty logs). After the switch, non-`main` pushes create/update Previews; find URLs under the Worker **Previews** section and in the GitHub check / PR comment when the provider posts them. Owner-manual `pnpm exec wrangler preview` continues to work either way.

Official overview: [Worker Previews](https://developers.cloudflare.com/workers/previews/). Builds branch control: [Build branches](https://developers.cloudflare.com/workers/ci-cd/builds/build-branches/).

## Local expectation

`nuxt dev` does not attach the FEEDBACK KV binding. Admin shell skips Access redirect in development. See [local-development.md](local-development.md).
