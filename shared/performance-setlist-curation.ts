import {
  performanceSchedules,
  type CuratedDayNight,
  type CuratedHalves,
  type CuratedNoShowDates,
  type ShowHalf,
} from './event-schedule.ts'
import type { RotationReview } from './rotation.ts'
import type { Catalog, SetlistConfidence, SetlistResolution } from './types.ts'

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
  /** Maintainer-facing note; kept in the reports and off the 演出 page. */
  note?: string
  /** Reader-facing caveat printed on the 演出 page. */
  pageNote?: string
  sources?: SetlistSourceEntry[]
  /**
   * A complete ordered setlist from an outside source, used instead of the VocaDB rows.
   * Symphony performances give one list per city, so the list applies to every 場次 of the 演出.
   */
  setlist?: CuratedSetlist
}

/** Shapes a slot marker may take: a half, a date, a date and a half, or a full 場次 key. */
const SETLIST_SLOT_MATCH = /^(?:\d+:)?(?:day|night|\d{4}-\d{2}-\d{2}(?::(?:day|night))?)$/

/** One song of a wiki-sourced setlist, already resolved to a catalog song id. */
export type CuratedSetlistSong = {
  id: number
  title: string
  /** Free-text note from the source, e.g. `メドレー：悪ノ交響曲 第2楽章`. */
  note?: string
}

/** One slot of a wiki table whose rows differ by day, night, or date. */
export type CuratedSetlistSlot = {
  /** `day`, `night`, `YYYY-MM-DD`, or `YYYY-MM-DD:day|night`. */
  match: string
  songs: CuratedSetlistSong[]
}

/** A complete setlist taken from an outside source. */
export type CuratedSetlist = {
  source: string
  title: string
  accessedAt: string
  confidence: SetlistConfidence
  /** Which city or slot block the list covers, for the page and the docs. */
  label?: string
  songs: CuratedSetlistSong[]
  /** Per-slot lists for a table that split one 演出 into different programs. */
  slots?: CuratedSetlistSlot[]
}

/** Hand-checked outcome of a 演出 with no setlist row. */
export type PerformanceStatusCuration = {
  status: 'cancelled' | 'postponed' | 'upcoming'
  note?: string
  source: string
  accessedAt: string
}

