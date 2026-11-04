import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  ALBUM_SONG_LIST_BASE,
  albumPageUrl,
  albumSongListId,
  albumTrackSongId,
  parseAlbumSetlists,
  type AlbumSetlistIndex,
} from '../../shared/album-setlists.ts'
import type {
  ReleaseMedium,
  SetlistItemRow,
  SetlistItemSongRow,
  SongListRow,
  SongRow,
  VideoRow,
} from '../../shared/types.ts'
import { chunkInserts, chunkInsertsIgnoring } from '../sql/emit.ts'
import { repoRoot } from '../build-catalog.ts'
import type { ApiAlbum, ApiAlbumTrack, ApiSong } from './api-types.ts'
import { createVocadbClient } from './client.ts'
import { normalizeSong, normalizeVideos } from './normalize.ts'

const API = 'https://vocadb.net/api'

/** Rows derived from curated album tracklists. */
export type AlbumSetlistRows = {
  songLists: SongListRow[]
  songs: SongRow[]
  videos: VideoRow[]
  items: SetlistItemRow[]
  itemSongs: SetlistItemSongRow[]
  /** Performances that should point at an album tracklist. */
  performanceLists: { performanceId: number; songListId: number }[]
}

/** Album API URL including its tracklist. */
export const albumTracksUrl = (albumId: number): string => `${API}/albums/${albumId}?fields=Tracks,Names&lang=Default`

/** Song API URL used to fill names and PVs for a track's original song. */
const songApiUrl = (songId: number): string => `${API}/songs/${songId}?fields=Names,PVs,WebLinks&lang=Default`

/** Deepest version chain followed before accepting the last song as the original. */
const MAX_VERSION_DEPTH = 8

/** One album track resolved to the song that counts for its setlist. */
type ResolvedTrackSong = {
  id: number
  song: ApiSong
}

/**
 * Follows `originalVersionId` links from an album track to the original song.
 * A track can be a version of an earlier album version, so one hop is not enough;
 * stopping at the root keeps playback statistics on the real song instead of an album cut.
 * A cycle or a chain longer than `MAX_VERSION_DEPTH` stops at the last valid song.
 */
const resolveTrackSong = async (
  getJson: (url: string) => Promise<unknown>,
  track: ApiAlbumTrack,
): Promise<ResolvedTrackSong | null> => {
  let current = albumTrackSongId(track)
  if (current === null) return null
  const seen = new Set<number>()
  for (let depth = 0; depth <= MAX_VERSION_DEPTH; depth++) {
    if (seen.has(current)) return null
    seen.add(current)
    const song = (await getJson(songApiUrl(current))) as ApiSong
    const original = song.originalVersionId
    if (typeof original !== 'number' || !Number.isInteger(original) || original <= 0) return { id: current, song }
    current = original
  }
  return null
}

/** Prints an album track in disc and track order. */
const trackOrder = (track: ApiAlbumTrack): number => {
  const disc = track.discNumber ?? 1
  const number = track.trackNumber ?? 0
  return disc * 10_000 + number
}

/** Reads and checks an album tracklist, ordered by disc then track number. */
const fetchAlbumTracks = async (
  getJson: (url: string) => Promise<unknown>,
  albumId: number,
): Promise<{ name: string; tracks: ApiAlbumTrack[] }> => {
  const album = (await getJson(albumTracksUrl(albumId))) as ApiAlbum
  if (album.id !== albumId) throw new Error(`Album ${albumId} returned id ${album.id}`)
  const tracks = [...(album.tracks ?? [])].sort((left, right) => trackOrder(left) - trackOrder(right))
  if (tracks.length === 0) throw new Error(`Album ${albumId} has no tracklist on VocaDB`)
  return { name: album.name, tracks }
}

/**
 * Builds catalog rows from every mapped album.
 * One song list per album; all performances mapped to it share the tracklist.
 * Track songs resolve through `originalVersionId` to the original VocaDB song, which is
 * fetched so names, PVs, and playback bands stay available.
 */
export const collectAlbumSetlistRows = async (
  getJson: (url: string) => Promise<unknown>,
  mapping: AlbumSetlistIndex,
  retrievedAt: string,
): Promise<AlbumSetlistRows> => {
  const byAlbum = new Map<number, { performanceId: number; albumType: ReleaseMedium }[]>()
  for (const [performanceId, entry] of [...mapping.entries].sort((left, right) => left[0] - right[0])) {
    const list = byAlbum.get(entry.albumId) ?? []
    list.push({ performanceId, albumType: entry.albumType })
    byAlbum.set(entry.albumId, list)
  }

  const songs = new Map<number, SongRow>()
  const videos = new Map<number, VideoRow>()
  const songLists: SongListRow[] = []
  const items: SetlistItemRow[] = []
  const itemSongs: SetlistItemSongRow[] = []
  const performanceLists: { performanceId: number; songListId: number }[] = []

  /** Stores one track song and its supported PVs; a fetched song is never requested twice. */
  const rememberSong = (resolved: ResolvedTrackSong): void => {
    if (songs.has(resolved.id)) return
    songs.set(resolved.id, normalizeSong(resolved.song, retrievedAt))
    for (const video of normalizeVideos(resolved.song)) {
      if (!videos.has(video.vocadb_pv_id)) videos.set(video.vocadb_pv_id, video)
    }
  }

  for (const [albumId, performances] of [...byAlbum.entries()].sort((left, right) => left[0] - right[0])) {
    const album = await fetchAlbumTracks(getJson, albumId)
    const songListId = albumSongListId(albumId)
    const medium = performances[0]?.albumType ?? 'cd'
    songLists.push({
      id: songListId,
      name: album.name,
      featured_category: null,
      source_url: albumPageUrl(albumId),
      retrieved_at: retrievedAt,
      announced_at: null,
      source: 'album',
      album_id: albumId,
      medium,
    })
    let position = 0
    for (const track of album.tracks) {
      const resolved = await resolveTrackSong(getJson, track)
      if (resolved === null) continue
      position += 1
      rememberSong(resolved)
      items.push({ song_list_id: songListId, position, listed_song_id: resolved.id, notes: null })
      itemSongs.push({ song_list_id: songListId, position, song_id: resolved.id, role: 'listed' })
    }
    for (const performance of performances) {
      performanceLists.push({ performanceId: performance.performanceId, songListId })
    }
  }

  return {
    songLists,
    songs: [...songs.values()],
    videos: [...videos.values()],
    items,
    itemSongs,
    performanceLists,
  }
}

