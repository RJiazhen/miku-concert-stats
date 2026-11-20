import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import { applyCatalogSql } from '../scripts/build-catalog.ts'
import {
  HOME_PATH,
  HOMEPAGE_FEATURE_MODULES,
  RANKING_PATH,
  buildRecentConcerts,
  buildRecentlyUpdatedSummary,
  buildRelatedConcertLinks,
  buildSiteWideStats,
  classifyPerformanceWebsiteLink,
  collectBilibiliRecordingLinks,
  formatSourceTimestamp,
  isBilibiliConcertRecordingUrl,
  showPath,
} from '../shared/homepage.ts'
import { loadCatalog } from '../shared/catalog.ts'
import { reviewRotations } from '../shared/rotation.ts'
import { setlistPerformanceIds, showCountsByPerformance } from '../shared/performance-setlists.ts'
import { showsForPerformance } from '../shared/event-schedule.ts'
import type { Catalog, PerformanceRow, SqlRow } from '../shared/types.ts'

/** Empty catalog with every required table present. */
const emptyCatalog = (overrides: Partial<Catalog> = {}): Catalog => ({
  sources: [],
  series: [],
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
  ...overrides,
})

/** One 演出 fixture; dates and retrieval times are filled in by the caller. */
const performance = (overrides: Partial<PerformanceRow> & Pick<PerformanceRow, 'id' | 'series_id'>): PerformanceRow => ({
  name: `Show ${overrides.id}`,
  name_ja: null,
  venue_name: 'Tokyo',
  country_code: 'JP',
  start_date: '2024-08-30',
  end_date: null,
  showtime_local: null,
  timezone: null,
  time_precision: 'day',
  time_evidence: null,
  role: 'show',
  series_number: 2024,
  series_suffix: null,
  song_list_id: 1,
  vocadb_status: null,
  source_url: 'https://vocadb.net/E/1',
  retrieved_at: '2026-01-01T00:00:00.000Z',
  ...overrides,
})

/** Loads the committed SQL catalog into memory. */
const loadCommittedCatalog = (): { catalog: Catalog; close: () => void } => {
  const db = new Database(':memory:')
  applyCatalogSql(db)
  return {
    catalog: loadCatalog({
      all: (sql: string) => db.prepare(sql).all() as SqlRow[],
    }),
    close: () => db.close(),
  }
}

describe('homepage routes and feature navigation', () => {
  it('keeps the landing page at / and the ranking at /rank', () => {
    expect(HOME_PATH).toBe('/')
    expect(RANKING_PATH).toBe('/rank')
    expect(showPath(2518)).toBe('/shows/2518')
    const songs = HOMEPAGE_FEATURE_MODULES.find((module) => module.id === 'songs')
    expect(songs?.to).toBe('/rank')
    expect(HOMEPAGE_FEATURE_MODULES.map((module) => module.to)).toEqual([
      '/rank',
      '/producers',
      '/timeline',
      '/series',
      '/cities',
    ])
  })
})

describe('buildSiteWideStats', () => {
  it('counts series, 演出, 场次, and songs with the same show-count rule as the indexes', () => {
    const { catalog, close } = loadCommittedCatalog()
    try {
      const stats = buildSiteWideStats(catalog)
      const review = reviewRotations(catalog)
      const showCounts = showCountsByPerformance(catalog, review)
      const expectedShows = catalog.performances.reduce((sum, row) => {
        const counted = showCounts.get(row.id)
        if (counted !== undefined) return sum + counted
        const days = showsForPerformance(row).length
        return sum + (days === 0 ? 1 : days)
      }, 0)
      expect(stats.series).toBe(catalog.series.length)
      expect(stats.performances).toBe(catalog.performances.length)
      expect(stats.songs).toBe(catalog.songs.length)
      expect(stats.shows).toBe(expectedShows)
      expect(stats.showPerformances + stats.broadcastPerformances).toBe(stats.performances)
      expect(stats.performancesWithSetlist).toBe(setlistPerformanceIds(catalog).size)
      expect(stats.cancelledPerformances).toBe(
        catalog.performanceStatus.filter((row) => row.status === 'cancelled').length,
      )
      const dated = catalog.performances.map((row) => row.start_date).filter((date): date is string => date !== null)
      expect(stats.firstConcertDate).toBe(dated.reduce((min, date) => (date < min ? date : min)))
      expect(stats.lastConcertDate).toBe(dated.reduce((max, date) => (date > max ? date : max)))
      expect(stats.series).toBeGreaterThan(0)
      expect(stats.performances).toBeGreaterThan(0)
      expect(stats.shows).toBeGreaterThan(stats.performances)
    } finally {
      close()
    }
  })
})

