import { assignCharacters, type CharacterRule } from './characters.ts'
import { matchCity, type CityIndex, type CityMatch } from './cities.ts'
import { performanceSchedules, showsForNotes } from './event-schedule.ts'
import { derivedItemSongIds, showCountsByPerformance } from './performance-setlists.ts'
import { producerNamesFor } from './producer-options.ts'
import { reviewRotations, type RotationReview } from './rotation.ts'
import { emptySongVariantIndex, type SongVariantIndex } from './song-variants.ts'
import { isBroadcastAppearance, performanceYear } from './stats.ts'
import type { Catalog, PerformanceRow, SongRow } from './types.ts'

/** Where the earliest appearance of a song is read from. */
export type NewSongBaseline = 'catalog' | 'filtered'

/** How a song shared by several characters is counted for each of them. */
export type CharacterSongWeight = 'per-song' | 'split'

/** Filters and counting switches shared by every chart on `/timeline`. */
export type TimelineOptions = {
  /** Count livestream, online, and VR performances. Defaults to false, like the song ranking. */
  includeBroadcast?: boolean
  /** Series ids to keep; an empty or omitted list keeps every series. */
  seriesIds?: readonly number[]
  /** Chinese city names to keep, as returned by `matchCity`; empty keeps every city. */
  cityNames?: readonly string[]
  /** Producer names to keep; a 演出 counts when one of its songs credits a selected name. */
  producers?: readonly string[]
  /** Base character names to keep; a 演出 counts when one of its songs assigns a selected name. */
  characters?: readonly string[]
  /** Inclusive year bounds of the horizontal axis; null keeps that side open. */
  yearFrom?: number | null
  yearTo?: number | null
  /** Variant mapping used to fold remixes, voicebank versions, and covers into one song. */
  variants?: SongVariantIndex
  /** Character rules used to resolve every song's 演出角色; omit to count no characters. */
  characterRules?: readonly CharacterRule[]
  /**
   * Weight of one song on the character chart: `per-song` adds 1 for every song,
   * `split` divides it by the number of characters credited on that song. Defaults to `per-song`.
   */
  characterSongWeight?: CharacterSongWeight
  /** City matcher built from the checked place list; omit to skip city filters and city charts. */
  cityIndex?: CityIndex
  /** First-appearance baseline for the new-song chart. Defaults to the whole catalog. */
  newSongBaseline?: NewSongBaseline
}

/** 场次 and 演出 totals of one calendar year. */
export type TimelineYear = {
  year: number
  shows: number
  performances: number
}

/** One series' 场次 and 演出 totals in one year, for the stacked series chart. */
export type TimelineSeriesYear = {
  year: number
  seriesId: number
  shows: number
  performances: number
}

/** One character's distinct-song count in one year, drawn as the stacked bars of the character chart. */
export type TimelineCharacterSongYear = {
  year: number
  name: string
  count: number
}

/** One character's share of the character chart's songs in one year, drawn as an optional right-axis line. */
export type TimelineCharacterShareYear = {
  year: number
  name: string
  /** This bucket's count divided by every bucket's count; between 0 and 1. */
  share: number
}

/** Aggregated appearance count of one bucket, used for legends and pickers. */
export type TimelineCount = {
  name: string
  count: number
}

/** New and returning song counts of one year, plus the distinct songs behind them. */
export type TimelineSongYear = {
  year: number
  /** Distinct songs whose earliest appearance (under the active baseline) is this year. */
  newSongs: number
  /** Distinct songs played this year that first appeared in an earlier year. */
  returning: number
  /** Distinct songs played this year, including songs with no baseline year. */
  distinctSongs: number
  /** newSongs / (newSongs + returning); null when no song can be classified. */
  newRatio: number | null
  newSongIds: number[]
  returningSongIds: number[]
}

