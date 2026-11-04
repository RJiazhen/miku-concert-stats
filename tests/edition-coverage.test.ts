import { describe, expect, it } from 'vitest'
import { editionCoverage, formatEditionCoverage } from '../shared/edition-coverage.ts'
import { reviewRotations } from '../shared/rotation.ts'
import type { Catalog, PerformanceRow } from '../shared/types.ts'

/** One VocaDB performance row on a single setlist. */
const performance = (
  id: number,
  name: string,
  date: string,
  songListId: number | null,
  seriesNumber: number | null = 2021,
  endDate: string | null = null,
): PerformanceRow => ({
  id,
  series_id: 81,
  name,
  name_ja: null,
  venue_name: null,
  country_code: 'JP',
  start_date: date,
  end_date: endDate,
  showtime_local: null,
  timezone: null,
  time_precision: 'day',
  time_evidence: null,
  role: 'show',
  series_number: seriesNumber,
  series_suffix: null,
  song_list_id: songListId,
  vocadb_status: 'Finished',
  source_url: `https://vocadb.net/E/${id}`,
  retrieved_at: '2026-11-04T00:00:00.000Z',
})

/** A line of a setlist with the songs it prints and the note that selects shows. */
const item = (songListId: number, position: number, songs: number[], notes: string | null = null) => ({ songListId, position, songs, notes })

/** Catalog built from performance rows and setlist lines. */
const catalogOf = (
  performances: PerformanceRow[],
  items: ReturnType<typeof item>[],
): Catalog => ({
  sources: [],
  series: [],
  performances,
  performanceLinks: [],
  premieres: [],
  songLists: [],
  songs: [],
  setlistItems: items.map((row) => ({
    song_list_id: row.songListId,
    position: row.position,
    listed_song_id: row.songs[0] ?? 0,
    notes: row.notes,
  })),
  setlistItemSongs: items.flatMap((row) =>
    row.songs.map((songId) => ({ song_list_id: row.songListId, position: row.position, song_id: songId, role: 'listed' as const })),
  ),
  medleyQuarantine: [],
  videos: [],
  snapshots: [],
  milestones: [],
  formulas: [],
})

