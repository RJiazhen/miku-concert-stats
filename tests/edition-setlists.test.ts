import { describe, expect, it, beforeAll } from 'vitest'
import Database from 'better-sqlite3'
import { applyCatalogSql } from '../scripts/build-catalog.ts'
import { loadCatalog } from '../shared/catalog.ts'
import { reviewRotations } from '../shared/rotation.ts'
import {
  buildSetlistDisplay,
  displaySides,
  emptySetlistMergeIndex,
  parseSetlistMerges,
  partitionSongLists,
  performanceCellOf,
  type SetlistDisplay,
} from '../shared/edition-setlists.ts'
import { shortPerformanceName } from '../shared/performance-name.ts'
import mergesRaw from '../data/setlist-merges.json'
import type { Catalog, SqlRow } from '../shared/types.ts'

let catalog: Catalog
let review: ReturnType<typeof reviewRotations>
const merges = parseSetlistMerges(mergesRaw)

beforeAll(() => {
  const db = new Database(':memory:')
  applyCatalogSql(db)
  catalog = loadCatalog({
    /** Reads the in-memory catalog built from committed SQL. */
    all: (sql: string) => db.prepare(sql).all() as SqlRow[],
  })
  review = reviewRotations(catalog)
  db.close()
})

/** Name of the first song on a displayed row. */
const rowName = (row: SetlistDisplay['rows'][number]): string => {
  const songId = row.items[0]?.songIds[0]
  return catalog.songs.find((song) => song.id === songId)?.name ?? String(songId)
}

/** Display rows whose first song has this name. */
const named = (display: SetlistDisplay, name: string) => display.rows.filter((row) => rowName(row) === name)

describe('region merge file', () => {
  it('rejects malformed entries', () => {
    expect(() => parseSetlistMerges({ abc: { group: 'x' } })).toThrow()
    expect(() => parseSetlistMerges({ '1': { group: '' } })).toThrow()
    expect(() => parseSetlistMerges({ '1': { group: 'x', note: 5 } })).toThrow()
  })

  it('partitions a series year into merged groups and standalone lists', () => {
    expect(emptySetlistMergeIndex().groupOf(1)).toBeNull()
    expect(partitionSongLists([17933, 8102, 8101], merges)).toEqual([[8101, 8102], [17933]])
  })
})

describe('merged setlist display', () => {
  it('keeps a single setlist unchanged in count but folds day-specific rows', () => {
    const display = buildSetlistDisplay(catalog, review, [17933])
    expect(display.baseListId).toBe(17933)
    expect(display.rows).toHaveLength(32)
    expect(display.slotCount).toBe(24)
    const citySlot = display.rows.filter((row) => row.index === 15)
    expect(citySlot.map(rowName)).toEqual(['アンハッピーリフレイン', 'すろぉもぉしょん', 'サイハテ'])
    expect(citySlot.map((row) => row.showLabel)).toEqual(['福冈', '东京', '大阪'])
    expect(citySlot.every((row) => row.slotSize === 3)).toBe(true)
  })

  it('numbers days on one multi-day record', () => {
    const display = buildSetlistDisplay(catalog, review, [13440])
    expect(display.rows).toHaveLength(39)
    expect(display.slotCount).toBe(24)
    const firstSlot = display.rows.filter((row) => row.index === 3)
    expect(firstSlot.map(rowName)).toEqual(['ローリンガール', 'ゴーストルール', '初音ミクの消失'])
    expect(firstSlot.map((row) => row.showLabel)).toEqual(['第 1 天', '第 2 天', '第 3 天'])
  })

  it('merges Tokyo and Osaka into one order and pairs the regional replacements', () => {
    const display = buildSetlistDisplay(catalog, review, [8101, 8102])
    expect(display.baseListId).toBe(8101)
    expect(display.rows).toHaveLength(37)
    expect(display.slotCount).toBe(33)
    expect(display.mergedRowCount).toBe(4)

    const regional = display.rows.filter((row) => row.index === 12)
    expect(regional.map(rowName)).toEqual(['Satisfaction', 'Catch the Wave'])
    expect(regional.map((row) => row.showLabel)).toEqual(['第 1 天', '第 1 天、第 3 天'])

    const encore = display.rows.filter((row) => row.index === 31)
    expect(encore.map(rowName)).toEqual(['アンノウン・マザーグース', 'ワールズエンド・ダンスホール', 'ローリンガール'])
    expect(encore.map((row) => row.showLabel)).toEqual(['第 1 天', '第 2 天', '第 3 天'])

    // Songs played in both cities keep one row and carry no show note.
    const romio = named(display, 'ロミオとシンデレラ')
    expect(romio).toHaveLength(1)
    expect(romio[0]?.items.map((item) => item.songListId)).toEqual([8101, 8102])
    expect(romio[0]?.showLabel).toBeNull()
  })

  it('splits a merged group when a list length disagrees with its own shows', () => {
    expect(displaySides([8101, 8102], merges, review)).toEqual([[8101, 8102]])
    // 16544 is flagged by the rotation length check, so it shows on its own; 18446 and 18583 are consistent.
    expect(displaySides([16544, 18446, 18583], merges, review)).toEqual([[16544], [18446, 18583]])
  })

  it('leaves an unmerged series year in two separate displays', () => {
    const sides = partitionSongLists([12354, 13440], merges)
    expect(sides).toEqual([[12354], [13440]])
    expect(buildSetlistDisplay(catalog, review, sides[0] ?? []).rows).toHaveLength(22)
    expect(buildSetlistDisplay(catalog, review, sides[1] ?? []).rows).toHaveLength(39)
  })
})

