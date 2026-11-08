import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import { applyCatalogSql } from '../scripts/build-catalog.ts'
import { loadCatalog } from '../shared/catalog.ts'
import { localSongMatches } from '../shared/lookup.ts'
import { formatSongTitle, matchSongTitle, parseSongTitles, songTitleAliases, songTitleFor, songTitleSpellings } from '../shared/song-titles.ts'
import type { SongRow, SqlRow } from '../shared/types.ts'

describe('Chinese song titles', () => {
  it('rejects a blank title, a missing source, and a non-numeric id', () => {
    expect(() => parseSongTitles({ '10': { title: '  ', source: 'vocadb-alias' } })).toThrow(/empty/)
    expect(() => parseSongTitles({ '10': { title: '融化', source: '' } })).toThrow(/source/)
    expect(() => parseSongTitles({ melt: { title: '融化', source: 'vocadb-alias' } })).toThrow(/not an id/)
    expect(songTitleFor(parseSongTitles({ '10': { title: '融化', source: 'vocadb-alias' } }), 10)?.title).toBe('融化')
    expect(songTitleFor(parseSongTitles({}), 10)).toBeNull()
    expect(formatSongTitle('メルト', '融化', 'zh')).toEqual({ primary: '融化', originalNote: 'メルト', aliases: [] })
    expect(formatSongTitle('メルト', '融化', 'original')).toEqual({ primary: 'メルト', originalNote: null, aliases: [] })
    expect(formatSongTitle('融化', '融化', 'zh')).toEqual({ primary: '融化', originalNote: null, aliases: [] })
    expect(formatSongTitle('Tell Your World', null, 'zh')).toEqual({ primary: 'Tell Your World', originalNote: null, aliases: [] })
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
    const zh = formatSongTitle('メルト', '融化', 'zh', {
      zhTitle: '融化',
      zhAliases: [' 融化 ', '', '溶化', '溶化'],
      originalAliases: ['Melt'],
      nameEn: 'Melt',
    })
    expect(zh).toEqual({ primary: '融化', originalNote: 'メルト', aliases: ['溶化'] })
    // The original mode shows the Japanese aliases and name_en, never the Chinese spellings.
    const original = formatSongTitle('メルト', null, 'original', {
      zhTitle: '融化',
      zhAliases: ['溶化'],
      originalAliases: ['Melt', 'メルト'],
      nameEn: 'Melt',
    })
    expect(original).toEqual({ primary: 'メルト', originalNote: null, aliases: ['Melt'] })
  })

  it('shows the alias a search hit while keeping the primary title first', () => {
    const sources = {
      zhTitle: '世末舞厅',
      zhAliases: ['世界末日舞厅'],
      originalAliases: ['World End Dancehall'],
      nameEn: 'World End Dancehall',
    }
    const aliasHit = matchSongTitle('世界末日舞厅', 'ワールドエンド・ダンスホール', '世末舞厅', 'zh', sources)
    expect(aliasHit.primary).toBe('世末舞厅')
    expect(aliasHit.matchedAlias).toBe('世界末日舞厅')
    expect(aliasHit.secondary).toBe('世界末日舞厅')

    // A primary hit does not repeat itself: the secondary line keeps the original note.
    const primaryHit = matchSongTitle('世末', 'ワールドエンド・ダンスホール', '世末舞厅', 'zh', sources)
    expect(primaryHit.matchedAlias).toBeNull()
    expect(primaryHit.secondary).toBe('ワールドエンド・ダンスホール')

    // A Chinese search hit is explained even while the original title is active.
    const chineseInOriginal = matchSongTitle('世界末日舞厅', 'ワールドエンド・ダンスホール', null, 'original', sources)
    expect(chineseInOriginal.primary).toBe('ワールドエンド・ダンスホール')
    expect(chineseInOriginal.secondary).toBe('世界末日舞厅')
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
      const idsOf = (query: string): number[] => localSongMatches(catalog, query, spellings).map((song) => song.id)
      // Song 20 displays as 世末舞厅 and records 世界末日舞厅 as an alias.
      expect(idsOf('世末舞厅')).toContain(20)
      expect(idsOf('世界末日舞厅')).toContain(20)
      expect(idsOf('融化')).toContain(1322)
      // Without the Chinese spellings the same query matches nothing, which was the bug.
      expect(localSongMatches(catalog, '世末舞厅').map((song) => song.id)).not.toContain(20)
    } finally {
      db.close()
    }
  })
})
