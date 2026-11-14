import { existsSync } from 'node:fs'
import { resolveDevUrl } from './dev-server.ts'
import {
  canPushRepo,
  commitsAheadOfOriginMain,
  currentBranch,
  fetchOriginMain,
  listWorktrees,
  readTaskIssue,
  statusShort,
} from './git.ts'
import { mainRoot, PRODUCTION_URL, REPO, worktreePath } from './paths.ts'
import { printRecord } from './print.ts'

export type StatusOptions = {
  /** Branch or absolute worktree path to focus; defaults to cwd when inside a task worktree. */
  target?: string
  /** Skip `git fetch` (faster local-only snapshot). */
  noFetch?: boolean
}

/**
 * Resolves a branch name or path to an absolute worktree directory when it exists.
 */
const resolveTargetWorktree = (target: string | undefined, cwd: string): { branch: string; worktree: string } | null => {
  if (target) {
    if (existsSync(target)) {
      const branch = currentBranch(target) || target.split('/').pop() || ''
      return { branch, worktree: target }
    }
    const candidate = worktreePath(target)
    if (existsSync(candidate)) return { branch: target, worktree: candidate }
    return { branch: target, worktree: candidate }
  }
  const branch = currentBranch(cwd)
  if (branch && branch !== 'main' && existsSync(worktreePath(branch)) && cwd.startsWith(worktreePath(branch))) {
    return { branch, worktree: worktreePath(branch) }
  }
  if (branch && branch !== 'main' && existsSync(worktreePath(branch))) {
    return { branch, worktree: worktreePath(branch) }
  }
  return null
}

/**
 * Prints a machine-readable snapshot of main, the focused task worktree, and remotes.
 */
export const cmdStatus = (opts: StatusOptions = {}): number => {
  if (!opts.noFetch) fetchOriginMain()
  const cwd = process.cwd()
  const focused = resolveTargetWorktree(opts.target, cwd)
  const worktrees = listWorktrees()
  const push = canPushRepo()

  printRecord({
    ok: true,
    repo: REPO,
    production_url: PRODUCTION_URL,
    main: mainRoot(),
    cwd,
    can_push: push,
    worktrees: worktrees.map((row) => `${row.branch || 'detached'}@${row.path}`).join(' | '),
  })

  if (!focused) {
    printRecord({
      task_worktree: '',
      task_branch: '',
      task_issue: '',
      task_dirty: '',
      task_ahead: '',
      dev_url: '',
    })
    return 0
  }

  const exists = existsSync(focused.worktree)
  const dirty = exists ? statusShort(focused.worktree) : 'missing'
  const ahead = exists ? commitsAheadOfOriginMain(focused.worktree).join(' ; ') : ''
  const issue = exists ? readTaskIssue(focused.worktree) : ''
  const devUrl = exists ? resolveDevUrl(focused.worktree) ?? '' : ''

  printRecord({
    task_worktree: focused.worktree,
    task_branch: focused.branch,
    task_issue: issue || '',
    task_dirty: dirty || '',
    task_ahead: ahead || '',
    task_exists: exists,
    dev_url: devUrl,
  })
  return 0
}
