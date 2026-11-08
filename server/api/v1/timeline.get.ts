import { createError, defineEventHandler, getQuery, type H3Event } from 'h3'
import { emptySongVariantIndex } from '../../../shared/song-variants.ts'
import { buildTimeline, type CharacterSongWeight, type NewSongBaseline, type TimelineOptions } from '../../../shared/timeline.ts'
import { API_BASE_URL, nameList } from '../../utils/api-songs.ts'
import { loadTimelineApi } from '../../utils/api-timeline.ts'

/** Series ids one request may filter by. */
const MAX_SERIES = 20

/** City, character, or producer names one request may filter by. */
const MAX_NAMES = 20

/** Reads a flag that defaults to on: only `0` / `false` turn it off. */
const flagDefaultOn = (raw: unknown): boolean => raw !== '0' && raw !== 'false'

/** Reads the opt-in boolean flag: `1` / `true` turn it on. */
const flagOff = (raw: unknown): boolean => raw === '1' || raw === 'true'

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

/** Reads how the new-song chart decides a song's first year. */
const newSongBaseline = (raw: unknown): NewSongBaseline => {
  if (raw === undefined) return 'catalog'
  if (raw === 'catalog' || raw === 'filtered') return raw
  throw createError({
    statusCode: 400,
    statusMessage: 'Invalid baseline',
    message: 'newSongBaseline 只能是 catalog 或 filtered',
  })
}

/** Reads how a chorus song is counted on the character chart. */
const characterSongWeight = (raw: unknown): CharacterSongWeight => {
  if (raw === undefined) return 'per-song'
  if (raw === 'per-song' || raw === 'split') return raw
  throw createError({
    statusCode: 400,
    statusMessage: 'Invalid characterSongWeight',
    message: 'characterSongWeight 只能是 per-song 或 split',
  })
}

/**
 * `GET /api/v1/timeline` — the annual series drawn by `/timeline`, aggregated with the
 * page's own `buildTimeline` so both give the same numbers.
 *
 * Unlike the song ranking, the page counts livestream / online / VR 演出 by default, so
 * `includeBroadcast` defaults to on here; pass `includeBroadcast=0` to count live shows only.
 * Every filter is optional; an omitted filter keeps every row, exactly like the page.
 */
const timeline = async (event: H3Event) => {
  const params = getQuery(event)
  const series = seriesFilter(params.series)
  const yearFrom = yearBound(params.yearFrom, 'yearFrom')
  const yearTo = yearBound(params.yearTo, 'yearTo')
  const cityNames = nameList(params.city, 'city', MAX_NAMES)
  const characters = nameList(params.character, 'character', MAX_NAMES)
  const producers = nameList(params.producer, 'producer', MAX_NAMES)
  const includeBroadcast = flagDefaultOn(params.includeBroadcast)
  const mergeVariants = flagOff(params.mergeVariants)
  const includeSongIds = flagOff(params.includeSongIds)
  const includePerformances = flagDefaultOn(params.includePerformances)
  const baseline = newSongBaseline(params.newSongBaseline)
  const songWeight = characterSongWeight(params.characterSongWeight)
  if (yearFrom !== null && yearTo !== null && yearFrom > yearTo) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid year range', message: 'yearFrom 不能大于 yearTo' })
  }

  const data = await loadTimelineApi()
  const knownSeries = new Set(data.asset.series.map((row) => row.id))
  const unknownSeries = (series ?? []).filter((id) => !knownSeries.has(id))
  if (unknownSeries.length > 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Unknown series',
      message: `未知系列 id：${unknownSeries.join(', ')}；先用 /api/v1/series.json 查询`,
    })
  }
  const knownCharacters = new Set(data.characters.map((rule) => rule.name))
  const unknownCharacters = characters.filter((name) => !knownCharacters.has(name))
  if (unknownCharacters.length > 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Unknown character',
      message: `未知角色：${unknownCharacters.join(', ')}；角色名见 /api/v1/filters.json`,
    })
  }

  const options: TimelineOptions = {
    includeBroadcast,
    seriesIds: series ?? [],
    cityNames,
    producers,
    characters,
    yearFrom,
    yearTo,
    variants: mergeVariants ? data.variants : emptySongVariantIndex(),
    characterRules: data.characters,
    characterSongWeight: songWeight,
    cityIndex: data.cityIndex,
    newSongBaseline: baseline,
  }
  const current = buildTimeline(data.catalog, options)
  const seriesName = new Map(data.asset.series.map((row) => [row.id, row.name]))
  const nameOf = (id: number): string => seriesName.get(id) ?? String(id)
  const performanceById = new Map(data.asset.performances.map((row) => [row.id, row]))

  const payload: Record<string, unknown> = {
    generatedAt: data.asset.generatedAt,
    catalogVersion: data.asset.catalogVersion,
    options: {
      includeBroadcast,
      series,
      city: cityNames,
      character: characters,
      producer: producers,
      yearFrom,
      yearTo,
      mergeVariants,
      characterSongWeight: songWeight,
      newSongBaseline: baseline,
    },
    years: current.years,
    catalogYears: current.catalogYears,
    byYear: current.byYear,
    seriesByYear: current.seriesByYear.map((row) => ({ ...row, series: nameOf(row.seriesId) })),
    characterSongByYear: current.characterSongByYear,
    characterShareByYear: current.characterShareByYear,
    characterTotals: current.characterTotals,
    songByYear: current.songByYear.map((row) =>
      includeSongIds
        ? row
        : {
            year: row.year,
            newSongs: row.newSongs,
            returning: row.returning,
            distinctSongs: row.distinctSongs,
            newRatio: row.newRatio,
          },
    ),
    seriesSpans: current.seriesSpans.map((row) => ({ ...row, series: nameOf(row.seriesId) })),
    cityByYear: current.cityByYear,
    citySpans: current.citySpans,
    performances: includePerformances
      ? current.performances.map((row) => ({
          ...row,
          name: performanceById.get(row.id)?.name ?? String(row.id),
          series: nameOf(row.seriesId),
          url: `${API_BASE_URL}/shows/${row.id}`,
        }))
      : [],
    excluded: {
      undated: current.excludedUndated,
      byYear: current.excludedByYear,
      unknownCityPerformances: current.unknownCityPerformances,
      unknownCityShows: current.unknownCityShows,
    },
    totals: current.totals,
    url: `${API_BASE_URL}/timeline`,
  }

  if (includeSongIds) {
    const referenced = new Set<number>()
    for (const row of current.songByYear) {
      for (const id of row.newSongIds) referenced.add(id)
      for (const id of row.returningSongIds) referenced.add(id)
    }
    payload.songs = [...referenced]
      .sort((left, right) => left - right)
      .flatMap((id) => {
        const song = data.songNames.get(id)
        return song === undefined ? [] : [{ id, ...song }]
      })
  }

  return payload
}

export default defineEventHandler(timeline)
