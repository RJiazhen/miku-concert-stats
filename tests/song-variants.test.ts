import { describe, expect, it } from 'vitest'
import { parseSongVariants, emptySongVariantIndex } from '../shared/song-variants.ts'
import { rankSongAppearances } from '../shared/stats.ts'
import type { Catalog, PerformanceRow, SetlistItemRow, SetlistItemSongRow, SongRow } from '../shared/types.ts'

/** Minimal catalog overridden by each fixture. */
const catalog = (): Catalog => ({
  sources: [],
  series: [{ id: 81, name: 'マジカルミライ', name_ja: null, description: null, source_url: 'https://vocadb.net/Event/SeriesDetails/81', retrieved_at: '2026-10-12T00:00:00.000Z' }],
  performances: [],
  performanceLinks: [],
  premieres: [],
  songLists: [],
  songs: [],
  setlistItems: [],
  setlistItemSongs: [],
  medleyQuarantine: [],
  videos: [],
  snapshots: [],
  milestones: [],
  formulas: [],
})

/** Performance fixture with a setlist. */
const performance = (id: number, songListId: number): PerformanceRow => ({
  id,
  series_id: 81,
  name: `Show ${id}`,
  name_ja: null,
  venue_name: null,
  country_code: 'JP',
  start_date: '2016-09-02',
  end_date: null,
  showtime_local: null,
  timezone: null,
  time_precision: 'day',
  time_evidence: null,
  role: 'show',
  series_number: 2016,
  series_suffix: null,
  song_list_id: songListId,
  vocadb_status: 'Finished',
  source_url: `https://vocadb.net/E/${id}`,
  retrieved_at: '2026-10-12T00:00:00.000Z',
})

/** Song fixture. */
const song = (id: number, name: string): SongRow => ({
  id,
  name,
  name_ja: null,
  name_en: null,
  artist_string: 'artist feat. 初音ミク',
  song_type: 'Original',
  publish_date: null,
  length_seconds: null,
  source_url: `https://vocadb.net/S/${id}`,
  retrieved_at: '2026-10-12T00:00:00.000Z',
})

/** Printed setlist line without notes. */
const item = (songListId: number, position: number, listedSongId: number): SetlistItemRow => ({
  song_list_id: songListId,
  position,
  listed_song_id: listedSongId,
  notes: null,
})

/** Counted song on a setlist line. */
const link = (songListId: number, position: number, songId: number): SetlistItemSongRow => ({
  song_list_id: songListId,
  position,
  song_id: songId,
  role: 'listed',
})

describe('song variant file', () => {
  it('rejects chains, unknown kinds, and non-id keys', () => {
    expect(() => parseSongVariants({ abc: { canonical: 1, kind: 'cover' } })).toThrow()
    expect(() => parseSongVariants({ '2': { canonical: 1, kind: 'mashup' } })).toThrow()
    expect(() => parseSongVariants({ '2': { canonical: 1, kind: 'cover' }, '3': { canonical: 2, kind: 'cover' } })).toThrow()
    expect(() => parseSongVariants({ '2': { canonical: 2, kind: 'cover' } })).toThrow()
  })

  it('resolves canonical ids and groups', () => {
    const index = parseSongVariants({
      '2': { canonical: 1, kind: 'remix', note: 'remix' },
      '3': { canonical: 1, kind: 'cover' },
    })
    expect(index.canonicalSongId(2)).toBe(1)
    expect(index.canonicalSongId(9)).toBe(9)
    expect(index.groupSongIds(2)).toEqual([1, 2, 3])
    expect(index.variantSongIdsOf(1)).toEqual([2, 3])
    expect(index.size).toBe(2)
    expect(emptySongVariantIndex().groupSongIds(5)).toEqual([5])
  })
})

describe('variant folding in the ranking', () => {
  it('counts a shared setlist once across versions and keeps a second setlist separate', () => {
    const rows = catalog()
    rows.songs = [song(1, 'Original'), song(2, 'Remix')]
    rows.setlistItems = [item(10, 1, 1), item(10, 2, 2), item(11, 1, 1)]
    rows.setlistItemSongs = [link(10, 1, 1), link(10, 2, 2), link(11, 1, 1)]
    rows.performances = [performance(1, 10), performance(2, 11)]
    const variants = parseSongVariants({ '2': { canonical: 1, kind: 'remix' } })
    const ranking = rankSongAppearances(rows, { variants })
    expect(ranking).toHaveLength(1)
    expect(ranking[0]).toMatchObject({ songId: 1, count: 2, variantSongIds: [2] })
    const withoutVariants = rankSongAppearances(rows)
    expect(withoutVariants.map((row) => [row.songId, row.count])).toEqual([
      [1, 2],
      [2, 1],
    ])
  })
})
