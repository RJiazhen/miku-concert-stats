import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Database from 'better-sqlite3'
import { loadCatalog } from '../shared/catalog.ts'
import { producerCredit } from '../shared/credit.ts'
import { performanceSchedules } from '../shared/event-schedule.ts'
import {
  catalogSchedules,
  derivedItemSongIds,
  derivedItemsByShow,
  setlistPerformanceIds,
  showCountsByPerformance,
} from '../shared/performance-setlists.ts'
import { reviewRotations } from '../shared/rotation.ts'
import { parseSongTitles } from '../shared/song-titles.ts'
import { parseSongVariants, type SongVariantIndex } from '../shared/song-variants.ts'
import { isBroadcastAppearance, performanceYear, rankSongAppearances, type RankingMode } from '../shared/stats.ts'
import type {
  Catalog,
  PerformanceRow,
  PerformanceShowSetlistItemRow,
  PerformanceShowSetlistRow,
  SongRow,
} from '../shared/types.ts'

/** Public origin of the deployed site; every file in the API is served from here. */
const BASE_URL = 'https://miku-concert-stats.rjiazhen.top'

/** Directory, relative to the repository root, that holds the generated JSON API. */
const API_DIRECTORY = path.join('public', 'api', 'v1')

/** Directory bundled into the Worker for the search and ranking routes. */
const SERVER_ASSET_DIRECTORY = path.join('server', 'assets', 'api')

/** Repository root, whether this file is run from tsx or compiled output. */
const repoRoot = (): string => {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
}

/** Reads and parses one JSON file, with the file path in the error when it is malformed. */
const readJsonFile = <T>(file: string): T => {
  return JSON.parse(readFileSync(file, 'utf8')) as T
}

/** First 16 hex characters of the gzipped catalog hash, matching the site's cache key. */
const catalogVersion = (root: string): string => {
  const file = path.join(root, 'public', 'data', 'catalog.sqlite.gz')
  if (!existsSync(file)) return ''
  return createHash('sha256').update(readFileSync(file)).digest('hex').slice(0, 16)
}

/** Parses the JSON reason list stored on a derived 場次 row. */
const parseReasons = (raw: string): string[] => {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((value): value is string => typeof value === 'string')
  } catch {
    return []
  }
}

/** Writes one compact JSON file, creating its parent directory first. */
const writeJson = (root: string, relative: string, payload: unknown): void => {
  const file = path.join(root, relative)
  mkdirSync(path.dirname(file), { recursive: true })
  writeFileSync(file, `${JSON.stringify(payload)}\n`)
}

/** One song's presence in one 演出, with the 場次 that played it. */
type SongPerformanceEntry = {
  showKeys: Set<string>
  reasons: Set<string>
}

/** Song id to 演出 id to that 演出's appearance details. */
type SongAppearances = Map<number, Map<number, SongPerformanceEntry>>

/** Appearance totals for one song across every included 演出. */
type SongTotals = {
  showCount: number
  eventCount: number
  performanceCount: number
  seriesCount: number
  firstYear: number | null
  lastYear: number | null
  approximate: boolean
  reasons: string[]
}

