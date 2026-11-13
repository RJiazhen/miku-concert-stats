import { showsForPerformance } from './event-schedule.ts'
import { performanceHeaderFacts } from './performance-header.ts'
import { performanceYear } from './stats.ts'
import type { PerformanceRow, SeriesRow } from './types.ts'

/** Performance fields the overview reads. */
export type OverviewPerformance = Pick<
  PerformanceRow,
  'id' | 'series_id' | 'series_number' | 'name' | 'name_ja' | 'venue_name' | 'series_suffix' | 'start_date' | 'end_date' | 'showtime_local' | 'song_list_id'
>

/** Series fields the overview reads. */
export type OverviewSeries = Pick<SeriesRow, 'id' | 'name'>

/** 场次 per performance id, including day/night halves; omit to count calendar days. */
export type ShowCounts = ReadonlyMap<number, number>

/** One series with the totals the overview prints. */
export type SeriesOverviewRow = {
  seriesId: number
  /** Catalog series name, untranslated. */
  name: string
  /** Distinct 演出 rows, one per city stop. */
  performances: number
  /** 场次 across those 演出. */
  shows: number
  firstYear: number | null
  lastYear: number | null
  /** Earliest and latest dated 演出, `YYYY-MM-DD`; null when the series carries no date. */
  firstDate: string | null
  lastDate: string | null
}

/** One 演出 with the facts the overview table prints. */
export type PerformanceOverviewRow = {
  id: number
  seriesId: number
  /** Catalog performance name, untranslated. */
  name: string
  /** Series year label (`series_number`), needed to translate the series tag inside the name. */
  seriesNumber: number | null
  /** Calendar year of the start date; null when the catalog has no day-precise date. */
  year: number | null
  /** Single date or `start – end` range, already formatted for the table. */
  dates: string | null
  /** Venue name as the catalog writes it; null when unknown. */
  venue: string | null
  shows: number
  /** False when the performance has no setlist at all. */
  hasSetlist: boolean
}

/** 场次 of one performance, falling back to calendar days when no counted map is given. */
const showsOf = (performance: OverviewPerformance, showCounts?: ShowCounts): number => {
  const counted = showCounts?.get(performance.id)
  if (counted !== undefined) return counted
  const days = showsForPerformance(performance).length
  return days === 0 ? 1 : days
}

/** Orders a missing date after every real one. */
const compareDates = (left: string | null, right: string | null): number => {
  if (left === right) return 0
  if (left === null) return 1
  if (right === null) return -1
  return left.localeCompare(right)
}

/** Newest real date first, with undated rows still last rather than first. */
const compareNewestFirst = (left: string | null, right: string | null): number => {
  if (left === right) return 0
  if (left === null) return 1
  if (right === null) return -1
  return right.localeCompare(left)
}

/**
 * Groups performances under their series and totals each group.
 * Rows come back oldest first by first 演出 date so the table reads chronologically;
 * series without dates sink to the end in name order.
 */
export const buildSeriesOverview = (
  series: readonly OverviewSeries[],
  performances: readonly OverviewPerformance[],
  showCounts?: ShowCounts,
): SeriesOverviewRow[] => {
  const rows = new Map<number, SeriesOverviewRow>()
  for (const item of series) {
    rows.set(item.id, {
      seriesId: item.id,
      name: item.name,
      performances: 0,
      shows: 0,
      firstYear: null,
      lastYear: null,
      firstDate: null,
      lastDate: null,
    })
  }

  for (const performance of performances) {
    const row = rows.get(performance.series_id)
    if (row === undefined) continue
    row.performances += 1
    row.shows += showsOf(performance, showCounts)
    const date = performance.start_date
    if (date !== null) {
      row.firstDate = row.firstDate === null ? date : date < row.firstDate ? date : row.firstDate
      row.lastDate = row.lastDate === null ? date : date > row.lastDate ? date : row.lastDate
    }
    const year = performanceYear(date)
    if (year !== null) {
      row.firstYear = row.firstYear === null ? year : Math.min(row.firstYear, year)
      row.lastYear = row.lastYear === null ? year : Math.max(row.lastYear, year)
    }
  }

  return [...rows.values()].sort(
    (left, right) => compareDates(left.firstDate, right.firstDate) || left.name.localeCompare(right.name, 'ja'),
  )
}

/**
 * Every 演出 as one flat row for the overview table.
 * Dated 演出 come newest first, and undated rows sink to the end so the first screen
 * shows the most recent concerts instead of unknown ones.
 *
 * `setlistIds` names the 演出 that have a setlist at all, including a wiki-sourced one that
 * leaves `song_list_id` empty; omit it to fall back to the VocaDB column alone.
 */
export const buildPerformanceOverview = (
  performances: readonly OverviewPerformance[],
  showCounts?: ShowCounts,
  setlistIds?: ReadonlySet<number>,
): PerformanceOverviewRow[] => {
  return [...performances]
    .sort((left, right) => compareNewestFirst(left.start_date, right.start_date) || right.id - left.id)
    .map((performance) => ({
      id: performance.id,
      seriesId: performance.series_id,
      name: performance.name,
      seriesNumber: performance.series_number,
      year: performanceYear(performance.start_date),
      dates: performanceHeaderFacts(performance).dates,
      venue: performance.venue_name,
      shows: showsOf(performance, showCounts),
      hasSetlist: setlistIds === undefined ? performance.song_list_id !== null : setlistIds.has(performance.id),
    }))
}