/** City coverage of one year, for the optional city migration chart. */
export type TimelineCityYear = {
  year: number
  /** Distinct identified cities played in this year. */
  cities: number
  /** Cities that appear for the first time in this year's dataset. */
  newCities: number
  /** 演出 held in Japan, by `country_code`. */
  domestic: number
  /** 演出 held outside Japan, by `country_code`. */
  overseas: number
  /** 演出 with no usable `country_code`. */
  unknownCountry: number
  /** overseas / (domestic + overseas); null when neither side has a 演出. */
  overseasRatio: number | null
}

/** Vertical span of one series on the optional gantt chart. */
export type TimelineSeriesSpan = {
  seriesId: number
  firstYear: number
  lastYear: number
  performances: number
  shows: number
}

/** Vertical span of one city on the optional gantt chart. */
export type TimelineCitySpan = {
  city: string
  firstYear: number
  lastYear: number
  performances: number
  shows: number
}

/** One 演出 behind a year's total, so a bar click can list its details. */
export type TimelinePerformance = {
  id: number
  year: number
  seriesId: number
  startDate: string
  shows: number
}

/** Everything `/timeline` draws, computed from one filtered data set. */
export type Timeline = {
  /** Continuous axis years, earliest to latest, gaps included with zero values. */
  years: number[]
  /** Catalog-wide year span before the year filter is applied; null when nothing is dated. */
  catalogYears: { from: number; to: number } | null
  byYear: TimelineYear[]
  seriesByYear: TimelineSeriesYear[]
  /**
   * Distinct songs per character bucket and year, for the stacked bars of the character chart.
   * `count` is fractional under `characterSongWeight: 'split'`.
   */
  characterSongByYear: TimelineCharacterSongYear[]
  /** Each bucket's share of those songs per year, under the same `characterSongWeight`. */
  characterShareByYear: TimelineCharacterShareYear[]
  /** Dataset total distinct songs of every character bucket, most frequent first. */
  characterTotals: TimelineCount[]
  songByYear: TimelineSongYear[]
  seriesSpans: TimelineSeriesSpan[]
  citySpans: TimelineCitySpan[]
  cityByYear: TimelineCityYear[]
  /** Included 演出, oldest first, for the per-year detail lists. */
  performances: TimelinePerformance[]
  /** 演出 dropped because the catalog has no usable start date. */
  excludedUndated: number
  /** 演出 dropped because the active year bounds exclude them. */
  excludedByYear: number
  /** Included 演出 whose label names no city the place list knows. */
  unknownCityPerformances: number
  /** 场次 behind those 演出. */
  unknownCityShows: number
  /** Dataset totals; with no filters the shows match `/series` and the 演出 count is the catalog total. */
  totals: { shows: number; performances: number }
}

/** One song list of a 演出, already resolved to the 场次 that played it. */
type SongUnit = {
  key: string
  songIds: number[]
}

/** Setlist of one 演出: one unit per 场次, plus the union used by 演出-level charts. */
export type PerformanceSongs = {
  byShow: SongUnit[]
  allSongIds: number[]
}

/** Per-catalog data that does not depend on any filter, cached so filter changes stay cheap. */
type CatalogTimelineData = {
  songsByPerformance: Map<number, PerformanceSongs>
  showCounts: Map<number, number>
}

/** One parsed catalog shared by every `buildTimeline` call on that object. */
const catalogCache = new WeakMap<Catalog, CatalogTimelineData>()

/** Empty unit list, used for 演出 without any recorded setlist. */
const EMPTY_SONGS: PerformanceSongs = { byShow: [], allSongIds: [] }

/** Distinct values of a list, keeping the first occurrence order. */
const unique = <T,>(values: Iterable<T>): T[] => [...new Set(values)]

/** Continuous integer years from `from` to `to`, both inclusive. */
const yearSeries = (from: number, to: number): number[] => {
  const years: number[] = []
  for (let year = from; year <= to; year += 1) years.push(year)
  return years
}

