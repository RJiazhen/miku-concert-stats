import type { PlaceNameIndex } from './place-names.ts'
import type { Locale } from './i18n/index.ts'
import { showsForPerformance } from './event-schedule.ts'
import { CITY_ALIASES } from './rotation.ts'
import { isBroadcastAppearance, performanceYear } from './stats.ts'
import type { PerformanceRow } from './types.ts'

/** Performance fields the city ranking reads. */
export type CityShow = Pick<
  PerformanceRow,
  'id' | 'name' | 'name_ja' | 'venue_name' | 'series_suffix' | 'start_date' | 'end_date' | 'role'
>

/** One spelling that identifies a city inside a performance label. */
type CitySpelling = {
  /** Chinese display name the spelling belongs to. */
  city: string
  /** Matcher; Latin spellings only match whole words. */
  pattern: RegExp
}

/** Spellings built from the hand-checked place list plus the rotation city aliases. */
export type CityIndex = {
  /** Every spelling, longest first so `Washington D.C.` wins over `Washington`. */
  spellings: readonly CitySpelling[]
  /** Chinese city key to the English name shown while the site language is English. */
  englishNames: ReadonlyMap<string, string>
  /** Chinese city key to the Traditional Chinese name shown while the site language is Traditional Chinese. */
  hantNames: ReadonlyMap<string, string>
}

/** City named by a performance label, with the spelling exactly as the catalog writes it. */
export type CityMatch = {
  /** Chinese display name. */
  city: string
  /** Source spelling, e.g. `TOKYO` or `東京都`. */
  original: string
}

/** One city's concert and 场次 totals. */
export type CityRank = {
  /** Chinese display name; also the grouping key. */
  city: string
  /** Other spellings seen for this city, most frequent first. */
  originalNames: string[]
  /** Distinct 演出 rows held in the city. */
  concerts: number
  /** Individual 场次: one per calendar day of each 演出, split into halves when known. */
  shows: number
  firstYear: number | null
  lastYear: number | null
  performanceIds: number[]
}

/** Performances that name no resolvable city, kept out of the ranking but reported. */
export type UnknownCityTotals = {
  concerts: number
  shows: number
  performanceIds: number[]
}

/** Ranked cities plus the rows that could not be placed. */
export type CityRanking = {
  rows: CityRank[]
  unknown: UnknownCityTotals
}

/** How the ranking treats livestreams and other events without a venue. */
export type CityRankingOptions = {
  /** Count livestream, online, and VR performances. They are excluded by default like the song ranking. */
  includeBroadcast?: boolean
  /** Precomputed 场次 counts per performance id, including day/night halves; defaults to calendar days. */
  showCounts?: ReadonlyMap<number, number>
}

/** Performance fields checked for a city label, most specific first. */
const CITY_FIELDS = ['series_suffix', 'name', 'name_ja', 'venue_name'] as const

/** Latin spellings need a word boundary so `Tokyo` does not match inside another word. */
const LATIN = /^[\x20-\x7E]+$/

/** Administrative suffixes that would otherwise split 东京都 and 东京 into two rows. */
const ADMIN_SUFFIX = /[都市]$/

/** Shortest stripped name kept; `京都` ends in 都 but is the city name itself. */
const MIN_CITY_LENGTH = 2

/** Escapes a literal string for use inside a regular expression. */
const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Matcher for one spelling: whole words for Latin text, plain substring for CJK. */
const cityPattern = (spelling: string): RegExp => {
  const escaped = escapeRegex(spelling)
  if (LATIN.test(spelling)) return new RegExp(`(?<![A-Za-z])${escaped}(?![A-Za-z])`, 'i')
  return new RegExp(escaped)
}

/** Capitalizes the words of a lower-case Latin city alias, so `new york` shows as `New York`. */
const titleCase = (value: string): string =>
  value.replace(/(^|[\s-])([a-z])/g, (_match, lead: string, letter: string) => `${lead}${letter.toUpperCase()}`)

/**
 * Grouping key for a Chinese place name.
 * Drops a trailing 都 / 市 so 东京都, 东京, and 東京都 share one row; a name that would
 * shrink below two characters (`京都`) keeps its suffix.
 */
export const cityKey = (name: string): string => {
  const trimmed = name.trim()
  const stripped = trimmed.replace(ADMIN_SUFFIX, '')
  return stripped.length >= MIN_CITY_LENGTH ? stripped : trimmed
}

/**
 * Builds the city matcher from the checked place names and the rotation aliases.
 * Place names supply the Chinese display name; the aliases add Japanese spellings
 * (`大阪`, `札幌`) that the place list only stores in Latin script.
 */
