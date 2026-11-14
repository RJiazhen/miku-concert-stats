// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, inject } from 'vue'
import { mount } from '@vue/test-utils'
import TimelineChartCard from '../app/components/TimelineChartCard.vue'
import { chartLayoutKey } from '../shared/chart-layout.ts'

vi.mock('~/composables/useLocale.ts', () => ({
  useLocale: () => ({
    t: (key: string) => key,
  }),
}))

const layoutProbe = defineComponent({
  setup: () => {
    const layout = inject(chartLayoutKey, null)
    return { layout }
  },
  template: '<div class="probe">{{ layout?.fitToContainer ? "fit" : "scroll" }}</div>',
})

const setViewport = (width: number, height: number): void => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width })
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height })
}

/** Mounts a card with a probe child that reports the provided layout. */
const renderCard = () =>
  mount(TimelineChartCard, {
    props: { title: 'Shows / series', note: 'A note' },
    slots: {
      default: layoutProbe,
      footer: '<p class="year-details">details</p>',
      actions: '<label class="focus-filter">Focus series</label>',
    },
    global: {
      stubs: {
        UCard: {
          template: '<div class="card"><slot name="header" /><slot /><slot name="footer" /></div>',
        },
        UButton: {
          inheritAttrs: false,
          template: '<button type="button" v-bind="$attrs"><slot /></button>',
        },
        Teleport: true,
      },
    },
    attachTo: document.body,
  })

describe('TimelineChartCard fullscreen', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    document.body.style.overflow = ''
    setViewport(1280, 800)
  })

  it('opens a dialog from the touch-safe button and tells the plot to fit the container', async () => {
    const wrapper = renderCard()
    const open = wrapper.get('button[aria-label="chart.fullscreenOpen"]')
    expect(open.attributes('aria-expanded')).toBe('false')
    expect(open.attributes('aria-haspopup')).toBe('dialog')
    expect(wrapper.find('.probe').text()).toBe('scroll')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(wrapper.get('h2').text()).toBe('Shows / series')
    expect(wrapper.get('.focus-filter').text()).toBe('Focus series')
    expect(wrapper.get('.year-details').text()).toBe('details')

    await open.trigger('click')
    await wrapper.vm.$nextTick()

    const dialog = wrapper.get('[role="dialog"]')
    expect(dialog.attributes('aria-modal')).toBe('true')
    expect(dialog.attributes('aria-label')).toBe('chart.fullscreenDialog')
    expect(wrapper.find('.probe').text()).toBe('fit')
    expect(wrapper.get('button[aria-label="chart.fullscreenClose"]').attributes('aria-expanded')).toBe('true')
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('shows only the plotting area in fullscreen, keeping title, filters, and notes on the card', async () => {
    const wrapper = renderCard()
    await wrapper.get('button[aria-label="chart.fullscreenOpen"]').trigger('click')
    await wrapper.vm.$nextTick()

    const dialog = wrapper.get('[role="dialog"]')
    expect(dialog.find('h2').exists()).toBe(false)
    expect(dialog.text()).not.toContain('A note')
    expect(dialog.find('.focus-filter').exists()).toBe(false)
    expect(dialog.find('.year-details').exists()).toBe(false)
    expect(dialog.find('.probe').exists()).toBe(true)
    const close = dialog.get('[data-chart-fullscreen-toolbar] button[aria-label="chart.fullscreenClose"]')
    expect(close.exists()).toBe(true)
    const plot = dialog.get('[data-chart-fullscreen-plot]')
    expect(plot.element.contains(close.element)).toBe(false)
    expect(dialog.get('[data-chart-fullscreen-toolbar]').element.contains(plot.element)).toBe(false)
  })

  it('overlays download and open controls on the in-page chart top-right', () => {
    const wrapper = renderCard()
    const controls = wrapper.get('[data-chart-export-controls]')
    expect(controls.classes()).toEqual(expect.arrayContaining([
      'absolute',
      'top-0',
      'right-0',
    ]))
    const download = wrapper.get('[data-chart-export-control="page"]')
    const open = wrapper.get('button[aria-label="chart.fullscreenOpen"]')
    expect(download.attributes('aria-label')).toBe('chart.downloadJpeg')
    expect(download.element.compareDocumentPosition(open.element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(wrapper.get('[data-chart-export-root]').element.contains(controls.element)).toBe(false)
    expect(wrapper.get('[data-chart-export-root]').classes().some((name) => name.includes('pr-[5.75rem]'))).toBe(true)
  })

  it('keeps fullscreen chrome overlaid on the plot stage with legend clearance and left padding', async () => {
    const wrapper = renderCard()
    await wrapper.get('button[aria-label="chart.fullscreenOpen"]').trigger('click')
    await wrapper.vm.$nextTick()

    const stage = wrapper.get('[data-chart-fullscreen-stage]')
    expect(stage.classes()).toEqual(expect.arrayContaining(['relative', 'pl-3']))
    const toolbar = wrapper.get('[data-chart-fullscreen-toolbar]')
    expect(toolbar.classes()).toEqual(expect.arrayContaining(['absolute', 'top-1', 'right-1']))
    expect(stage.element.contains(toolbar.element)).toBe(true)
    const plot = wrapper.get('[data-chart-fullscreen-plot]')
    expect(plot.element.contains(toolbar.element)).toBe(false)
    expect(plot.classes().some((name) => name.includes('pr-[5.75rem]'))).toBe(true)
  })

  it('fills the remaining space without a CSS rotate fallback', async () => {
    const desktop = renderCard()
    await desktop.get('button[aria-label="chart.fullscreenOpen"]').trigger('click')
    await desktop.vm.$nextTick()
    expect(desktop.get('[data-chart-fullscreen-plot]').attributes('style') ?? '').not.toContain('rotate(')
    desktop.unmount()

    setViewport(390, 844)
    const mobile = renderCard()
    await mobile.get('button[aria-label="chart.fullscreenOpen"]').trigger('click')
    await mobile.vm.$nextTick()
    expect(mobile.get('[data-chart-fullscreen-plot]').attributes('style') ?? '').not.toContain('rotate(')
    mobile.unmount()
  })

  it('exits fullscreen from the close button and from Escape', async () => {
    const wrapper = renderCard()
    await wrapper.get('button[aria-label="chart.fullscreenOpen"]').trigger('click')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)

    await wrapper.get('button[aria-label="chart.fullscreenClose"]').trigger('click')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(wrapper.find('.probe').text()).toBe('scroll')
    expect(document.body.style.overflow).toBe('')
    expect(wrapper.get('h2').text()).toBe('Shows / series')

    await wrapper.get('button[aria-label="chart.fullscreenOpen"]').trigger('click')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(document.body.style.overflow).toBe('')
  })
})
