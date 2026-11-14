import { addWorktreeFromOriginMain, writeTaskIssue } from './git.ts'
import { printError, printRecord } from './print.ts'
import { ensureWorkspaceFolder } from './workspace.ts'

export type StartOptions = {
  branch: string
  issue?: string
}

/**
 * Creates a task worktree from origin/main, registers it in the workspace file,
 * and writes `tmp/task-issue` (empty when no issue).
 */
export const cmdStart = (opts: StartOptions): number => {
  try {
    const worktree = addWorktreeFromOriginMain(opts.branch)
    const added = ensureWorkspaceFolder(opts.branch)
    const issue = (opts.issue ?? '').replace(/\D/g, '')
    writeTaskIssue(worktree, issue)
    printRecord({
      ok: true,
      action: 'start',
      branch: opts.branch,
      worktree,
      workspace_added: added,
      task_issue: issue || '',
    })
    return 0
  } catch (error) {
    return printError(error instanceof Error ? error.message : String(error))
  }
}
