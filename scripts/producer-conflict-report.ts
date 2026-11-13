import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import { applyCatalogSql, repoRoot } from './build-catalog.ts'
import { loadCatalog } from '../shared/catalog.ts'
import { buildProducerConflictReport, renderProducerConflictMarkdown } from '../shared/producer-conflicts.ts'
import type { SqlRow } from '../shared/types.ts'

const REPORT_DIR = path.join('docs', 'reports')
const MARKDOWN_FILE = 'producer-conflicts.md'

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

/** Path of the committed Markdown report. */
const reportPath = (root: string): string => path.join(root, REPORT_DIR, MARKDOWN_FILE)

/** Reads the committed report, treating a missing file as empty so `--check` fails loudly. */
const readExisting = (root: string): string => {
  try {
    return readFileSync(reportPath(root), 'utf8')
  } catch {
    return ''
  }
}

/** Writes the report, creating its directory first, and returns the absolute path. */
const writeReport = (root: string, content: string): string => {
  const target = reportPath(root)
  mkdirSync(path.dirname(target), { recursive: true })
  writeFileSync(target, content)
  return target
}

const root = repoRoot()
const catalog = readCatalog(root)
const report = buildProducerConflictReport(catalog)
const content = renderProducerConflictMarkdown(report)

if (process.argv.includes('--check')) {
  if (readExisting(root) !== content) {
    console.error(`${reportPath(root)} is out of date. Run pnpm report:producers.`)
    process.exit(1)
  }
  console.log('Producer conflict report is up to date.')
} else {
  console.log(`Wrote ${writeReport(root, content)}`)
  console.log(`${report.rows.length} classified songs, ${report.ignoredCount} without any producer credit.`)
}
