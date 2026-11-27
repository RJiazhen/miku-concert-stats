import { describe, expect, it } from 'vitest'
import { buildTourSetlistTabs } from '../shared/tour-setlists.ts'
import {
  parseTours,
  performanceIdFromTourHash,
  tourPath,
  tourPathForPerformance,
  tourPathForPerformanceId,
} from '../shared/tours.ts'
import { showPath } from '../shared/homepage.ts'
import toursFile from '../data/tours.json'

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

describe('buildTourSetlistTabs', () => {
  it('skips tabs when only one setlist stop exists', () => {
    const result = buildTourSetlistTabs([
      { performanceId: 1, cityLabel: 'Tokyo', startDate: '2023-03-18', hasSetlist: true },
      { performanceId: 2, cityLabel: 'Osaka', startDate: '2023-03-04', hasSetlist: false },
    ])
    expect(result.useTabs).toBe(false)
    expect(result.tabs).toHaveLength(1)
    expect(result.tabs[0]?.label).toBe('Tokyo')
  })

  it('uses city labels as tab names for multiple setlists', () => {
    const result = buildTourSetlistTabs([
      { performanceId: 1, cityLabel: 'Nagoya', startDate: '2023-02-23', hasSetlist: true },
      { performanceId: 2, cityLabel: 'Osaka', startDate: '2023-03-04', hasSetlist: true },
    ])
    expect(result.useTabs).toBe(true)
    expect(result.tabs.map((tab) => tab.label)).toEqual(['Nagoya', 'Osaka'])
  })

  it('disambiguates duplicate city names with a short date', () => {
    const result = buildTourSetlistTabs([
      { performanceId: 1, cityLabel: 'Tokyo', startDate: '2023-03-18', hasSetlist: true },
      { performanceId: 2, cityLabel: 'Tokyo', startDate: '2023-03-19', hasSetlist: true },
    ])
    expect(result.tabs.map((tab) => tab.label)).toEqual(['Tokyo 3/18', 'Tokyo 3/19'])
  })
})