export const buildCityIndex = (places: PlaceNameIndex): CityIndex => {
  /** Lower-cased spelling to its Chinese city and source text, so one spelling never claims two cities. */
  const claimed = new Map<string, { city: string; text: string }>()
  /** Chinese city key to the English label; the first spelling with a translation wins. */
  const englishNames = new Map<string, string>()
  /** Chinese city key to the Traditional Chinese label; the first spelling with a translation wins. */
  const hantNames = new Map<string, string>()

  /** Records one spelling when no other city already owns it, and claims the English label. */
  const add = (city: string, spelling: string): void => {
    const text = spelling.trim()
    if (text === '') return
    if (!englishNames.has(city)) {
      const translated = places.names.en[text]
      if (translated !== undefined) englishNames.set(city, translated)
      else if (LATIN.test(text)) englishNames.set(city, titleCase(text))
    }
    const folded = text.toLowerCase()
    if (claimed.has(folded)) return
    claimed.set(folded, { city, text })
  }

  for (const [spelling, name] of Object.entries(places.names.zh)) {
    const city = cityKey(name)
    add(city, spelling)
    const hant = places.names['zh-Hant'][spelling]
    if (hant !== undefined && !hantNames.has(city)) hantNames.set(city, hant)
  }

  for (const [key, aliases] of CITY_ALIASES) {
    const city = claimed.get(key)?.city
    if (city === undefined) continue
    for (const alias of aliases) add(city, alias)
  }

  const spellings = [...claimed.values()]
    .sort((left, right) => right.text.length - left.text.length)
    .map(({ text, city }) => ({ city, pattern: cityPattern(text) }))
  return { spellings, englishNames, hantNames }
}

/**
 * City name shown in the active language.
 * English uses the checked English name (or the Latin spelling); Traditional Chinese uses the
 * checked Traditional name; Simplified Chinese and Japanese keep the Chinese city key the ranking
 * groups by.
 */
export const cityLabel = (index: CityIndex, city: string, locale: Locale): string => {
  if (locale === 'en') return index.englishNames.get(city) ?? city
  if (locale === 'zh-Hant') return index.hantNames.get(city) ?? city
  return city
}

/**
 * City named by a performance.
 * Checked fields run most specific first: series suffix, then name, Japanese name, venue.
 * Returns null when no checked spelling occurs, e.g. an online-only stream.
 */
export const matchCity = (performance: CityShow, index: CityIndex): CityMatch | null => {
  for (const field of CITY_FIELDS) {
    const label = performance[field]
    if (label === null || label === '') continue
    for (const spelling of index.spellings) {
      const found = label.match(spelling.pattern)
      if (found !== null) return { city: spelling.city, original: found[0] }
    }
  }
  return null
}

/**
 * 场次 a dated 演出 covers.
 * Each covered calendar day is one 场次. Undated rows still happened once, so they count one.
 * Day/night halves are only known from setlist notes; callers that have them pass a precomputed
 * count through `CityRankingOptions.showCounts`.
 */
export const showCount = (performance: CityShow): number => {
  const shows = showsForPerformance(performance)
  return shows.length === 0 ? 1 : shows.length
}

/** Shows first, then concerts, then a stable name order for fully tied cities. */
const compareCities = (left: CityRank, right: CityRank): number => {
  return right.shows - left.shows || right.concerts - left.concerts || left.city.localeCompare(right.city, 'zh')
}

/**
 * Ranks cities by how many 场次 were held there.
 * Concerts are distinct `performances` rows; 场次 are the calendar days those rows cover
 * (split into day/night halves when the caller supplies counts), so a three-day 演出
 * contributes one 演出 and three 场次 to its city.
 * Broadcast-only rows are dropped unless `includeBroadcast` is set. Unresolved rows are
 * reported in `unknown` instead of inventing a city.
 */
export const rankCities = (
  performances: readonly CityShow[],
  index: CityIndex,
  options: CityRankingOptions = {},
): CityRanking => {
  const buckets = new Map<string, { row: CityRank; spellings: Map<string, number> }>()
  const unknownIds: number[] = []
  let unknownConcerts = 0
  let unknownShows = 0

  for (const performance of performances) {
    if (options.includeBroadcast !== true && isBroadcastAppearance(performance)) continue
    const shows = options.showCounts?.get(performance.id) ?? showCount(performance)
    const match = matchCity(performance, index)
    if (match === null) {
      unknownConcerts += 1
      unknownShows += shows
      unknownIds.push(performance.id)
      continue
    }
    const bucket = buckets.get(match.city) ?? {
      row: { city: match.city, originalNames: [], concerts: 0, shows: 0, firstYear: null, lastYear: null, performanceIds: [] },
      spellings: new Map<string, number>(),
    }
    bucket.row.concerts += 1
    bucket.row.shows += shows
    bucket.row.performanceIds.push(performance.id)
    bucket.spellings.set(match.original, (bucket.spellings.get(match.original) ?? 0) + 1)
    const year = performanceYear(performance.start_date)
    if (year !== null) {
      bucket.row.firstYear = bucket.row.firstYear === null ? year : Math.min(bucket.row.firstYear, year)
      bucket.row.lastYear = bucket.row.lastYear === null ? year : Math.max(bucket.row.lastYear, year)
    }
    buckets.set(match.city, bucket)
  }

  const rows = [...buckets.values()].map(({ row, spellings }) => {
    row.originalNames = [...spellings.entries()]
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], 'en'))
      .map(([spelling]) => spelling)
    row.performanceIds.sort((left, right) => left - right)
    return row
  })
  rows.sort(compareCities)
  unknownIds.sort((left, right) => left - right)
  return { rows, unknown: { concerts: unknownConcerts, shows: unknownShows, performanceIds: unknownIds } }
}
