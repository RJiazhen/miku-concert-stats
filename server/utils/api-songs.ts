import { createError } from 'h3'
import { useStorage } from 'nitropack/runtime'

/** Public origin shown in links returned by the API. */
export const API_BASE_URL = 'https://miku-concert-stats.rjiazhen.top'

/** One song row bundled from the build for search, ranking, and debut lookups. */
export type ApiSong = {
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
  /** Series id to `[showCount, eventCount]`. */
  series: Record<string, [number, number]>
  /** Calendar year to `[showCount, eventCount]`. */
  year: Record<string, [number, number]>
  /** Series id to the first series year the song appeared in. */
  firstSeries: Record<string, number>
}

/** Fields every song result shares, so the three routes answer with one shape. */
export type ApiSongSummary = {
  id: number
  name: string
  nameJa: string | null
  nameEn: string | null
  nameZh: string | null
  producer: string | null
  approximate: boolean
  url: string
}

/** Rejects a row the generated file should never contain. */
const isApiSong = (value: unknown): value is ApiSong => {
  if (value === null || typeof value !== 'object') return false
  const row = value as Record<string, unknown>
  return (
    typeof row.id === 'number' &&
    typeof row.name === 'string' &&
    typeof row.show === 'number' &&
    typeof row.event === 'number' &&
    typeof row.approximate === 'boolean' &&
    row.series !== null &&
    typeof row.series === 'object' &&
    row.year !== null &&
    typeof row.year === 'object' &&
    row.firstSeries !== null &&
    typeof row.firstSeries === 'object'
  )
}

/** Parses the bundled rank payload, failing closed when the build output is missing or malformed. */
const parseRankPayload = (payload: unknown): ApiSong[] => {
  if (payload === null || typeof payload !== 'object') {
    throw createError({ statusCode: 503, statusMessage: 'API data unavailable', message: 'API 数据不可用' })
  }
  const songs = (payload as { songs?: unknown }).songs
  if (!Array.isArray(songs)) {
    throw createError({ statusCode: 503, statusMessage: 'API data unavailable', message: 'API 数据不可用' })
  }
  return songs.filter(isApiSong)
}

/** Parses a raw string payload when the storage driver returns text instead of JSON. */
const parseRankText = (raw: string): ApiSong[] => {
  try {
    return parseRankPayload(JSON.parse(raw) as unknown)
  } catch (error) {
    if (error !== null && typeof error === 'object' && 'statusCode' in error) throw error
    throw createError({ statusCode: 503, statusMessage: 'API data unavailable', message: 'API 数据不可用' })
  }
}

let songsPromise: Promise<ApiSong[]> | null = null

/** Loads and caches the generated song rows on first use. */
export const loadApiSongs = async (): Promise<ApiSong[]> => {
  if (songsPromise !== null) return songsPromise
  songsPromise = (async () => {
    const raw = await useStorage('assets:api').getItem<unknown>('rank.json')
    if (raw === null || raw === undefined) {
      throw createError({ statusCode: 503, statusMessage: 'API data unavailable', message: 'API 数据不可用' })
    }
    // Nitro may hand back parsed JSON or the raw text depending on the driver.
    return typeof raw === 'string' ? parseRankText(raw) : parseRankPayload(raw)
  })()
  songsPromise = songsPromise.catch((error: unknown) => {
    songsPromise = null
    throw error
  })
  return songsPromise
}

/** Public summary of one song, with its human page on this site. */
export const songSummary = (song: ApiSong): ApiSongSummary => {
  return {
    id: song.id,
    name: song.name,
    nameJa: song.nameJa,
    nameEn: song.nameEn,
    nameZh: song.nameZh,
    producer: song.producer,
    approximate: song.approximate,
    url: `${API_BASE_URL}/songs/${song.id}`,
  }
}

/** Parses an optional bounded page size; an invalid value falls back to `fallback`. */
export const boundedLimit = (raw: unknown, fallback: number, max: number): number => {
  if (raw === undefined) return fallback
  if (typeof raw !== 'string' || !/^\d+$/.test(raw.trim())) return fallback
  const value = Number(raw)
  if (!Number.isInteger(value) || value < 1) return fallback
  return Math.min(value, max)
}
