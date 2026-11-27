/**
 * Tour detail setlist grouping: one shared table when stops share a programme;
 * city-named tabs only when programmes differ.
 */
import { derivedItemsByShow } from './performance-setlist-query.ts'
import type { Catalog, PerformanceRow, PerformanceShowSetlistItemRow } from './types.ts'

/** One stop candidate for tour setlist grouping / tabs. */
export type TourSetlistStopInput = {
  performanceId: number
  /** Localized city label shown on the tab (already disambiguation-ready base). */
  cityLabel: string
  /** Concert start date `YYYY-MM-DD`, used when two stops share a city name. */
  startDate: string | null
  hasSetlist: boolean
}

/** One Nuxt UI tab item for a distinct programme group. */
export type TourSetlistTab = {
  /** Stable tab value (programme fingerprint). */
  value: string
  label: string
  /** Performance id used to render `ShowSetlistSection`. */
  performanceId: number
  /** Every stop that shares this programme. */
  performanceIds: readonly number[]
}

/** One group of tour stops that share an identical derived programme. */
export type TourSetlistGroup = {
  fingerprint: string
  representativeId: number
  performanceIds: readonly number[]
  cityLabels: readonly string[]
  label: string
}

/** Compact `M/D` from an ISO date, or null when the date is missing. */
const shortDateLabel = (startDate: string | null): string | null => {
  if (startDate === null || startDate.length < 10) return null
  const month = Number(startDate.slice(5, 7))
  const day = Number(startDate.slice(8, 10))
  if (!Number.isFinite(month) || !Number.isFinite(day)) return null
  return `${month}/${day}`
}

/** Identity of one printed row: a single song, or a medley. */
const setlistRowKey = (item: PerformanceShowSetlistItemRow): string =>
  item.medley_id === null ? `song:${item.song_id}` : `medley:${item.medley_id}`

/**
 * Stable fingerprint of one 演出's derived programme.
 * Identical song/medley sequences across 场次 collapse to one sequence so a
 * day+night stop matches a night-only stop with the same songs. Returns null
 * when the catalog has no derived 场次 rows.
 */
export const fingerprintPerformanceSetlist = (
  catalog: Catalog,
  performanceId: number,
): string | null => {
  const byShow = derivedItemsByShow(catalog, performanceId)
  if (byShow.size === 0) return null
  const sequences = [...byShow.values()].map((items) => items.map(setlistRowKey).join(','))
  const unique = [...new Set(sequences)].sort()
  if (unique.length === 1 && unique[0] === '') return null
  return unique.join('||')
}

/** City tab label with an optional date suffix when the same city appears twice. */
const cityTabLabel = (
  stop: TourSetlistStopInput,
  cityCounts: ReadonlyMap<string, number>,
): string => {
  const needsDate = (cityCounts.get(stop.cityLabel) ?? 0) > 1
  const datePart = needsDate ? shortDateLabel(stop.startDate) : null
  return datePart !== null ? `${stop.cityLabel} ${datePart}` : stop.cityLabel
}

/**
 * Groups setlist-bearing tour stops by programme fingerprint.
 * Stops without a derived fingerprint are omitted.
 */
export const groupTourSetlists = (
  catalog: Catalog,
  stops: readonly TourSetlistStopInput[],
): TourSetlistGroup[] => {
  const withSetlist = stops.filter((stop) => stop.hasSetlist)
  const cityCounts = new Map<string, number>()
  for (const stop of withSetlist) {
    cityCounts.set(stop.cityLabel, (cityCounts.get(stop.cityLabel) ?? 0) + 1)
  }

  const groups = new Map<string, TourSetlistGroup>()
  for (const stop of withSetlist) {
    const fingerprint = fingerprintPerformanceSetlist(catalog, stop.performanceId)
    if (fingerprint === null) continue
    const label = cityTabLabel(stop, cityCounts)
    const existing = groups.get(fingerprint)
    if (existing === undefined) {
      groups.set(fingerprint, {
        fingerprint,
        representativeId: stop.performanceId,
        performanceIds: [stop.performanceId],
        cityLabels: [label],
        label,
      })
      continue
    }
    groups.set(fingerprint, {
      ...existing,
      performanceIds: [...existing.performanceIds, stop.performanceId],
      cityLabels: [...existing.cityLabels, label],
      label: [...existing.cityLabels, label].join(' / '),
    })
  }
  return [...groups.values()]
}

/**
 * Builds setlist tabs from programme groups.
 * `useTabs` is true only when two or more distinct programmes exist.
 * When every stop shares one programme, returns a single tab and `useTabs: false`.
 */
export const buildTourSetlistTabs = (
  catalog: Catalog,
  stops: readonly TourSetlistStopInput[],
): { groups: TourSetlistGroup[]; tabs: TourSetlistTab[]; useTabs: boolean } => {
  const groups = groupTourSetlists(catalog, stops)
  const tabs: TourSetlistTab[] = groups.map((group) => ({
    value: group.fingerprint,
    label: group.label,
    performanceId: group.representativeId,
    performanceIds: group.performanceIds,
  }))
  return { groups, tabs, useTabs: tabs.length >= 2 }
}

/** Finds the programme group that contains a performance id. */
export const tourSetlistGroupForPerformance = (
  groups: readonly TourSetlistGroup[],
  performanceId: number,
): TourSetlistGroup | null =>
  groups.find((group) => group.performanceIds.includes(performanceId)) ?? null

/** Chronological order for tour stops: start date, then performance id. */
export const compareTourStops = (left: PerformanceRow, right: PerformanceRow): number =>
  (left.start_date ?? '').localeCompare(right.start_date ?? '') || left.id - right.id
