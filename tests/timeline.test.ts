import { describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import { loadCatalog } from '../shared/catalog.ts'
import { parseCharacterConfig, type CharacterRule } from '../shared/characters.ts'
import { buildSeriesOverview } from '../shared/overview.ts'
import { showCountsByPerformance } from '../shared/performance-setlists.ts'
import { reviewRotations } from '../shared/rotation.ts'
import { parseSongVariants } from '../shared/song-variants.ts'
import { performanceYear } from '../shared/stats.ts'
import { buildTimeline, type TimelineOptions } from '../shared/timeline.ts'
import type {
  Catalog,
  PerformanceRow,
  PerformanceShowSetlistItemRow,
  PerformanceShowSetlistRow,
  SeriesRow,
  SongRow,
  SqlRow,
} from '../shared/types.ts'
import { applyCatalogSql } from '../scripts/build-catalog.ts'

/** Small catalog every fixture starts from. */
const emptyCatalog = (): Catalog => ({
  sources: [],
  series: [series(81, 'マジカルミライ'), series(82, 'MIKU EXPO')],
  performances: [],
  performanceLinks: [],
  premieres: [],
  songLists: [],
  songs: [],
  setlistItems: [],
  setlistItemSongs: [],
  medleyQuarantine: [],
  videos: [],
  performanceSetlists: [],
  performanceSetlistSources: [],
  performanceShowSetlists: [],
  performanceShowSetlistItems: [],
  medleys: [],
  medleySongs: [],
  performanceStatus: [],
})

/** Series row with the fields the timeline reads. */
const series = (id: number, name: string): SeriesRow => ({
  id,
  name,
  name_ja: null,
  description: null,
  source_url: `https://vocadb.net/Es/${id}`,
  retrieved_at: '2026-10-12T00:00:00.000Z',
})

/** 演出 fixture; the missing start date makes the row undated. */
const performance = (overrides: Partial<PerformanceRow> & Pick<PerformanceRow, 'id' | 'series_id'>): PerformanceRow => ({
  name: `Show ${overrides.id}`,
  name_ja: null,
  venue_name: null,
  country_code: 'JP',
  start_date: null,
  end_date: null,
  showtime_local: null,
  timezone: null,
  time_precision: 'day',
  time_evidence: null,
  role: 'show',
  series_number: null,
  series_suffix: null,
  song_list_id: null,
  vocadb_status: 'Finished',
  source_url: `https://vocadb.net/E/${overrides.id}`,
  retrieved_at: '2026-10-12T00:00:00.000Z',
  ...overrides,
})

/** Song fixture with optional vocalists for character assignment. */
const song = (id: number, name: string, vocalists: string[] = []): SongRow => ({
  id,
  name,
  name_ja: null,
  name_en: null,
  artist_string: null,
  song_type: 'Original',
  category: 'vocaloid',
  publish_date: null,
  length_seconds: null,
  vocalists,
  producers: [],
  source_url: `https://vocadb.net/S/${id}`,
  retrieved_at: '2026-10-12T00:00:00.000Z',
})

/** Derived 場次 row of one 演出. */
const showRow = (
  performanceId: number,
  key: string,
  date: string,
  half: 'day' | 'night' | null,
): PerformanceShowSetlistRow => ({
  performance_id: performanceId,
  show_key: key,
  date,
  half,
  item_count: 1,
  omitted_count: 0,
  uncertain: 0,
  reasons: '[]',
})

/** One derived setlist line of a 場次. */
const showItem = (performanceId: number, key: string, position: number, songId: number): PerformanceShowSetlistItemRow => ({
  performance_id: performanceId,
  show_key: key,
  position,
  source_position: position,
  song_id: songId,
  medley_id: null,
  evidence: 'note',
  notes: null,
})

/** Character rules used by the character-count fixtures. */
const characterRules = (): CharacterRule[] => parseCharacterConfig({
  '初音ミク': { aliases: ['初音ミク'] },
  '鏡音リン': { aliases: ['鏡音リン'] },
  '巡音ルカ': { aliases: ['巡音ルカ'] },
}) as CharacterRule[]

/** Distinct-song count of one bucket and year, behind the stacked bars of the character chart. */
const characterSongCount = (catalog: Catalog, year: number, name: string, options: TimelineOptions = {}): number => {
  const timeline = buildTimeline(catalog, { characterRules: characterRules(), ...options })
  return timeline.characterSongByYear.find((row) => row.year === year && row.name === name)?.count ?? 0
}

/** Fixture with a split day, an ordinary split year, a gap year, and an undated 演出. */
const yearlyCatalog = (): Catalog => {
  const current = emptyCatalog()
  current.performances = [
    performance({ id: 1, series_id: 81, start_date: '2020-11-28', end_date: '2020-11-30', song_list_id: 501 }),
    performance({ id: 2, series_id: 81, start_date: '2021-08-01', song_list_id: 502 }),
    performance({ id: 3, series_id: 81, start_date: '2023-03-03', song_list_id: 503 }),
    performance({ id: 4, series_id: 81, song_list_id: 504 }),
  ]
  // 2020-11-28 had a day and a night show, 2020-11-29 one show, and 2020-11-30 no live show.
  current.performanceShowSetlists = [
    showRow(1, '1:2020-11-28:day', '2020-11-28', 'day'),
    showRow(1, '1:2020-11-28:night', '2020-11-28', 'night'),
    showRow(1, '1:2020-11-29', '2020-11-29', null),
    showRow(2, '2:2021-08-01:day', '2021-08-01', 'day'),
    showRow(2, '2:2021-08-01:night', '2021-08-01', 'night'),
    showRow(3, '3:2023-03-03', '2023-03-03', null),
  ]
  current.songs = [
    song(100, 'Song 100', ['初音ミク']),
    song(101, 'Song 101', ['鏡音リン']),
    song(102, 'Song 102', ['謎の声']),
  ]
  current.performanceShowSetlistItems = [
    showItem(1, '1:2020-11-28:day', 1, 100),
    showItem(1, '1:2020-11-28:day', 2, 101),
    showItem(1, '1:2020-11-28:night', 1, 100),
    showItem(1, '1:2020-11-29', 1, 100),
    showItem(2, '2:2021-08-01:day', 1, 101),
    showItem(2, '2:2021-08-01:night', 1, 101),
    showItem(3, '3:2023-03-03', 1, 102),
  ]
  return current
}

describe('timeline yearly totals', () => {
  it('keeps an unbroken year axis, counts day/night halves, drops curated no-show days, and excludes undated 演出', () => {
    const timeline = buildTimeline(yearlyCatalog())

    expect(timeline.years).toEqual([2020, 2021, 2022, 2023])
    expect(timeline.byYear.map((row) => row.shows)).toEqual([3, 2, 0, 1])
    expect(timeline.byYear.map((row) => row.performances)).toEqual([1, 1, 0, 1])
    expect(timeline.totals).toEqual({ shows: 6, performances: 3 })
    expect(timeline.excludedUndated).toBe(1)
    expect(timeline.byYear.reduce((sum, row) => sum + row.performances, 0)).toBe(timeline.totals.performances)
  })

  it('clips the axis to the selected years and reports the rows outside it', () => {
    const timeline = buildTimeline(yearlyCatalog(), { yearFrom: 2021, yearTo: 2023 })

    expect(timeline.years).toEqual([2021, 2022, 2023])
    expect(timeline.byYear.map((row) => row.shows)).toEqual([2, 0, 1])
    expect(timeline.excludedByYear).toBe(1)
  })
})

describe('timeline character song counts', () => {
  it('counts each distinct song once per year for the stacked bars, however often it was played', () => {
    // 初音ミク sang Song 100 at three 場次 of 2020 and 鏡音リン sang Song 101 at one of them.
    expect(characterSongCount(yearlyCatalog(), 2020, '初音ミク')).toBe(1)
    expect(characterSongCount(yearlyCatalog(), 2020, '鏡音リン')).toBe(1)
    expect(characterSongCount(yearlyCatalog(), 2022, '初音ミク')).toBe(0)
    expect(characterSongCount(yearlyCatalog(), 2023, '謎の声')).toBe(0)
  })

  it('counts only configured characters and drops vocalist credits that match no rule', () => {
    const timeline = buildTimeline(yearlyCatalog(), { characterRules: characterRules() })

    expect(timeline.characterSongByYear.filter((row) => row.year === 2023)).toEqual([])
    expect(timeline.characterTotals.map((row) => row.name).sort()).toEqual(['初音ミク', '鏡音リン'])
  })

  it('splits a chorus song across its characters only when asked', () => {
    const current = yearlyCatalog()
    current.songs.push(song(103, 'Duet', ['初音ミク', '鏡音リン']))
    current.songs.push(song(104, 'Trio', ['初音ミク', '鏡音リン', '巡音ルカ']))
    current.performanceShowSetlistItems.push(
      showItem(3, '3:2023-03-03', 2, 103),
      showItem(3, '3:2023-03-03', 3, 104),
    )

    // Each song adds 1 per character by default, so the duet and trio do not dilute the count.
    expect(characterSongCount(current, 2023, '初音ミク')).toBe(2)
    expect(characterSongCount(current, 2023, '巡音ルカ')).toBe(1)

    // Split mode shares each song's one count across the characters credited on it.
    expect(characterSongCount(current, 2023, '初音ミク', { characterSongWeight: 'split' })).toBeCloseTo(1 / 2 + 1 / 3)
    expect(characterSongCount(current, 2023, '鏡音リン', { characterSongWeight: 'split' })).toBeCloseTo(1 / 2 + 1 / 3)
    expect(characterSongCount(current, 2023, '巡音ルカ', { characterSongWeight: 'split' })).toBeCloseTo(1 / 3)
  })

  it('reports each role\u2019s share of the year under the same song-count rule', () => {
    const current = yearlyCatalog()
    current.songs.push(song(103, 'Duet', ['初音ミク', '鏡音リン']))
    current.songs.push(song(104, 'Rin solo', ['鏡音リン']))
    current.performanceShowSetlistItems.push(
      showItem(3, '3:2023-03-03', 2, 103),
      showItem(3, '3:2023-03-03', 3, 104),
    )

    /** Share of one bucket in 2023, read from the share series of the character chart. */
    const share = (name: string, options: TimelineOptions): number => {
      const rows = buildTimeline(current, { characterRules: characterRules(), ...options })
        .characterShareByYear.filter((row) => row.year === 2023)
      // Shares of one year always add up to 1, so a missing bucket is a real 0%.
      return rows.find((row) => row.name === name)?.share ?? 0
    }

    // Per-song: the duet counts for both roles, so 初音ミク holds 1 of 3 credits.
    expect(share('初音ミク', {})).toBeCloseTo(1 / 3)
    expect(share('鏡音リン', {})).toBeCloseTo(2 / 3)
    // Split: 初音ミク holds 0.5 of 2 weighted credits.
    expect(share('初音ミク', { characterSongWeight: 'split' })).toBeCloseTo(0.25)
    expect(share('鏡音リン', { characterSongWeight: 'split' })).toBeCloseTo(0.75)
    // 2022 has no character songs, so the year contributes no share rows at all.
    expect(buildTimeline(current, { characterRules: characterRules() }).characterShareByYear.filter((row) => row.year === 2022)).toEqual([])
  })
})

describe('timeline new-song baseline', () => {
  /** Two 演出 across two series so a series filter can hide the older appearance. */
  const baselineCatalog = (): Catalog => {
    const current = emptyCatalog()
    current.performances = [
      performance({ id: 1, series_id: 81, start_date: '2010-06-01', song_list_id: 601 }),
      performance({ id: 2, series_id: 82, start_date: '2015-06-01', song_list_id: 602 }),
    ]
    current.performanceShowSetlists = [
      showRow(1, '1:2010-06-01', '2010-06-01', null),
      showRow(2, '2:2015-06-01', '2015-06-01', null),
    ]
    current.songs = [song(100, 'Older', ['初音ミク']), song(101, 'Debut', ['初音ミク'])]
    current.performanceShowSetlistItems = [
      showItem(1, '1:2010-06-01', 1, 100),
      showItem(2, '2:2015-06-01', 1, 100),
      showItem(2, '2:2015-06-01', 2, 101),
    ]
    return current
  }

  /** 2015 row of the song chart. */
  const songYear = (catalog: Catalog, options: TimelineOptions) => {
    const row = buildTimeline(catalog, options).songByYear.find((entry) => entry.year === 2015)
    if (row === undefined) throw new Error('Missing 2015 row')
    return row
  }

  it('treats a song first played outside the filtered series as returning under the catalog baseline', () => {
    const row = songYear(baselineCatalog(), { seriesIds: [82] })
    expect(row.newSongs).toBe(1)
    expect(row.returning).toBe(1)
    expect(row.newRatio).toBe(0.5)
    expect(row.newSongIds).toEqual([101])
  })

  it('treats the same song as new when the baseline is the filtered range', () => {
    const row = songYear(baselineCatalog(), { seriesIds: [82], newSongBaseline: 'filtered' })
    expect(row.newSongs).toBe(2)
    expect(row.returning).toBe(0)
    expect(row.newRatio).toBe(1)
  })

  it('folds a variant into its canonical song so the variant is not counted as a new song', () => {
    const current = baselineCatalog()
    current.songs.push(song(200, 'Older (remix)', ['初音ミク']))
    current.performanceShowSetlistItems = current.performanceShowSetlistItems.map((item) =>
      item.performance_id === 2 && item.position === 1 ? { ...item, song_id: 200 } : item,
    )
    const variants = parseSongVariants({ '200': { canonical: 100, kind: 'remix' } })

    const merged = songYear(current, { seriesIds: [82], variants })
    expect(merged.newSongs).toBe(1)
    expect(merged.returning).toBe(1)
    expect(merged.newSongIds).toEqual([101])

    const separate = songYear(current, { seriesIds: [82] })
    expect(separate.newSongs).toBe(2)
    expect(separate.newSongIds).toEqual([101, 200])
    expect(separate.returning).toBe(0)
  })
})

describe('timeline against the committed catalog', () => {
  it('matches the /series 场次 total and the catalog-wide dated 演出 count', () => {
    const db = new Database(':memory:')
    try {
      applyCatalogSql(db)
      const catalog = loadCatalog({
        /** Reads the in-memory catalog built from committed SQL. */
        all: (sql: string) => db.prepare(sql).all() as SqlRow[],
      })
      const timeline = buildTimeline(catalog, { includeBroadcast: true })
      const review = reviewRotations(catalog)
      const seriesRows = buildSeriesOverview(catalog.series, catalog.performances, showCountsByPerformance(catalog, review))
      const seriesShows = seriesRows.reduce((sum, row) => sum + row.shows, 0)
      const dated = catalog.performances.filter((row) => performanceYear(row.start_date) !== null)

      expect(timeline.totals.shows).toBe(seriesShows)
      expect(timeline.totals.performances).toBe(dated.length)
      expect(timeline.excludedUndated).toBe(catalog.performances.length - dated.length)
      expect(timeline.byYear.reduce((sum, row) => sum + row.performances, 0)).toBe(dated.length)
      expect(timeline.years.length).toBeGreaterThan(10)
      for (let index = 1; index < timeline.years.length; index += 1) {
        expect(timeline.years[index]).toBe((timeline.years[index - 1] as number) + 1)
      }
    } finally {
      db.close()
    }
  })
})
