import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import { applyCatalogSql } from '../scripts/build-catalog.ts'
import { loadCatalog } from '../shared/catalog.ts'
import {
  SETLIST_BANNER_AUTOPLAY_MS,
  SETLIST_BANNER_SLIDE_MS,
  SETLIST_CAROUSEL_LIMIT,
  bannerAutoplayEnabled,
  bannerIncomingStartPercent,
  bannerSlideOffsetPercent,
  buildRecentSetlistBannerSlides,
  estimatedSongDurationSeconds,
  isWithinRecentLookback,
  posterForPerformance,
  splitDuration,
  utcCalendarDateMonthsAgo,
  type TourPostersFile,
} from '../shared/homepage-carousel.ts'
import { parseTours } from '../shared/tours.ts'
import type { Catalog, PerformanceRow, PerformanceSetlistRow, PerformanceShowSetlistItemRow, SongRow, SqlRow } from '../shared/types.ts'

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

const setlistRow = (performanceId: number, sourceRowCount: number): PerformanceSetlistRow => ({
  performance_id: performanceId,
  source_list_id: 1,
  source_kind: 'vocadb',
  change: 'none',
  status: 'complete',
  resolution: 'vocadb-shared',
  source_row_count: sourceRowCount,
  day_night_dates: null,
  no_show_dates: null,
  single_show_dates: null,
  conflict: 0,
  pending_review: 0,
  note: null,
  page_note: null,
})

const song = (id: number, lengthSeconds: number | null): SongRow => ({
  id,
  name: `Song ${id}`,
  name_ja: null,
  name_en: null,
  artist_string: null,
  song_type: 'Original',
  category: 'vocaloid',
  publish_date: null,
  length_seconds: lengthSeconds,
  source_url: `https://vocadb.net/S/${id}`,
  retrieved_at: '2026-01-01T00:00:00.000Z',
})

const item = (
  performanceId: number,
  position: number,
  songId: number | null,
  showKey = '2024-08-30',
): PerformanceShowSetlistItemRow => ({
  performance_id: performanceId,
  show_key: showKey,
  position,
  source_position: position,
  song_id: songId,
  medley_id: null,
  evidence: 'curated',
  notes: null,
})

/** Builds a tour-poster file keyed by tour id. */
const posters = (entries: TourPostersFile['tours']): TourPostersFile => ({
  version: 1,
  tours: entries,
})

/** One poster provenance row for tests. */
const posterRecord = (src: string) => ({
  src,
  sourceUrl: 'https://example.com/poster.jpg',
  sourcePage: 'https://example.com/',
  sourceLabel: 'Official site',
  accessedAt: '2026-11-23',
  artistCredit: 'Example Artist',
  rightsNote: 'Test mapping',
})

/** Tour index that maps common fixture performance ids onto tour slugs. */
const fixtureTours = parseTours({
  version: 1,
  checkedAt: '2026-11-24',
  tours: [
    { id: 'tour-1', name: 'Tour 1', seriesId: 10, sourceUrl: null, performanceIds: [1] },
    { id: 'tour-2', name: 'Tour 2', seriesId: 10, sourceUrl: null, performanceIds: [2] },
    { id: 'tour-3', name: 'Tour 3', seriesId: 10, sourceUrl: null, performanceIds: [3] },
    { id: 'tour-9', name: 'Tour 9', seriesId: 10, sourceUrl: null, performanceIds: [9] },
  ],
})

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

