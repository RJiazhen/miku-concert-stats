#!/usr/bin/env node
/**
 * Maintainer task workflow CLI: create worktrees, report status/dev URL, ship.
 *
 * Usage:
 *   vp run task -- status [--worktree <branch-or-path>] [--no-fetch]
 *   vp run task -- start <branch> [--issue N]
 *   vp run task -- dev-url <branch-or-path>
 *   vp run task -- dev-stop <branch-or-path>
 *   vp run task -- ship <branch> --message "..." [--skip-checks]
 */
import { existsSync } from 'node:fs'
import { resolveDevUrl, stopDevServer, waitForDevUrl } from './task/dev-server.ts'
import { currentBranch } from './task/git.ts'
import { printError, printRecord } from './task/print.ts'
import { worktreePath } from './task/paths.ts'
import { cmdShip } from './task/ship.ts'
import { cmdStart } from './task/start.ts'
import { cmdStatus } from './task/status.ts'

/**
 * Resolves a CLI argument to an absolute worktree path and branch name.
 */
const resolveWorktreeArg = (arg: string): { worktree: string; branch: string } => {
  if (existsSync(arg)) {
    return { worktree: arg, branch: currentBranch(arg) || arg.split('/').filter(Boolean).at(-1) || '' }
  }
  return { worktree: worktreePath(arg), branch: arg }
}

/**
 * Reads a named flag value (`--flag value`) from argv; returns undefined when missing.
 */
const flagValue = (argv: string[], name: string): string | undefined => {
  const index = argv.indexOf(name)
  if (index < 0) return undefined
  return argv[index + 1]
}

/**
 * Returns whether a boolean flag is present.
 */
const hasFlag = (argv: string[], name: string): boolean => argv.includes(name)

/**
 * Prints CLI usage to stderr.
 */
const usage = (): void => {
  console.error(`Usage:
  vp run task -- status [--worktree <branch-or-path>] [--no-fetch]
  vp run task -- start <branch> [--issue N]
  vp run task -- dev-url <branch-or-path> [--wait]
  vp run task -- dev-stop <branch-or-path>
  vp run task -- ship <branch> --message "..." [--skip-checks]`)
}

/**
 * CLI entry: dispatches to status / start / dev-url / dev-stop / ship.
 */
const main = async (): Promise<number> => {
  // `vp run task -- status` and `pnpm task -- status` pass a literal `--` separator.
  const argv = process.argv.slice(2).filter((arg, index, all) => !(arg === '--' && index === 0 && all.length > 1))
  const command = argv[0]
  if (!command || command === '-h' || command === '--help') {
    usage()
    return command ? 0 : 1
  }

  if (command === 'status') {
    return cmdStatus({
      target: flagValue(argv, '--worktree'),
      noFetch: hasFlag(argv, '--no-fetch'),
    })
  }

  if (command === 'start') {
    const branch = argv[1]
    if (!branch || branch.startsWith('-')) {
      usage()
      return printError('start requires <branch>')
    }
    return cmdStart({ branch, issue: flagValue(argv, '--issue') })
  }

  if (command === 'dev-url') {
    const target = argv[1]
    if (!target || target.startsWith('-')) {
      usage()
      return printError('dev-url requires <branch-or-path>')
    }
    const { worktree, branch } = resolveWorktreeArg(target)
    if (!existsSync(worktree)) return printError(`worktree missing: ${worktree}`)
    const url = hasFlag(argv, '--wait') ? await waitForDevUrl(worktree) : resolveDevUrl(worktree)
    printRecord({
      ok: Boolean(url),
      branch,
      worktree,
      dev_url: url ?? '',
    })
    return url ? 0 : 1
  }

  if (command === 'dev-stop') {
    const target = argv[1]
    if (!target || target.startsWith('-')) {
      usage()
      return printError('dev-stop requires <branch-or-path>')
    }
    const { worktree, branch } = resolveWorktreeArg(target)
    if (!existsSync(worktree)) return printError(`worktree missing: ${worktree}`)
    const stopped = stopDevServer(worktree, branch)
    printRecord({
      ok: true,
      branch,
      worktree,
      killed_pids: stopped.killedPids.join(','),
      screen_quit: stopped.screenQuit,
    })
    return 0
  }

  if (command === 'ship') {
    const branch = argv[1]
    const message = flagValue(argv, '--message')
    if (!branch || branch.startsWith('-') || !message) {
      usage()
      return printError('ship requires <branch> and --message')
    }
    return cmdShip({
      branch,
      message,
      skipChecks: hasFlag(argv, '--skip-checks'),
    })
  }

  usage()
  return printError(`unknown command: ${command}`)
}

process.exitCode = await main()
