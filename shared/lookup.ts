import { rankSongAppearances } from './stats.ts'
import type { Catalog, PerformanceRow, SeriesRow, SongRow } from './types.ts'

/**
 * Folds one query or name for case-insensitive Latin matching.
 * Japanese and Chinese are unaffected, so they still match by substring.
 */
const fold = (value: string): string => value.trim().toLocaleLowerCase()

/**
 * Relevance of one row's spellings against the folded query.
 * 0 exact, 1 prefix, 2 substring, null no match; a blank spelling never matches.
 */
const nameScore = (spellings: readonly (string | null | undefined)[], needle: string): number | null => {
  let best: number | null = null
  for (const spelling of spellings) {
    if (spelling === null || spelling === undefined || spelling === '') continue
    const value = spelling.toLocaleLowerCase()
    if (value === needle) return 0
    if (value.startsWith(needle)) {
      if (best === null || best > 1) best = 1
      continue
    }
    if (value.includes(needle) && best === null) best = 2
  }
  return best
}

/**
 * One search result set: the rows to print, the real hit count, and the cap that produced `items`.
 * `total` always counts every hit, so a caller can print “共 N 条，显示前 M 条” without guessing.
 */
export type LookupResult<T> = {
  items: T[]
  total: number
  limit: number
}

/** Default caps of the header search panel, one per result type. */
export const LOOKUP_LIMITS = {
  series: 5,
  performances: 5,
  places: 5,
  producers: 5,
  songs: 50,
} as const

/** Passing this as `limit` keeps every hit, for index-style result pages. */
export const LOOKUP_ALL = Number.POSITIVE_INFINITY

/** Wraps the ranked rows into the shared result shape and applies `limit`. */
const rankedResult = <T,>(ranked: T[], limit: number): LookupResult<T> => ({
  items: ranked.slice(0, limit),
  total: ranked.length,
  limit,
})

/** One series hit of the header search. */
export type SeriesLookupHit = {
  seriesId: number
  name: string
  /** 演出 rows in the series, shown next to the name in the result panel. */
  performanceCount: number
}

/** One 演出 hit of the header search. */
export type PerformanceLookupHit = {
  performanceId: number
  name: string
  /** Series the 演出 belongs to, so the panel can translate the series label in its name. */
  seriesId: number
  seriesName: string
  seriesNumber: number | null
  venue: string | null
  startDate: string | null
}

/** One place (venue) hit of the header search. */
export type PlaceLookupHit = {
  /** Venue spelling exactly as the catalog stores it. */
  name: string
  /** 演出 rows held at this venue. */
  performanceCount: number
}

/**
 * Extra spellings a row should also match, e.g. its Chinese name.
 * Callers pass the site's localization so a reader can type the name the page shows.
 */
export type LookupSpellings<T> = (row: T) => readonly string[]

/**
 * Finds series already in the catalog.
 * Matching is a case-insensitive substring over the stored names plus the caller's translations.
 * Exact names come first, then prefixes, then popularity; the default cap is five hits.
 */
export const localSeriesMatches = (
  catalog: Catalog,
  query: string,
  spellings: LookupSpellings<SeriesRow> = () => [],
  limit: number = LOOKUP_LIMITS.series,
): LookupResult<SeriesLookupHit> => {
  const needle = fold(query)
  if (needle === '') return rankedResult([], limit)
  const counts = new Map<number, number>()
  for (const performance of catalog.performances) {
    counts.set(performance.series_id, (counts.get(performance.series_id) ?? 0) + 1)
  }
  const ranked = catalog.series
    .flatMap((row) => {
      const score = nameScore([row.name, row.name_ja, ...spellings(row)], needle)
      if (score === null) return []
      return [{ row, score }]
    })
    .sort((left, right) => {
      const leftCount = counts.get(left.row.id) ?? 0
      const rightCount = counts.get(right.row.id) ?? 0
      return left.score - right.score || rightCount - leftCount || left.row.id - right.row.id
    })
    .map(({ row }) => ({
      seriesId: row.id,
      name: row.name,
      performanceCount: counts.get(row.id) ?? 0,
    }))
  return rankedResult(ranked, limit)
}

/**
 * Finds 演出 already in the catalog by its own name.
 * Venue spellings match through `localPlaceMatches`, so each result set stays about one kind of
 * thing. Exact names come first, then prefixes, then the newest date; the default cap is five hits.
 */
