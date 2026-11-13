import { createError, defineEventHandler, getQuery, type H3Event } from 'h3'
import { boundedLimit, loadApiSongs, songSummary } from '../../utils/api-songs.ts'

/** Page size when the caller does not pass `limit`. */
const DEFAULT_LIMIT = 100

/** Largest debut list a caller may request. */
const MAX_LIMIT = 200

/** Reads the required four-digit year. */
const requiredYear = (raw: unknown): number => {
  if (typeof raw !== 'string' || !/^\d{4}$/.test(raw.trim())) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid year', message: 'year 必须是四位年份' })
  }
  return Number(raw)
}

/** Reads an optional single series id. */
const optionalSeries = (raw: unknown): number | null => {
  if (raw === undefined) return null
  if (typeof raw !== 'string' || !/^\d+$/.test(raw.trim())) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid series', message: 'series 必须是系列 id' })
  }
  return Number(raw)
}

/**
 * `GET /api/v1/debuts?year=` — songs whose first recorded appearance was that year.
 * With `series=81`, the first appearance inside that series uses its series year (`seriesNumber`).
 */
const debutSongs = async (event: H3Event) => {
  const params = getQuery(event)
  const year = requiredYear(params.year)
  const series = optionalSeries(params.series)
  const limit = boundedLimit(params.limit, DEFAULT_LIMIT, MAX_LIMIT)
  const songs = await loadApiSongs()
  const matches = songs.filter((song) => {
    if (series !== null) return song.firstSeries[String(series)] === year
    return song.firstYear === year
  })
  matches.sort((left, right) => right.show - left.show || left.id - right.id)
  return {
    year,
    series,
    count: matches.length,
    songs: matches.slice(0, limit).map((song) => ({
      ...songSummary(song),
      showCount: song.show,
      eventCount: song.event,
      firstYear: song.firstYear,
      firstSeriesYear: series === null ? null : (song.firstSeries[String(series)] ?? null),
    })),
  }
}

export default defineEventHandler(debutSongs)
