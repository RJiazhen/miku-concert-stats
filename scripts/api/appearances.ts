import { assignCharacters, type CharacterRule } from '../../shared/characters.ts'
import { derivedItemSongIds } from '../../shared/performance-setlists.ts'
import { producerNamesForSongs } from '../../shared/producer-options.ts'
import {
  isBroadcastAppearance,
  performanceYear,
  rankSongAppearances,
  type RankingMode,
} from '../../shared/stats.ts'
import type { ApiSongRow } from '../../shared/api-types.ts'
import type { SongVariantIndex } from '../../shared/song-variants.ts'
import type {
  Catalog,
  PerformanceRow,
  PerformanceShowSetlistItemRow,
  PerformanceShowSetlistRow,
  SongRow,
} from '../../shared/types.ts'

/** Parses the JSON reason list stored on a derived 場次 row. */
export const parseReasons = (raw: string): string[] => {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((value): value is string => typeof value === 'string')
  } catch {
    return []
  }
}

/** Options that change which 演出 a song's appearances are read from. */
type AppearanceOptions = {
  /** Include livestream, online, and VR 演出. */
  includeBroadcast?: boolean
  /**
   * Accepted for parity with the site's control. The derived layer already expands a medley into
   * its parts and no `medley_quarantine` row is counted either way, so this changes nothing today.
   */
  includeMedleyComponents?: boolean
}

/** One song's presence in one 演出, with the 場次 that played it. */
export type SongPerformanceEntry = {
  showKeys: Set<string>
  reasons: Set<string>
}

/** Song id to 演出 id to that 演出's appearance. */
type SongAppearances = Map<number, Map<number, SongPerformanceEntry>>

/** Show and event counts of one song inside one series or one calendar year. */
type AppearanceBucket = {
  showKeys: Set<string>
  eventIds: Set<number>
  /** Series years this bucket covers; only the series breakdown fills it. */
  seriesNumbers: Set<number>
}

/** Everything the API reports about one song's appearances under one filter. */
export type AppearanceSummary = {
  show: number
  event: number
  performanceCount: number
  seriesCount: number
  firstYear: number | null
  lastYear: number | null
  approximate: boolean
  reasons: string[]
  series: Map<number, AppearanceBucket>
  year: Map<number, AppearanceBucket>
  /** Series id to the first series year the song appeared in that series. */
  firstSeries: Map<number, number>
}

/** Returns the bucket for a key, creating an empty one when it is absent. */
const bucketOf = <K>(buckets: Map<K, AppearanceBucket>, key: K): AppearanceBucket => {
  const existing = buckets.get(key)
  if (existing !== undefined) return existing
  const created: AppearanceBucket = { showKeys: new Set(), eventIds: new Set(), seriesNumbers: new Set() }
  buckets.set(key, created)
  return created
}

/** Summary of a song that no included 演出 performed. */
export const emptySummary = (): AppearanceSummary => ({
  show: 0,
  event: 0,
  performanceCount: 0,
  seriesCount: 0,
  firstYear: null,
  lastYear: null,
  approximate: false,
  reasons: [],
  series: new Map(),
  year: new Map(),
  firstSeries: new Map(),
})

/** Builds song → 演出 → 場次 presence from the derived setlist layer. */
export const buildAppearances = (
  catalog: Catalog,
  variants: SongVariantIndex,
  options: AppearanceOptions = {},
): SongAppearances => {
  const knownSeries = new Set(catalog.series.map((series) => series.id))
  const itemsByPerformance = new Map<number, PerformanceShowSetlistItemRow[]>()
  for (const item of catalog.performanceShowSetlistItems) {
    const bucket = itemsByPerformance.get(item.performance_id) ?? []
    bucket.push(item)
    itemsByPerformance.set(item.performance_id, bucket)
  }
  const showByKey = new Map<string, PerformanceShowSetlistRow>(
    catalog.performanceShowSetlists.map((row) => [row.show_key, row]),
  )
  const appearances: SongAppearances = new Map()
  for (const performance of catalog.performances) {
    if (!knownSeries.has(performance.series_id)) continue
    if (options.includeBroadcast !== true && isBroadcastAppearance(performance)) continue
    // The derived 場次 layer is the primary record, so a 演出 whose setlist only exists in this
    // project (wiki table, no upstream VocaDB song list) contributes its songs too.
    const items = itemsByPerformance.get(performance.id) ?? []
    for (const item of items) {
      const show = showByKey.get(item.show_key)
      const reasons = show !== undefined && show.uncertain === 1 ? parseReasons(show.reasons) : []
      for (const rawId of derivedItemSongIds(catalog, item)) {
        const songId = variants.canonicalSongId(rawId)
        let byPerformance = appearances.get(songId)
        if (byPerformance === undefined) {
          byPerformance = new Map()
          appearances.set(songId, byPerformance)
        }
        let entry = byPerformance.get(performance.id)
        if (entry === undefined) {
          entry = { showKeys: new Set(), reasons: new Set() }
          byPerformance.set(performance.id, entry)
        }
        entry.showKeys.add(item.show_key)
        for (const reason of reasons) entry.reasons.add(reason)
      }
    }
  }
  return appearances
}

