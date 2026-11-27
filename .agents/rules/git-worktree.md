# One development task per worktree

Start feature work in a dedicated worktree. Do not develop on the busy `main` checkout. `main` is for merge and push (and the continue skill’s squash onto the default branch).

## How

Prefer fixed ops via `vp run task` (see `.agents/skills/continue/SKILL.md` and `scripts/task.ts`). Read `key=value` stdout; do not invent parallel shell cookbooks.

- **Create worktree** (Develop and push, when still on default branch): `vp run task -- start <type-short-kebab> [--issue N]` (from `origin/main`, registers workspace, writes `tmp/task-issue`).
- **Develop**: edit/test/commit only in that worktree; **always** start or reuse `vp run dev` (`NUXT_IGNORE_LOCK=1`, no `--port`) once the worktree exists; read the URL with `vp run task -- dev-url <branch> --wait`.
- **Land** (Merge phase): `vp run task -- ship <branch> --message "..."` (squash onto main, push, wait for Workers Builds, clean).
- **Leftover cleanup** (landed but worktree/branch/workspace not cleaned): `vp run task -- clean <branch>`; do not hand-roll `git worktree remove` / `branch -D` / `.code-workspace` edits.

Manual equivalent: directory name equals branch name under `~/projects/full-stack/miku-concert-stats.worktrees/<branch>`, still branched from `origin/main`. If `vp run task` misbehaves, fix `scripts/task/` — do not keep inventing one-off shell.

## Do not

- Commit feature work on the `main` checkout, or `git checkout` the main checkout away to another task branch.
- Run two unrelated tasks in one worktree, or take over someone else’s worktree.
- Stop another task’s dev server.
- Pure docs / `.agents/` / `AGENTS.md` / `README*` edits may land directly on `main` without a feature worktree.
