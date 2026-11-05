import {
  dayNightDatesFor,
  performanceSchedules,
  showsForNotes,
  type CuratedDayNight,
  type CuratedHalves,
  type CuratedNoShowDates,
  type PerformanceShow,
  type ShowHalf,
} from './event-schedule.ts'
import { reviewRotations, type ResolvedRotationLine, type RotationReview } from './rotation.ts'
import { emptySongVariantIndex, type SongVariantIndex } from './song-variants.ts'
import type {
  Catalog,
  MedleyRow,
  MedleySongRow,
  PerformanceSetlistRow,
  PerformanceSetlistSourceRow,
  PerformanceShowSetlistItemRow,
  PerformanceShowSetlistRow,
  SetlistConfidence,
  SetlistResolution,
} from './types.ts'

/** One half of a show day, as stored in a curated schedule. */
export type SetlistHalf = 'day' | 'night'

/** One outside source cited by a 演出. Dates are plain calendar days. */
export type SetlistSourceEntry = {
  url: string
  title: string
  /** `YYYY-MM-DD` of the day the page was read. */
  accessedAt: string
  confidence: SetlistConfidence
  note?: string
  conflict?: boolean
}

/** Hand-checked facts about one 演出: day/night dates, sources, and a short note. */
export type PerformanceCuration = {
  resolution?: SetlistResolution
  conflict?: boolean
  /** Dates this 演出 was verified to have a daytime and a night-time show. */
  dayNight?: string[]
  /** Dates inside the run that had no live show, e.g. an exhibition-only day. */
  noShowDates?: string[]
  /** Dates verified to have exactly one show, so "one a day" is settled rather than assumed. */
  singleShowDates?: string[]
  /**
   * Per-date halves when a day did not have both a day and a night show, e.g.
   * `{ "2025-08-01": ["night"] }` for a first day with only a night show.
   */
  halves?: Record<string, SetlistHalf[]>
  note?: string
  sources?: SetlistSourceEntry[]
}

/** Hand-checked override for one source song list. */
export type ListCuration = {
  note?: string
  source?: string
  accessedAt?: string
  confidence?: SetlistConfidence
  /**
   * Source position to the shows it belongs to. `true` means every show of the 演出,
   * an array names `show_key` values.
   */
  assign?: Record<string, boolean | string[]>
  /** Source positions that belong to no 演出 of this list. */
  exclude?: number[]
  /** Songs missing from the source list, inserted after `afterPosition`. */
  extra?: {
    showKeys: string[]
    songIds: number[]
    afterPosition: number
    note?: string
  }[]
}

/** The hand-checked file `data/performance-setlists.json`. */
export type PerformanceSetlistCuration = {
  performances?: Record<string, PerformanceCuration>
  lists?: Record<string, ListCuration>
}

/** Validated curation with numeric keys and lookup helpers. */
export type PerformanceSetlistCurationIndex = {
  performances: ReadonlyMap<number, PerformanceCuration>
  lists: ReadonlyMap<number, ListCuration>
  /** Day/night dates per performance id, ready for `performanceSchedules`. */
  dayNight: CuratedDayNight
  /** Dates per performance id that had no live show, ready for `performanceSchedules`. */
  noShowDates: CuratedNoShowDates
  /** Per-date half overrides, ready for `performanceSchedules`. */
  halves: CuratedHalves
  /** Count of hand-checked entries, for reports. */
  size: number
}

/** Empty index so callers can derive without a curation file. */
export const emptyCurationIndex = (): PerformanceSetlistCurationIndex => ({
  performances: new Map(),
  lists: new Map(),
  dayNight: new Map(),
  noShowDates: new Map(),
  halves: new Map(),
  size: 0,
})

/** Reads a decimal entity id from a JSON key. */
const readId = (key: string, what: string): number => {
  if (!/^[1-9]\d*$/.test(key)) throw new Error(`${what} key ${key} is not an id`)
  return Number(key)
}

/** Whether a value is a plain calendar day. */
const isDay = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)

