import { translate, type Locale } from './i18n/index.ts'
import { performanceSchedules, showsForNotes } from './event-schedule.ts'
import type { LookupResult } from './lookup.ts'
import { derivedItemSongIds } from './performance-setlists.ts'
import { producerNamesFor } from './producer-options.ts'
import { emptyProducerFlagIndex, type ProducerFlagIndex, type ProducerKind } from './producer-flags.ts'
import { reviewRotations } from './rotation.ts'
import type { SongVariantIndex, VariantKind } from './song-variants.ts'
import { isBroadcastAppearance, performanceYear } from './stats.ts'
import type { Catalog, PerformanceShowSetlistItemRow, SongRow } from './types.ts'

/** Producer-side role tokens VocaDB records, in display order. */
export const PRODUCER_ROLES = ['producer', 'composer', 'arranger', 'voicemanipulator'] as const

/** One producer-side role a credit can carry. */
export type ProducerRole = (typeof PRODUCER_ROLES)[number]

/** Localized label of a producer-side role. */
export const producerRoleLabel = (role: ProducerRole, locale: Locale): string => {
  if (role === 'composer') return translate(locale, 'producers.roleComposer')
  if (role === 'arranger') return translate(locale, 'producers.roleArranger')
  if (role === 'voicemanipulator') return translate(locale, 'producers.roleVoiceManipulator')
  return translate(locale, 'producers.roleProducer')
}

/** One producer-side credit of a song, already resolved to the display rule. */
export type SongProducerCreditView = {
  name: string
  /** VocaDB artist id; null when the name only comes from the free-text fallback. */
  artistId: number | null
  /** Roles of this credit; free-text names count as 制作 only. */
  roles: ProducerRole[]
}

/** Per-role distinct song counts of one producer. */
export type ProducerRoleCounts = Record<ProducerRole, number>

/** One credited song of a producer, with its own concert record. */
export type ProducerSongRow = {
  songId: number
  name: string
  roles: ProducerRole[]
  /** Year of the VocaDB publish date; null when the catalog has no usable date. */
  publishYear: number | null
  /** Distinct 场次 this song was performed in. */
  showCount: number
  /** Distinct 演出 this song was performed in. */
  performanceCount: number
  /** Ids of those 演出, ascending; lets a page list which songs one 演出 played. */
  performanceIds: number[]
  /** How this song differs from its canonical version; null on the canonical row. */
  variantKind: VariantKind | null
  /** Curator note of the variant entry, for a tooltip; null when absent or canonical. */
  variantNote: string | null
}

/** One producer's aggregated concert record. */
export type ProducerRow = {
  name: string
  /** VocaDB artist id, used only for the external artist link. */
  artistId: number | null
  /** Checked kind from `data/producer-flags.json`; `core` when the file says nothing. */
  kind: ProducerKind
  /** Distinct credited song ids, variants counted separately. */
  songIds: number[]
  /** 曲目数: every credited song, whether or not a setlist played it. */
  songCount: number
  /** Credited songs that appeared in at least one 场次. */
  performedSongIds: number[]
  /** 演出曲目: credited songs that appeared in at least one 场次. */
  performedSongCount: number
  /** 表演次数: summed distinct 场次 over every credited song. */
  appearanceCount: number
  /** Distinct 演出 that played at least one credited song. */
  performanceIds: number[]
  performanceCount: number
  /** Distinct 场次 that played at least one credited song. */
  showCount: number
  firstYear: number | null
  lastYear: number | null
  /** Distinct credited songs per role. */
  roles: ProducerRoleCounts
  /** Every credited song, most-performed first. */
  songs: ProducerSongRow[]
  /** Up to three most-performed songs, for the index table. */
  topSongIds: number[]
}

/** Every producer aggregated from one catalog, plus an exact-name lookup. */
export type ProducerIndex = {
  /** Every row, labels included, sorted by 曲目数. */
  rows: ProducerRow[]
  /**
   * Rows the statistics count: `rows` without `label` names. Rankings, totals, filters, search,
   * and the API export read this list; `/producers` may show `rows` instead behind its switch.
   */
  countedRows: ProducerRow[]
  /** Exact-name lookup over every row, so a label page still opens and explains what it is. */
  byName: ReadonlyMap<string, ProducerRow>
}

