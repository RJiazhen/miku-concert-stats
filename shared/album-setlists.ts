import type { Catalog, ReleaseMedium } from './types.ts'

/** Release media that may supply a fallback tracklist. */
const MEDIA: readonly ReleaseMedium[] = ['bluray', 'cd', 'dvd']

/** First synthetic song list id used for album tracklists, far above every VocaDB list id. */
export const ALBUM_SONG_LIST_BASE = 1_000_000_000

/** One curated album fallback: which performance uses which release. */
export type AlbumSetlistEntry = {
  albumId: number
  albumType: ReleaseMedium
  note?: string
}

/** Performance id string to its album entry. */
export type AlbumSetlistFile = Record<string, AlbumSetlistEntry>

/** Lookups over the curated mapping. */
export type AlbumSetlistIndex = {
  /** Album entry for a performance, or null when the performance has no fallback. */
  entryOf: (performanceId: number) => AlbumSetlistEntry | null
  /** Every mapped performance. */
  entries: ReadonlyMap<number, AlbumSetlistEntry>
  /** Number of mapped performances. */
  size: number
}

/** Empty index so callers can skip album fallbacks without branching. */
export const emptyAlbumSetlistIndex = (): AlbumSetlistIndex => ({
  entryOf: () => null,
  entries: new Map(),
  size: 0,
})

/** Reads a positive decimal id from a JSON key or number. */
const readId = (value: unknown, context: string): number => {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) return value
  if (typeof value === 'string' && /^[1-9]\d*$/.test(value)) return Number(value)
  throw new Error(`${context} is not a positive integer id`)
}

/** Whether a value is an accepted release medium. */
const isMedium = (value: unknown): value is ReleaseMedium => {
  return typeof value === 'string' && (MEDIA as readonly string[]).includes(value)
}

/**
 * Validates the curated album fallback file.
 * Throws on a non-numeric performance key, a missing album id, an unknown medium, or a non-text note.
 */
export const parseAlbumSetlists = (value: unknown): AlbumSetlistIndex => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Album setlist file must be an object')
  }
  const entries = new Map<number, AlbumSetlistEntry>()
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    const performanceId = readId(key, `Album setlist key ${key}`)
    entries.set(performanceId, parseEntry(performanceId, entry))
  }
  return {
    entryOf: (performanceId: number) => entries.get(performanceId) ?? null,
    entries,
    size: entries.size,
  }
}

/** Reads one album fallback entry. */
const parseEntry = (performanceId: number, entry: unknown): AlbumSetlistEntry => {
  if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
    throw new Error(`Album setlist ${performanceId} is not an object`)
  }
  const record = entry as Record<string, unknown>
  const albumId = readId(record.albumId, `Album setlist ${performanceId} albumId`)
  if (!isMedium(record.albumType)) throw new Error(`Album setlist ${performanceId} has an unknown albumType`)
  if (record.note !== undefined && typeof record.note !== 'string') {
    throw new Error(`Album setlist ${performanceId} note is not text`)
  }
  const parsed: AlbumSetlistEntry = { albumId, albumType: record.albumType }
  if (typeof record.note === 'string') parsed.note = record.note
  return parsed
}

/** Album page on VocaDB. */
export const albumPageUrl = (albumId: number): string => `https://vocadb.net/Al/${albumId}`

/** Synthetic song list id for an album tracklist. */
export const albumSongListId = (albumId: number): number => ALBUM_SONG_LIST_BASE + albumId

/** Album id behind a synthetic song list id, or null for a real VocaDB list. */
export const albumIdFromSongListId = (songListId: number): number | null => {
  return songListId >= ALBUM_SONG_LIST_BASE ? songListId - ALBUM_SONG_LIST_BASE : null
}

/** VocaDB page for a song list id; an album fallback points at its album instead. */
export const setlistSourceUrl = (songListId: number): string => {
  const albumId = albumIdFromSongListId(songListId)
  return albumId === null ? `https://vocadb.net/SongList/Details/${songListId}` : albumPageUrl(albumId)
}

/** Chinese tag for a setlist that came from an album, or null for an upstream list. */
export const setlistSourceTag = (songListId: number): string | null => {
  return albumIdFromSongListId(songListId) === null ? null : '专辑曲目'
}

/** Chinese name of a release medium. */
export const albumMediumLabel = (medium: ReleaseMedium): string => {
  if (medium === 'bluray') return '蓝光'
  if (medium === 'dvd') return 'DVD'
  return 'CD'
}

/** One notice split around the album name, which the UI renders as a link to the album page. */
export type AlbumSetlistNotice = {
  /** Text before the album name, e.g. `歌单来自蓝光《`. */
  before: string
  /** Text after the album name, e.g. `》的曲目列表，不是 VocaDB 上该场演出的歌单。`. */
  after: string
}

/** Chinese notice that a setlist came from a release, not from the performance's own song list. */
export const albumSetlistNotice = (medium: ReleaseMedium): AlbumSetlistNotice => {
  return {
    before: `歌单来自${albumMediumLabel(medium)}《`,
    after: '》的曲目列表，不是 VocaDB 上该场演出的歌单。',
  }
}

/** Minimal album track shape the collector reads. */
export type AlbumTrackLike = {
  song?: { id: number; originalVersionId?: number | null } | null
}

/**
 * Song id one album track points at before version chains are followed.
 * VocaDB links an album track to the song it is a version of; the collector then walks
 * that link to the root song. A track without a link (for example a medley) keeps its own id.
 */
export const albumTrackSongId = (track: AlbumTrackLike): number | null => {
  const song = track.song
  if (!song) return null
  const original = song.originalVersionId
  if (typeof original === 'number' && Number.isInteger(original) && original > 0) return original
  return song.id
}

/** One album-sourced setlist found in a loaded catalog. */
export type AlbumSetlistSource = {
  songListId: number
  albumId: number
  medium: ReleaseMedium
  name: string
  url: string
  /** Sentence parts around the linked album name. */
  notice: AlbumSetlistNotice
}

/** Album sources among the given song lists, ordered by list id. */
export const albumSetlistSources = (catalog: Catalog, songListIds: readonly number[]): AlbumSetlistSource[] => {
  const wanted = new Set(songListIds)
  const sources: AlbumSetlistSource[] = []
  for (const list of catalog.songLists) {
    if (!wanted.has(list.id)) continue
    if (list.source !== 'album' || list.album_id === null || list.medium === null) continue
    sources.push({
      songListId: list.id,
      albumId: list.album_id,
      medium: list.medium,
      name: list.name,
      url: albumPageUrl(list.album_id),
      notice: albumSetlistNotice(list.medium),
    })
  }
  return sources.sort((left, right) => left.songListId - right.songListId)
}
