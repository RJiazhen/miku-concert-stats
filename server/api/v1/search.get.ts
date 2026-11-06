import { createError, defineEventHandler, getQuery, type H3Event } from 'h3'
import { boundedLimit, loadApiSongs, songSummary, type ApiSong } from '../../utils/api-songs.ts'

/** Page size when the caller does not pass `limit`. */
const DEFAULT_LIMIT = 10

/** Largest page a caller may request; search results stay small enough to read in chat. */
const MAX_LIMIT = 25

/** Folds a title for case-insensitive Latin matching; Japanese is unaffected. */
const normalizeTitle = (value: string): string => value.trim().toLowerCase()

/**
 * Scores a song against one query.
 * 0 exact title, 1 title starts with the query, 2 title contains it, null no match.
 */
const scoreSong = (song: ApiSong, query: string): number | null => {
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
  return best
}

/** `GET /api/v1/search?q=` — find songs by any recorded title, cheapest call to start with. */
const searchSongs = async (event: H3Event) => {
  const params = getQuery(event)
  const rawQuery = typeof params.q === 'string' ? params.q.trim() : ''
  if (rawQuery.length < 1 || rawQuery.length > 80) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid query',
      message: 'q 必须是 1 到 80 个字符',
    })
  }
  const limit = boundedLimit(params.limit, DEFAULT_LIMIT, MAX_LIMIT)
  const query = normalizeTitle(rawQuery)
  const songs = await loadApiSongs()
  const matches: { song: ApiSong; score: number }[] = []
  for (const song of songs) {
    const score = scoreSong(song, query)
    if (score !== null) matches.push({ song, score })
  }
  matches.sort((left, right) => {
    return left.score - right.score || right.song.show - left.song.show || left.song.id - right.song.id
  })
  return {
    query: rawQuery,
    count: matches.length,
    songs: matches.slice(0, limit).map(({ song }) => ({
      ...songSummary(song),
      showCount: song.show,
      eventCount: song.event,
      firstYear: song.firstYear,
    })),
  }
}

export default defineEventHandler(searchSongs)
