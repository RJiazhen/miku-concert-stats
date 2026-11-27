---
name: continue
description: >-
  Advance exactly one phase on this personal repository: Develop and push /
  Merge (no PR; Cloudflare Workers Builds check via vp run task, then always
  clean the development branch). Use when the user says /continue, 继续, ship,
  or asks to progress work.
disable-model-invocation: true
---

# Continue (personal — short)

One invocation → **one phase**, then stop. Prefer this project skill over any global continue skill.

This file was installed for a **personal / push-owned** repo at setup time. Do not re-detect ownership or switch to a foreign flow.

**No pull requests.** Land work by merging the feature branch into the default branch with git (via `vp run task -- ship`), then push.

Phases: **Develop and push → Merge** (Merge verifies Workers Builds deploy, then always cleans the development branch).

Fixed environment ops use `vp run task` (`scripts/task.ts`). Read `key=value` stdout; do not invent parallel shell cookbooks. If `vp run task` fails, fix `scripts/task/` and update this skill — do not work around with one-off git/workspace recipes.

## Locate repo

```bash
ROOT=$(git rev-parse --show-toplevel 2>/dev/null) && echo "$ROOT"
git -C "$ROOT" branch --show-current
DEFAULT_BRANCH=$(git -C "$ROOT" symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed 's#^origin/##' || echo main)
MAIN_ROOT="$HOME/projects/full-stack/miku-concert-stats.worktrees/main"
vp run task -- status
```

Prefer editing project agent files under `$MAIN_ROOT` (the `main` worktree). Read `AGENTS.md` first. Conflict → `AGENTS.md` wins.

## Phase detection

| Condition | Phase |
| --- | --- |
| On default branch, no active feature context **or** feature branch with work not yet committed and pushed | **Develop and push** |
| Feature branch committed+pushed (or commits ready on the feature branch) and ready to land on default | **Merge** |

No Start / PR / OpenPR / Finalize / Wait phases. Creating the branch is part of **Develop and push** — do not stop after the worktree exists; begin implementation in the same invocation.

### Response template

```markdown
- Repo: `RJiazhen/miku-concert-stats`
- Phase: `<Develop and push | Merge>`
- Branch: `<current-branch>`
- Done this step: `<…>`
- Next step: `<…>`
```

## Develop and push

In this single phase:

1. **If still on the default branch** (no feature worktree yet): resolve the requirement (issue `#n` or user text). Create a worktree with:

   ```bash
   vp run task -- start <type-short-kebab> [--issue N]
   ```

   (from `origin/main`, registers workspace, writes `tmp/task-issue`). Do not `checkout -b` on the busy `main` checkout. Then **continue immediately** with step 2 in the same invocation.

2. **Always start (or reuse) the feature worktree’s Nuxt dev server** in the same invocation once the worktree exists — every Develop task, not only UI polish. From the feature worktree:

   ```bash
   env NUXT_IGNORE_LOCK=1 vp run dev
   vp run task -- dev-url <branch> --wait
   ```

   No `--port`. Do not stop another task’s server. If `dev_url` is already set in `vp run task -- status --worktree <branch>`, reuse it. Report the URL in the response template when known.

3. Implement toward acceptance from the feature worktree. Verify via repo docs / `package.json` / `vp test` when counting or parsing rules change. After a UI **bug** fix, visual-inspect per `AGENTS.md`. Style polish: hand off parameters per `.agents/rules/ui-style-review.md`.

4. When the slice is ready to land: commit (short imperative English; one logical change per commit; never stage `temp/` or `tmp/`), then push the **feature branch** with upstream (`git push -u origin HEAD`). Do **not** open a PR.

If still implementing and not ready to push, stop after the work done this turn. Next continue stays on **Develop and push**.

When the feature branch is pushed, stop. Next continue → **Merge**.

## Merge

Order is fixed: **land on default branch (no PR) → shipping check → clean development branch every time**. Prefer the project CLI, which already bundles those steps:

```bash
vp run task -- status --worktree <branch>
vp run task -- ship <branch> --message "<imperative summary of landed work>"
```

`ship` squash-merges onto `main`, pushes, waits for Cloudflare Workers Builds, then cleans worktree / local branch / remote branch / workspace. Read stdout: require `ok=true` and successful deploy/cleanup fields before treating Merge as done.

If `ship` already landed and deployed but cleanup interrupted:

```bash
vp run task -- clean <branch>
```

### Fallback (only if `vp run task -- ship` cannot run)

#### 1. Land on the default branch

```bash
BRANCH="<feature-branch-name>"
git -C "$MAIN_ROOT" fetch origin --prune
git -C "$MAIN_ROOT" checkout "$DEFAULT_BRANCH"
git -C "$MAIN_ROOT" pull --ff-only origin "$DEFAULT_BRANCH"
git -C "$MAIN_ROOT" merge --squash "$BRANCH"
git -C "$MAIN_ROOT" commit -m "$(cat <<'EOF'
<conventional commit summarizing the landed work>

EOF
)"
git -C "$MAIN_ROOT" push origin "$DEFAULT_BRANCH"
```

If squash-merge is empty or conflicts, resolve or stop and report — do not force-push.

#### 2. Shipping check (frontend)

This repo has a Nuxt frontend on Cloudflare Workers. Prefer `vp run task -- ship` (above). If landing manually, wait for the Workers Builds check on the new `main` HEAD (same naming as `task ship` / `task status` output) and smoke the production URL before cleanup.

#### First Merge that needs a standalone script

If ops move off `vp run task` and `.agents/scripts/check-shipping` does not exist:

1. Create `.agents/scripts/check-shipping.sh` (or `.py` via `uv run`) that exits `0` only when the production deploy for the just-pushed commit is healthy.
2. Document it in `.agents/common-scripts.md` under **Shipping check**.
3. Update this skill’s Subsequent Merges pointer to that path.

#### Subsequent Merges (standalone script path)

```bash
bash "$MAIN_ROOT/.agents/scripts/check-shipping.sh"
```

Do **not** clean until the shipping check exits `0`.

#### 3. Clean the development branch

Prefer `vp run task -- clean <branch>`. Manual fallback:

```bash
FEATURE_ROOT="$ROOT"
BRANCH="<feature-branch-name>"
git -C "$MAIN_ROOT" worktree remove "$FEATURE_ROOT" 2>/dev/null || true
git -C "$MAIN_ROOT" branch -d "$BRANCH" 2>/dev/null || true
git -C "$MAIN_ROOT" push origin --delete "$BRANCH" 2>/dev/null || true
```

Drop the folder entry from `miku-concert-stats.code-workspace`.

Stop. Development branch is gone locally and on the remote.

## Constraints

- No pull requests for this personal workflow.
- No force-push to the default branch.
- Feature branches need not run GitHub Actions for this workflow.
- Never skip branch cleanup after a successful Merge (and successful shipping check).
- Do not hand-write long worktree / workspace / poll / cleanup shell when `vp run task` covers it.
- Pure docs / `.agents/` / `AGENTS.md` / `README*` may be committed and pushed on `main` without a feature worktree.
