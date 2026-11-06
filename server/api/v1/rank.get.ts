import { createError, defineEventHandler, getQuery, type H3Event } from 'h3'
import type { ApiSongRow } from '../../../shared/api-types.ts'
import { boundedLimit, loadApiSongs, nameList, songSummary } from '../../utils/api-songs.ts'

/** Ranking unit: `show` counts every 場次, `event` counts every 演出 at most once. */
type RankingMode = 'show' | 'event'

/** Columns a caller may sort by. */
type SortKey = 'count' | 'show' | 'event' | 'firstYear' | 'lastYear' | 'id' | 'name'

/** Page size when the caller does not pass `limit`. */
const DEFAULT_LIMIT = 20

/** Largest ranking page a caller may request. */
const MAX_LIMIT = 100

/** Series ids one request may filter by. */
const MAX_SERIES = 20

/** Character or producer names one request may filter by. */
const MAX_NAMES = 20

/** Reads and validates `mode`; the site defaults to 按场次. */
const rankingMode = (raw: unknown): RankingMode => {
  if (raw === undefined) return 'show'
  if (raw === 'show' || raw === 'event') return raw
  throw createError({ statusCode: 400, statusMessage: 'Invalid mode', message: 'mode 只能是 show 或 event' })
}

/** Reads a boolean flag: `1` / `true` turn it on, anything else off. */
const flag = (raw: unknown): boolean => raw === '1' || raw === 'true'

/** Reads `series=81,82` into unique positive ids, or null when omitted. */
const seriesFilter = (raw: unknown): number[] | null => {
  if (raw === undefined) return null
  if (typeof raw !== 'string' || raw.trim() === '') return null
  const ids = raw.split(',').map((part) => Number(part.trim()))
  if (ids.some((id) => !Number.isInteger(id) || id <= 0)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid series', message: 'series 必须是逗号分隔的系列 id' })
  }
  if (ids.length > MAX_SERIES) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid series', message: `series 最多 ${MAX_SERIES} 个` })
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

/** Reads the sort column. */
const sortKey = (raw: unknown): SortKey => {
  if (raw === undefined) return 'count'
  const allowed: SortKey[] = ['count', 'show', 'event', 'firstYear', 'lastYear', 'id', 'name']
  if ((allowed as string[]).includes(raw as string)) return raw as SortKey
  throw createError({
    statusCode: 400,
    statusMessage: 'Invalid sort',
    message: `sort 只能是 ${allowed.join(' / ')}`,
  })
}

/** Reads the sort direction. */
const sortOrder = (raw: unknown): 'asc' | 'desc' => {
  if (raw === undefined) return 'desc'
  if (raw === 'asc' || raw === 'desc') return raw
  throw createError({ statusCode: 400, statusMessage: 'Invalid order', message: 'order 只能是 asc 或 desc' })
}

/** Numbers of one song under the active broadcast filter and the active series or year filter. */
type Counts = {
  count: number
  show: number
  event: number
  firstYear: number | null
  lastYear: number | null
}

/** Sums `[showCount, eventCount]` pairs over the requested series. */
const seriesCounts = (song: ApiSongRow, series: readonly number[], alt: boolean): [number, number] => {
  const source = alt && song.withBroadcast !== undefined ? song.withBroadcast.series : song.series
  let show = 0
  let event = 0
  for (const id of series) {
    const pair = source[String(id)]
    if (pair === undefined) continue
    show += pair[0]
    event += pair[1]
  }
  return [show, event]
}

/** Sums `[showCount, eventCount]` pairs over a calendar-year range. */
const yearCounts = (song: ApiSongRow, from: number | null, to: number | null, alt: boolean): [number, number] => {
  const source = alt && song.withBroadcast !== undefined ? song.withBroadcast.year : song.year
  let show = 0
  let event = 0
  for (const [key, pair] of Object.entries(source)) {
    const year = Number(key)
    if (from !== null && year < from) continue
    if (to !== null && year > to) continue
    show += pair[0]
    event += pair[1]
  }
  return [show, event]
}

/** Counts and year range of one song under the active filters. */
const countsOf = (input: {
  song: ApiSongRow
  mode: RankingMode
  series: readonly number[] | null
  yearFrom: number | null
  yearTo: number | null
  alt: boolean
}): Counts => {
  const { song, mode, series, yearFrom, yearTo, alt } = input
  const index = mode === 'show' ? 0 : 1
  const totals = alt && song.withBroadcast !== undefined ? song.withBroadcast : song
  let pair: [number, number]
  if (series !== null) pair = seriesCounts(song, series, alt)
  else if (yearFrom !== null || yearTo !== null) pair = yearCounts(song, yearFrom, yearTo, alt)
  else pair = [totals.show, totals.event]
  return {
    count: pair[index] ?? 0,
    show: pair[0],
    event: pair[1],
    firstYear: totals.firstYear,
    lastYear: totals.lastYear,
  }
}

/** Comparator for one sort column. */
const compareBy = (key: SortKey, order: 'asc' | 'desc') => {
  const direction = order === 'asc' ? 1 : -1
  return (left: { song: ApiSongRow; counts: Counts }, right: { song: ApiSongRow; counts: Counts }): number => {
    let primary: number
    if (key === 'name') {
      return left.song.name.localeCompare(right.song.name, 'ja') * direction
    }
    if (key === 'id') primary = left.song.id - right.song.id
    else if (key === 'firstYear') primary = (left.counts.firstYear ?? 9999) - (right.counts.firstYear ?? 9999)
    else if (key === 'lastYear') primary = (left.counts.lastYear ?? 0) - (right.counts.lastYear ?? 0)
    else primary = left.counts[key] - right.counts[key]
    return primary * direction || left.song.id - right.song.id
  }
}

/**
 * `GET /api/v1/rank` — most performed songs, with the same filters as the site's ranking page:
 * counting mode, series, calendar years, characters, producers, and whether to include
 * livestream / VR 演出. `includeMedleyComponents` is accepted for parity but changes nothing,
 * because the derived layer already expands every medley into its parts.
 */
const rankSongs = async (event: H3Event) => {
  const params = getQuery(event)
  const mode = rankingMode(params.mode)
  const series = seriesFilter(params.series)
  const yearFrom = yearBound(params.yearFrom, 'yearFrom')
  const yearTo = yearBound(params.yearTo, 'yearTo')
  const characters = nameList(params.character, 'character', MAX_NAMES)
  const producers = nameList(params.producer, 'producer', MAX_NAMES)
  const alt = flag(params.includeBroadcast)
  const sort = sortKey(params.sort)
  const order = sortOrder(params.order)
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
    .filter((song) => characters.length === 0 || characters.some((name) => song.characters.includes(name)))
    .filter((song) => producers.length === 0 || producers.some((name) => song.producers.includes(name)))
    .map((song) => ({ song, counts: countsOf({ song, mode, series, yearFrom, yearTo, alt }) }))
    .filter((row) => row.counts.count > 0)
  ranked.sort(compareBy(sort, order))
  return {
    mode,
    series,
    yearFrom,
    yearTo,
    character: characters,
    producer: producers,
    includeBroadcast: alt,
    includeMedleyComponents: flag(params.includeMedleyComponents),
    sort,
    order,
    count: ranked.length,
    songs: ranked.slice(0, limit).map(({ song, counts }) => ({
      ...songSummary(song),
      characters: song.characters,
      producers: song.producers,
      count: counts.count,
      showCount: counts.show,
      eventCount: counts.event,
      firstYear: counts.firstYear,
      lastYear: counts.lastYear,
    })),
  }
}

export default defineEventHandler(rankSongs)