describe('buildRecentSetlistBannerSlides', () => {
  const now = new Date('2026-11-23T12:00:00.000Z')

  it('orders recently held concerts by concert date, not retrieval stamps or historical backfills', () => {
    const catalog = emptyCatalog({
      performances: [
        performance({
          id: 1,
          series_id: 10,
          name: 'Older recent concert',
          start_date: '2026-11-20',
          retrieved_at: '2026-11-22T20:00:00.000Z',
        }),
        performance({
          id: 2,
          series_id: 10,
          name: 'Newer recent concert',
          start_date: '2026-11-22',
          showtime_local: '18:00',
          retrieved_at: '2020-01-01T00:00:00.000Z',
        }),
        performance({
          id: 3,
          series_id: 10,
          name: 'Historical backfill',
          start_date: '2014-11-01',
          showtime_local: '18:00',
          retrieved_at: '2026-11-22T19:25:38.000Z',
        }),
      ],
      performanceSetlists: [setlistRow(1, 18), setlistRow(2, 8), setlistRow(3, 8)],
    })
    const slides = buildRecentSetlistBannerSlides(catalog, {
      now,
      tours: fixtureTours,
      posters: posters({
        'tour-2': posterRecord('/posters/tour-2.png'),
      }),
    })
    expect(slides.map((row) => row.id)).toEqual([2, 1])
    expect(slides[0]?.showtime).toBe('18:00')
    expect(slides[0]?.songCount).toBe(8)
    expect(slides[0]?.poster?.src).toBe('/posters/tour-2.png')
    expect(slides[1]?.showtime).toBeNull()
    expect(slides[1]?.poster).toBeNull()
  })

  it('excludes a historical concert whose setlist was only recently catalogued', () => {
    const catalog = emptyCatalog({
      performances: [
        performance({
          id: 3000000012,
          series_id: 900000007,
          name: 'TOUCH WOWOW 2014',
          start_date: '2014-11-01',
          showtime_local: '18:00',
          retrieved_at: '2026-11-22T19:25:38.000Z',
        }),
        performance({
          id: 12940,
          series_id: 255,
          name: 'Kodo Kyouen',
          start_date: '2026-11-20',
          end_date: '2026-11-21',
        }),
      ],
      performanceSetlists: [setlistRow(3000000012, 8), setlistRow(12940, 18)],
    })
    const slides = buildRecentSetlistBannerSlides(catalog, { now, posters: posters({}) })
    expect(slides.map((row) => row.id)).toEqual([12940])
    expect(slides.some((row) => row.id === 3000000012)).toBe(false)
  })

  it('drops concerts outside the 12-month lookback even when they have a setlist', () => {
    const catalog = emptyCatalog({
      performances: [
        performance({
          id: 11,
          series_id: 1,
          name: 'Thirteen months ago',
          start_date: '2025-10-23',
        }),
        performance({
          id: 12,
          series_id: 1,
          name: 'Eleven months ago',
          start_date: '2025-12-23',
        }),
      ],
      performanceSetlists: [setlistRow(11, 4), setlistRow(12, 5)],
    })
    const cutoff = utcCalendarDateMonthsAgo(now, 12)
    expect(cutoff).toBe('2025-11-23')
    expect(isWithinRecentLookback({ start_date: '2025-10-23', end_date: null }, cutoff)).toBe(false)
    expect(isWithinRecentLookback({ start_date: '2025-11-20', end_date: '2025-11-23' }, cutoff)).toBe(true)
    const slides = buildRecentSetlistBannerSlides(catalog, { now, posters: posters({}) })
    expect(slides.map((row) => row.id)).toEqual([12])
  })

  it('skips unknown or missing 演出 and does not guess a poster filename', () => {
    const catalog = emptyCatalog({
      performances: [performance({ id: 9, series_id: 1, name: 'Known', start_date: '2026-11-01' })],
      performanceSetlists: [setlistRow(9, 2)],
    })
    const slides = buildRecentSetlistBannerSlides(catalog, {
      now,
      tours: fixtureTours,
      posters: posters({
        'other-tour': posterRecord('/posters/other-tour.jpg'),
      }),
    })
    expect(slides).toHaveLength(1)
    expect(slides[0]?.id).toBe(9)
    expect(slides[0]?.poster).toBeNull()
    expect(
      posterForPerformance(
        9,
        posters({ 'other-tour': posterRecord('/posters/other-tour.jpg') }),
        fixtureTours,
      ),
    ).toBeNull()
  })

  it('omits an estimated song duration when any listed song lacks a length', () => {
    const catalog = emptyCatalog({
      performances: [performance({ id: 5, series_id: 1, start_date: '2026-11-01' })],
      performanceSetlists: [setlistRow(5, 2)],
      songs: [song(11, 180), song(12, null)],
      performanceShowSetlistItems: [item(5, 1, 11), item(5, 2, 12)],
    })
    expect(estimatedSongDurationSeconds(catalog, 5)).toBeNull()
    const slides = buildRecentSetlistBannerSlides(catalog, { now, posters: posters({}) })
    expect(slides[0]?.songCount).toBe(2)
    expect(slides[0]?.estimatedSongDurationSeconds).toBeNull()
  })

  it('sums complete listed-song lengths and can split them for labels', () => {
    const catalog = emptyCatalog({
      performances: [performance({ id: 6, series_id: 1, start_date: '2026-11-01' })],
      performanceSetlists: [setlistRow(6, 2)],
      songs: [song(21, 120), song(22, 180)],
      performanceShowSetlistItems: [item(6, 1, 21), item(6, 2, 22)],
    })
    expect(estimatedSongDurationSeconds(catalog, 6)).toBe(300)
    expect(splitDuration(300)).toEqual({ hours: 0, minutes: 5 })
    expect(splitDuration(3720)).toEqual({ hours: 1, minutes: 2 })
  })

  it('uses recently held concerts with setlists on the live catalog, excluding the WOWOW 2014 backfill', () => {
    const { catalog, close } = loadCommittedCatalog()
    try {
      const slides = buildRecentSetlistBannerSlides(catalog, { now })
      expect(slides.map((row) => row.id)).toEqual([12227, 12940, 12226, 12225, 12224])
      expect(slides).toHaveLength(5)
      expect(slides.some((row) => row.id === 12223)).toBe(false)
      expect(slides.length).toBeLessThanOrEqual(SETLIST_CAROUSEL_LIMIT)
      expect(slides.some((row) => row.id === 3000000012)).toBe(false)
      const paris = slides[0]
      const kodo = slides[1]
      expect(paris?.dates).toBe('2026-11-22')
      expect(paris?.showtime).toBeNull()
      expect(paris?.songCount).toBe(26)
      expect(paris?.poster?.src).toBe('/posters/miku-expo-2026-europe.webp')
      expect(paris?.poster?.sourcePage).toBe('https://mikuexpo.com/europe2026/')
      expect(paris?.href).toBe('/tours/miku-expo-2026-europe#p-12227')
      expect(paris?.estimatedSongDurationSeconds).toBe(5916)
      expect(kodo?.dates).toBe('2026-11-20 – 2026-11-21')
      expect(kodo?.showtime).toBeNull()
      expect(kodo?.songCount).toBe(18)
      expect(kodo?.poster?.src).toBe('/posters/hatsune-miku-x-kodo-2026.webp')
      expect(kodo?.estimatedSongDurationSeconds).toBeNull()
      expect(kodo?.href).toBe('/tours/hatsune-miku-x-kodo-2026#p-12940')
      for (const slide of slides) {
        if (slide.estimatedSongDurationSeconds !== null) {
          expect(slide.estimatedSongDurationSeconds).toBeGreaterThan(0)
        }
      }
    } finally {
      close()
    }
  })
})