/** Options shared by the producer aggregation. */
export type ProducerIndexOptions = {
  /** Count livestream, online, and VR performances. They are excluded by default like the song ranking. */
  includeBroadcast?: boolean
  /**
   * Checked producer flags. `label` names stay out of `rows`, so the ranking, totals, filters,
   * and search never count them; they keep an entry in `byName` so a song page can still link to
   * them and the detail page can explain what they are.
   */
  flags?: ProducerFlagIndex
  /**
   * Variant catalog used to mark rows. Statistics never fold variants here (a producer's
   * 曲目数 keeps counting each credited song), so this only annotates the song rows.
   */
  variants?: SongVariantIndex
}

/** Sortable columns of the producer ranking. */
export type ProducerSortKey =
  | 'name'
  | 'songCount'
  | 'performedSongCount'
  | 'appearanceCount'
  | 'performanceCount'
  | 'showCount'
  | 'firstYear'
  | 'lastYear'

/** A producer name hit returned by the header search. */
export type ProducerLookupHit = {
  name: string
  roles: ProducerRole[]
  /** 曲目数, shown next to the name in the result panel. */
  songCount: number
}

/** Empty role counters, so every row has all four keys. */
const emptyRoleCounts = (): ProducerRoleCounts => ({
  producer: 0,
  composer: 0,
  arranger: 0,
  voicemanipulator: 0,
})

/** Parses a stored lower-case role list, keeping only the producer-side roles. */
const parseRoles = (roles: string): ProducerRole[] => {
  const found = new Set<string>()
  for (const token of roles.split(',')) {
    const role = token.trim().toLowerCase()
    if ((PRODUCER_ROLES as readonly string[]).includes(role)) found.add(role)
  }
  return PRODUCER_ROLES.filter((role) => found.has(role))
}

/**
 * Producer-side credits of one song, resolved by the same rule as the ranking and filters.
 *
 * `producerNamesFor` decides which names count: structured `song_producers` rows win, and the
 * free-text `artist_string` is only a fallback when the song has no structured row at all.
 * Structured names keep their VocaDB artist id and role evidence; free-text names count as 制作
 * and carry no id, so no VocaDB link is invented for them.
 */
export const producerCreditsOfSong = (song: SongRow): SongProducerCreditView[] => {
  const names = producerNamesFor(song)
  if (names.length === 0) return []
  const structured = new Map<string, { artistId: number; roles: ProducerRole[] }>()
  for (const credit of song.producers ?? []) {
    const name = credit.name.trim()
    if (name === '') continue
    const existing = structured.get(name)
    const roles = parseRoles(credit.roles)
    if (existing === undefined) {
      structured.set(name, { artistId: credit.artistId, roles })
      continue
    }
    // One artist can repeat on a song with different evidence; keep every role it proves.
    for (const role of roles) if (!existing.roles.includes(role)) existing.roles.push(role)
  }
  return names.map((name) => {
    const credit = structured.get(name)
    if (credit === undefined) return { name, artistId: null, roles: ['producer'] }
    return { name, artistId: credit.artistId, roles: credit.roles.length === 0 ? ['producer'] : credit.roles }
  })
}

/** 场次 keys and 演出 ids a song was played in. */
type SongAppearance = {
  shows: Set<string>
  performances: Set<number>
}

/** Adds one appearance of a song to its bucket. */
const addAppearance = (
  appearances: Map<number, SongAppearance>,
  songId: number,
  showKey: string,
  performanceId: number,
): void => {
  const bucket = appearances.get(songId) ?? { shows: new Set<string>(), performances: new Set<number>() }
  bucket.shows.add(showKey)
  bucket.performances.add(performanceId)
  appearances.set(songId, bucket)
}

/** Source-layer lines grouped by song list, built once for the fallback path. */
type SourceFallback = {
  linksByList: Map<number, Catalog['setlistItemSongs']>
  lineByKey: Map<string, ReturnType<typeof reviewRotations>['lines'][number]>
  itemKeys: Set<string>
  schedules: ReturnType<typeof performanceSchedules>
}

