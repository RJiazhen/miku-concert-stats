import { describe, expect, it } from 'vitest'
import {
  dayNightDatesFor,
  performanceDates,
  performanceSchedules,
  showsForNotes,
  showsForPerformance,
  type SchedulePerformance,
} from '../shared/event-schedule.ts'
import { reviewRotations } from '../shared/rotation.ts'
import type { Catalog, PerformanceRow } from '../shared/types.ts'

/** 演出 fixture; defaults are a single day in Tokyo with no half evidence. */
const performance = (overrides: Partial<SchedulePerformance> & Pick<SchedulePerformance, 'id'>): SchedulePerformance => ({
  name: `Show ${overrides.id}`,
  name_ja: null,
  venue_name: null,
  series_suffix: null,
  start_date: '2024-08-30',
  end_date: null,
  ...overrides,
})

describe('performance dates', () => {
  it('reads one day and an inclusive multi-day range', () => {
    expect(performanceDates(performance({ id: 1 }))).toEqual(['2024-08-30'])
    expect(performanceDates(performance({ id: 2, start_date: '2024-08-30', end_date: '2024-09-01' }))).toEqual([
      '2024-08-30',
      '2024-08-31',
      '2024-09-01',
    ])
  })

  it('returns no date when the start date is missing or malformed', () => {
    expect(performanceDates(performance({ id: 3, start_date: null }))).toEqual([])
    expect(performanceDates(performance({ id: 4, start_date: '2024-8-30' }))).toEqual([])
  })

  it('collapses a reversed or malformed end date to the start day', () => {
    expect(performanceDates(performance({ id: 5, start_date: '2024-08-30', end_date: '2024-08-01' }))).toEqual(['2024-08-30'])
    expect(performanceDates(performance({ id: 6, start_date: '2024-08-30', end_date: 'later' }))).toEqual(['2024-08-30'])
  })

  it('caps a long range at two weeks', () => {
    expect(performanceDates(performance({ id: 7, start_date: '2024-08-01', end_date: '2024-08-20' }))).toHaveLength(14)
  })
})

describe('场次 of one 演出', () => {
  it('labels one 场次 per calendar day', () => {
    const shows = showsForPerformance(performance({ id: 10, start_date: '2020-11-27', end_date: '2020-11-29' }))
    expect(shows.map((show) => show.label)).toEqual(['2020-11-27', '2020-11-28', '2020-11-29'])
    expect(shows.map((show) => show.key)).toEqual(['10:2020-11-27', '10:2020-11-28', '10:2020-11-29'])
    expect(shows.every((show) => show.half === null)).toBe(true)
  })

  it('splits a day with a daytime and a night-time show into two 场次', () => {
    const shows = showsForPerformance(performance({ id: 11, start_date: '2020-10-17' }), ['2020-10-17'])
    expect(shows.map((show) => show.label)).toEqual(['2020-10-17 日场', '2020-10-17 夜场'])
    expect(shows.map((show) => show.half)).toEqual(['day', 'night'])
    expect(new Set(shows.map((show) => show.key)).size).toBe(2)
  })

  it('keeps a single show on a day not marked as a day/night pair', () => {
    const shows = showsForPerformance(performance({ id: 12, start_date: '2020-10-17', end_date: '2020-10-18' }), ['2020-10-18'])
    expect(shows.map((show) => show.label)).toEqual(['2020-10-17', '2020-10-18 日场', '2020-10-18 夜场'])
  })

  it('has no 场次 for an undated 演出', () => {
    expect(showsForPerformance(performance({ id: 13, start_date: null }))).toEqual([])
  })
})

