import os from 'node:os'
import path from 'node:path'

/** GitHub repository slug for this project. */
export const REPO = 'RJiazhen/miku-concert-stats'

/** Production site URL after a successful Workers Builds deploy. */
export const PRODUCTION_URL = 'https://miku-concert-stats.rjiazhen.top'

/** Workers Builds check-run name substring used when polling deploy status. */
export const WORKERS_BUILDS_NAME = 'Workers Builds: miku-concert-stats'

/** Absolute path to the fixed main checkout. */
export const mainRoot = (): string =>
  path.join(os.homedir(), 'projects/full-stack/miku-concert-stats.worktrees/main')

/** Parent directory that holds every worktree (including `main`). */
export const worktreesRoot = (): string => path.dirname(mainRoot())

/** Cursor/VS Code workspace file that lists active worktree folders. */
export const workspaceFile = (): string =>
  path.join(worktreesRoot(), 'miku-concert-stats.code-workspace')

/** Absolute path for a task worktree whose directory name equals the branch. */
export const worktreePath = (branch: string): string => path.join(worktreesRoot(), branch)

/** Path to the optional per-task issue number file (gitignored `tmp/`). */
export const taskIssueFile = (worktree: string): string => path.join(worktree, 'tmp', 'task-issue')

/** Screen session name used as a fallback for a worktree's dev server. */
export const screenName = (branch: string): string => `miku-${branch}`