/** Catalog row by id, built once per build. */
const songRowsById = (catalog: Catalog): Map<number, SongRow> => new Map(catalog.songs.map((song) => [song.id, song]))

/**
 * Setlists of every 演出, split by 场次.
 *
 * The derived 場次 layer wins wherever it has rows, because it already resolved the note
 * selectors and the curated day/night split. A 演出 with no derived rows falls back to the
 * source setlist and `showsForNotes`, mirroring the song ranking so the two pages agree.
 */
const buildSongsByPerformance = (catalog: Catalog, review: RotationReview): Map<number, PerformanceSongs> => {
  const derived = new Map<number, Map<string, number[]>>()
  for (const item of catalog.performanceShowSetlistItems) {
    const shows = derived.get(item.performance_id) ?? new Map<string, number[]>()
    const ids = shows.get(item.show_key) ?? []
    for (const songId of derivedItemSongIds(catalog, item)) ids.push(songId)
    shows.set(item.show_key, ids)
    derived.set(item.performance_id, shows)
  }

  const schedules = performanceSchedules(catalog, review)
  const linksByList = new Map<number, Catalog['setlistItemSongs']>()
  for (const link of catalog.setlistItemSongs) {
    const bucket = linksByList.get(link.song_list_id) ?? []
    bucket.push(link)
    linksByList.set(link.song_list_id, bucket)
  }
  const lineByKey = new Map(review.lines.map((line) => [`${line.songListId}:${line.position}`, line]))
  const knownPositions = new Set(catalog.setlistItems.map((row) => `${row.song_list_id}:${row.position}`))

  const result = new Map<number, PerformanceSongs>()
  for (const performance of catalog.performances) {
    const shows = derived.get(performance.id)
    if (shows !== undefined && shows.size > 0) {
      const byShow: SongUnit[] = [...shows].map(([key, ids]) => ({ key, songIds: unique(ids) }))
      result.set(performance.id, { byShow, allSongIds: unique(byShow.flatMap((unit) => unit.songIds)) })
      continue
    }
    const listId = performance.song_list_id
    if (listId === null) {
      result.set(performance.id, EMPTY_SONGS)
      continue
    }
    const byShow = new Map<string, number[]>()
    const performanceShows = schedules.get(performance.id) ?? []
    for (const link of linksByList.get(listId) ?? []) {
      if (link.role !== 'listed') continue
      if (!knownPositions.has(`${link.song_list_id}:${link.position}`)) continue
      const line = lineByKey.get(`${link.song_list_id}:${link.position}`)
      if (!line || !line.performanceIds.includes(performance.id)) continue
      for (const show of showsForNotes(line.notes, performance, performanceShows)) {
        const ids = byShow.get(show.key) ?? []
        ids.push(link.song_id)
        byShow.set(show.key, ids)
      }
    }
    const units: SongUnit[] = [...byShow].map(([key, ids]) => ({ key, songIds: unique(ids) }))
    result.set(performance.id, { byShow: units, allSongIds: unique(units.flatMap((unit) => unit.songIds)) })
  }
  return result
}

/** Builds or reuses the filter-independent data of one catalog. */
const timelineData = (catalog: Catalog): CatalogTimelineData => {
  const cached = catalogCache.get(catalog)
  if (cached !== undefined) return cached
  const review = reviewRotations(catalog)
  const data: CatalogTimelineData = {
    songsByPerformance: buildSongsByPerformance(catalog, review),
    showCounts: showCountsByPerformance(catalog, review),
  }
  catalogCache.set(catalog, data)
  return data
}

/**
 * Effective per-场次 song sets of every 演出, sharing the cache `buildTimeline` reads.
 * The JSON API ships this map as a compact asset so the Worker can rebuild an equivalent
 * catalog without the whole SQLite file; both paths therefore aggregate identical rows.
 */
export const timelineSetlists = (catalog: Catalog): ReadonlyMap<number, PerformanceSongs> =>
  timelineData(catalog).songsByPerformance

