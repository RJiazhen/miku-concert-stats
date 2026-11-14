// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import TimelineBarChart from '../app/components/TimelineBarChart.vue'

vi.mock('~/composables/useElementWidth.ts', () => ({
  useElementWidth: () => ({ widthAnchor: ref(null), elementWidth: ref(1200) }),
}))

vi.mock('~/composables/useLocale.ts', () => ({
  useLocale: () => ({ t: (key: string, params?: Record<string, unknown>) => `${key}${params ? `:${JSON.stringify(params)}` : ''}` }),
}))

const bars = [
  { key: 'series:81', label: 'Series A', color: '#39C5BB', values: [1, 2] },
  { key: 'series:82', label: 'Series B', color: '#E12885', values: [1, 1] },
]

/** Wrapper helper that renders the chart with two years and two stacked series. */
const renderChart = (props: Record<string, unknown> = {}) =>
  mount(TimelineBarChart, {
    props: { years: [2020, 2021], bars, stacked: true, unit: 'shows', ...props },
    attachTo: document.body,
  })

describe('TimelineBarChart selectableBars', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('renders bar segments as clickable buttons by default', () => {
    const wrapper = renderChart()
    const groups = wrapper.findAll('[role="button"]')
    expect(groups.length).toBeGreaterThan(0)
    for (const group of groups) {
      expect(group.classes()).toContain('cursor-pointer')
      expect(group.attributes('tabindex')).toBe('0')
    }
  })

  it('removes button affordances when selectableBars is false, but bars stay clickable like the band', async () => {
    const wrapper = renderChart({ selectableBars: false })
    await wrapper.vm.$nextTick()

    expect(wrapper.findAll('[role="button"]').length).toBe(0)
    const groups = wrapper.findAll('g')
    const titled = groups.filter((group) => group.find('title').exists())
    expect(titled.length).toBeGreaterThan(0)
    for (const group of titled) {
      expect(group.classes()).toContain('cursor-pointer')
      expect(group.attributes('tabindex')).toBeUndefined()
      expect(group.attributes('role')).toBeUndefined()
    }
  })

  it('keeps the band background clickable so the year list can still toggle', async () => {
    const wrapper = renderChart({ selectableBars: false })
    await wrapper.vm.$nextTick()

    const bands = wrapper.findAll('rect[fill="transparent"]')
    expect(bands.length).toBe(2)
    for (const band of bands) {
      expect(band.classes()).toContain('cursor-pointer')
    }
  })

  it('emits the same year-only select for a bar click and a blank-band click when selectableBars is false', async () => {
    const expected = [[{ year: 2020, key: '' }]]

    const bandChart = renderChart({ selectableBars: false })
    await bandChart.vm.$nextTick()
    await bandChart.find('rect[fill="transparent"]').trigger('click')
    expect(bandChart.emitted('select')).toEqual(expected)

    const barChart = renderChart({ selectableBars: false })
    await barChart.vm.$nextTick()
    const bar = barChart.findAll('g').find((item) => item.find('title').exists())
    expect(bar).toBeTruthy()
    await bar!.trigger('click')
    expect(barChart.emitted('select')).toEqual(expected)
    expect(barChart.emitted('select')).toHaveLength(1)
  })

  it('emits select with an empty key when the band background is clicked', async () => {
    const wrapper = renderChart({ selectableBars: false })
    await wrapper.vm.$nextTick()

    const band = wrapper.find('rect[fill="transparent"]')
    await band.trigger('click')
    expect(wrapper.emitted('select')).toEqual([[{ year: 2020, key: '' }]])
  })

  it('emits select with the series key when a bar is clicked by default', async () => {
    const wrapper = renderChart()
    const group = wrapper.findAll('g').find((item) => item.find('title').exists())
    expect(group).toBeTruthy()
    await group!.trigger('click')
    expect(wrapper.emitted('select')).toEqual([[{ year: 2020, key: 'series:81' }]])
  })

  it('keeps hover tooltips on bar segments when selectableBars is false', async () => {
    const wrapper = renderChart({ selectableBars: false })
    await wrapper.vm.$nextTick()
    const titles = wrapper.findAll('title')
    expect(titles.length).toBeGreaterThan(0)
    expect(titles[0]!.text().length).toBeGreaterThan(0)
  })

  it('emits the same year-only select for a line point as for the blank band when selectableBars is false', async () => {
    const wrapper = renderChart({
      selectableBars: false,
      lines: [{ key: 'line:total', label: 'Total', color: '#111111', values: [2, 3] }],
    })
    await wrapper.vm.$nextTick()

    const groups = wrapper.findAll('g').filter((group) => group.find('circle').exists())
    expect(groups.length).toBeGreaterThan(0)
    for (const group of groups) {
      expect(group.classes()).toContain('cursor-pointer')
      expect(group.attributes('role')).toBeUndefined()
      expect(group.attributes('tabindex')).toBeUndefined()
    }
    await groups[0]!.trigger('click')
    expect(wrapper.emitted('select')).toEqual([[{ year: 2020, key: '' }]])
    expect(wrapper.emitted('select')).toHaveLength(1)
  })

  it('does not apply a persistent selected color after a bar click', async () => {
    const wrapper = renderChart({ selectableBars: false })
    await wrapper.vm.$nextTick()
    const bar = wrapper.findAll('g').find((item) => item.find('title').exists())
    expect(bar).toBeTruthy()
    const fillBefore = bar!.find('rect').attributes('fill')
    expect(fillBefore).toBe('#39C5BB')
    await bar!.trigger('click')
    const fillAfter = bar!.find('rect').attributes('fill')
    expect(fillAfter).toBe(fillBefore)
    expect(bar!.classes().join(' ')).not.toMatch(/selected|active/)
    expect(wrapper.findAll('.selected, [data-selected], [aria-selected="true"]').length).toBe(0)
  })
})
