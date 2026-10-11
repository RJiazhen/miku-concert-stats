import { mkdirSync, readdirSync, readFileSync, copyFileSync, rmSync } from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import Database from 'better-sqlite3'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)

/** Repository root, whether this file is run from tsx or compiled output. */
export const repoRoot = (): string => {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
}

/** Applies schema.sql and every increment in lexical order. */
export const applyCatalogSql = (db: Database.Database, root = repoRoot()): void => {
  const schema = readFileSync(path.join(root, 'data', 'schema.sql'), 'utf8')
  db.exec(schema)
  const directory = path.join(root, 'data', 'increments')
  let files: string[] = []
  try {
    files = readdirSync(directory).filter((name) => name.endsWith('.sql')).sort()
  } catch (error) {
    const missing = error instanceof Error && 'code' in error && error.code === 'ENOENT'
    if (!missing) throw error
  }
  for (const name of files) {
    db.exec(readFileSync(path.join(directory, name), 'utf8'))
  }
}

/** Copies sql.js wasm next to the sqlite file the browser fetches. */
export const copySqlWasm = (root = repoRoot()): void => {
  const wasm = require.resolve('sql.js/dist/sql-wasm.wasm')
  const target = path.join(root, 'public', 'sql-wasm.wasm')
  mkdirSync(path.dirname(target), { recursive: true })
  copyFileSync(wasm, target)
}

/** Builds public/data/catalog.sqlite from the committed SQL files. */
export const buildCatalogFile = (root = repoRoot()): string => {
  const target = path.join(root, 'public', 'data', 'catalog.sqlite')
  mkdirSync(path.dirname(target), { recursive: true })
  rmSync(target, { force: true })
  const db = new Database(target)
  try {
    applyCatalogSql(db, root)
  } finally {
    db.close()
  }
  return target
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isDirectRun) {
  const target = buildCatalogFile()
  try {
    copySqlWasm()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`Skipping sql.js wasm copy: ${message}`)
  }
  console.log(`Wrote ${target}`)
}
