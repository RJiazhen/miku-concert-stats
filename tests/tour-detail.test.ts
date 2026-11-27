import { describe, expect, it } from 'vitest'
import {
  buildTourSetlistTabs,
  fingerprintPerformanceSetlist,
  groupTourSetlists,
} from '../shared/tour-setlists.ts'
import {
  parseTours,
  performanceIdFromTourHash,
  tourPath,
  tourPathForPerformance,
  tourPathForPerformanceId,
} from '../shared/tours.ts'
import { showPath } from '../shared/homepage.ts'
import toursFile from '../data/tours.json'
import type { Catalog, PerformanceShowSetlistItemRow } from '../shared/types.ts'

describe('tour paths', () => {
  const tours = parseTours(toursFile)

  it('builds tour and stop deep-links', () => {
    expect(tourPath('japan-tour-2023-thunderbolt')).toBe('/tours/japan-tour-2023-thunderbolt')
    expect(tourPathForPerformance('japan-tour-2023-thunderbolt', 4765)).toBe(
      '/tours/japan-tour-2023-thunderbolt#p-4765',
    )
  })

  it('resolves a known 演出 to its tour deep-link', () => {
    const path = tourPathForPerformanceId(tours, 4765)
    expect(path).toBe('/tours/japan-tour-2023-thunderbolt#p-4765')
    expect(showPath(4765)).toBe(path)
  })

  it('parses stop hashes', () => {
    expect(performanceIdFromTourHash('#p-4765')).toBe(4765)
    expect(performanceIdFromTourHash('p-4765')).toBe(4765)
    expect(performanceIdFromTourHash('#tour')).toBeNull()
  })
})

/** Minimal catalog fragment with derived setlist items. */
const catalogWithItems = (items: PerformanceShowSetlistItemRow[]): Catalog =>
  ({
    performanceShowSetlistItems: items,
  }) as Catalog

/** One derived setlist item row. */
const item = (
  performanceId: number,
  showKey: string,
  position: number,
  songId: number,
): PerformanceShowSetlistItemRow => ({
  performance_id: performanceId,
  show_key: showKey,
  position,
  source_position: position,
  song_id: songId,
  medley_id: null,
  evidence: 'wiki',
  notes: null,
})

describe('fingerprintPerformanceSetlist', () => {
  it('collapses identical 场次 sequences inside one 演出', () => {
    const catalog = catalogWithItems([
      item(1, '1:2023-01-01:day', 1, 10),
      item(1, '1:2023-01-01:day', 2, 20),
      item(1, '1:2023-01-01:night', 1, 10),
      item(1, '1:2023-01-01:night', 2, 20),
    ])
    expect(fingerprintPerformanceSetlist(catalog, 1)).toBe('song:10,song:20')
  })

  it('keeps differing 场次 sequences distinct', () => {
    const catalog = catalogWithItems([
      item(1, '1:a', 1, 10),
      item(1, '1:b', 1, 99),
    ])
    expect(fingerprintPerformanceSetlist(catalog, 1)).toBe('song:10||song:99')
  })
})

describe('groupTourSetlists / buildTourSetlistTabs', () => {
  const sharedCatalog = catalogWithItems([
    item(1, '1:a', 1, 10),
    item(1, '1:a', 2, 20),
    item(2, '2:a', 1, 10),
    item(2, '2:a', 2, 20),
    item(3, '3:a', 1, 30),
  ])

  it('combines stops that share a programme into one group', () => {
    const groups = groupTourSetlists(sharedCatalog, [
      { performanceId: 1, cityLabel: 'Nagoya', startDate: '2023-02-23', hasSetlist: true },
      { performanceId: 2, cityLabel: 'Osaka', startDate: '2023-03-04', hasSetlist: true },
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0]?.performanceIds).toEqual([1, 2])
    expect(groups[0]?.label).toBe('Nagoya / Osaka')
  })

  it('skips tabs when every setlist stop shares one programme', () => {
    const result = buildTourSetlistTabs(sharedCatalog, [
      { performanceId: 1, cityLabel: 'Nagoya', startDate: '2023-02-23', hasSetlist: true },
      { performanceId: 2, cityLabel: 'Osaka', startDate: '2023-03-04', hasSetlist: true },
    ])
    expect(result.useTabs).toBe(false)
    expect(result.tabs).toHaveLength(1)
  })

  it('uses one tab per distinct programme when setlists differ', () => {
    const result = buildTourSetlistTabs(sharedCatalog, [
      { performanceId: 1, cityLabel: 'Nagoya', startDate: '2023-02-23', hasSetlist: true },
      { performanceId: 2, cityLabel: 'Osaka', startDate: '2023-03-04', hasSetlist: true },
      { performanceId: 3, cityLabel: 'Tokyo', startDate: '2023-03-18', hasSetlist: true },
    ])
    expect(result.useTabs).toBe(true)
    expect(result.tabs).toHaveLength(2)
    expect(result.tabs.map((tab) => tab.label).sort()).toEqual(['Nagoya / Osaka', 'Tokyo'].sort())
  })

  it('disambiguates duplicate city names with a short date', () => {
    const catalog = catalogWithItems([item(1, '1:a', 1, 10), item(2, '2:a', 1, 20)])
    const result = buildTourSetlistTabs(catalog, [
      { performanceId: 1, cityLabel: 'Tokyo', startDate: '2023-03-18', hasSetlist: true },
      { performanceId: 2, cityLabel: 'Tokyo', startDate: '2023-03-19', hasSetlist: true },
    ])
    expect(result.tabs.map((tab) => tab.label).sort()).toEqual(['Tokyo 3/18', 'Tokyo 3/19'].sort())
  })
})
