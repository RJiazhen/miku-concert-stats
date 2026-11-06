import { describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import { albumSongListId } from '../shared/album-setlists.ts'
import { loadCatalog } from '../shared/catalog.ts'
import { producerCredit } from '../shared/credit.ts'
import { producerNamesFor } from '../shared/producer-options.ts'
import type { SqlRow } from '../shared/types.ts'
import { applyCatalogSql } from '../scripts/build-catalog.ts'

describe('committed catalog', () => {
  it('registers the non-VOCALOID repertoire so a 場次 shows its full programme', () => {
    const db = new Database(':memory:')
    try {
      applyCatalogSql(db)
      const catalog = loadCatalog({
        /** Reads the in-memory catalog built from committed SQL. */
        all: (sql: string) => db.prepare(sql).all() as SqlRow[],
      })
      const outside = catalog.songs.filter((song) => song.category !== 'vocaloid')
      expect(outside.length).toBeGreaterThan(0)
      // A classical piece: no vocalist, no producer credit, and the wiki is the source.
      const ninth = catalog.songs.find((song) => song.name === '交響曲第9番')
      expect(ninth?.category).toBe('classical')
      expect(ninth?.artist_string).toBe('ベートーヴェン')
      expect(ninth?.vocalists).toEqual([])
      expect(ninth?.source_url.startsWith('https://w.atwiki.jp/hmiku/')).toBe(true)
      // The Kodo 2023 programme keeps its instrumental and folk pieces per 場次.
      const kodo = catalog.performanceShowSetlistItems.filter((row) => row.performance_id === 5910)
      const kodoSongIds = new Set(kodo.map((row) => row.song_id))
      const kodoOutside = outside.filter((song) => kodoSongIds.has(song.id))
      expect(kodoOutside.length).toBeGreaterThan(0)
      expect(kodoOutside.every((song) => song.category === 'instrumental')).toBe(true)
      const firstShow = kodo.filter((row) => row.show_key === '5910:2023-06-03:day')
      expect(firstShow.length).toBeGreaterThan(19)
      // A VOCALOID song VocaDB only lists as covers is registered too, still marked `vocaloid`.
      const fukkireta = catalog.songs.find((song) => song.name === 'おちゃめ機能')
      expect(fukkireta?.category).toBe('vocaloid')
      expect(fukkireta?.id).toBeGreaterThan(1_000_000_000)
      expect(fukkireta?.vocalists).toEqual([])
    } finally {
      db.close()
    }
  })

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
      // Every performance with a source list gained a derived 演出 row, plus the 2026/2027 stops
      // whose setlist comes from the Miku wiki because VocaDB has none.
      const withList = catalog.performances.filter((row) => row.song_list_id !== null)
      const wikiOnly = catalog.performanceSetlists.filter((row) => row.source_list_id === null)
      expect(catalog.performanceSetlists).toHaveLength(withList.length + wikiOnly.length)
      expect(wikiOnly.map((row) => row.performance_id)).toEqual([12713, 12714, 12739, 13120])
      expect(wikiOnly.every((row) => row.source_kind === 'wiki')).toBe(true)
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
      // A shared list with no notes of its own is replaced by the wiki's per-city table.
      const seattle = catalog.performanceSetlists.find((row) => row.performance_id === 1859)
      expect(seattle?.status).toBe('complete')
      expect(seattle?.source_list_id).toBe(6571)
      const seattleItems = catalog.performanceShowSetlistItems.filter((row) => row.performance_id === 1859)
      expect(seattleItems.every((row) => row.evidence === 'wiki')).toBe(true)
      // Seattle is the one stop that skipped Miku (Anamanaguchi), so its list is shorter.
      const houston = catalog.performanceShowSetlistItems.filter((row) => row.performance_id === 1933)
      expect(houston.length).toBe(seattleItems.length + 1)
      // A wiki table that splits a day into day and night keeps them apart.
      const taipeiDay = catalog.performanceShowSetlistItems
        .filter((row) => row.show_key === '1941:2016-06-26:day')
        .map((row) => row.song_id)
      const taipeiNight = catalog.performanceShowSetlistItems
        .filter((row) => row.show_key === '1941:2016-06-26:night')
        .map((row) => row.song_id)
      expect(taipeiDay).not.toEqual(taipeiNight)
      // Album fallbacks are gone: every symphony stop now has a per-city wiki list.
      const symphony = catalog.performanceSetlists.find((row) => row.performance_id === 2959)
      expect(symphony?.source_kind).toBe('wiki')
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
