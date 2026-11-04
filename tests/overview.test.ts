import { describe, expect, it } from 'vitest'
import { buildPerformanceOverview, buildSeriesOverview, type OverviewPerformance } from '../shared/overview.ts'

/** 演出 fixture; defaults are one day in Tokyo with a setlist. */
const performance = (overrides: Partial<OverviewPerformance> & Pick<OverviewPerformance, 'id' | 'series_id'>): OverviewPerformance => ({
  name: `Show ${overrides.id}`,
  name_ja: null,
  venue_name: null,
  series_suffix: null,
  start_date: '2024-08-30',
  end_date: null,
  showtime_local: null,
  song_list_id: 1,
  series_number: 2024,
  ...overrides,
})

describe('buildSeriesOverview', () => {
  it('groups 演出 by series and totals 场次', () => {
    const rows = buildSeriesOverview(
      [
        { id: 81, name: 'マジカルミライ' },
        { id: 82, name: 'MIKU EXPO' },
      ],
      [
        performance({ id: 1, series_id: 81, start_date: '2024-08-30', end_date: '2024-09-01' }),
        performance({ id: 2, series_id: 81, start_date: '2024-08-30' }),
        performance({ id: 3, series_id: 82, start_date: '2023-05-01' }),
      ],
    )
    expect(rows).toHaveLength(2)
    const mirai = rows.find((row) => row.seriesId === 81)
    expect(mirai).toMatchObject({ performances: 2, shows: 4, firstYear: 2024, lastYear: 2024, firstDate: '2024-08-30', lastDate: '2024-08-30' })
    const expo = rows.find((row) => row.seriesId === 82)
    expect(expo).toMatchObject({ performances: 1, shows: 1, firstYear: 2023, lastYear: 2023 })
  })

  it('orders series by first 演出 date and puts undated series last', () => {
    const rows = buildSeriesOverview(
      [
        { id: 1, name: 'Undated' },
        { id: 2, name: 'Later' },
        { id: 3, name: 'Earlier' },
      ],
      [
        performance({ id: 1, series_id: 2, start_date: '2020-01-01' }),
        performance({ id: 2, series_id: 3, start_date: '2010-01-01' }),
        performance({ id: 3, series_id: 1, start_date: null }),
      ],
    )
    expect(rows.map((row) => row.seriesId)).toEqual([3, 2, 1])
  })

  it('prefers the supplied 场次 counts over calendar days', () => {
    const rows = buildSeriesOverview(
      [{ id: 1, name: 'Series' }],
      [performance({ id: 1, series_id: 1, start_date: '2024-08-30' })],
      new Map([[1, 2]]),
    )
    expect(rows[0]?.shows).toBe(2)
  })

  it('keeps a series without 演出 as an empty row', () => {
    const rows = buildSeriesOverview([{ id: 1, name: 'Empty' }], [])
    expect(rows[0]).toMatchObject({ performances: 0, shows: 0, firstYear: null, lastYear: null, firstDate: null, lastDate: null })
  })
})

describe('buildPerformanceOverview', () => {
  it('prints one row per 演出, newest first, with the undated rows last', () => {
    const rows = buildPerformanceOverview([
      performance({ id: 1, series_id: 81, start_date: '2019-08-30' }),
      performance({ id: 2, series_id: 81, start_date: null }),
      performance({ id: 3, series_id: 81, start_date: '2024-08-30', end_date: '2024-09-01' }),
    ])
    expect(rows.map((row) => row.id)).toEqual([3, 1, 2])
    expect(rows[0]).toMatchObject({ dates: '2024-08-30 – 2024-09-01', year: 2024, shows: 3, hasSetlist: true })
    expect(rows[2]).toMatchObject({ dates: null, year: null })
  })

  it('marks a 演出 without a setlist', () => {
    const rows = buildPerformanceOverview([performance({ id: 1, series_id: 81, song_list_id: null })])
    expect(rows[0]?.hasSetlist).toBe(false)
  })
})
