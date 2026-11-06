import { spawn, type ChildProcess } from 'node:child_process'
import { createRequire } from 'node:module'
import { defineConfig, type Plugin, type ViteDevServer } from 'vite-plus'

/** Set only for the Nuxt process, so the handoff below never fires a second time. */
const CHILD_ENV = 'MIKU_NUXT_DEV_CHILD'

const require = createRequire(import.meta.url)

/** Resolves the port the Vite listener actually bound, which differs from the configured one when it was busy. */
const boundPort = (server: ViteDevServer): number => {
  const address = server.httpServer?.address()
  if (address && typeof address === 'object') return address.port
  return server.config.server.port ?? 5173
}

/** Turns Vite's `--host` value into a Nuxt `--host` argument, if one was requested. */
const nuxtHostArgument = (host: ViteDevServer['config']['server']['host']): string[] => {
  if (host === true) return ['--host', '0.0.0.0']
  if (typeof host === 'string' && host) return ['--host', host]
  return []
}

/**
 * Forwards termination signals to the child so stopping the CLI (Ctrl+C or an
 * IDE stop button) also stops Nuxt, even when only this process is signalled.
 */
const forwardSignals = (child: ChildProcess): void => {
  for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => child.kill(signal))
}

/**
 * Replaces the closed Vite listener with the project's own dev script on the same address.
 * Resolves nothing: the spawned process keeps this one alive until it exits.
 */
const startDevScript = (port: number, host: string[]): void => {
  const child = spawn(process.execPath, [require.resolve('tsx/cli'), 'scripts/dev.ts', '--port', String(port), ...host], {
    stdio: 'inherit',
    env: { ...process.env, [CHILD_ENV]: '1' },
  })
  forwardSignals(child)
  child.on('exit', (code, signal) => process.exit(signal ? 1 : (code ?? 0)))
}

/**
 * Hands the dev server to Nuxt, because `vp dev` always runs Vite+ own Vite
 * server and this project's app, SSR and API routes only exist in `nuxt dev`.
 * Closing the listener first frees the port for Nuxt to bind.
 */
const nuxtDevHandoff = (): Plugin => ({
  name: 'miku:nuxt-dev-handoff',
  apply: 'serve',
  configureServer: (server) => {
    if (process.env[CHILD_ENV]) return
    const httpServer = server.httpServer
    if (!httpServer) return
    const handOff = async (): Promise<void> => {
      const port = boundPort(server)
      const host = nuxtHostArgument(server.config.server.host)
      await server.close()
      startDevScript(port, host)
    }
    if (httpServer.listening) void handOff()
    else httpServer.once('listening', () => void handOff())
  },
})

export default defineConfig({
  // Vite is only a placeholder here: it is closed right after binding, so its
  // "Local" URL would point at a server that no longer exists.
  logLevel: 'warn',
  // Bind the same interface as `devServer.host` in nuxt.config.ts, so a busy
  // port is detected the same way here and by Nuxt.
  server: { host: '127.0.0.1' },
  plugins: [nuxtDevHandoff()],
})