describe('banner autoplay policy', () => {
  const allowed = {
    mounted: true,
    slideCount: 5,
    reducedMotion: false,
    pointerHeld: false,
    keyHeld: false,
    pageHidden: false,
  }

  it('uses a 5-second idle interval and enables autoplay only when idle with several slides', () => {
    expect(SETLIST_CAROUSEL_LIMIT).toBe(5)
    expect(SETLIST_BANNER_AUTOPLAY_MS).toBe(5000)
    expect(bannerAutoplayEnabled(allowed)).toBe(true)
    expect(bannerAutoplayEnabled({ ...allowed, mounted: false })).toBe(false)
    expect(bannerAutoplayEnabled({ ...allowed, slideCount: 1 })).toBe(false)
    expect(bannerAutoplayEnabled({ ...allowed, reducedMotion: true })).toBe(false)
    expect(bannerAutoplayEnabled({ ...allowed, pointerHeld: true })).toBe(false)
    expect(bannerAutoplayEnabled({ ...allowed, keyHeld: true })).toBe(false)
    expect(bannerAutoplayEnabled({ ...allowed, pageHidden: true })).toBe(false)
  })
})

describe('homepage setlist banner slide offsets', () => {
  it('places the incoming and outgoing slides on the travel side, including wrap-around', () => {
    expect(SETLIST_BANNER_SLIDE_MS).toBe(500)
    expect(bannerIncomingStartPercent(1)).toBe(100)
    expect(bannerIncomingStartPercent(-1)).toBe(-100)

    const forward = { current: 1, previous: 0, direction: 1 as const }
    expect(bannerSlideOffsetPercent(1, forward)).toBe(0)
    expect(bannerSlideOffsetPercent(0, forward)).toBe(-100)
    expect(bannerSlideOffsetPercent(2, forward)).toBe(100)

    const wrapForward = { current: 0, previous: 4, direction: 1 as const }
    expect(bannerSlideOffsetPercent(0, wrapForward)).toBe(0)
    expect(bannerSlideOffsetPercent(4, wrapForward)).toBe(-100)
    expect(bannerSlideOffsetPercent(1, wrapForward)).toBe(100)

    const wrapBack = { current: 4, previous: 0, direction: -1 as const }
    expect(bannerSlideOffsetPercent(4, wrapBack)).toBe(0)
    expect(bannerSlideOffsetPercent(0, wrapBack)).toBe(100)
    expect(bannerSlideOffsetPercent(3, wrapBack)).toBe(-100)

    // After a forward move, the previous slide sits at -100, so a forward wrap
    // onto that same slide is not yet on the incoming start side.
    expect(bannerSlideOffsetPercent(0, forward)).not.toBe(bannerIncomingStartPercent(1))
  })
})

