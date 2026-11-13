import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { premieresFor } from '../../shared/premiere.ts'
import { isPlaceholderSong } from '../../shared/placeholder-song.ts'
import type {
  MedleyQuarantineRow,
  PerformanceLinkRow,
  PerformanceRow,
  SeriesRow,
  SetlistItemRow,
  SetlistItemSongRow,
  SongListRow,
  SongRow,
  VideoRow,
} from '../../shared/types.ts'
import { catalogTransaction, chunkInserts } from '../sql/emit.ts'
import { repoRoot } from '../build-catalog.ts'
import type { ApiEvent, ApiSeries, ApiSong, ApiSongInList, ApiSongListPage } from './api-types.ts'
import { createVocadbClient } from './client.ts'
import { collectAlbumSetlists } from './album-setlists.ts'
import {
  lineDecision,
  normalizeLinks,
  normalizePerformance,
  normalizeSeries,
  normalizeSong,
  normalizeVideos,
  songListUrl,
} from './normalize.ts'

/**
 * Concert series this site records. Ids are the VocaDB release-event series ids.
 * 255 is 初音ミク×鼓童 (Hatsune Miku × Kodō), the NHK Hall collaboration with the Kodo taiko troupe.
 * 408 and 799 are the 2023 THUNDERBOLT and 2025 BLOOMING iterations of 初音ミク JAPAN LIVE TOUR.
 */
export const SERIES_IDS = [81, 82, 173, 256, 219, 204, 255, 408, 799] as const

/**
 * Standalone VocaDB events filed under a recorded series.
 * Event 2520 (`ミクの日感謝祭39's Giving Day`, 2010-03-09) has no series upstream and reports
 * `seriesNumber` 0, so the series loop never reaches it. It is the 2010 edition of the
 * 初音ミクライブパーティー Miku-no-Hi line at Zepp Tokyo that continued from 2011. Event 2521
 * (`MIKUNOPOLIS in LOS ANGELES`, 2011-07-02) is the overseas derivative of that same 感謝祭.
 */
export const STANDALONE_EVENTS = [
  { id: 2520, seriesId: 219, seriesNumber: 2010 },
  { id: 2521, seriesId: 219, seriesNumber: 2011 },
] as const

const API = 'https://vocadb.net/api'

