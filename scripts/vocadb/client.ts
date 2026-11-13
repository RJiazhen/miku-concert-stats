import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

/** Identifies this collector to VocaDB operators. */
export const USER_AGENT = 'miku-concert-stats/0.1 (+https://github.com/RJiazhen/miku-concert-stats)'

/** Minimum gap between uncached VocaDB requests. */
export const MIN_INTERVAL_MS = 300

/** Hard stop so a bug cannot page the API without limit. */
export const MAX_REQUESTS = 800

/** Options for the caching JSON client. */
export type ClientOptions = {
  cacheDir: string
  fetchImpl?: typeof fetch
  sleep?: (ms: number) => Promise<void>
}

/** Cached JSON client that spaces out network calls. */
export type VocadbClient = {
  /** Fetches JSON, using the on-disk cache when present. */
  getJson: (url: string) => Promise<unknown>
  /** How many network requests have been made. */
  requestCount: () => number
}

/** Waits for the given number of milliseconds. */
const delay = (ms: number): Promise<void> => new Promise((resolve) => {
  setTimeout(resolve, ms)
})

/** Cache file name for a request URL. */
const cacheFile = (cacheDir: string, url: string): string => {
  const digest = createHash('sha256').update(url).digest('hex')
  return path.join(cacheDir, `${digest}.json`)
}

/**
 * Creates a VocaDB client.
 * Cache hits do not sleep and do not count toward the request budget.
 * A 429 or 5xx is retried once after two seconds.
 */
export const createVocadbClient = (options: ClientOptions): VocadbClient => {
  const fetchImpl = options.fetchImpl ?? fetch
  const sleep = options.sleep ?? delay
  let lastNetworkAt = 0
  let requests = 0

  /** Fetches one URL, preferring the cache and spacing network calls. */
  const getJson = async (url: string): Promise<unknown> => {
    const file = cacheFile(options.cacheDir, url)
    try {
      const cached = await readFile(file, 'utf8')
      return JSON.parse(cached) as unknown
    } catch (error) {
      const missing = error instanceof Error && 'code' in error && error.code === 'ENOENT'
      if (!missing) throw error
    }

    if (requests >= MAX_REQUESTS) {
      throw new Error(`VocaDB request budget of ${MAX_REQUESTS} exceeded at ${url}`)
    }
    const elapsed = Date.now() - lastNetworkAt
    if (lastNetworkAt !== 0 && elapsed < MIN_INTERVAL_MS) await sleep(MIN_INTERVAL_MS - elapsed)

    /** Performs one counted network request. */
    const load = async (): Promise<Response> => {
      requests += 1
      lastNetworkAt = Date.now()
      return fetchImpl(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': USER_AGENT,
        },
      })
    }

    let response = await load()
    if (response.status === 429 || response.status >= 500) {
      await sleep(2000)
      response = await load()
    }
    if (!response.ok) {
      throw new Error(`VocaDB ${response.status} for ${url}`)
    }
    const body = await response.text()
    await mkdir(options.cacheDir, { recursive: true })
    await writeFile(file, body)
    return JSON.parse(body) as unknown
  }

  return {
    getJson,
    requestCount: () => requests,
  }
}