/** Hand-checked override for one source song list. */
export type ListCuration = {
  note?: string
  source?: string
  accessedAt?: string
  confidence?: SetlistConfidence
  /**
   * Corrected note text for one source line, keyed by position.
   * Use it when a wiki proves the VocaDB note named the wrong city, day, or half.
   */
  notes?: Record<string, string>
  /**
   * Shows a line must not appear in, keyed by position.
   * Use it when a wiki proves the note over-claims: the line names a show that did not play it.
   */
  dropShows?: Record<string, string[]>
  /**
   * Show key to a one-line reason why its length differs from the other shows on purpose,
   * for example `23 + 1 encore` on a stop where another city got a second encore.
   */
  explainedLengths?: Record<string, string>
  /**
   * Whether the cited source confirms each city played one programme across all of its shows.
   * A city-only note such as `Osaka` is then exact, not an unresolved "which day" question.
   */
  citiesPlayOneSetlist?: boolean
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
  /** Hand-checked outcome for 演出 without a setlist row. */
  statuses?: Record<string, PerformanceStatusCuration>
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
  /** Hand-checked outcome per performance id. */
  statuses: ReadonlyMap<number, PerformanceStatusCuration>
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
  statuses: new Map(),
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
  if (record.pageNote !== undefined) {
    if (typeof record.pageNote !== 'string' || record.pageNote.trim() === '') {
      throw new Error(`Curation for ${performanceId} pageNote must be non-empty text`)
    }
    parsed.pageNote = record.pageNote
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
  if (record.setlist !== undefined) {
    const raw = record.setlist
    if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new Error(`Curation for ${performanceId} setlist is not an object`)
    }
    const list = raw as Record<string, unknown>
    if (typeof list.source !== 'string' || !/^https?:\/\//.test(list.source)) {
      throw new Error(`Curation for ${performanceId} setlist has no http(s) source`)
    }
    if (typeof list.title !== 'string' || list.title.trim() === '') {
      throw new Error(`Curation for ${performanceId} setlist has no title`)
    }
    if (!isDay(list.accessedAt)) throw new Error(`Curation for ${performanceId} setlist has no accessedAt`)
    if (list.confidence !== 'high' && list.confidence !== 'medium' && list.confidence !== 'low') {
      throw new Error(`Curation for ${performanceId} setlist has an unknown confidence`)
    }
    if (!Array.isArray(list.songs) || list.songs.length === 0) {
      throw new Error(`Curation for ${performanceId} setlist has no songs`)
    }
    const songs = list.songs.map((song) => {
      if (song === null || typeof song !== 'object' || Array.isArray(song)) {
        throw new Error(`Curation for ${performanceId} setlist has a non-object song`)
      }
      const entry = song as Record<string, unknown>
      if (!Number.isInteger(entry.id) || (entry.id as number) <= 0) {
        throw new Error(`Curation for ${performanceId} setlist song has no id`)
      }
      if (typeof entry.title !== 'string' || entry.title.trim() === '') {
        throw new Error(`Curation for ${performanceId} setlist song has no title`)
      }
      const parsedSong: CuratedSetlistSong = { id: entry.id as number, title: (entry.title as string).trim() }
      if (entry.note !== undefined) {
        if (typeof entry.note !== 'string') {
          throw new Error(`Curation for ${performanceId} setlist song note is not text`)
        }
        parsedSong.note = entry.note
      }
      return parsedSong
    })
    const setlist: CuratedSetlist = {
      source: list.source,
      title: list.title.trim(),
      accessedAt: list.accessedAt,
      confidence: list.confidence,
      songs,
    }
    if (typeof list.label === 'string' && list.label.trim() !== '') setlist.label = list.label.trim()
    if (list.slots !== undefined) {
      const rawSlots = list.slots
      if (!Array.isArray(rawSlots) || rawSlots.length === 0) {
        throw new Error(`Curation for ${performanceId} setlist slots must be a non-empty array`)
      }
      const slots: CuratedSetlistSlot[] = []
      for (const slot of rawSlots) {
        if (typeof slot !== 'object' || slot === null) {
          throw new Error(`Curation for ${performanceId} setlist slot is not an object`)
        }
        const match = (slot as { match?: unknown }).match
        if (typeof match !== 'string' || !SETLIST_SLOT_MATCH.test(match)) {
          throw new Error(`Curation for ${performanceId} setlist slot has an unknown match ${String(match)}`)
        }
        const slotSongs = (slot as { songs?: unknown }).songs
        if (!Array.isArray(slotSongs) || slotSongs.length === 0) {
          throw new Error(`Curation for ${performanceId} setlist slot ${match} has no songs`)
        }
        for (const song of slotSongs) {
          if (typeof song !== 'object' || song === null) {
            throw new Error(`Curation for ${performanceId} setlist slot ${match} song is not an object`)
          }
          const id = (song as { id?: unknown }).id
          if (typeof id !== 'number') {
            throw new Error(`Curation for ${performanceId} setlist slot ${match} song has no id`)
          }
        }
        slots.push({
          match,
          songs: slotSongs.map((song) => ({
            id: (song as { id: number }).id,
            title: String((song as { title?: unknown }).title ?? ''),
            ...(typeof (song as { note?: unknown }).note === 'string'
              ? { note: (song as { note: string }).note }
              : {}),
          })),
        })
      }
      setlist.slots = slots
    }
    parsed.setlist = setlist
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
  const hasCorrection =
    record.assign !== undefined ||
    record.exclude !== undefined ||
    record.extra !== undefined ||
    record.notes !== undefined ||
    record.dropShows !== undefined
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
  if (record.notes !== undefined) {
    if (record.notes === null || typeof record.notes !== 'object' || Array.isArray(record.notes)) {
      throw new Error(`Curation for song list ${songListId} notes is not an object`)
    }
    const notes: Record<string, string> = {}
    for (const [key, text] of Object.entries(record.notes as Record<string, unknown>)) {
      if (!/^[1-9]\d*$/.test(key)) throw new Error(`Curation for song list ${songListId} notes key ${key} is not a position`)
      if (typeof text !== 'string') throw new Error(`Curation for song list ${songListId} notes ${key} is not text`)
      notes[key] = text
    }
    parsed.notes = notes
  }
  if (record.dropShows !== undefined) {
    if (record.dropShows === null || typeof record.dropShows !== 'object' || Array.isArray(record.dropShows)) {
      throw new Error(`Curation for song list ${songListId} dropShows is not an object`)
    }
    const dropShows: Record<string, string[]> = {}
    for (const [key, value] of Object.entries(record.dropShows as Record<string, unknown>)) {
      if (!/^[1-9]\d*$/.test(key)) throw new Error(`Curation for song list ${songListId} dropShows key ${key} is not a position`)
      if (!Array.isArray(value) || value.length === 0 || !value.every((show) => typeof show === 'string')) {
        throw new Error(`Curation for song list ${songListId} dropShows ${key} is not a list of show keys`)
      }
      dropShows[key] = value as string[]
    }
    parsed.dropShows = dropShows
  }
  if (record.citiesPlayOneSetlist !== undefined) {
    if (typeof record.citiesPlayOneSetlist !== 'boolean') {
      throw new Error(`Curation for song list ${songListId} citiesPlayOneSetlist is not a boolean`)
    }
    parsed.citiesPlayOneSetlist = record.citiesPlayOneSetlist
  }
  if (record.explainedLengths !== undefined) {
    if (record.explainedLengths === null || typeof record.explainedLengths !== 'object' || Array.isArray(record.explainedLengths)) {
      throw new Error(`Curation for song list ${songListId} explainedLengths is not an object`)
    }
    const explained: Record<string, string> = {}
    for (const [key, text] of Object.entries(record.explainedLengths as Record<string, unknown>)) {
      if (typeof text !== 'string' || text.trim() === '') {
        throw new Error(`Curation for song list ${songListId} explainedLengths ${key} is not text`)
      }
      explained[key] = text
    }
    parsed.explainedLengths = explained
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
  const statuses = new Map<number, PerformanceStatusCuration>()
  if (file.statuses !== undefined) {
    if (file.statuses === null || typeof file.statuses !== 'object' || Array.isArray(file.statuses)) {
      throw new Error('Setlist curation statuses is not an object')
    }
    for (const [key, entry] of Object.entries(file.statuses as Record<string, unknown>)) {
      const performanceId = readId(key, 'Performance')
      if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
        throw new Error(`Status for ${performanceId} is not an object`)
      }
      const record = entry as Record<string, unknown>
      if (record.status !== 'cancelled' && record.status !== 'postponed' && record.status !== 'upcoming') {
        throw new Error(`Status for ${performanceId} is unknown`)
      }
      if (typeof record.source !== 'string' || !/^https?:\/\//.test(record.source)) {
        throw new Error(`Status for ${performanceId} has no http(s) source`)
      }
      if (!isDay(record.accessedAt)) throw new Error(`Status for ${performanceId} has no accessedAt`)
      const parsedStatus: PerformanceStatusCuration = {
        status: record.status,
        source: record.source,
        accessedAt: record.accessedAt,
      }
      if (record.note !== undefined) {
        if (typeof record.note !== 'string') throw new Error(`Status for ${performanceId} note is not text`)
        parsedStatus.note = record.note
      }
      statuses.set(performanceId, parsedStatus)
    }
  }
  return {
    performances,
    lists,
    dayNight,
    noShowDates,
    halves,
    statuses,
    size: performances.size + lists.size + statuses.size,
  }
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
  for (const performanceId of curation.statuses.keys()) {
    if (!performances.has(performanceId)) throw new Error(`Status cites unknown performance ${performanceId}`)
  }
  for (const [performanceId, entry] of curation.performances) {
    for (const song of entry.setlist?.songs ?? []) {
      if (!songs.has(song.id)) {
        throw new Error(`Curation for ${performanceId} setlist cites unknown song ${song.id}`)
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
    for (const key of Object.keys(entry.notes ?? {})) {
      if (!positions.has(Number(key))) throw new Error(`Curation for list ${songListId} rewrites unknown position ${key}`)
    }
    for (const [key, showKeys] of Object.entries(entry.dropShows ?? {})) {
      if (!positions.has(Number(key))) throw new Error(`Curation for list ${songListId} drops unknown position ${key}`)
      for (const showKey of showKeys) {
        if (!showKeysByPerformance.has(showKey)) {
          throw new Error(`Curation for list ${songListId} drops position ${key} from unknown show ${showKey}`)
        }
      }
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

