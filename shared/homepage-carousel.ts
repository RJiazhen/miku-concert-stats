/**
 * Homepage setlist banner: recently held 演出 that already have an available
 * setlist, plus poster mapping and display facts.
 *
 * Eligibility follows `buildRecentConcerts` (dated, already started, not
 * cancelled or postponed, has a setlist) and a 12-month concert-date lookback.
 * Concerts are ordered by concert `start_date`, not by catalog programme
 * revisions, `retrieved_at`, or `accessed_at`. A historical setlist backfill
 * does not qualify.
 *
 * Poster art is resolved 演出 → tour (`data/tours.json`) → tour poster
 * (`data/tour-posters.json`). Local files are `public/posters/{tourId}.*`.
 */
import tourPostersFile from '../data/tour-posters.json'
import toursFile from '../data/tours.json'
import { performanceHeaderFacts } from './performance-header.ts'
import { derivedItemsByShow } from './performance-setlist-query.ts'
import { buildRecentConcerts, showPath } from './homepage.ts'
import { parseTours, tourForPerformance, type TourIndex } from './tours.ts'
import type { Catalog, PerformanceRow, PerformanceShowSetlistItemRow } from './types.ts'

/** Default number of recently held setlist slides the homepage banner can show. */
export const SETLIST_CAROUSEL_LIMIT = 5

/** Idle interval before the homepage banner advances one slide, including after the last interaction. */
export const SETLIST_BANNER_AUTOPLAY_MS = 5000

/** Duration of the horizontal slide motion when reduced motion is not requested. */
export const SETLIST_BANNER_SLIDE_MS = 500

/** Positions used to stack the current, outgoing, and parked slides. */
export type BannerSlidePositionState = {
  current: number
  previous: number | null
  direction: 1 | -1
}

/** Horizontal offset, in percentages of slide width, for one stacked slide. */
export const bannerSlideOffsetPercent = (
  index: number,
  state: BannerSlidePositionState,
): number => {
  if (index === state.current) return 0
  if (state.previous !== null && index === state.previous) return state.direction === 1 ? -100 : 100
  return state.direction === 1 ? 100 : -100
}

/** Off-screen start side the incoming slide must travel from. */
export const bannerIncomingStartPercent = (direction: 1 | -1): number =>
  direction === 1 ? 100 : -100

/** How far back a concert date may fall and still count as recently held. */
export const RECENT_SETLIST_BANNER_LOOKBACK_MONTHS = 12

/** Official poster mapping for one tour, shown on every stop of that tour. */
export type HomepagePosterRecord = {
  src: string
  sourceUrl: string
  sourcePage: string
  sourceLabel: string
  accessedAt: string
  artistCredit: string | null
  rightsNote: string
}

/** Shape of `data/tour-posters.json`. */
export type TourPostersFile = {
  version: number
  tours: Record<string, HomepagePosterRecord>
}

/** One homepage carousel slide, ready for the Vue view. */
export type HomepageSetlistSlide = {
  id: number
  href: string
  name: string
  seriesId: number
  seriesName: string
  seriesNumber: number | null
  dates: string | null
  showtime: string | null
  venue: string | null
  songCount: number | null
  estimatedSongDurationSeconds: number | null
  poster: HomepagePosterRecord | null
}

const defaultPosters = tourPostersFile as TourPostersFile
const defaultTours = parseTours(toursFile)

/**
 * UTC calendar date `months` before `now`, in `YYYY-MM-DD`, matching the
 * day-precision fallback already used when a concert has no timezone.
 */
export const utcCalendarDateMonthsAgo = (now: Date, months: number): string => {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - months, now.getUTCDate()))
  return date.toISOString().slice(0, 10)
}

/** True when the concert's last recorded night is on or after the cutoff date. */
export const isWithinRecentLookback = (
  performance: Pick<PerformanceRow, 'start_date' | 'end_date'>,
  cutoff: string,
): boolean => {
  const last = performance.end_date?.trim() || performance.start_date
  return last !== null && last !== '' && last >= cutoff
}

/** Looks up a poster by tour id. */
export const posterForTour = (
  tourId: string,
  posters: TourPostersFile = defaultPosters,
): HomepagePosterRecord | null => posters.tours[tourId] ?? null

/**
 * Looks up a poster by 演出 → tour → tour poster. Never guesses a filename
 * from the performance id alone.
 */
export const posterForPerformance = (
  performanceId: number,
  posters: TourPostersFile = defaultPosters,
  tours: TourIndex = defaultTours,
): HomepagePosterRecord | null => {
  const tour = tourForPerformance(tours, performanceId)
  if (tour === null) return null
  return posterForTour(tour.id, posters)
}

/** Curated source row count when present, otherwise the first 场次 item count. */
const songCountOf = (catalog: Catalog, performanceId: number): number | null => {
  const row = catalog.performanceSetlists.find((entry) => entry.performance_id === performanceId)
  if (row !== undefined && row.source_row_count > 0) return row.source_row_count
  const shows = derivedItemsByShow(catalog, performanceId)
  const first = firstShowItems(shows)
  return first.length > 0 ? first.length : null
}

