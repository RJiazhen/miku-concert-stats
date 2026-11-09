# Local development

**English** | [简体中文](local-development.zh-CN.md) | [繁體中文](local-development.zh-Hant.md) | [日本語](local-development.ja.md)

## Install and run

```bash
pnpm install
pnpm test
vp dev                 # rebuilds catalog, then nuxt dev
vp dev --port 3165     # optional port
```

`vp` is vite-plus (`vite-plus` in package.json). Equivalent: `pnpm dev` → `scripts/dev.ts`.

If the Nuxt lock file conflicts in parallel worktrees, `NUXT_IGNORE_LOCK=1 vp dev` is fine for local use.

## Catalog build

```bash
pnpm build:catalog     # public/data/catalog.sqlite (+ .gz) from schema + increments
pnpm build:api         # static /api/v1 assets (also part of broader build paths)
```

You do not need `pnpm collect` to browse the site; increments already in git are enough.

## Optional data scripts

```bash
pnpm collect                 # refresh from VocaDB (rate-limited; caches in data/cache/)
pnpm collect:albums
pnpm collect:vocalists
pnpm collect:producers
pnpm derive:setlists --check
pnpm locations
pnpm report:setlist
pnpm report:producers
```

Wiki curation helpers under `.cursor/skills/` may need `uv` / Python; they are optional for app UI work.

## Expected local gaps (no Cloudflare)

| Endpoint / feature | Local behavior |
| --- | --- |
| `POST /api/feedback` | **503** (no KV binding in `nuxt dev`) |
| `POST /api/analytics/pageview` | **204** no-op |
| `/admin/*` | Shell renders; Access redirect skipped in `import.meta.dev`; no real KV data |
| Web Analytics beacon | Off while `NUXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN` is empty |

## Production build (needs your Cloudflare project)

```bash
pnpm build
pnpm exec wrangler --cwd .output deploy
```

Details: [cloudflare.md](cloudflare.md).
