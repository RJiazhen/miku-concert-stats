import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Database from 'better-sqlite3'
import { loadCatalog } from '../shared/catalog.ts'
import { parseCharacterConfig } from '../shared/characters.ts'
import { buildCityIndex, rankCities } from '../shared/cities.ts'
import { parseSetlistMerges } from '../shared/edition-setlists.ts'
import { performanceSchedules } from '../shared/event-schedule.ts'
import { parsePlaceNames } from '../shared/place-names.ts'
import {
  catalogSchedules,
  derivedItemsByShow,
  setlistPerformanceIds,
  showCountsByPerformance,
} from '../shared/performance-setlists.ts'
import { buildProducerIndex, rolesPresent } from '../shared/producers.ts'
import { fromVocaDB } from '../shared/repertoire.ts'
import { reviewRotations } from '../shared/rotation.ts'
import { buildSetlistDiffReport, pairDifferences } from '../shared/setlist-diff.ts'
import { showCoverage } from '../shared/show-coverage.ts'
import { parseSongTitles } from '../shared/song-titles.ts'
import { parseSongVariants } from '../shared/song-variants.ts'
import { performanceYear, rankSongAppearances } from '../shared/stats.ts'
import type { ApiRankFile, ApiSongRow } from '../shared/api-types.ts'
import {
  altCountsOf,
  buildAppearances,
  bucketCountsToRecord,
  charactersOf,
  emptySummary,
  parseReasons,
  producersOf,
  sameCounts,
  summarizeAppearances,
  validateTotals,
  type AppearanceSummary,
  type SongPerformanceEntry,
} from './api/appearances.ts'
import {
  BASE_URL,
  albumFallbackOf,
  normalizeTitle,
  performanceSummary,
  setlistItemPayload,
  songSummary,
  videosOf,
} from './api/payloads.ts'
import type { Catalog, PerformanceRow, SongRow } from '../shared/types.ts'

/** Directory, relative to the repository root, that holds the generated JSON API. */
const API_DIRECTORY = path.join('public', 'api', 'v1')

/** Directory bundled into the Worker for the dynamic search, rank, and debut routes. */
const SERVER_ASSET_DIRECTORY = path.join('server', 'assets', 'api')

/** How many sample rows each report detail list keeps. */
const REPORT_SAMPLE = 50

/** Repository root, whether this file is run from tsx or compiled output. */
const repoRoot = (): string => {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
}

/** Reads and parses one JSON file; the error names the file when it is malformed. */
const readJsonFile = <T>(root: string, relative: string): T => {
  return JSON.parse(readFileSync(path.join(root, relative), 'utf8')) as T
}

/** Writes one compact JSON file, creating its parent directory first. */
const writeJson = (root: string, relative: string, payload: unknown): void => {
  const file = path.join(root, relative)
  mkdirSync(path.dirname(file), { recursive: true })
  writeFileSync(file, `${JSON.stringify(payload)}\n`)
}

/** First 16 hex characters of a file's SHA-256, or an empty string when it is missing. */
const shortFileHash = (file: string): string => {
  if (!existsSync(file)) return ''
  return createHash('sha256').update(readFileSync(file)).digest('hex').slice(0, 16)
}

/** Short stable hash of a text, used to give a free-text producer a file-safe id. */
const shortTextHash = (value: string): string => createHash('sha1').update(value).digest('hex').slice(0, 12)

/** Stable id of one producer: the VocaDB artist id when known, otherwise a hash of the name. */
const producerIdOf = (row: { name: string; artistId: number | null }): string =>
  row.artistId === null ? `n${shortTextHash(row.name)}` : `a${row.artistId}`

