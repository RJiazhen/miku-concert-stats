import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import { applyCatalogSql } from '../scripts/build-catalog.ts'
import { loadCatalog } from '../shared/catalog.ts'
import { localSongMatches } from '../shared/lookup.ts'
import { formatSongTitle, matchSongTitle, parseSongTitles, songTitleAliases, songTitleFor, songTitleSpellings } from '../shared/song-titles.ts'
import type { Catalog, SongRow, SqlRow } from '../shared/types.ts'

describe('Chinese song titles', () => {
  it('rejects a blank title, a missing source, and a non-numeric id', () => {
    expect(() => parseSongTitles({ '10': { title: '  ', source: 'vocadb-alias' } })).toThrow(/empty/)
    expect(() => parseSongTitles({ '10': { title: '融化', source: '' } })).toThrow(/source/)
    expect(() => parseSongTitles({ melt: { title: '融化', source: 'vocadb-alias' } })).toThrow(/not an id/)
    expect(songTitleFor(parseSongTitles({ '10': { title: '融化', source: 'vocadb-alias' } }), 10)?.title).toBe('融化')
    expect(songTitleFor(parseSongTitles({}), 10)).toBeNull()
    expect(formatSongTitle('zh', { jaTitle: 'メルト', translation: '融化' })).toEqual({ primary: '融化', originalNames: ['メルト'], aliases: [] })
    expect(formatSongTitle('zh-Hant', { jaTitle: 'メルト', translation: '融化' })).toEqual({ primary: '融化', originalNames: ['メルト'], aliases: [] })
    expect(formatSongTitle('ja', { jaTitle: 'メルト' })).toEqual({ primary: 'メルト', originalNames: [], aliases: [] })
    expect(formatSongTitle('zh', { jaTitle: '融化', translation: '融化' })).toEqual({ primary: '融化', originalNames: [], aliases: [] })
    expect(formatSongTitle('zh', { jaTitle: 'Tell Your World' })).toEqual({ primary: 'Tell Your World', originalNames: [], aliases: [] })
    // An alias that replaced the catalog name keeps the catalog spelling in gray, e.g. song 404329.
    expect(formatSongTitle('ja', { jaTitle: 'ナイフ、ナイフ、ナイフ', catalogName: '🔪、🔪、🔪' })).toEqual({
      primary: 'ナイフ、ナイフ、ナイフ',
      originalNames: ['🔪、🔪、🔪'],
      aliases: [],
    })
  })

  it('drops the Japanese original under a translation when the reader hides it', () => {
    const sources = { jaTitle: 'メルト', catalogName: 'メルト', translation: '融化' }
    expect(formatSongTitle('zh', sources, { showOriginalTitle: false })).toEqual({ primary: '融化', originalNames: [], aliases: [] })
    // Japanese is already the original, so the switch does not remove anything there.
    expect(formatSongTitle('ja', sources, { showOriginalTitle: false })).toEqual({ primary: 'メルト', originalNames: [], aliases: [] })
    // A matched Japanese spelling is still explained while the original line is hidden.
    expect(matchSongTitle('メルト', 'zh', sources, { showOriginalTitle: false }).secondary).toBe('メルト')
  })

  it('keeps alias lists valid and separate from the displayed title', () => {
    const titles = parseSongTitles({
      '20': { title: '世末舞厅', aliases: ['世界末日舞厅'], source: 'vocadb-alias' },
    })
    expect(songTitleFor(titles, 20)?.aliases).toEqual(['世界末日舞厅'])
    expect(songTitleAliases(titles, 20)).toEqual(['世界末日舞厅'])
    expect(songTitleAliases(titles, 21)).toEqual([])
    expect(songTitleSpellings(titles, 20)).toEqual(['世末舞厅', '世界末日舞厅'])
    expect(songTitleSpellings(titles, 21)).toEqual([])
    expect(songTitleFor(parseSongTitles({ '20': { title: '世末舞厅', source: 'vocadb-alias' } }), 20)?.aliases).toBeUndefined()
    expect(() => parseSongTitles({ '20': { title: '世末舞厅', aliases: '', source: 'vocadb-alias' } })).toThrow(/aliases is not a list/)
    expect(() => parseSongTitles({ '20': { title: '世末舞厅', aliases: [' '], source: 'vocadb-alias' } })).toThrow(/alias is empty/)
    expect(() => parseSongTitles({ '20': { title: '世末舞厅', aliases: ['世末舞厅'], source: 'vocadb-alias' } })).toThrow(/repeats the title/)
    expect(() => parseSongTitles({ '20': { title: '世末舞厅', aliases: ['世界末日舞厅', '世界末日舞厅'], source: 'vocadb-alias' } })).toThrow(/duplicated/)
  })

  it('lists the other names of the active language, deduplicated and without the primary', () => {
    const zh = formatSongTitle('zh', {
      jaTitle: 'メルト',
      translation: '融化',
      zhTitle: '融化',
      zhAliases: [' 融化 ', '', '溶化', '溶化'],
      originalAliases: ['Melt'],
      nameEn: 'Melt',
    })
    expect(zh).toEqual({ primary: '融化', originalNames: ['メルト'], aliases: ['溶化'] })
    // The Traditional title uses the Traditional aliases, never the Simplified ones.
    const hant = formatSongTitle('zh-Hant', {
      jaTitle: 'メルト',
      translation: '融化',
      zhTitle: '融化',
      zhAliases: ['溶化'],
      hantTitle: '融化',
      hantAliases: [' 融化 ', '融解'],
      originalAliases: ['Melt'],
      nameEn: 'Melt',
    })
    expect(hant).toEqual({ primary: '融化', originalNames: ['メルト'], aliases: ['融解'] })
    // Japanese shows the aliases and name_en, never the Chinese spellings.
    const japanese = formatSongTitle('ja', {
      jaTitle: 'メルト',
      zhTitle: '融化',
      zhAliases: ['溶化'],
      originalAliases: ['Melt', 'メルト'],
      nameEn: 'Melt',
    })
    expect(japanese).toEqual({ primary: 'メルト', originalNames: [], aliases: ['Melt'] })
  })

  it('shows the alias a search hit while keeping the primary title first', () => {
    const sources = {
      zhTitle: '世末舞厅',
      zhAliases: ['世界末日舞厅'],
      originalAliases: ['World End Dancehall'],
      nameEn: 'World End Dancehall',
    }
    const aliasHit = matchSongTitle('世界末日舞厅', 'zh', { jaTitle: 'ワールドエンド・ダンスホール', translation: '世末舞厅', ...sources })
    expect(aliasHit.primary).toBe('世末舞厅')
    expect(aliasHit.matchedAlias).toBe('世界末日舞厅')
    expect(aliasHit.secondary).toBe('世界末日舞厅')

    // A primary hit does not repeat itself: the secondary line keeps the Japanese name.
    const primaryHit = matchSongTitle('世末', 'zh', { jaTitle: 'ワールドエンド・ダンスホール', translation: '世末舞厅', ...sources })
    expect(primaryHit.matchedAlias).toBeNull()
    expect(primaryHit.secondary).toBe('ワールドエンド・ダンスホール')

    // A Chinese search hit is explained even while Japanese is active.
    const chineseInJapanese = matchSongTitle('世界末日舞厅', 'ja', { jaTitle: 'ワールドエンド・ダンスホール', ...sources })
    expect(chineseInJapanese.primary).toBe('ワールドエンド・ダンスホール')
    expect(chineseInJapanese.secondary).toBe('世界末日舞厅')

    // The Traditional title and its aliases match in either Chinese variant.
    const traditional = {
      jaTitle: 'ワールドエンド・ダンスホール',
      translation: '世末舞廳',
      zhTitle: '世末舞厅',
      zhAliases: ['世界末日舞厅'],
      hantTitle: '世末舞廳',
      hantAliases: ['世界末日舞廳'],
    }
    const hantHit = matchSongTitle('世界末日舞廳', 'zh-Hant', traditional)
    expect(hantHit.primary).toBe('世末舞廳')
    expect(hantHit.matchedAlias).toBe('世界末日舞廳')
    expect(matchSongTitle('世界末日舞廳', 'zh', traditional).matchedAlias).toBe('世界末日舞廳')
  })

  it('only keeps catalog songs with a non-empty title and a source', () => {
    const db = new Database(':memory:')
    try {
      applyCatalogSql(db)
      const catalog = loadCatalog({
        /** Reads the in-memory catalog built from committed SQL. */
        all: (sql: string) => db.prepare(sql).all() as SqlRow[],
      })
      const ids = new Set(catalog.songs.map((song) => song.id))
      for (const file of ['../data/song-titles.zh-CN.json', '../data/song-titles.zh-Hant.json']) {
        const raw = JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8')) as unknown
        for (const [id, entry] of Object.entries(parseSongTitles(raw))) {
          expect(ids.has(Number(id))).toBe(true)
          expect(entry.title.trim().length).toBeGreaterThan(0)
          expect(entry.source.trim().length).toBeGreaterThan(0)
        }
      }
    } finally {
      db.close()
    }
  })

  it('finds a song by its Chinese title and recorded alias in the header search', () => {
    const db = new Database(':memory:')
    try {
      applyCatalogSql(db)
      const catalog = loadCatalog({
        /** Reads the in-memory catalog built from committed SQL. */
        all: (sql: string) => db.prepare(sql).all() as SqlRow[],
      })
      const raw = JSON.parse(readFileSync(new URL('../data/song-titles.zh-CN.json', import.meta.url), 'utf8')) as unknown
      const titles = parseSongTitles(raw)
      /** Test-side stand-in for the composable: the Chinese spellings the header search passes in. */
      const spellings = (song: SongRow): string[] => songTitleSpellings(titles, song.id)
      /** Song ids the header search would list for one query. */
      const idsOf = (query: string): number[] => localSongMatches(catalog, query, spellings).items.map((song) => song.id)
      // Song 20 displays as 世末舞厅 and records 世界末日舞厅 as an alias.
      expect(idsOf('世末舞厅')).toContain(20)
      expect(idsOf('世界末日舞厅')).toContain(20)
      expect(idsOf('融化')).toContain(1322)
      // Without the Chinese spellings the same query matches nothing, which was the bug.
      expect(localSongMatches(catalog, '世末舞厅').items.map((song) => song.id)).not.toContain(20)
    } finally {
      db.close()
    }
  })

  it('ranks song hits by relevance and 演出 count, then caps without hiding the total', () => {
    /** Song row with only the fields the lookup reads. */
    const song = (id: number, name: string): SongRow => ({
      id,
      name,
      name_ja: null,
      name_en: null,
      artist_string: null,
      song_type: 'Original',
      category: 'vocaloid',
      publish_date: null,
      length_seconds: null,
      source_url: '',
      retrieved_at: '',
    })
    const catalog: Catalog = {
      sources: [],
      series: [{ id: 1, name: 'S', name_ja: null, description: null, source_url: '', retrieved_at: '' }],
      performances: [1, 2].map((id) => ({
        id,
        series_id: 1,
        name: `Show ${id}`,
        name_ja: null,
        venue_name: null,
        country_code: 'JP',
        start_date: `2020-01-0${id}`,
        end_date: null,
        showtime_local: null,
        timezone: null,
        time_precision: 'day',
        time_evidence: null,
        role: 'show',
        series_number: 2020,
        series_suffix: null,
        song_list_id: null,
        vocadb_status: null,
        source_url: '',
        retrieved_at: '',
      })),
      performanceLinks: [],
      premieres: [],
      songLists: [],
      songs: [
        song(1, 'melt'),
        song(2, 'melt glow'),
        song(3, 'melt wave'),
        ...Array.from({ length: 57 }, (_, index) => song(100 + index, `song about melt ${index}`)),
      ],
      setlistItems: [],
      setlistItemSongs: [],
      medleyQuarantine: [],
      videos: [],
      performanceSetlists: [],
      performanceSetlistSources: [],
      performanceShowSetlists: [],
      // Song 2 appears in both 演出, song 3 only in the first, so the same score is ordered by 演出数.
      performanceShowSetlistItems: [
        { performance_id: 1, show_key: '1:2020-01-01', position: 1, source_position: null, song_id: 2, medley_id: null, evidence: 'wiki', notes: null },
        { performance_id: 2, show_key: '2:2020-01-02', position: 1, source_position: null, song_id: 2, medley_id: null, evidence: 'wiki', notes: null },
        { performance_id: 1, show_key: '1:2020-01-01', position: 2, source_position: null, song_id: 3, medley_id: null, evidence: 'wiki', notes: null },
      ],
      medleys: [],
      medleySongs: [],
      performanceStatus: [],
    }

    const result = localSongMatches(catalog, 'melt')
    expect(result.total).toBe(60)
    expect(result.limit).toBe(50)
    expect(result.items).toHaveLength(50)
    // Exact title first, then the two prefixes ordered by 演出数, then substrings.
    expect(result.items.slice(0, 3).map((row) => row.id)).toEqual([1, 2, 3])
    expect(result.items.slice(3).every((row) => row.name.startsWith('song about melt'))).toBe(true)
    // A smaller cap changes only the returned slice; the real total stays 60.
    expect(localSongMatches(catalog, 'melt', () => [], 5)).toMatchObject({ total: 60, limit: 5 })
  })
})
