import { describe, expect, it } from 'vitest'
import {
  compareAppearances,
  nextAppearanceSort,
  sortAppearances,
  type AppearanceSort,
  type AppearanceSortRow,
} from '../shared/appearance-sort.ts'

/** Appearance row with the fields the sorter reads. */
const row = (overrides: Partial<AppearanceSortRow> & Pick<AppearanceSortRow, 'performanceId'>): AppearanceSortRow => ({
  date: '2024-04-04',
  seriesName: 'MIKU EXPO',
  seriesNumber: 2024,
  performanceName: 'Vancouver',
  noteText: '',
  ...overrides,
})

describe('appearance sort state', () => {
  it('starts a new column ascending and toggles the active column', () => {
    const initial: AppearanceSort = { key: 'date', direction: 'asc' }
    expect(nextAppearanceSort(initial, 'series')).toEqual({ key: 'series', direction: 'asc' })
    expect(nextAppearanceSort(initial, 'note')).toEqual({ key: 'note', direction: 'asc' })
    const series: AppearanceSort = { key: 'series', direction: 'asc' }
    expect(nextAppearanceSort(series, 'series')).toEqual({ key: 'series', direction: 'desc' })
    expect(nextAppearanceSort({ key: 'series', direction: 'desc' }, 'series')).toEqual({ key: 'series', direction: 'asc' })
  })
})

describe('appearance sorting', () => {
  it('keeps the historical date-then-show order for the default sort', () => {
    const rows = [
      row({ performanceId: 3, date: '2019-11-02' }),
      row({ performanceId: 1, date: '2018-10-13' }),
      row({ performanceId: 2, date: '2019-08-09' }),
      row({ performanceId: 0, date: '2019-11-02' }),
    ]
    expect(sortAppearances(rows, { key: 'date', direction: 'asc' }).map((entry) => entry.performanceId)).toEqual([1, 2, 0, 3])
    expect(sortAppearances(rows, { key: 'date', direction: 'desc' }).map((entry) => entry.performanceId)).toEqual([0, 3, 2, 1])
  })

  it('orders dates chronologically across years and months, with missing dates last', () => {
    const rows = [
      row({ performanceId: 1, date: null }),
      row({ performanceId: 2, date: '2020-01-11' }),
      row({ performanceId: 3, date: '2018-10-27' }),
      row({ performanceId: 4, date: '2019-11-09' }),
    ]
    expect(sortAppearances(rows, { key: 'date', direction: 'asc' }).map((entry) => entry.performanceId)).toEqual([3, 4, 2, 1])
    expect(sortAppearances(rows, { key: 'date', direction: 'desc' }).map((entry) => entry.performanceId)).toEqual([2, 4, 3, 1])
  })

  it('sorts the series column by its displayed text in Chinese collation', () => {
    const rows = [
      row({ performanceId: 1, seriesName: '初音ミク「マジカルミライ」', seriesNumber: 2019 }),
      row({ performanceId: 2, seriesName: 'MIKU EXPO', seriesNumber: 2020 }),
      row({ performanceId: 3, seriesName: 'MIKU EXPO', seriesNumber: 2024 }),
    ]
    expect(sortAppearances(rows, { key: 'series', direction: 'asc' }).map((entry) => entry.performanceId)).toEqual([1, 2, 3])
    expect(sortAppearances(rows, { key: 'series', direction: 'desc' }).map((entry) => entry.performanceId)).toEqual([3, 2, 1])
  })

  it('keeps rows with an empty 备注 last in both directions', () => {
    const rows = [
      row({ performanceId: 1, noteText: '' }),
      row({ performanceId: 2, noteText: '版本：重制' }),
      row({ performanceId: 3, noteText: '版本：初音ミク V4X' }),
    ]
    expect(sortAppearances(rows, { key: 'note', direction: 'asc' }).map((entry) => entry.performanceId)).toEqual([3, 2, 1])
    expect(sortAppearances(rows, { key: 'note', direction: 'desc' }).map((entry) => entry.performanceId)).toEqual([2, 3, 1])
  })

  it('breaks ties deterministically by date then show id', () => {
    const laterFirst = row({ performanceId: 9, date: '2024-04-06' })
    const earliest = row({ performanceId: 7, date: '2024-04-04' })
    const laterSecond = row({ performanceId: 8, date: '2024-04-06' })
    const rows = [laterFirst, earliest, laterSecond]
    expect(sortAppearances(rows, { key: 'series', direction: 'asc' }).map((entry) => entry.performanceId)).toEqual([7, 8, 9])
    expect(sortAppearances(rows, { key: 'series', direction: 'desc' }).map((entry) => entry.performanceId)).toEqual([7, 8, 9])
    expect(compareAppearances(laterFirst, earliest, 'venue')).toBeGreaterThan(0)
    expect(compareAppearances(laterSecond, laterFirst, 'venue')).toBeLessThan(0)
  })

  it('leaves the input array untouched', () => {
    const rows = [row({ performanceId: 2, date: '2024-04-14' }), row({ performanceId: 1, date: '2024-04-04' })]
    sortAppearances(rows, { key: 'date', direction: 'desc' })
    expect(rows.map((entry) => entry.performanceId)).toEqual([2, 1])
  })
})
