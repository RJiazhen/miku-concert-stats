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
 * Exact names come first, then prefixes, then popularity; returns at most five hits.
 */
export const localSeriesMatches = (
  catalog: Catalog,
  query: string,
  spellings: LookupSpellings<SeriesRow> = () => [],
): SeriesLookupHit[] => {
  const needle = fold(query)
  if (needle === '') return []
  const counts = new Map<number, number>()
  for (const performance of catalog.performances) {
    counts.set(performance.series_id, (counts.get(performance.series_id) ?? 0) + 1)
  }
  return catalog.series
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
    .slice(0, 5)
    .map(({ row }) => ({
      seriesId: row.id,
      name: row.name,
      performanceCount: counts.get(row.id) ?? 0,
    }))
}

/**
 * Finds 演出 already in the catalog by its own name.
 * Venue spellings match through `localPlaceMatches`, so each result set stays about one kind of
 * thing. Exact names come first, then prefixes, then the newest date; returns at most five hits.
 */
export const localPerformanceMatches = (
  catalog: Catalog,
  query: string,
  spellings: LookupSpellings<PerformanceRow> = () => [],
): PerformanceLookupHit[] => {
  const needle = fold(query)
  if (needle === '') return []
  const seriesById = new Map(catalog.series.map((row) => [row.id, row]))
  return catalog.performances
    .flatMap((row) => {
      const score = nameScore([row.name, row.name_ja, ...spellings(row)], needle)
      if (score === null) return []
      return [{ row, score }]
    })
    .sort((left, right) => {
      const dateOrder = (right.row.start_date ?? '').localeCompare(left.row.start_date ?? '')
      return left.score - right.score || dateOrder || right.row.id - left.row.id
    })
    .slice(0, 5)
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
}

/**
 * Finds venue names already in the catalog, grouped by spelling.
 * The count is the number of 演出 rows held there, so a three-day run still reads as one 演出.
 * Exact names come first, then the most-used venue; returns at most five hits.
 */
export const localPlaceMatches = (
  catalog: Catalog,
  query: string,
  spellings: LookupSpellings<string> = () => [],
): PlaceLookupHit[] => {
  const needle = fold(query)
  if (needle === '') return []
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
  return [...hits.entries()]
    .sort((left, right) => {
      return (
        left[1].score - right[1].score ||
        right[1].performanceCount - left[1].performanceCount ||
        left[0].localeCompare(right[0], 'ja')
      )
    })
    .slice(0, 5)
    .map(([name, hit]) => ({ name, performanceCount: hit.performanceCount }))
}

/**
 * Finds songs already in the catalog.
 * Matching is a case-insensitive substring over the stored names and artist credit.
 */
export const localSongMatches = (catalog: Catalog, query: string): SongRow[] => {
  const needle = query.trim().toLocaleLowerCase()
  if (!needle) return []
  return catalog.songs
    .filter((song) => {
      const haystack = [song.name, song.name_ja, song.name_en, song.artist_string]
        .filter((part) => part)
        .join('\n')
        .toLocaleLowerCase()
      return haystack.includes(needle)
    })
    .slice(0, 20)
}

/**
 * Producer names already in the catalog, for the same header search.
 * Re-exported here so the two catalog searches live behind one module.
 */
export { localProducerMatches, type ProducerLookupHit } from './producers.ts'
