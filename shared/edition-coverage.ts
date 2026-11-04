import type { RotationReview } from './rotation.ts'
import type { Catalog } from './types.ts'

/**
 * Coverage of one song across the shows of one edition.
 *
 * An edition is `series_id` + `series_number`: the grouping that treats every city stop
 * and every day of one tour as the same run of shows, which is also how `/` ranks songs.
 * A show here is one VocaDB performance row (one city stop, which may span several days),
 * the same unit the 出场记录 table lists and the page header counts as 场.
 */
export type EditionCoverage = {
  /** Performances of the edition that have a setlist; the denominator. */
  total: number
  /** Those of them where a `listed` line containing the song assigns the performance. */
  covered: number
}

/** Edition key of a performance, or null when the catalog has no year for it. */
const editionKey = (seriesId: number, seriesNumber: number | null): string | null => {
  return seriesNumber === null ? null : `${seriesId}:${seriesNumber}`
}

/**
 * Counts how many shows of each edition performed a song, keyed by performance id.
 *
 * The figure is per song and edition, not per setlist line: a song that appears in two
 * regional setlists of one edition is credited with both, and every one of its rows shows
 * the same numbers. The denominator counts only performances that carry a setlist, because
 * a show without a setlist gives no evidence either way. Coverage unions the
 * `performanceIds` the rotation parser assigns to the song's `listed` lines, so an
 * in-city day marker narrows the count exactly as the parser does.
 *
 * @param catalog Loaded catalog, for performances and `listed` setlist links.
 * @param review Rotation review of the same catalog.
 * @param songIds Song ids to credit, usually every id of a merged variant group.
 */
export const editionCoverage = (
  catalog: Catalog,
  review: RotationReview,
  songIds: readonly number[],
): Map<number, EditionCoverage> => {
  const result = new Map<number, EditionCoverage>()
  const wanted = new Set(songIds)
  if (wanted.size === 0) return result

  const performanceById = new Map(catalog.performances.map((row) => [row.id, row]))
  const showsByEdition = new Map<string, number[]>()
  for (const performance of catalog.performances) {
    if (performance.song_list_id === null) continue
    const key = editionKey(performance.series_id, performance.series_number)
    if (key === null) continue
    const shows = showsByEdition.get(key) ?? []
    shows.push(performance.id)
    showsByEdition.set(key, shows)
  }

  const carryingLines = new Set<string>()
  for (const link of catalog.setlistItemSongs) {
    if (link.role !== 'listed' || !wanted.has(link.song_id)) continue
    carryingLines.add(`${link.song_list_id}:${link.position}`)
  }

  const coveredByEdition = new Map<string, Set<number>>()
  for (const line of review.lines) {
    if (!carryingLines.has(`${line.songListId}:${line.position}`)) continue
    for (const performanceId of line.performanceIds) {
      const performance = performanceById.get(performanceId)
      if (!performance) continue
      const key = editionKey(performance.series_id, performance.series_number)
      if (key === null) continue
      const covered = coveredByEdition.get(key) ?? new Set<number>()
      covered.add(performanceId)
      coveredByEdition.set(key, covered)
    }
  }

  for (const [key, shows] of showsByEdition) {
    const covered = coveredByEdition.get(key) ?? new Set<number>()
    const count = shows.filter((id) => covered.has(id)).length
    for (const id of shows) result.set(id, { total: shows.length, covered: count })
  }
  return result
}

/**
 * Chinese 备注 text for one appearance row's edition coverage, or null to show nothing.
 *
 * Full coverage reads `全部 N 场`; partial coverage reads `N 场中 M 场` so the numbers
 * cannot be misread as show indices. A single-show edition returns null because
 * `全部 1 场` is noise on every row. When the row's own note already
 * failed to pick a show inside one city (`city-only when city has several shows: N`), the
 * `共 N 场` warning owns the numbers for that row and this figure is suppressed, so the
 * cell never prints two different totals.
 *
 * @param coverage Coverage for the row's performance, or null when the song is unknown.
 * @param reasons Raw rotation reasons of the row's setlist line, before localization.
 */
export const formatEditionCoverage = (
  coverage: EditionCoverage | null,
  reasons: readonly string[],
): string | null => {
  if (coverage === null || coverage.total < 2) return null
  if (reasons.some((reason) => reason.startsWith('city-only when city has several shows'))) return null
  if (coverage.covered >= coverage.total) return `全部 ${coverage.total} 场`
  return `${coverage.total} 场中 ${coverage.covered} 场`
}