/** Validates one source entry, throwing on anything a reader could not verify. */
const parseSourceEntry = (value: unknown, performanceId: number): SetlistSourceEntry => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Source for ${performanceId} is not an object`)
  }
  const record = value as Record<string, unknown>
  const url = record.url
  if (typeof url !== 'string' || !/^https?:\/\//.test(url)) {
    throw new Error(`Source for ${performanceId} has no http(s) url`)
  }
  const title = record.title
  if (typeof title !== 'string' || title.trim() === '') {
    throw new Error(`Source ${url} for ${performanceId} has no title`)
  }
  if (!isDay(record.accessedAt)) {
    throw new Error(`Source ${url} for ${performanceId} has no YYYY-MM-DD accessedAt`)
  }
  const confidence = record.confidence
  if (confidence !== 'high' && confidence !== 'medium' && confidence !== 'low') {
    throw new Error(`Source ${url} for ${performanceId} has an unknown confidence`)
  }
  const entry: SetlistSourceEntry = { url, title: title.trim(), accessedAt: record.accessedAt, confidence }
  if (record.note !== undefined) {
    if (typeof record.note !== 'string') throw new Error(`Source ${url} for ${performanceId} note is not text`)
    entry.note = record.note
  }
  if (record.conflict !== undefined) {
    if (typeof record.conflict !== 'boolean') throw new Error(`Source ${url} for ${performanceId} conflict is not a boolean`)
    entry.conflict = record.conflict
  }
  return entry
}

/** Validates one 演出 entry. */
const parsePerformanceCuration = (value: unknown, performanceId: number): PerformanceCuration => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Curation for ${performanceId} is not an object`)
  }
  const record = value as Record<string, unknown>
  const parsed: PerformanceCuration = {}
  if (record.resolution !== undefined) {
    const resolution = record.resolution
    if (resolution !== 'vocadb-note' && resolution !== 'vocadb-shared' && resolution !== 'external' && resolution !== 'unresolved') {
      throw new Error(`Curation for ${performanceId} has an unknown resolution`)
    }
    parsed.resolution = resolution
  }
  if (record.conflict !== undefined) {
    if (typeof record.conflict !== 'boolean') throw new Error(`Curation for ${performanceId} conflict is not a boolean`)
    parsed.conflict = record.conflict
  }
  if (record.note !== undefined) {
    if (typeof record.note !== 'string') throw new Error(`Curation for ${performanceId} note is not text`)
    parsed.note = record.note
  }
  if (record.dayNight !== undefined) {
    if (!Array.isArray(record.dayNight) || !record.dayNight.every(isDay)) {
      throw new Error(`Curation for ${performanceId} dayNight must be a list of YYYY-MM-DD days`)
    }
    parsed.dayNight = [...new Set(record.dayNight as string[])].sort()
  }
  if (record.noShowDates !== undefined) {
    if (!Array.isArray(record.noShowDates) || !record.noShowDates.every(isDay)) {
      throw new Error(`Curation for ${performanceId} noShowDates must be a list of YYYY-MM-DD days`)
    }
    parsed.noShowDates = [...new Set(record.noShowDates as string[])].sort()
  }
  if (record.singleShowDates !== undefined) {
    if (!Array.isArray(record.singleShowDates) || !record.singleShowDates.every(isDay)) {
      throw new Error(`Curation for ${performanceId} singleShowDates must be a list of YYYY-MM-DD days`)
    }
    parsed.singleShowDates = [...new Set(record.singleShowDates as string[])].sort()
  }
  if (record.halves !== undefined) {
    if (record.halves === null || typeof record.halves !== 'object' || Array.isArray(record.halves)) {
      throw new Error(`Curation for ${performanceId} halves is not an object`)
    }
    const halves: Record<string, SetlistHalf[]> = {}
    for (const [date, value] of Object.entries(record.halves as Record<string, unknown>)) {
      if (!isDay(date)) throw new Error(`Curation for ${performanceId} halves key ${date} is not a date`)
      if (!Array.isArray(value) || value.length === 0) {
        throw new Error(`Curation for ${performanceId} halves ${date} is not a non-empty list`)
      }
      for (const half of value) {
        if (half !== 'day' && half !== 'night') {
          throw new Error(`Curation for ${performanceId} halves ${date} has an unknown half`)
        }
      }
      halves[date] = [...new Set(value as SetlistHalf[])]
    }
    parsed.halves = halves
  }
  if (record.sources !== undefined) {
    if (!Array.isArray(record.sources)) throw new Error(`Curation for ${performanceId} sources is not a list`)
    const seen = new Set<string>()
    const sources = record.sources.map((entry) => {
      const source = parseSourceEntry(entry, performanceId)
      if (seen.has(source.url)) throw new Error(`Curation for ${performanceId} repeats source ${source.url}`)
      seen.add(source.url)
      return source
    })
    parsed.sources = sources
  }
  if (parsed.resolution === 'external' && (parsed.sources === undefined || parsed.sources.length === 0)) {
    throw new Error(`Curation for ${performanceId} is external but cites no source`)
  }
  return parsed
}

