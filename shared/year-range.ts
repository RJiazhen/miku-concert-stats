import { performanceYear } from './stats.ts'
import type { PerformanceRow } from './types.ts'

/** Inclusive year bounds. A null side stays open, matching the ranking filter. */
export type YearRange = {
  from: number | null
  to: number | null
}

/** Performance fields the year list reads. */
export type YearDatedPerformance = Pick<PerformanceRow, 'start_date'>

/**
 * Distinct calendar years present in the performance dates, newest first.
 * Missing or non-day dates contribute nothing, so the pickers only offer years the data can match.
 */
export const availablePerformanceYears = (performances: readonly YearDatedPerformance[]): number[] => {
  const years = new Set<number>()
  for (const performance of performances) {
    const year = performanceYear(performance.start_date)
    if (year !== null) years.add(year)
  }
  return [...years].sort((left, right) => right - left)
}

/**
 * Swaps inverted bounds so a range always reads start <= end.
 * Open ends and already valid ranges are returned unchanged.
 * Restoring a URL needs this because the pickers themselves cannot build an inverted range.
 */
export const normalizeYearRange = (range: YearRange): YearRange => {
  const { from, to } = range
  if (from === null || to === null || from <= to) return range
  return { from: to, to: from }
}

/** Whether `year` can start `range` without passing its end. An open end accepts every year. */
export const canStartRangeAt = (year: number, range: YearRange): boolean => range.to === null || year <= range.to

/** Whether `year` can end `range` without passing its start. An open start accepts every year. */
export const canEndRangeAt = (year: number, range: YearRange): boolean => range.from === null || year >= range.from