describe('homepage setlist carousel source files', () => {
  it('keeps official poster files and maps them by tour id through the 演出', () => {
    const mapping = JSON.parse(
      readFileSync(join(process.cwd(), 'data/tour-posters.json'), 'utf8'),
    ) as TourPostersFile
    const kodo = mapping.tours['hatsune-miku-x-kodo-2026']
    const paris = mapping.tours['miku-expo-2026-europe']
    const wowow = mapping.tours['wowow-2014']
    expect(kodo?.src).toBe('/posters/hatsune-miku-x-kodo-2026.webp')
    expect(paris?.src).toBe('/posters/miku-expo-2026-europe.webp')
    expect(wowow?.src).toBe('/posters/wowow-2014.png')
    expect(posterForPerformance(12940)?.src).toBe('/posters/hatsune-miku-x-kodo-2026.webp')
    expect(posterForPerformance(12227)?.src).toBe('/posters/miku-expo-2026-europe.webp')
    expect(readFileSync(join(process.cwd(), 'public/posters/hatsune-miku-x-kodo-2026.webp')).byteLength).toBeGreaterThan(1000)
    expect(readFileSync(join(process.cwd(), 'public/posters/miku-expo-2026-europe.webp')).byteLength).toBeGreaterThan(1000)
    const component = readFileSync(join(process.cwd(), 'app/components/HomeSetlistCarousel.vue'), 'utf8')
    expect(component).toContain('prefers-reduced-motion')
    expect(component).toContain('transform 500ms cubic-bezier(0.33, 0, 0.2, 1)')
    expect(component).toContain('.carousel-slide.is-motion')
    expect(component).toContain('data-carousel-arrows')
    expect(component).toContain('(hover: hover) and (pointer: fine)')
    expect(component).toContain('.banner-root:has(:focus-visible) .carousel-arrows')
    expect(component).toContain('.banner-root:hover .carousel-arrows button')
    expect(component).not.toMatch(/\.banner-root:hover \.carousel-arrows,\s*\.banner-root:has\(:focus-visible\) \.carousel-arrows \{\s*opacity: 1;\s*pointer-events: auto;/)
    expect(component).not.toMatch(/\.banner-root:focus-within \.carousel-arrows/)
    expect(component).toContain('touch-action: pan-y')
    expect(component).toContain('i-lucide-calendar')
    expect(component).toContain('i-lucide-clock')
    expect(component).toContain('i-lucide-map-pin')
    expect(component).toContain('i-lucide-music')
    expect(component).toContain('i-lucide-timer')
    expect(component).toContain('home.estimatedSongDurationLabel')
    expect(component).toContain('durationLabel(slide.estimatedSongDurationSeconds)')
    expect(component).not.toMatch(/t\('home\.estimatedSongDuration'/)
    expect(component).toContain('object-cover')
    expect(component).toContain('object-top')
    expect(component).not.toContain('object-contain')
    expect(component).not.toContain('poster-letterbox')
    expect(component).not.toContain('from-black/85')
    expect(component).toContain('--home-banner-poster-max-width: 1100px')
    expect(component).toContain('--home-banner-stage-bg: #05070d')
    expect(component).toContain('--home-banner-side-fade-width')
    expect(component).toContain('--home-banner-ink')
    expect(component).toContain('--home-banner-readability-mid: 42%')
    expect(component).toContain('--home-banner-readability-end: 78%')
    expect(component).toContain('--home-banner-readability-mid-capped: 26%')
    expect(component).toContain('--home-banner-readability-end-capped: 48%')
    expect(component).toContain('100cqi - var(--home-banner-poster-max-width)')
    expect(component).toContain('var(--home-banner-readability-end-used)')
    expect(component).not.toMatch(/@media[^{]*min-width:\s*1100px/)
    expect(component).toContain('html:not(.dark) .banner-root')
    expect(component).toContain('poster-side-fade')
    expect(component).toContain('poster-readability-mask')
    expect(component).toContain('max-width: var(--home-banner-poster-max-width)')
    expect(component).toContain('margin-inline: auto')
    expect(component).toMatch(/\.poster-frame[^{]*\{[^}]*max-width: var\(--home-banner-poster-max-width\)/)
    expect(component).toContain('linear-gradient(to right, var(--home-banner-stage-bg)')
    expect(component).toContain('linear-gradient(to left, var(--home-banner-stage-bg)')
    expect(component).toContain('data-carousel-slide-link')
    expect(component).not.toContain('home.carouselPause')
    expect(component).not.toContain('home.carouselPlay')
    expect(component).not.toContain('toggleUserPaused')
    expect(component).not.toContain('i-lucide-pause')
    expect(component).not.toContain('i-lucide-play')
    expect(component).not.toContain('userPaused')

    expect(component).toContain('home.viewConcert')
    expect(component).not.toContain('home-carousel-heading')
    expect(component).not.toContain('home.carouselSubtitle')
    expect(component).not.toMatch(/Main visual|carouselCredit|sourcePage/)
    const homeLayout = readFileSync(join(process.cwd(), 'app/layouts/home.vue'), 'utf8')
    expect(homeLayout).toContain('<SiteHeader />')
    expect(homeLayout).toMatch(/<SiteHeader \/>\s*<slot \/>/)
    expect(readFileSync(join(process.cwd(), 'app/pages/index.vue'), 'utf8')).toContain("layout: 'home'")
  })
})