describe('day/night evidence', () => {
  it('marks the day named by a numbered show note', () => {
    const dates = dayNightDatesFor(performance({ id: 20, start_date: '2023-08-11', end_date: '2023-08-13' }), ['DAY 2 1st Show'])
    expect(dates).toEqual(['2023-08-12'])
  })

  it('marks every day when the note names no day', () => {
    const dates = dayNightDatesFor(performance({ id: 21, start_date: '2025-08-01', end_date: '2025-08-03' }), ['Nighttime Shows'])
    expect(dates).toEqual(['2025-08-01', '2025-08-02', '2025-08-03'])
  })

  it('reads afternoon and evening wording as a day/night pair', () => {
    const dates = dayNightDatesFor(performance({ id: 22, start_date: '2017-11-25' }), ['Afternoon Concert', 'Evening Concert'])
    expect(dates).toEqual(['2017-11-25'])
  })

  it('ignores a note that names another city', () => {
    const tokyo = performance({ id: 23, name: 'MIKU EXPO 2024 Tokyo', series_suffix: 'Tokyo' })
    expect(dayNightDatesFor(tokyo, ['Osaka Nighttime Shows'])).toEqual([])
  })
})

describe('line attribution to 场次', () => {
  const shows = showsForPerformance(performance({ id: 30, start_date: '2023-08-11', end_date: '2023-08-13' }), [
    '2023-08-11',
    '2023-08-12',
    '2023-08-13',
  ])

  it('attributes an unnoted line to every 场次 of the run', () => {
    expect(showsForNotes(null, performance({ id: 30, start_date: '2023-08-11', end_date: '2023-08-13' }), shows)).toHaveLength(6)
    expect(showsForNotes('Encore', performance({ id: 30, start_date: '2023-08-11', end_date: '2023-08-13' }), shows)).toHaveLength(6)
  })

  it('narrows a numbered day to that day', () => {
    const picked = showsForNotes('Day 2', performance({ id: 30, start_date: '2023-08-11', end_date: '2023-08-13' }), shows)
    expect(picked.map((show) => show.label)).toEqual(['2023-08-12 日场', '2023-08-12 夜场'])
  })

  it('narrows a half across the run', () => {
    const picked = showsForNotes('Nighttime Shows', performance({ id: 30, start_date: '2023-08-11', end_date: '2023-08-13' }), shows)
    expect(picked.map((show) => show.label)).toEqual(['2023-08-11 夜场', '2023-08-12 夜场', '2023-08-13 夜场'])
  })

  it('narrows a bare date to that day', () => {
    const picked = showsForNotes('8/12', performance({ id: 30, start_date: '2023-08-11', end_date: '2023-08-13' }), shows)
    expect(picked.map((show) => show.label)).toEqual(['2023-08-12 日场', '2023-08-12 夜场'])
  })
})

describe('curated day/night seam', () => {
  /** Full catalog row for one dated 演出 with no setlist. */
  const row = (startDate: string, endDate: string): PerformanceRow => ({
    id: 40,
    series_id: 81,
    name: 'Curated run',
    name_ja: null,
    venue_name: null,
    country_code: 'JP',
    start_date: startDate,
    end_date: endDate,
    showtime_local: null,
    timezone: null,
    time_precision: 'day',
    time_evidence: null,
    role: 'show',
    series_number: 2024,
    series_suffix: null,
    song_list_id: null,
    vocadb_status: 'Finished',
    source_url: 'https://vocadb.net/E/40',
    retrieved_at: '2026-11-04T00:00:00.000Z',
  })

  /** Catalog holding only the one performance, so the review has no lines. */
  const catalogOf = (performance: PerformanceRow): Catalog => ({
    sources: [],
    series: [],
    performances: [performance],
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

  it('defaults to one 场次 per day when no curated schedule is supplied', () => {
    const catalog = catalogOf(row('2024-08-30', '2024-08-31'))
    const schedules = performanceSchedules(catalog, reviewRotations(catalog))
    expect(schedules.get(40)?.map((show) => show.label)).toEqual(['2024-08-30', '2024-08-31'])
  })

  it('unions a curated per-date split without changing the derivation', () => {
    const catalog = catalogOf(row('2024-08-30', '2024-08-31'))
    const schedules = performanceSchedules(catalog, reviewRotations(catalog), new Map([[40, ['2024-08-31']]]))
    expect(schedules.get(40)?.map((show) => show.label)).toEqual(['2024-08-30', '2024-08-31 日场', '2024-08-31 夜场'])
  })
})
