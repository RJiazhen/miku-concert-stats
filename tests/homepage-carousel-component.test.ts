// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import {
  SETLIST_BANNER_AUTOPLAY_MS,
  buildRecentSetlistBannerSlides,
  type TourPostersFile,
} from '../shared/homepage-carousel.ts'
import { parseTours } from '../shared/tours.ts'
import HomeSetlistCarousel from '../app/components/HomeSetlistCarousel.vue'
import { translateFromCatalog } from '../shared/i18n/index.ts'
import { catalogForLocale } from '../shared/i18n/split-modules.ts'
import type { Catalog, PerformanceRow, PerformanceSetlistRow, PerformanceShowSetlistItemRow, SongRow } from '../shared/types.ts'

vi.mock('~/composables/useLocale.ts', () => ({
  useLocale: () => ({
    locale: { value: 'en' },
    t: translateFromCatalog(catalogForLocale('en')),
  }),
}))

vi.mock('~/composables/useSeriesTitles.ts', () => ({
  useSeriesTitles: () => ({
    localizePerformanceSeries: (name: string) => name,
  }),
}))

vi.mock('~/composables/usePlaceNames.ts', () => ({
  usePlaceNames: () => ({
    localizePlace: (name: string) => name,
  }),
}))

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

/** Tour index for the shared carousel fixture performances. */
const fixtureTours = parseTours({
  version: 1,
  checkedAt: '2026-11-24',
  tours: [
    { id: 'tour-1', name: 'Tour 1', seriesId: 10, sourceUrl: null, performanceIds: [1] },
    { id: 'tour-2', name: 'Tour 2', seriesId: 10, sourceUrl: null, performanceIds: [2] },
  ],
})

