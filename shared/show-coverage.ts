import type { Translate } from './i18n/index.ts'
import { performanceSchedules, showsForNotes, type PerformanceShow } from './event-schedule.ts'
import { catalogSchedules, derivedItemSongIds } from './performance-setlists.ts'
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
  /** Short labels of the covered 場次, e.g. `8/10 夜场`; absent when only counts are known. */
  labels?: string[]
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
 * @param t Translator for short show labels.
 */
export const showCoverage = (
  catalog: Catalog,
  review: RotationReview,
  songIds: readonly number[],
  t: Translate,
): Map<number, ShowCoverage> => {
  const result = new Map<number, ShowCoverage>()
  const wanted = new Set(songIds)
  if (wanted.size === 0) return result

  // The derived rows already carry the curated schedule. A catalog without them (tests,
  // older builds) falls back to deriving the 場次 from the rotation review.
  const schedules = catalogSchedules(catalog)
  const fallback = performanceSchedules(catalog, review)
  const schedulesOf = (performanceId: number): readonly PerformanceShow[] => {
    const derived = schedules.get(performanceId)
    if (derived !== undefined && derived.length > 0) return derived
    return fallback.get(performanceId) ?? []
  }

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
      const shows = schedulesOf(performanceId)
      const covered = coveredByPerformance.get(performanceId) ?? new Set<string>()
      for (const show of showsForNotes(line.notes, performance, shows)) covered.add(show.key)
      coveredByPerformance.set(performanceId, covered)
    }
  }

  for (const performance of catalog.performances) {
    const shows = schedulesOf(performance.id)
    if (shows.length === 0) continue
    // A 演出 counts when either layer recorded a setlist; the derived layer covers wiki-only 演出.
    if (!derivedPerformances.has(performance.id) && performance.song_list_id === null) continue
    const covered = coveredByPerformance.get(performance.id) ?? new Set<string>()
    const played = shows.filter((show) => covered.has(show.key))
    result.set(performance.id, {
      total: shows.length,
      covered: played.length,
      labels: played.map((show) => shortShowLabel(show, t)),
    })
  }
  return result
}

/** Short 场次 label for an appearance note, e.g. `8/10 夜场`; the year is on the row already. */
const shortShowLabel = (show: PerformanceShow, t: Translate): string => {
  const date = show.date
  if (!date) return show.label
  const monthDay = `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`
  if (show.half === 'day') return `${monthDay} ${t('common.dayShow')}`
  if (show.half === 'night') return `${monthDay} ${t('common.nightShow')}`
  return monthDay
}

/**
 * Chinese 备注 text for one appearance row's 演出 coverage, or null to show nothing.
 *
 * Only partial coverage gets a note: `N 场中 M 场` and, when the labels are known, the 場次
 * that played it (`6 场中 3 场：8/10 夜场、8/11 日场`). Full coverage returns null — nearly
 * every row of a song's own 演出 is full coverage, so `本演出全部 N 场` only buries the rows
 * that are worth reading. A single-場次 演出 also returns null because it can never be partial.
 * When the row's own note already failed to pick a show inside one city
 * (`city-only when city has several shows: N`), the `共 N 场` warning owns the numbers for that
 * row and this figure is suppressed, so the cell never prints two different totals.
 *
 * @param coverage Coverage for the row's performance, or null when the song is unknown.
 * @param reasons Raw rotation reasons of the row's setlist line, before localization.
 * @param t Translator for the note text.
 */
export const formatShowCoverage = (
  coverage: ShowCoverage | null,
  reasons: readonly string[],
  t: Translate,
): string | null => {
  if (coverage === null || coverage.total < 2) return null
  if (reasons.some((reason) => reason.startsWith('city-only when city has several shows'))) return null
  if (coverage.covered >= coverage.total) return null
  if (coverage.labels !== undefined && coverage.labels.length > 0) {
    return t('coverage.partialWithLabels', {
      total: coverage.total,
      covered: coverage.covered,
      shows: coverage.labels.join(t('setlist.join')),
    })
  }
  return t('coverage.partial', { total: coverage.total, covered: coverage.covered })
}
