import { describe, expect, it } from 'vitest'
import { producersOfSong, songProducerSql } from '../scripts/vocadb/producers.ts'
import { localProducerMatches } from '../shared/lookup.ts'
import { buildProducerIndex, rankProducers } from '../shared/producers.ts'
import type {
  Catalog,
  MedleyRow,
  MedleySongRow,
  PerformanceRow,
  PerformanceShowSetlistItemRow,
  SeriesRow,
  SetlistItemRow,
  SetlistItemSongRow,
  SongProducerCredit,
  SongRow,
} from '../shared/types.ts'

describe('song producer collection', () => {
  it('keeps Producer credits and records the lower-cased evidence in source order', () => {
    expect(producersOfSong({
      id: 1,
      name: 'Song',
      artists: [
        { id: 38, name: '八王子P', categories: 'Producer', roles: 'Arranger, Composer' },
        { id: 51, name: 'sasakure.UK', categories: 'Producer, Animator', roles: 'Animator, Composer' },
      ],
    })).toEqual([
      { artistId: 38, name: '八王子P', roles: 'producer, arranger, composer' },
      { artistId: 51, name: 'sasakure.UK', roles: 'producer, composer' },
    ])
  })

  it('keeps a Composer / Arranger / VoiceManipulator credit without the Producer category', () => {
    expect(producersOfSong({
      id: 2,
      name: 'Song',
      artists: [
        { id: 7, name: 'Lyricist only', categories: 'Other', roles: 'Lyricist' },
        { id: 8, name: 'Someone', categories: 'Other', roles: 'Composer, Arranger' },
        { id: 9, name: 'Tuner', categories: 'Other', roles: 'VoiceManipulator' },
      ],
    })).toEqual([
      { artistId: 8, name: 'Someone', roles: 'composer, arranger' },
      { artistId: 9, name: 'Tuner', roles: 'voicemanipulator' },
    ])
  })

  it('drops every non-producer job and keeps VoiceManipulator tuning', () => {
    expect(producersOfSong({
      id: 6,
      name: 'Song',
      artists: [
        { id: 1, name: 'Google', categories: 'Publisher', roles: 'Publisher' },
        { id: 2, name: 'momo', categories: 'Illustrator', roles: 'Illustrator' },
        { id: 3, name: 'Animator', categories: 'Animator', roles: 'Animator' },
        { id: 4, name: 'Lyricist', categories: 'Other', roles: 'Lyricist' },
        { id: 5, name: 'Mixer', categories: 'Other', roles: 'Mixer' },
        { id: 6, name: 'Mastering', categories: 'Other', roles: 'Mastering' },
        { id: 7, name: 'Instrumentalist', categories: 'Instrumentalist', roles: 'Instrumentalist' },
        { id: 8, name: 'OTOIRO', categories: 'Circle', roles: 'Default' },
        { id: 9, name: 'Label', categories: 'Label', roles: 'Default' },
        { id: 10, name: 'Tuner', categories: 'Other', roles: 'VoiceManipulator' },
      ],
    })).toEqual([{ artistId: 10, name: 'Tuner', roles: 'voicemanipulator' }])
  })

  it('keeps a Producer-category credit whose role is only the inherited Default', () => {
    expect(producersOfSong({
      id: 5,
      name: 'Song',
      artists: [{ id: 89, name: 'kz', categories: 'Producer', roles: 'Default' }],
    })).toEqual([{ artistId: 89, name: 'kz', roles: 'producer' }])
  })

  it('drops VocaDB placeholders and credits without an artist id', () => {
    expect(producersOfSong({
      id: 3,
      name: 'Song',
      artists: [
        { id: 10, name: 'Unknown producer(s)', categories: 'Producer', roles: 'Composer' },
        { name: 'ryo', categories: 'Producer', roles: 'Composer' },
      ],
    })).toEqual([])
  })

  it('deduplicates by artist id and merges evidence across name variants', () => {
    expect(producersOfSong({
      id: 4,
      name: 'Song',
      artists: [
        { id: 38, name: '八王子P', categories: 'Producer', roles: 'Composer' },
        { id: 38, name: 'HachioujiP', categories: 'Producer', roles: 'Arranger' },
        { name: 'kz', categories: 'Producer', artist: { id: 89, name: 'kz' } },
      ],
    })).toEqual([
      { artistId: 38, name: '八王子P', roles: 'producer, composer, arranger' },
      { artistId: 89, name: 'kz', roles: 'producer' },
    ])
  })

  it('renders an additive INSERT OR IGNORE increment with a sourced header', () => {
    const sql = songProducerSql(
      [{ song_id: 680530, artist_id: 89, name: 'kz', roles: 'producer, composer' }],
      '2026-11-04T00:00:00.000Z',
    )
    expect(sql).toContain('-- Source: https://vocadb.net/api/songs/{id}?fields=Artists&lang=Default')
    expect(sql).toContain('-- Retrieved: 2026-11-04T00:00:00.000Z')
    expect(sql).toContain('https://wiki.vocadb.net/docs/license')
    expect(sql).toContain('BEGIN;')
    expect(sql).toContain(
      "INSERT OR IGNORE INTO song_producers (song_id, artist_id, name, roles) VALUES\n(680530, 89, 'kz', 'producer, composer');",
    )
    expect(sql).toContain('COMMIT;')
    // The derived table is replaced wholesale, but no catalog or setlist data may be touched.
    expect(sql).toContain('DELETE FROM song_producers;')
    expect(sql.replace('DELETE FROM song_producers;', '')).not.toContain('DELETE FROM')
    expect(songProducerSql([], '2026-11-04T00:00:00.000Z')).not.toContain('INTO song_producers')
  })
})

