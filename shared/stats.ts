import { BANDS, bandForCount } from './bands.ts'
import { performanceSchedules, showsForNotes } from './event-schedule.ts'
import { reviewRotations } from './rotation.ts'
import { emptySongVariantIndex, type SongVariantIndex } from './song-variants.ts'
import type {
  BandId,
  Catalog,
  CompareGrouping,
  PerformanceRow,
  Platform,
  SongRow,
  VideoRow,
  ViewSnapshotRow,
} from './types.ts'

/** One song's representative video and latest view count on a platform. */
export type SongPlayback = {
  songId: number
  video: VideoRow | null
  viewCount: number | null
  band: BandId
}

/** Counts and share of songs in one playback band. */
export type BandSummary = {
  id: BandId
  label: string
  count: number
  ratio: number | null
}

/** Comparison row for a series, series year, or calendar year. */
export type CompareRow = {
  key: string
  label: string
  songCount: number
  bands: BandSummary[]
}

/** Before/after observation at a setlist or premiere instant. */
export type WindowStatus = 'ok' | 'insufficient'

/** Playback change around one event time for one song. */
export type WindowObservation = {
  songId: number
  status: WindowStatus
  before: number | null
  after: number | null
  delta: number | null
}

/**
 * Picks the representative PV for a song on one platform.
 * Enabled Original PVs win; otherwise the lowest VocaDB PV id among enabled PVs.
 */
export const representativeVideo = (
  videos: readonly VideoRow[],
  songId: number,
  platform: Platform,
): VideoRow | null => representativeVideoForSongs(videos, [songId], platform)

/**
 * Picks one representative PV across a merged song group on one platform.
 * Enabled Original PVs win; otherwise the lowest VocaDB PV id.
 */
export const representativeVideoForSongs = (
  videos: readonly VideoRow[],
  songIds: readonly number[],
  platform: Platform,
): VideoRow | null => {
  const ids = new Set(songIds)
  const enabled = videos.filter((video) => ids.has(video.song_id) && video.platform === platform && video.disabled === 0)
  if (enabled.length === 0) return null
  const originals = enabled.filter((video) => video.pv_type === 'Original')
  const pool = originals.length > 0 ? originals : enabled
  return pool.reduce((best, video) => (video.vocadb_pv_id < best.vocadb_pv_id ? video : best))
}

/**
 * Latest snapshot at or before an optional instant.
 * Omit `atOrBefore` to use the newest snapshot of any time.
 */
export const latestSnapshot = (
  snapshots: readonly ViewSnapshotRow[],
  platform: Platform,
  platformVideoId: string,
  atOrBefore?: string,
): ViewSnapshotRow | null => {
  let best: ViewSnapshotRow | null = null
  for (const snapshot of snapshots) {
    if (snapshot.platform !== platform || snapshot.platform_video_id !== platformVideoId) continue
    if (atOrBefore !== undefined && snapshot.collected_at > atOrBefore) continue
    if (best === null || snapshot.collected_at > best.collected_at) best = snapshot
  }
  return best
}

/**
 * Earliest snapshot strictly after an instant.
 * Used for the "after" side of an observation window.
 */
