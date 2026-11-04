import type { PerformanceRow } from './types.ts'

/** Performance fields the show header prints. */
export type PerformanceHeaderInput = Pick<PerformanceRow, 'start_date' | 'end_date' | 'showtime_local' | 'venue_name'>

/** Header facts of one show; each field is null when the catalog has no value. */
export type PerformanceHeaderFacts = {
  /** Single date such as `2012-10-02`, or a `start – end` range for a multi-day run. */
  dates: string | null
  /** Venue name as the catalog writes it. */
  venue: string | null
  /** Local start time such as `18:30`, only when the catalog recorded one. */
  showtime: string | null
}

/** Trims a nullable catalog text, treating a blank string as missing. */
const textOf = (value: string | null): string | null => {
  const trimmed = value?.trim() ?? ''
  return trimmed === '' ? null : trimmed
}

/**
 * Formats the facts under a show title.
 * The date span collapses to one date when the run is a single day, and every absent
 * field stays null so the page can omit it cleanly.
 */
export const performanceHeaderFacts = (row: PerformanceHeaderInput): PerformanceHeaderFacts => {
  const start = textOf(row.start_date)
  const end = textOf(row.end_date)
  return {
    dates: start === null ? null : end !== null && end !== start ? `${start} – ${end}` : start,
    venue: textOf(row.venue_name),
    showtime: textOf(row.showtime_local),
  }
}
