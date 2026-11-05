import { performanceSchedules, showsForNotes } from './event-schedule.ts'
import { catalogDayNight, derivedItemSongIds } from './performance-setlists.ts'
import type { RotationReview } from './rotation.ts'
import type { Catalog } from './types.ts'

/**
 * Coverage of one song inside one 演出.
 *
 * A 演出 is one `performances` row (one VocaDB release event / one city stop). Its 场次 are the
 * calendar days it covers, split into 日场 / 夜场 when the notes or a hand-checked schedule say
 * the day had two shows. The 出场记录 table lists one row per 演出, so the coverage printed
 * there answers "did this song appear at every 場次 of this 演出?".
 */
export type ShowCoverage = {
  /** 場次 of the 演出; the denominator. */
  total: number
  /** Those 場次 the song appears in; the numerator. */
  covered: number
}

/**
 * Counts how many 場次 of each 演出 performed a song, keyed by performance id.
 *
 * The numerator reads the derived 場次 layer (`performance_show_setlist_items`), which already
 * resolved every setlist note, so a shared list's replacement songs no longer count for the
 * cities that never played them. The denominator is the 場次 count of that one 演出, using the
 * same day/night dates the derivation used. A 演出 without a start date has no 場次 and gives
 * no evidence either way, so it is absent from the result.
 *
 * @param catalog Loaded catalog, for the derived rows and the 演出 list.
 * @param review Rotation review of the same catalog, used for 場次 without a derived row.
 * @param songIds Song ids to credit, usually every id of a merged variant group.
 */
export const showCoverage = (
  catalog: Catalog,
  review: RotationReview,
  songIds: readonly number[],
): Map<number, ShowCoverage> => {
  const result = new Map<number, ShowCoverage>()
  const wanted = new Set(songIds)
  if (wanted.size === 0) return result

  const schedules = performanceSchedules(catalog, review, catalogDayNight(catalog))

  /** 場次 of each 演出 where the song appears. */
  const coveredByPerformance = new Map<number, Set<string>>()
  const derivedPerformances = new Set<number>()
  for (const item of catalog.performanceShowSetlistItems) {
    derivedPerformances.add(item.performance_id)
    const songIdsOfItem = derivedItemSongIds(catalog, item)
    if (!songIdsOfItem.some((songId) => wanted.has(songId))) continue
    const covered = coveredByPerformance.get(item.performance_id) ?? new Set<string>()
    covered.add(item.show_key)
    coveredByPerformance.set(item.performance_id, covered)
  }

  // Catalogs without a derived layer (fixtures, older builds) fall back to reading the notes.
  const performanceById = new Map(catalog.performances.map((row) => [row.id, row]))
  const lineByKey = new Map(review.lines.map((line) => [`${line.songListId}:${line.position}`, line]))
  const carryingLines = new Set<string>()
  for (const link of catalog.setlistItemSongs) {
    if (link.role !== 'listed' || !wanted.has(link.song_id)) continue
    carryingLines.add(`${link.song_list_id}:${link.position}`)
  }
  for (const key of carryingLines) {
    const line = lineByKey.get(key)
    if (!line) continue
    for (const performanceId of line.performanceIds) {
      if (derivedPerformances.has(performanceId)) continue
      const performance = performanceById.get(performanceId)
      if (!performance) continue
      const shows = schedules.get(performanceId) ?? []
      const covered = coveredByPerformance.get(performanceId) ?? new Set<string>()
      for (const show of showsForNotes(line.notes, performance, shows)) covered.add(show.key)
      coveredByPerformance.set(performanceId, covered)
    }
  }

  for (const performance of catalog.performances) {
    if (performance.song_list_id === null) continue
    const shows = schedules.get(performance.id) ?? []
    if (shows.length === 0) continue
    const covered = coveredByPerformance.get(performance.id) ?? new Set<string>()
    result.set(performance.id, {
      total: shows.length,
      covered: shows.filter((show) => covered.has(show.key)).length,
    })
  }
  return result
}

/**
 * Chinese 备注 text for one appearance row's 演出 coverage, or null to show nothing.
 *
 * Full coverage reads `本演出全部 N 场`; partial coverage reads `N 场中 M 场` so the numbers
 * cannot be misread as show indices. A single-場次 演出 returns null because `本演出全部 1 场`
 * is noise on every row. When the row's own note already failed to pick a show inside one city
 * (`city-only when city has several shows: N`), the `共 N 场` warning owns the numbers for that
 * row and this figure is suppressed, so the cell never prints two different totals.
 *
 * @param coverage Coverage for the row's performance, or null when the song is unknown.
 * @param reasons Raw rotation reasons of the row's setlist line, before localization.
 */
export const formatShowCoverage = (
  coverage: ShowCoverage | null,
  reasons: readonly string[],
): string | null => {
  if (coverage === null || coverage.total < 2) return null
  if (reasons.some((reason) => reason.startsWith('city-only when city has several shows'))) return null
  if (coverage.covered >= coverage.total) return `本演出全部 ${coverage.total} 场`
  return `${coverage.total} 场中 ${coverage.covered} 场`
}
