import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { mainRoot, REPO, taskIssueFile, worktreePath } from './paths.ts'
import { out, run, runOrThrow } from './run.ts'

/** Runs `git -C <cwd> …` and returns trimmed stdout (throws on failure). */
export const git = (cwd: string, args: string[]): string => out(runOrThrow('git', ['-C', cwd, ...args]))

/** Runs `git -C <cwd> …` without throwing; useful for optional probes. */
export const gitTry = (cwd: string, args: string[]): { ok: boolean; stdout: string; stderr: string } => {
  const result = run('git', ['-C', cwd, ...args])
  return { ok: result.ok, stdout: out(result.stdout), stderr: result.stderr }
}

/** Current branch name for a checkout, or empty when detached / missing. */
export const currentBranch = (cwd: string): string => {
  const result = gitTry(cwd, ['branch', '--show-current'])
  return result.ok ? result.stdout : ''
}

/** Short porcelain status for a checkout. */
export const statusShort = (cwd: string): string => {
  const result = gitTry(cwd, ['status', '--short'])
  return result.ok ? result.stdout : result.stderr.trim()
}

/** Commits on this branch that are not on origin/main (one per line). */
export const commitsAheadOfOriginMain = (cwd: string): string[] => {
  const result = gitTry(cwd, ['log', '--oneline', 'origin/main..HEAD'])
  if (!result.ok || !result.stdout) return []
  return result.stdout.split('\n').filter(Boolean)
}

/** Fetches origin/main into the main checkout and prunes stale refs. */
export const fetchOriginMain = (): void => {
  runOrThrow('git', ['-C', mainRoot(), 'fetch', 'origin', 'main', '--prune'])
}

/** Lists local worktrees as `{ path, head, branch }` rows. */
export const listWorktrees = (): { path: string; head: string; branch: string }[] => {
  const raw = git(mainRoot(), ['worktree', 'list', '--porcelain'])
  const rows: { path: string; head: string; branch: string }[] = []
  let current: { path?: string; head?: string; branch?: string } = {}
  for (const line of raw.split('\n')) {
    if (line.startsWith('worktree ')) {
      if (current.path) {
        rows.push({
          path: current.path,
          head: current.head ?? '',
          branch: current.branch ?? '',
        })
      }
      current = { path: line.slice('worktree '.length) }
      continue
    }
    if (line.startsWith('HEAD ')) current.head = line.slice('HEAD '.length)
    if (line.startsWith('branch ')) current.branch = line.slice('branch '.length).replace(/^refs\/heads\//, '')
    if (line === '') {
      if (current.path) {
        rows.push({
          path: current.path,
          head: current.head ?? '',
          branch: current.branch ?? '',
        })
      }
      current = {}
    }
  }
  if (current.path) {
    rows.push({
      path: current.path,
      head: current.head ?? '',
      branch: current.branch ?? '',
    })
  }
  return rows
}

/** Reads the optional issue number stored under the worktree's `tmp/task-issue`. */
export const readTaskIssue = (worktree: string): string => {
  const file = taskIssueFile(worktree)
  if (!existsSync(file)) return ''
  return readFileSync(file, 'utf8').replace(/\D/g, '')
}

/** Writes the task issue number (or empty) into `tmp/task-issue`. */
export const writeTaskIssue = (worktree: string, issue: string): void => {
  const file = taskIssueFile(worktree)
  mkdirSync(path.dirname(file), { recursive: true })
  writeFileSync(file, issue ? `${issue}\n` : '')
}

/**
 * Creates a new worktree/branch from origin/main at the standard path.
 * Throws when the destination already exists.
 */
export const addWorktreeFromOriginMain = (branch: string): string => {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(branch)) {
    throw new Error(`branch must be kebab-case (got ${branch})`)
  }
  const dest = worktreePath(branch)
  if (existsSync(dest)) throw new Error(`worktree already exists: ${dest}`)
  fetchOriginMain()
  runOrThrow('git', ['-C', mainRoot(), 'worktree', 'add', dest, '-b', branch, 'origin/main'])
  return dest
}

/** Whether the authenticated user can push to the GitHub repo. */
export const canPushRepo = (): boolean => {
  const result = run('gh', ['api', `repos/${REPO}`, '--jq', '.permissions.push'])
  return out(result.stdout) === 'true'
}

/**
 * Returns a blocker string when the worktree has a rebase/merge in progress or
 * the branch name does not match the expected task branch; otherwise null.
 */
export const worktreeUnsafe = (worktree: string, expectedBranch: string): string | null => {
  const rebaseMerge = out(run('git', ['-C', worktree, 'rev-parse', '--git-path', 'rebase-merge']).stdout)
  const rebaseApply = out(run('git', ['-C', worktree, 'rev-parse', '--git-path', 'rebase-apply']).stdout)
  const mergeHead = out(run('git', ['-C', worktree, 'rev-parse', '--git-path', 'MERGE_HEAD']).stdout)
  if (rebaseMerge && existsSync(rebaseMerge)) return 'rebase in progress'
  if (rebaseApply && existsSync(rebaseApply)) return 'rebase in progress'
  if (mergeHead && existsSync(mergeHead)) return 'merge in progress'
  const branch = currentBranch(worktree)
  if (branch && branch !== expectedBranch) return `branch is ${branch}, expected ${expectedBranch}`
  return null
}
