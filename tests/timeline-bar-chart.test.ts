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

  it('removes click navigation and button affordances when selectableBars is false', async () => {
    const wrapper = renderChart({ selectableBars: false })
    await wrapper.vm.$nextTick()

    // No bar segment should carry button semantics or a pointer cursor.
    expect(wrapper.findAll('[role="button"]').length).toBe(0)
    const groups = wrapper.findAll('g')
    const titled = groups.filter((group) => group.find('title').exists())
    expect(titled.length).toBeGreaterThan(0)
    for (const group of titled) {
      expect(group.classes()).not.toContain('cursor-pointer')
      expect(group.attributes('tabindex')).toBeUndefined()
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

  it('does not emit select for bar segments when selectableBars is false', async () => {
    const wrapper = renderChart({ selectableBars: false })
    await wrapper.vm.$nextTick()

    const groups = wrapper.findAll('g')
    const titled = groups.filter((group) => group.find('title').exists())
    expect(titled.length).toBeGreaterThan(0)

    for (const group of titled) {
      await group.trigger('click')
    }
    expect(wrapper.emitted('select')).toBeUndefined()
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

  it('removes click navigation from line points when selectableBars is false', async () => {
    const wrapper = renderChart({
      selectableBars: false,
      lines: [{ key: 'line:total', label: 'Total', color: '#111111', values: [2, 3] }],
    })
    await wrapper.vm.$nextTick()

    const points = wrapper.findAll('circle')
    expect(points.length).toBeGreaterThan(0)
    const groups = wrapper.findAll('g').filter((group) => group.find('circle').exists())
    for (const group of groups) {
      expect(group.classes()).not.toContain('cursor-pointer')
      expect(group.attributes('role')).toBeUndefined()
      await group.trigger('click')
    }
    expect(wrapper.emitted('select')).toBeUndefined()
  })
})
