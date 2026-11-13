import { describe, expect, it } from 'vitest'
import {
  availablePerformanceYears,
  canEndRangeAt,
  canStartRangeAt,
  normalizeYearRange,
  type YearDatedPerformance,
} from '../shared/year-range.ts'

/** Performance fixture with only the start date the year list reads. */
const dated = (startDate: string | null): YearDatedPerformance => ({ start_date: startDate })

describe('availablePerformanceYears', () => {
  it('deduplicates years and sorts them newest first', () => {
    const performances = [
      dated('2014-08-30'),
      dated('2024-11-09'),
      dated('2019-08-30'),
      dated('2024-12-01'),
      dated('2016-09-02'),
    ]
    expect(availablePerformanceYears(performances)).toEqual([2024, 2019, 2016, 2014])
  })

  it('ignores missing and non-day dates', () => {
    const performances = [dated(null), dated('2019'), dated('unknown'), dated('2020-01-01')]
    expect(availablePerformanceYears(performances)).toEqual([2020])
  })

  it('returns nothing when there is no dated performance', () => {
    expect(availablePerformanceYears([])).toEqual([])
    expect(availablePerformanceYears([dated(null)])).toEqual([])
  })
})

describe('normalizeYearRange', () => {
  it('swaps inverted bounds', () => {
    expect(normalizeYearRange({ from: 2020, to: 2015 })).toEqual({ from: 2015, to: 2020 })
  })

  it('leaves a valid range unchanged', () => {
    expect(normalizeYearRange({ from: 2015, to: 2020 })).toEqual({ from: 2015, to: 2020 })
    expect(normalizeYearRange({ from: 2015, to: 2015 })).toEqual({ from: 2015, to: 2015 })
  })

  it('leaves open ends unchanged', () => {
    expect(normalizeYearRange({ from: null, to: 2020 })).toEqual({ from: null, to: 2020 })
    expect(normalizeYearRange({ from: 2020, to: null })).toEqual({ from: 2020, to: null })
    expect(normalizeYearRange({ from: null, to: null })).toEqual({ from: null, to: null })
  })
})

describe('year option bounds', () => {
  it('allows every start year up to an open or later end year', () => {
    expect(canStartRangeAt(2024, { from: null, to: null })).toBe(true)
    expect(canStartRangeAt(2024, { from: null, to: 2019 })).toBe(false)
    expect(canStartRangeAt(2019, { from: null, to: 2019 })).toBe(true)
  })

  it('allows every end year from an open or earlier start year', () => {
    expect(canEndRangeAt(2013, { from: null, to: null })).toBe(true)
    expect(canEndRangeAt(2013, { from: 2019, to: null })).toBe(false)
    expect(canEndRangeAt(2019, { from: 2019, to: null })).toBe(true)
  })
})