/** Year of one 演出, or null when the catalog stores no plain calendar day. */
const yearOf = (performance: PerformanceRow): number | null => performanceYear(performance.start_date)

/** Country bucket of one 演出, read from `country_code`. */
const countryBucket = (performance: PerformanceRow): 'domestic' | 'overseas' | 'unknown' => {
  const code = performance.country_code?.trim().toUpperCase()
  if (code === undefined || code === '') return 'unknown'
  return code === 'JP' ? 'domestic' : 'overseas'
}

/** One candidate 演出 after the non-year filters, kept even when it has no date. */
type Candidate = {
  performance: PerformanceRow
  year: number | null
  shows: number
  city: CityMatch | null
  songs: PerformanceSongs
}

/** First appearance year of every song under one baseline. */
const firstYearBySong = (
  performances: readonly { performance: PerformanceRow; songs: PerformanceSongs }[],
  variants: SongVariantIndex,
): Map<number, number> => {
  const first = new Map<number, number>()
  for (const entry of performances) {
    const year = yearOf(entry.performance)
    if (year === null) continue
    for (const songId of entry.songs.allSongIds) {
      const canonical = variants.canonicalSongId(songId)
      const known = first.get(canonical)
      if (known === undefined || year < known) first.set(canonical, year)
    }
  }
  return first
}

/** Sorts counts by frequency, then by name, so legends and pickers stay stable. */
const sortCounts = (counts: Map<string, number>): TimelineCount[] =>
  [...counts]
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name, 'zh'))

/**
 * Aggregates the catalog into the annual series drawn by `/timeline`.
 *
 * The filtered data set is a set of `performances` rows. Series, city, broadcast, producer, and
 * character filters decide which rows belong to it; the year bounds clip the horizontal axis and
 * drop rows outside it. Undated rows never enter a year chart and are reported in
 * `excludedUndated`.
 *
 * Units reuse the site's existing derivations: `showCountsByPerformance` for 場次 (derived layer
 * first, note schedule second) and the derived setlist layer for songs, so the totals match
 * `/series`, `/cities`, `/producers`, and the song ranking. Characters are read from the song
 * actually performed, not from its merged canonical version, because a cover credits its own
 * vocalists.
 *
 * The character chart counts distinct songs per year, once per song however many 場次 played it.
 * `characterSongWeight: 'split'` shares one song's count across its credited characters, so a
 * duet gives each 0.5 and a trio gives each 1 / 3.
 */
