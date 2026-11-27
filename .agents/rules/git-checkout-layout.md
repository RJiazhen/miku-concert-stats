# Git checkout layout

Put every new local git checkout under `~/projects`, inside a `<repo>.worktrees` directory. The first checkout is `main`. One `<repo>.code-workspace` file sits beside the worktrees and gains a folder for each simultaneous task.

```
~/projects/<project-category>/<repo-name>.worktrees/
  <repo-name>.code-workspace
  main/                 # first checkout
  <branch-name>/        # extra worktree; path matches the branch name
```

`<project-category>` is an existing directory under `~/projects` (for example `front-end`, `backend`, `learn`). If none fits, ask before creating one.

`<repo-name>` is the repository name without `.git`.

## First checkout

Clone into `main`. Do not clone straight into `~/projects/<category>/<repo-name>`.

```bash
mkdir -p "$HOME/projects/front-end/example.worktrees"
git clone <url> "$HOME/projects/front-end/example.worktrees/main"
```

Create `example.code-workspace` in `example.worktrees/`:

```json
{
  "folders": [{ "name": "main", "path": "main" }],
  "settings": {
    "files.exclude": {
      "*.code-workspace": true
    }
  }
}
```

Leave an existing checkout where it is unless the user asks to move it.

## Parallel tasks

A second independent task gets its own worktree next to `main`. Do not switch the busy checkout to another branch. The worktree directory path is the branch name, so branch `fix-login` is `example.worktrees/fix-login` and branch `feature/fix-login` is `example.worktrees/feature/fix-login`.

```bash
git -C "$HOME/projects/front-end/example.worktrees/main" worktree add \
  "$HOME/projects/front-end/example.worktrees/feature/fix-login" -b feature/fix-login
```

Append that folder to the workspace `folders` array (`"name": "feature/fix-login"`, `"path": "feature/fix-login"`). Remove a worktree only when the user asks.