/** Totals one song's appearance map into the counts and breakdowns the API reports. */
export const summarizeAppearances = (
  byPerformance: Map<number, SongPerformanceEntry>,
  performances: Map<number, PerformanceRow>,
): AppearanceSummary => {
  const showKeys = new Set<string>()
  const seriesIds = new Set<number>()
  const years = new Set<number>()
  const reasons = new Set<string>()
  const series = new Map<number, AppearanceBucket>()
  const year = new Map<number, AppearanceBucket>()
  for (const [performanceId, entry] of byPerformance) {
    const performance = performances.get(performanceId)
    if (performance === undefined) continue
    seriesIds.add(performance.series_id)
    for (const key of entry.showKeys) showKeys.add(key)
    for (const reason of entry.reasons) reasons.add(reason)
    const seriesBucket = bucketOf(series, performance.series_id)
    seriesBucket.eventIds.add(performanceId)
    if (performance.series_number !== null) seriesBucket.seriesNumbers.add(performance.series_number)
    for (const key of entry.showKeys) seriesBucket.showKeys.add(key)
    const yearNumber = performanceYear(performance.start_date)
    if (yearNumber === null) continue
    years.add(yearNumber)
    const yearBucket = bucketOf(year, yearNumber)
    yearBucket.eventIds.add(performanceId)
    for (const key of entry.showKeys) yearBucket.showKeys.add(key)
  }
  const firstSeries = new Map<number, number>()
  for (const [seriesId, bucket] of series) {
    if (bucket.seriesNumbers.size === 0) continue
    firstSeries.set(seriesId, Math.min(...bucket.seriesNumbers))
  }
  const sortedYears = [...years].sort((left, right) => left - right)
  return {
    show: showKeys.size,
    event: byPerformance.size,
    performanceCount: byPerformance.size,
    seriesCount: seriesIds.size,
    firstYear: sortedYears[0] ?? null,
    lastYear: sortedYears.at(-1) ?? null,
    approximate: reasons.size > 0,
    reasons: [...reasons].sort(),
    series,
    year,
    firstSeries,
  }
}

/** Breakdown of one bucket map as `{ key: [showCount, eventCount] }`, keys sorted for a stable file. */
export const bucketCountsToRecord = <K extends string | number>(buckets: Map<K, AppearanceBucket>): Record<string, [number, number]> => {
  const entries: [string, [number, number]][] = [...buckets]
    .sort((left, right) => String(left[0]).localeCompare(String(right[0]), 'en'))
    .map(([key, bucket]): [string, [number, number]] => [String(key), [bucket.showKeys.size, bucket.eventIds.size]])
  return Object.fromEntries(entries)
}

/** Deterministic text of a bucket map, so two maps compare by value and not by insertion order. */
const bucketSignature = <K extends string | number>(buckets: Map<K, AppearanceBucket>): string => {
  return JSON.stringify(bucketCountsToRecord(buckets))
}

/** Counts that include broadcast 演出, in the compact shape the Worker file uses. */
export const altCountsOf = (summary: AppearanceSummary): NonNullable<ApiSongRow['withBroadcast']> => {
  return {
    show: summary.show,
    event: summary.event,
    firstYear: summary.firstYear,
    lastYear: summary.lastYear,
    series: bucketCountsToRecord(summary.series),
    year: bucketCountsToRecord(summary.year),
  }
}

/** Whether two summaries agree on every number the API publishes. */
export const sameCounts = (left: AppearanceSummary, right: AppearanceSummary): boolean => {
  if (left.show !== right.show || left.event !== right.event) return false
  if (left.firstYear !== right.firstYear || left.lastYear !== right.lastYear) return false
  if (bucketSignature(left.series) !== bucketSignature(right.series)) return false
  return bucketSignature(left.year) === bucketSignature(right.year)
}

/** Fails the build when the API counts drift from the site's own ranking function. */
export const validateTotals = (
  mode: RankingMode,
  label: string,
  rankings: ReturnType<typeof rankSongAppearances>,
  summaries: Map<number, AppearanceSummary>,
  appearances: SongAppearances,
): void => {
  const ranked = new Set<number>()
  for (const row of rankings) {
    ranked.add(row.songId)
    const summary = summaries.get(row.songId)
    if (summary === undefined) throw new Error(`API ${label} ${mode} counts are missing song ${row.songId}`)
    const count = mode === 'show' ? summary.show : summary.event
    if (count !== row.count) {
      throw new Error(`API ${label} ${mode} count for song ${row.songId} is ${count}, site ranking says ${row.count}`)
    }
    if (summary.performanceCount !== row.performanceCount) {
      throw new Error(`API ${label} ${mode} performance count for song ${row.songId} disagrees with the site ranking`)
    }
    if (summary.seriesCount !== row.seriesCount) {
      throw new Error(`API ${label} ${mode} series count for song ${row.songId} disagrees with the site ranking`)
    }
    if (summary.approximate !== row.approximate) {
      throw new Error(`API ${label} ${mode} approximation flag for song ${row.songId} disagrees with the site ranking`)
    }
    if (summary.firstYear !== row.firstYear || summary.lastYear !== row.lastYear) {
      throw new Error(`API ${label} ${mode} year range for song ${row.songId} disagrees with the site ranking`)
    }
  }
  for (const songId of appearances.keys()) {
    if (!ranked.has(songId)) throw new Error(`API ${label} ${mode} has appearances for unranked song ${songId}`)
  }
}

/** Base character names of a merged variant group, in config order. */
export const charactersOf = (songs: readonly SongRow[], rules: readonly CharacterRule[]): string[] => {
  const matched = new Set<string>()
  for (const song of songs) {
    const assigned = assignCharacters(rules, { vocalists: song.vocalists, artistString: song.artist_string })
    for (const name of assigned.characters) matched.add(name)
  }
  return rules.map((rule) => rule.name).filter((name) => matched.has(name))
}

/** Producer names of a merged variant group, structured credits first. */
export const producersOf = (songs: readonly SongRow[]): string[] => producerNamesForSongs(songs)

