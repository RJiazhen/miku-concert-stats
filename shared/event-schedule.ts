import { parseNoteSelectors } from './setlist-slots.ts'
import { performanceCityKey, splitNote, type RotationReview } from './rotation.ts'
import type { Catalog, PerformanceRow } from './types.ts'

/**
 * The three-level concert model this module implements:
 * 系列 (`series`) > 演出 (one `performances` row, one VocaDB release event / city stop) >
 * 场次 (one calendar day, or one half of a day that had two shows).
 *
 * Day/night evidence has one source today: the free-text setlist notes, read by
 * `dayNightDatesFor`. VocaDB stores no structured day/night field (`showtime_local` and
 * `time_evidence` are empty), so a day is one 场次 unless a note proves a 日场 / 夜场 pair.
 * The seam for a curated file is already here: `showsForPerformance` accepts the marked
 * dates, and `performanceSchedules` accepts an optional per-performance map of them. A future
 * `data/show-schedules.json` + `shared/show-schedules.ts` only has to build that map; nothing
 * in the derivation, the ranking, or the pages has to change shape.
 *
 * A performance stores one `start_date`–`end_date` range and no per-day programme, so days
 * inside that range that were exhibition-only (no live) cannot be told apart from live days.
 * Every covered day is therefore counted as a 场次; the 14-day cap keeps a bad range bounded.
 */

/** Performance fields needed to enumerate 场次 and read note selectors. */
export type SchedulePerformance = Pick<
  PerformanceRow,
  'id' | 'name' | 'name_ja' | 'venue_name' | 'series_suffix' | 'start_date' | 'end_date'
>

/** One half of a day that had a daytime and a night-time show. */
export type ShowHalf = 'day' | 'night'

/** One 场次 of one 演出. */
export type PerformanceShow = {
  /** Stable key of the 场次, e.g. `2758:2020-11-28` or `6045:2023-08-11:night`. */
  key: string
  performanceId: number
  /** Calendar day, `YYYY-MM-DD`. */
  date: string
  /** Day or night half; null when the day had a single show. */
  half: ShowHalf | null
  /** Display label: `2020-11-28`, `2023-08-11 日场`, or `2023-08-11 夜场`. */
  label: string
}

/** Longest date span enumerated for one 演出, matching the rotation parser's two-week cap. */
export const MAX_SHOW_DAYS = 14

/** Whether a catalog date is a plain calendar day. */
const isDay = (value: string | null): value is string => value !== null && /^\d{4}-\d{2}-\d{2}$/.test(value)

/** Half named by a note selector, including `1st Show` / `2nd Show` as a day/night pair. */
const halfOf = (selector: { half: ShowHalf | null; show: number | null }): ShowHalf | null => {
  if (selector.half !== null) return selector.half
  if (selector.show === 1) return 'day'
  if (selector.show === 2) return 'night'
  return null
}

/** Whether a selector asks about a specific half of a day. */
const namesHalf = (selector: { half: ShowHalf | null; show: number | null }): boolean => halfOf(selector) !== null

/**
 * Inclusive calendar days of one 演出, capped at `MAX_SHOW_DAYS`.
 * A missing or malformed start date yields no days; a missing, malformed, or earlier end date
 * collapses the range to the start day, so a reversed range never invents extra shows.
 */
