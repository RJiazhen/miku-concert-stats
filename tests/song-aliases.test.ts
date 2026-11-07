import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import { applyCatalogSql } from '../scripts/build-catalog.ts'
import { loadCatalog } from '../shared/catalog.ts'
import {
  japaneseAliasTitle,
  japaneseTitleOf,
  parseSongAliases,
  songAliasTitles,
} from '../shared/song-aliases.ts'
import type { SqlRow } from '../shared/types.ts'

/** Minimal song row for the title fallback chain. */
const song = (id: number, name: string, nameJa: string | null) => ({ id, name, name_ja: nameJa })

describe('Song aliases', () => {
  it('rejects a bad key, a blank title, a missing source, and a malformed alias list', () => {
    const entry = { title: 'ナイフ、ナイフ、ナイフ', source: 'https://vocadb.net/S/404329' }
    expect(parseSongAliases({ '404329': entry })['404329']).toEqual(entry)
    expect(() => parseSongAliases({ melt: entry })).toThrow(/not an id/)
    expect(() => parseSongAliases({ '404329': { ...entry, title: ' ' } })).toThrow(/title is empty/)
    expect(() => parseSongAliases({ '404329': { ...entry, source: '' } })).toThrow(/source is missing/)
    expect(() => parseSongAliases({ '404329': { ...entry, aliases: '' } })).toThrow(/aliases is not a list/)
    expect(() => parseSongAliases({ '404329': { ...entry, aliases: [' '] } })).toThrow(/alias is empty/)
    expect(() => parseSongAliases({ '404329': { ...entry, aliases: [entry.title] } })).toThrow(/repeats the title/)
    expect(() => parseSongAliases({ '404329': { ...entry, aliases: ['Knife', 'Knife'] } })).toThrow(/duplicated/)
  })

  it('keeps one display title and any number of search-only spellings', () => {
    const file = parseSongAliases({
      '404329': {
        title: 'ナイフ、ナイフ、ナイフ',
        aliases: ['Knife, Knife, Knife', 'ナイフナイフナイフ'],
        source: 'https://vocadb.net/S/404329',
      },
      '10': { title: 'メルト', source: 'https://vocadb.net/S/10' },
    })
    expect(japaneseAliasTitle(file, 404329)).toBe('ナイフ、ナイフ、ナイフ')
    expect(japaneseTitleOf(file, song(404329, '🔪、🔪、🔪', '🔪、🔪、🔪'))).toBe('ナイフ、ナイフ、ナイフ')
    expect(songAliasTitles(file, 404329)).toEqual([
      'ナイフ、ナイフ、ナイフ',
      'Knife, Knife, Knife',
      'ナイフナイフナイフ',
    ])
    expect(songAliasTitles(file, 10)).toEqual(['メルト'])
    expect(songAliasTitles(file, 11)).toEqual([])
  })

  it('shows name_ja, then name, when a song has no entry', () => {
    const file = parseSongAliases({ '404329': { title: 'ナイフ、ナイフ、ナイフ', source: 'https://vocadb.net/S/404329' } })
    expect(japaneseAliasTitle(file, 10)).toBeNull()
    expect(japaneseTitleOf(file, song(10, 'Nyanyanyanyanyanyanya!', 'にゃにゃにゃにゃにゃにゃにゃ!'))).toBe('にゃにゃにゃにゃにゃにゃにゃ!')
    expect(japaneseTitleOf(file, song(11, 'メルト', null))).toBe('メルト')
  })

  it('only names songs the committed catalog has', () => {
    const db = new Database(':memory:')
    try {
      applyCatalogSql(db)
      const catalog = loadCatalog({
        /** Reads the in-memory catalog built from committed SQL. */
        all: (sql: string) => db.prepare(sql).all() as SqlRow[],
      })
      const ids = new Set(catalog.songs.map((entry) => entry.id))
      const raw = JSON.parse(readFileSync(new URL('../data/song-aliases.json', import.meta.url), 'utf8')) as unknown
      for (const id of Object.keys(parseSongAliases(raw))) {
        expect(ids.has(Number(id))).toBe(true)
      }
    } finally {
      db.close()
    }
  })
})
