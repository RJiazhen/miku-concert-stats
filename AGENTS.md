# Agent guide

English only for agent-facing docs in this repository. Prefer this file, then `docs/CONTRIBUTING.md` / README, over invented process.

This repo was set up as a **personal / push-owned** project. The short continue skill is already installed; agents must not re-judge personal vs foreign at runtime.

## Project

Hatsune Miku concert setlist stats: SQL catalog, browser aggregation, Cloudflare Worker for SSR and a few APIs. Architecture: `docs/architecture.md`. Local commands: `docs/local-development.md`. Data pipeline: `docs/data-pipeline.md`. Visual design plan: `docs/visual-design-plan.md` (detail also in `docs/design.md`).

## Indexed rules

Read and follow these when relevant (plain Markdown under `.agents/rules/`):

| Rule | Path | When |
| --- | --- | --- |
| Project best practices | [.agents/rules/project-best-practices.md](.agents/rules/project-best-practices.md) | Creating/changing projects |
| Code principles | [.agents/rules/code-principles.md](.agents/rules/code-principles.md) | Writing code |
| Git checkout layout | [.agents/rules/git-checkout-layout.md](.agents/rules/git-checkout-layout.md) | Cloning / parallel tasks |
| Git worktree (this repo) | [.agents/rules/git-worktree.md](.agents/rules/git-worktree.md) | Feature worktrees / `vp run task` |
| No Chrome Dev for debugging | [.agents/rules/no-chrome-dev-for-debugging.md](.agents/rules/no-chrome-dev-for-debugging.md) | Browser automation |
| Frontend design | [.agents/rules/frontend-design.md](.agents/rules/frontend-design.md) | UI / landing design |
| UI style review | [.agents/rules/ui-style-review.md](.agents/rules/ui-style-review.md) | Style handoff to user |
| Testing scope | [.agents/rules/testing.md](.agents/rules/testing.md) | Writing or editing tests |
| Data sources | [.agents/rules/data-sources.md](.agents/rules/data-sources.md) | Catalog / setlist curation |
| Public API docs | [.agents/rules/public-api-docs.md](.agents/rules/public-api-docs.md) | `/api/v1` contract changes |
| GitHub repos default private | [.agents/rules/github-repos-default-private.md](.agents/rules/github-repos-default-private.md) | Creating GitHub repos |

## Layout agents care about

| Path | Role |
| --- | --- |
| `AGENTS.md` | This file |
| `.agents/rules/` | Indexed standing rules |
| `.agents/skills/continue/` | Develop and push → Merge (personal) |
| `.agents/skills/update-concert-data/` | Wiki setlist curation |
| `.agents/skills/ingest-setlist-from-page/` | Ingest a setlist from a page URL |
| `.agents/common-scripts.md` | Recurring command snippets |
| `scripts/task.ts` | Worktree / status / ship / clean CLI (`vp run task`) |
| `scripts/` | Catalog build, collect, derive, reports |
| `data/` | Schema, increments, curated JSON |
| `shared/` | Counting and setlist rules used by UI, API, tests |
| `skills/query-concert-stats/` | Public API skill for external agents |

## Local checkout layout

Follow [.agents/rules/git-checkout-layout.md](.agents/rules/git-checkout-layout.md) and [.agents/rules/git-worktree.md](.agents/rules/git-worktree.md). Checkouts live under `~/projects/full-stack/miku-concert-stats.worktrees/` with `main` plus branch-named worktrees and sibling `miku-concert-stats.code-workspace`.

**One task → one worktree.** Do not `git checkout -b` on the busy `main` checkout for a parallel task.

## Temp directory

`temp/` is gitignored. Use it for local drafts (scratch files). Never `git add` it.

## Continue workflow

Project skill: `.agents/skills/continue/SKILL.md` (personal short variant, chosen at repo setup).

Phases: **Develop and push → Merge**. Creating the feature worktree is part of Develop and push — begin implementation in the same invocation. **No PRs** — Merge squash-merges the feature branch into the default branch with git (via `vp run task -- ship`), verifies Cloudflare Workers Builds, then **always** cleans the development branch. Prefer this file over any global continue skill.

## Common scripts catalog

Before inventing a non-trivial script, read [`.agents/common-scripts.md`](.agents/common-scripts.md).

When you repeatedly need the same command sequence, **append it there** (title + when to use + snippet) and reuse it next time. Goal: stop regenerating the same scripts in chat.

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

Wiki curation helpers under `.agents/skills/update-concert-data/` may need `uv` / Python.

## Process capture

Agents must regularly summarize the development process into this repo so the next session reuses it instead of reinventing it.

- When the same shell steps, one-off scripts, or ops recipes appear more than once, write them into the repo: prefer `scripts/` (or `package.json` scripts) for runnable commands, `.agents/common-scripts.md` for snippets, and `.agents/skills/<name>/SKILL.md` for workflows that call them.
- When a helper fails, fix the script and update the skill/docs in the same change — do not keep a parallel prose cookbook.
- Prefer extending `vp run task` / existing skill scripts over inventing a new one-shot shell recipe in chat.

## Tests

Optimize toward a small, meaningful suite — see [.agents/rules/testing.md](.agents/rules/testing.md).

- Cover behavior that can regress; skip duplicates of the same assertion path.
- When editing tests, remove obsolete or unnecessary cases in the same change when safe.
- Do not add tests that only mirror implementation details with no failure signal.

## Visual design plan (GUI)

Maintain [`docs/visual-design-plan.md`](docs/visual-design-plan.md). Deeper product/scope notes live in [`docs/design.md`](docs/design.md).

- Treat the plan as the living visible design summary (layout, type, color, motion, key screens).
- After meaningful UI work, update the plan in the same effort so it stays accurate.
- Refine weak or outdated sections when you notice them.

## Visual inspection after UI bugs

Whenever a **UI bug** is fixed, run a **visual inspection** of the affected UI (browser snapshot, screenshot, and/or device preview) before marking the fix complete. Do this even if automated tests pass.

Style *polish* (spacing, colors, type) still follows [.agents/rules/ui-style-review.md](.agents/rules/ui-style-review.md): hand off parameters to the user; do not screenshot-verify style alone.

## Conventions

- Drive day-to-day work with vite-plus (`vp`); pnpm only when `vp` does not cover it.
- TypeScript; match existing naming; comment every function/method (`///` or `/** */`).
- Data: VocaDB is a peer source, not authority — see [.agents/rules/data-sources.md](.agents/rules/data-sources.md).
- Keep `docs/architecture.md` in step with module/data-flow/build changes.
- Short imperative English commits; no vendor co-author trailers.

## GitHub Actions

Do **not** run workflows on development / feature branches by default. Limit `push` / `pull_request` triggers (or job `if:` gates) to the default branch (`main`) unless the user explicitly asks for broader CI.

## Auto-iterate this guide

Agents may update this file and the linked agent docs when process gaps appear (missing script entries, stale design notes, wrong CI filters). Keep changes concise and English-only. Do not commit unless the user asks. Do not replace the continue skill with the foreign variant unless the user asks to re-run new-repo-setup.
