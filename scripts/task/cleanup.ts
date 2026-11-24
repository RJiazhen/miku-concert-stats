import { existsSync } from 'node:fs'
import { stopDevServer } from './dev-server.ts'
import { currentBranch, gitTry, statusShort } from './git.ts'
import { mainRoot, worktreePath } from './paths.ts'
import { printError, printRecord } from './print.ts'
import { run, runOrThrow } from './run.ts'
import { removeWorkspaceFolder } from './workspace.ts'

export type CleanupOptions = {
  branch: string
  /**
   * When set, refuse cleanup if the local branch tip does not still match this
   * SHA (ship uses this so a concurrent commit cannot be deleted by mistake).
   */
  expectedTip?: string
}

/**
 * Removes a shipped task worktree. Tries a normal `git worktree remove` first;
 * retries with `--force` when git refuses because of leftover non-tracked files
 * such as `.DS_Store` after the dirty check already passed.
 */
export const removeShippedWorktree = (main: string, worktree: string): void => {
  if (!existsSync(worktree)) {
    run('git', ['-C', main, 'worktree', 'prune'])
    return
  }
  const soft = run('git', ['-C', main, 'worktree', 'remove', worktree])
  if (soft.ok) return
  const forced = run('git', ['-C', main, 'worktree', 'remove', '--force', worktree])
  if (forced.ok) return
  const detail = [soft.stderr, soft.stdout, forced.stderr, forced.stdout]
    .map((text) => text.trim())
    .filter(Boolean)
    .join('\n')
  throw new Error(`git worktree remove failed${detail ? `\n${detail}` : ''}`)
}

/**
 * Deletes the local task branch when it still exists.
 */
export const deleteLocalTaskBranch = (main: string, branch: string): boolean => {
  const tip = gitTry(main, ['rev-parse', '--verify', branch])
  if (!tip.ok) return false
  runOrThrow('git', ['-C', main, 'branch', '-D', branch])
  return true
}

/**
 * Deletes the remote task branch when it still exists (best-effort).
 */
export const deleteRemoteTaskBranch = (branch: string): boolean => {
  const result = run('git', ['-C', mainRoot(), 'push', 'origin', '--delete', branch])
  return result.ok
}

/**
 * Stops the task dev server, removes the worktree, deletes local/remote branch,
 * and drops the workspace folder entry. Used by `ship` after a successful
 * deploy and by `clean` when a previous ship left leftovers.
 */
export const cleanupTaskBranch = (opts: CleanupOptions): {
  killedPids: string[]
  localBranchDeleted: boolean
  remoteBranchDeleted: boolean
  workspaceRemoved: boolean
} => {
  const branch = opts.branch
  const main = mainRoot()
  const worktree = worktreePath(branch)

  if (opts.expectedTip) {
    const tip = gitTry(main, ['rev-parse', '--verify', branch])
    if (!tip.ok) throw new Error(`cannot resolve branch ${branch} for cleanup`)
    if (tip.stdout !== opts.expectedTip) {
      throw new Error(
        `refusing cleanup: branch ${branch} moved after ship (${opts.expectedTip} → ${tip.stdout}); another session may have committed`,
      )
    }
  }

  const stopped = existsSync(worktree)
    ? stopDevServer(worktree, branch)
    : { killedPids: [] as string[], screenQuit: false }

  if (existsSync(worktree)) {
    const onBranch = currentBranch(worktree)
    if (onBranch && onBranch !== branch) {
      throw new Error(`refusing cleanup: worktree branch is ${onBranch}`)
    }
    const stillDirty = statusShort(worktree)
    if (stillDirty) throw new Error(`refusing worktree remove; dirty:\n${stillDirty}`)
  }

  removeShippedWorktree(main, worktree)
  const localBranchDeleted = deleteLocalTaskBranch(main, branch)
  const remoteBranchDeleted = deleteRemoteTaskBranch(branch)
  const workspaceRemoved = removeWorkspaceFolder(branch)

  return {
    killedPids: stopped.killedPids,
    localBranchDeleted,
    remoteBranchDeleted,
    workspaceRemoved,
  }
}

/**
 * CLI: finish leftover task cleanup after a partial ship or a stuck worktree.
 */
export const cmdClean = (opts: { branch: string }): number => {
  const branch = opts.branch.trim()
  if (!branch) return printError('clean requires <branch>')
  try {
    const result = cleanupTaskBranch({ branch })
    printRecord({
      ok: true,
      action: 'clean',
      branch,
      killed_pids: result.killedPids.join(','),
      local_branch_deleted: result.localBranchDeleted,
      remote_branch_deleted: result.remoteBranchDeleted,
      workspace_removed: result.workspaceRemoved,
    })
    return 0
  } catch (error) {
    return printError(error instanceof Error ? error.message : String(error))
  }
}
