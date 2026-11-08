import { createError, defineEventHandler, getQuery, type H3Event } from 'h3'
import type { ApiProducerOption, ApiSongRow, ApiSeriesOption } from '../../../shared/api-types.ts'
import { API_BASE_URL, boundedLimit, loadApiRank, songSummary } from '../../utils/api-songs.ts'

/** What the caller wants back; `all` searches every kind. */
type SearchType = 'all' | 'songs' | 'producers' | 'series'

/** Page size when the caller does not pass `limit`. */
const DEFAULT_LIMIT = 10

/** Largest search page a caller may request. */
const MAX_LIMIT = 25

/** Folds a title for case-insensitive Latin matching; Japanese and Chinese are unaffected. */
const normalizeTitle = (value: string): string => value.trim().toLowerCase()

/** Reads and validates `type`. */
const searchType = (raw: unknown): SearchType => {
  if (raw === undefined) return 'all'
  if (raw === 'all' || raw === 'songs' || raw === 'producers' || raw === 'series') return raw
  throw createError({
    statusCode: 400,
    statusMessage: 'Invalid type',
    message: 'type 只能是 all / songs / producers / series',
  })
}

/**
 * Scores a song against one query.
 * 0 exact title, 1 title starts with the query, 2 title contains it or an alias matches, null no match.
 * Aliases never outrank a primary title, so a search shows the canonical Chinese name first.
 */
const scoreSong = (song: ApiSongRow, query: string): number | null => {
  const titles = [song.name, song.nameJa, song.nameEn, song.nameZh]
  let best: number | null = null
  for (const title of titles) {
    if (title === null) continue
    const value = normalizeTitle(title)
    if (value === query) return 0
    if (value.startsWith(query)) {
      if (best === null || best > 1) best = 1
      continue
    }
    if (value.includes(query) && best === null) best = 2
  }
  for (const alias of song.nameZhAliases ?? []) {
    if (normalizeTitle(alias).includes(query) && best === null) best = 2
  }
  for (const alias of song.aliases ?? []) {
    if (normalizeTitle(alias).includes(query) && best === null) best = 2
  }
  return best
}

/** Whether a producer or series name matches the query, exact matches first. */
const nameScore = (name: string, query: string): number | null => {
  const value = normalizeTitle(name)
  if (value === query) return 0
  if (value.startsWith(query)) return 1
  if (value.includes(query)) return 2
  return null
}

/** Best score across a row's name and its checked translations, so a Chinese or English series name matches. */
const translatedNameScore = (names: readonly (string | null | undefined)[], query: string): number | null => {
  let best: number | null = null
  for (const name of names) {
    if (name === null || name === undefined) continue
    const score = nameScore(name, query)
    if (score === null) continue
    if (score === 0) return 0
    if (best === null || score < best) best = score
  }
  return best
}

/** Producer hit with its page on this site. */
const producerHit = (row: ApiProducerOption): ApiProducerOption & { url: string } => ({
  ...row,
  url: `${API_BASE_URL}/producers/${encodeURIComponent(row.name)}`,
})

/** Series hit with its page on this site. */
const seriesHit = (row: ApiSeriesOption): ApiSeriesOption & { url: string } => ({
  ...row,
  url: `${API_BASE_URL}/series/${row.id}`,
})

/**
 * `GET /api/v1/search?q=&type=all|songs|producers|series` — resolve a song, producer, or series.
 * Song titles match the original, Japanese, English, and Chinese names, plus the recorded Chinese and
 * alternate titles (`data/song-aliases.json`); producers and series match their names as a
 * case-insensitive substring.
 */
const search = async (event: H3Event) => {
  const params = getQuery(event)
  const rawQuery = typeof params.q === 'string' ? params.q.trim() : ''
  if (rawQuery.length < 1 || rawQuery.length > 80) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid query',
      message: 'q 必须是 1 到 80 个字符',
    })
  }
  const type = searchType(params.type)
  const limit = boundedLimit(params.limit, DEFAULT_LIMIT, MAX_LIMIT)
  const query = normalizeTitle(rawQuery)
  const rank = await loadApiRank()

  const songMatches: { song: ApiSongRow; score: number }[] = []
  if (type === 'all' || type === 'songs') {
    for (const song of rank.songs) {
      const score = scoreSong(song, query)
      if (score !== null) songMatches.push({ song, score })
    }
    songMatches.sort((left, right) => {
      return left.score - right.score || right.song.show - left.song.show || left.song.id - right.song.id
    })
  }

  const producerMatches: { row: ApiProducerOption; score: number }[] = []
  if (type === 'all' || type === 'producers') {
    for (const row of rank.producers) {
      const score = nameScore(row.name, query)
      if (score !== null) producerMatches.push({ row, score })
    }
    producerMatches.sort((left, right) => {
      return left.score - right.score || right.row.songCount - left.row.songCount || left.row.name.localeCompare(right.row.name, 'ja')
    })
  }

  const seriesMatches: { row: ApiSeriesOption; score: number }[] = []
  if (type === 'all' || type === 'series') {
    for (const row of rank.series) {
      const score = row.id === Number(rawQuery) ? 0 : translatedNameScore([row.name, row.nameEn, row.nameZh], query)
      if (score !== null) seriesMatches.push({ row, score })
    }
    seriesMatches.sort((left, right) => {
      return left.score - right.score || right.row.showCount - left.row.showCount || left.row.id - right.row.id
    })
  }

  return {
    query: rawQuery,
    type,
    counts: {
      songs: songMatches.length,
      producers: producerMatches.length,
      series: seriesMatches.length,
    },
    songs: songMatches.slice(0, limit).map(({ song }) => ({
      ...songSummary(song),
      characters: song.characters,
      producers: song.producers,
      showCount: song.show,
      eventCount: song.event,
      firstYear: song.firstYear,
    })),
    producers: producerMatches.slice(0, limit).map(({ row }) => producerHit(row)),
    series: seriesMatches.slice(0, limit).map(({ row }) => seriesHit(row)),
  }
}

export default defineEventHandler(search)
