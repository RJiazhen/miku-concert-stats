import { describe, expect, it } from 'vitest'
import { rankSongAppearances } from '../shared/stats.ts'
import type { Catalog, PerformanceRow, SeriesRow, SetlistItemRow, SetlistItemSongRow, SongRow } from '../shared/types.ts'

/** Minimal catalog overridden by each fixture. */
const catalog = (): Catalog => ({
  sources: [],
  series: [series(81, 'マジカルミライ'), series(82, 'MIKU EXPO'), series(256, '初音ミクシンフォニー')],
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
})

/** Series row with only the fields the ranking reads. */
const series = (id: number, name: string): SeriesRow => ({
  id,
  name,
  name_ja: null,
  description: null,
  source_url: `https://vocadb.net/Event/SeriesDetails/${id}`,
  retrieved_at: '2026-10-12T00:00:00.000Z',
})

/** 演出 fixture. Defaults are an in-person show with a setlist. */
const performance = (overrides: Partial<PerformanceRow> & Pick<PerformanceRow, 'id' | 'series_id' | 'song_list_id'>): PerformanceRow => ({
  name: `Show ${overrides.id}`,
  name_ja: null,
  venue_name: null,
  country_code: 'JP',
  start_date: '2016-09-02',
  end_date: null,
  showtime_local: null,
  timezone: null,
  time_precision: 'day',
  time_evidence: null,
  role: 'show',
  series_number: 2016,
  series_suffix: null,
  vocadb_status: 'Finished',
  source_url: `https://vocadb.net/E/${overrides.id}`,
  retrieved_at: '2026-10-12T00:00:00.000Z',
  ...overrides,
})

/** Song fixture. */
const song = (id: number, name: string, artists: string | null): SongRow => ({
  id,
  name,
  name_ja: null,
  name_en: null,
  artist_string: artists,
  song_type: 'Original',
  publish_date: null,
  length_seconds: null,
  source_url: `https://vocadb.net/S/${id}`,
  retrieved_at: '2026-10-12T00:00:00.000Z',
})

/** Printed setlist line. The ranking ignores song links that have no matching line. */
const item = (songListId: number, position: number, listedSongId: number, notes: string | null = null): SetlistItemRow => ({
  song_list_id: songListId,
  position,
  listed_song_id: listedSongId,
  notes,
})

/** Counted song on a setlist line. `listed` is the direct role. */
const link = (songListId: number, position: number, songId: number, role: SetlistItemSongRow['role']): SetlistItemSongRow => ({
  song_list_id: songListId,
  position,
  song_id: songId,
  role,
})

