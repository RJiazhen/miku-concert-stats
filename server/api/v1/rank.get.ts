import { createError, defineEventHandler, getQuery, type H3Event } from 'h3'
import { boundedLimit, loadApiSongs, songSummary, type ApiSong } from '../../utils/api-songs.ts'

/** Ranking unit: `show` counts every 場次, `event` counts every 演出 at most once. */
type RankingMode = 'show' | 'event'

/** Page size when the caller does not pass `limit`. */
const DEFAULT_LIMIT = 20

/** Largest ranking page a caller may request. */
const MAX_LIMIT = 100

/** Reads and validates `mode`; the site defaults to 按场次. */
const rankingMode = (raw: unknown): RankingMode => {
  if (raw === undefined) return 'show'
  if (raw === 'show' || raw === 'event') return raw
  throw createError({ statusCode: 400, statusMessage: 'Invalid mode', message: 'mode 只能是 show 或 event' })
}

/** Reads `series=81,82` into unique positive ids, or null when omitted. */
const seriesFilter = (raw: unknown): number[] | null => {
  if (raw === undefined) return null
  if (typeof raw !== 'string' || raw.trim() === '') return null
  const ids = raw.split(',').map((part) => Number(part.trim()))
  if (ids.some((id) => !Number.isInteger(id) || id <= 0)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid series', message: 'series 必须是逗号分隔的系列 id' })
  }
  return [...new Set(ids)]
}

/** Reads an optional four-digit year bound. */
const yearBound = (raw: unknown, name: string): number | null => {
  if (raw === undefined) return null
  if (typeof raw !== 'string' || !/^\d{4}$/.test(raw.trim())) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid year', message: `${name} 必须是四位年份` })
  }
  return Number(raw)
}

/** Applies the requested filter to one song and returns the matching count. */
const countFor = (
  song: ApiSong,
  mode: RankingMode,
  series: number[] | null,
  yearFrom: number | null,
  yearTo: number | null,
): number => {
  const index = mode === 'show' ? 0 : 1
  if (series !== null) {
    return series.reduce((total, id) => total + (song.series[String(id)]?.[index] ?? 0), 0)
  }
  if (yearFrom === null && yearTo === null) return index === 0 ? song.show : song.event
  let total = 0
  for (const [key, counts] of Object.entries(song.year)) {
    const year = Number(key)
    if (yearFrom !== null && year < yearFrom) continue
    if (yearTo !== null && year > yearTo) continue
    total += counts[index] ?? 0
  }
  return total
}

/**
 * `GET /api/v1/rank` — most performed songs, optionally filtered by series or by calendar year.
 * Series and year filters are mutually exclusive because the API only exposes one dimension at a time.
 */
const rankSongs = async (event: H3Event) => {
  const params = getQuery(event)
  const mode = rankingMode(params.mode)
  const series = seriesFilter(params.series)
  const yearFrom = yearBound(params.yearFrom, 'yearFrom')
  const yearTo = yearBound(params.yearTo, 'yearTo')
  if (series !== null && (yearFrom !== null || yearTo !== null)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid filter',
      message: 'series 不能与 yearFrom / yearTo 同时使用',
    })
  }
  if (yearFrom !== null && yearTo !== null && yearFrom > yearTo) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid year range', message: 'yearFrom 不能大于 yearTo' })
  }
  const limit = boundedLimit(params.limit, DEFAULT_LIMIT, MAX_LIMIT)
  const songs = await loadApiSongs()
  const ranked = songs
    .map((song) => ({ song, count: countFor(song, mode, series, yearFrom, yearTo) }))
    .filter((row) => row.count > 0)
  ranked.sort((left, right) => right.count - left.count || left.song.id - right.song.id)
  return {
    mode,
    series,
    yearFrom,
    yearTo,
    count: ranked.length,
    songs: ranked.slice(0, limit).map(({ song, count }) => ({
      ...songSummary(song),
      count,
      showCount: song.show,
      eventCount: song.event,
      firstYear: song.firstYear,
    })),
  }
}

export default defineEventHandler(rankSongs)
