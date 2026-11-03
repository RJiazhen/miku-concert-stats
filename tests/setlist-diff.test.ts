import { describe, expect, it, beforeAll } from 'vitest'
import Database from 'better-sqlite3'
import { applyCatalogSql } from '../scripts/build-catalog.ts'
import { loadCatalog } from '../shared/catalog.ts'
import { parseSetlistMerges } from '../shared/edition-setlists.ts'
import { buildSetlistDiffReport, renderSetlistDiffCsv, renderSetlistDiffMarkdown, type SetlistDiffReport } from '../shared/setlist-diff.ts'
import mergesRaw from '../data/setlist-merges.json'
import type { Catalog, SqlRow } from '../shared/types.ts'

let catalog: Catalog
let report: SetlistDiffReport
const merges = parseSetlistMerges(mergesRaw)

beforeAll(() => {
  const db = new Database(':memory:')
  applyCatalogSql(db)
  catalog = loadCatalog({
    /** Reads the in-memory catalog built from committed SQL. */
    all: (sql: string) => db.prepare(sql).all() as SqlRow[],
  })
  report = buildSetlistDiffReport(catalog, merges)
  db.close()
})

/** Pair lookup by song list ids. */
const pair = (leftId: number, rightId: number) => {
  return report.editions.find((row) => row.leftId === leftId && row.rightId === rightId)
    ?? report.editions.find((row) => row.leftId === rightId && row.rightId === leftId)
}

describe('setlist difference report', () => {
  it('flags the Magical Mirai 2019 encore difference', () => {
    const found = pair(8101, 8102)
    expect(found).toBeDefined()
    expect(found?.severity).toBe('segment-differs')
    expect(found?.left.encoreCount).toBe(5)
    expect(found?.right.encoreCount).toBe(4)
    expect(found?.encoreDelta).toBe(-1)
    expect(found?.merged).toBe(true)
  })

  it('separates a different programme from a small difference', () => {
    expect(pair(12354, 13440)?.severity).toBe('probably-different-program')
    expect(pair(6570, 6571)?.severity).toBe('count-differs')
    expect(pair(16544, 18446)?.severity).toBe('segment-differs')
  })

  it('keeps deliberate non-merges visible for review', () => {
    expect(pair(7758, 7979)?.merged).toBe(false)
    expect(pair(12354, 13440)?.merged).toBe(false)
    expect(pair(8101, 8102)?.merged).toBe(true)
  })

  it('reports both same-edition and adjacent-edition pairs', () => {
    expect(report.pairCount).toBeGreaterThan(20)
    expect(report.adjacentEditions.length).toBeGreaterThan(10)
    const total = Object.values(report.summary).reduce((sum, count) => sum + count, 0)
    expect(total).toBe(report.pairCount + report.adjacentEditions.length)
  })

  it('renders a checkbox list and a CSV with the same rows', () => {
    const markdown = renderSetlistDiffMarkdown(catalog, report)
    expect(markdown).toContain('# 歌单差异核验报告')
    expect(markdown.split('\n').filter((line) => line.startsWith('- [ ] ')).length).toBe(report.pairCount)
    const csv = renderSetlistDiffCsv(catalog, report)
    expect(csv.split('\n')[0]).toContain('severity')
    expect(csv.trim().split('\n')).toHaveLength(report.pairCount + report.adjacentEditions.length + 1)
  })
})
