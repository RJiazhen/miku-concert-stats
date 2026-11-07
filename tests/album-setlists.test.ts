import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  ALBUM_SONG_LIST_BASE,
  albumIdFromSongListId,
  albumMediumLabel,
  albumPageUrl,
  albumSetlistNotice,
  albumSetlistSources,
  albumSongListId,
  albumTrackSongId,
  parseAlbumSetlists,
  setlistSourceTag,
  setlistSourceUrl,
} from '../shared/album-setlists.ts'
import { albumSetlistSql, collectAlbumSetlistRows } from '../scripts/vocadb/album-setlists.ts'
import type { Catalog, SongListRow } from '../shared/types.ts'

/** Committed mapping file, read without importing JSON into the bundle. */
const committed = (): unknown => JSON.parse(readFileSync(new URL('../data/album-setlists.json', import.meta.url), 'utf8')) as unknown

/** Empty catalog overridden per test. */
const baseCatalog = (): Catalog => ({
  sources: [],
  series: [],
  performances: [],
  performanceLinks: [],
  premieres: [],
  songLists: [],
  songs: [],
  setlistItems: [],
  setlistItemSongs: [],
  medleyQuarantine: [],
  videos: [],
  performanceSetlists: [],
  performanceSetlistSources: [],
  performanceShowSetlists: [],
  performanceShowSetlistItems: [],
  medleys: [],
  medleySongs: [],
  performanceStatus: [],
})

/** One song list row for provenance tests. */
const songList = (overrides: Partial<SongListRow>): SongListRow => ({
  id: 10,
  name: 'VocaDB 歌单',
  featured_category: null,
  source_url: 'https://vocadb.net/L/10',
  retrieved_at: '2026-11-04T00:00:00.000Z',
  announced_at: null,
  source: 'vocadb',
  album_id: null,
  medium: null,
  ...overrides,
})

describe('album setlist mapping file', () => {
  it('maps every symphony edition that has a released album and leaves the rest alone', () => {
    const mapping = parseAlbumSetlists(committed())
    expect(mapping.size).toBe(26)
    expect(mapping.entryOf(2959)).toEqual({ albumId: 30961, albumType: 'bluray', note: expect.stringContaining('2017') })
    expect(mapping.entryOf(4877)?.albumId).toBe(39621)
    expect(mapping.entryOf(12713)).toBeNull()
    expect(mapping.entryOf(13209)).toBeNull()
    expect(new Set([...mapping.entries.values()].map((entry) => entry.albumId)).size).toBe(11)
  })

  it('rejects an unknown medium, a missing album, and a non-numeric performance key', () => {
    expect(() => parseAlbumSetlists([])).toThrow(/must be an object/)
    expect(() => parseAlbumSetlists({ abc: { albumId: 1, albumType: 'cd' } })).toThrow(/not a positive integer id/)
    expect(() => parseAlbumSetlists({ 1: { albumType: 'cd' } })).toThrow(/albumId/)
    expect(() => parseAlbumSetlists({ 1: { albumId: 1, albumType: 'vinyl' } })).toThrow(/albumType/)
    expect(() => parseAlbumSetlists({ 1: { albumId: 1, albumType: 'cd', note: 3 } })).toThrow(/note/)
  })
})

describe('album song list ids', () => {
  it('keeps album lists in their own id space', () => {
    expect(albumSongListId(30961)).toBe(ALBUM_SONG_LIST_BASE + 30961)
    expect(albumIdFromSongListId(albumSongListId(30961))).toBe(30961)
    expect(albumIdFromSongListId(17933)).toBeNull()
  })

  it('resolves a track to the song it performs', () => {
    expect(albumTrackSongId({ song: { id: 186300, originalVersionId: 139926 } })).toBe(139926)
    expect(albumTrackSongId({ song: { id: 136887 } })).toBe(136887)
    expect(albumTrackSongId({ song: { id: 5, originalVersionId: null } })).toBe(5)
    expect(albumTrackSongId({ song: null })).toBeNull()
    expect(albumTrackSongId({})).toBeNull()
  })

  it('points setlist links at the album page when the list is album-sourced', () => {
    expect(setlistSourceUrl(17933)).toBe('https://vocadb.net/SongList/Details/17933')
    expect(setlistSourceUrl(albumSongListId(30961))).toBe('https://vocadb.net/Al/30961')
    expect(setlistSourceTag(17933)).toBeNull()
    expect(setlistSourceTag(albumSongListId(30961))).toBe('专辑曲目')
  })
})

