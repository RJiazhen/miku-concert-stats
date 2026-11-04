import { describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import { albumSongListId } from '../shared/album-setlists.ts'
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
      const rotation = catalog.setlistItems.find((row) => row.song_list_id === 17933 && row.listed_song_id === 42733)
      const saihate = catalog.setlistItems.find((row) => row.song_list_id === 17933 && row.listed_song_id === 459)
      expect(rotation?.notes).toBe('Fukuoka Day 1 / Tokyo Day 1 / Tokyo Day 3 / Osaka Day 2')
      expect(saihate?.notes).toBe('Osaka')
    } finally {
      db.close()
    }
  })

  it('fills the symphony performances from album tracklists and marks the source', () => {
    const db = new Database(':memory:')
    try {
      applyCatalogSql(db)
      const catalog = loadCatalog({
        /** Reads the in-memory catalog built from committed SQL. */
        all: (sql: string) => db.prepare(sql).all() as SqlRow[],
      })
      const albumList = catalog.songLists.find((row) => row.album_id === 30961)
      expect(albumList?.source).toBe('album')
      expect(albumList?.medium).toBe('bluray')
      expect(albumList?.source_url).toBe('https://vocadb.net/Al/30961')
      const tokyo2017 = catalog.performances.find((row) => row.id === 2959)
      expect(tokyo2017?.song_list_id).toBe(albumSongListId(30961))
      expect(catalog.setlistItems.filter((row) => row.song_list_id === albumSongListId(30961))).toHaveLength(15)
      expect(catalog.songLists.every((row) => row.source !== 'album' || row.album_id !== null)).toBe(true)
      // 2026 and 2027 have no released album, so those six performances stay without a setlist.
      const missing = catalog.performances.filter((row) => row.series_id === 256 && row.song_list_id === null)
      expect(missing.map((row) => row.id).sort((left, right) => left - right)).toEqual([12713, 12714, 12739, 12740, 13209, 13210])
    } finally {
      db.close()
    }
  })
})