export const buildTimeline = (catalog: Catalog, options: TimelineOptions = {}): Timeline => {
  const variants = options.variants ?? emptySongVariantIndex()
  const characterSongWeight: CharacterSongWeight = options.characterSongWeight === 'split' ? 'split' : 'per-song'
  const includeBroadcast = options.includeBroadcast === true
  const baseline: NewSongBaseline = options.newSongBaseline === 'filtered' ? 'filtered' : 'catalog'
  const data = timelineData(catalog)
  const knownSeries = new Set(catalog.series.map((series) => series.id))
  const selectedSeries = options.seriesIds && options.seriesIds.length > 0 ? new Set(options.seriesIds) : null
  const selectedCities = options.cityNames && options.cityNames.length > 0 ? new Set(options.cityNames) : null
  const selectedProducers = options.producers && options.producers.length > 0 ? new Set(options.producers) : null
  const selectedCharacters = options.characters && options.characters.length > 0 ? new Set(options.characters) : null
  const characterRules = options.characterRules ?? []
  const cityIndex = options.cityIndex
  const songsById = songRowsById(catalog)

  /** Character names of one song, cached for this build. */
  const characterCache = new Map<number, string[]>()
  /** Producer names of one song, cached for this build. */
  const producerCache = new Map<number, string[]>()

  /** Character names assigned to one performed song; empty when no rule matches or the catalog has no row. */
  const charactersOf = (songId: number): string[] => {
    const cached = characterCache.get(songId)
    if (cached !== undefined) return cached
    const song = songsById.get(songId)
    const names = song === undefined
      ? []
      : assignCharacters(characterRules, { vocalists: song.vocalists ?? null, artistString: song.artist_string }).characters
    characterCache.set(songId, names)
    return names
  }

  /** Producer names of one performed song, resolved by the ranking's credit rule. */
  const producersOf = (songId: number): string[] => {
    const cached = producerCache.get(songId)
    if (cached !== undefined) return cached
    const song = songsById.get(songId)
    const names = song === undefined ? [] : producerNamesFor(song)
    producerCache.set(songId, names)
    return names
  }

  // Catalog-wide axis: the earliest and latest dated 演出, independent of every filter.
  const catalogYearsList = catalog.performances.map(yearOf).filter((year): year is number => year !== null)
  const catalogMin = catalogYearsList.length === 0 ? null : Math.min(...catalogYearsList)
  const catalogMax = catalogYearsList.length === 0 ? null : Math.max(...catalogYearsList)
  const yearFrom = options.yearFrom ?? null
  const yearTo = options.yearTo ?? null

  const candidates: Candidate[] = []
  let excludedUndated = 0
  let excludedByYear = 0

  for (const performance of catalog.performances) {
    if (!knownSeries.has(performance.series_id)) continue
    if (selectedSeries !== null && !selectedSeries.has(performance.series_id)) continue
    if (!includeBroadcast && isBroadcastAppearance(performance)) continue
    const city = cityIndex === undefined ? null : matchCity(performance, cityIndex)
    if (selectedCities !== null && (city === null || !selectedCities.has(city.city))) continue
    const songs = data.songsByPerformance.get(performance.id) ?? EMPTY_SONGS
    if (selectedProducers !== null) {
      const hit = songs.allSongIds.some((songId) => producersOf(songId).some((name) => selectedProducers.has(name)))
      if (!hit) continue
    }
    if (selectedCharacters !== null) {
      const hit = songs.allSongIds.some((songId) => charactersOf(songId).some((name) => selectedCharacters.has(name)))
      if (!hit) continue
    }
    const year = yearOf(performance)
    const shows = data.showCounts.get(performance.id) ?? (year === null ? 0 : 1)
    candidates.push({ performance, year, shows, city, songs })
  }

  const axisFrom = catalogMin === null ? null : yearFrom === null ? catalogMin : Math.max(catalogMin, yearFrom)
  const axisTo = catalogMax === null ? null : yearTo === null ? catalogMax : Math.min(catalogMax, yearTo)
  const years = axisFrom === null || axisTo === null || axisFrom > axisTo ? [] : yearSeries(axisFrom, axisTo)

  const included: Candidate[] = []
  for (const candidate of candidates) {
    if (candidate.year === null) {
      excludedUndated += 1
      continue
    }
    if (years.length === 0 || candidate.year < (axisFrom as number) || candidate.year > (axisTo as number)) {
      excludedByYear += 1
      continue
    }
    included.push(candidate)
  }

  const byYear = new Map<number, TimelineYear>()
  for (const year of years) byYear.set(year, { year, shows: 0, performances: 0 })
  const seriesYear = new Map<string, TimelineSeriesYear>()
  /**
   * Distinct songs per bucket and year, behind the stacked bars of the character chart.
   * The inner map holds one weight per canonical song, so a chorus song can count as a fraction.
   */
  const characterSongYear = new Map<number, Map<string, Map<number, number>>>()
  const playedSongsByYear = new Map<number, Set<number>>()
  const seriesSpans = new Map<number, TimelineSeriesSpan>()
  const citySpans = new Map<string, TimelineCitySpan>()
  const cityYear = new Map<number, { cities: Set<string>; newCities: number; domestic: number; overseas: number; unknownCountry: number }>()
  const performances: TimelinePerformance[] = []
  let unknownCityPerformances = 0
  let unknownCityShows = 0
  let totalShows = 0

  for (const candidate of included) {
    const year = candidate.year as number
    const row = byYear.get(year)
    if (row !== undefined) {
      row.shows += candidate.shows
      row.performances += 1
    }
    totalShows += candidate.shows
    performances.push({
      id: candidate.performance.id,
      year,
      seriesId: candidate.performance.series_id,
      startDate: candidate.performance.start_date ?? '',
      shows: candidate.shows,
    })

    const seriesKey = `${year}:${candidate.performance.series_id}`
    const seriesRow = seriesYear.get(seriesKey) ?? {
      year,
      seriesId: candidate.performance.series_id,
      shows: 0,
      performances: 0,
    }
    seriesRow.shows += candidate.shows
    seriesRow.performances += 1
    seriesYear.set(seriesKey, seriesRow)

    const span = seriesSpans.get(candidate.performance.series_id) ?? {
      seriesId: candidate.performance.series_id,
      firstYear: year,
      lastYear: year,
      performances: 0,
      shows: 0,
    }
    span.firstYear = Math.min(span.firstYear, year)
    span.lastYear = Math.max(span.lastYear, year)
    span.performances += 1
    span.shows += candidate.shows
    seriesSpans.set(candidate.performance.series_id, span)

    const songs = playedSongsByYear.get(year) ?? new Set<number>()
    for (const songId of candidate.songs.allSongIds) songs.add(variants.canonicalSongId(songId))
    playedSongsByYear.set(year, songs)

    // The bars count distinct songs, so a song played at several 場次 of the same year is added once.
    const yearSongs = characterSongYear.get(year) ?? new Map<string, Map<number, number>>()
    /** Records one song under one bucket for this year, keeping the largest weight of a repeat. */
    const addSong = (name: string, canonical: number, weight: number): void => {
      const bucket = yearSongs.get(name) ?? new Map<number, number>()
      bucket.set(canonical, Math.max(bucket.get(canonical) ?? 0, weight))
      yearSongs.set(name, bucket)
    }
    for (const songId of candidate.songs.allSongIds) {
      const canonical = variants.canonicalSongId(songId)
      const names = charactersOf(songId)
      // A chorus song shares its one count across its characters, so a duet gives each 0.5.
      const weight = characterSongWeight === 'split' ? 1 / Math.max(1, names.length) : 1
      for (const name of names) addSong(name, canonical, weight)
    }
    characterSongYear.set(year, yearSongs)

    if (cityIndex !== undefined) {
      const bucket = cityYear.get(year) ?? { cities: new Set<string>(), newCities: 0, domestic: 0, overseas: 0, unknownCountry: 0 }
      const country = countryBucket(candidate.performance)
      if (country === 'domestic') bucket.domestic += 1
      else if (country === 'overseas') bucket.overseas += 1
      else bucket.unknownCountry += 1
      if (candidate.city === null) {
        unknownCityPerformances += 1
        unknownCityShows += candidate.shows
      } else {
        bucket.cities.add(candidate.city.city)
        const citySpan = citySpans.get(candidate.city.city) ?? {
          city: candidate.city.city,
          firstYear: year,
          lastYear: year,
          performances: 0,
          shows: 0,
        }
        citySpan.firstYear = Math.min(citySpan.firstYear, year)
        citySpan.lastYear = Math.max(citySpan.lastYear, year)
        citySpan.performances += 1
        citySpan.shows += candidate.shows
        citySpans.set(candidate.city.city, citySpan)
      }
      cityYear.set(year, bucket)
    }
  }

  // Cities that first appear in a year are new only under the current filter set.
  const firstCityYear = new Map<string, number>()
  for (const span of citySpans.values()) firstCityYear.set(span.city, span.firstYear)
  for (const [year, bucket] of cityYear) {
    bucket.newCities = [...bucket.cities].filter((city) => firstCityYear.get(city) === year).length
  }

  const baselinePerformances = baseline === 'catalog'
    ? catalog.performances
        .filter((performance) => yearOf(performance) !== null && (includeBroadcast || !isBroadcastAppearance(performance)))
        .map((performance) => ({ performance, songs: data.songsByPerformance.get(performance.id) ?? EMPTY_SONGS }))
    : candidates
        .filter((candidate) => candidate.year !== null)
        .map((candidate) => ({ performance: candidate.performance, songs: candidate.songs }))
  const firstYear = firstYearBySong(baselinePerformances, variants)

  const songByYear = years.map((year): TimelineSongYear => {
    const played = [...(playedSongsByYear.get(year) ?? new Set<number>())].sort((left, right) => left - right)
    const newSongIds = played.filter((songId) => firstYear.get(songId) === year)
    const returningSongIds = played.filter((songId) => {
      const first = firstYear.get(songId)
      return first !== undefined && first < year
    })
    const classified = newSongIds.length + returningSongIds.length
    return {
      year,
      newSongs: newSongIds.length,
      returning: returningSongIds.length,
      distinctSongs: played.length,
      newRatio: classified === 0 ? null : newSongIds.length / classified,
      newSongIds,
      returningSongIds,
    }
  })

  const characterSongByYear: TimelineCharacterSongYear[] = []
  /** Each bucket's share of the year's songs, for the optional share lines of the character chart. */
  const characterShareByYear: TimelineCharacterShareYear[] = []
  /** Dataset total distinct songs per bucket, used to pick the busiest buckets of the chart. */
  const characterTotals = new Map<string, number>()
  for (const year of years) {
    const counts = new Map<string, number>()
    let total = 0
    for (const [name, songs] of characterSongYear.get(year) ?? []) {
      let count = 0
      for (const weight of songs.values()) count += weight
      characterSongByYear.push({ year, name, count })
      characterTotals.set(name, (characterTotals.get(name) ?? 0) + songs.size)
      counts.set(name, count)
      total += count
    }
    // A year without any character song leaves the shares undefined rather than drawing 0%.
    if (total <= 0) continue
    for (const [name, count] of counts) characterShareByYear.push({ year, name, share: count / total })
  }

  const cityByYear = years.map((year): TimelineCityYear => {
    const bucket = cityYear.get(year)
    if (bucket === undefined) {
      return { year, cities: 0, newCities: 0, domestic: 0, overseas: 0, unknownCountry: 0, overseasRatio: null }
    }
    const abroad = bucket.domestic + bucket.overseas
    return {
      year,
      cities: bucket.cities.size,
      newCities: bucket.newCities,
      domestic: bucket.domestic,
      overseas: bucket.overseas,
      unknownCountry: bucket.unknownCountry,
      overseasRatio: abroad === 0 ? null : bucket.overseas / abroad,
    }
  })

  return {
    years,
    catalogYears: catalogMin === null || catalogMax === null ? null : { from: catalogMin, to: catalogMax },
    byYear: years.map((year) => byYear.get(year) as TimelineYear),
    seriesByYear: [...seriesYear.values()].sort(
      (left, right) => left.year - right.year || left.seriesId - right.seriesId,
    ),
    characterSongByYear,
    characterShareByYear,
    characterTotals: sortCounts(characterTotals),
    songByYear,
    seriesSpans: [...seriesSpans.values()].sort(
      (left, right) => left.firstYear - right.firstYear || left.seriesId - right.seriesId,
    ),
    citySpans: [...citySpans.values()].sort(
      (left, right) => right.performances - left.performances || left.city.localeCompare(right.city, 'zh'),
    ),
    cityByYear,
    performances: performances.sort(
      (left, right) => left.startDate.localeCompare(right.startDate) || left.id - right.id,
    ),
    excludedUndated,
    excludedByYear,
    unknownCityPerformances,
    unknownCityShows,
    totals: { shows: totalShows, performances: included.length },
  }
}