/** Writes the complete read-only JSON API under `public/api/v1` plus the Worker's rank file. */
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

  const generatedAt = new Date().toISOString()
  const version = shortFileHash(catalogFile.replace(/\.sqlite$/, '.sqlite.gz'))
  const variants = parseSongVariants(readJsonFile(root, path.join('data', 'song-variants.json')))
  const titlesZh = parseSongTitles(readJsonFile(root, path.join('data', 'song-titles.zh-CN.json')))
  const rules = parseCharacterConfig(readJsonFile(root, path.join('data', 'characters.json')))
  const places = parsePlaceNames(readJsonFile(root, path.join('data', 'place-names.zh-CN.json')))
  const merges = parseSetlistMerges(readJsonFile(root, path.join('data', 'setlist-merges.json')))
  const review = reviewRotations(catalog)
  const showCounts = showCountsByPerformance(catalog, review)
  const setlistIds = setlistPerformanceIds(catalog)
  const performances = new Map(catalog.performances.map((row) => [row.id, row]))
  const seriesById = new Map(catalog.series.map((row) => [row.id, row]))
  const songsById = new Map(catalog.songs.map((row) => [row.id, row]))
  const statusById = new Map(catalog.performanceStatus.map((row) => [row.performance_id, row.status]))
  const showRows = new Map(catalog.performanceShowSetlists.map((row) => [row.show_key, row]))
  const medleyNames = new Map(catalog.medleys.map((row) => [row.id, row.name]))

  const baseAppearances = buildAppearances(catalog, variants)
  const broadcastAppearances = buildAppearances(catalog, variants, { includeBroadcast: true })
  const baseSummaries = new Map<number, AppearanceSummary>()
  for (const [songId, byPerformance] of baseAppearances) {
    baseSummaries.set(songId, summarizeAppearances(byPerformance, performances))
  }
  const broadcastSummaries = new Map<number, AppearanceSummary>()
  for (const [songId, byPerformance] of broadcastAppearances) {
    broadcastSummaries.set(songId, summarizeAppearances(byPerformance, performances))
  }

  for (const mode of ['show', 'event'] as const) {
    validateTotals(mode, 'default', rankSongAppearances(catalog, { mode, variants }), baseSummaries, baseAppearances)
    validateTotals(
      mode,
      'includeBroadcast',
      rankSongAppearances(catalog, { mode, variants, includeBroadcast: true }),
      broadcastSummaries,
      broadcastAppearances,
    )
  }

  const canonicalSongs = catalog.songs.filter((song) => !variants.entries.has(song.id))
  const groupSongsOf = (song: SongRow): SongRow[] => {
    const ids = [song.id, ...variants.variantSongIdsOf(song.id)]
    return ids.flatMap((id) => songsById.get(id) ?? [])
  }
  const firstPerformanceOf = (byPerformance: Map<number, SongPerformanceEntry>): PerformanceRow | null => {
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

  const apiDirectory = path.join(root, API_DIRECTORY)
  rmSync(apiDirectory, { recursive: true, force: true })
  rmSync(path.join(root, SERVER_ASSET_DIRECTORY), { recursive: true, force: true })

  const songRows = canonicalSongs.map((song) =>
    songSummary({
      song,
      summary: baseSummaries.get(song.id) ?? emptySummary(),
      first: firstPerformanceOf(baseAppearances.get(song.id) ?? new Map<number, SongPerformanceEntry>()),
      variants,
      groupSongs: groupSongsOf(song),
      rules,
      titlesZh,
    }),
  )
  songRows.sort((left, right) => right.showCount - left.showCount || left.id - right.id)

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

  const performanceRows = catalog.performances.map((performance) =>
    performanceSummary({
      performance,
      seriesName: seriesById.get(performance.series_id)?.name ?? String(performance.series_id),
      showCount: showCounts.get(performance.id) ?? 0,
      hasSetlist: setlistIds.has(performance.id),
      status: statusById.get(performance.id) ?? null,
    }),
  )
  performanceRows.sort((left, right) => (right.startDate ?? '').localeCompare(left.startDate ?? '') || right.id - left.id)

  const producerIndex = buildProducerIndex(catalog)
  const producerRows = producerIndex.rows
    .map((row) => ({
      id: producerIdOf(row),
      name: row.name,
      artistId: row.artistId,
      roles: rolesPresent(row.roles),
      songCount: row.songCount,
      performedSongCount: row.performedSongCount,
      appearanceCount: row.appearanceCount,
      performanceCount: row.performanceCount,
      showCount: row.showCount,
      firstYear: row.firstYear,
      lastYear: row.lastYear,
      topSongs: row.topSongIds.map((id) => ({ id, name: songsById.get(id)?.name ?? String(id) })),
      url: `${BASE_URL}/producers/${encodeURIComponent(row.name)}`,
    }))
    .sort((left, right) => right.songCount - left.songCount || left.name.localeCompare(right.name, 'ja'))

  const cityIndex = buildCityIndex(places)
  const cityRanking = rankCities(catalog.performances, cityIndex, { showCounts })
  const cityRows = cityRanking.rows.map((row) => ({
    city: row.city,
    originalNames: row.originalNames,
    concerts: row.concerts,
    shows: row.shows,
    firstYear: row.firstYear,
    lastYear: row.lastYear,
    url: `${BASE_URL}/cities`,
    performances: row.performanceIds.flatMap((id) => {
      const performance = performances.get(id)
      if (performance === undefined) return []
      return [
        {
          id: performance.id,
          name: performance.name,
          startDate: performance.start_date,
          seriesId: performance.series_id,
          url: `${BASE_URL}/shows/${performance.id}`,
        },
      ]
    }),
  }))

  const rankSongs: ApiSongRow[] = canonicalSongs.map((song) => {
    const groupSongs = groupSongsOf(song)
    const summary = baseSummaries.get(song.id) ?? emptySummary()
    const alt = broadcastSummaries.get(song.id)
    const zh = titlesZh[String(song.id)]
    const row: ApiSongRow = {
      id: song.id,
      name: song.name,
      nameJa: song.name_ja,
      nameEn: song.name_en,
      nameZh: zh?.title ?? null,
      producer: producersOf(groupSongs).join(', ') || null,
      category: song.category,
      show: summary.show,
      event: summary.event,
      firstYear: summary.firstYear,
      lastYear: summary.lastYear,
      approximate: summary.approximate,
      characters: charactersOf(groupSongs, rules),
      producers: producersOf(groupSongs),
      series: bucketCountsToRecord(summary.series),
      year: bucketCountsToRecord(summary.year),
      firstSeries: Object.fromEntries([...summary.firstSeries].map(([id, year]) => [String(id), year])),
    }
    if (alt !== undefined && !sameCounts(summary, alt)) row.withBroadcast = altCountsOf(alt)
    if (zh?.aliases !== undefined && zh.aliases.length > 0) row.nameZhAliases = zh.aliases
    return row
  })

  const characterOptions = rules
    .map((rule) => ({ name: rule.name, count: rankSongs.filter((row) => row.characters.includes(rule.name)).length }))
    .filter((option) => option.count > 0)
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name, 'ja'))

  const years = catalog.performances
    .map((performance) => performanceYear(performance.start_date))
    .filter((year): year is number => year !== null)
    .sort((left, right) => left - right)

  writeJson(root, path.join(API_DIRECTORY, 'index.json'), {
    site: '初音未来演唱会曲目播放统计',
    baseUrl: BASE_URL,
    generatedAt,
    catalogVersion: version,
    apiVersion: 1,
    counts: {
      series: catalog.series.length,
      performances: catalog.performances.length,
      songs: canonicalSongs.length,
      setlistShows: catalog.performanceShowSetlists.length,
      producers: producerRows.length,
      cities: cityRows.length,
    },
    modes: {
      show: '按场次：一天算一场，日场与夜场各算一场；没有场次的演出不计。',
      event: '按演出：每个演出（一个城市站）最多算一次。',
    },
    filters: {
      series: 'series={id}',
      year: 'yearFrom={yyyy}&yearTo={yyyy}',
      character: 'character={name}',
      producer: 'producer={name}',
      broadcast: 'includeBroadcast=1',
      medley: 'includeMedleyComponents=1',
    },
    endpoints: {
      filters: '/api/v1/filters.json',
      search: '/api/v1/search?q={title}',
      rank: '/api/v1/rank?mode=show&limit=20',
      debuts: '/api/v1/debuts?year=2024',
      songs: '/api/v1/songs.json',
      song: '/api/v1/songs/{id}.json',
      series: '/api/v1/series.json',
      seriesDetail: '/api/v1/series/{id}.json',
      performances: '/api/v1/performances.json',
      performance: '/api/v1/performances/{id}.json',
      producers: '/api/v1/producers.json',
      producer: '/api/v1/producers/{id}.json',
      cities: '/api/v1/cities.json',
      qualityReport: '/api/v1/reports/quality.json',
      setlistDifferences: '/api/v1/reports/setlist-differences.json',
    },
  })

  writeJson(root, path.join(API_DIRECTORY, 'filters.json'), {
    series: seriesRows.map((row) => ({
      id: row.id,
      name: row.name,
      performanceCount: row.performanceCount,
      showCount: row.showCount,
    })),
    characters: characterOptions,
    producers: producerRows.map((row) => ({
      id: row.id,
      name: row.name,
      roles: row.roles,
      songCount: row.songCount,
    })),
    yearFrom: years[0] ?? null,
    yearTo: years.at(-1) ?? null,
    modes: ['show', 'event'],
  })

  writeJson(root, path.join(API_DIRECTORY, 'songs.json'), { songs: songRows })
  writeJson(root, path.join(API_DIRECTORY, 'series.json'), { series: seriesRows })
  writeJson(root, path.join(API_DIRECTORY, 'performances.json'), { performances: performanceRows })
  writeJson(root, path.join(API_DIRECTORY, 'producers.json'), { producers: producerRows })
  writeJson(root, path.join(API_DIRECTORY, 'cities.json'), {
    cities: cityRows,
    unknown: {
      concerts: cityRanking.unknown.concerts,
      shows: cityRanking.unknown.shows,
      performanceIds: cityRanking.unknown.performanceIds,
    },
  })

  for (const series of seriesRows) {
    const rows = performanceRows.filter((row) => row.series.id === series.id)
    writeJson(root, path.join(API_DIRECTORY, 'series', `${series.id}.json`), { series: { ...series, performances: rows } })
  }

  const schedules = catalogSchedules(catalog)
  const fallbackSchedules = performanceSchedules(catalog, review)
  for (const performance of catalog.performances) {
    const derived = schedules.get(performance.id)
    const schedule = derived ?? fallbackSchedules.get(performance.id) ?? []
    const items = derivedItemsByShow(catalog, performance.id)
    const setlist = catalog.performanceSetlists.find((row) => row.performance_id === performance.id)
    const summary = performanceSummary({
      performance,
      seriesName: seriesById.get(performance.series_id)?.name ?? String(performance.series_id),
      showCount: showCounts.get(performance.id) ?? 0,
      hasSetlist: setlistIds.has(performance.id),
      status: statusById.get(performance.id) ?? null,
    })
    writeJson(root, path.join(API_DIRECTORY, 'performances', `${performance.id}.json`), {
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
      albumFallback: albumFallbackOf(catalog, performance),
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
    })
  }

  for (const song of canonicalSongs) {
    const byPerformance = baseAppearances.get(song.id) ?? new Map<number, SongPerformanceEntry>()
    const summary = baseSummaries.get(song.id) ?? emptySummary()
    const groupSongs = groupSongsOf(song)
    const groupIds = groupSongs.map((row) => row.id)
    const coverage = showCoverage(catalog, review, groupIds)
    const alt = broadcastSummaries.get(song.id)
    const altDiffers = alt !== undefined && !sameCounts(summary, alt)
    writeJson(root, path.join(API_DIRECTORY, 'songs', `${song.id}.json`), {
      song: songSummary({ song, summary, first: firstPerformanceOf(byPerformance), variants, groupSongs, rules, titlesZh }),
      counts: {
        show: summary.show,
        event: summary.event,
        performanceCount: summary.performanceCount,
        seriesCount: summary.seriesCount,
        firstYear: summary.firstYear,
        lastYear: summary.lastYear,
        approximate: summary.approximate,
        reasons: summary.reasons,
        withBroadcast: altDiffers && alt !== undefined ? { show: alt.show, event: alt.event } : null,
      },
      bySeries: [...summary.series.entries()]
        .map(([seriesId, bucket]) => ({
          seriesId,
          name: seriesById.get(seriesId)?.name ?? String(seriesId),
          url: `${BASE_URL}/series/${seriesId}`,
          showCount: bucket.showKeys.size,
          eventCount: bucket.eventIds.size,
          firstSeriesNumber: bucket.seriesNumbers.size === 0 ? null : Math.min(...bucket.seriesNumbers),
          lastSeriesNumber: bucket.seriesNumbers.size === 0 ? null : Math.max(...bucket.seriesNumbers),
        }))
        .sort((left, right) => right.showCount - left.showCount || left.seriesId - right.seriesId),
      byYear: [...summary.year.entries()]
        .map(([year, bucket]) => ({ year, showCount: bucket.showKeys.size, eventCount: bucket.eventIds.size }))
        .sort((left, right) => right.year - left.year),
      performances: [...byPerformance.entries()]
        .flatMap(([performanceId, entry]) => {
          const performance = performances.get(performanceId)
          if (performance === undefined) return []
          const covered = coverage.get(performanceId)
          return [
            {
              id: performance.id,
              name: performance.name,
              startDate: performance.start_date,
              seriesId: performance.series_id,
              seriesNumber: performance.series_number,
              url: `${BASE_URL}/shows/${performance.id}`,
              showKeys: [...entry.showKeys].sort(),
              showCount: entry.showKeys.size,
              coverage: covered === undefined ? null : { total: covered.total, covered: covered.covered, labels: covered.labels ?? [] },
              approximate: entry.reasons.size > 0,
              reasons: [...entry.reasons].sort(),
            },
          ]
        })
        .sort((left, right) => (right.startDate ?? '').localeCompare(left.startDate ?? '') || right.id - left.id),
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
      videos: videosOf(catalog, groupIds),
      sourceUrl: song.source_url,
      url: `${BASE_URL}/songs/${song.id}`,
    })
  }

  for (const producer of producerRows) {
    const row = producerIndex.byName.get(producer.name)
    if (row === undefined) continue
    writeJson(root, path.join(API_DIRECTORY, 'producers', `${producer.id}.json`), {
      producer: {
        ...producer,
        songs: row.songs.map((song) => ({
          id: song.songId,
          name: song.name,
          roles: song.roles,
          publishYear: song.publishYear,
          showCount: song.showCount,
          performanceCount: song.performanceCount,
          url: `${BASE_URL}/songs/${song.songId}`,
        })),
        performances: row.performanceIds.flatMap((id) => {
          const performance = performances.get(id)
          if (performance === undefined) return []
          return [
            {
              id: performance.id,
              name: performance.name,
              startDate: performance.start_date,
              seriesId: performance.series_id,
              seriesName: seriesById.get(performance.series_id)?.name ?? String(performance.series_id),
              showCount: showCounts.get(performance.id) ?? 0,
              url: `${BASE_URL}/shows/${performance.id}`,
            },
          ]
        }),
      },
      url: producer.url,
    })
  }

  const videosBySong = new Set(catalog.videos.map((row) => row.song_id))
  const songsWithoutVideo = catalog.songs
    .filter((song) => fromVocaDB(song) && !videosBySong.has(song.id))
    .map((song) => ({ id: song.id, name: song.name, url: `${BASE_URL}/songs/${song.id}` }))
  const incompletePerformances = catalog.performances
    .filter((performance) => !setlistIds.has(performance.id) || performance.start_date === null)
    .map((performance) => ({
      id: performance.id,
      name: performance.name,
      seriesId: performance.series_id,
      url: `${BASE_URL}/shows/${performance.id}`,
      reason: performance.start_date === null ? 'no date' : 'no setlist',
    }))
  const albumFallbackPerformances = catalog.performances.flatMap((performance) => {
    const fallback = albumFallbackOf(catalog, performance)
    if (fallback === null) return []
    return [
      {
        id: performance.id,
        name: performance.name,
        seriesId: performance.series_id,
        url: `${BASE_URL}/shows/${performance.id}`,
        ...fallback,
      },
    ]
  })
  const mergedVariants = new Set<number>(variants.entries.keys())
  const mergedCanonicals = new Set<number>([...variants.entries.values()].map((entry) => entry.canonical))
  const duplicateBuckets = new Map<string, { id: number; name: string }[]>()
  for (const song of catalog.songs) {
    if (mergedVariants.has(song.id)) continue
    const key = normalizeTitle(song.name)
    const bucket = duplicateBuckets.get(key) ?? []
    bucket.push({ id: song.id, name: song.name })
    duplicateBuckets.set(key, bucket)
  }
  const duplicateCandidates = [...duplicateBuckets.entries()]
    .filter(([, list]) => list.length > 1 && list.some((song) => !mergedCanonicals.has(song.id)))
    .map(([key, songs]) => ({ key, songs }))
  const uncertainLines = review.lines.filter((line) => line.uncertain)

  writeJson(root, path.join(API_DIRECTORY, 'reports', 'quality.json'), {
    generatedAt,
    catalogVersion: version,
    summary: {
      songs: catalog.songs.length,
      performances: catalog.performances.length,
      songLists: catalog.songLists.length,
      videos: catalog.videos.length,
      mergedVariants: variants.size,
      mergedSetlistGroups: merges.size,
      songsWithoutVideo: songsWithoutVideo.length,
      incompletePerformances: incompletePerformances.length,
      albumFallbackPerformances: albumFallbackPerformances.length,
      uncertainLines: uncertainLines.length,
      duplicateCandidates: duplicateCandidates.length,
      pendingReview: catalog.performanceSetlists.filter((row) => row.pending_review === 1).length,
    },
    songsWithoutVideo,
    incompletePerformances,
    albumFallbackPerformances,
    listsWithoutAnnouncement: catalog.songLists
      .filter((row) => row.source === 'vocadb' && row.announced_at === null)
      .map((row) => ({ id: row.id, name: row.name })),
    uncertainLines: {
      count: uncertainLines.length,
      samples: uncertainLines.slice(0, REPORT_SAMPLE).map((line) => ({
        songListId: line.songListId,
        position: line.position,
        notes: line.notes,
        performanceIds: line.performanceIds,
        reasons: line.reasons,
      })),
    },
    mismatchedShows: review.shows.map((row) => ({
      ...row,
      name: performances.get(row.performanceId)?.name ?? String(row.performanceId),
    })),
    duplicateCandidates,
    medleyQuarantine: catalog.medleyQuarantine.map((row) => ({
      songListId: row.song_list_id,
      position: row.position,
      listedSongId: row.listed_song_id,
      reason: row.reason,
    })),
    pendingReview: catalog.performanceSetlists
      .filter((row) => row.pending_review === 1)
      .map((row) => ({
        performanceId: row.performance_id,
        name: performances.get(row.performance_id)?.name ?? String(row.performance_id),
        status: row.status,
        resolution: row.resolution,
      })),
    note: '缺失数据不会补造：songsWithoutVideo 只列 VocaDB 曲目，播放量快照为空时不估算。',
  })

  const diffReport = buildSetlistDiffReport(catalog, merges)
  const pairPayload = (pair: (typeof diffReport.editions)[number]): Record<string, unknown> => {
    const differences = pairDifferences(catalog, pair)
    return {
      ...pair,
      onlyLeft: differences.onlyLeft.map((id) => ({ id, name: songsById.get(id)?.name ?? String(id) })),
      onlyRight: differences.onlyRight.map((id) => ({ id, name: songsById.get(id)?.name ?? String(id) })),
    }
  }
  writeJson(root, path.join(API_DIRECTORY, 'reports', 'setlist-differences.json'), {
    generatedAt,
    catalogVersion: version,
    summary: diffReport.summary,
    pairCount: diffReport.pairCount,
    mergedPairCount: diffReport.mergedPairCount,
    editions: diffReport.editions.map(pairPayload),
    adjacentEditions: diffReport.adjacentEditions.map(pairPayload),
    note: '同一系列年度的歌单两两对比，分级见 summary；相邻系列年度只作参考。',
  })

  const rankFile: ApiRankFile = {
    generatedAt,
    catalogVersion: version,
    songs: rankSongs,
    producers: producerRows.map((row) => ({
      id: row.id,
      name: row.name,
      roles: row.roles,
      songCount: row.songCount,
    })),
    series: seriesRows.map((row) => ({
      id: row.id,
      name: row.name,
      performanceCount: row.performanceCount,
      showCount: row.showCount,
    })),
    characters: characterOptions,
    yearFrom: years[0] ?? null,
    yearTo: years.at(-1) ?? null,
  }
  writeJson(root, path.join(SERVER_ASSET_DIRECTORY, 'rank.json'), rankFile)

  console.log(
    `Wrote ${apiDirectory}: ${canonicalSongs.length} songs, ${catalog.performances.length} performances, ` +
      `${producerRows.length} producers, ${cityRows.length} cities`,
  )
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isDirectRun) {
  buildApiFiles()
}
