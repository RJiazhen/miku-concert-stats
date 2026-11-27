/**
 * Tour detail setlist tab models: city-named tabs when a tour has multiple
 * setlist-bearing stops.
 */
import type { PerformanceRow } from './types.ts'

/** One stop candidate for a city-labelled setlist tab. */
export type TourSetlistStopInput = {
  performanceId: number
  /** Localized city label shown on the tab (already disambiguation-ready base). */
  cityLabel: string
  /** Concert start date `YYYY-MM-DD`, used when two stops share a city name. */
  startDate: string | null
  hasSetlist: boolean
}

/** One Nuxt UI tab item for a tour setlist switcher. */
export type TourSetlistTab = {
  /** Stable tab value (stringified performance id). */
  value: string
  label: string
  performanceId: number
}

/** Compact `M/D` from an ISO date, or null when the date is missing. */
const shortDateLabel = (startDate: string | null): string | null => {
  if (startDate === null || startDate.length < 10) return null
  const month = Number(startDate.slice(5, 7))
  const day = Number(startDate.slice(8, 10))
  if (!Number.isFinite(month) || !Number.isFinite(day)) return null
  return `${month}/${day}`
}

/**
 * Builds city-named setlist tabs for stops that have a setlist.
 * Duplicate city labels get a short date suffix. Returns `useTabs: false` when
 * fewer than two setlist-bearing stops exist (caller should render one setlist).
 */
export const buildTourSetlistTabs = (
  stops: readonly TourSetlistStopInput[],
): { tabs: TourSetlistTab[]; useTabs: boolean } => {
  const withSetlist = stops.filter((stop) => stop.hasSetlist)
  const cityCounts = new Map<string, number>()
  for (const stop of withSetlist) {
    cityCounts.set(stop.cityLabel, (cityCounts.get(stop.cityLabel) ?? 0) + 1)
  }
  const tabs: TourSetlistTab[] = withSetlist.map((stop) => {
    const needsDate = (cityCounts.get(stop.cityLabel) ?? 0) > 1
    const datePart = needsDate ? shortDateLabel(stop.startDate) : null
    const label = datePart !== null ? `${stop.cityLabel} ${datePart}` : stop.cityLabel
    return {
      value: String(stop.performanceId),
      label,
      performanceId: stop.performanceId,
    }
  })
  return { tabs, useTabs: tabs.length >= 2 }
}

/** Chronological order for tour stops: start date, then performance id. */
export const compareTourStops = (left: PerformanceRow, right: PerformanceRow): number =>
  (left.start_date ?? '').localeCompare(right.start_date ?? '') || left.id - right.id
