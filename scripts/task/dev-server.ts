import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { screenName } from './paths.ts'
import { out, run } from './run.ts'

const LOCAL_URL_RE = /https?:\/\/127\.0\.0\.1:(\d+)/g

/**
 * Parses the last `127.0.0.1:<port>` URL from Nuxt / Vite startup logs.
 */
export const portFromLogText = (text: string): number | null => {
  let last: number | null = null
  for (const match of text.matchAll(LOCAL_URL_RE)) {
    last = Number(match[1])
  }
  return last
}

/**
 * Reads `$worktree/tmp/dev-server.log` when present and returns the last local port.
 */
export const portFromDevLog = (worktree: string): number | null => {
  const logPath = path.join(worktree, 'tmp', 'dev-server.log')
  if (!existsSync(logPath)) return null
  return portFromLogText(readFileSync(logPath, 'utf8'))
}

/**
 * Lists TCP listen ports for processes whose cwd is exactly `worktree`.
 */
export const listenPortsForWorktree = (worktree: string): number[] => {
  const pids = out(run('lsof', ['-nP', '-iTCP', '-sTCP:LISTEN', '-t']).stdout)
    .split(/\s+/)
    .filter(Boolean)
  const ports = new Set<number>()
  for (const pid of [...new Set(pids)]) {
    const cwdRaw = run('lsof', ['-a', '-p', pid, '-d', 'cwd', '-Fn']).stdout
    const cwd = cwdRaw
      .split('\n')
      .find((line) => line.startsWith('n'))
      ?.slice(1)
    if (cwd !== worktree) continue
    const listen = run('lsof', ['-nP', '-a', '-p', pid, '-iTCP', '-sTCP:LISTEN', '-Fn']).stdout
    for (const line of listen.split('\n')) {
      if (!line.startsWith('n')) continue
      const match = line.match(/:(\d+)$/)
      if (match) ports.add(Number(match[1]))
    }
  }
  return [...ports].sort((a, b) => a - b)
}

/**
 * Probes a local HTTP port and returns true for 200 / 302 / 304 responses.
 */
export const httpOk = (port: number, timeoutMs = 2000): boolean => {
  const result = run('curl', [
    '-s',
    '-o',
    '/dev/null',
    '-w',
    '%{http_code}',
    '--max-time',
    String(Math.max(1, Math.ceil(timeoutMs / 1000))),
    `http://127.0.0.1:${port}/`,
  ])
  return ['200', '302', '304'].includes(result.stdout.trim())
}

/**
 * Resolves this worktree's HTTP URL: prefer Nuxt log, else first LISTEN port that answers.
 */
export const resolveDevUrl = (worktree: string): string | null => {
  const fromLog = portFromDevLog(worktree)
  if (fromLog != null && httpOk(fromLog)) return `http://127.0.0.1:${fromLog}/`
  for (const port of listenPortsForWorktree(worktree)) {
    if (httpOk(port)) return `http://127.0.0.1:${port}/`
  }
  if (fromLog != null) return `http://127.0.0.1:${fromLog}/`
  return null
}

/**
 * Polls until the worktree's HTTP server responds, or returns null after `timeoutMs`.
 */
export const waitForDevUrl = async (worktree: string, timeoutMs = 60_000): Promise<string | null> => {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    const url = resolveDevUrl(worktree)
    if (url && httpOk(Number(new URL(url).port))) return url
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  return resolveDevUrl(worktree)
}

/**
 * Kills LISTEN processes whose cwd is this worktree and quits the matching screen session.
 */
export const stopDevServer = (worktree: string, branch: string): { killedPids: string[]; screenQuit: boolean } => {
  const pids = out(run('lsof', ['-nP', '-iTCP', '-sTCP:LISTEN', '-t']).stdout)
    .split(/\s+/)
    .filter(Boolean)
  const killedPids: string[] = []
  for (const pid of [...new Set(pids)]) {
    const cwdRaw = run('lsof', ['-a', '-p', pid, '-d', 'cwd', '-Fn']).stdout
    const cwd = cwdRaw
      .split('\n')
      .find((line) => line.startsWith('n'))
      ?.slice(1)
    if (cwd !== worktree) continue
    run('kill', [pid])
    killedPids.push(pid)
  }
  const screen = run('screen', ['-S', screenName(branch), '-X', 'quit'])
  return { killedPids, screenQuit: screen.ok }
}
