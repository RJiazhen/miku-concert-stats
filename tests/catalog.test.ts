import { describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import { loadCatalog } from '../shared/catalog.ts'
import type { SqlRow } from '../shared/types.ts'
import { applyCatalogSql } from '../scripts/build-catalog.ts'

describe('committed catalog', () => {
  it('records the 2014 Magical Mirai premiere as Osaka and stores no guessed playback', () => {
    const db = new Database(':memory:')
    try {
      applyCatalogSql(db)
      const catalog = loadCatalog({
        /** Reads the in-memory catalog built from committed SQL. */
        all: (sql: string) => db.prepare(sql).all() as SqlRow[],
      })
      const premiere = catalog.premieres.find((row) => row.series_id === 81 && row.series_number === 2014)
      expect(premiere?.premiere_date).toBe('2014-08-30')
      const performance = catalog.performances.find((row) => row.id === premiere?.premiere_performance_id)
      expect(performance?.name).toContain('OSAKA')
      expect(performance?.start_date).toBe('2014-08-30')
      const tokyo = catalog.performances.find((row) => row.id === 2518)
      expect(tokyo?.start_date).toBe('2014-09-20')
      expect(tokyo?.id).not.toBe(premiere?.premiere_performance_id)
      expect(catalog.snapshots).toHaveLength(0)
      expect(catalog.milestones).toHaveLength(0)
      expect(catalog.formulas[0]?.status).toBe('unpublished')
      expect(catalog.formulas[0]?.formula_json).toBeNull()
      expect(catalog.sources[0]?.url).toBe('https://vocadb.net/')
      expect(catalog.songLists.every((list) => list.announced_at === null)).toBe(true)
    } finally {
      db.close()
    }
  })
})
