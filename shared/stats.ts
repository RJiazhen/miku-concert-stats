import { performanceSchedules, showsForNotes } from './event-schedule.ts'
import { derivedItemSongIds } from './performance-setlists.ts'
import { reviewRotations } from './rotation.ts'
import { emptySongVariantIndex, type SongVariantIndex } from './song-variants.ts'
import type {
  Catalog,
  PerformanceRow,
  PerformanceShowSetlistItemRow,
  PerformanceShowSetlistRow,
  SongRow,
} from './types.ts'

/** Reason codes of one derived 場次, parsed from its JSON column. */
const reasonsOfDerivedShow = (row: PerformanceShowSetlistRow | undefined): string[] => {
  if (!row || row.uncertain === 0) return []
  try {
    const parsed: unknown = JSON.parse(row.reasons)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((value): value is string => typeof value === 'string')
  } catch {
    return []
  }
}

/**
 * Canonical song ids counted for a set of song-list ids.
 * Quarantined mashup lines are omitted. Component songs replace the mashup entry.
 * Variants are folded into their canonical song before de-duplication.
 */
export const countedSongIds = (
  catalog: Catalog,
  songListIds: readonly number[],
  variants: SongVariantIndex = emptySongVariantIndex(),
): number[] => {
  const lists = new Set(songListIds)
  const quarantined = new Set(catalog.medleyQuarantine.filter((row) => lists.has(row.song_list_id)).map((row) => `${row.song_list_id}:${row.position}`))
  const ids = new Set<number>()
  for (const link of catalog.setlistItemSongs) {
    if (!lists.has(link.song_list_id)) continue
    if (quarantined.has(`${link.song_list_id}:${link.position}`)) continue
    ids.add(variants.canonicalSongId(link.song_id))
  }
  return [...ids].sort((left, right) => left - right)
}

/** Looks up a song row. */
export const songById = (catalog: Catalog, songId: number): SongRow | undefined => {
  return catalog.songs.find((song) => song.id === songId)
}

/**
 * The unit a song appearance is counted in.
 * `show` counts once per 场次 (a calendar day, or one half of a day that had two shows).
 * `event` counts once per 演出 (one VocaDB release event / one `performances` row / one city stop).
 */
export type RankingMode = 'show' | 'event'

/**
 * Filters for song appearance ranking.
 * Omitted series and year bounds include everything. Broadcasts and medley components stay out unless enabled.
 * Omitted mode defaults to `show`, i.e. 按场次.
 */
export type RankingOptions = {
  mode?: RankingMode
  seriesIds?: readonly number[]
  yearFrom?: number | null
  yearTo?: number | null
  includeBroadcast?: boolean
  includeMedleyComponents?: boolean
  /** Variant mapping used to fold remixes, voicebank versions, and covers into one song. */
  variants?: SongVariantIndex
}

/** One song's appearance count under the active filters. */
export type SongRanking = {
  songId: number
  name: string
  artists: string | null
  count: number
  seriesCount: number
  /** Distinct 演出 the song appeared in, regardless of the counting mode. */
  performanceCount: number
  firstYear: number | null
  lastYear: number | null
  approximate: boolean
  reasons: string[]
  /** 演出 whose 场次 could not be pinned down, so the count is a lower-confidence estimate. */
  approximatePerformanceIds: number[]
  /** Variant song ids merged into this row, sorted. Empty when the song stands alone. */
  variantSongIds: number[]
}

/** Livestream, online, and VR wording on a performance name or series suffix. */
const BROADCAST_NAME = /livestream|online|オンライン|\bVR\b|ＶＲ|配信/i

/** Fields needed to tell whether a performance is a livestream, online show, or VR show. */
export type BroadcastLabel = Pick<PerformanceRow, 'role' | 'name' | 'name_ja' | 'series_suffix'>

/**
 * Whether a performance is a broadcast, livestream, online show, or VR show.
 * Event descriptions are not stored on the performance row, so the text check uses name, name_ja, and series_suffix.
 */