describe('edition coverage', () => {
  it('credits every show of a shared setlist and prints 全部 N 场', () => {
    const catalog = catalogOf(
      [
        performance(1, '初音ミク「マジカルミライ 2021」in OSAKA', '2021-10-22', 100, 2021, '2021-10-24'),
        performance(2, '初音ミク「マジカルミライ 2021」in TOKYO', '2021-11-05', 100, 2021, '2021-11-07'),
      ],
      [item(100, 31, [50])],
    )
    const coverage = editionCoverage(catalog, reviewRotations(catalog), [50])
    expect(coverage.get(1)).toEqual({ total: 2, covered: 2 })
    expect(coverage.get(2)).toEqual({ total: 2, covered: 2 })
    expect(formatEditionCoverage(coverage.get(1) ?? null, [])).toBe('全部 2 场')
  })

  it('counts a song that appears in only one regional setlist as partial', () => {
    const catalog = catalogOf(
      [
        performance(3, '初音ミク「マジカルミライ 2019」in TOKYO', '2019-08-30', 101, 2019),
        performance(4, '初音ミク「マジカルミライ 2019」in OSAKA', '2019-08-09', 102, 2019),
      ],
      [item(101, 24, [60]), item(102, 24, [61])],
    )
    const coverage = editionCoverage(catalog, reviewRotations(catalog), [60])
    expect(coverage.get(3)).toEqual({ total: 2, covered: 1 })
    expect(formatEditionCoverage(coverage.get(3) ?? null, [])).toBe('1/2 场')
  })

  it('credits both regional setlists to a song that appears in each', () => {
    const catalog = catalogOf(
      [
        performance(3, '初音ミク「マジカルミライ 2019」in TOKYO', '2019-08-30', 101, 2019),
        performance(4, '初音ミク「マジカルミライ 2019」in OSAKA', '2019-08-09', 102, 2019),
      ],
      [item(101, 24, [60]), item(102, 22, [60])],
    )
    const coverage = editionCoverage(catalog, reviewRotations(catalog), [60])
    expect(coverage.get(3)).toEqual({ total: 2, covered: 2 })
    expect(formatEditionCoverage(coverage.get(4) ?? null, [])).toBe('全部 2 场')
  })

  it('stays silent for a single-show edition', () => {
    const catalog = catalogOf(
      [performance(5, 'MIKU EXPO 2024 London', '2024-10-26', 103, 2024)],
      [item(103, 1, [70])],
    )
    const coverage = editionCoverage(catalog, reviewRotations(catalog), [70])
    expect(coverage.get(5)).toEqual({ total: 1, covered: 1 })
    expect(formatEditionCoverage(coverage.get(5) ?? null, [])).toBeNull()
  })

  it('excludes shows without a setlist from the denominator', () => {
    const catalog = catalogOf(
      [
        performance(8, 'MIKU EXPO 2021 Online', '2021-06-06', null, 2021),
        performance(9, 'MIKU EXPO 2021 Online day two', '2021-06-07', 105, 2021),
      ],
      [item(105, 1, [80])],
    )
    const coverage = editionCoverage(catalog, reviewRotations(catalog), [80])
    expect(coverage.get(9)).toEqual({ total: 1, covered: 1 })
    expect(formatEditionCoverage(coverage.get(9) ?? null, [])).toBeNull()
  })

  it('lets a city-only warning own the numbers instead of printing a second total', () => {
    const catalog = catalogOf(
      [
        performance(6, '初音ミク「マジカルミライ 2018」in OSAKA', '2018-08-25', 104, 2018, '2018-08-26'),
        performance(7, '初音ミク「マジカルミライ 2018」in TOKYO', '2018-08-31', 104, 2018, '2018-09-02'),
      ],
      [item(104, 6, [90], 'Osaka')],
    )
    const review = reviewRotations(catalog)
    const line = review.lines.find((row) => row.position === 6)
    expect(line?.reasons).toContain('city-only when city has several shows: 2')
    expect(editionCoverage(catalog, review, [90]).get(6)).toEqual({ total: 2, covered: 1 })
    expect(formatEditionCoverage({ total: 2, covered: 1 }, line?.reasons ?? [])).toBeNull()
    expect(formatEditionCoverage({ total: 2, covered: 2 }, line?.reasons ?? [])).toBeNull()
  })

  it('credits only the day a note selects', () => {
    const catalog = catalogOf(
      [
        performance(10, '初音ミク「マジカルミライ 2023」in TOKYO first', '2023-09-01', 106, 2023),
        performance(11, '初音ミク「マジカルミライ 2023」in TOKYO last', '2023-09-03', 106, 2023),
        performance(12, '初音ミク「マジカルミライ 2023」in OSAKA', '2023-08-11', 107, 2023),
      ],
      [item(106, 1, [100], 'Day 1'), item(107, 1, [101])],
    )
    const coverage = editionCoverage(catalog, reviewRotations(catalog), [100])
    expect(coverage.get(10)).toEqual({ total: 3, covered: 1 })
    expect(formatEditionCoverage(coverage.get(10) ?? null, [])).toBe('1/3 场')
  })

  it('honours every variant id of a merged song group', () => {
    const catalog = catalogOf(
      [
        performance(13, '初音ミク「マジカルミライ 2024」in TOKYO', '2024-08-30', 108, 2024),
        performance(14, '初音ミク「マジカルミライ 2024」in OSAKA', '2024-10-12', 109, 2024),
      ],
      [item(108, 1, [110]), item(109, 1, [111])],
    )
    const coverage = editionCoverage(catalog, reviewRotations(catalog), [110, 111])
    expect(coverage.get(13)).toEqual({ total: 2, covered: 2 })
    expect(coverage.get(14)).toEqual({ total: 2, covered: 2 })
  })

  it('ignores performances without an edition year and songs with no lines', () => {
    const catalog = catalogOf(
      [
        performance(15, 'Bonus stream', '2024-01-01', 110, null),
        performance(16, 'MIKU EXPO 2024 London', '2024-10-26', 110, 2024),
      ],
      [item(110, 1, [120])],
    )
    const coverage = editionCoverage(catalog, reviewRotations(catalog), [120])
    expect(coverage.has(15)).toBe(false)
    expect(coverage.get(16)).toEqual({ total: 1, covered: 1 })
    expect(editionCoverage(catalog, reviewRotations(catalog), []).size).toBe(0)
  })
})
