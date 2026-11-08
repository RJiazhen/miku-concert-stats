import { useRuntimeConfig, useState } from 'nuxt/app'
import initSqlJs from 'sql.js'
import { loadCatalog } from '~~/shared/catalog.ts'
import { useLocale } from './useLocale.ts'
import type { Catalog, SqlRow } from '~~/shared/types.ts'

/** Minimal sql.js types. The 1.14 package does not ship its own declarations. */
declare module 'sql.js' {
  type SqlValue = string | number | null | Uint8Array
  type QueryExecResult = { columns: string[]; values: SqlValue[][] }
  type Database = {
    exec: (sql: string) => QueryExecResult[]
    close: () => void
  }
  type SqlJsStatic = {
    Database: new (data?: ArrayLike<number> | Buffer) => Database
  }
  type InitSqlJs = (config?: { locateFile?: (file: string) => string }) => Promise<SqlJsStatic>
  const initSqlJs: InitSqlJs
  export default initSqlJs
}

/** Empty state so server render does not open the sqlite wasm build. */
const emptyCatalog = (): Catalog | null => null

/** Empty error slot shared across pages. */
const emptyError = (): string | null => null

/** Pending flag shared across pages. */
const notPending = (): boolean => false

/**
 * Reads one sql.js result set into row objects.
 * An empty result means the table has no rows, not a failed query.
 */
const rowsFromSqlJs = (columns: string[], values: (string | number | null | Uint8Array)[][]): SqlRow[] => {
  return values.map((value) => {
    const row: SqlRow = {}
    columns.forEach((column, index) => {
      const cell = value[index]
      row[column] = cell === undefined ? null : cell
    })
    return row
  })
}

/** Inflates a gzip response body into the raw sqlite bytes. */
const inflateCatalog = async (response: Response, t: ReturnType<typeof useLocale>['t']): Promise<Uint8Array> => {
  const body = response.body
  if (!body) throw new Error(t('common.catalogEmptyResponse'))
  const stream = body.pipeThrough(new DecompressionStream('gzip'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

/** Fetches one catalog URL, turning a failed response into the build hint. */
const fetchCatalog = async (url: string, t: ReturnType<typeof useLocale>['t']): Promise<Response> => {
  const response = await fetch(url)
  if (!response.ok) throw new Error(t('common.catalogMissingDb'))
  return response
}

/**
 * Reads the catalog bytes.
 * Prefers the gzipped copy, which Cloudflare serves as-is; browsers without
 * DecompressionStream fall back to the plain sqlite file.
 *
 * @param gzipUrl gzipped copy to inflate, or null to read the plain file only
 * @param plainUrl uncompressed sqlite file
 */
const readCatalogBytes = async (
  gzipUrl: string | null,
  plainUrl: string,
  t: ReturnType<typeof useLocale>['t'],
): Promise<Uint8Array> => {
  if (gzipUrl && typeof DecompressionStream === 'function') {
    try {
      return await inflateCatalog(await fetchCatalog(gzipUrl, t), t)
    } catch {
      // Missing or corrupt gzip copy: use the plain file below.
    }
  }
  return new Uint8Array(await (await fetchCatalog(plainUrl, t)).arrayBuffer())
}

/** Downloads the built catalog and loads it with sql.js in the browser. */
export const loadCatalogFromNetwork = async (
  gzipUrl: string | null,
  plainUrl: string,
  t: ReturnType<typeof useLocale>['t'],
): Promise<Catalog> => {
  const SQL = await initSqlJs({ locateFile: () => '/sql-wasm.wasm' })
  const bytes = await readCatalogBytes(gzipUrl, plainUrl, t)
  const db = new SQL.Database(bytes)
  try {
    return loadCatalog({
      /** Forwards a SELECT to the wasm database. */
      all: (sql: string) => {
        const result = db.exec(sql)
        const first = result[0]
        if (!first) return []
        return rowsFromSqlJs(first.columns, first.values)
      },
    })
  } finally {
    db.close()
  }
}

/** Shares one client-side catalog across pages. */
export const useCatalog = () => {
  const catalog = useState<Catalog | null>('catalog', emptyCatalog)
  const error = useState<string | null>('catalog-error', emptyError)
  const pending = useState<boolean>('catalog-pending', notPending)
  const version = useRuntimeConfig().public.catalogVersion
  const { t } = useLocale()

  /**
   * Versioned gzip URL so repeat visits reuse the cached catalog.
   * Empty in dev: the dev script rebuilds the file, and the dev server must not hand
   * back a stale copy under an immutable URL.
   */
  const gzipUrl = (): string | null => {
    if (!import.meta.dev && version) return `/data/catalog.sqlite.gz?v=${version}`
    return null
  }

  /** Loads the sqlite catalog once. Later calls reuse the same state. */
  const load = async (): Promise<void> => {
    if (catalog.value || pending.value) return
    pending.value = true
    error.value = null
    try {
      catalog.value = await loadCatalogFromNetwork(gzipUrl(), '/data/catalog.sqlite', t)
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : String(caught)
    } finally {
      pending.value = false
    }
  }

  return { catalog, error, pending, load }
}