/** Minimal catalog overridden by each producer-index case. */
const producerCatalog = (): Catalog => ({
  sources: [],
  series: [producerSeries(1, 'マジカルミライ')],
  performances: [],
  performanceLinks: [],
  premieres: [],
  songLists: [],
  songs: [],
  setlistItems: [],
  setlistItemSongs: [],
  medleyQuarantine: [],
  videos: [],
  snapshots: [],
  milestones: [],
  formulas: [],
  performanceSetlists: [],
  performanceSetlistSources: [],
  performanceShowSetlists: [],
  performanceShowSetlistItems: [],
  medleys: [],
  medleySongs: [],
  performanceStatus: [],
})

/** Series row with the only fields the producer index reads. */
const producerSeries = (id: number, name: string): SeriesRow => ({
  id,
  name,
  name_ja: null,
  description: null,
  source_url: `https://vocadb.net/Es/${id}`,
  retrieved_at: '2026-11-06T00:00:00.000Z',
})

/** 演出 fixture; defaults are an in-person single-day show. */
const producerPerformance = (
  overrides: Partial<PerformanceRow> & Pick<PerformanceRow, 'id' | 'series_id' | 'song_list_id'>,
): PerformanceRow => ({
  name: `Show ${overrides.id}`,
  name_ja: null,
  venue_name: null,
  country_code: 'JP',
  start_date: '2020-01-01',
  end_date: null,
  showtime_local: null,
  timezone: null,
  time_precision: 'day',
  time_evidence: null,
  role: 'show',
  series_number: 2020,
  series_suffix: null,
  vocadb_status: 'Finished',
  source_url: `https://vocadb.net/E/${overrides.id}`,
  retrieved_at: '2026-11-06T00:00:00.000Z',
  ...overrides,
})

/** Song fixture with optional structured producer credits. */
const producerSong = (id: number, name: string, fields: Partial<SongRow> = {}): SongRow => ({
  id,
  name,
  name_ja: null,
  name_en: null,
  artist_string: null,
  song_type: 'Original',
  category: 'vocaloid',
  publish_date: null,
  length_seconds: null,
  source_url: `https://vocadb.net/S/${id}`,
  retrieved_at: '2026-11-06T00:00:00.000Z',
  ...fields,
})

/** One derived setlist item of a 场次. */
const derivedItem = (
  performanceId: number,
  showKey: string,
  songId: number | null,
  medleyId: number | null = null,
): PerformanceShowSetlistItemRow => ({
  performance_id: performanceId,
  show_key: showKey,
  position: 1,
  source_position: 1,
  song_id: songId,
  medley_id: medleyId,
  evidence: 'shared',
  notes: null,
})

