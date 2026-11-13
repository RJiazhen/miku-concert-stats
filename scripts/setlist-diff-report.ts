import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import { applyCatalogSql, repoRoot } from './build-catalog.ts'
import { loadCatalog } from '../shared/catalog.ts'
import { parseSetlistMerges } from '../shared/edition-setlists.ts'
import { buildSetlistDiffReport, renderSetlistDiffCsv, renderSetlistDiffMarkdown } from '../shared/setlist-diff.ts'
import { japaneseAliasTitle, parseSongAliases } from '../shared/song-aliases.ts'
import type { SqlRow } from '../shared/types.ts'

const REPORT_DIR = path.join('docs', 'reports')
const MARKDOWN_FILE = 'setlist-differences.md'
const CSV_FILE = 'setlist-differences.csv'

/** Reads a JSON file from the repository. */
const readJson = (root: string, relative: string): unknown => {
  return JSON.parse(readFileSync(path.join(root, relative), 'utf8'))
}

/** Builds the catalog from the committed SQL so the report matches what the site shows. */
const readCatalog = (root: string) => {
  const db = new Database(':memory:')
  try {
    applyCatalogSql(db, root)
    return loadCatalog({
      /** Runs one read-only query against the in-memory catalog. */
      all: (sql: string) => db.prepare(sql).all() as SqlRow[],
    })
  } finally {
    db.close()
  }
}

/** Writes a file, creating its directory first. */
const writeReport = (root: string, name: string, content: string): string => {
  const target = path.join(root, REPORT_DIR, name)
  mkdirSync(path.dirname(target), { recursive: true })
  writeFileSync(target, content)
  return target
}

/** Compares generated files with the committed ones without touching the working tree. */
const checkExisting = (root: string, files: readonly (readonly [string, string])[]): number => {
  let stale = 0
  for (const [name, content] of files) {
    let existing = ''
    try {
      existing = readFileSync(path.join(root, REPORT_DIR, name), 'utf8')
    } catch {
      existing = ''
    }
    if (existing !== content) {
      console.error(`${name} is out of date. Run pnpm report:setlist.`)
      stale++
    }
  }
  return stale
}

const root = repoRoot()
const catalog = readCatalog(root)
const merges = parseSetlistMerges(readJson(root, path.join('data', 'setlist-merges.json')))
const aliases = parseSongAliases(readJson(root, path.join('data', 'song-aliases.json')))
const report = buildSetlistDiffReport(catalog, merges)
/** Display name of a song: a registered `ja` alias wins over the VocaDB default name. */
const nameOf = (song: { id: number; name: string }): string => japaneseAliasTitle(aliases, song.id) ?? song.name
const files: [string, string][] = [
  [MARKDOWN_FILE, renderSetlistDiffMarkdown(catalog, report, nameOf)],
  [CSV_FILE, renderSetlistDiffCsv(catalog, report, nameOf)],
]

if (process.argv.includes('--check')) {
  const stale = checkExisting(root, files)
  if (stale > 0) process.exit(1)
  console.log('Setlist difference report is up to date.')
} else {
  for (const [name, content] of files) console.log(`Wrote ${writeReport(root, name, content)}`)
  const total = Object.values(report.summary).reduce((sum, count) => sum + count, 0)
  console.log(`${report.pairCount} same-edition pairs, ${report.adjacentEditions.length} adjacent pairs, ${total} rows.`)
}