/** Prepares the source-layer fallback used by catalogs that have no derived 场次 rows. */
const sourceFallback = (catalog: Catalog): SourceFallback => {
  const linksByList = new Map<number, Catalog['setlistItemSongs']>()
  for (const link of catalog.setlistItemSongs) {
    const bucket = linksByList.get(link.song_list_id) ?? []
    bucket.push(link)
    linksByList.set(link.song_list_id, bucket)
  }
  const review = reviewRotations(catalog)
  const lineByKey = new Map(review.lines.map((line) => [`${line.songListId}:${line.position}`, line]))
  const itemKeys = new Set(catalog.setlistItems.map((row) => `${row.song_list_id}:${row.position}`))
  return { linksByList, lineByKey, itemKeys, schedules: performanceSchedules(catalog, review) }
}

/**
 * 场次 and 演出 behind every song.
 *
 * The derived 场次 layer wins wherever a 演出 has rows, because it already resolved the setlist
 * notes and the day/night split. 演出 without derived rows fall back to the source layer and
 * `showsForNotes`, mirroring the song ranking. Broadcast-only 演出 are dropped unless
 * `includeBroadcast` is set, and medley rows expand to their parts.
 */
const songAppearances = (catalog: Catalog, options: ProducerIndexOptions): Map<number, SongAppearance> => {
  const appearances = new Map<number, SongAppearance>()
  const performanceById = new Map(catalog.performances.map((row) => [row.id, row]))
  const derived = new Map<number, PerformanceShowSetlistItemRow[]>()
  for (const item of catalog.performanceShowSetlistItems) {
    const bucket = derived.get(item.performance_id) ?? []
    bucket.push(item)
    derived.set(item.performance_id, bucket)
  }
  for (const [performanceId, items] of derived) {
    const performance = performanceById.get(performanceId)
    if (performance === undefined) continue
    // The derived 場次 layer records every setlist this project tracks, including 演出 whose
    // list only exists here (a wiki table with no upstream VocaDB list), so both count.
    if (options.includeBroadcast !== true && isBroadcastAppearance(performance)) continue
    for (const item of items) {
      for (const songId of derivedItemSongIds(catalog, item)) addAppearance(appearances, songId, item.show_key, performanceId)
    }
  }

  const needsFallback = catalog.performances.some(
    (performance) => performance.song_list_id !== null && !derived.has(performance.id),
  )
  if (!needsFallback) return appearances
  const fallback = sourceFallback(catalog)
  for (const performance of catalog.performances) {
    if (derived.has(performance.id)) continue
    if (options.includeBroadcast !== true && isBroadcastAppearance(performance)) continue
    const listId = performance.song_list_id
    if (listId === null) continue
    const shows = fallback.schedules.get(performance.id) ?? []
    for (const link of fallback.linksByList.get(listId) ?? []) {
      if (!fallback.itemKeys.has(`${link.song_list_id}:${link.position}`)) continue
      if (link.role !== 'listed') continue
      const line = fallback.lineByKey.get(`${link.song_list_id}:${link.position}`)
      if (!line || !line.performanceIds.includes(performance.id)) continue
      for (const show of showsForNotes(line.notes, performance, shows)) {
        addAppearance(appearances, link.song_id, show.key, performance.id)
      }
    }
  }
  return appearances
}