describe('buildRecentlyUpdatedSummary', () => {
  it('uses retrieved_at and accessed_at only, never concert dates', () => {
    const catalog = emptyCatalog({
      series: [
        {
          id: 81,
          name: 'マジカルミライ',
          name_ja: null,
          description: null,
          source_url: 'https://vocadb.net/S/81',
          retrieved_at: '2026-11-10T00:04:31.210Z',
        },
      ],
      performances: [
        performance({
          id: 1,
          series_id: 81,
          start_date: '2027-03-13',
          end_date: '2027-03-14',
          retrieved_at: '2026-11-10T00:04:31.210Z',
        }),
        performance({
          id: 2,
          series_id: 81,
          start_date: '2009-08-31',
          retrieved_at: '2026-11-06T08:52:00.000Z',
        }),
      ],
      songs: [
        {
          id: 1,
          name: 'メルト',
          name_ja: null,
          name_en: null,
          artist_string: null,
          song_type: 'Original',
          category: 'vocaloid',
          publish_date: '2007-12-07',
          length_seconds: null,
          source_url: 'https://vocadb.net/S/1',
          retrieved_at: '2026-11-10T00:04:31.210Z',
          vocalists: [],
          producers: [],
        },
      ],
      songLists: [
        {
          id: 1,
          name: 'List',
          featured_category: null,
          source_url: 'https://vocadb.net/L/1',
          retrieved_at: '2026-11-06T11:20:00.000Z',
          announced_at: null,
          source: 'vocadb',
          album_id: null,
          medium: null,
        },
      ],
      performanceSetlistSources: [
        {
          performance_id: 1,
          url: 'https://example.com/setlist',
          title: 'Wiki',
          accessed_at: '2026-11-09',
          confidence: 'high',
          note: null,
          conflict: 0,
        },
      ],
      performanceStatus: [
        {
          performance_id: 99,
          status: 'cancelled',
          note: null,
          source_url: 'https://example.com/cancelled',
          accessed_at: '2026-11-05',
        },
      ],
    })
    const summary = buildRecentlyUpdatedSummary(catalog)
    expect(summary.latestRetrievedAt).toBe('2026-11-10T00:04:31.210Z')
    expect(summary.latestAccessedAt).toBe('2026-11-09')
    expect(summary.retrievalBatches[0]).toMatchObject({
      retrievedAt: '2026-11-10T00:04:31.210Z',
      series: 1,
      performances: 1,
      songs: 1,
      songLists: 0,
    })
    const stamps = [
      summary.latestRetrievedAt,
      summary.latestAccessedAt,
      ...summary.retrievalBatches.map((batch) => batch.retrievedAt),
      ...summary.accessBatches.map((batch) => batch.accessedAt),
    ]
    expect(stamps).not.toContain('2027-03-13')
    expect(stamps).not.toContain('2027-03-14')
    expect(stamps).not.toContain('2009-08-31')
    expect(stamps).not.toContain('2007-12-07')
  })
})

describe('buildRecentConcerts', () => {
  it('orders by concert start_date and omits image fields and undated rows', () => {
    const catalog = emptyCatalog({
      performances: [
        performance({
          id: 1,
          series_id: 81,
          name: 'Older concert',
          start_date: '2024-01-01',
          retrieved_at: '2026-12-01T00:00:00.000Z',
        }),
        performance({
          id: 2,
          series_id: 81,
          name: 'Newer concert',
          start_date: '2025-06-01',
          venue_name: 'Osaka',
          retrieved_at: '2026-01-01T00:00:00.000Z',
        }),
        performance({
          id: 3,
          series_id: 81,
          name: 'Undated',
          start_date: null,
          retrieved_at: '2026-12-31T00:00:00.000Z',
        }),
      ],
      performanceStatus: [
        {
          performance_id: 2,
          status: 'upcoming',
          note: null,
          source_url: 'https://example.com/upcoming',
          accessed_at: '2026-11-06',
        },
      ],
      performanceLinks: [
        { performance_id: 2, url: 'https://magicalmirai.com/2025/', description: 'Official Website' },
      ],
    })
    const rows = buildRecentConcerts(catalog, 8)
    expect(rows.map((row) => row.id)).toEqual([2, 1])
    expect(rows[0]).toMatchObject({
      id: 2,
      startDate: '2025-06-01',
      venue: 'Osaka',
      href: '/shows/2',
      status: 'upcoming',
    })
    expect(rows[0]?.websiteLinks).toEqual([
      {
        performanceId: 2,
        url: 'https://magicalmirai.com/2025/',
        sourceDescription: 'Official Website',
        kind: 'official-website',
      },
    ])
    for (const row of rows) {
      expect(row).not.toHaveProperty('poster')
      expect(row).not.toHaveProperty('image')
      expect(row).not.toHaveProperty('imageUrl')
      expect(row).not.toHaveProperty('thumbnail')
      expect(row.startDate).not.toBe(catalog.performances.find((item) => item.id === row.id)?.retrieved_at)
    }
  })
})


