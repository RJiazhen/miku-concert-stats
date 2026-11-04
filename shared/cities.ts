import type { PlaceNameIndex } from './place-names.ts'
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
}

/** City named by a performance label, with the spelling exactly as the catalog writes it. */
export type CityMatch = {
  /** Chinese display name. */
  city: string
  /** Source spelling, e.g. `TOKYO` or `東京都`. */
  original: string
}

/** One city's concert and show totals. */
export type CityRank = {
  /** Chinese display name; also the grouping key. */
  city: string
  /** Other spellings seen for this city, most frequent first. */
  originalNames: string[]
  /** Distinct concert rows held in the city. */
  concerts: number
  /** Individual performances: one per calendar day of each concert row. */
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
}

/** Performance fields checked for a city label, most specific first. */
const CITY_FIELDS = ['series_suffix', 'name', 'name_ja', 'venue_name'] as const

/** Latin spellings need a word boundary so `Tokyo` does not match inside another word. */
const LATIN = /^[\x20-\x7E]+$/

/** Administrative suffixes that would otherwise split 东京都 and 东京 into two rows. */
const ADMIN_SUFFIX = /[都市]$/

/** Shortest stripped name kept; `京都` ends in 都 but is the city name itself. */
const MIN_CITY_LENGTH = 2

/** Longest range counted, matching the rotation parser's two-week cap. */
const MAX_SHOW_DAYS = 14

/** Milliseconds in one calendar day. */
const DAY_MS = 86_400_000

/** Escapes a literal string for use inside a regular expression. */
const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Matcher for one spelling: whole words for Latin text, plain substring for CJK. */
const cityPattern = (spelling: string): RegExp => {
  const escaped = escapeRegex(spelling)
  if (LATIN.test(spelling)) return new RegExp(`(?<![A-Za-z])${escaped}(?![A-Za-z])`, 'i')
  return new RegExp(escaped)
}

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

  /** Records one spelling when no other city already owns it. */
  const add = (city: string, spelling: string): void => {
    const text = spelling.trim()
    if (text === '') return
    const folded = text.toLowerCase()
    if (claimed.has(folded)) return
    claimed.set(folded, { city, text })
  }

  for (const [spelling, name] of Object.entries(places.names)) add(cityKey(name), spelling)

  for (const [key, aliases] of CITY_ALIASES) {
    const city = claimed.get(key)?.city
    if (city === undefined) continue
    for (const alias of aliases) add(city, alias)
  }

  const spellings = [...claimed.values()]
    .sort((left, right) => right.text.length - left.text.length)
    .map(({ text, city }) => ({ city, pattern: cityPattern(text) }))
  return { spellings }
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
 * Performances a dated concert row covers.
 * VocaDB keeps day precision only, so every calendar day from start through end counts
 * as one show. Undated rows still happened once, and an unreasonable range is capped.
 */
export const showCount = (performance: CityShow): number => {
  const start = performance.start_date
  if (start === null || !/^\d{4}-\d{2}-\d{2}$/.test(start)) return 1
  const end = performance.end_date
  const last = end !== null && /^\d{4}-\d{2}-\d{2}$/.test(end) && end >= start ? end : start
  const days = Math.floor((Date.parse(`${last}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / DAY_MS) + 1
  return Math.min(Math.max(days, 1), MAX_SHOW_DAYS)
}

/** Shows first, then concerts, then a stable name order for fully tied cities. */
const compareCities = (left: CityRank, right: CityRank): number => {
  return right.shows - left.shows || right.concerts - left.concerts || left.city.localeCompare(right.city, 'zh')
}

/**
 * Ranks cities by how many shows were held there.
 * Concerts are distinct performance rows; shows are the calendar days those rows cover,
 * so a three-day edition contributes one concert and three shows to its city.
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
    const shows = showCount(performance)
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
