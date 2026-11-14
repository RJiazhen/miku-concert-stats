import { existsSync } from 'node:fs'
import { stopDevServer } from './dev-server.ts'
import {
  canPushRepo,
  commitsAheadOfOriginMain,
  currentBranch,
  fetchOriginMain,
  git,
  gitTry,
  readTaskIssue,
  statusShort,
  worktreeUnsafe,
} from './git.ts'
import { mainRoot, PRODUCTION_URL, REPO, WORKERS_BUILDS_NAME, worktreePath } from './paths.ts'
import { printError, printRecord } from './print.ts'
import { out, run, runOrThrow } from './run.ts'
import { removeWorkspaceFolder } from './workspace.ts'

export type ShipOptions = {
  branch: string
  message: string
  /** Skip pnpm test / typecheck even when code paths changed. */
  skipChecks?: boolean
}

type CheckRun = { name: string; status: string; conclusion: string | null }

/**
 * Loads check-runs for a commit SHA via the GitHub API.
 */
const listCheckRuns = (sha: string): CheckRun[] => {
  const raw = run('gh', [
    'api',
    `repos/${REPO}/commits/${sha}/check-runs`,
    '--jq',
    '[.check_runs[] | {name, status, conclusion}]',
  ])
  if (!raw.ok) return []
  try {
    return JSON.parse(raw.stdout) as CheckRun[]
  } catch {
    return []
  }
}

/**
 * Polls until the Workers Builds check completes, or until `timeoutMs` elapses.
 */
const waitForWorkersBuilds = async (
  sha: string,
  timeoutMs = 10 * 60_000,
): Promise<{ status: string; conclusion: string; lines: string[] }> => {
  const started = Date.now()
  let lastLines: string[] = []
  while (Date.now() - started < timeoutMs) {
    const runs = listCheckRuns(sha)
    lastLines = runs.map((runRow) => `${runRow.name} | ${runRow.status} ${runRow.conclusion ?? '-'}`)
    const workers = runs.filter((runRow) => runRow.name.includes(WORKERS_BUILDS_NAME))
    if (workers.length > 0 && workers.every((runRow) => runRow.status === 'completed')) {
      const failed = workers.find((runRow) => runRow.conclusion !== 'success')
      return {
        status: 'completed',
        conclusion: failed ? failed.conclusion ?? 'failure' : 'success',
        lines: lastLines,
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 15_000))
  }
  return { status: 'timeout', conclusion: '', lines: lastLines }
}

/**
 * Diffs the task branch against origin/main and returns whether checks are needed.
 */
