/**
 * Hand registry of tours and which catalog 演出 belong to each.
 *
 * `data/tours.json` is the source. Tours are not a VocaDB entity and are not
 * written into catalog SQL. Every 演出 belongs to exactly one tour; a one-off
 * event is a tour of a single show. The homepage banner resolves posters as
 * 演出 → tour → `data/tour-posters.json`.
 */

/** Version of the JSON layout. */
const FILE_VERSION = 1

/** Stable slug: lowercase letters, digits, and single hyphens. */
const TOUR_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** One official tour and the 演出 that belong to it. */
export type Tour = {
  id: string
  name: string
  seriesId: number
  /** Official page for the whole tour, or null when the catalog stores none. */
  sourceUrl: string | null
  performanceIds: readonly number[]
  note?: string
}

/** Parsed `data/tours.json`. */
export type TourIndex = {
  version: typeof FILE_VERSION
  checkedAt: string
  tours: readonly Tour[]
  /** Tour id to its row. */
  byId: ReadonlyMap<string, Tour>
  /** Performance id to the one tour it belongs to. */
  byPerformanceId: ReadonlyMap<number, Tour>
}

/** Reads a non-empty string field. */
const requiredText = (value: unknown, label: string): string => {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`${label} must be text`)
  return value
}

/** Reads one tour object. */
const parseTour = (value: unknown): Tour => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Tour entry must be an object')
  }
  const record = value as Record<string, unknown>
  const id = requiredText(record.id, 'Tour id')
  if (!TOUR_ID.test(id)) throw new Error(`Tour id ${id} must be a lowercase slug`)
  const name = requiredText(record.name, `Tour ${id} name`)
  if (typeof record.seriesId !== 'number' || !Number.isInteger(record.seriesId)) {
    throw new Error(`Tour ${id} seriesId must be an integer`)
  }
  if (record.sourceUrl !== null && typeof record.sourceUrl !== 'string') {
    throw new Error(`Tour ${id} sourceUrl must be a string or null`)
  }
  if (typeof record.sourceUrl === 'string' && record.sourceUrl.trim() === '') {
    throw new Error(`Tour ${id} sourceUrl must not be blank`)
  }
  if (!Array.isArray(record.performanceIds) || record.performanceIds.length === 0) {
    throw new Error(`Tour ${id} needs at least one performance`)
  }
  const performanceIds: number[] = []
  for (const performanceId of record.performanceIds) {
    if (typeof performanceId !== 'number' || !Number.isInteger(performanceId)) {
      throw new Error(`Tour ${id} has a performance id that is not an integer`)
    }
    if (performanceIds.includes(performanceId)) {
      throw new Error(`Tour ${id} lists performance ${performanceId} twice`)
    }
    performanceIds.push(performanceId)
  }
  const tour: Tour = {
    id,
    name,
    seriesId: record.seriesId,
    sourceUrl: record.sourceUrl,
    performanceIds,
  }
  if (record.note !== undefined) {
    tour.note = requiredText(record.note, `Tour ${id} note`)
  }
  return tour
}

/**
 * Validates `data/tours.json`.
 * Throws when the version is wrong, a tour id or performance id is repeated,
 * or a tour has no shows.
 */
export const parseTours = (value: unknown): TourIndex => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Tour file must be an object')
  }
  const record = value as Record<string, unknown>
  if (record.version !== FILE_VERSION) throw new Error(`Tour file version must be ${FILE_VERSION}`)
  const checkedAt = requiredText(record.checkedAt, 'Tour file checkedAt')
  if (!Array.isArray(record.tours)) throw new Error('Tour file tours must be an array')
  const tours = record.tours.map(parseTour)
  const byId = new Map<string, Tour>()
  const byPerformanceId = new Map<number, Tour>()
  for (const tour of tours) {
    if (byId.has(tour.id)) throw new Error(`Tour ${tour.id} is listed twice`)
    byId.set(tour.id, tour)
    for (const performanceId of tour.performanceIds) {
      const previous = byPerformanceId.get(performanceId)
      if (previous !== undefined) {
        throw new Error(`Performance ${performanceId} is in both ${previous.id} and ${tour.id}`)
      }
      byPerformanceId.set(performanceId, tour)
    }
  }
  return { version: FILE_VERSION, checkedAt, tours, byId, byPerformanceId }
}

/** The tour a 演出 belongs to, or null when the registry does not list it. */
export const tourForPerformance = (index: TourIndex, performanceId: number): Tour | null =>
  index.byPerformanceId.get(performanceId) ?? null

/** Canonical tour detail path. */
export const tourPath = (tourId: string): string => `/tours/${tourId}`

/** In-page hash for one 演出 stop on a tour page. */
export const tourPerformanceHash = (performanceId: number): string => `p-${performanceId}`

/** Tour detail path scrolled to one stop (`/tours/{id}#p-{performanceId}`). */
export const tourPathForPerformance = (tourId: string, performanceId: number): string =>
  `${tourPath(tourId)}#${tourPerformanceHash(performanceId)}`

/**
 * Resolves a 演出 to its tour deep-link, or null when the registry has no tour.
 */
export const tourPathForPerformanceId = (
  index: TourIndex,
  performanceId: number,
): string | null => {
  const tour = tourForPerformance(index, performanceId)
  if (tour === null) return null
  return tourPathForPerformance(tour.id, performanceId)
}

/** Parses `#p-123` from a location hash; returns null when the hash is not a stop anchor. */
export const performanceIdFromTourHash = (hash: string): number | null => {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  const match = /^p-(\d+)$/.exec(raw)
  if (match === null) return null
  const id = Number(match[1])
  return Number.isInteger(id) ? id : null
}