export const performanceDates = (performance: Pick<PerformanceRow, 'start_date' | 'end_date'>): string[] => {
  const start = performance.start_date
  if (!isDay(start)) return []
  const rawEnd = performance.end_date
  const end = isDay(rawEnd) && rawEnd >= start ? rawEnd : start
  const dates: string[] = []
  const cursor = new Date(`${start}T00:00:00Z`)
  const last = new Date(`${end}T00:00:00Z`)
  while (cursor.getTime() <= last.getTime() && dates.length < MAX_SHOW_DAYS) {
    dates.push(cursor.toISOString().slice(0, 10))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return dates
}

/**
 * Lists the 场次 of one 演出.
 * Each covered day is one 场次; a day named in `dayNightDates` is split into 日场 and 夜场,
 * because the setlist notes prove that day had two shows. Dates not covered by the
 * performance are ignored. A performance without a start date has no 场次.
 * `dayNightDates` is also the injection point for a curated schedule file, so the note-based
 * evidence can later be replaced without touching this function.
 */
export const showsForPerformance = (
  performance: SchedulePerformance,
  dayNightDates: readonly string[] = [],
): PerformanceShow[] => {
  const halved = new Set(dayNightDates)
  const shows: PerformanceShow[] = []
  for (const date of performanceDates(performance)) {
    if (halved.has(date)) {
      shows.push({
        key: `${performance.id}:${date}:day`,
        performanceId: performance.id,
        date,
        half: 'day',
        label: `${date} 日场`,
      })
      shows.push({
        key: `${performance.id}:${date}:night`,
        performanceId: performance.id,
        date,
        half: 'night',
        label: `${date} 夜场`,
      })
      continue
    }
    shows.push({ key: `${performance.id}:${date}`, performanceId: performance.id, date, half: null, label: date })
  }
  return shows
}

/** Distinct dates of a show list, in chronological order. */
const datesOfShows = (shows: readonly PerformanceShow[]): string[] => {
  return [...new Set(shows.map((show) => show.date))].sort()
}

/** Whether a selector's city names the same city as the performance; unknown cities do not filter. */
const cityMatches = (selectorCity: string | null, performance: SchedulePerformance): boolean => {
  if (selectorCity === null) return true
  const city = performanceCityKey(performance)
  return city === null || city === selectorCity
}

/** A calendar date written in a note fragment, before it is matched against a run. */
type NamedDate = { year: number | null; month: number; day: number }

/** Reads a bare date such as `2024-08-31`, `8/31`, or `8月31日`, mirroring the rotation parser. */
const namedDate = (segment: string): NamedDate | null => {
  const iso = segment.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/)
  if (iso) return { year: Number(iso[1]), month: Number(iso[2]), day: Number(iso[3]) }
  const japanese = segment.match(/^(\d{1,2})月(\d{1,2})日?$/)
  if (japanese) return { year: null, month: Number(japanese[1]), day: Number(japanese[2]) }
  const slash = segment.match(/^(\d{1,2})\/(\d{1,2})$/)
  if (slash) return { year: null, month: Number(slash[1]), day: Number(slash[2]) }
  return null
}

/**
 * Dates of a run that a note names outright, e.g. `8/31` or `2024-08-31`.
 * A date outside the run contributes nothing; a note without a date returns an empty list.
 */
const datesNamedByNote = (notes: string | null, dates: readonly string[]): string[] => {
  if (notes === null) return []
  const picked = new Set<string>()
  for (const segment of splitNote(notes)) {
    const fragment = namedDate(segment)
    if (!fragment) continue
    const monthDay = `${String(fragment.month).padStart(2, '0')}-${String(fragment.day).padStart(2, '0')}`
    for (const date of dates) {
      if (date.slice(5) !== monthDay) continue
      if (fragment.year !== null && date.slice(0, 4) !== String(fragment.year)) continue
      picked.add(date)
    }
  }
  return [...picked].sort()
}

/**
 * Dates of one 演出 that its setlist notes prove had two shows.
 *
 * A note naming a half (`Daytime`, `Nighttime`, `Evening`, `Afternoon`, 昼夜, 昼公演, 夜公演)
 * or a show number (`1st Show`, `2nd Show`) is evidence of a day/night pair. A note that also
 * names `Day N` or a bare date marks only that day of the run; a note without a day marks every
 * day of the run, because the note asserts that the pair existed somewhere in this 演出.
 * Notes naming another city are skipped.
 */