const needsChecks = (worktree: string): { test: boolean; typecheck: boolean } => {
  const diff = gitTry(worktree, ['diff', '--name-only', 'origin/main...HEAD'])
  const files = diff.ok ? diff.stdout.split('\n').filter(Boolean) : []
  const logic = files.some((file) =>
    /^(shared|server|app|scripts|data|tests)\//.test(file) || file.endsWith('.ts') || file.endsWith('.vue'),
  )
  const typed = files.some((file) => file.endsWith('.ts') || file.endsWith('.vue'))
  return {
    test: files.some((file) => /^(shared|server|app|scripts|data|tests)\//.test(file)),
    typecheck: typed || logic,
  }
}

/**
 * Squash-merges the task branch into main, pushes, waits for Workers Builds, then cleans up.
 */
export const cmdShip = async (opts: ShipOptions): Promise<number> => {
  const branch = opts.branch
  const worktree = worktreePath(branch)
  const main = mainRoot()
  const message = opts.message.trim()
  if (!message) return printError('ship requires --message')
  if (!existsSync(worktree)) return printError(`worktree missing: ${worktree}`)

  const unsafe = worktreeUnsafe(worktree, branch)
  if (unsafe) return printError(`worktree unsafe: ${unsafe}`)

  const dirty = statusShort(worktree)
  if (dirty) return printError(`worktree is dirty; commit first:\n${dirty}`)

  const mainDirty = statusShort(main)
  if (mainDirty) return printError(`main checkout is dirty; resolve before ship:\n${mainDirty}`)

  fetchOriginMain()
  const ahead = commitsAheadOfOriginMain(worktree)
  if (ahead.length === 0) return printError('nothing to ship: origin/main..HEAD is empty')
  const branchTipBefore = git(worktree, ['rev-parse', 'HEAD'])

  if (!opts.skipChecks) {
    const checks = needsChecks(worktree)
    if (checks.test) {
      const test = run('pnpm', ['test'], { cwd: worktree })
      if (!test.ok) return printError(`pnpm test failed:\n${test.stdout}\n${test.stderr}`)
    }
    if (checks.typecheck) {
      const typecheck = run('pnpm', ['typecheck'], { cwd: worktree })
      if (!typecheck.ok) return printError(`pnpm typecheck failed:\n${typecheck.stdout}\n${typecheck.stderr}`)
    }
  }

  if (!canPushRepo()) {
    printRecord({
      ok: false,
      action: 'ship',
      error: 'no push permission; push the branch and open a PR instead',
      branch,
      worktree,
      hint: `git -C "${worktree}" push -u origin ${branch}`,
    })
    return 2
  }

  const issue = readTaskIssue(worktree)
  const commitMessage = issue ? `${message}\n\nCloses #${issue}` : message

  try {
    git(main, ['merge', '--ff-only', 'origin/main'])
    runOrThrow('git', ['-C', main, 'merge', '--squash', branch])
    const staged = statusShort(main)
    if (!staged) return printError('squash produced no changes')
    runOrThrow('git', ['-C', main, 'commit', '-m', commitMessage])
    runOrThrow('git', ['-C', main, 'push', 'origin', 'main'])
  } catch (error) {
    return printError(error instanceof Error ? error.message : String(error))
  }

  const sha = git(main, ['rev-parse', 'HEAD'])
  printRecord({
    ok: true,
    action: 'ship',
    step: 'pushed',
    sha,
    branch,
    production_url: PRODUCTION_URL,
    task_issue: issue || '',
  })

  const deploy = await waitForWorkersBuilds(sha)
  printRecord({
    deploy_status: deploy.status,
    deploy_conclusion: deploy.conclusion,
    deploy_checks: deploy.lines.join(' ; '),
  })
  if (deploy.status !== 'completed' || deploy.conclusion !== 'success') {
    return printError('deploy did not succeed; left worktree in place for fixes', 3)
  }

  let issueState = ''
  let issueClosedHow = ''
  if (issue) {
    const view = run('gh', [
      'issue',
      'view',
      issue,
      '--repo',
      REPO,
      '--json',
      'state,closedAt',
      '--jq',
      '"\\(.state) \\(.closedAt)"',
    ])
    issueState = out(view.stdout)
    if (!issueState.startsWith('CLOSED')) {
      run('gh', [
        'issue',
        'close',
        issue,
        '--repo',
        REPO,
        '--comment',
        `已在 ${sha} 合入 main（${branch}）。`,
      ])
      issueClosedHow = 'manual'
      issueState = out(
        run('gh', [
          'issue',
          'view',
          issue,
          '--repo',
          REPO,
          '--json',
          'state,closedAt',
          '--jq',
          '"\\(.state) \\(.closedAt)"',
        ]).stdout,
      )
    } else {
      issueClosedHow = 'closes'
    }
  }

  const tip = gitTry(main, ['rev-parse', branch])
  if (!tip.ok) return printError(`cannot resolve branch ${branch} for cleanup`)
  if (tip.stdout !== branchTipBefore) {
    return printError(
      `refusing cleanup: branch ${branch} moved after ship (${branchTipBefore} → ${tip.stdout}); another session may have committed`,
    )
  }
  if (currentBranch(worktree) !== branch) {
    return printError(`refusing cleanup: worktree branch is ${currentBranch(worktree)}`)
  }

  const stopped = stopDevServer(worktree, branch)
  const stillDirty = statusShort(worktree)
  if (stillDirty) return printError(`refusing worktree remove; dirty:\n${stillDirty}`)

  try {
    runOrThrow('git', ['-C', main, 'worktree', 'remove', worktree])
    runOrThrow('git', ['-C', main, 'branch', '-D', branch])
    run('git', ['-C', main, 'push', 'origin', '--delete', branch])
  } catch (error) {
    return printError(error instanceof Error ? error.message : String(error))
  }

  const workspaceRemoved = removeWorkspaceFolder(branch)
  printRecord({
    ok: true,
    action: 'ship',
    step: 'cleaned',
    sha,
    deploy_conclusion: 'success',
    production_url: PRODUCTION_URL,
    task_issue: issue || '',
    issue_state: issueState || 'unlinked',
    issue_closed_how: issueClosedHow || '',
    killed_pids: stopped.killedPids.join(','),
    workspace_removed: workspaceRemoved,
  })
  return 0
}