export const localPerformanceMatches = (
  catalog: Catalog,
  query: string,
  spellings: LookupSpellings<PerformanceRow> = () => [],
  limit: number = LOOKUP_LIMITS.performances,
): LookupResult<PerformanceLookupHit> => {
  const needle = fold(query)
  if (needle === '') return rankedResult([], limit)
  const seriesById = new Map(catalog.series.map((row) => [row.id, row]))
  const ranked = catalog.performances
    .flatMap((row) => {
      const score = nameScore([row.name, row.name_ja, ...spellings(row)], needle)
      if (score === null) return []
      return [{ row, score }]
    })
    .sort((left, right) => {
      const dateOrder = (right.row.start_date ?? '').localeCompare(left.row.start_date ?? '')
      return left.score - right.score || dateOrder || right.row.id - left.row.id
    })
    .map(({ row }) => {
      const series = seriesById.get(row.series_id)
      return {
        performanceId: row.id,
        name: row.name,
        seriesId: row.series_id,
        seriesName: series?.name ?? '',
        seriesNumber: row.series_number,
        venue: row.venue_name,
        startDate: row.start_date,
      }
    })
  return rankedResult(ranked, limit)
}

/**
 * Finds venue names already in the catalog, grouped by spelling.
 * The count is the number of 演出 rows held there, so a three-day run still reads as one 演出.
 * Exact names come first, then the most-used venue; the default cap is five hits.
 */
export const localPlaceMatches = (
  catalog: Catalog,
  query: string,
  spellings: LookupSpellings<string> = () => [],
  limit: number = LOOKUP_LIMITS.places,
): LookupResult<PlaceLookupHit> => {
  const needle = fold(query)
  if (needle === '') return rankedResult([], limit)
  const hits = new Map<string, { score: number; performanceCount: number }>()
  for (const performance of catalog.performances) {
    const venue = performance.venue_name
    if (venue === null || venue.trim() === '') continue
    const score = nameScore([venue, ...spellings(venue)], needle)
    if (score === null) continue
    const hit = hits.get(venue) ?? { score, performanceCount: 0 }
    hit.score = Math.min(hit.score, score)
    hit.performanceCount += 1
    hits.set(venue, hit)
  }
  const ranked = [...hits.entries()]
    .sort((left, right) => {
      return (
        left[1].score - right[1].score ||
        right[1].performanceCount - left[1].performanceCount ||
        left[0].localeCompare(right[0], 'ja')
      )
    })
    .map(([name, hit]) => ({ name, performanceCount: hit.performanceCount }))
  return rankedResult(ranked, limit)
}

/** Distinct 演出 each song appeared in, cached per catalog and reused as the popularity tie-break. */
const appearanceCounts = new WeakMap<Catalog, ReadonlyMap<number, number>>()

/** Builds or reuses the 演出 count of every song, so one keystroke does not re-rank the catalog. */
const songAppearanceCounts = (catalog: Catalog): ReadonlyMap<number, number> => {
  const cached = appearanceCounts.get(catalog)
  if (cached !== undefined) return cached
  const counts = new Map<number, number>()
  for (const row of rankSongAppearances(catalog, { mode: 'event', includeBroadcast: true })) {
    counts.set(row.songId, row.performanceCount)
  }
  appearanceCounts.set(catalog, counts)
  return counts
}

/**
 * Finds songs already in the catalog.
 * Matching is a case-insensitive substring over the stored names, the caller's extra spellings
 * (registered Japanese/English alternate titles, Chinese titles and their aliases), and the artist
 * credit. Songs are scored exactly like series and 演出 (exact > prefix > substring), then by
 * distinct 演出 count, and only afterwards capped, so the cap never hides the best matches.
 */
export const localSongMatches = (
  catalog: Catalog,
  query: string,
  spellings: LookupSpellings<SongRow> = () => [],
  limit: number = LOOKUP_LIMITS.songs,
): LookupResult<SongRow> => {
  const needle = fold(query)
  if (needle === '') return rankedResult([], limit)
  const counts = songAppearanceCounts(catalog)
  const ranked = catalog.songs
    .flatMap((song) => {
      const score = nameScore([song.name, song.name_ja, song.name_en, song.artist_string, ...spellings(song)], needle)
      if (score === null) return []
      return [{ song, score }]
    })
    .sort((left, right) => {
      const scoreOrder = left.score - right.score
      if (scoreOrder !== 0) return scoreOrder
      const countOrder = (counts.get(right.song.id) ?? 0) - (counts.get(left.song.id) ?? 0)
      return countOrder !== 0 ? countOrder : left.song.id - right.song.id
    })
    .map(({ song }) => song)
  return rankedResult(ranked, limit)
}

/**
 * Producer names already in the catalog, for the same header search.
 * Re-exported here so the two catalog searches live behind one module.
 */
export { localProducerMatches, type ProducerLookupHit } from './producers.ts'
