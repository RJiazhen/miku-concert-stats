// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import TimelineBarChart from '../app/components/TimelineBarChart.vue'
import {
  cityYearDetail,
  performancesOfYear,
  positiveCharacterYearRows,
} from '../shared/timeline-year-details.ts'
import type { TimelineCharacterSongYear, TimelineCityYear, TimelinePerformance } from '../shared/timeline.ts'

vi.mock('~/composables/useElementWidth.ts', () => ({
  useElementWidth: () => ({ widthAnchor: ref(null), elementWidth: ref(1200) }),
}))

vi.mock('~/composables/useLocale.ts', () => ({
  useLocale: () => ({ t: (key: string, params?: Record<string, unknown>) => `${key}${params ? `:${JSON.stringify(params)}` : ''}` }),
}))

/** Sparse stacked bars: year 2020 has A only; year 2021 has A and B; C stays zero/absent. */
const sparseBars = [
  { key: 'series:a', label: 'Series A', color: '#39C5BB', values: [3, 1] },
  { key: 'series:b', label: 'Series B', color: '#E12885', values: [0, 2] },
  { key: 'series:c', label: 'Series C', color: '#F59E0B', values: [0, 0] },
]

/** Mounts the chart with two years and optional line overlays. */
const renderChart = (props: Record<string, unknown> = {}) =>
  mount(TimelineBarChart, {
    props: { years: [2020, 2021], bars: sparseBars, stacked: true, unit: 'shows', ...props },
    attachTo: document.body,
  })

/** Text of the year hover strip (excludes the always-visible legend). */
const hoverStripText = (wrapper: ReturnType<typeof renderChart>): string => {
  const strip = wrapper.findAll('div').find((node) => node.classes().includes('min-h-5'))
  return strip?.text() ?? ''
}

describe('TimelineBarChart hoverValues hide zeros', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('lists only positive series on hover and keeps stacked bar segments for positive values', async () => {
    const wrapper = renderChart()
    const bands = wrapper.findAll('rect[fill="transparent"]')
    expect(bands.length).toBe(2)

    await bands[0]!.trigger('mouseenter')
    const hoverText = hoverStripText(wrapper)
    expect(hoverText).toContain('Series A')
    expect(hoverText).toMatch(/Series A\s+3\b/)
    expect(hoverText).not.toContain('Series B')
    expect(hoverText).not.toContain('Series C')

    // Zero / absent series are not drawn as stacked segments; positive ones remain.
    const barKeys = wrapper.findAll('g[role="button"]').map((group) => group.find('title').text())
    expect(barKeys.some((title) => title.includes('Series A') && title.includes('2020'))).toBe(true)
    expect(barKeys.some((title) => title.includes('Series B') && title.includes('2020'))).toBe(false)
    expect(barKeys.filter((title) => title.includes('2020')).length).toBe(1)
    expect(barKeys.filter((title) => title.includes('2021')).length).toBe(2)
  })

  it('omits zero or absent line points from the hover strip while keeping positive ones', async () => {
    /** Year 2021 intentionally missing so `values[1]` is absent rather than zero. */
    const shareValues: number[] = []
    shareValues[0] = 0.5
    const wrapper = renderChart({
      lines: [{ key: 'line:total', label: 'Total', color: '#111111', values: [3, 0] }],
      rightLines: [{ key: 'line:share', label: 'Share', color: '#222222', values: shareValues }],
      rightUnit: '%',
    })
    const bands = wrapper.findAll('rect[fill="transparent"]')

    await bands[0]!.trigger('mouseenter')
    let hoverText = hoverStripText(wrapper)
    expect(hoverText).toContain('Series A')
    expect(hoverText).toContain('Total')
    expect(hoverText).toContain('Share')
    expect(hoverText).not.toContain('Series B')

    await bands[1]!.trigger('mouseenter')
    hoverText = hoverStripText(wrapper)
    expect(hoverText).toContain('Series A')
    expect(hoverText).toContain('Series B')
    expect(hoverText).not.toContain('Total')
    expect(hoverText).not.toContain('Share')
  })

  it('still emits year select from the band when every series is zero that year', async () => {
    const wrapper = renderChart({
      bars: [
        { key: 'series:a', label: 'Series A', color: '#39C5BB', values: [0, 1] },
        { key: 'series:b', label: 'Series B', color: '#E12885', values: [0, 2] },
      ],
    })
    const band = wrapper.findAll('rect[fill="transparent"]')[0]!
    await band.trigger('mouseenter')
    const hoverText = hoverStripText(wrapper)
    expect(hoverText).toContain('common.year')
    expect(hoverText).not.toContain('Series A')
    expect(hoverText).not.toContain('Series B')

    await band.trigger('click')
    expect(wrapper.emitted('select')).toEqual([[{ year: 2020, key: '' }]])
  })
})

describe('timeline year-detail footers hide empty rows', () => {
  /** Fixture performances spanning a data year and a gap year with no shows. */
  const performances: TimelinePerformance[] = [
    { id: 1, year: 2020, seriesId: 81, startDate: '2020-08-01', shows: 2 },
    { id: 2, year: 2020, seriesId: 82, startDate: '2020-12-01', shows: 1 },
  ]

  /** Character buckets including a zero count for the selected year. */
  const characterRows: TimelineCharacterSongYear[] = [
    { year: 2020, name: '初音ミク', count: 5 },
    { year: 2020, name: '鏡音リン', count: 0 },
    { year: 2020, name: '巡音ルカ', count: 2 },
    { year: 2021, name: '初音ミク', count: 1 },
  ]

  /** City partitions: one year with coverage, one all-zero gap, one missing. */
  const cityRows: TimelineCityYear[] = [
    {
      year: 2020,
      cities: 3,
      newCities: 1,
      domestic: 2,
      overseas: 1,
      online: 0,
      unknownCountry: 0,
      overseasRatio: 1 / 3,
    },
    {
      year: 2021,
      cities: 0,
      newCities: 0,
      domestic: 0,
      overseas: 0,
      online: 0,
      unknownCountry: 0,
      overseasRatio: null,
    },
  ]

  it('lists performances only for years that have shows; gap years stay empty for the footer', () => {
    expect(performancesOfYear(performances, 2020).map((row) => row.id)).toEqual([1, 2])
    expect(performancesOfYear(performances, 2021)).toEqual([])
    expect(performancesOfYear(performances, null)).toEqual([])
  })

  it('lists only positive character counts for the selected year', () => {
    expect(positiveCharacterYearRows(characterRows, 2020).map((row) => row.name)).toEqual([
      '初音ミク',
      '巡音ルカ',
    ])
    expect(positiveCharacterYearRows(characterRows, 2021).map((row) => ({ name: row.name, count: row.count }))).toEqual([
      { name: '初音ミク', count: 1 },
    ])
    expect(positiveCharacterYearRows(characterRows, null)).toEqual([])
  })

  it('returns city detail only when a year has a non-empty partition total', () => {
    expect(cityYearDetail(cityRows, 2020)?.year).toBe(2020)
    expect(cityYearDetail(cityRows, 2021)).toBeNull()
    expect(cityYearDetail(cityRows, 2022)).toBeNull()
    expect(cityYearDetail(cityRows, null)).toBeNull()
  })
})
