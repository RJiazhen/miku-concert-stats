import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseSongVariants, emptySongVariantIndex, variantVersionNote } from '../shared/song-variants.ts'
import { translator } from '../shared/i18n/node-translate.ts'
import { rankSongAppearances } from '../shared/stats.ts'
import type { Catalog, PerformanceRow, SetlistItemRow, SetlistItemSongRow, SongRow } from '../shared/types.ts'

/** Committed variant list, read without importing JSON into the bundle. */
const committed = (): unknown =>
  JSON.parse(readFileSync(new URL('../data/song-variants.json', import.meta.url), 'utf8')) as unknown

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
  performanceSetlists: [],
  performanceSetlistSources: [],
  performanceShowSetlists: [],
  performanceShowSetlistItems: [],
  medleys: [],
  medleySongs: [],
  performanceStatus: [],
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
  category: 'vocaloid',
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
    expect(index.entries.get(2)?.kind).toBe('remix')
    expect(emptySongVariantIndex().groupSongIds(5)).toEqual([5])
  })

  it('keeps no entry for the dropped 初音ミクの消失 long version', () => {
    // 2925 (-DEAD END-) was removed by data/increments/0011-manual-corrections: every recorded performance plays the
    // Short version, so a variant entry would re-introduce an off-stage song.
    const index = parseSongVariants(committed())
    expect(index.entries.has(2925)).toBe(false)
    expect(index.canonicalSongId(295872)).toBe(295872)
  })

  it('keeps no entry for the dropped ハジメテノオト short version', () => {
    // 389595 was removed from the catalog by data/increments/0011-manual-corrections because no 演出 played it,
    // so a leftover mapping would point at a song that does not exist.
    expect(parseSongVariants(committed()).entries.has(389595)).toBe(false)
  })
})

const t = translator('zh')

describe('version notes', () => {
  it('never repeats the full song name and keeps only the distinguishing part', () => {
    expect(variantVersionNote('Fire◎Flower', 'Fire◎Flower 2011', 'remaster', undefined, t)).toBe('重制 · 2011')
    expect(variantVersionNote('初音ミクの激唱', '初音ミクの激唱（LONG VERSION）', 'remix', undefined, t)).toBe('混音 · LONG VERSION')
    expect(variantVersionNote('Sharing The World', 'Sharing The World [ SPANISH VER ]', 'language', undefined, t)).toBe('语言 · SPANISH VER')
    expect(variantVersionNote('Last Night, Good Night', 'Last Night, Good Night (Re:Dialed)', 'remaster', undefined, t)).toBe('重制 · Re:Dialed')
  })

  it('falls back to the kind when the titles do not differ', () => {
    expect(variantVersionNote('右肩の蝶', '右肩の蝶', 'voicebank', undefined, t)).toBe('声库')
    expect(variantVersionNote('Just Be Friends', 'Just be Friends', 'cover', undefined, t)).toBe('翻唱')
    expect(variantVersionNote('歌に形はないけれど', '虽然歌声无形', 'cover', undefined, t)).toBe('翻唱')
  })

  it('names the performing characters of a cover', () => {
    expect(variantVersionNote('Just Be Friends', 'Just be Friends', 'cover', ['巡音ルカ'], t)).toBe('翻唱（巡音ルカ）')
    expect(variantVersionNote('ロキ', 'ロキ', 'cover', ['鏡音リン', '鏡音レン'], t)).toBe('翻唱（鏡音リン、鏡音レン）')
  })

  it('keeps the title fragment before the cover performers', () => {
    expect(variantVersionNote('星のカケラ', '星のカケラ（piano ver.）', 'cover', ['初音ミク'], t)).toBe('翻唱 · piano ver.（初音ミク）')
  })

  it('omits the parentheses when a cover has no characters', () => {
    expect(variantVersionNote('Hand in Hand', 'Hand in Hand', 'cover', [], t)).toBe('翻唱')
    expect(variantVersionNote('Hand in Hand', 'Hand in Hand', 'cover', ['', '  '], t)).toBe('翻唱')
  })

  it('leaves non-cover kinds unchanged by performers', () => {
    expect(variantVersionNote('初音ミクの激唱', '初音ミクの激唱（LONG VERSION）', 'remix', ['初音ミク'], t)).toBe('混音 · LONG VERSION')
    expect(variantVersionNote('Fire◎Flower', 'Fire◎Flower 2011', 'remaster', ['初音ミク'], t)).toBe('重制 · 2011')
    expect(variantVersionNote('右肩の蝶', '右肩の蝶', 'voicebank', ['鏡音リン'], t)).toBe('声库')
  })
})

describe('variant folding in the ranking', () => {
  it('folds versions within one 演出 and keeps a second series year separate', () => {
    const rows = catalog()
    rows.songs = [song(1, 'Original'), song(2, 'Remix')]
    rows.setlistItems = [item(10, 1, 1), item(10, 2, 2), item(11, 1, 1)]
    rows.setlistItemSongs = [link(10, 1, 1), link(10, 2, 2), link(11, 1, 1)]
    rows.performances = [performance(1, 10), { ...performance(2, 11), series_number: 2017 }]
    const variants = parseSongVariants({ '2': { canonical: 1, kind: 'remix' } })
    const ranking = rankSongAppearances(rows, { variants, mode: 'event' })
    expect(ranking).toHaveLength(1)
    expect(ranking[0]).toMatchObject({ songId: 1, count: 2, variantSongIds: [2] })
    const withoutVariants = rankSongAppearances(rows, { mode: 'event' })
    expect(withoutVariants.map((row) => [row.songId, row.count])).toEqual([
      [1, 2],
      [2, 1],
    ])
  })
})