/** Validates one song-list entry. */
const parseListCuration = (value: unknown, songListId: number): ListCuration => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Curation for song list ${songListId} is not an object`)
  }
  const record = value as Record<string, unknown>
  const parsed: ListCuration = {}
  if (record.note !== undefined) {
    if (typeof record.note !== 'string') throw new Error(`Curation for song list ${songListId} note is not text`)
    parsed.note = record.note
  }
  const hasCorrection = record.assign !== undefined || record.exclude !== undefined || record.extra !== undefined
  if (record.source !== undefined) {
    if (typeof record.source !== 'string' || !/^https?:\/\//.test(record.source)) {
      throw new Error(`Curation for song list ${songListId} source is not an http(s) url`)
    }
    parsed.source = record.source
  }
  if (record.accessedAt !== undefined) {
    if (!isDay(record.accessedAt)) throw new Error(`Curation for song list ${songListId} accessedAt is not YYYY-MM-DD`)
    parsed.accessedAt = record.accessedAt
  }
  if (record.confidence !== undefined) {
    if (record.confidence !== 'high' && record.confidence !== 'medium' && record.confidence !== 'low') {
      throw new Error(`Curation for song list ${songListId} has an unknown confidence`)
    }
    parsed.confidence = record.confidence
  }
  if (hasCorrection && (parsed.source === undefined || parsed.accessedAt === undefined)) {
    throw new Error(`Curation for song list ${songListId} changes rows but cites no source and accessedAt`)
  }
  if (record.assign !== undefined) {
    if (record.assign === null || typeof record.assign !== 'object' || Array.isArray(record.assign)) {
      throw new Error(`Curation for song list ${songListId} assign is not an object`)
    }
    const assign: Record<string, boolean | string[]> = {}
    for (const [key, target] of Object.entries(record.assign as Record<string, unknown>)) {
      if (!/^[1-9]\d*$/.test(key)) throw new Error(`Curation for song list ${songListId} assign key ${key} is not a position`)
      if (target === true) {
        assign[key] = true
        continue
      }
      if (!Array.isArray(target) || !target.every((show) => typeof show === 'string')) {
        throw new Error(`Curation for song list ${songListId} assign ${key} is neither true nor a list of show keys`)
      }
      assign[key] = target as string[]
    }
    parsed.assign = assign
  }
  if (record.exclude !== undefined) {
    if (!Array.isArray(record.exclude) || !record.exclude.every((position) => Number.isInteger(position) && position > 0)) {
      throw new Error(`Curation for song list ${songListId} exclude is not a list of positions`)
    }
    parsed.exclude = record.exclude as number[]
  }
  if (record.extra !== undefined) {
    if (!Array.isArray(record.extra)) throw new Error(`Curation for song list ${songListId} extra is not a list`)
    parsed.extra = record.extra.map((entry) => {
      if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
        throw new Error(`Curation for song list ${songListId} has a non-object extra entry`)
      }
      const row = entry as Record<string, unknown>
      const showKeys = row.showKeys
      if (!Array.isArray(showKeys) || showKeys.length === 0 || !showKeys.every((show) => typeof show === 'string')) {
        throw new Error(`Curation for song list ${songListId} extra entry has no showKeys`)
      }
      const songIds = row.songIds
      if (!Array.isArray(songIds) || songIds.length === 0 || !songIds.every((song) => Number.isInteger(song) && song > 0)) {
        throw new Error(`Curation for song list ${songListId} extra entry has no songIds`)
      }
      if (!Number.isInteger(row.afterPosition) || (row.afterPosition as number) < 0) {
        throw new Error(`Curation for song list ${songListId} extra entry has no afterPosition`)
      }
      const extra: NonNullable<ListCuration['extra']>[number] = {
        showKeys: showKeys as string[],
        songIds: songIds as number[],
        afterPosition: row.afterPosition as number,
      }
      if (row.note !== undefined) {
        if (typeof row.note !== 'string') throw new Error(`Curation for song list ${songListId} extra note is not text`)
        extra.note = row.note
      }
      return extra
    })
  }
  return parsed
}

/**
 * Validates `data/performance-setlists.json`.
 * Throws on a malformed key, an undated access, an external attribution without a source,
 * or a correction that changes rows without citing where it came from.
 */
export const parsePerformanceSetlistCuration = (value: unknown): PerformanceSetlistCurationIndex => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Setlist curation file must be an object')
  }
  const file = value as Record<string, unknown>
  if (file.version !== undefined && file.version !== 1) throw new Error('Setlist curation version must be 1')
  const performances = new Map<number, PerformanceCuration>()
  const lists = new Map<number, ListCuration>()
  const dayNight = new Map<number, string[]>()
  const noShowDates = new Map<number, string[]>()
  const halves = new Map<number, Map<string, readonly ShowHalf[]>>()
  if (file.performances !== undefined) {
    if (file.performances === null || typeof file.performances !== 'object' || Array.isArray(file.performances)) {
      throw new Error('Setlist curation performances is not an object')
    }
    for (const [key, entry] of Object.entries(file.performances as Record<string, unknown>)) {
      const performanceId = readId(key, 'Performance')
      const parsed = parsePerformanceCuration(entry, performanceId)
      performances.set(performanceId, parsed)
      if (parsed.dayNight !== undefined) dayNight.set(performanceId, parsed.dayNight)
      if (parsed.noShowDates !== undefined) noShowDates.set(performanceId, parsed.noShowDates)
      if (parsed.halves !== undefined) halves.set(performanceId, new Map(Object.entries(parsed.halves)))
    }
  }
  if (file.lists !== undefined) {
    if (file.lists === null || typeof file.lists !== 'object' || Array.isArray(file.lists)) {
      throw new Error('Setlist curation lists is not an object')
    }
    for (const [key, entry] of Object.entries(file.lists as Record<string, unknown>)) {
      const songListId = readId(key, 'Song list')
      lists.set(songListId, parseListCuration(entry, songListId))
    }
  }
  return { performances, lists, dayNight, noShowDates, halves, size: performances.size + lists.size }
}

/**
 * Checks the curation file against the loaded catalog.
 * Catches ids that do not exist, day/night dates outside the run, show keys that the run does
 * not produce, and songs the catalog does not know.
 */
export const validateCurationAgainstCatalog = (
  curation: PerformanceSetlistCurationIndex,
  catalog: Catalog,
  review: RotationReview,
): void => {
  const performances = new Map(catalog.performances.map((row) => [row.id, row]))
  const songs = new Set(catalog.songs.map((row) => row.id))
  const songLists = new Set(catalog.songLists.map((row) => row.id))
  for (const [performanceId, entry] of curation.performances) {
    const performance = performances.get(performanceId)
    if (!performance) throw new Error(`Curation cites unknown performance ${performanceId}`)
    for (const date of entry.dayNight ?? []) {
      const start = performance.start_date
      const end = performance.end_date ?? start
      if (start === null || date < start || date > (end ?? start)) {
        throw new Error(`Curation for ${performanceId} lists day/night ${date} outside ${start ?? 'no range'}`)
      }
    }
    for (const date of entry.noShowDates ?? []) {
      const start = performance.start_date
      const end = performance.end_date ?? start
      if (start === null || date < start || date > (end ?? start)) {
        throw new Error(`Curation for ${performanceId} lists no-show ${date} outside ${start ?? 'no range'}`)
      }
    }
    for (const date of entry.noShowDates ?? []) {
      if ((entry.dayNight ?? []).includes(date)) {
        throw new Error(`Curation for ${performanceId} lists ${date} as both day/night and no-show`)
      }
    }
    for (const date of entry.singleShowDates ?? []) {
      const start = performance.start_date
      const end = performance.end_date ?? start
      if (start === null || date < start || date > (end ?? start)) {
        throw new Error(`Curation for ${performanceId} lists single-show ${date} outside ${start ?? 'no range'}`)
      }
      if ((entry.dayNight ?? []).includes(date)) {
        throw new Error(`Curation for ${performanceId} lists ${date} as both day/night and single-show`)
      }
    }
  }
  const showKeysByPerformance = performanceShowKeys(catalog, review, curation.dayNight, curation.noShowDates)
  for (const [songListId, entry] of curation.lists) {
    if (!songLists.has(songListId)) throw new Error(`Curation cites unknown song list ${songListId}`)
    const positions = new Set(
      review.lines.filter((line) => line.songListId === songListId).map((line) => line.position),
    )
    for (const key of Object.keys(entry.assign ?? {})) {
      if (!positions.has(Number(key))) throw new Error(`Curation for list ${songListId} assigns unknown position ${key}`)
      const target = entry.assign?.[key]
      if (Array.isArray(target)) {
        for (const showKey of target) {
          if (!showKeysByPerformance.has(showKey)) {
            throw new Error(`Curation for list ${songListId} assigns position ${key} to unknown show ${showKey}`)
          }
        }
      }
    }
    for (const position of entry.exclude ?? []) {
      if (!positions.has(position)) throw new Error(`Curation for list ${songListId} excludes unknown position ${position}`)
    }
    for (const extra of entry.extra ?? []) {
      for (const showKey of extra.showKeys) {
        if (!showKeysByPerformance.has(showKey)) {
          throw new Error(`Curation for list ${songListId} adds a row to unknown show ${showKey}`)
        }
      }
      for (const songId of extra.songIds) {
        if (!songs.has(songId)) throw new Error(`Curation for list ${songListId} adds unknown song ${songId}`)
      }
    }
  }
}

/** Every show key the catalog produces, with the curated day/night and no-show dates applied. */
export const performanceShowKeys = (
  catalog: Catalog,
  review: RotationReview,
  curatedDayNight?: CuratedDayNight,
  curatedNoShowDates?: CuratedNoShowDates,
): Set<string> => {
  const schedules = performanceSchedules(catalog, review, curatedDayNight, curatedNoShowDates)
  const keys = new Set<string>()
  for (const shows of schedules.values()) for (const show of shows) keys.add(show.key)
  return keys
}

/** One derived row before it is numbered inside its 场次. */
type PendingItem = {
  sourcePosition: number | null
  songId: number | null
  medleyId: number | null
  evidence: 'note' | 'shared' | 'curated'
  notes: string | null
}

/** Numbers the pending rows of one 场次 after sorting by source position. */
const numberItems = (items: readonly PendingItem[]): PendingItem[] => {
  return [...items].sort((left, right) => {
    const leftKey = left.sourcePosition ?? Number.MAX_SAFE_INTEGER
    const rightKey = right.sourcePosition ?? Number.MAX_SAFE_INTEGER
    return leftKey - rightKey
  })
}

/**
 * Whether a line's note names no show, so the line applies to every 场次.
 * Mirrors the rotation parser: blank notes and notes without a selector or date are shared.
 */
const isSharedLine = (line: ResolvedRotationLine): boolean => {
  const notes = line.notes
  if (notes === null || notes.trim() === '') return true
  return line.info.length > 0 && line.reasons.length === 0 && line.performanceIds.length > 1 && line.info.some((text) => text.trim() !== '')
}

/** Songs a source line contributes, resolved from the catalog. */
const songIdsOfLine = (catalog: Catalog, songListId: number, position: number): number[] => {
  return catalog.setlistItemSongs
    .filter((row) => row.song_list_id === songListId && row.position === position)
    .map((row) => row.song_id)
}

/** Result of deriving the 演出 layer from the source lists. */
export type PerformanceSetlistBuild = {
  setlists: PerformanceSetlistRow[]
  sources: PerformanceSetlistSourceRow[]
  shows: PerformanceShowSetlistRow[]
  items: PerformanceShowSetlistItemRow[]
  medleys: MedleyRow[]
  medleySongs: MedleySongRow[]
  /** Deterministic diagnostics for the report, not stored in the catalog. */
  stats: {
    performances: number
    shows: number
    items: number
    pendingReview: number
    conflicts: number
    unresolved: number
    inherited: number
    omittedRows: number
  }
}

/**
 * Expands the source song lists into one ordered setlist per 场次.
 *
 * VocaDB stores one song list for a whole run, and a shared list covers several city stops.
 * Each source line is attributed to the 场次 that its note covers, read by `showsForNotes`;
 * a line without a usable note applies to every 场次 of the 演出. Hand-checked curation can
 * assign, exclude, or add rows, and can supply the day/night dates the notes never carry.
 *
 * `note` on the derived 演出 row keeps the raw VocaDB note, but statistics no longer read it.
 */
export const buildPerformanceSetlists = (
  catalog: Catalog,
  review: RotationReview = reviewRotations(catalog),
  curation: PerformanceSetlistCurationIndex = emptyCurationIndex(),
): PerformanceSetlistBuild => {
  const schedules = performanceSchedules(catalog, review, curation.dayNight, curation.noShowDates, curation.halves)
  const setlists: PerformanceSetlistRow[] = []
  const sources: PerformanceSetlistSourceRow[] = []
  const shows: PerformanceShowSetlistRow[] = []
  const items: PerformanceShowSetlistItemRow[] = []
  const stats = {
    performances: 0,
    shows: 0,
    items: 0,
    pendingReview: 0,
    conflicts: 0,
    unresolved: 0,
    inherited: 0,
    omittedRows: 0,
  }
  const linesByList = new Map<number, ResolvedRotationLine[]>()
  for (const line of review.lines) {
    const bucket = linesByList.get(line.songListId) ?? []
    bucket.push(line)
    linesByList.set(line.songListId, bucket)
  }
  for (const bucket of linesByList.values()) bucket.sort((left, right) => left.position - right.position)

  // Medley ids must be stable: number them in (song list, position) order.
  const medleyByKey = new Map<string, number>()
  const medleyNames = new Map<number, { name: string; url: string }>()
  let nextMedleyId = 1

  for (const performance of catalog.performances) {
    const listId = performance.song_list_id
    if (listId === null) continue
    const songList = catalog.songLists.find((row) => row.id === listId)
    if (!songList) throw new Error(`Performance ${performance.id} points at missing song list ${listId}`)
    const listCuration = curation.lists.get(listId)
    const performanceCuration = curation.performances.get(performance.id)
    const lines = linesByList.get(listId) ?? []
    const schedule = schedules.get(performance.id) ?? []
    const showsOfRun: PerformanceShow[] =
      schedule.length > 0
        ? schedule
        : [{ key: `${performance.id}:unknown`, performanceId: performance.id, date: '', half: null, label: '日期未知' }]
    // A hand-checked `assign` may move a line that the note gave to another city, so a line that
    // names one of this 演出's 場次 counts as belonging to it even when the note did not.
    const runKeys = new Set(showsOfRun.map((show) => show.key))
    const assignedHere = new Set<number>()
    for (const [key, target] of Object.entries(listCuration?.assign ?? {})) {
      if (Array.isArray(target) && target.some((showKey) => runKeys.has(showKey))) assignedHere.add(Number(key))
    }
    const ownLines = lines.filter((line) => line.performanceIds.includes(performance.id) || assignedHere.has(line.position))
    if (ownLines.length === 0) continue

    let curated = false
    // Whether this 演出's halves are known, so a half-naming note is exact: a curated
    // schedule says so, or the notes themselves both split a day and name the half.
    const halvesKnown =
      curation.dayNight.has(performance.id) ||
      curation.halves.has(performance.id) ||
      dayNightDatesFor(
        performance,
        ownLines.map((line) => line.notes),
      ).length > 0
    const excluded = new Set(listCuration?.exclude ?? [])
    const pendingByShow = new Map<string, PendingItem[]>()
    const addItem = (showKey: string, item: PendingItem): void => {
      const bucket = pendingByShow.get(showKey) ?? []
      bucket.push(item)
      pendingByShow.set(showKey, bucket)
    }

    for (const line of ownLines) {
      if (excluded.has(line.position)) {
        curated = true
        continue
      }
      const assign = listCuration?.assign?.[String(line.position)]
      let targets: PerformanceShow[]
      if (assign === true) {
        targets = showsOfRun
        curated = true
      } else if (Array.isArray(assign)) {
        const allowed = new Set(assign)
        targets = showsOfRun.filter((show) => allowed.has(show.key))
        curated = true
      } else {
        targets = showsForNotes(line.notes, performance, showsOfRun)
      }
      if (targets.length === 0) continue
      const songIds = songIdsOfLine(catalog, listId, line.position)
      if (songIds.length === 0) continue
      const shared = isSharedLine(line)
      const evidence: PendingItem['evidence'] = Array.isArray(assign) || assign === true ? 'curated' : shared ? 'shared' : 'note'
      for (const show of targets) {
        if (songIds.length === 1) {
          addItem(show.key, {
            sourcePosition: line.position,
            songId: songIds[0] ?? null,
            medleyId: null,
            evidence,
            notes: line.notes,
          })
          continue
        }
        const medleyKey = `${listId}:${line.position}`
        let medleyId = medleyByKey.get(medleyKey)
        if (medleyId === undefined) {
          medleyId = nextMedleyId
          nextMedleyId += 1
          medleyByKey.set(medleyKey, medleyId)
          medleyNames.set(medleyId, {
            name: catalog.songs.find((row) => row.id === line.listedSongId)?.name ?? String(line.listedSongId),
            url: catalog.songs.find((row) => row.id === line.listedSongId)?.source_url ?? '',
          })
        }
        addItem(show.key, {
          sourcePosition: line.position,
          songId: null,
          medleyId,
          evidence,
          notes: line.notes,
        })
      }
    }

    for (const extra of listCuration?.extra ?? []) {
      curated = true
      for (const showKey of extra.showKeys) {
        if (!showsOfRun.some((show) => show.key === showKey)) continue
        for (const songId of extra.songIds) {
          addItem(showKey, {
            sourcePosition: null,
            songId,
            medleyId: null,
            evidence: 'curated',
            notes: extra.note ?? null,
          })
        }
      }
    }

    const resolution = resolveAttribution(performanceCuration, ownLines, catalog, listId, halvesKnown)
    const citedSources = performanceCuration?.sources ?? []
    const conflict =
      performanceCuration?.conflict === true || citedSources.some((source) => source.conflict === true) ? 1 : 0
    // A cited source, official or not, settles the question: the row keeps the URL and the
    // confidence so a reader can judge it, but nobody has to confirm it again. What still
    // needs a human is a 演出 nothing could locate, or one whose sources disagree.
    const pendingReview = conflict === 1 || (resolution === 'unresolved' && citedSources.length === 0)
    const anyUncertain = ownLines.some((line) => line.uncertain)
    const everyShared = ownLines.every((line) => isSharedLine(line))
    const change: PerformanceSetlistRow['change'] = curated ? 'curated' : ownLines.length < lines.length ? 'filtered' : 'none'
    const status: PerformanceSetlistRow['status'] = conflict
      ? 'conflict'
      : everyShared && citedSources.length === 0
        ? 'inherited'
        : anyUncertain || pendingReview
          ? 'partial'
          : 'complete'

    setlists.push({
      performance_id: performance.id,
      source_list_id: listId,
      source_kind: songList.source,
      change,
      status,
      resolution,
      source_row_count: lines.length,
      day_night_dates: curation.dayNight.has(performance.id) ? JSON.stringify(curation.dayNight.get(performance.id)) : null,
      no_show_dates: curation.noShowDates.has(performance.id) ? JSON.stringify(curation.noShowDates.get(performance.id)) : null,
      single_show_dates: performanceCuration?.singleShowDates === undefined ? null : JSON.stringify(performanceCuration.singleShowDates),
      conflict,
      pending_review: pendingReview ? 1 : 0,
      note: performanceCuration?.note ?? listCuration?.note ?? null,
    })
    stats.performances += 1
    if (pendingReview) stats.pendingReview += 1
    if (conflict) stats.conflicts += 1
    if (resolution === 'unresolved') stats.unresolved += 1
    if (status === 'inherited') stats.inherited += 1
    for (const source of citedSources) {
      sources.push({
        performance_id: performance.id,
        url: source.url,
        title: source.title,
        accessed_at: source.accessedAt,
        confidence: source.confidence,
        note: source.note ?? null,
        conflict: source.conflict === true ? 1 : 0,
      })
    }

    for (const show of showsOfRun) {
      const ordered = numberItems(pendingByShow.get(show.key) ?? [])
      const reasons = new Set<string>()
      if (anyUncertain) {
        for (const line of ownLines) {
          if (!line.uncertain) continue
          for (const reason of line.reasons) {
            // The derived layer resolves these two kinds, so inheriting them would report a
            // problem that no longer exists:
            //  - a half is known once the schedule was curated, so `day with day/night shows`
            //    no longer means anything for this 演出;
            //  - lengths are re-measured per 場次 at the end of the build.
            if (reason === 'day with day/night shows' && halvesKnown) continue
            if (reason.startsWith('setlist length mismatch')) continue
            reasons.add(reason)
          }
        }
      }
      shows.push({
        performance_id: performance.id,
        show_key: show.key,
        date: show.date === '' ? null : show.date,
        half: show.half,
        item_count: ordered.length,
        omitted_count: Math.max(lines.length - ownLines.length, 0),
        uncertain: reasons.size > 0 || pendingReview ? 1 : 0,
        reasons: JSON.stringify([...reasons].sort()),
      })
      stats.shows += 1
      ordered.forEach((item, index) => {
        items.push({
          performance_id: performance.id,
          show_key: show.key,
          position: index + 1,
          source_position: item.sourcePosition,
          song_id: item.songId,
          medley_id: item.medleyId,
          evidence: item.evidence,
          notes: item.notes,
        })
        stats.items += 1
      })
    }
    stats.omittedRows += Math.max(lines.length - ownLines.length, 0)  }

  // Re-measure lengths per 場次: a 演出-level count is meaningless once the shows are split out.
  // The mode of the source list's shows is the expectation, so a genuine short or long show
  // still surfaces while a day that merely carried fewer rows stops looking like an error.
  const listByPerformance = new Map(catalog.performances.map((row) => [row.id, row.song_list_id]))
  const countsByList = new Map<number, number[]>()
  for (const row of shows) {
    const listId = listByPerformance.get(row.performance_id)
    if (listId === undefined || listId === null) continue
    const bucket = countsByList.get(listId) ?? []
    bucket.push(row.item_count)
    countsByList.set(listId, bucket)
  }
  const expectedByList = new Map<number, number>()
  for (const [listId, counts] of countsByList) expectedByList.set(listId, modeOf(counts))
  for (const row of shows) {
    const listId = listByPerformance.get(row.performance_id)
    if (listId === undefined || listId === null) continue
    const expected = expectedByList.get(listId)
    if (expected === undefined || row.item_count === expected) continue
    const reasons = new Set<string>(parseReasons(row.reasons))
    reasons.add(`setlist length mismatch: ${row.item_count} vs expected ${expected}`)
    row.reasons = JSON.stringify([...reasons].sort())
    row.uncertain = 1
  }

  const medleys = [...medleyNames.entries()]
    .sort((left, right) => left[0] - right[0])
    .map(([id, entry]) => ({ id, name: entry.name, note: null, source_url: entry.url }))
  const medleySongs = [...medleyByKey.entries()]
    .map(([key, id]) => {
      const [listId, position] = key.split(':').map(Number)
      const songIds = songIdsOfLine(catalog, listId ?? 0, position ?? 0)
      return { id, songIds }
    })
    .sort((left, right) => left.id - right.id)
    .flatMap((entry) => entry.songIds.map((songId, index) => ({ medley_id: entry.id, position: index + 1, song_id: songId })))

  return { setlists, sources, shows, items, medleys, medleySongs, stats }
}

/**
 * Whether a line's attribution is really open.
 * A length warning says the row count looks unusual, not that the row belongs to the wrong
 * 場次, so it must not make an otherwise exact attribution look unresolved.
 */
const attributionOpen = (line: ResolvedRotationLine, halvesKnown: boolean): boolean => {
  if (!line.uncertain) return false
  return line.reasons.some(
    (reason) =>
      !reason.startsWith('setlist length mismatch') && !(halvesKnown && reason === 'day with day/night shows'),
  )
}

/**
 * Attribution method for one 演出, preferring the hand-checked value.
 * An album tracklist applies to every 场次 of its 演出 as one release, so it counts as
 * `vocadb-shared`: `source_kind = 'album'` already tells the page where the rows came from.
 * A cited outside source only upgrades `unresolved` to `external`: when the notes already
 * placed the rows, the source confirmed the schedule rather than the attribution.
 */
const resolveAttribution = (
  curation: PerformanceCuration | undefined,
  lines: readonly ResolvedRotationLine[],
  catalog: Catalog,
  songListId: number,
  halvesKnown: boolean,
): SetlistResolution => {
  if (curation?.resolution !== undefined) return curation.resolution
  const songList = catalog.songLists.find((row) => row.id === songListId)
  if (songList?.source === 'album') return 'vocadb-shared'
  if (lines.length === 0) return 'unresolved'
  if (lines.every((line) => isSharedLine(line))) return 'vocadb-shared'
  if (lines.some((line) => !isSharedLine(line) && !attributionOpen(line, halvesKnown))) return 'vocadb-note'
  return curation?.sources !== undefined && curation.sources.length > 0 ? 'external' : 'unresolved'
}

/**
 * 场次 of every 演出, read from the materialized derived layer.
 *
 * The rows already applied the curated schedule, so pages and statistics simply read them
 * instead of recomputing the schedule; that keeps the show keys and counts identical
 * everywhere.
 */
export const catalogSchedules = (catalog: Catalog): Map<number, PerformanceShow[]> => {
  const map = new Map<number, PerformanceShow[]>()
  for (const row of catalog.performanceShowSetlists) {
    const bucket = map.get(row.performance_id) ?? []
    bucket.push({
      key: row.show_key,
      performanceId: row.performance_id,
      date: row.date ?? '',
      half: row.half,
      label: row.half === null ? (row.date ?? '日期未知') : `${row.date} ${row.half === 'day' ? '日场' : '夜场'}`,
    })
    map.set(row.performance_id, bucket)
  }
  for (const bucket of map.values()) {
    bucket.sort((left, right) => left.date.localeCompare(right.date) || (left.half ?? '').localeCompare(right.half ?? ''))
  }
  return map
}

/** Most common value. Ties keep the larger one, matching the rotation review. */
const modeOf = (values: readonly number[]): number => {
  const frequency = new Map<number, number>()
  for (const value of values) frequency.set(value, (frequency.get(value) ?? 0) + 1)
  let expected = values[0] ?? 0
  let best = -1
  for (const [value, times] of frequency) {
    if (times > best || (times === best && value > expected)) {
      best = times
      expected = value
    }
  }
  return expected
}

/** Parses a stored JSON reason array, tolerating a corrupted value. */
const parseReasons = (raw: string): string[] => {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((value): value is string => typeof value === 'string')
  } catch {
    return []
  }
}

/** Songs one derived row contributes; a medley row expands to its parts. */
export const derivedItemSongIds = (catalog: Catalog, item: PerformanceShowSetlistItemRow): number[] => {
  if (item.song_id !== null) return [item.song_id]
  if (item.medley_id === null) return []
  return catalog.medleySongs
    .filter((row) => row.medley_id === item.medley_id)
    .sort((left, right) => left.position - right.position)
    .map((row) => row.song_id)
}

/** Derived rows of one 演出, grouped by 场次 and kept in printed order. */
export const derivedItemsByShow = (catalog: Catalog, performanceId: number): Map<string, PerformanceShowSetlistItemRow[]> => {
  const map = new Map<string, PerformanceShowSetlistItemRow[]>()
  for (const item of catalog.performanceShowSetlistItems) {
    if (item.performance_id !== performanceId) continue
    const bucket = map.get(item.show_key) ?? []
    bucket.push(item)
    map.set(item.show_key, bucket)
  }
  for (const bucket of map.values()) bucket.sort((left, right) => left.position - right.position)
  return map
}

/** Canonical song ids of one 场次 of the derived layer, medleys expanded. */
export const showSongIds = (
  catalog: Catalog,
  showKey: string,
  variants: SongVariantIndex = emptySongVariantIndex(),
): number[] => {
  const ids = new Set<number>()
  for (const item of catalog.performanceShowSetlistItems) {
    if (item.show_key !== showKey) continue
    for (const songId of derivedItemSongIds(catalog, item)) ids.add(variants.canonicalSongId(songId))
  }
  return [...ids].sort((left, right) => left - right)
}
