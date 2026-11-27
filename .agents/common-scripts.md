# Common scripts

Reusable command snippets for this repository. Agents: **read before inventing**; **append** when the same sequence would otherwise be regenerated.

## How to add an entry

1. Short title (what it does).
2. When to use (one line).
3. Snippet (bash / `uv run` / `vp` as appropriate).

---

### Install dependencies

When: clean clone or lockfile change.

```bash
vp install
```

### Lint / test / build catalog

When: before landing work that touches logic, data, or CI-covered paths.

```bash
vp test
vp run build:catalog
vp run derive:setlists -- --check
```

### Local Nuxt dev

When: **every** Develop-and-push feature worktree (required by the continue skill), not only UI polish. Start or reuse once the worktree exists; report `dev_url`.

```bash
cd "$WORKTREE" && env NUXT_IGNORE_LOCK=1 vp run dev
vp run task -- dev-url <branch> --wait
vp run task -- status --worktree <branch>   # confirm dev_url=
vp run task -- dev-stop <branch>            # only after Merge cleanup or user asks
```

### Task status / worktree / ship / clean

When: continue skill phases; any worktree lifecycle op.

```bash
vp run task -- status
vp run task -- status --worktree <branch>
vp run task -- start <type-short-kebab> [--issue N]
vp run task -- ship <branch> --message "<imperative summary>"
vp run task -- clean <branch>
```

### Shipping check

When: personal **Merge** phase after landing on the default branch. This repo uses `vp run task -- ship`, which waits for Cloudflare Workers Builds and then cleans. A standalone `.agents/scripts/check-shipping` is only needed if Merge falls back to raw git.

```bash
vp run task -- ship <branch> --message "<imperative summary>"
```

### Collect / derive (data pipeline)

When: refreshing VocaDB-derived increments or validating setlists (see `.agents/rules/data-sources.md`).

```bash
vp run collect
vp run derive:setlists -- --check
```

### Tour poster audit

When: checking missing or wrong tour posters before/after editing `data/tour-posters.json`.

```bash
vp run report:tour-posters
# writes temp/tour-poster-audit.md (gitignored; do not commit)
```
