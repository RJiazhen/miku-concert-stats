import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import { applyCatalogSql, repoRoot } from './build-catalog.ts'
import { loadCatalog } from '../shared/catalog.ts'
import { buildSetlistReview, renderSetlistReview } from '../shared/setlist-review.ts'
import type { SqlRow } from '../shared/types.ts'

const REPORT_DIR = path.join('docs', 'reports')
const MARKDOWN_FILE = 'setlist-review.md'

/** Builds the catalog from the committed SQL so the checklist matches what the site shows. */
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

/** Path of the committed checklist. */
const reportPath = (root: string): string => path.join(root, REPORT_DIR, MARKDOWN_FILE)

/** Section headings that must be present for the checklist to be usable. */
const REQUIRED_SECTIONS = ['## 总览', '## A.', '## B.', '## C.', '## D.', '## E.', '## F.', '**补充说明**']

/**
 * Checks the committed file still has every section and keeps checkboxes on their own lines.
 * The tick state is deliberately not checked: it belongs to whoever is reviewing.
 */
const validateExisting = (content: string): string[] => {
  const problems: string[] = []
  for (const heading of REQUIRED_SECTIONS) {
    if (!content.includes(heading)) problems.push(`missing ${heading}`)
  }
  for (const line of content.split('\n')) {
    if (!line.includes('[ ]')) continue
    if (!line.trimStart().startsWith('- [ ]')) problems.push(`checkbox not on its own list line: ${line.slice(0, 40)}`)
  }
  return problems
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === import.meta.filename
if (isDirectRun) {
  const root = repoRoot()
  const target = reportPath(root)
  const force = process.argv.includes('--force')
  const check = process.argv.includes('--check')
  if (check) {
    if (!existsSync(target)) {
      console.error(`${MARKDOWN_FILE} is missing. Run pnpm report:setlist-review.`)
      process.exit(1)
    }
    const problems = validateExisting(readFileSync(target, 'utf8'))
    if (problems.length > 0) {
      for (const problem of problems) console.error(problem)
      process.exit(1)
    }
    console.log('Setlist review checklist is well formed.')
  } else {
    // A reviewer may have ticked boxes, so an existing file is kept unless --force is passed.
    if (existsSync(target) && !force) {
      console.log(`${target} exists; keeping the reviewed copy. Use --force to regenerate.`)
    } else {
      const review = buildSetlistReview(readCatalog(root))
      mkdirSync(path.dirname(target), { recursive: true })
      writeFileSync(target, renderSetlistReview(review))
      console.log(`Wrote ${target}`)
      console.log(JSON.stringify(review.summary))
    }
  }
}