describe('producer index', () => {
  it('aggregates structured credits and keeps free-text names without an artist id', () => {
    const rows = producerCatalog()
    rows.songs = [
      producerSong(1, 'Song A', {
        producers: [
          { artistId: 89, name: 'kz', roles: 'producer, composer' } satisfies SongProducerCredit,
        ],
      }),
      producerSong(2, 'Song B', {
        producers: [{ artistId: 89, name: 'kz', roles: 'producer' }],
      }),
      producerSong(3, 'Song C', {
        producers: [{ artistId: 89, name: 'kz', roles: 'arranger' }],
      }),
      producerSong(4, 'Free text', { artist_string: 'samfree feat. 初音ミク' }),
      producerSong(5, 'Unknown', { artist_string: 'Unknown producer(s) feat. 初音ミク' }),
    ]
    rows.performances = [
      producerPerformance({ id: 1, series_id: 1, song_list_id: 100, start_date: '2020-01-01' }),
      producerPerformance({ id: 2, series_id: 1, song_list_id: 101, start_date: '2022-02-02' }),
      producerPerformance({ id: 3, series_id: 1, song_list_id: 102, start_date: '2023-03-03', role: 'broadcast' }),
      // A wiki-only 演出 has no upstream song list but its derived rows are a recorded setlist.
      producerPerformance({ id: 4, series_id: 1, song_list_id: null, start_date: '2024-04-04' }),
    ]
    rows.performanceShowSetlistItems = [
      derivedItem(1, '1:2020-01-01', 1),
      derivedItem(1, '1:2020-01-01', 2),
      derivedItem(1, '1:2020-01-01', 3),
      derivedItem(2, '2:2022-02-02', 1),
      derivedItem(3, '3:2023-03-03', 1),
      derivedItem(4, '4:2024-04-04', 1),
    ]

    const index = buildProducerIndex(rows)
    const kz = index.byName.get('kz')
    expect(kz).toMatchObject({
      artistId: 89,
      songCount: 3,
      performedSongCount: 3,
      appearanceCount: 5,
      performanceCount: 3,
      showCount: 3,
      firstYear: 2020,
      lastYear: 2024,
    })
    expect(kz?.roles).toEqual({ producer: 2, composer: 1, arranger: 1, voicemanipulator: 0 })
    expect(kz?.topSongIds).toEqual([1, 2, 3])

    const samfree = index.byName.get('samfree')
    expect(samfree).toMatchObject({
      artistId: null,
      songCount: 1,
      performedSongCount: 0,
      appearanceCount: 0,
      performanceCount: 0,
      showCount: 0,
      firstYear: null,
      lastYear: null,
    })
    expect(samfree?.roles).toEqual({ producer: 1, composer: 0, arranger: 0, voicemanipulator: 0 })
    // A placeholder-only credit never becomes a producer.
    expect(index.byName.has('Unknown producer(s)')).toBe(false)
    expect(index.rows).toHaveLength(2)
  })

  it('counts variants separately and keeps 曲目数 above the performed count', () => {
    const rows = producerCatalog()
    rows.songs = [
      producerSong(1, 'Original', { producers: [{ artistId: 89, name: 'kz', roles: 'producer' }] }),
      producerSong(2, 'Remix', { producers: [{ artistId: 89, name: 'kz', roles: 'producer' }] }),
      producerSong(3, 'Never played', { producers: [{ artistId: 89, name: 'kz', roles: 'producer' }] }),
    ]
    rows.performances = [producerPerformance({ id: 1, series_id: 1, song_list_id: 100 })]
    rows.performanceShowSetlistItems = [
      derivedItem(1, '1:2020-01-01', 1),
      derivedItem(1, '1:2020-01-01', 2),
    ]

    const kz = buildProducerIndex(rows).byName.get('kz')
    expect(kz).toMatchObject({
      songCount: 3,
      performedSongCount: 2,
      appearanceCount: 2,
      performanceCount: 1,
      showCount: 1,
    })
  })

  it('expands a medley to its parts when counting appearances', () => {
    const rows = producerCatalog()
    rows.songs = [
      producerSong(100, 'Part 1', { producers: [{ artistId: 7, name: 'medleyP', roles: 'producer' }] }),
      producerSong(200, 'Part 2', { producers: [{ artistId: 7, name: 'medleyP', roles: 'producer' }] }),
    ]
    rows.performances = [producerPerformance({ id: 1, series_id: 1, song_list_id: 100 })]
    rows.performanceShowSetlistItems = [derivedItem(1, '1:2020-01-01', null, 7)]
    rows.medleys = [{ id: 7, name: 'Medley', note: null, source_url: 'https://vocadb.net/S/1' } satisfies MedleyRow]
    rows.medleySongs = [
      { medley_id: 7, position: 1, song_id: 100 } satisfies MedleySongRow,
      { medley_id: 7, position: 2, song_id: 200 } satisfies MedleySongRow,
    ]

    expect(buildProducerIndex(rows).byName.get('medleyP')).toMatchObject({
      songCount: 2,
      performedSongCount: 2,
      appearanceCount: 2,
      performanceCount: 1,
      showCount: 1,
    })
  })

  it('falls back to the source setlist and note parser when the derived layer is missing', () => {
    const rows = producerCatalog()
    rows.songs = [
      producerSong(1, 'Fallback', { producers: [{ artistId: 5, name: 'fallbackP', roles: 'producer' }] }),
    ]
    rows.performances = [
      producerPerformance({ id: 1, series_id: 1, song_list_id: 100, start_date: '2018-05-05' }),
      producerPerformance({ id: 2, series_id: 1, song_list_id: 100, start_date: '2018-05-06', role: 'broadcast' }),
    ]
    rows.setlistItems = [{ song_list_id: 100, position: 1, listed_song_id: 1, notes: null } satisfies SetlistItemRow]
    rows.setlistItemSongs = [
      { song_list_id: 100, position: 1, song_id: 1, role: 'listed' } satisfies SetlistItemSongRow,
    ]

    expect(buildProducerIndex(rows).byName.get('fallbackP')).toMatchObject({
      songCount: 1,
      performedSongCount: 1,
      appearanceCount: 1,
      performanceCount: 1,
      showCount: 1,
      firstYear: 2018,
      lastYear: 2018,
    })
  })

  it('sorts by either counting rule and keeps missing years last', () => {
    const rows = producerCatalog()
    rows.songs = [
      producerSong(1, 'A1', { producers: [{ artistId: 1, name: 'A', roles: 'producer' }] }),
      producerSong(2, 'B1', { producers: [{ artistId: 2, name: 'B', roles: 'producer' }] }),
      producerSong(3, 'B2', { producers: [{ artistId: 2, name: 'B', roles: 'producer' }] }),
    ]
    rows.performances = [producerPerformance({ id: 1, series_id: 1, song_list_id: 100, start_date: '2020-01-01' })]
    rows.performanceShowSetlistItems = [derivedItem(1, '1:2020-01-01', 1)]

    const index = buildProducerIndex(rows)
    expect(rankProducers(index.rows, 'songCount').map((row) => row.name)).toEqual(['B', 'A'])
    expect(rankProducers(index.rows, 'appearanceCount').map((row) => row.name)).toEqual(['A', 'B'])
    expect(rankProducers(index.rows, 'firstYear', 'asc').map((row) => row.name)).toEqual(['A', 'B'])
  })
})

