import { describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import { applyCatalogSql } from '../scripts/build-catalog.ts'
import { loadCatalog } from '../shared/catalog.ts'
import { showCountsByPerformance } from '../shared/performance-setlists.ts'
import { reviewRotations } from '../shared/rotation.ts'
import type { Catalog, SqlRow } from '../shared/types.ts'

const loadBuiltCatalog = (): { catalog: Catalog; close: () => void } => {
  const db = new Database(':memory:')
  applyCatalogSql(db)
  const catalog = loadCatalog({
    /** Reads the in-memory catalog built from committed SQL increments. */
    all: (sql: string) => db.prepare(sql).all() as SqlRow[],
  })
  return { catalog, close: () => db.close() }
}

const songIdsForShow = (catalog: Catalog, showKey: string): number[] => {
  return catalog.performanceShowSetlistItems
    .filter((row) => row.show_key === showKey)
    .sort((left, right) => left.position - right.position)
    .map((row) => row.song_id)
    .filter((id): id is number => id !== null)
}

const sourceUrls = (catalog: Catalog, performanceId: number): string[] => {
  return catalog.performanceSetlistSources
    .filter((row) => row.performance_id === performanceId)
    .map((row) => row.url)
}

const expectedKeys: Record<number, string[]> = {
  1924: ['1924:2016-06-04:day', '1924:2016-06-04:night', '1924:2016-06-05:day'],
  2947: ['2947:2017-03-04:night', '2947:2017-03-05:day', '2947:2017-03-05:night'],
  2517: ['2517:2014-08-30:day', '2517:2014-08-30:night'],
  2518: ['2518:2014-09-20:day', '2518:2014-09-20:night'],
  4056: ['4056:2012-03-08:day', '4056:2012-03-08:night'],
  2524: ['2524:2012-10-02:day', '2524:2012-10-02:night'],
  2525: ['2525:2012-10-06:day', '2525:2012-10-06:night'],
}

const programmeLengths: Record<number, number> = {
  1924: 27,
  2947: 22,
  2517: 25,
  2518: 25,
  4056: 33,
  2524: 25,
  2525: 25,
}

describe('Official schedule corrections and WOWOW 2014 metadata (issue #66)', () => {
  it('emits the official show keys and keeps each existing programme identical across those shows', () => {
    const { catalog, close } = loadBuiltCatalog()
    try {
      expect(catalog.performanceShowSetlists.some((row) => row.show_key === '1924:2016-06-05:night')).toBe(false)

      for (const [performanceId, keys] of Object.entries(expectedKeys)) {
        const id = Number(performanceId)
        const rows = catalog.performanceShowSetlists
          .filter((row) => row.performance_id === id)
          .map((row) => row.show_key)
          .sort()
        expect(rows).toEqual([...keys].sort())

        const programmes = keys.map((key) => songIdsForShow(catalog, key))
        expect(programmes[0]?.length).toBe(programmeLengths[id])
        for (const programme of programmes) expect(programme).toEqual(programmes[0])
        expect(new Set(rows).size).toBe(keys.length)
      }
    } finally {
      close()
    }
  })

  it('keeps official schedule pages and existing wiki programme sources on the corrected concerts', () => {
    const { catalog, close } = loadBuiltCatalog()
    try {
      const required: Record<number, string[]> = {
        1924: ['https://mikuexpo.com/na2016/', 'https://w.atwiki.jp/hmiku/pages/67134.html'],
        2947: [
          'https://www.kodo.or.jp/blog/news/20170110_11807.html',
          'https://w.atwiki.jp/hmiku/pages/67219.html',
        ],
        2517: ['https://magicalmirai.com/2014/ticket_osaka.html', 'https://w.atwiki.jp/hmiku/pages/67113.html'],
        2518: ['https://magicalmirai.com/2014/ticket_tokyo.html', 'https://w.atwiki.jp/hmiku/pages/67113.html'],
        4056: ['https://info.miku.sega.jp/489', 'https://w.atwiki.jp/hmiku/pages/67152.html'],
        2524: ['https://blog.piapro.net/2012/10/post-576.html', 'https://w.atwiki.jp/hmiku/pages/67153.html'],
        2525: [
          'https://sonymusic.com.tw/news/%e5%ae%87%e5%ae%99%e6%9c%80%e5%bc%b7%e8%99%9b%e6%93%ac%e5%81%b6%e5%83%8f%e5%88%9d%e9%9f%b3%e6%9c%aa%e4%be%8610%e6%9c%886%e6%97%a5%e4%be%86%e5%8f%b0%e9%96%8b%e5%94%b1/',
          'https://w.atwiki.jp/hmiku/pages/67153.html',
        ],
      }
      for (const [performanceId, urls] of Object.entries(required)) {
        const have = sourceUrls(catalog, Number(performanceId))
        expect([...have].sort()).toEqual([...urls].sort())
      }
    } finally {
      close()
    }
  })

  it('adds WOWOW 2014 as an exact-name standalone concert with the sourced eight-song programme', () => {
    const { catalog, close } = loadBuiltCatalog()
    try {
      const series = catalog.series.filter((row) => row.id === 900000007)
      expect(series).toHaveLength(1)
      expect(series[0]?.name).toBe('初音ミク×TOUCH！WOWOW2014 スペシャルライブ')
      expect(catalog.series.filter((row) => row.id === 900000007).length).toBe(1)

      const performance = catalog.performances.filter((row) => row.id === 3000000012)
      expect(performance).toHaveLength(1)
      expect(performance[0]?.series_id).toBe(900000007)
      expect(performance[0]?.name).toBe('初音ミク×TOUCH！WOWOW2014 スペシャルライブ')
      expect(performance[0]?.venue_name).toBe('チームスマイル／豊洲PIT')
      expect(performance[0]?.country_code).toBe('JP')
      expect(performance[0]?.start_date).toBe('2014-11-01')
      expect(performance[0]?.showtime_local).toBe('18:00')
      expect(performance[0]?.timezone).toBe('Asia/Tokyo')
      expect(performance[0]?.time_precision).toBe('day')
      expect(performance[0]?.song_list_id).toBeNull()

      const wowowShows = catalog.performanceShowSetlists.filter((row) => row.performance_id === 3000000012)
      expect(wowowShows).toHaveLength(1)
      expect(wowowShows[0]?.show_key).toBe('3000000012:2014-11-01')
      expect(wowowShows[0]?.item_count).toBe(8)

      const wowowItems = catalog.performanceShowSetlistItems
        .filter((row) => row.show_key === '3000000012:2014-11-01')
        .sort((left, right) => left.position - right.position)
      expect(wowowItems.map((row) => row.song_id)).toEqual([66126, 1322, 2905, 1141, 50132, 373, 1326, 8395])
      expect(catalog.performanceSetlists.filter((row) => row.performance_id === 3000000012)).toHaveLength(1)

      const programmeSources = sourceUrls(catalog, 3000000012)
      expect([...programmeSources].sort()).toEqual(
        [
          'https://blog.piapro.net/2014/11/z1411081-1.html',
          'https://mikudoc.blogspot.com/2014/11/wowow_1.html',
          'https://nat.hatenadiary.com/entry/20141101/p1',
        ].sort(),
      )

      const links = catalog.performanceLinks.filter((row) => row.performance_id === 3000000012).map((row) => row.url)
      expect(links).toHaveLength(3)
      expect([...links].sort()).toEqual(
        [
          'https://blog.piapro.net/2014/11/z1411081-1.html',
          'https://mikudoc.blogspot.com/2014/11/wowow_1.html',
          'https://prtimes.jp/main/html/rd/p/000002279.000001355.html',
        ].sort(),
      )

      const premiere = catalog.premieres.filter((row) => row.series_id === 900000007)
      expect(premiere).toHaveLength(1)
      expect(premiere[0]?.premiere_performance_id).toBe(3000000012)
      expect(premiere[0]?.premiere_date).toBe('2014-11-01')
      expect(premiere[0]?.premiere_showtime_local).toBe('18:00')

      // IDs must remain unique.
      expect(catalog.series.filter((row) => row.id === 900000007)).toHaveLength(1)
      expect(catalog.performances.filter((row) => row.id === 3000000012)).toHaveLength(1)
      expect(catalog.performances.filter((row) => row.start_date === '2014-11-01' && (row.venue_name ?? '').includes('豊洲PIT'))).toHaveLength(1)

      // Barcelona 2020 stays without a curated derived setlist.
      expect(catalog.performanceShowSetlists.filter((row) => row.performance_id === 2790)).toHaveLength(0)

      const counts = showCountsByPerformance(catalog, reviewRotations(catalog))
      expect(counts.get(1924)).toBe(3)
      expect(counts.get(2947)).toBe(3)
      expect(counts.get(2517)).toBe(2)
      expect(counts.get(2518)).toBe(2)
      expect(counts.get(4056)).toBe(2)
      expect(counts.get(2524)).toBe(2)
      expect(counts.get(2525)).toBe(2)
      expect(counts.get(3000000012)).toBe(1)
    } finally {
      close()
    }
  })

  it('pins derived and site-wide show totals after the official schedule batch and WOWOW programme', () => {
    const { catalog, close } = loadBuiltCatalog()
    try {
      const derivedShowRows = catalog.performanceShowSetlists.length
      const siteWideShows = [...showCountsByPerformance(catalog, reviewRotations(catalog)).values()].reduce(
        (sum, count) => sum + count,
        0,
      )
      // Rebuilt from committed increments on this branch after merging current
      // main. Derived rows are the performance_show_setlists table; site-wide
      // 场次 use showCountsByPerformance (derived schedules win, date-range
      // fallback otherwise). On d713f12 these were 447 and 456. After the
      // official schedule batch plus the WOWOW programme they were 454 and 463.
      // Merging main's provisional 2026 Kodo programme adds two derived rows
      // (11/20 night and 11/21 day). Site-wide 场次 stay at 463, because those
      // two dates and WOWOW were already counted via date-range fallback.
      expect(derivedShowRows).toBe(456)
      expect(siteWideShows).toBe(463)
      expect(catalog.series.some((row) => row.id === 900000007)).toBe(true)
      expect(catalog.performances.some((row) => row.id === 3000000012)).toBe(true)
    } finally {
      close()
    }
  })
})