export const earliestSnapshotAfter = (
  snapshots: readonly ViewSnapshotRow[],
  platform: Platform,
  platformVideoId: string,
  after: string,
): ViewSnapshotRow | null => {
  let best: ViewSnapshotRow | null = null
  for (const snapshot of snapshots) {
    if (snapshot.platform !== platform || snapshot.platform_video_id !== platformVideoId) continue
    if (snapshot.collected_at <= after) continue
    if (best === null || snapshot.collected_at < best.collected_at) best = snapshot
  }
  return best
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

/** Canonical song ids on one performance's setlist. Performances without a list contribute nothing. */
export const songIdsForPerformance = (
  catalog: Catalog,
  performanceId: number,
  variants: SongVariantIndex = emptySongVariantIndex(),
): number[] => {
  const performance = catalog.performances.find((row) => row.id === performanceId)
  if (!performance || performance.song_list_id === null) return []
  return countedSongIds(catalog, [performance.song_list_id], variants)
}

/** Current playback band for each song on the selected platform. */
export const playbackForSongs = (
  catalog: Catalog,
  songIds: readonly number[],
  platform: Platform,
  variants: SongVariantIndex = emptySongVariantIndex(),
): SongPlayback[] => {
  return songIds.map((songId) => {
    const video = representativeVideoForSongs(catalog.videos, variants.groupSongIds(songId), platform)
    const snapshot = video ? latestSnapshot(catalog.snapshots, platform, video.platform_video_id) : null
    const viewCount = snapshot ? snapshot.view_count : null
    return { songId, video, viewCount, band: bandForCount(viewCount) }
  })
}

/** Band counts and ratios for a song set. Ratio is null when the set is empty. */
export const summarizeBands = (playbacks: readonly SongPlayback[]): BandSummary[] => {
  const total = playbacks.length
  return BANDS.map((band) => {
    const count = playbacks.filter((row) => row.band === band.id).length
    return {
      id: band.id,
      label: band.label,
      count,
      ratio: total === 0 ? null : count / total,
    }
  })
}

/** Label for a comparison group. */
const groupLabel = (catalog: Catalog, grouping: CompareGrouping, key: string): string => {
  if (grouping === 'series') {
    const series = catalog.series.find((row) => String(row.id) === key)
    return series ? series.name : key
  }
  if (grouping === 'edition') {
    const [seriesId, seriesNumber] = key.split(':')
    const series = catalog.series.find((row) => String(row.id) === seriesId)
    const name = series ? series.name : seriesId
    return `${name} ${seriesNumber}`
  }
  return key
}

/**
 * Unique counted songs per series, series year, or performance calendar year.
 * Series-year groups use series_number (内部仍叫 edition). Year groups use the performance start_date year.
 */
export const compareBy = (
  catalog: Catalog,
  platform: Platform,
  grouping: CompareGrouping,
  variants: SongVariantIndex = emptySongVariantIndex(),
): CompareRow[] => {
  const buckets = new Map<string, Set<number>>()
  for (const performance of catalog.performances) {
    let key: string | null = null
    if (grouping === 'series') key = String(performance.series_id)
    else if (grouping === 'edition') {
      if (performance.series_number === null) continue
      key = `${performance.series_id}:${performance.series_number}`
    } else if (performance.start_date) key = performance.start_date.slice(0, 4)
    if (key === null || performance.song_list_id === null) continue
    const songs = buckets.get(key) ?? new Set<number>()
    for (const songId of countedSongIds(catalog, [performance.song_list_id], variants)) songs.add(songId)
    buckets.set(key, songs)
  }
  const rows: CompareRow[] = []
  for (const [key, songIds] of buckets) {
    const playbacks = playbackForSongs(catalog, [...songIds], platform, variants)
    rows.push({
      key,
      label: groupLabel(catalog, grouping, key),
      songCount: songIds.size,
      bands: summarizeBands(playbacks),
    })
  }
  rows.sort((left, right) => left.key.localeCompare(right.key, 'en'))
  return rows
}

/**
 * Compares the latest snapshot strictly before an instant with the earliest strictly after it.
 * Either side missing yields insufficient and does not extrapolate a curve.
 */
export const observeWindow = (
  catalog: Catalog,
  songIds: readonly number[],
  platform: Platform,
  instant: string | null,
  variants: SongVariantIndex = emptySongVariantIndex(),
): WindowObservation[] => {
  return songIds.map((songId) => {
    if (instant === null) {
      return { songId, status: 'insufficient', before: null, after: null, delta: null }
    }
    const video = representativeVideoForSongs(catalog.videos, variants.groupSongIds(songId), platform)
    if (!video) return { songId, status: 'insufficient', before: null, after: null, delta: null }
    const before = latestSnapshot(
      catalog.snapshots.filter((snapshot) => snapshot.collected_at < instant),
      platform,
      video.platform_video_id,
    )
    const after = earliestSnapshotAfter(catalog.snapshots, platform, video.platform_video_id, instant)
    if (!before || !after) return { songId, status: 'insufficient', before: before?.view_count ?? null, after: after?.view_count ?? null, delta: null }
    return {
      songId,
      status: 'ok',
      before: before.view_count,
      after: after.view_count,
      delta: after.view_count - before.view_count,
    }
  })
}

/** ISO instant at the start of a VocaDB calendar day. Day precision stays explicit. */
export const dayInstant = (day: string | null): string | null => {
  if (day === null || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return null
  return `${day}T00:00:00.000Z`
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
  firstYear: number | null
  lastYear: number | null
  approximate: boolean
  reasons: string[]
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
 */
const performanceIncluded = (
  performance: PerformanceRow,
  options: RankingOptions,
  knownSeries: ReadonlySet<number>,
): boolean => {
  if (!knownSeries.has(performance.series_id) || performance.song_list_id === null) return false
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
  years: Set<number>
  reasons: Set<string>
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

  const buckets = new Map<number, RankingBucket>()
  /** Records one 场次 or 演出 toward a song; `key` dedupes within the bucket and uncertainty is kept in both modes. */
  const addAppearance = (
    songId: number,
    key: string,
    seriesId: number,
    year: number | null,
    reasons: readonly string[],
  ): void => {
    const bucket = buckets.get(songId) ?? { keys: new Set<string>(), seriesIds: new Set<number>(), years: new Set<number>(), reasons: new Set<string>() }
    bucket.keys.add(key)
    bucket.seriesIds.add(seriesId)
    if (year !== null) bucket.years.add(year)
    for (const reason of reasons) bucket.reasons.add(reason)
    buckets.set(songId, bucket)
  }

  for (const performance of catalog.performances) {
    if (!performanceIncluded(performance, options, knownSeries)) continue
    const listId = performance.song_list_id
    if (listId === null) continue
    const year = performanceYear(performance.start_date)
    const shows = schedules.get(performance.id) ?? []
    for (const link of catalog.setlistItemSongs) {
      if (link.song_list_id !== listId || !itemKeys.has(`${link.song_list_id}:${link.position}`)) continue
      if (link.role !== 'listed' && options.includeMedleyComponents !== true) continue
      const line = lineByKey.get(`${link.song_list_id}:${link.position}`)
      if (!line || !line.performanceIds.includes(performance.id)) continue
      const songId = variants.canonicalSongId(link.song_id)
      const reasons = line.uncertain ? line.reasons : []
      if (mode === 'event') {
        addAppearance(songId, String(performance.id), performance.series_id, year, reasons)
        continue
      }
      for (const show of showsForNotes(line.notes, performance, shows)) {
        addAppearance(songId, show.key, performance.series_id, year, reasons)
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
      firstYear: years.length === 0 ? null : Math.min(...years),
      lastYear: years.length === 0 ? null : Math.max(...years),
      approximate: bucket.reasons.size > 0,
      reasons: [...bucket.reasons].sort(),
      variantSongIds: variants.variantSongIdsOf(songId),
    })
  }
  rows.sort((left, right) => right.count - left.count || left.songId - right.songId)
  return rows
}
