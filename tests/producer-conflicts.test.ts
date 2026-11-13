import { beforeAll, describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import { applyCatalogSql } from '../scripts/build-catalog.ts'
import { loadCatalog } from '../shared/catalog.ts'
import { buildProducerConflictReport, renderProducerConflictMarkdown } from '../shared/producer-conflicts.ts'
import type { Catalog, SongProducerCredit, SongRow, SqlRow } from '../shared/types.ts'

/** Builds a SongRow with only the fields the conflict classifier reads. */
const song = (id: number, overrides: Partial<SongRow> = {}): SongRow => ({
  id,
  name: `Song ${id}`,
  name_ja: null,
  name_en: null,
  artist_string: null,
  song_type: 'Original',
  category: 'vocaloid',
  publish_date: null,
  length_seconds: null,
  source_url: `https://vocadb.net/S/${id}`,
  retrieved_at: '2026-01-01T00:00:00.000Z',
  producers: [],
  ...overrides,
})

/** Builds one structured credit with explicit evidence. */
const credit = (name: string, roles = 'producer'): SongProducerCredit => ({ artistId: 1, name, roles })

/** Builds a report from synthetic songs only. */
const reportFor = (songs: SongRow[]) => buildProducerConflictReport({ songs })

let catalog: Catalog

beforeAll(() => {
  const db = new Database(':memory:')
  applyCatalogSql(db)
  catalog = loadCatalog({
    /** Reads the in-memory catalog built from committed SQL. */
    all: (sql: string) => db.prepare(sql).all() as SqlRow[],
  })
  db.close()
})

describe('producer conflict classification', () => {
  it('classifies structured-only songs without a free-text credit', () => {
    const report = reportFor([song(1, { producers: [credit('kz', 'producer, composer')] })])
    expect(report.rows).toHaveLength(1)
    expect(report.rows[0]?.category).toBe('structured-only')
    expect(report.rows[0]?.text).toEqual([])
    expect(report.rows[0]?.onlyInStructured).toEqual(['kz'])
  })

  it('reports a Publisher token as extra text the structured roster lacks', () => {
    const report = reportFor([
      song(2, { producers: [credit('kz', 'producer, composer')], artist_string: 'kz, Google feat. 初音ミク' }),
    ])
    expect(report.rows[0]?.category).toBe('extra-in-text')
    expect(report.rows[0]?.onlyInText).toEqual(['Google'])
    expect(report.rows[0]?.onlyInStructured).toEqual([])
  })

  it('reports structured names the free text omits as extra-in-structured', () => {
    const report = reportFor([
      song(3, { producers: [credit('kz'), credit('wowaka')], artist_string: 'kz feat. 初音ミク' }),
    ])
    expect(report.rows[0]?.category).toBe('extra-in-structured')
    expect(report.rows[0]?.onlyInStructured).toEqual(['wowaka'])
    expect(report.rows[0]?.onlyInText).toEqual([])
  })

  it('reports songs where both sides name someone the other lacks as conflicting', () => {
    const report = reportFor([song(4, { producers: [credit('kz')], artist_string: 'wowaka feat. 初音ミク' })])
    expect(report.rows[0]?.category).toBe('conflicting')
    expect(report.rows[0]?.onlyInText).toEqual(['wowaka'])
    expect(report.rows[0]?.onlyInStructured).toEqual(['kz'])
  })

  it('treats identical name sets as agree', () => {
    const report = reportFor([song(5, { producers: [credit('kz')], artist_string: 'kz feat. 初音ミク' })])
    expect(report.rows[0]?.category).toBe('agree')
    expect(report.rows[0]?.onlyInText).toEqual([])
    expect(report.rows[0]?.onlyInStructured).toEqual([])
  })

  it('falls back to free text only when the song entry records no producer', () => {
    const report = reportFor([song(6, { artist_string: 'Anamanaguchi feat. 初音ミク' })])
    expect(report.rows[0]?.category).toBe('extra-in-text')
    expect(report.rows[0]?.structured).toEqual([])
    expect(report.rows[0]?.text).toEqual(['Anamanaguchi'])
    expect(renderProducerConflictMarkdown(report)).toContain('按规则 ② 用自由文本作为回退')
  })

  it('ignores songs where neither side names a producer', () => {
    const report = reportFor([
      song(7),
      song(8, { artist_string: 'Unknown producer(s) feat. various' }),
      song(9, { producers: [credit('Unknown producer(s)')] }),
    ])
    expect(report.rows).toHaveLength(0)
    expect(report.ignoredCount).toBe(3)
    expect(report.counts).toEqual({
      conflicting: 0,
      'extra-in-text': 0,
      'extra-in-structured': 0,
      'structured-only': 0,
      agree: 0,
    })
  })

  it('drops the Unknown producer(s) placeholder instead of reporting a conflict', () => {
    const report = reportFor([
      song(10, { producers: [credit('kz')], artist_string: 'kz, Unknown producer(s) feat. various' }),
    ])
    expect(report.rows[0]?.category).toBe('agree')
    expect(report.rows[0]?.text).toEqual(['kz'])
  })
})

describe('producer conflict report shape', () => {
  const songs = [
    song(30, { producers: [credit('kz')], artist_string: 'kz feat. 初音ミク' }),
    song(20, { producers: [credit('kz')], artist_string: 'wowaka feat. 初音ミク' }),
    song(10, { producers: [credit('kz')], artist_string: 'kz, Google feat. 初音ミク' }),
    song(40, { producers: [credit('kz'), credit('wowaka')], artist_string: 'kz feat. 初音ミク' }),
    song(50, { producers: [credit('kz')] }),
    song(60),
  ]

  it('sorts by conflict severity first and then by song id', () => {
    const report = reportFor(songs)
    expect(report.rows.map((row) => row.songId)).toEqual([20, 10, 40, 50, 30])
    expect(report.rows.map((row) => row.category)).toEqual([
      'conflicting',
      'extra-in-text',
      'extra-in-structured',
      'structured-only',
      'agree',
    ])
  })

  it('counts each category and keeps the ignored songs out of the counts', () => {
    const report = reportFor(songs)
    expect(report.counts).toEqual({
      conflicting: 1,
      'extra-in-text': 1,
      'extra-in-structured': 1,
      'structured-only': 1,
      agree: 1,
    })
    expect(report.ignoredCount).toBe(1)
    expect(Object.values(report.counts).reduce((sum, count) => sum + count, 0) + report.ignoredCount).toBe(songs.length)
  })
})

describe('committed catalog producer conflicts', () => {
  it('keeps Tell Your World out of agree and names Google as extra free text', () => {
    const report = buildProducerConflictReport(catalog)
    const tellYourWorld = report.rows.find((row) => row.songId === 399060)
    expect(tellYourWorld).toBeDefined()
    expect(tellYourWorld?.name).toBe('Tell Your World')
    expect(tellYourWorld?.category).not.toBe('agree')
    expect(tellYourWorld?.category).toBe('extra-in-text')
    expect(tellYourWorld?.onlyInText).toContain('Google')
    expect(tellYourWorld?.structured.map((entry) => entry.name)).toEqual(['kz'])
    expect(Object.values(report.counts).reduce((sum, count) => sum + count, 0) + report.ignoredCount).toBe(
      catalog.songs.length,
    )
  })
})
