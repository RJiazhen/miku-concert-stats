# AGENTS.md

Steering for any coding agent working in **miku-concert-stats**.

## Project

Hatsune Miku concert setlist stats: SQL catalog, browser aggregation, Cloudflare Worker for SSR and a few APIs. Architecture: `docs/architecture.md`. Local commands: `docs/local-development.md`. Data pipeline: `docs/data-pipeline.md`.

## Layout agents care about

| Path | Role |
| --- | --- |
| `AGENTS.md` | This file |
| `.cursor/rules/` | Standing rules (worktrees, tests, data sources, UI acceptance) |
| `.cursor/skills/continue/` | Start → Develop → Ship loop |
| `.cursor/skills/update-concert-data/` | Wiki setlist curation |
| `.cursor/skills/ingest-setlist-from-page/` | Ingest a setlist from a page URL |
| `scripts/task.ts` | Worktree / status / ship / clean CLI (`vp run task`) |
| `scripts/` | Catalog build, collect, derive, reports |
| `data/` | Schema, increments, curated JSON |
| `shared/` | Counting and setlist rules used by UI, API, tests |
| `skills/query-concert-stats/` | Public API skill for external agents |

## Process capture

Agents must regularly summarize the development process into this repo so the next session reuses it instead of reinventing it.

- When the same shell steps, one-off scripts, or ops recipes appear more than once, write them into the repo: prefer `scripts/` (or `package.json` scripts) for runnable commands, and `.cursor/skills/<name>/SKILL.md` (or update an existing skill) for the workflow that calls them.
- Summarize scripts that are often needed into a durable repo file (this file’s Commands section, `docs/local-development.md`, or a skill) to reduce how often agents regenerate the same script.
- When a helper fails, fix the script and update the skill/docs in the same change — do not keep a parallel prose cookbook or regenerate a throwaway workaround next time.
- Prefer extending `vp run task` / existing skill scripts over inventing a new one-shot shell recipe in chat.

## Workflow

1. One development task → one git worktree under `~/projects/full-stack/miku-concert-stats.worktrees/<branch>`.
2. Fixed ops via `vp run task` — read `key=value` stdout; do not invent parallel shell cookbooks.
3. Phases: **Start** → user review → **Ship** only after explicit confirm (`1` / confirm / ship / merge).
4. Docs / `.cursor/rules/` / `.cursor/skills/` / `AGENTS.md` / `README*` edits may land on `main`; feature work does not.

```bash
vp run task -- status
vp run task -- status --worktree <branch>
vp run task -- start <type-short-kebab> [--issue N]
vp run task -- ship <branch> --message "<imperative summary>"
vp run task -- clean <branch>
```

See `.cursor/skills/continue/SKILL.md` and `.cursor/rules/git-worktree.mdc`.

## Commands

```bash
vp install
vp test
vp run dev                 # rebuilds catalog, then nuxt dev
vp run build:catalog       # public/data/catalog.sqlite from schema + increments
vp run build:api           # static /api/v1 assets
vp run collect             # refresh from VocaDB (optional; rate-limited)
vp run derive:setlists -- --check
vp run task -- status|start|dev-url|dev-stop|ship|clean
```

Wiki curation helpers under `.cursor/skills/update-concert-data/` may need `uv` / Python.

## Conventions

- Drive day-to-day work with vite-plus (`vp`); pnpm only when `vp` does not cover it.
- TypeScript; match existing naming; comment every function/method (`///` or `/** */`).
- Tests: only when the change affects counting rules or parsing rules — see `.cursor/rules/testing.mdc`.
- Data: VocaDB is a peer source, not authority — see `.cursor/rules/data-sources.mdc`.
- UI style: deliver for user eye-check; do not screenshot-verify — see `.cursor/rules/ui-style-review.mdc`.
- Keep `docs/architecture.md` in step with module/data-flow/build changes.
- Short imperative English commits; no vendor co-author trailers.