/** Stable first 场次: sorted by show_key so two-night runs do not swap. */
const firstShowItems = (
  shows: ReturnType<typeof derivedItemsByShow>,
): PerformanceShowSetlistItemRow[] => {
  const keys = [...shows.keys()].sort()
  const firstKey = keys[0]
  return firstKey === undefined ? [] : (shows.get(firstKey) ?? [])
}

/**
 * Sums recording lengths of the first 场次 programme. Medley rows use their
 * component songs. Returns null when any listed song lacks `length_seconds`,
 * so a partial sum is never shown as a complete estimate.
 */
export const estimatedSongDurationSeconds = (catalog: Catalog, performanceId: number): number | null => {
  const items = firstShowItems(derivedItemsByShow(catalog, performanceId))
  if (items.length === 0) return null
  const songsById = new Map(catalog.songs.map((song) => [song.id, song]))
  const medleySongs = new Map<number, number[]>()
  for (const row of catalog.medleySongs) {
    const ids = medleySongs.get(row.medley_id) ?? []
    ids.push(row.song_id)
    medleySongs.set(row.medley_id, ids)
  }
  const songLength = (songId: number): number | null => {
    const length = songsById.get(songId)?.length_seconds
    return length === undefined || length === null || length <= 0 ? null : length
  }
  let total = 0
  for (const item of items) {
    if (item.song_id !== null) {
      const length = songLength(item.song_id)
      if (length === null) return null
      total += length
      continue
    }
    if (item.medley_id !== null) {
      const members = medleySongs.get(item.medley_id)
      if (members === undefined || members.length === 0) return null
      for (const songId of members) {
        const length = songLength(songId)
        if (length === null) return null
        total += length
      }
      continue
    }
    return null
  }
  return total
}

/** Splits a duration into hours and leftover minutes, rounding to the nearest minute. */
export const splitDuration = (seconds: number): { hours: number; minutes: number } => {
  const minutes = Math.round(seconds / 60)
  return { hours: Math.floor(minutes / 60), minutes: minutes % 60 }
}

/** Builds one slide from a catalog 演出. */
const slideFrom = (
  catalog: Catalog,
  performance: PerformanceRow,
  posters: TourPostersFile,
  tours: TourIndex,
): HomepageSetlistSlide => {
  const facts = performanceHeaderFacts(performance)
  const seriesName = catalog.series.find((row) => row.id === performance.series_id)?.name ?? ''
  return {
    id: performance.id,
    href: showPath(performance.id),
    name: performance.name,
    seriesId: performance.series_id,
    seriesName,
    seriesNumber: performance.series_number,
    dates: facts.dates,
    showtime: facts.showtime,
    venue: facts.venue,
    songCount: songCountOf(catalog, performance.id),
    estimatedSongDurationSeconds: estimatedSongDurationSeconds(catalog, performance.id),
    poster: posterForPerformance(performance.id, posters, tours),
  }
}

/**
 * Homepage banner slides: recently held 演出 that already have a setlist,
 * newest concert date first, inside the lookback window. Historical
 * catalogue backfills are not selected from revision timestamps.
 */
export const buildRecentSetlistBannerSlides = (
  catalog: Catalog,
  options: {
    posters?: TourPostersFile
    tours?: TourIndex
    limit?: number
    lookbackMonths?: number
    now?: Date
  } = {},
): HomepageSetlistSlide[] => {
  const posters = options.posters ?? defaultPosters
  const tours = options.tours ?? defaultTours
  const limit = options.limit ?? SETLIST_CAROUSEL_LIMIT
  const lookbackMonths = options.lookbackMonths ?? RECENT_SETLIST_BANNER_LOOKBACK_MONTHS
  const now = options.now ?? new Date()
  const cutoff = utcCalendarDateMonthsAgo(now, lookbackMonths)
  const performances = new Map(catalog.performances.map((row) => [row.id, row]))
  const recent = buildRecentConcerts(catalog, catalog.performances.length, now)
  const slides: HomepageSetlistSlide[] = []
  for (const row of recent) {
    const performance = performances.get(row.id)
    if (performance === undefined || !isWithinRecentLookback(performance, cutoff)) continue
    slides.push(slideFrom(catalog, performance, posters, tours))
    if (slides.length >= limit) break
  }
  return slides
}

/** Inputs that decide whether the homepage banner may auto-advance. */
export type BannerAutoplayState = {
  mounted: boolean
  slideCount: number
  reducedMotion: boolean
  pointerHeld: boolean
  keyHeld: boolean
  pageHidden: boolean
}

/**
 * Autoplay runs only after client mount, with at least two slides, when the
 * user has not requested reduced motion, no pointer/touch or key is held, and
 * the page is visible. Hover and lingering focus do not block it.
 */
export const bannerAutoplayEnabled = (state: BannerAutoplayState): boolean =>
  state.mounted &&
  state.slideCount > 1 &&
  !state.reducedMotion &&
  !state.pointerHeld &&
  !state.keyHeld &&
  !state.pageHidden

