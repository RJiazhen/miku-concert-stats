import { describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import toursRaw from '../data/tours.json'
import { applyCatalogSql } from '../scripts/build-catalog.ts'
import { parseTours } from '../shared/tours.ts'

describe('tour registry', () => {
  it('assigns every catalog 演出 to exactly one tour and keeps the checked groupings', () => {
    const index = parseTours(toursRaw)
    const db = new Database(':memory:')
    try {
      applyCatalogSql(db)
      const performances = db.prepare('SELECT id, series_id FROM performances').all() as {
        id: number
        series_id: number
      }[]
      const assigned = performances.map((row) => index.byPerformanceId.get(row.id)?.id ?? null)
      expect(assigned.every((id) => id !== null)).toBe(true)
      expect(index.byPerformanceId.size).toBe(performances.length)
      for (const row of performances) {
        expect(index.byPerformanceId.get(row.id)?.seriesId).toBe(row.series_id)
      }
      const europe2026 = index.byId.get('miku-expo-2026-europe')
      expect(europe2026?.performanceIds).toEqual([12222, 12223, 12224, 12225, 12226, 12227, 12228, 12449])
      expect(index.byPerformanceId.get(1937)?.id).toBe('miku-expo-2014-los-angeles')
      expect(index.byPerformanceId.get(1938)?.id).toBe('miku-expo-2014-new-york')
      const tenth = index.byId.get('magical-mirai-10th-anniversary')
      expect(tenth?.performanceIds).toEqual([4233, 4234, 4235])
      expect(index.byPerformanceId.get(6045)?.id).toBe('magical-mirai-2023')
      expect(index.byId.get('japan-tour-2023-thunderbolt')?.performanceIds).toHaveLength(5)
      expect(index.byPerformanceId.get(12739)?.id).toBe('hatsune-miku-symphony-2026-2027')
      expect(index.byPerformanceId.get(12713)?.id).toBe('hatsune-miku-symphony-2026')
      expect(index.byPerformanceId.get(13209)?.id).toBe(index.byPerformanceId.get(13210)?.id)
    } finally {
      db.close()
    }
  })

  it('rejects a performance listed on two tours', () => {
    expect(() => parseTours({
      version: 1,
      checkedAt: '2026-11-24',
      tours: [
        { id: 'a', name: 'A', seriesId: 1, sourceUrl: null, performanceIds: [1] },
        { id: 'b', name: 'B', seriesId: 1, sourceUrl: null, performanceIds: [1] },
      ],
    })).toThrow('Performance 1 is in both a and b')
  })
})