describe('song appearance ranking', () => {
  it('counts one appearance per 演出 and per 场次 for single-day stops', () => {
    const rows = catalog()
    rows.songs = [song(1, 'World is Mine', 'ryo'), song(2, 'Melt', 'supercell')]
    rows.setlistItems = [item(10, 1, 1), item(10, 2, 2), item(11, 1, 1)]
    rows.setlistItemSongs = [link(10, 1, 1, 'listed'), link(10, 2, 2, 'listed'), link(11, 1, 1, 'listed')]
    rows.performances = [
      performance({ id: 1, series_id: 81, song_list_id: 10, start_date: '2014-08-30' }),
      performance({ id: 2, series_id: 81, song_list_id: 10, start_date: '2014-09-20' }),
      performance({ id: 3, series_id: 82, song_list_id: 11, start_date: '2016-03-23' }),
    ]
    const byEvent = rankSongAppearances(rows, { mode: 'event' })
    expect(byEvent.map((row) => [row.songId, row.count, row.seriesCount, row.firstYear, row.lastYear])).toEqual([
      [1, 3, 2, 2014, 2016],
      [2, 2, 1, 2014, 2014],
    ])
    expect(byEvent[0]).toMatchObject({ name: 'World is Mine', artists: 'ryo' })
    const byShow = rankSongAppearances(rows, { mode: 'show' })
    expect(byShow.find((row) => row.songId === 1)?.count).toBe(3)
    expect(byShow.find((row) => row.songId === 2)?.count).toBe(2)
  })

  it('counts two cities of one year as two 演出 and two 场次, no longer one 系列年度', () => {
    // Reversal of the old edition expectation: MIKU EXPO 2025 in two cities used to count once.
    const rows = catalog()
    rows.songs = [song(1, 'Shared', 'a'), song(2, 'Expo only', 'b')]
    rows.setlistItems = [item(10, 1, 1), item(11, 1, 1), item(11, 2, 2), item(12, 1, 1)]
    rows.setlistItemSongs = [
      link(10, 1, 1, 'listed'),
      link(11, 1, 1, 'listed'),
      link(11, 2, 2, 'listed'),
      link(12, 1, 1, 'listed'),
    ]
    rows.performances = [
      performance({ id: 1, series_id: 82, series_number: 2025, song_list_id: 10, start_date: '2025-05-01' }),
      performance({ id: 2, series_id: 82, series_number: 2025, song_list_id: 11, start_date: '2025-06-01' }),
      performance({ id: 3, series_id: 82, series_number: 2026, song_list_id: 12, start_date: '2026-05-01' }),
    ]
    const byEvent = rankSongAppearances(rows, { mode: 'event' })
    expect(byEvent.find((row) => row.songId === 1)?.count).toBe(3)
    expect(byEvent.find((row) => row.songId === 2)?.count).toBe(1)
    expect(rankSongAppearances(rows, { mode: 'show' }).find((row) => row.songId === 1)?.count).toBe(3)
  })

  it('defaults to 按场次 when options.mode is omitted', () => {
    const rows = catalog()
    rows.songs = [song(1, 'Shared', 'a')]
    rows.setlistItems = [item(10, 1, 1), item(11, 1, 1)]
    rows.setlistItemSongs = [link(10, 1, 1, 'listed'), link(11, 1, 1, 'listed')]
    rows.performances = [
      performance({ id: 1, series_id: 82, series_number: 2025, song_list_id: 10, start_date: '2025-05-01' }),
      performance({ id: 2, series_id: 82, series_number: 2025, song_list_id: 11, start_date: '2025-06-01' }),
    ]
    expect(rankSongAppearances(rows).find((row) => row.songId === 1)?.count).toBe(2)
    expect(rankSongAppearances(rows, { mode: 'event' }).find((row) => row.songId === 1)?.count).toBe(2)
  })

  it('filters series, years, broadcasts, and medley components', () => {
    const rows = catalog()
    rows.songs = [song(1, 'Direct', 'a'), song(2, 'Part', 'b')]
    rows.setlistItems = [item(10, 1, 1), item(10, 2, 9), item(11, 1, 1)]
    rows.setlistItemSongs = [
      link(10, 1, 1, 'listed'),
      link(10, 2, 2, 'component'),
      link(11, 1, 1, 'listed'),
      link(12, 1, 1, 'listed'),
    ]
    rows.performances = [
      performance({ id: 1, series_id: 81, song_list_id: 10, start_date: '2014-08-30' }),
      performance({ id: 2, series_id: 82, song_list_id: 11, start_date: '2021-06-06', name: 'MIKU EXPO 2021 Online', series_suffix: 'Online' }),
      performance({ id: 3, series_id: 82, song_list_id: 11, start_date: '2023-11-12', name: 'MIKU EXPO 2023 VR', series_suffix: 'VR' }),
      performance({ id: 4, series_id: 81, song_list_id: 10, start_date: '2020-12-25', role: 'broadcast', name: '配信' }),
      performance({ id: 5, series_id: 81, song_list_id: 10, start_date: null }),
      performance({ id: 6, series_id: 999, song_list_id: 11, start_date: '2018-01-01' }),
    ]
    expect(rankSongAppearances(rows).map((row) => row.songId)).toEqual([1])
    expect(rankSongAppearances(rows, { seriesIds: [82] })).toEqual([])
    expect(rankSongAppearances(rows, { yearFrom: 2015, yearTo: 2019 })).toEqual([])
    expect(rankSongAppearances(rows, { yearFrom: 2014 })[0]).toMatchObject({ songId: 1, firstYear: 2014, lastYear: 2014 })
    const withBroadcasts = rankSongAppearances(rows, { mode: 'event', includeBroadcast: true, seriesIds: [82] })
    expect(withBroadcasts[0]).toMatchObject({ songId: 1, count: 2, firstYear: 2021, lastYear: 2023 })
    const withMedley = rankSongAppearances(rows, { mode: 'event', includeMedleyComponents: true })
    // The undated performance still counts once per 演出; 按演出 does not need a date.
    expect(withMedley.find((row) => row.songId === 2)).toMatchObject({ count: 2, artists: 'b' })
    // The undated broadcast counts as a 演出 but has no 场次, so 按场次 stays at four.
    expect(rankSongAppearances(rows, { mode: 'show', includeBroadcast: true }).find((row) => row.songId === 1)?.count).toBe(4)
  })

  it('counts a three-day run as three 场次 and one 演出', () => {
    const rows = catalog()
    rows.songs = [song(1, 'Every day', 'a'), song(2, 'Day 2 only', 'b')]
    rows.setlistItems = [item(10, 1, 1), item(10, 2, 2, 'Day 2')]
    rows.setlistItemSongs = [link(10, 1, 1, 'listed'), link(10, 2, 2, 'listed')]
    rows.performances = [
      performance({ id: 1, series_id: 81, song_list_id: 10, start_date: '2024-08-30', end_date: '2024-09-01' }),
    ]
    expect(rankSongAppearances(rows, { mode: 'show' }).map((row) => [row.songId, row.count])).toEqual([
      [1, 3],
      [2, 1],
    ])
    expect(rankSongAppearances(rows, { mode: 'event' }).map((row) => [row.songId, row.count])).toEqual([
      [1, 1],
      [2, 1],
    ])
  })

  it('counts a day with a daytime and a night-time show as two 场次', () => {
    const rows = catalog()
    rows.songs = [song(1, 'Both halves', 'a'), song(2, 'Night only', 'b'), song(3, 'Day only', 'c')]
    rows.setlistItems = [item(20, 1, 1), item(20, 2, 2, 'Nighttime Shows'), item(20, 3, 3, 'Daytime Shows')]
    rows.setlistItemSongs = [link(20, 1, 1, 'listed'), link(20, 2, 2, 'listed'), link(20, 3, 3, 'listed')]
    rows.performances = [performance({ id: 1, series_id: 81, song_list_id: 20, start_date: '2020-10-17' })]
    expect(rankSongAppearances(rows, { mode: 'show' }).map((row) => [row.songId, row.count])).toEqual([
      [1, 2],
      [2, 1],
      [3, 1],
    ])
    expect(rankSongAppearances(rows, { mode: 'event' }).every((row) => row.count === 1)).toBe(true)
  })

  it('attributes lines to the 场次 the parser narrows to', () => {
    const rows = catalog()
    rows.songs = [song(1, 'Shared', 'a'), song(2, 'Tokyo only', 'b'), song(3, 'Saihate', 'Onyx')]
    rows.setlistItems = [item(10, 1, 1), item(10, 2, 2, 'Tokyo'), item(10, 3, 3, 'Osaka')]
    rows.setlistItemSongs = [link(10, 1, 1, 'listed'), link(10, 2, 2, 'listed'), link(10, 3, 3, 'listed')]
    rows.performances = [
      performance({ id: 1, series_id: 81, song_list_id: 10, name: 'in TOKYO', start_date: '2024-08-30' }),
      performance({ id: 2, series_id: 81, song_list_id: 10, name: 'in OSAKA', start_date: '2024-10-12' }),
    ]
    expect(rankSongAppearances(rows, { mode: 'event' }).find((row) => row.songId === 3)).toMatchObject({ count: 1 })
    expect(rankSongAppearances(rows, { mode: 'show' }).find((row) => row.songId === 3)).toMatchObject({
      count: 1,
      approximate: false,
    })
    expect(rankSongAppearances(rows, { mode: 'show' }).find((row) => row.songId === 1)?.count).toBe(2)
  })
})