export const dayNightDatesFor = (
  performance: SchedulePerformance,
  notes: readonly (string | null)[],
): string[] => {
  const dates = performanceDates(performance)
  if (dates.length === 0) return []
  const marked = new Set<string>()
  for (const note of notes) {
    const named = datesNamedByNote(note, dates)
    for (const selector of parseNoteSelectors(note)) {
      if (!namesHalf(selector) || !cityMatches(selector.city, performance)) continue
      if (selector.day !== null) {
        const date = dates[selector.day - 1]
        if (date !== undefined) marked.add(date)
        continue
      }
      if (named.length > 0) for (const date of named) marked.add(date)
      else for (const date of dates) marked.add(date)
    }
  }
  return [...marked].sort()
}

/**
 * The 场次 of one 演出 that a setlist line covers.
 *
 * A line without selectors or named dates is attributed to every 场次 of the 演出: VocaDB
 * prints one setlist for the whole run, so the honest reading is that the same programme was
 * performed at every show of that run. When the note names a day, a half, a show number, or a
 * bare date, the attribution narrows to the matching 场次 of this 演出. Narrowing that cannot
 * resolve to any 场次 falls back to the whole run rather than dropping the line.
 *
 * The rotation parser assigns a line to performances, not to days; this function re-applies the
 * note's day, half, and date dimensions inside one already-assigned performance.
 */
export const showsForNotes = (
  notes: string | null,
  performance: SchedulePerformance,
  shows: readonly PerformanceShow[],
): PerformanceShow[] => {
  if (shows.length === 0) return []
  const selectors = parseNoteSelectors(notes)
  const dates = datesOfShows(shows)
  const named = datesNamedByNote(notes, dates)
  if (selectors.length === 0 && named.length === 0) return [...shows]
  const picked = new Set<string>()
  for (const date of named) {
    for (const show of shows) if (show.date === date) picked.add(show.key)
  }
  for (const selector of selectors) {
    if (!cityMatches(selector.city, performance)) continue
    const date = selector.day === null ? null : dates[selector.day - 1]
    if (selector.day !== null && date === undefined) continue
    const half = halfOf(selector)
    for (const show of shows) {
      if (date !== null && date !== undefined && show.date !== date) continue
      if (half !== null && show.half !== null && show.half !== half) continue
      picked.add(show.key)
    }
  }
  if (picked.size === 0) return [...shows]
  return shows.filter((show) => picked.has(show.key))
}

/** Performance id to the dates a curated schedule splits into 日场 / 夜场. */
export type CuratedDayNight = ReadonlyMap<number, readonly string[]>

/**
 * 场次 for every performance in a catalog, keyed by performance id.
 *
 * Day/night evidence comes from the lines the rotation parser assigns to each performance,
 * so a shared setlist's note only marks the performances it actually names. `curatedDayNight`
 * is the seam for a future `data/show-schedules.json`: its dates are unioned with the note
 * evidence, so a curated source can add a split the notes missed (and is the only thing that
 * has to be built later). Omitting it keeps today's note-only behaviour.
 */
export const performanceSchedules = (
  catalog: Catalog,
  review: RotationReview,
  curatedDayNight?: CuratedDayNight,
): Map<number, PerformanceShow[]> => {
  const listByPerformance = new Map(catalog.performances.map((row) => [row.id, row.song_list_id]))
  const notesByPerformance = new Map<number, string[]>()
  for (const line of review.lines) {
    if (line.notes === null) continue
    for (const performanceId of line.performanceIds) {
      if (listByPerformance.get(performanceId) !== line.songListId) continue
      const notes = notesByPerformance.get(performanceId) ?? []
      notes.push(line.notes)
      notesByPerformance.set(performanceId, notes)
    }
  }
  const schedules = new Map<number, PerformanceShow[]>()
  for (const performance of catalog.performances) {
    const dayNightDates = new Set(dayNightDatesFor(performance, notesByPerformance.get(performance.id) ?? []))
    for (const date of curatedDayNight?.get(performance.id) ?? []) {
      if (isDay(date)) dayNightDates.add(date)
    }
    schedules.set(performance.id, showsForPerformance(performance, [...dayNightDates]))
  }
  return schedules
}