describe('album provenance', () => {
  it('names the medium, the album, and the source page in Chinese', () => {
    expect(albumMediumLabel('bluray')).toBe('蓝光')
    expect(albumMediumLabel('cd')).toBe('CD')
    expect(albumSetlistNotice('bluray')).toEqual({
      before: '歌单来自蓝光《',
      after: '》的曲目列表，不是 VocaDB 上该场演出的歌单。',
    })
    expect(albumPageUrl(30961)).toBe('https://vocadb.net/Al/30961')
  })

  it('reports album sources only for album lists in the requested set', () => {
    const catalog = baseCatalog()
    catalog.songLists = [
      songList({ id: 17933 }),
      songList({
        id: albumSongListId(30961),
        name: '初音ミクシンフォニー ~Miku Symphony 2017~ オーケストラライブ Blu-ray',
        source: 'album',
        album_id: 30961,
        medium: 'bluray',
        source_url: 'https://vocadb.net/Al/30961',
      }),
    ]
    expect(albumSetlistSources(catalog, [17933])).toEqual([])
    expect(albumSetlistSources(catalog, [17933, albumSongListId(30961)])).toEqual([
      expect.objectContaining({
        songListId: albumSongListId(30961),
        albumId: 30961,
        medium: 'bluray',
        url: 'https://vocadb.net/Al/30961',
      }),
    ])
  })
})

describe('album tracklist collection', () => {
  it('builds one album list, ordered by disc and track, and never overrides a VocaDB setlist', async () => {
    const album = {
      id: 30961,
      name: 'Album 30961',
      tracks: [
        { discNumber: 2, trackNumber: 1, song: { id: 20, originalVersionId: 200 } },
        { discNumber: 1, trackNumber: 2, song: { id: 21 } },
        { discNumber: 1, trackNumber: 1, song: { id: 22, originalVersionId: 220 } },
      ],
    }
    const songs: Record<number, unknown> = {
      200: { id: 200, name: 'Song 200', names: [], songType: 'Remix', pvs: [], originalVersionId: 201 },
      201: { id: 201, name: 'Song 201', names: [], songType: 'Original', pvs: [] },
      21: { id: 21, name: 'Song 21', names: [], songType: 'Original', pvs: [] },
      220: { id: 220, name: 'Song 220', names: [], songType: 'Original', pvs: [] },
    }
    /** Serves the album payload and its track songs. */
    const getJson = async (url: string): Promise<unknown> => {
      if (url.includes('/albums/')) return album
      const id = Number(url.match(/songs\/(\d+)/)?.[1] ?? 0)
      const song = songs[id]
      if (!song) throw new Error(`Unexpected song request ${url}`)
      return song
    }
    const mapping = parseAlbumSetlists({ 2958: { albumId: 30961, albumType: 'bluray' }, 2959: { albumId: 30961, albumType: 'bluray' } })
    const rows = await collectAlbumSetlistRows(getJson, mapping, '2026-11-04T00:00:00.000Z')
    expect(rows.songLists).toHaveLength(1)
    expect(rows.songLists[0]).toMatchObject({ id: albumSongListId(30961), source: 'album', album_id: 30961, medium: 'bluray' })
    expect(rows.items.map((row) => [row.position, row.listed_song_id])).toEqual([[1, 220], [2, 21], [3, 201]])
    expect(rows.performanceLists).toEqual([
      { performanceId: 2958, songListId: albumSongListId(30961) },
      { performanceId: 2959, songListId: albumSongListId(30961) },
    ])
    const sql = albumSetlistSql(rows, '2026-11-04T00:00:00.000Z')
    expect(sql).toContain('INSERT OR IGNORE INTO songs')
    expect(sql).toContain('AND song_list_id IS NULL')
    expect(sql).toContain("'album', 30961, 'bluray'")
  })
})