describe('show cell on a show page', () => {
  /** Keeps only the part after the series label, standing in for the localized shortening. */
  const shortTail = (name: string): string => name.split(' 2012 ').at(1) ?? name

  /** Inputs for a synthetic row, overridable per case. */
  const cell = (overrides: Partial<Parameters<typeof performanceCellOf>[0]> = {}) =>
    performanceCellOf({
      selectorLabel: null,
      performanceIds: [1],
      names: ['Series 2012 Hong Kong'],
      allPerformanceIds: [1],
      currentPerformanceId: null,
      currentCity: null,
      shortName: shortTail,
      ...overrides,
    })

  it('keeps the full names on the raw and comparison views', () => {
    expect(cell({ performanceIds: [1, 2], names: ['Series 2012 Hong Kong', 'Series 2012 Taiwan'], allPerformanceIds: [1, 2] })).toEqual({
      text: 'Series 2012 Hong Kong、Series 2012 Taiwan',
      title: ['Series 2012 Hong Kong', 'Series 2012 Taiwan'],
    })
    expect(cell({ selectorLabel: '大阪 第 2 天' }).text).toBe('大阪 第 2 天')
  })

  it('blanks a row that only covers the current performance', () => {
    const result = cell({ currentPerformanceId: 1 })
    expect(result.text).toBe('')
    expect(result.title).toEqual(['Series 2012 Hong Kong'])
  })

  it('blanks a row every performance of the setlist plays', () => {
    const result = cell({
      performanceIds: [1, 2],
      names: ['Series 2012 Hong Kong', 'Series 2012 Taiwan'],
      allPerformanceIds: [1, 2],
      currentPerformanceId: 1,
    })
    expect(result.text).toBe('')
  })

  it('names the other performance of a shared setlist by its city only', () => {
    const result = cell({
      performanceIds: [2],
      names: ['Series 2012 Taiwan'],
      allPerformanceIds: [1, 2],
      currentPerformanceId: 1,
    })
    expect(result.text).toBe('Taiwan')
    expect(result.title).toEqual(['Series 2012 Taiwan'])
  })

  it('keeps both cities when the row is shared with another performance', () => {
    const result = cell({
      performanceIds: [1, 2],
      names: ['Series 2012 Hong Kong', 'Series 2012 Taiwan'],
      allPerformanceIds: [1, 2, 3],
      currentPerformanceId: 1,
    })
    expect(result.text).toBe('Hong Kong、Taiwan')
  })

  it('drops a city-only note that names the current show city', () => {
    expect(cell({ selectorLabel: '香港', currentPerformanceId: 1, currentCity: '香港' }).text).toBe('')
    expect(cell({ selectorLabel: '大阪 第 2 天', currentPerformanceId: 1, currentCity: '香港' }).text).toBe('大阪 第 2 天')
  })

  it('shortens the real 2012 Hong Kong and Taiwan rows', () => {
    const display = buildSetlistDisplay(catalog, review, [31])
    const taiwanOnly = display.rows.find((row) => row.items.some((item) => item.position === 25))
    expect(taiwanOnly?.showLabel).toBe('初音ミクライブパーティー 2012 Taiwan')

    const shorten = (name: string): string => shortPerformanceName(name, '初音ミクライブパーティー', 2012)
    const input = {
      selectorLabel: taiwanOnly?.selectorLabel ?? null,
      performanceIds: taiwanOnly?.performanceIds ?? [],
      names: taiwanOnly?.showDetail ?? [],
      allPerformanceIds: display.allPerformanceIds,
      currentCity: null,
      shortName: shorten,
    }
    expect(performanceCellOf({ ...input, currentPerformanceId: 2524 }).text).toBe('Taiwan')
    expect(performanceCellOf({ ...input, currentPerformanceId: 2525 }).text).toBe('')
  })
})