describe('HomeSetlistCarousel', () => {
  const sampleSlides = buildRecentSetlistBannerSlides(
    emptyCatalog({
      performances: [
        performance({
          id: 2,
          series_id: 1,
          name: 'MIKU EXPO Paris',
          start_date: '2026-11-22',
          venue_name: 'Accor Arena',
        }),
        performance({
          id: 1,
          series_id: 1,
          name: 'Kodo Kyouen',
          start_date: '2026-11-20',
          end_date: '2026-11-21',
          venue_name: 'NHK Hall',
        }),
      ],
      performanceSetlists: [setlistRow(1, 18), setlistRow(2, 8)],
      songs: [song(21, 120), song(22, 180)],
      performanceShowSetlistItems: [item(2, 1, 21), item(2, 2, 22)],
    }),
    {
      now: new Date('2026-11-23T12:00:00.000Z'),
      tours: fixtureTours,
      posters: posters({
        'tour-2': posterRecord('/posters/tour-2.png'),
      }),
    },
  )

  let reducedMotion = false

  const mockMatchMedia = (): void => {
    window.matchMedia = (query: string): MediaQueryList =>
      ({
        matches: query.includes('prefers-reduced-motion') ? reducedMotion : false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: () => true,
      }) as MediaQueryList
  }

  beforeEach(() => {
    reducedMotion = false
    mockMatchMedia()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const flushSlide = async (): Promise<void> => {
    await nextTick()
    await nextTick()
  }

  const render = (slides = sampleSlides) =>
    mount(HomeSetlistCarousel, {
      props: { slides },
      global: {
        stubs: {
          NuxtLink: {
            inheritAttrs: false,
            props: { to: { type: [String, Object], required: true } },
            template: '<a :href="typeof to === \'string\' ? to : to.path" v-bind="$attrs"><slot /></a>',
          },
          UIcon: {
            props: { name: { type: String, required: true } },
            template: '<span class="icon" :data-icon="name" aria-hidden="true" />',
          },
        },
      },
    })

  it('renders poster alt text, fact-chip icons, song counts, estimated song duration, and skips missing event duration', () => {
    const wrapper = render()
    expect(wrapper.find('#home-carousel-heading').exists()).toBe(false)
    expect(wrapper.find('h2').exists()).toBe(false)
    const first = wrapper.get('article')
    expect(first.get('img').attributes('alt')).toBe('Official poster for MIKU EXPO Paris')
    expect(first.get('img').attributes('src')).toBe('/posters/tour-2.png')
    expect(first.get('img').classes()).toContain('object-cover')
    expect(first.get('img').classes()).toContain('object-top')
    expect(first.get('img').classes()).toContain('poster-image')
    expect(first.get('img').classes()).not.toContain('object-contain')
    expect(first.find('.poster-letterbox').exists()).toBe(false)
    expect(first.get('.poster-stage').exists()).toBe(true)
    expect(first.get('.poster-frame').exists()).toBe(true)
    expect(first.get('.poster-side-fade').exists()).toBe(true)
    expect(first.get('.poster-readability-mask').exists()).toBe(true)
    expect(first.get('.banner-chip').exists()).toBe(true)
    expect(first.text()).toContain('8 songs')
    expect(first.text()).toContain('View concert details')
    expect(first.findAll('a[href="/shows/2"]')).toHaveLength(1)
    expect(first.get('a[data-carousel-slide-link]').attributes('href')).toBe('/shows/2')
    const durationChip = first.get('[title="Estimated duration of listed songs, not the concert’s running time"]')
    const durationText = durationChip.get('dd').text().trim()
    expect(durationText).toBe('5 min')
    expect(durationText).not.toContain('About')
    expect(durationText).not.toMatch(/listed songs/)
    expect(first.text()).toContain('2026-11-22')
    expect(first.text()).not.toContain('18:00')
    expect(first.text()).not.toMatch(/Setlist added to this catalog|Main visual/i)
    expect(first.text()).toContain('Estimated duration of listed songs, not the concert’s running time')
    expect(first.text()).not.toMatch(/event duration/i)
    expect(wrapper.get('a[href="/shows/2"]').attributes('href')).toBe('/shows/2')
    const icons = first.findAll('dl [data-icon]').map((node) => node.attributes('data-icon'))
    expect(icons).toEqual(['i-lucide-calendar', 'i-lucide-map-pin', 'i-lucide-music', 'i-lucide-timer'])
    expect(first.findAll('[data-icon]').every((node) => node.attributes('aria-hidden') === 'true')).toBe(true)
    expect(first.find('[data-icon="i-lucide-arrow-right"]').exists()).toBe(true)
    expect(wrapper.find('[data-carousel-arrows]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('hides a missing poster with a fallback surface and still links to the show', async () => {
    const wrapper = render()
    await wrapper.get('button[aria-label="Next slide"]').trigger('click')
    const visible = wrapper.findAll('article').find((node) => !node.attributes('aria-hidden'))
    expect(visible).toBeDefined()
    expect(visible?.find('img').exists()).toBe(false)
    expect(visible?.text()).toContain('Kodo Kyouen')
    expect(visible?.text()).toContain('18 songs')
    expect(visible?.text()).not.toContain('of listed songs')
    expect(visible?.find('a[href="/shows/1"]').exists()).toBe(true)
    expect(visible?.text()).toContain('View concert details')
    const icons = visible?.findAll('dl [data-icon]').map((node) => node.attributes('data-icon'))
    expect(icons).toEqual(['i-lucide-calendar', 'i-lucide-map-pin', 'i-lucide-music'])
    wrapper.unmount()
  })

  it('moves with next, previous, and keyboard controls', async () => {
    const wrapper = render()
    const region = wrapper.get('[role="region"]')
    expect(region.attributes('aria-roledescription')).toBe('carousel')
    await wrapper.get('button[aria-label="Next slide"]').trigger('click')
    expect(wrapper.findAll('article')[1]?.attributes('aria-hidden')).toBeUndefined()
    expect(wrapper.findAll('article')[0]?.attributes('aria-hidden')).toBe('true')
    await region.trigger('keydown', { key: 'ArrowLeft' })
    expect(wrapper.findAll('article')[0]?.attributes('aria-hidden')).toBeUndefined()
    await wrapper.get('button[aria-label="Previous slide"]').trigger('click')
    expect(wrapper.findAll('article')[1]?.attributes('aria-hidden')).toBeUndefined()
    await region.trigger('keydown', { key: 'Home' })
    expect(wrapper.findAll('article')[0]?.attributes('aria-hidden')).toBeUndefined()
    wrapper.unmount()
  })

  it('auto-advances every 5 seconds when idle, even if the pointer is still or focus lingers', async () => {
    const wrapper = render()
    await nextTick()
    expect(wrapper.find('button[aria-label="Pause automatic slideshow"]').exists()).toBe(false)
    expect(wrapper.find('button[aria-label="Play automatic slideshow"]').exists()).toBe(false)
    vi.advanceTimersByTime(SETLIST_BANNER_AUTOPLAY_MS - 1)
    await nextTick()
    expect(wrapper.findAll('article')[0]?.attributes('aria-hidden')).toBeUndefined()
    vi.advanceTimersByTime(1)
    await flushSlide()
    expect(wrapper.findAll('article')[1]?.attributes('aria-hidden')).toBeUndefined()

    await wrapper.get('section').trigger('mouseenter')
    vi.advanceTimersByTime(SETLIST_BANNER_AUTOPLAY_MS - 1)
    await nextTick()
    expect(wrapper.findAll('article')[1]?.attributes('aria-hidden')).toBeUndefined()
    vi.advanceTimersByTime(1)
    await flushSlide()
    expect(wrapper.findAll('article')[0]?.attributes('aria-hidden')).toBeUndefined()

    await wrapper.get('section').trigger('focusin')
    vi.advanceTimersByTime(SETLIST_BANNER_AUTOPLAY_MS)
    await flushSlide()
    expect(wrapper.findAll('article')[1]?.attributes('aria-hidden')).toBeUndefined()
    wrapper.unmount()
  })

  it('restarts the 5-second idle clock on movement, click, key, or touch, and does not advance while a pointer or key is held', async () => {
    const wrapper = render()
    await nextTick()
    const section = wrapper.get('section')

    vi.advanceTimersByTime(3000)
    await section.trigger('pointermove', { clientX: 10, clientY: 10, pointerType: 'mouse' })
    await section.trigger('pointermove', { clientX: 40, clientY: 12, pointerType: 'mouse' })
    vi.advanceTimersByTime(SETLIST_BANNER_AUTOPLAY_MS - 1)
    await nextTick()
    expect(wrapper.findAll('article')[0]?.attributes('aria-hidden')).toBeUndefined()
    vi.advanceTimersByTime(1)
    await flushSlide()
    expect(wrapper.findAll('article')[1]?.attributes('aria-hidden')).toBeUndefined()

    await section.trigger('pointerdown', { clientX: 80, clientY: 40, pointerType: 'mouse', button: 0, pointerId: 1 })
    vi.advanceTimersByTime(SETLIST_BANNER_AUTOPLAY_MS)
    await nextTick()
    expect(wrapper.findAll('article')[1]?.attributes('aria-hidden')).toBeUndefined()
    await section.trigger('pointerup', { clientX: 80, clientY: 40, pointerType: 'mouse', button: 0, pointerId: 1 })
    vi.advanceTimersByTime(SETLIST_BANNER_AUTOPLAY_MS - 1)
    await nextTick()
    expect(wrapper.findAll('article')[1]?.attributes('aria-hidden')).toBeUndefined()
    vi.advanceTimersByTime(1)
    await flushSlide()
    expect(wrapper.findAll('article')[0]?.attributes('aria-hidden')).toBeUndefined()

    await section.trigger('keydown', { key: 'Tab', code: 'Tab' })
    vi.advanceTimersByTime(SETLIST_BANNER_AUTOPLAY_MS)
    await nextTick()
    expect(wrapper.findAll('article')[0]?.attributes('aria-hidden')).toBeUndefined()
    await section.trigger('keyup', { key: 'Tab', code: 'Tab' })
    vi.advanceTimersByTime(SETLIST_BANNER_AUTOPLAY_MS)
    await flushSlide()
    expect(wrapper.findAll('article')[1]?.attributes('aria-hidden')).toBeUndefined()

    await wrapper.get('button[aria-label="Next slide"]').trigger('click')
    await flushSlide()
    expect(wrapper.findAll('article')[0]?.attributes('aria-hidden')).toBeUndefined()
    vi.advanceTimersByTime(SETLIST_BANNER_AUTOPLAY_MS)
    await flushSlide()
    expect(wrapper.findAll('article')[1]?.attributes('aria-hidden')).toBeUndefined()
    wrapper.unmount()
  })

  it('does not autoplay when the page is hidden, when reduced motion is requested, or when there is only one slide', async () => {
    const wrapper = render()
    await nextTick()
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
    document.dispatchEvent(new Event('visibilitychange'))
    await nextTick()
    vi.advanceTimersByTime(SETLIST_BANNER_AUTOPLAY_MS)
    await nextTick()
    expect(wrapper.findAll('article')[0]?.attributes('aria-hidden')).toBeUndefined()
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false })
    document.dispatchEvent(new Event('visibilitychange'))
    await nextTick()
    vi.advanceTimersByTime(SETLIST_BANNER_AUTOPLAY_MS)
    await flushSlide()
    expect(wrapper.findAll('article')[1]?.attributes('aria-hidden')).toBeUndefined()
    wrapper.unmount()

    reducedMotion = true
    mockMatchMedia()
    const reduced = render()
    await nextTick()
    expect(reduced.find('button[aria-label="Pause automatic slideshow"]').exists()).toBe(false)
    vi.advanceTimersByTime(SETLIST_BANNER_AUTOPLAY_MS)
    await nextTick()
    expect(reduced.findAll('article')[0]?.attributes('aria-hidden')).toBeUndefined()
    reduced.unmount()

    reducedMotion = false
    mockMatchMedia()
    const single = render(sampleSlides.slice(0, 1))
    await nextTick()
    expect(single.find('button[aria-label="Pause automatic slideshow"]').exists()).toBe(false)
    vi.advanceTimersByTime(SETLIST_BANNER_AUTOPLAY_MS)
    await nextTick()
    expect(single.get('article').attributes('aria-hidden')).toBeUndefined()
    single.unmount()
  })

  it('changes one slide on a horizontal swipe and ignores a vertical drag so the page can scroll', async () => {
    const wrapper = render()
    const region = wrapper.get('[role="region"]')
    expect(region.attributes('style')).toContain('touch-action: pan-y')
    await region.trigger('pointerdown', { clientX: 200, clientY: 80, pointerType: 'touch', button: 0 })
    await region.trigger('pointermove', { clientX: 140, clientY: 82, pointerType: 'touch', button: 0 })
    await region.trigger('pointerup', { clientX: 140, clientY: 82, pointerType: 'touch', button: 0 })
    expect(wrapper.findAll('article')[1]?.attributes('aria-hidden')).toBeUndefined()

    await region.trigger('pointerdown', { clientX: 200, clientY: 80, pointerType: 'touch', button: 0 })
    await region.trigger('pointermove', { clientX: 202, clientY: 160, pointerType: 'touch', button: 0 })
    await region.trigger('pointerup', { clientX: 202, clientY: 160, pointerType: 'touch', button: 0 })
    expect(wrapper.findAll('article')[1]?.attributes('aria-hidden')).toBeUndefined()
    wrapper.unmount()
  })

  it('does not follow the show-page link after a horizontal drag, and does follow a plain click', async () => {
    const wrapper = render()
    const region = wrapper.get('[role="region"]')
    const link = wrapper.get('a[data-carousel-slide-link]')
    expect(link.attributes('href')).toBe('/shows/2')
    expect(link.text()).toContain('View concert details')

    await region.trigger('pointerdown', { clientX: 220, clientY: 90, pointerType: 'touch', button: 0 })
    await region.trigger('pointermove', { clientX: 150, clientY: 92, pointerType: 'touch', button: 0 })
    await region.trigger('pointerup', { clientX: 150, clientY: 92, pointerType: 'touch', button: 0 })
    expect(wrapper.findAll('article')[1]?.attributes('aria-hidden')).toBeUndefined()
    const afterDrag = new MouseEvent('click', { bubbles: true, cancelable: true })
    link.element.dispatchEvent(afterDrag)
    expect(afterDrag.defaultPrevented).toBe(true)

    const afterSettle = wrapper.findAll('article')[1]?.get('a[data-carousel-slide-link]')
    expect(afterSettle?.attributes('href')).toBe('/shows/1')
    const plain = new MouseEvent('click', { bubbles: true, cancelable: true })
    afterSettle?.element.dispatchEvent(plain)
    expect(plain.defaultPrevented).toBe(false)
    wrapper.unmount()
  })

  it('resumes autoplay 5 seconds after a pointer click even if residual focus remains', async () => {
    const wrapper = render()
    await nextTick()
    await wrapper.get('button[aria-label="Next slide"]').trigger('click')
    await flushSlide()
    expect(wrapper.findAll('article')[1]?.attributes('aria-hidden')).toBeUndefined()
    await wrapper.get('section').trigger('focusin')
    vi.advanceTimersByTime(SETLIST_BANNER_AUTOPLAY_MS - 1)
    await nextTick()
    expect(wrapper.findAll('article')[1]?.attributes('aria-hidden')).toBeUndefined()
    vi.advanceTimersByTime(1)
    await flushSlide()
    expect(wrapper.findAll('article')[0]?.attributes('aria-hidden')).toBeUndefined()
    wrapper.unmount()
  })

  it('parks a wrap-around slide on the incoming side before moving, and skips motion when reduced', async () => {
    const wrapper = render()
    await nextTick()
    await wrapper.get('button[aria-label="Previous slide"]').trigger('click')
    await nextTick()
    await nextTick()
    const articles = wrapper.findAll('article')
    expect(articles[1]?.attributes('aria-hidden')).toBeUndefined()
    expect(articles[0]?.attributes('aria-hidden')).toBe('true')
    expect(articles[1]?.attributes('style')).toContain('translateX(calc(0% + 0px))')
    expect(articles[0]?.attributes('style')).toContain('translateX(calc(100% + 0px))')
    wrapper.unmount()

    reducedMotion = true
    mockMatchMedia()
    const reduced = render()
    await nextTick()
    await reduced.get('button[aria-label="Previous slide"]').trigger('click')
    await nextTick()
    const reducedArticles = reduced.findAll('article')
    expect(reducedArticles[1]?.attributes('aria-hidden')).toBeUndefined()
    expect(reducedArticles[1]?.classes()).not.toContain('is-motion')
    reduced.unmount()
  })

  it('shows the empty catalog copy when there are no qualifying updates', () => {
    const wrapper = render([])
    expect(wrapper.text()).toContain('No recently held concerts with a setlist to show yet.')
    expect(wrapper.find('[role="region"]').exists()).toBe(false)
    wrapper.unmount()
  })
})