export const isBroadcastAppearance = (performance: BroadcastLabel): boolean => {
  if (performance.role === 'broadcast') return true
  const haystack = `${performance.name}\n${performance.name_ja ?? ''}\n${performance.series_suffix ?? ''}`
  return BROADCAST_NAME.test(haystack)
}

/** Calendar year of a performance start date. Missing or non-day values contribute no year. */
export const performanceYear = (startDate: string | null): number | null => {
  if (startDate === null || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return null
  return Number(startDate.slice(0, 4))
}

/**
 * Whether a performance can contribute to the ranking.
 * An empty series id list means every known series. A year bound drops performances with no start date.
 * A 演出 needs a setlist recorded somewhere — upstream or in this project's derived layer — but that
 * check happens where the rows are read, so a wiki-only 演出 is not dropped here.
 */
const performanceIncluded = (
  performance: PerformanceRow,
  options: RankingOptions,
  knownSeries: ReadonlySet<number>,
): boolean => {
  if (!knownSeries.has(performance.series_id)) return false
  const seriesIds = options.seriesIds
  if (seriesIds && seriesIds.length > 0 && !seriesIds.includes(performance.series_id)) return false
  const yearFrom = options.yearFrom ?? null
  const yearTo = options.yearTo ?? null
  const year = performanceYear(performance.start_date)
  if (yearFrom !== null || yearTo !== null) {
    if (year === null) return false
    if (yearFrom !== null && year < yearFrom) return false
    if (yearTo !== null && year > yearTo) return false
  }
  if (options.includeBroadcast !== true && isBroadcastAppearance(performance)) return false
  return true
}

/** Running distinct 场次 or 演出, series, years, and uncertainty for one song. */
type RankingBucket = {
  keys: Set<string>
  seriesIds: Set<number>
  /** Distinct `performances` rows behind the counted keys. */
  performanceIds: Set<number>
  years: Set<number>
  reasons: Set<string>
  /** 演出 behind an uncertain line, so the tooltip can name them. */
  approximatePerformanceIds: Set<number>
}

/**
 * Ranks songs by 场次 or 演出 appearances.
 *
 * `event` mode counts a song at most once per `performances` row, so 大阪 and 东京 stops of one
 * year each count once. `show` mode counts the derived 场次 instead: a three-day run contributes
 * three, and a day with a daytime and a night-time show contributes two.
 *
 * A setlist line is attributed to the 场次 of one 演出 with `showsForNotes`: a note naming a day
 * or half narrows the line, otherwise the line counts for every 场次 of that run. Undated
 * performances have no 场次 and therefore contribute nothing in `show` mode.
 *
 * The derived 場次 layer is read first, so a 演出 whose setlist is recorded only in this project
 * (a wiki table with no upstream VocaDB list) counts exactly like one with an upstream list.
 * Only a 演出 without derived rows falls back to the source list and `showsForNotes`.
 *
 * Direct lines use role `listed`. Role `component` is included only when `includeMedleyComponents` is true.
 */
export const rankSongAppearances = (catalog: Catalog, options: RankingOptions = {}): SongRanking[] => {
  const mode: RankingMode = options.mode === 'event' ? 'event' : 'show'
  const variants = options.variants ?? emptySongVariantIndex()
  const knownSeries = new Set(catalog.series.map((row) => row.id))
  const itemKeys = new Set(catalog.setlistItems.map((row) => `${row.song_list_id}:${row.position}`))
  const rotation = reviewRotations(catalog)
  const lineByKey = new Map(rotation.lines.map((line) => [`${line.songListId}:${line.position}`, line]))
  const schedules = performanceSchedules(catalog, rotation)
  // The derived 場次 layer already resolved every note, so counts read it directly when present.
  const derivedByPerformance = new Map<number, PerformanceShowSetlistItemRow[]>()
  for (const item of catalog.performanceShowSetlistItems) {
    const bucket = derivedByPerformance.get(item.performance_id) ?? []
    bucket.push(item)
    derivedByPerformance.set(item.performance_id, bucket)
  }
  const derivedShowByKey = new Map(catalog.performanceShowSetlists.map((row) => [row.show_key, row]))

  const buckets = new Map<number, RankingBucket>()
  /** Records one 场次 or 演出 toward a song; `key` dedupes within the bucket and uncertainty is kept in both modes. */
  const addAppearance = (
    songId: number,
    key: string,
    seriesId: number,
    performanceId: number,
    year: number | null,
    reasons: readonly string[],
  ): void => {
    const bucket = buckets.get(songId) ?? {
      keys: new Set<string>(),
      seriesIds: new Set<number>(),
      performanceIds: new Set<number>(),
      years: new Set<number>(),
      reasons: new Set<string>(),
      approximatePerformanceIds: new Set<number>(),
    }
    bucket.keys.add(key)
    bucket.seriesIds.add(seriesId)
    bucket.performanceIds.add(performanceId)
    if (year !== null) bucket.years.add(year)
    if (reasons.length > 0) bucket.approximatePerformanceIds.add(performanceId)
    for (const reason of reasons) bucket.reasons.add(reason)
    buckets.set(songId, bucket)
  }

  for (const performance of catalog.performances) {
    if (!performanceIncluded(performance, options, knownSeries)) continue
    const year = performanceYear(performance.start_date)
    const shows = schedules.get(performance.id) ?? []
    const derived = derivedByPerformance.get(performance.id)
    if (derived !== undefined && derived.length > 0) {
      for (const item of derived) {
        const reasons = reasonsOfDerivedShow(derivedShowByKey.get(item.show_key))
        for (const songId of derivedItemSongIds(catalog, item)) {
          const canonical = variants.canonicalSongId(songId)
          const key = mode === 'event' ? String(performance.id) : item.show_key
          addAppearance(canonical, key, performance.series_id, performance.id, year, reasons)
        }
      }
      continue
    }
    // Without derived rows the source layer is the only record; a 演出 with neither contributes nothing.
    const listId = performance.song_list_id
    if (listId === null) continue
    for (const link of catalog.setlistItemSongs) {
      if (link.song_list_id !== listId || !itemKeys.has(`${link.song_list_id}:${link.position}`)) continue
      if (link.role !== 'listed' && options.includeMedleyComponents !== true) continue
      const line = lineByKey.get(`${link.song_list_id}:${link.position}`)
      if (!line || !line.performanceIds.includes(performance.id)) continue
      const songId = variants.canonicalSongId(link.song_id)
      const reasons = line.uncertain ? line.reasons : []
      if (mode === 'event') {
        addAppearance(songId, String(performance.id), performance.series_id, performance.id, year, reasons)
        continue
      }
      for (const show of showsForNotes(line.notes, performance, shows)) {
        addAppearance(songId, show.key, performance.series_id, performance.id, year, reasons)
      }
    }
  }

  const songsById = new Map(catalog.songs.map((song) => [song.id, song]))
  const rows: SongRanking[] = []
  for (const [songId, bucket] of buckets) {
    const song = songsById.get(songId)
    const years = [...bucket.years]
    rows.push({
      songId,
      name: song?.name ?? String(songId),
      artists: song?.artist_string ?? null,
      count: bucket.keys.size,
      seriesCount: bucket.seriesIds.size,
      performanceCount: bucket.performanceIds.size,
      firstYear: years.length === 0 ? null : Math.min(...years),
      lastYear: years.length === 0 ? null : Math.max(...years),
      approximate: bucket.reasons.size > 0,
      reasons: [...bucket.reasons].sort(),
      approximatePerformanceIds: [...bucket.approximatePerformanceIds].sort((left, right) => left - right),
      variantSongIds: variants.variantSongIdsOf(songId),
    })
  }
  rows.sort((left, right) => right.count - left.count || left.songId - right.songId)
  return rows
}
