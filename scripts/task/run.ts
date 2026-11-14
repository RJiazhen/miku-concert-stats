import { spawnSync } from 'node:child_process'

export type RunResult = {
  ok: boolean
  code: number
  stdout: string
  stderr: string
}

/**
 * Runs a command synchronously and captures stdout/stderr as UTF-8 text.
 * Does not throw on non-zero exit; callers check `ok` / `code`.
 */
export const run = (
  file: string,
  args: string[],
  opts: { cwd?: string; input?: string; env?: NodeJS.ProcessEnv } = {},
): RunResult => {
  const result = spawnSync(file, args, {
    cwd: opts.cwd,
    input: opts.input,
    env: { ...process.env, ...opts.env },
    encoding: 'utf8',
  })
  const stdout = result.stdout ?? ''
  const stderr = result.stderr ?? ''
  const code = result.status ?? (result.signal ? 1 : 0)
  return { ok: code === 0, code, stdout, stderr }
}

/**
 * Runs a command and throws with combined output when the exit code is non-zero.
 */
export const runOrThrow = (
  file: string,
  args: string[],
  opts: { cwd?: string; input?: string; env?: NodeJS.ProcessEnv } = {},
): string => {
  const result = run(file, args, opts)
  if (!result.ok) {
    const detail = [result.stdout, result.stderr].filter(Boolean).join('\n').trim()
    throw new Error(`${file} ${args.join(' ')} failed (${result.code})${detail ? `\n${detail}` : ''}`)
  }
  return result.stdout
}

/** Trims trailing newlines from captured command output. */
export const out = (text: string): string => text.replace(/\n+$/, '')
