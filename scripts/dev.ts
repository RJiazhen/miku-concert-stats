import { spawn, type ChildProcess } from 'node:child_process'
import path from 'node:path'
import { buildCatalog, repoRoot } from './build-catalog.ts'

/**
 * Forwards termination signals to the child, so stopping this wrapper (Ctrl+C
 * or an IDE stop button) also stops `nuxt dev` instead of orphaning it.
 */
const forwardSignals = (child: ChildProcess): void => {
  for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => child.kill(signal))
}

/** Runs a child process with inherited stdio and resolves its exit code. */
const run = (file: string, args: string[]): Promise<number> =>
  new Promise((resolve, reject) => {
    const child = spawn(file, args, { stdio: 'inherit', env: process.env })
    forwardSignals(child)
    child.on('error', reject)
    child.on('exit', (code, signal) => resolve(code ?? (signal ? 1 : 0)))
  })

/** Rebuilds the catalog, then runs `nuxt dev` with every argument forwarded. */
buildCatalog()

const nuxt = path.join(repoRoot(), 'node_modules', 'nuxt', 'bin', 'nuxt.mjs')
process.exitCode = await run(process.execPath, [nuxt, 'dev', ...process.argv.slice(2)])