/** Builds song → 演出 → 場次 presence from the derived setlist layer. */
const buildAppearances = (catalog: Catalog, variants: SongVariantIndex): SongAppearances => {
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
    if (performance.song_list_id === null) continue
    if (isBroadcastAppearance(performance)) continue
    const items = itemsByPerformance.get(performance.id) ?? []
    for (const item of items) {
      const show = showByKey.get(item.show_key)
      const reasons = show && show.uncertain === 1 ? parseReasons(show.reasons) : []
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

/** Totals one song's appearance map, matching the site's ranking semantics. */
const summarizeAppearances = (byPerformance: Map<number, SongPerformanceEntry>, performances: Map<number, PerformanceRow>): SongTotals => {
  const showKeys = new Set<string>()
  const seriesIds = new Set<number>()
  const years = new Set<number>()
  const reasons = new Set<string>()
  for (const [performanceId, entry] of byPerformance) {
    const performance = performances.get(performanceId)
    if (performance === undefined) continue
    seriesIds.add(performance.series_id)
    for (const key of entry.showKeys) showKeys.add(key)
    for (const reason of entry.reasons) reasons.add(reason)
    const year = performanceYear(performance.start_date)
    if (year !== null) years.add(year)
  }
  const sortedYears = [...years].sort((left, right) => left - right)
  return {
    showCount: showKeys.size,
    eventCount: byPerformance.size,
    performanceCount: byPerformance.size,
    seriesCount: seriesIds.size,
    firstYear: sortedYears[0] ?? null,
    lastYear: sortedYears.at(-1) ?? null,
    approximate: reasons.size > 0,
    reasons: [...reasons].sort(),
  }
}

/** Fails the build when the API counts drift from the site's own ranking function. */
const validateTotals = (
  mode: RankingMode,
  rankings: ReturnType<typeof rankSongAppearances>,
  totals: Map<number, SongTotals>,
  appearances: SongAppearances,
): void => {
  const rankedIds = new Set<number>()
  for (const row of rankings) {
    rankedIds.add(row.songId)
    const computed = totals.get(row.songId)
    if (computed === undefined) throw new Error(`API ${mode} counts missing song ${row.songId}`)
    const count = mode === 'show' ? computed.showCount : computed.eventCount
    if (count !== row.count) {
      throw new Error(`API ${mode} count for song ${row.songId} is ${count}, site ranking says ${row.count}`)
    }
    if (computed.performanceCount !== row.performanceCount) {
      throw new Error(`API performance count for song ${row.songId} is ${computed.performanceCount}, site ranking says ${row.performanceCount}`)
    }
    if (computed.seriesCount !== row.seriesCount) {
      throw new Error(`API series count for song ${row.songId} is ${computed.seriesCount}, site ranking says ${row.seriesCount}`)
    }
    if (computed.approximate !== row.approximate) {
      throw new Error(`API approximation flag for song ${row.songId} disagrees with the site ranking`)
    }
    if (computed.firstYear !== row.firstYear || computed.lastYear !== row.lastYear) {
      throw new Error(`API year range for song ${row.songId} disagrees with the site ranking`)
    }
  }
  for (const songId of appearances.keys()) {
    if (!rankedIds.has(songId)) throw new Error(`API has ${mode} appearances for unranked song ${songId}`)
  }
}

/** One series/year bucket of one song's appearances. */
type AppearanceBucket = {
  showKeys: Set<string>
  eventIds: Set<number>
  seriesNumbers: Set<number>
}

/** Groups one song's appearances by series and by calendar year. */
const buildBreakdowns = (
  byPerformance: Map<number, SongPerformanceEntry>,
  performances: Map<number, PerformanceRow>,
): { bySeries: Map<number, AppearanceBucket>; byYear: Map<number, AppearanceBucket> } => {
  const bySeries = new Map<number, AppearanceBucket>()
  const byYear = new Map<number, AppearanceBucket>()
  for (const [performanceId, entry] of byPerformance) {
    const performance = performances.get(performanceId)
    if (performance === undefined) continue
    let seriesBucket = bySeries.get(performance.series_id)
    if (seriesBucket === undefined) {
      seriesBucket = { showKeys: new Set(), eventIds: new Set(), seriesNumbers: new Set() }
      bySeries.set(performance.series_id, seriesBucket)
    }
    seriesBucket.eventIds.add(performanceId)
    if (performance.series_number !== null) seriesBucket.seriesNumbers.add(performance.series_number)
    const year = performanceYear(performance.start_date)
    if (year === null) {
      for (const key of entry.showKeys) seriesBucket.showKeys.add(key)
      continue
    }
    let yearBucket = byYear.get(year)
    if (yearBucket === undefined) {
      yearBucket = { showKeys: new Set(), eventIds: new Set(), seriesNumbers: new Set() }
      byYear.set(year, yearBucket)
    }
    yearBucket.eventIds.add(performanceId)
    for (const key of entry.showKeys) {
      seriesBucket.showKeys.add(key)
      yearBucket.showKeys.add(key)
    }
  }
  return { bySeries, byYear }
}

/** Earliest 演出 a song appeared in; undated stops sort last, then by id. */
const firstPerformanceOf = (byPerformance: Map<number, SongPerformanceEntry>, performances: Map<number, PerformanceRow>): PerformanceRow | null => {
  let best: PerformanceRow | null = null
  for (const performanceId of byPerformance.keys()) {
    const performance = performances.get(performanceId)
    if (performance === undefined) continue
    if (best === null) {
      best = performance
      continue
    }
    const left = performance.start_date ?? '9999-99-99'
    const right = best.start_date ?? '9999-99-99'
    if (left < right || (left === right && performance.id < best.id)) best = performance
  }
  return best
}

/** Public projection of one song used by both the list and the detail file. */
type SongSummary = {
  id: number
  name: string
  nameJa: string | null
  nameEn: string | null
  nameZh: string | null
  producer: string | null
  category: SongRow['category']
  publishDate: string | null
  showCount: number
  eventCount: number
  performanceCount: number
  seriesCount: number
  firstYear: number | null
  lastYear: number | null
  approximate: boolean
  firstPerformance: { id: number; name: string; startDate: string | null } | null
  variantCount: number
  sourceUrl: string
  url: string
}

/** Builds the public song summary from catalog rows and precomputed totals. */
const songSummary = (
  song: SongRow,
  totals: SongTotals,
  first: PerformanceRow | null,
  variants: SongVariantIndex,
  titlesZh: Record<string, { title: string }>,
): SongSummary => {
  return {
    id: song.id,
    name: song.name,
    nameJa: song.name_ja,
    nameEn: song.name_en,
    nameZh: titlesZh[String(song.id)]?.title ?? null,
    producer: producerCredit(song.artist_string),
    category: song.category,
    publishDate: song.publish_date,
    showCount: totals.showCount,
    eventCount: totals.eventCount,
    performanceCount: totals.performanceCount,
    seriesCount: totals.seriesCount,
    firstYear: totals.firstYear,
    lastYear: totals.lastYear,
    approximate: totals.approximate,
    firstPerformance: first === null ? null : { id: first.id, name: first.name, startDate: first.start_date },
    variantCount: variants.variantSongIdsOf(song.id).length,
    sourceUrl: song.source_url,
    url: `${BASE_URL}/songs/${song.id}`,
  }
}

/** Public projection of a 演出, used by the series index and the performance detail. */
type PerformanceSummary = {
  id: number
  name: string
  nameJa: string | null
  series: { id: number; name: string }
  seriesNumber: number | null
  seriesSuffix: string | null
  venue: string | null
  countryCode: string | null
  startDate: string | null
  endDate: string | null
  role: PerformanceRow['role']
  broadcast: boolean
  showCount: number
  hasSetlist: boolean
  status: string | null
  sourceUrl: string
  url: string
}

/** Public projection of a 演出, used by the series index and the performance detail. */
const performanceSummary = (
  performance: PerformanceRow,
  seriesName: string,
  showCount: number,
  hasSetlist: boolean,
  status: string | null,
): PerformanceSummary => {
  return {
    id: performance.id,
    name: performance.name,
    nameJa: performance.name_ja,
    series: { id: performance.series_id, name: seriesName },
    seriesNumber: performance.series_number,
    seriesSuffix: performance.series_suffix,
    venue: performance.venue_name,
    countryCode: performance.country_code,
    startDate: performance.start_date,
    endDate: performance.end_date,
    role: performance.role,
    broadcast: isBroadcastAppearance(performance),
    showCount,
    hasSetlist,
    status,
    sourceUrl: performance.source_url,
    url: `${BASE_URL}/shows/${performance.id}`,
  }
}

/** One ordered setlist row, with medleys expanded to their parts. */
const setlistItemPayload = (
  catalog: Catalog,
  item: PerformanceShowSetlistItemRow,
  songsById: Map<number, SongRow>,
  medleyNames: Map<number, string>,
): Record<string, unknown> => {
  const base = { position: item.position, evidence: item.evidence, notes: item.notes }
  if (item.song_id !== null) {
    const song = songsById.get(item.song_id)
    return { ...base, songId: item.song_id, name: song?.name ?? String(item.song_id), nameJa: song?.name_ja ?? null }
  }
  const songIds = catalog.medleySongs
    .filter((row) => row.medley_id === item.medley_id)
    .sort((left, right) => left.position - right.position)
    .map((row) => row.song_id)
  return {
    ...base,
    medleyId: item.medley_id,
    medleyName: item.medley_id === null ? null : (medleyNames.get(item.medley_id) ?? null),
    songIds,
    songs: songIds.map((songId) => ({ songId, name: songsById.get(songId)?.name ?? String(songId) })),
  }
}

/** Writes the complete read-only JSON API under `public/api/v1`. */
export const buildApiFiles = (root = repoRoot()): void => {
  const catalogFile = path.join(root, 'public', 'data', 'catalog.sqlite')
  if (!existsSync(catalogFile)) throw new Error(`Missing ${catalogFile}; run pnpm build:catalog first`)

  const db = new Database(catalogFile, { readonly: true, fileMustExist: true })
  let catalog: Catalog
  try {
    catalog = loadCatalog({ all: (sql) => db.prepare(sql).all() as never[] })
  } finally {
    db.close()
  }

  const variants = parseSongVariants(readJsonFile(path.join(root, 'data', 'song-variants.json')))
  const titlesZh = parseSongTitles(readJsonFile(path.join(root, 'data', 'song-titles.zh-CN.json')))
  const review = reviewRotations(catalog)
  const showCounts = showCountsByPerformance(catalog, review)
  const setlistIds = setlistPerformanceIds(catalog)
  const performances = new Map(catalog.performances.map((row) => [row.id, row]))
  const seriesById = new Map(catalog.series.map((row) => [row.id, row]))
  const songsById = new Map(catalog.songs.map((row) => [row.id, row]))
  const statusById = new Map(catalog.performanceStatus.map((row) => [row.performance_id, row.status]))
  const showRows = new Map(catalog.performanceShowSetlists.map((row) => [row.show_key, row]))
  const medleyNames = new Map(catalog.medleys.map((row) => [row.id, row.name]))

  const appearances = buildAppearances(catalog, variants)
  const totals = new Map<number, SongTotals>()
  for (const [songId, byPerformance] of appearances) {
    totals.set(songId, summarizeAppearances(byPerformance, performances))
  }
  const showRanking = rankSongAppearances(catalog, { mode: 'show', variants })
  const eventRanking = rankSongAppearances(catalog, { mode: 'event', variants })
  validateTotals('show', showRanking, totals, appearances)
  validateTotals('event', eventRanking, totals, appearances)

  const canonicalSongs = catalog.songs.filter((song) => !variants.entries.has(song.id))
  const emptyTotals: SongTotals = {
    showCount: 0,
    eventCount: 0,
    performanceCount: 0,
    seriesCount: 0,
    firstYear: null,
    lastYear: null,
    approximate: false,
    reasons: [],
  }
  const songRows = canonicalSongs.map((song) => {
    const byPerformance = appearances.get(song.id) ?? new Map<number, SongPerformanceEntry>()
    return songSummary(
      song,
      totals.get(song.id) ?? emptyTotals,
      firstPerformanceOf(byPerformance, performances),
      variants,
      titlesZh,
    )
  })
  songRows.sort((left, right) => right.showCount - left.showCount || left.id - right.id)

  const apiDirectory = path.join(root, API_DIRECTORY)
  rmSync(apiDirectory, { recursive: true, force: true })
  rmSync(path.join(root, SERVER_ASSET_DIRECTORY), { recursive: true, force: true })

  const showTotal = catalog.performanceShowSetlists.length
  writeJson(root, path.join(API_DIRECTORY, 'index.json'), {
    site: '初音未来演唱会曲目播放统计',
    baseUrl: BASE_URL,
    generatedAt: new Date().toISOString(),
    catalogVersion: catalogVersion(root),
    apiVersion: 1,
    counts: {
      series: catalog.series.length,
      performances: catalog.performances.length,
      songs: canonicalSongs.length,
      setlistShows: showTotal,
    },
    modes: {
      show: '按场次：一天算一场，日场与夜场各算一场；没有场次的演出不计。',
      event: '按演出：每个演出（一个城市站）最多算一次。',
    },
    endpoints: {
      search: '/api/v1/search?q={title}',
      rank: '/api/v1/rank?mode=show&limit=20',
      debuts: '/api/v1/debuts?year=2024',
      songs: '/api/v1/songs.json',
      song: '/api/v1/songs/{id}.json',
      series: '/api/v1/series.json',
      seriesDetail: '/api/v1/series/{id}.json',
      performance: '/api/v1/performances/{id}.json',
    },
  })

  writeJson(root, path.join(API_DIRECTORY, 'songs.json'), { songs: songRows })

  /** Compact per-song counts for the search and ranking routes bundled into the Worker. */
  const rankRows: {
    id: number
    name: string
    nameJa: string | null
    nameEn: string | null
    nameZh: string | null
    producer: string | null
    show: number
    event: number
    firstYear: number | null
    approximate: boolean
    series: Record<string, [number, number]>
    year: Record<string, [number, number]>
    firstSeries: Record<string, number>
  }[] = []

  for (const song of canonicalSongs) {
    const byPerformance = appearances.get(song.id) ?? new Map<number, SongPerformanceEntry>()
    const songTotals = totals.get(song.id) ?? emptyTotals
    const { bySeries, byYear } = buildBreakdowns(byPerformance, performances)
    rankRows.push({
      id: song.id,
      name: song.name,
      nameJa: song.name_ja,
      nameEn: song.name_en,
      nameZh: titlesZh[String(song.id)]?.title ?? null,
      producer: producerCredit(song.artist_string),
      show: songTotals.showCount,
      event: songTotals.eventCount,
      firstYear: songTotals.firstYear,
      approximate: songTotals.approximate,
      series: Object.fromEntries(
        [...bySeries.entries()].map(([seriesId, bucket]) => [String(seriesId), [bucket.showKeys.size, bucket.eventIds.size]]),
      ),
      year: Object.fromEntries(
        [...byYear.entries()].map(([year, bucket]) => [String(year), [bucket.showKeys.size, bucket.eventIds.size]]),
      ),
      firstSeries: Object.fromEntries(
        [...bySeries.entries()]
          .filter(([, bucket]) => bucket.seriesNumbers.size > 0)
          .map(([seriesId, bucket]) => [String(seriesId), Math.min(...bucket.seriesNumbers)]),
      ),
    })
    const performanceRows = [...byPerformance.entries()]
      .map(([performanceId, entry]) => {
        const performance = performances.get(performanceId)
        if (performance === undefined) return null
        return {
          id: performance.id,
          name: performance.name,
          startDate: performance.start_date,
          seriesId: performance.series_id,
          seriesNumber: performance.series_number,
          showKeys: [...entry.showKeys].sort(),
          showCount: entry.showKeys.size,
          approximate: entry.reasons.size > 0,
          reasons: [...entry.reasons].sort(),
        }
      })
      .filter((row): row is NonNullable<typeof row> => row !== null)
      .sort((left, right) => (right.startDate ?? '').localeCompare(left.startDate ?? '') || right.id - left.id)
    writeJson(root, path.join(API_DIRECTORY, 'songs', `${song.id}.json`), {
      song: songSummary(
        song,
        songTotals,
        firstPerformanceOf(byPerformance, performances),
        variants,
        titlesZh,
      ),
      counts: {
        show: songTotals.showCount,
        event: songTotals.eventCount,
        performanceCount: songTotals.performanceCount,
        seriesCount: songTotals.seriesCount,
        firstYear: songTotals.firstYear,
        lastYear: songTotals.lastYear,
        approximate: songTotals.approximate,
        reasons: songTotals.reasons,
      },
      bySeries: [...bySeries.entries()]
        .map(([seriesId, bucket]) => ({
          seriesId,
          name: seriesById.get(seriesId)?.name ?? String(seriesId),
          showCount: bucket.showKeys.size,
          eventCount: bucket.eventIds.size,
          firstSeriesNumber: bucket.seriesNumbers.size === 0 ? null : Math.min(...bucket.seriesNumbers),
          lastSeriesNumber: bucket.seriesNumbers.size === 0 ? null : Math.max(...bucket.seriesNumbers),
        }))
        .sort((left, right) => right.showCount - left.showCount || left.seriesId - right.seriesId),
      byYear: [...byYear.entries()]
        .map(([year, bucket]) => ({ year, showCount: bucket.showKeys.size, eventCount: bucket.eventIds.size }))
        .sort((left, right) => right.year - left.year),
      performances: performanceRows,
      variants: variants.variantSongIdsOf(song.id).map((variantId) => {
        const variant = songsById.get(variantId)
        const entry = variants.entries.get(variantId)
        return {
          id: variantId,
          name: variant?.name ?? String(variantId),
          kind: entry?.kind ?? null,
          note: entry?.note ?? null,
        }
      }),
      sourceUrl: song.source_url,
      url: `${BASE_URL}/songs/${song.id}`,
    })
  }

  writeJson(root, path.join(SERVER_ASSET_DIRECTORY, 'rank.json'), { songs: rankRows })

  const schedules = catalogSchedules(catalog)
  const fallbackSchedules = performanceSchedules(catalog, review)
  for (const performance of catalog.performances) {
    const series = seriesById.get(performance.series_id)
    const derived = schedules.get(performance.id)
    const schedule = derived ?? fallbackSchedules.get(performance.id) ?? []
    const items = derivedItemsByShow(catalog, performance.id)
    const setlist = catalog.performanceSetlists.find((row) => row.performance_id === performance.id)
    const summary = performanceSummary(
      performance,
      series?.name ?? String(performance.series_id),
      showCounts.get(performance.id) ?? 0,
      setlistIds.has(performance.id),
      statusById.get(performance.id) ?? null,
    )
    const detail = {
      ...summary,
      setlist:
        setlist === undefined
          ? null
          : {
              sourceKind: setlist.source_kind,
              change: setlist.change,
              status: setlist.status,
              resolution: setlist.resolution,
              pendingReview: setlist.pending_review === 1,
              conflict: setlist.conflict === 1,
              pageNote: setlist.page_note,
            },
      shows: schedule.map((show) => {
        const row = showRows.get(show.key)
        return {
          showKey: show.key,
          date: show.date === '' ? null : show.date,
          half: show.half,
          label: show.label,
          itemCount: row?.item_count ?? 0,
          uncertain: row?.uncertain === 1,
          reasons: row === undefined ? [] : parseReasons(row.reasons),
          items: (items.get(show.key) ?? []).map((item) => setlistItemPayload(catalog, item, songsById, medleyNames)),
        }
      }),
      sources: catalog.performanceSetlistSources
        .filter((row) => row.performance_id === performance.id)
        .map((row) => ({
          url: row.url,
          title: row.title,
          accessedAt: row.accessed_at,
          confidence: row.confidence,
          note: row.note,
          conflict: row.conflict === 1,
        })),
      links: catalog.performanceLinks
        .filter((row) => row.performance_id === performance.id)
        .map((row) => ({ url: row.url, description: row.description })),
      url: `${BASE_URL}/shows/${performance.id}`,
    }
    writeJson(root, path.join(API_DIRECTORY, 'performances', `${performance.id}.json`), detail)
  }

  const seriesRows = catalog.series.map((series) => {
    const rows = catalog.performances.filter((performance) => performance.series_id === series.id)
    const years = rows
      .map((performance) => performanceYear(performance.start_date))
      .filter((year): year is number => year !== null)
      .sort((left, right) => left - right)
    return {
      id: series.id,
      name: series.name,
      nameJa: series.name_ja,
      sourceUrl: series.source_url,
      performanceCount: rows.length,
      showCount: rows.reduce((total, performance) => total + (showCounts.get(performance.id) ?? 0), 0),
      firstYear: years[0] ?? null,
      lastYear: years.at(-1) ?? null,
      url: `${BASE_URL}/series/${series.id}`,
    }
  })
  seriesRows.sort((left, right) => left.id - right.id)
  writeJson(root, path.join(API_DIRECTORY, 'series.json'), { series: seriesRows })

  for (const series of seriesRows) {
    const performances = catalog.performances
      .filter((performance) => performance.series_id === series.id)
      .map((performance) =>
        performanceSummary(
          performance,
          series.name,
          showCounts.get(performance.id) ?? 0,
          setlistIds.has(performance.id),
          statusById.get(performance.id) ?? null,
        ),
      )
      .sort((left, right) => (right.startDate ?? '').localeCompare(left.startDate ?? '') || right.id - left.id)
    writeJson(root, path.join(API_DIRECTORY, 'series', `${series.id}.json`), {
      series: {
        ...series,
        performances,
      },
    })
  }

  console.log(`Wrote ${path.join(root, API_DIRECTORY)} (${songRows.length} songs, ${catalog.performances.length} performances)`)
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isDirectRun) {
  buildApiFiles()
}
