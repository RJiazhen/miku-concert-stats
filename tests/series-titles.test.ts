import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import { applyCatalogSql } from '../scripts/build-catalog.ts'
import { loadCatalog } from '../shared/catalog.ts'
import {
  formatSeriesTitle,
  localizeSeriesInName,
  localizeSeriesName,
  parseSeriesTitles,
  seriesTitleFor,
} from '../shared/series-titles.ts'
import type { SqlRow } from '../shared/types.ts'

/** Checked series used by every case. */
const titles = parseSeriesTitles({
  '初音ミク「マジカルミライ」': '魔法未来',
  '初音ミクシンフォニー': '初音未来交响乐',
})

describe('Chinese series titles', () => {
  it('rejects a non-object, a blank name, a blank key, and case-insensitive duplicates', () => {
    expect(() => parseSeriesTitles([])).toThrow(/object/)
    expect(() => parseSeriesTitles(null)).toThrow(/object/)
    expect(() => parseSeriesTitles({ '': '魔法未来' })).toThrow(/key/)
    expect(() => parseSeriesTitles({ '初音ミクシンフォニー': '  ' })).toThrow(/empty/)
    expect(() => parseSeriesTitles({ 'MIKU EXPO': '未来世博会', 'miku expo': '未来世博会' })).toThrow(/twice/)
  })

  it('looks up a checked name and misses a series without a row', () => {
    expect(seriesTitleFor(titles, '初音ミクシンフォニー')).toBe('初音未来交响乐')
    expect(seriesTitleFor(titles, 'MIKU EXPO')).toBeNull()
    expect(seriesTitleFor(titles, '未知のシリーズ')).toBeNull()
  })

  it('follows the language and falls back to the catalog name', () => {
    expect(localizeSeriesName(titles, '初音ミクシンフォニー', 'zh')).toBe('初音未来交响乐')
    expect(localizeSeriesName(titles, '初音ミクシンフォニー', 'original')).toBe('初音ミクシンフォニー')
    expect(localizeSeriesName(titles, 'MIKU EXPO', 'zh')).toBe('MIKU EXPO')
    expect(formatSeriesTitle('初音ミクシンフォニー', '初音未来交响乐', 'zh')).toEqual({
      primary: '初音未来交响乐',
      originalNote: '初音ミクシンフォニー',
    })
    expect(formatSeriesTitle('初音ミクシンフォニー', '初音未来交响乐', 'original')).toEqual({
      primary: '初音ミクシンフォニー',
      originalNote: null,
    })
    expect(formatSeriesTitle('初音未来交响乐', '初音未来交响乐', 'zh')).toEqual({
      primary: '初音未来交响乐',
      originalNote: null,
    })
  })

  it('keeps the edition year when it localizes a performance name', () => {
    expect(localizeSeriesInName('初音ミク「マジカルミライ 2024」in TOKYO', '初音ミク「マジカルミライ」', 2024, titles, 'zh')).toBe(
      '魔法未来 2024 in TOKYO',
    )
    expect(localizeSeriesInName('初音ミク「マジカルミライ」10th Anniversary in OSAKA', '初音ミク「マジカルミライ」', 2020, titles, 'zh')).toBe(
      '魔法未来 10th Anniversary in OSAKA',
    )
    expect(localizeSeriesInName('初音ミクシンフォニー 2016 東京都', '初音ミクシンフォニー', 2016, titles, 'zh')).toBe(
      '初音未来交响乐 2016 東京都',
    )
    expect(localizeSeriesInName('MIKU EXPO 2024 Vancouver', 'MIKU EXPO', 2024, titles, 'zh')).toBe('MIKU EXPO 2024 Vancouver')
    expect(localizeSeriesInName('初音ミクシンフォニー 2016 東京都', '初音ミクシンフォニー', 2016, titles, 'original')).toBe(
      '初音ミクシンフォニー 2016 東京都',
    )
  })

  it('names every Japanese catalog series and only uses existing catalog names', () => {
    const raw = JSON.parse(readFileSync(new URL('../data/series-titles.zh-CN.json', import.meta.url), 'utf8')) as unknown
    const file = parseSeriesTitles(raw)
    const db = new Database(':memory:')
    try {
      applyCatalogSql(db)
      const catalog = loadCatalog({
        /** Reads the in-memory catalog built from committed SQL. */
        all: (sql: string) => db.prepare(sql).all() as SqlRow[],
      })
      const names = new Set(catalog.series.map((series) => series.name))
      for (const [key, name] of Object.entries(file)) {
        expect(names.has(key)).toBe(true)
        expect(name.trim().length).toBeGreaterThan(0)
      }
      for (const series of catalog.series) {
        if (!/[\u3040-\u30ff]/.test(series.name)) continue
        expect(file[series.name]).toBeDefined()
      }
    } finally {
      db.close()
    }
  })
})
