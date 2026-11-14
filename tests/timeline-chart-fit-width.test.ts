// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'
import { computed, defineComponent, provide, ref } from 'vue'
import { mount } from '@vue/test-utils'
import TimelineBarChart from '../app/components/TimelineBarChart.vue'
import TimelineGantt from '../app/components/TimelineGantt.vue'
import { chartLayoutKey } from '../shared/chart-layout.ts'

vi.mock('~/composables/useElementWidth.ts', () => ({
  useElementWidth: () => ({
    widthAnchor: ref(null),
    elementWidth: ref(390),
    elementHeight: ref(480),
  }),
}))

vi.mock('~/composables/useLocale.ts', () => ({
  useLocale: () => ({ t: (key: string) => key }),
}))

const bars = [{ key: 'series:a', label: 'Series A', color: '#39C5BB', values: [3, 1] }]
const ganttRows = [
  { key: 'series:a', label: 'Series A', color: '#39C5BB', first: 2020, last: 2021, count: 2 },
]

/** Mounts a chart as a card would: provided layout plus the usual years. */
const renderBar = (fitToContainer: boolean) => {
  const Host = defineComponent({
    components: { TimelineBarChart },
    setup: () => {
      provide(chartLayoutKey, computed(() => ({ fitToContainer })))
      return { bars }
    },
    template: '<TimelineBarChart :years="[2020, 2021]" :bars="bars" unit="shows" />',
  })
  return mount(Host, { attachTo: document.body })
}

/** Mounts the gantt with the same provided layout. */
const renderGantt = (fitToContainer: boolean) => {
  const Host = defineComponent({
    components: { TimelineGantt },
    setup: () => {
      provide(chartLayoutKey, computed(() => ({ fitToContainer })))
      return { rows: ganttRows }
    },
    template: '<TimelineGantt :years="[2020, 2021]" :rows="rows" />',
  })
  return mount(Host, { attachTo: document.body })
}

describe('timeline charts fitted to a narrow container', () => {
  it('sizes a bar chart to the container and drops horizontal scrolling when fitted', async () => {
    const wrapper = renderBar(true)
    await wrapper.vm.$nextTick()
    const svg = wrapper.get('svg')
    expect(Number(svg.attributes('width'))).toBe(390)
    expect(Number(svg.attributes('height'))).toBe(480)
    const overflow = wrapper.findAll('div').filter((node) => node.classes().includes('overflow-x-hidden'))
    expect(overflow.length).toBeGreaterThan(0)
    expect(wrapper.findAll('div').filter((node) => node.classes().includes('overflow-x-auto')).length).toBe(0)
  })

  it('keeps the usual overflow minimum when the card is not fullscreen', async () => {
    const wrapper = renderBar(false)
    await wrapper.vm.$nextTick()
    expect(Number(wrapper.get('svg').attributes('width'))).toBe(720)
    expect(wrapper.findAll('div').filter((node) => node.classes().includes('overflow-x-auto')).length).toBeGreaterThan(0)
    expect(wrapper.findAll('div').filter((node) => node.classes().includes('overflow-x-hidden')).length).toBe(0)
  })

  it('sizes a gantt to the container and drops horizontal scrolling when fitted', async () => {
    const wrapper = renderGantt(true)
    await wrapper.vm.$nextTick()
    expect(Number(wrapper.get('svg').attributes('width'))).toBe(390)
    expect(wrapper.findAll('div').filter((node) => node.classes().includes('overflow-x-hidden')).length).toBeGreaterThan(0)
    expect(wrapper.findAll('div').filter((node) => node.classes().includes('overflow-x-auto')).length).toBe(0)
  })
})