describe('producer lookup', () => {
  it('matches names case-insensitively and caps the result at five', () => {
    const rows = producerCatalog()
    rows.songs = Array.from({ length: 6 }, (_, index) =>
      producerSong(index + 1, `Song ${index + 1}`, {
        artist_string: `P${index + 1} feat. 初音ミク`,
      }),
    )
    const index = buildProducerIndex(rows)
    expect(index.rows).toHaveLength(6)

    expect(localProducerMatches(rows, 'p')).toHaveLength(5)
    expect(localProducerMatches(rows, 'P6').map((hit) => hit.name)).toEqual(['P6'])
    expect(localProducerMatches(rows, '  p6  ').map((hit) => hit.songCount)).toEqual([1])
    expect(localProducerMatches(rows, 'nothing')).toEqual([])
    expect(localProducerMatches(rows, '   ')).toEqual([])
  })

  it('keeps the ranking order and reports the roles of a hit', () => {
    const rows = producerCatalog()
    rows.songs = [
      producerSong(1, 'One', { producers: [{ artistId: 1, name: 'kz', roles: 'producer, composer' }] }),
      producerSong(2, 'Two', { producers: [{ artistId: 1, name: 'kz', roles: 'producer' }] }),
      producerSong(3, 'Three', { artist_string: 'KZ feat. 初音ミク' }),
    ]
    expect(localProducerMatches(rows, 'KZ')[0]).toEqual({
      name: 'kz',
      roles: ['producer', 'composer'],
      songCount: 2,
    })
  })
})
