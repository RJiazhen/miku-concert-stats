import { describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import { albumSongListId } from '../shared/album-setlists.ts'
import { loadCatalog } from '../shared/catalog.ts'
import { producerCredit } from '../shared/credit.ts'
import { producerNamesFor } from '../shared/producer-options.ts'
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

  it('loads the structured producers of a known song and defaults to an empty list', () => {
    const db = new Database(':memory:')
    try {
      applyCatalogSql(db)
      const catalog = loadCatalog({
        /** Reads the in-memory catalog built from committed SQL. */
        all: (sql: string) => db.prepare(sql).all() as SqlRow[],
      })
      const handInHand = catalog.songs.find((song) => song.id === 680530)
      expect(handInHand?.producers).toContainEqual({ artistId: 89, name: 'kz', roles: 'producer, composer' })
      expect(catalog.songs.every((song) => Array.isArray(song.producers))).toBe(true)
      expect(catalog.songs.some((song) => song.producers?.length === 0)).toBe(true)
    } finally {
      db.close()
    }
  })

  it('shows structured producers first and keeps the free-text fallback for uncovered songs', () => {
    const db = new Database(':memory:')
    try {
      applyCatalogSql(db)
      const catalog = loadCatalog({
        /** Reads the in-memory catalog built from committed SQL. */
        all: (sql: string) => db.prepare(sql).all() as SqlRow[],
      })
      const tellYourWorld = catalog.songs.find((song) => song.id === 399060)
      if (!tellYourWorld) throw new Error('Missing song 399060')
      // The free text credits `Google`, which VocaDB marks as Publisher, so it must not be shown.
      expect(producerCredit(tellYourWorld.artist_string)).toBe('kz, Google')
      expect(producerNamesFor(tellYourWorld)).toEqual(['kz'])

      const anamanaguchi = catalog.songs.find((song) => song.id === 115016)
      if (!anamanaguchi) throw new Error('Missing song 115016')
      expect(anamanaguchi.producers).toEqual([])
      expect(producerNamesFor(anamanaguchi)).toEqual(['Anamanaguchi'])
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

  it('derives one setlist per 場次 instead of storing the whole shared list', () => {
    const db = new Database(':memory:')
    try {
      applyCatalogSql(db)
      const catalog = loadCatalog({
        /** Reads the in-memory catalog built from committed SQL. */
        all: (sql: string) => db.prepare(sql).all() as SqlRow[],
      })
      // Every performance with a source list gained a derived 演出 row.
      const withList = catalog.performances.filter((row) => row.song_list_id !== null)
      expect(catalog.performanceSetlists).toHaveLength(withList.length)
      // 2023 Osaka carried 39 source rows, but no single show played more than 24.
      const osaka = catalog.performanceShowSetlists.filter((row) => row.performance_id === 6045)
      expect(osaka).toHaveLength(6)
      expect(osaka.every((row) => row.item_count === 24)).toBe(true)
      // The 2019 Shanghai stop is 25 songs per show; the four Chengdu/Guangzhou lines are dropped,
      // and the official schedule splits each of the two days into a day and a night show.
      const shanghai = catalog.performanceShowSetlists.filter((row) => row.performance_id === 3752)
      expect(shanghai).toHaveLength(4)
      expect(shanghai.every((row) => row.item_count === 25 && row.omitted_count === 4)).toBe(true)
      const shanghaiSongs = catalog.performanceShowSetlistItems
        .filter((row) => row.show_key === '3752:2019-11-02:day')
        .map((row) => row.song_id)
      expect(shanghaiSongs).toContain(1501)
      expect(shanghaiSongs).not.toContain(1500)
      // 2019 Osaka had an exhibition-only day; the curated schedule must drop it.
      const osaka2019 = catalog.performanceShowSetlists.filter((row) => row.performance_id === 2515)
      expect(osaka2019).toHaveLength(4)
      expect(osaka2019.some((row) => row.show_key.includes('2019-08-09'))).toBe(false)
      // A list without any note is inherited whole, and says so.
      const seattle = catalog.performanceSetlists.find((row) => row.performance_id === 1859)
      expect(seattle?.status).toBe('inherited')
      expect(seattle?.resolution).toBe('vocadb-shared')
      expect(seattle?.source_list_id).toBe(6571)
      // Album fallbacks are declared as such and never claim an outside source.
      const symphony = catalog.performanceSetlists.find((row) => row.performance_id === 2959)
      expect(symphony?.source_kind).toBe('album')
      expect(symphony?.pending_review).toBe(0)
      expect(catalog.performanceSetlistSources.length).toBeGreaterThan(0)
      // Every cited source records the day it was read and a confidence level.
      expect(
        catalog.performanceSetlistSources.every(
          (row) => /^https?:\/\//.test(row.url) && /^\d{4}-\d{2}-\d{2}$/.test(row.accessed_at),
        ),
      ).toBe(true)
      // Medleys stay empty until a source line splits into verifiable songs.
      expect(catalog.medleys).toHaveLength(0)
      expect(catalog.medleySongs).toHaveLength(0)
    } finally {
      db.close()
    }
  })
})
