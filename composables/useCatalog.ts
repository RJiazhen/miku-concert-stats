import { useState } from 'nuxt/app'
import initSqlJs from 'sql.js'
import { loadCatalog } from '../shared/catalog.ts'
import type { Catalog, SqlRow } from '../shared/types.ts'

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

/** Downloads the built catalog and loads it with sql.js in the browser. */
export const loadCatalogFromNetwork = async (): Promise<Catalog> => {
  const SQL = await initSqlJs({ locateFile: () => '/sql-wasm.wasm' })
  const response = await fetch('/data/catalog.sqlite')
  if (!response.ok) throw new Error('找不到目录数据库。请先运行 pnpm build:catalog。')
  const bytes = new Uint8Array(await response.arrayBuffer())
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

  /** Loads the sqlite catalog once. Later calls reuse the same state. */
  const load = async (): Promise<void> => {
    if (catalog.value || pending.value) return
    pending.value = true
    error.value = null
    try {
      catalog.value = await loadCatalogFromNetwork()
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : String(caught)
    } finally {
      pending.value = false
    }
  }

  return { catalog, error, pending, load }
}
