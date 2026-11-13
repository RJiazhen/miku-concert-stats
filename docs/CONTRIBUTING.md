# Contributing

**English** | [简体中文](CONTRIBUTING.zh-CN.md) | [繁體中文](CONTRIBUTING.zh-Hant.md) | [日本語](CONTRIBUTING.ja.md)

Thanks for helping with Hatsune Miku Concert Setlist Stats.

## Prerequisites

- Node.js **≥ 22.12**
- [pnpm](https://pnpm.io/) 12 (see `packageManager` in `package.json`) — used under the hood by Vite+
- Native build tools for `better-sqlite3` (Xcode CLT on macOS, build-essential on Linux, MSVC build tools on Windows)

**Prefer [Vite+](https://viteplus.dev/) (`vp`)** for install, dev, test, lint, and build. The repo already lists `vite-plus` in `devDependencies`; after the first install, use the `vp` binary from `node_modules`. Call `pnpm` directly only for package scripts Vite+ does not wrap (for example `vp run collect` / `pnpm collect`).

You do **not** need a Cloudflare account for day-to-day UI, stats, tests, or catalog work.

## Quick start

```bash
vp install
vp test
vp dev            # rebuilds catalog, then starts nuxt dev
```

Open the printed local URL (default port 3000, or pass `--port`).

## What works without Cloudflare

| Area | Local |
| --- | --- |
| Rankings, timeline, series/shows/songs, search | Yes (`vp dev`) |
| Shared stats / setlist / premiere logic | Yes (`vp test`) |
| Rebuild `catalog.sqlite` and static `/api/v1` JSON | Yes (`vp run build:catalog`, `prebuild`) |
| Data collect / derive scripts | Yes (`vp run collect…`; needs network for VocaDB; not required to run the site) |
| Feedback submit / admin inbox / Access / Analytics Engine | No — see [cloudflare.md](cloudflare.md) |

Committed SQL under `data/increments/` is enough to build the catalog. `vp run collect` is for maintainers refreshing upstream data.

## Docs map

| Doc | Purpose |
| --- | --- |
| [local-development.md](local-development.md) | Local commands, expected gaps, optional data scripts |
| [architecture.md](architecture.md) | Modules and data flow |
| [cloudflare.md](cloudflare.md) | Deploy, KV, Access, analytics (maintainer) |
| [data-pipeline.zh-CN.md](data-pipeline.zh-CN.md) | Detailed curation rules (Simplified Chinese) |

## Tests

```bash
vp test
vp lint
vp run typecheck   # or: pnpm typecheck
```

Write tests only when they guard counting rules, parsers with external specs, or a few real SQL assertions. See `.cursor/rules/testing.mdc`.

## Pull requests

- Prefer small, focused changes.
- Do not commit secrets, `.dev.vars`, or production Cloudflare resource IDs.
- Keep account-specific Access / analytics vars out of git (dashboard only); forks should replace the `FEEDBACK` KV namespace id with their own.
