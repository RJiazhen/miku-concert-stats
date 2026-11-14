# Local development

## Tooling: prefer Vite+

Use **[Vite+](https://viteplus.dev/) (`vp`)** for day-to-day work: `vp install`, `vp dev`, `vp test`, `vp lint`, and `vp build` / `vp run <script>`. pnpm remains the package manager (`packageManager` in `package.json`); Vite+ drives it. Reach for bare `pnpm <script>` only when you are not going through `vp`.

## Install and run

```bash
vp install
vp test
vp dev                 # rebuilds catalog, then nuxt dev
```


`vp` comes from the `vite-plus` devDependency. The first bootstrap on a clean machine can use `pnpm install` once so `vp` is on `PATH` via `pnpm exec vp` / `node_modules/.bin`.

If the Nuxt lock file conflicts in parallel worktrees, `NUXT_IGNORE_LOCK=1 vp dev` is fine for local use.

## Catalog build

```bash
vp run build:catalog   # public/data/catalog.sqlite (+ .gz) from schema + increments
vp run build:api       # static /api/v1 assets (also part of broader build paths)
```

You do not need `vp run collect` to browse the site; increments already in git are enough.

## Optional data scripts

```bash
vp run collect                 # refresh from VocaDB (rate-limited; caches in data/cache/)
vp run collect:albums
vp run collect:vocalists
vp run collect:producers
vp run derive:setlists -- --check
vp run locations
vp run report:setlist
vp run report:producers
```

Wiki curation helpers under `.cursor/skills/` may need `uv` / Python; they are optional for app UI work.

## Expected local gaps (no Cloudflare)

| Endpoint / feature | Local behavior |
| --- | --- |
| `POST /api/feedback` | **503** (no KV binding in `nuxt dev`) |
| `POST /api/analytics/pageview` | **204** no-op |
| `/admin/*` | Shell renders; Access redirect skipped in `import.meta.dev`; no real KV data |

## Production build (needs your Cloudflare project)

```bash
vp run build           # or: pnpm build — runs catalog prebuild + nuxt build
pnpm exec wrangler --cwd .output deploy
```

Details: [cloudflare.md](cloudflare.md).
