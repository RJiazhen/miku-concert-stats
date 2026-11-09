# Contributing

**English** | [简体中文](CONTRIBUTING.zh-CN.md) | [繁體中文](CONTRIBUTING.zh-Hant.md) | [日本語](CONTRIBUTING.ja.md)

Thanks for helping with Hatsune Miku Concert Setlist Stats.

## Prerequisites

- Node.js **≥ 22.12**
- [pnpm](https://pnpm.io/) 12 (see `packageManager` in `package.json`)
- Native build tools for `better-sqlite3` (Xcode CLT on macOS, build-essential on Linux, MSVC build tools on Windows)

You do **not** need a Cloudflare account for day-to-day UI, stats, tests, or catalog work.

## Quick start

```bash
pnpm install
pnpm test
vp dev            # or: pnpm dev — rebuilds catalog then starts nuxt dev
```

Open the printed local URL (default port 3000, or pass `--port`).

## What works without Cloudflare

| Area | Local |
| --- | --- |
| Rankings, timeline, series/shows/songs, search | Yes (`vp dev`) |
| Shared stats / setlist / premiere logic | Yes (`pnpm test`) |
| Rebuild `catalog.sqlite` and static `/api/v1` JSON | Yes (`pnpm build:catalog`, `prebuild`) |
| Data collect / derive scripts | Yes (needs network for VocaDB; not required to run the site) |
| Feedback submit / admin inbox / Access / Analytics Engine | No — see [docs/cloudflare.md](docs/cloudflare.md) |

Committed SQL under `data/increments/` is enough to build the catalog. `pnpm collect` is for maintainers refreshing upstream data.

## Docs map

| Doc | Purpose |
| --- | --- |
| [docs/local-development.md](docs/local-development.md) | Local commands, expected gaps, optional data scripts |
| [docs/architecture.md](docs/architecture.md) | Modules and data flow |
| [docs/cloudflare.md](docs/cloudflare.md) | Deploy, KV, Access, analytics (maintainer) |
| [docs/data-pipeline.zh-CN.md](docs/data-pipeline.zh-CN.md) | Detailed curation rules (Simplified Chinese) |

## Tests

```bash
pnpm test
pnpm lint
pnpm typecheck
```

Write tests only when they guard counting rules, parsers with external specs, or a few real SQL assertions. See `.cursor/rules/testing.mdc`.

## Pull requests

- Prefer small, focused changes.
- Do not commit secrets, `.dev.vars`, or production Cloudflare resource IDs.
- Leave `wrangler.toml` binding ids empty in the repo; configure them in your own Cloudflare project.
