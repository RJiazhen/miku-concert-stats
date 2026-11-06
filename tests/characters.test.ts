import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import { applyCatalogSql } from '../scripts/build-catalog.ts'
import { assignCharacters, parseCharacterConfig, vocalistNames } from '../shared/characters.ts'
import { loadCatalog } from '../shared/catalog.ts'
import type { SqlRow } from '../shared/types.ts'

const rules = parseCharacterConfig(JSON.parse(readFileSync(new URL('../data/characters.json', import.meta.url), 'utf8')) as unknown)

describe('character names', () => {
  it('merges voicebank variants and ignores producers before feat.', () => {
    expect(assignCharacters(rules, {
      artistString: 'sasakure.UK feat. 初音ミク Append (Unknown), 初音ミク V4X (Original), 初音ミク V4X (Dark)',
    }).characters).toEqual(['初音ミク'])
    expect(assignCharacters(rules, {
      artistString: 'DECO*27 feat. 鏡音リン V4X (Power), 鏡音レン Append (Power), MEIKO V3 (Power), KAITO V3 (Straight)',
    }).characters).toEqual(['鏡音リン', '鏡音レン', 'MEIKO', 'KAITO'])
    expect(assignCharacters(rules, { artistString: 'wowaka feat. 巡音ルカ V4X English (Straight)' }).characters).toEqual(['巡音ルカ'])
    expect(assignCharacters(rules, { artistString: 'producer feat. Hatsune Miku' }).characters).toEqual(['初音ミク'])
    expect(assignCharacters(rules, { artistString: 'Various artists' })).toEqual({ characters: [], unmatched: [] })
    expect(assignCharacters(rules, { artistString: 'halyosy feat. various' }).unmatched).toEqual(['various'])
  })

  it('prefers structured Vocalist credits over the artist string', () => {
    const artists = [
      { name: 'ryo', categories: 'Producer', roles: 'Default' },
      { name: '初音ミク V4X (Dark)', categories: 'Vocalist', artist: { name: '初音ミク' } },
    ]
    expect(vocalistNames(artists)).toEqual(['初音ミク V4X (Dark)'])
    expect(vocalistNames([{ name: 'ryo', categories: 'Producer' }])).toBeNull()
    expect(assignCharacters(rules, {
      artistString: 'ryo feat. KAITO',
      artists,
    }).characters).toEqual(['初音ミク'])
    expect(assignCharacters(rules, {
      artistString: 'ryo feat. KAITO',
      artists: [{ name: 'ryo', categories: 'Producer' }],
    }).characters).toEqual(['KAITO'])
  })

  it('prefers collected vocalists over both credit sources', () => {
    expect(assignCharacters(rules, {
      vocalists: ['KAITO', 'MEIKO', '初音ミク', '巡音ルカ', '鏡音リン', '鏡音レン'],
      artistString: 'kz, Unknown producer(s) feat. various',
    }).characters).toEqual(['初音ミク', '鏡音リン', '鏡音レン', '巡音ルカ', 'MEIKO', 'KAITO'])
    expect(assignCharacters(rules, {
      vocalists: [],
      artistString: 'halyosy feat. various',
    }).unmatched).toEqual(['various'])
  })

  it('rejects a config entry that cannot match anything', () => {
    expect(() => parseCharacterConfig({ 初音ミク: {} })).toThrow(/no patterns/)
    expect(() => parseCharacterConfig({ 初音ミク: { patterns: ['['] } })).toThrow(/pattern failed/)
  })

  it('lists catalog vocalists that are not a known character', () => {
    const db = new Database(':memory:')
    try {
      applyCatalogSql(db)
      const catalog = loadCatalog({
        /** Reads the in-memory catalog built from committed SQL. */
        all: (sql: string) => db.prepare(sql).all() as SqlRow[],
      })
      const unmatched = new Set<string>()
      for (const song of catalog.songs) {
        for (const name of assignCharacters(rules, { artistString: song.artist_string }).unmatched) unmatched.add(name)
      }
      // しぐれうい is a human guest vocalist on DECO*27's チェリーポップ, not a synth character.
      expect([...unmatched].sort()).toEqual(['Mes', 'various', 'しぐれうい'])
      const dark = catalog.songs.find((song) => song.artist_string?.includes('初音ミク Append (Dark)'))
      expect(assignCharacters(rules, { artistString: dark?.artist_string }).characters).toContain('初音ミク')
    } finally {
      db.close()
    }
  })
})
