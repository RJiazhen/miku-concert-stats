import { createError } from 'h3'
import { useStorage } from 'nitropack/runtime'
import type { ApiRankFile, ApiSongRow } from '../../shared/api-types.ts'

/** Public origin shown in links returned by the API. */
export const API_BASE_URL = 'https://miku-concert-stats.rjiazhen.top'

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
const isApiSong = (value: unknown): value is ApiSongRow => {
  if (value === null || typeof value !== 'object') return false
  const row = value as Record<string, unknown>
  return (
    typeof row.id === 'number' &&
    typeof row.name === 'string' &&
    typeof row.show === 'number' &&
    typeof row.event === 'number' &&
    typeof row.approximate === 'boolean' &&
    Array.isArray(row.characters) &&
    Array.isArray(row.producers) &&
    row.series !== null &&
    typeof row.series === 'object' &&
    row.year !== null &&
    typeof row.year === 'object' &&
    row.firstSeries !== null &&
    typeof row.firstSeries === 'object'
  )
}

/** Parses the bundled rank payload, failing closed when the build output is missing or malformed. */
const parseRankPayload = (payload: unknown): ApiRankFile => {
  if (payload === null || typeof payload !== 'object') {
    throw createError({ statusCode: 503, statusMessage: 'API data unavailable', message: 'API 数据不可用' })
  }
  const file = payload as Partial<ApiRankFile>
  if (!Array.isArray(file.songs) || !Array.isArray(file.producers) || !Array.isArray(file.series)) {
    throw createError({ statusCode: 503, statusMessage: 'API data unavailable', message: 'API 数据不可用' })
  }
  return {
    generatedAt: typeof file.generatedAt === 'string' ? file.generatedAt : '',
    catalogVersion: typeof file.catalogVersion === 'string' ? file.catalogVersion : '',
    songs: file.songs.filter(isApiSong),
    producers: file.producers,
    series: file.series,
    characters: Array.isArray(file.characters) ? file.characters : [],
    yearFrom: typeof file.yearFrom === 'number' ? file.yearFrom : null,
    yearTo: typeof file.yearTo === 'number' ? file.yearTo : null,
  }
}

/** Parses a raw string payload when the storage driver returns text instead of JSON. */
const parseRankText = (raw: string): ApiRankFile => {
  try {
    return parseRankPayload(JSON.parse(raw) as unknown)
  } catch (error) {
    if (error !== null && typeof error === 'object' && 'statusCode' in error) throw error
    throw createError({ statusCode: 503, statusMessage: 'API data unavailable', message: 'API 数据不可用' })
  }
}

let rankPromise: Promise<ApiRankFile> | null = null

/** Loads and caches the generated rank file on first use. */
export const loadApiRank = async (): Promise<ApiRankFile> => {
  if (rankPromise !== null) return rankPromise
  rankPromise = (async () => {
    const raw = await useStorage('assets:api').getItem<unknown>('rank.json')
    if (raw === null || raw === undefined) {
      throw createError({ statusCode: 503, statusMessage: 'API data unavailable', message: 'API 数据不可用' })
    }
    // Nitro may hand back parsed JSON or the raw text depending on the driver.
    return typeof raw === 'string' ? parseRankText(raw) : parseRankPayload(raw)
  })()
  rankPromise = rankPromise.catch((error: unknown) => {
    rankPromise = null
    throw error
  })
  return rankPromise
}

/** Loads and caches only the song rows of the rank file. */
export const loadApiSongs = async (): Promise<ApiSongRow[]> => {
  return (await loadApiRank()).songs
}

/** Public summary of one song, with its human page on this site. */
export const songSummary = (song: ApiSongRow): ApiSongSummary => {
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

/** Parses a comma-separated list of names, keeping the given order and dropping blanks. */
export const nameList = (raw: unknown, parameter: string, max: number): string[] => {
  if (raw === undefined) return []
  if (typeof raw !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Invalid filter', message: `${parameter} 必须是逗号分隔的名字` })
  }
  const names = [...new Set(raw.split(',').map((part) => part.trim()).filter((part) => part !== ''))]
  if (names.length > max) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid filter', message: `${parameter} 最多 ${max} 个` })
  }
  return names
}