/**
 * Renders the album-setlist increment.
 * Album rows are replaced, shared songs and videos are kept on conflict, and a performance
 * keeps a real VocaDB song list if one appears later.
 */
export const albumSetlistSql = (rows: AlbumSetlistRows, retrievedAt: string): string => {
  const statements = [
    '-- Album tracklists used as setlists for performances that have none in VocaDB.',
    '-- Source: data/album-setlists.json and https://vocadb.net/api/albums',
    `-- Retrieved: ${retrievedAt}`,
    '-- License: https://wiki.vocadb.net/docs/license (link back when reusing database contents)',
    'BEGIN;',
    `DELETE FROM setlist_item_songs WHERE song_list_id >= ${ALBUM_SONG_LIST_BASE};`,
    `DELETE FROM medley_quarantine WHERE song_list_id >= ${ALBUM_SONG_LIST_BASE};`,
    `DELETE FROM setlist_items WHERE song_list_id >= ${ALBUM_SONG_LIST_BASE};`,
    `DELETE FROM song_lists WHERE id >= ${ALBUM_SONG_LIST_BASE};`,
    `UPDATE performances SET song_list_id = NULL WHERE song_list_id >= ${ALBUM_SONG_LIST_BASE};`,
    chunkInsertsIgnoring(
      'songs',
      ['id', 'name', 'name_ja', 'name_en', 'artist_string', 'song_type', 'publish_date', 'length_seconds', 'source_url', 'retrieved_at'],
      rows.songs.map((row) => [
        row.id, row.name, row.name_ja, row.name_en, row.artist_string, row.song_type, row.publish_date, row.length_seconds, row.source_url, row.retrieved_at,
      ]),
    ),
    chunkInsertsIgnoring(
      'videos',
      ['vocadb_pv_id', 'song_id', 'platform', 'platform_video_id', 'url', 'title', 'author', 'pv_type', 'publish_date', 'disabled'],
      rows.videos.map((row) => [
        row.vocadb_pv_id, row.song_id, row.platform, row.platform_video_id, row.url, row.title, row.author, row.pv_type, row.publish_date, row.disabled,
      ]),
    ),
    chunkInserts(
      'song_lists',
      ['id', 'name', 'featured_category', 'source_url', 'retrieved_at', 'announced_at', 'source', 'album_id', 'medium'],
      rows.songLists.map((row) => [
        row.id, row.name, row.featured_category, row.source_url, row.retrieved_at, row.announced_at, row.source, row.album_id, row.medium,
      ]),
    ),
    chunkInserts('setlist_items', ['song_list_id', 'position', 'listed_song_id', 'notes'], rows.items.map((row) => [
      row.song_list_id, row.position, row.listed_song_id, row.notes,
    ])),
    chunkInserts('setlist_item_songs', ['song_list_id', 'position', 'song_id', 'role'], rows.itemSongs.map((row) => [
      row.song_list_id, row.position, row.song_id, row.role,
    ])),
    '-- Only fill a performance that still has no setlist after the upstream collection.',
    ...rows.performanceLists.map(
      (row) => `UPDATE performances SET song_list_id = ${row.songListId} WHERE id = ${row.performanceId} AND song_list_id IS NULL;`,
    ),
    'COMMIT;',
    '',
  ]
  return statements.filter((part) => part !== '').join('\n')
}

/** Fetches every mapped album and rewrites data/increments/0004-album-setlists.sql. */
export const collectAlbumSetlists = async (root = repoRoot(), retrievedAt = new Date().toISOString()): Promise<void> => {
  const payload: unknown = JSON.parse(await readFile(path.join(root, 'data', 'album-setlists.json'), 'utf8'))
  const mapping = parseAlbumSetlists(payload)
  if (mapping.size === 0) {
    console.log('No album setlist mappings; nothing to write')
    return
  }
  const client = createVocadbClient({ cacheDir: path.join(root, 'data', 'cache') })
  const rows = await collectAlbumSetlistRows(client.getJson, mapping, retrievedAt)
  const target = path.join(root, 'data', 'increments', '0004-album-setlists.sql')
  await mkdir(path.dirname(target), { recursive: true })
  await writeFile(target, albumSetlistSql(rows, retrievedAt))
  console.log(
    `Wrote ${target}: ${rows.songLists.length} album setlists, ${rows.items.length} tracks, ${rows.performanceLists.length} performances, ${client.requestCount()} requests`,
  )
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isDirectRun) {
  await collectAlbumSetlists()
}