describe('formatSourceTimestamp', () => {
  it('keeps date-only access days and labels UTC instants without turning them into concert dates', () => {
    expect(formatSourceTimestamp('2026-11-09')).toBe('2026-11-09')
    expect(formatSourceTimestamp('2026-11-10T00:04:31.210Z')).toBe('2026-11-10 00:04:31 UTC')
  })
})

describe('website and Bilibili link classification', () => {
  it('labels official websites and generic Website rows without inventing official status', () => {
    expect(
      classifyPerformanceWebsiteLink({
        performance_id: 1,
        url: 'https://magicalmirai.com/2024/',
        description: 'Official Webpage',
      })?.kind,
    ).toBe('official-website')
    expect(
      classifyPerformanceWebsiteLink({
        performance_id: 1,
        url: 'https://mikuexpo.com/2024/',
        description: 'Website (EN)',
      }),
    ).toMatchObject({ kind: 'website', sourceDescription: 'Website (EN)' })
    expect(
      classifyPerformanceWebsiteLink({
        performance_id: 1,
        url: 'https://blog.piapro.net/example',
        description: 'HATSUNE MIKU OFFICIAL BLOG',
      }),
    ).toBeNull()
    expect(
      classifyPerformanceWebsiteLink({
        performance_id: 1,
        url: 'https://x.com/example',
        description: 'X (Twitter) (Announcement)',
      }),
    ).toBeNull()
    expect(
      classifyPerformanceWebsiteLink({
        performance_id: 1,
        url: 'https://www.youtube.com/watch?v=abc',
        description: 'Youtube official highlights',
      }),
    ).toBeNull()
  })

  it('accepts only Bilibili video URLs from 演出-level sources, not profiles or song PVs', () => {
    expect(isBilibiliConcertRecordingUrl('https://www.bilibili.com/video/BV1xx411c7mD')).toBe(true)
    expect(isBilibiliConcertRecordingUrl('https://www.bilibili.com/video/av11787782')).toBe(true)
    expect(isBilibiliConcertRecordingUrl('https://space.bilibili.com/123')).toBe(false)
    expect(isBilibiliConcertRecordingUrl('https://www.bilibili.com/')).toBe(false)
    expect(isBilibiliConcertRecordingUrl('https://b23.tv/IITMbFk')).toBe(false)
    expect(isBilibiliConcertRecordingUrl('https://live.bilibili.com/123')).toBe(false)

    const recordings = collectBilibiliRecordingLinks(
      [
        { performance_id: 1, url: 'https://www.bilibili.com/video/av11787782', description: 'Concert recording' },
        { performance_id: 1, url: 'https://space.bilibili.com/123', description: 'Uploader space' },
        { performance_id: 1, url: 'https://b23.tv/IITMbFk', description: 'Profile short link' },
      ],
      [
        {
          performance_id: 2,
          url: 'https://www.bilibili.com/video/BV1xx411c7mD',
          title: 'Recording',
          accessed_at: '2026-11-06',
          confidence: 'medium',
          note: null,
          conflict: 0,
        },
      ],
    )
    expect(recordings.map((row) => row.url)).toEqual([
      'https://www.bilibili.com/video/av11787782',
      'https://www.bilibili.com/video/BV1xx411c7mD',
    ])
  })

  it('finds no Bilibili concert recordings in the committed catalog and ignores song PVs', () => {
    const { catalog, close } = loadCommittedCatalog()
    try {
      const recordings = collectBilibiliRecordingLinks(catalog.performanceLinks, catalog.performanceSetlistSources)
      expect(recordings).toEqual([])
      expect(catalog.videos.some((video) => video.platform === 'bilibili')).toBe(true)
      const classified = catalog.performanceLinks
        .map((link) => classifyPerformanceWebsiteLink(link))
        .filter((link): link is NonNullable<typeof link> => link !== null)
      expect(classified.some((link) => link.kind === 'official-website')).toBe(true)
      expect(classified.some((link) => link.kind === 'website')).toBe(true)
      const related = buildRelatedConcertLinks(catalog)
      expect(related.bilibiliRecordings).toEqual([])
      expect(related.websites.length).toBeGreaterThan(0)
      expect(related.websites.every((link) => link.kind === 'official-website' || link.kind === 'website')).toBe(true)
      expect(related.websites.every((link) => link.url.startsWith('http'))).toBe(true)
    } finally {
      close()
    }
  })
})

describe('homepage page markup', () => {
  it('does not render concert posters, images, or a carousel', () => {
    const source = readFileSync(new URL('../app/pages/index.vue', import.meta.url), 'utf8')
    expect(source).not.toMatch(/<img\b/i)
    expect(source).not.toMatch(/poster|carousel|thumbnail|imageUrl/i)
  })
})