/** Pulls the recorded concert series plus curated standalone events and writes the catalog increment. */
export const collectCatalog = async (root = repoRoot()): Promise<void> => {
  const retrievedAt = new Date().toISOString()
  const client = createVocadbClient({ cacheDir: path.join(root, 'data', 'cache') })
  const seriesRows: SeriesRow[] = []
  const performances: PerformanceRow[] = []
  const links: PerformanceLinkRow[] = []
  const songLists = new Map<number, SongListRow>()
  const songs = new Map<number, SongRow>()
  const videos = new Map<number, VideoRow>()
  const items: SetlistItemRow[] = []
  const itemSongs: SetlistItemSongRow[] = []
  const quarantine: MedleyQuarantineRow[] = []
  const seenLists = new Set<number>()

  /** Stores a song and its supported PVs. Later copies do not clobber the first full row. */
  const rememberSong = (song: ApiSong): void => {
    if (!songs.has(song.id)) songs.set(song.id, normalizeSong(song, retrievedAt))
    for (const video of normalizeVideos(song)) {
      if (!videos.has(video.vocadb_pv_id)) videos.set(video.vocadb_pv_id, video)
    }
  }

  /** Loads a component song that was cited by URL but was not itself on a setlist page. */
  const ensureSong = async (id: number): Promise<void> => {
    if (songs.has(id)) return
    const url = `${API}/songs/${id}?fields=Names,PVs,WebLinks&lang=Default`
    const payload = (await client.getJson(url)) as ApiSong
    rememberSong(payload)
  }

  for (const seriesId of SERIES_IDS) {
    const seriesUrl = `${API}/releaseEventSeries/${seriesId}?fields=Description,Names,WebLinks,Events&lang=Default`
    const series = (await client.getJson(seriesUrl)) as ApiSeries
    seriesRows.push(normalizeSeries(series, retrievedAt))
    const extraStubs = STANDALONE_EVENTS.filter((extra) => extra.seriesId === seriesId).map((extra) => ({ id: extra.id }))
    for (const stub of [...(series.events ?? []), ...extraStubs]) {
      const eventUrl = `${API}/releaseEvents/${stub.id}?fields=Description,Names,SongList,Venue,WebLinks&lang=Default`
      const event = (await client.getJson(eventUrl)) as ApiEvent
      const extra = STANDALONE_EVENTS.find((candidate) => candidate.id === event.id)
      performances.push(normalizePerformance(event, seriesId, retrievedAt, extra?.seriesNumber))
      links.push(...normalizeLinks(event))
      const list = event.songList
      if (!list || seenLists.has(list.id)) continue
      seenLists.add(list.id)
      songLists.set(list.id, {
        id: list.id,
        name: list.name,
        featured_category: list.featuredCategory ?? null,
        source_url: songListUrl(list.id),
        retrieved_at: retrievedAt,
        announced_at: null,
        source: 'vocadb',
        album_id: null,
        medium: null,
      })
      const lines = await fetchAllLines(client.getJson, list.id)
      const orders = new Set<number>()
      for (const line of lines) {
        if (orders.has(line.order)) throw new Error(`Duplicate setlist order ${line.order} on list ${list.id}`)
        orders.add(line.order)
        // VocaDB files non-song segments (Kodō's taiko interludes) under the shared placeholder song.
        if (isPlaceholderSong(line.song)) continue
        rememberSong(line.song)
        const notes = line.notes ?? null
        const decision = lineDecision(line.song, notes)
        items.push({
          song_list_id: list.id,
          position: line.order,
          listed_song_id: line.song.id,
          notes,
        })
        if (decision.kind === 'quarantine') {
          quarantine.push({
            song_list_id: list.id,
            position: line.order,
            listed_song_id: line.song.id,
            reason: decision.reason,
          })
          continue
        }
        if (decision.kind === 'split') {
          try {
            for (const songId of decision.songIds) await ensureSong(songId)
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            if (!message.includes('404')) throw error
            quarantine.push({
              song_list_id: list.id,
              position: line.order,
              listed_song_id: line.song.id,
              reason: `Component song fetch failed: ${message}`,
            })
            continue
          }
        }
        for (const songId of decision.songIds) {
          itemSongs.push({
            song_list_id: list.id,
            position: line.order,
            song_id: songId,
            role: decision.kind === 'split' ? 'component' : 'listed',
          })
        }
      }
    }
    console.log(`Series ${seriesId}: ${client.requestCount()} network requests so far`)
  }

  const uniquePerformances = [...new Map(performances.map((row) => [row.id, row])).values()]
  const uniqueLinks = [...new Map(links.map((row) => [`${row.performance_id}\0${row.url}`, row])).values()]
  const premieres = premieresFor(uniquePerformances)
  const body = [
    chunkInserts('sources', ['id', 'name', 'url', 'license', 'notes'], [[
      'vocadb',
      'VocaDB',
      'https://vocadb.net/',
      'https://wiki.vocadb.net/docs/license',
      'Database contents may be reused with attribution and a link back to VocaDB. Third-party images, audio, and lyrics are not included.',
    ]]),
    chunkInserts('series', ['id', 'name', 'name_ja', 'description', 'source_url', 'retrieved_at'], seriesRows.map((row) => [
      row.id,
      row.name,
      row.name_ja,
      row.description,
      row.source_url,
      row.retrieved_at,
    ])),
    chunkInserts('performances', [
      'id', 'series_id', 'name', 'name_ja', 'venue_name', 'country_code', 'start_date', 'end_date',
      'showtime_local', 'timezone', 'time_precision', 'time_evidence', 'role', 'series_number',
      'series_suffix', 'song_list_id', 'vocadb_status', 'source_url', 'retrieved_at',
    ], uniquePerformances.map((row) => [
      row.id, row.series_id, row.name, row.name_ja, row.venue_name, row.country_code, row.start_date, row.end_date,
      row.showtime_local, row.timezone, row.time_precision, row.time_evidence, row.role, row.series_number,
      row.series_suffix, row.song_list_id, row.vocadb_status, row.source_url, row.retrieved_at,
    ])),
    chunkInserts('performance_links', ['performance_id', 'url', 'description'], uniqueLinks.map((row) => [
      row.performance_id, row.url, row.description,
    ])),
    chunkInserts('edition_premieres', [
      'series_id', 'series_number', 'premiere_performance_id', 'premiere_date', 'premiere_showtime_local', 'rule',
    ], premieres.map((row) => [
      row.series_id, row.series_number, row.premiere_performance_id, row.premiere_date, row.premiere_showtime_local, row.rule,
    ])),
    chunkInserts('song_lists', [
      'id', 'name', 'featured_category', 'source_url', 'retrieved_at', 'announced_at', 'source', 'album_id', 'medium',
    ], [...songLists.values()].map((row) => [
      row.id, row.name, row.featured_category, row.source_url, row.retrieved_at, row.announced_at, row.source, row.album_id, row.medium,
    ])),
    chunkInserts('songs', [
      'id', 'name', 'name_ja', 'name_en', 'artist_string', 'song_type', 'publish_date', 'length_seconds', 'source_url', 'retrieved_at',
    ], [...songs.values()].map((row) => [
      row.id, row.name, row.name_ja, row.name_en, row.artist_string, row.song_type, row.publish_date, row.length_seconds, row.source_url, row.retrieved_at,
    ])),
    chunkInserts('setlist_items', ['song_list_id', 'position', 'listed_song_id', 'notes'], items.map((row) => [
      row.song_list_id, row.position, row.listed_song_id, row.notes,
    ])),
    chunkInserts('setlist_item_songs', ['song_list_id', 'position', 'song_id', 'role'], itemSongs.map((row) => [
      row.song_list_id, row.position, row.song_id, row.role,
    ])),
    chunkInserts('medley_quarantine', ['song_list_id', 'position', 'listed_song_id', 'reason'], quarantine.map((row) => [
      row.song_list_id, row.position, row.listed_song_id, row.reason,
    ])),
    chunkInserts('videos', [
      'vocadb_pv_id', 'song_id', 'platform', 'platform_video_id', 'url', 'title', 'author', 'pv_type', 'publish_date', 'disabled',
    ], [...videos.values()].map((row) => [
      row.vocadb_pv_id, row.song_id, row.platform, row.platform_video_id, row.url, row.title, row.author, row.pv_type, row.publish_date, row.disabled,
    ])),
  ].filter((part) => part.length > 0).join('\n')

  const target = path.join(root, 'data', 'increments', '0001-vocadb-catalog.sql')
  await mkdir(path.dirname(target), { recursive: true })
  await writeFile(target, catalogTransaction(body, retrievedAt))
  await collectAlbumSetlists(root, retrievedAt)
  console.log(
    `Wrote ${target}: ${uniquePerformances.length} performances, ${songs.size} songs, ${quarantine.length} quarantined lines, ${client.requestCount()} requests`,
  )
}

/** Pages a song list until a short page arrives. */
const fetchAllLines = async (
  getJson: (url: string) => Promise<unknown>,
  listId: number,
): Promise<ApiSongInList[]> => {
  const pageSize = 50
  const lines: ApiSongInList[] = []
  let start = 0
  for (;;) {
    const url = `${API}/songLists/${listId}/songs?start=${start}&maxResults=${pageSize}&fields=Names,PVs,WebLinks&lang=Default`
    const page = (await getJson(url)) as ApiSongListPage
    lines.push(...page.items)
    if (page.items.length < pageSize) return lines
    start += page.items.length
  }
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isDirectRun) {
  await collectCatalog()
}
