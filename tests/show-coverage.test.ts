import { describe, expect, it } from 'vitest'
import { formatShowCoverage, showCoverage } from '../shared/show-coverage.ts'
import { reviewRotations } from '../shared/rotation.ts'
import type { Catalog, PerformanceRow } from '../shared/types.ts'

/** One VocaDB performance row (`演出`) on a single setlist. */
const performance = (
  id: number,
  name: string,
  date: string | null,
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

/** A line of a setlist with the songs it prints and the note that selects 场次. */
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
  performanceSetlists: [],
  performanceSetlistSources: [],
  performanceShowSetlists: [],
  performanceShowSetlistItems: [],
  medleys: [],
  medleySongs: [],
  performanceStatus: [],
})

describe('演出 coverage', () => {
  it('credits every 场次 of a three-day run and prints 本演出全部 3 场', () => {
    const catalog = catalogOf(
      [performance(1, '初音ミク「マジカルミライ 2021」in OSAKA', '2021-10-22', 100, 2021, '2021-10-24')],
      [item(100, 31, [50])],
    )
    const coverage = showCoverage(catalog, reviewRotations(catalog), [50])
    expect(coverage.get(1)).toEqual({ total: 3, covered: 3 })
    expect(formatShowCoverage(coverage.get(1) ?? null, [])).toBe('本演出全部 3 场')
  })

  it('credits only the day a note selects inside the same 演出', () => {
    const catalog = catalogOf(
      [performance(2, '初音ミク「マジカルミライ 2023」in TOKYO', '2023-09-01', 101, 2023, '2023-09-03')],
      [item(101, 1, [60], 'Day 2')],
    )
    const coverage = showCoverage(catalog, reviewRotations(catalog), [60])
    expect(coverage.get(2)).toEqual({ total: 3, covered: 1 })
    expect(formatShowCoverage(coverage.get(2) ?? null, [])).toBe('3 场中 1 场')
  })

  it('counts a day/night pair as two 场次 and credits the half a note names', () => {
    const catalog = catalogOf(
      [performance(3, '初音ミク「マジカルミライ 2020」in TOKYO', '2020-12-18', 102, 2020)],
      [item(102, 1, [70]), item(102, 2, [71], 'Nighttime Shows'), item(102, 3, [72], 'Daytime Shows')],
    )
    const review = reviewRotations(catalog)
    const coverage = showCoverage(catalog, review, [70, 71, 72])
    expect(coverage.get(3)).toEqual({ total: 2, covered: 2 })
    expect(formatShowCoverage(coverage.get(3) ?? null, [])).toBe('本演出全部 2 场')
    expect(formatShowCoverage({ total: 2, covered: 1 }, [])).toBe('2 场中 1 场')
  })

  it('no longer merges the city stops of one series year', () => {
    const catalog = catalogOf(
      [
        performance(4, '初音ミク「マジカルミライ 2019」in TOKYO', '2019-08-30', 103, 2019, '2019-09-01'),
        performance(5, '初音ミク「マジカルミライ 2019」in OSAKA', '2019-08-09', 104, 2019, '2019-08-11'),
      ],
      [item(103, 24, [80]), item(104, 24, [81])],
    )
    const coverage = showCoverage(catalog, reviewRotations(catalog), [80])
    expect(coverage.get(4)).toEqual({ total: 3, covered: 3 })
    expect(coverage.get(5)).toEqual({ total: 3, covered: 0 })
    expect(formatShowCoverage(coverage.get(5) ?? null, [])).toBe('3 场中 0 场')
  })

  it('stays silent for a single-场次 演出', () => {
    const catalog = catalogOf(
      [performance(6, 'MIKU EXPO 2024 London', '2024-10-26', 105, 2024)],
      [item(105, 1, [90])],
    )
    const coverage = showCoverage(catalog, reviewRotations(catalog), [90])
    expect(coverage.get(6)).toEqual({ total: 1, covered: 1 })
    expect(formatShowCoverage(coverage.get(6) ?? null, [])).toBeNull()
  })

  it('skips a 演出 without a date or a setlist', () => {
    const catalog = catalogOf(
      [
        performance(7, 'MIKU EXPO 2020 Vancouver', null, 106, 2020),
        performance(8, 'MIKU EXPO 2021 Online', '2021-06-06', null, 2021),
        performance(9, 'MIKU EXPO 2021 Online day two', '2021-06-07', 107, 2021),
      ],
      [item(107, 1, [100])],
    )
    const coverage = showCoverage(catalog, reviewRotations(catalog), [100])
    expect(coverage.has(7)).toBe(false)
    expect(coverage.has(8)).toBe(false)
    expect(coverage.get(9)).toEqual({ total: 1, covered: 1 })
  })

  it('lets a city-only warning own the numbers instead of printing a second total', () => {
    const catalog = catalogOf(
      [
        performance(10, '初音ミク「マジカルミライ 2018」in OSAKA', '2018-08-25', 108, 2018, '2018-08-26'),
        performance(11, '初音ミク「マジカルミライ 2018」in TOKYO', '2018-08-31', 108, 2018, '2018-09-02'),
      ],
      [item(108, 6, [110], '大阪')],
    )
    const review = reviewRotations(catalog)
    const line = review.lines.find((row) => row.position === 6)
    expect(line?.reasons).toContain('city-only when city has several shows: 2')
    expect(formatShowCoverage({ total: 3, covered: 1 }, line?.reasons ?? [])).toBeNull()
    expect(formatShowCoverage({ total: 3, covered: 3 }, line?.reasons ?? [])).toBeNull()
  })

  it('honours every variant id of a merged song group', () => {
    const catalog = catalogOf(
      [performance(12, '初音ミク「マジカルミライ 2024」in TOKYO', '2024-08-30', 109, 2024, '2024-09-01')],
      [item(109, 1, [120]), item(109, 2, [121])],
    )
    const coverage = showCoverage(catalog, reviewRotations(catalog), [120, 121])
    expect(coverage.get(12)).toEqual({ total: 3, covered: 3 })
    expect(showCoverage(catalog, reviewRotations(catalog), []).size).toBe(0)
  })
})