/** Year of a song's publish date, or null when the date is missing or malformed. */
const publishYear = (song: SongRow): number | null => {
  const date = song.publish_date
  if (date === null || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  return Number(date.slice(0, 4))
}

/** Most-performed songs first, then by id so ties are stable. */
const compareSongs = (left: ProducerSongRow, right: ProducerSongRow): number =>
  right.showCount - left.showCount || left.songId - right.songId

/** Whether a sortable value is missing; a missing value always sorts last. */
const isBlank = (row: ProducerRow, key: ProducerSortKey): boolean => {
  if (key === 'name') return row.name.trim() === ''
  const value = row[key]
  return value === null
}

/**
 * Compares two producers under one column.
 * Missing years stay at the end in both directions, so an ascending year sort still starts with
 * the oldest real year instead of a run of blanks. Ties fall back to the name order.
 */
export const compareProducers = (key: ProducerSortKey, direction: 'asc' | 'desc' = 'desc') => {
  return (left: ProducerRow, right: ProducerRow): number => {
    const leftBlank = isBlank(left, key)
    const rightBlank = isBlank(right, key)
    if (leftBlank !== rightBlank) return leftBlank ? 1 : -1
    if (!leftBlank) {
      const primary =
        key === 'name'
          ? left.name.localeCompare(right.name, 'ja')
          : (left[key] as number) - (right[key] as number)
      if (primary !== 0) return direction === 'desc' ? -primary : primary
    }
    return left.name.localeCompare(right.name, 'ja')
  }
}

/**
 * Aggregates every producer credited in the catalog.
 *
 * A producer name comes from `producerNamesFor`, so structured `song_producers` rows win and the
 * free-text fallback only fills songs without them. Songs with no producer credit produce no
 * row. 曲目数 counts distinct song ids without folding variants; 演出曲目 and 表演次数 read the
 * derived 场次 layer (with the source-layer fallback), so one song counts once per 场次 and a
 * medley credits each of its parts. 演出数 is the number of distinct `performances` rows, and
 * 场次 is the union of the show keys those songs played. Broadcast-only 演出 stay out.
 *
 * A producer without any appearance is still listed, with 演出数 and 场次 both 0.
 *
 * Names flagged `label` in `data/producer-flags.json` stay in `rows` but are left out of
 * `countedRows`, so a label or studio never ranks and never counts as one of the "x producers".
 * `byName` keeps their row, so `/producers/<name>` still explains what the name is and the song
 * page keeps its full credit. `/producers` can show `rows` behind its 包含厂牌 switch.
 *
 * `options.variants` only annotates each song row with its variant kind and note; 曲目数 and the
 * other counts keep treating every credited song separately.
 */
export const buildProducerIndex = (catalog: Catalog, options: ProducerIndexOptions = {}): ProducerIndex => {
  const flags = options.flags ?? emptyProducerFlagIndex()
  const appearances = songAppearances(catalog, options)
  const performanceById = new Map(catalog.performances.map((row) => [row.id, row]))
  const songsById = new Map(catalog.songs.map((row) => [row.id, row]))

  /** Credited song ids per producer name. */
  const songIdsByName = new Map<string, Set<number>>()
  /** Distinct songs per role per producer name. */
  const roleSongsByName = new Map<string, Map<ProducerRole, Set<number>>>()
  /** Song credits, reused for the per-song role column. */
  const rolesBySongAndName = new Map<number, Map<string, ProducerRole[]>>()
  const artistIdByName = new Map<string, number>()

  for (const song of catalog.songs) {
    const credits = producerCreditsOfSong(song)
    if (credits.length === 0) continue
    for (const credit of credits) {
      const songIds = songIdsByName.get(credit.name) ?? new Set<number>()
      songIds.add(song.id)
      songIdsByName.set(credit.name, songIds)

      const roleSongs = roleSongsByName.get(credit.name) ?? new Map<ProducerRole, Set<number>>()
      for (const role of credit.roles) {
        const ids = roleSongs.get(role) ?? new Set<number>()
        ids.add(song.id)
        roleSongs.set(role, ids)
      }
      roleSongsByName.set(credit.name, roleSongs)

      const songRoles = rolesBySongAndName.get(song.id) ?? new Map<string, ProducerRole[]>()
      songRoles.set(credit.name, credit.roles)
      rolesBySongAndName.set(song.id, songRoles)

      if (credit.artistId !== null && !artistIdByName.has(credit.name)) artistIdByName.set(credit.name, credit.artistId)
    }
  }

  const rows: ProducerRow[] = []
  for (const [name, ids] of songIdsByName) {
    const songIds = [...ids].sort((left, right) => left - right)
    const performanceIds = new Set<number>()
    const showKeys = new Set<string>()
    const songs: ProducerSongRow[] = []
    let appearanceCount = 0
    for (const songId of songIds) {
      const song = songsById.get(songId)
      if (song === undefined) continue
      const appearance = appearances.get(songId)
      const showCount = appearance?.shows.size ?? 0
      const performanceCount = appearance?.performances.size ?? 0
      const variant = options.variants?.entries.get(songId)
      if (appearance !== undefined) {
        appearanceCount += showCount
        for (const key of appearance.shows) showKeys.add(key)
        for (const id of appearance.performances) performanceIds.add(id)
      }
      songs.push({
        songId,
        name: song.name,
        roles: rolesBySongAndName.get(songId)?.get(name) ?? ['producer'],
        publishYear: publishYear(song),
        showCount,
        performanceCount,
        performanceIds: [...(appearance?.performances ?? [])].sort((left, right) => left - right),
        variantKind: variant?.kind ?? null,
        variantNote: variant?.note ?? null,
      })
    }
    songs.sort(compareSongs)

    const performanceList = [...performanceIds].sort((left, right) => left - right)
    const years: number[] = []
    for (const performanceId of performanceList) {
      const performance = performanceById.get(performanceId)
      const year = performance === undefined ? null : performanceYear(performance.start_date)
      if (year !== null) years.push(year)
    }

    const roleCounts = emptyRoleCounts()
    for (const [role, roleSongIds] of roleSongsByName.get(name) ?? []) roleCounts[role] = roleSongIds.size

    rows.push({
      name,
      artistId: artistIdByName.get(name) ?? null,
      kind: flags.kindOf(name, artistIdByName.get(name) ?? null),
      songIds,
      songCount: songIds.length,
      performedSongIds: songs.filter((song) => song.showCount > 0).map((song) => song.songId),
      performedSongCount: songs.filter((song) => song.showCount > 0).length,
      appearanceCount,
      performanceIds: performanceList,
      performanceCount: performanceList.length,
      showCount: showKeys.size,
      firstYear: years.length === 0 ? null : Math.min(...years),
      lastYear: years.length === 0 ? null : Math.max(...years),
      roles: roleCounts,
      songs,
      topSongIds: songs.filter((song) => song.showCount > 0).slice(0, 3).map((song) => song.songId),
    })
  }

  rows.sort(compareProducers('songCount', 'desc'))
  return {
    rows,
    countedRows: rows.filter((row) => row.kind !== 'label'),
    byName: new Map(rows.map((row) => [row.name, row])),
  }
}

/** Copies the rows into the order one column asks for; the input stays untouched. */
export const rankProducers = (
  rows: readonly ProducerRow[],
  key: ProducerSortKey = 'songCount',
  direction: 'asc' | 'desc' = 'desc',
): ProducerRow[] => [...rows].sort(compareProducers(key, direction))

/** Role tokens with a non-zero song count, in display order. */
export const rolesPresent = (roles: ProducerRoleCounts): ProducerRole[] =>
  PRODUCER_ROLES.filter((role) => roles[role] > 0)

/** Page path of one producer; the name is the route key and is URI-encoded. */
export const producerPath = (name: string): string => `/producers/${encodeURIComponent(name)}`

/** One parsed index per catalog and flag set, so header search does not rebuild it per keystroke. */
const indexCache = new WeakMap<Catalog, Map<ProducerFlagIndex, ProducerIndex>>()

/** Builds or reuses the producer index of one catalog under one flag set. */
const cachedProducerIndex = (catalog: Catalog, flags: ProducerFlagIndex): ProducerIndex => {
  const byFlags = indexCache.get(catalog)
  const cached = byFlags?.get(flags)
  if (cached !== undefined) return cached
  const index = buildProducerIndex(catalog, { flags })
  const bucket = byFlags ?? new Map<ProducerFlagIndex, ProducerIndex>()
  bucket.set(flags, index)
  indexCache.set(catalog, bucket)
  return index
}

/**
 * Finds producers already in the catalog.
 * Matching is a case-insensitive substring over the producer names, in the ranking's default
 * order (most songs first). The default cap is five hits; `total` keeps the real hit count.
 * Only counted rows are searched, so a flagged label never surfaces in the header search.
 */
export const localProducerMatches = (
  catalog: Catalog,
  query: string,
  limit = 5,
  flags: ProducerFlagIndex = emptyProducerFlagIndex(),
): LookupResult<ProducerLookupHit> => {
  const needle = query.trim().toLocaleLowerCase()
  const empty = (): LookupResult<ProducerLookupHit> => ({ items: [], total: 0, limit })
  if (needle === '') return empty()
  const index = cachedProducerIndex(catalog, flags)
  const hits: ProducerLookupHit[] = []
  for (const row of index.countedRows) {
    if (!row.name.toLocaleLowerCase().includes(needle)) continue
    hits.push({ name: row.name, roles: rolesPresent(row.roles), songCount: row.songCount })
  }
  return { items: hits.slice(0, limit), total: hits.length, limit }
}
