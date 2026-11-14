// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, inject } from 'vue'
import { mount } from '@vue/test-utils'
import TimelineChartCard from '../app/components/TimelineChartCard.vue'
import { chartLayoutKey } from '../shared/chart-layout.ts'
import { exportChartToJpeg, triggerJpegDownload } from '../shared/chart-export.ts'

vi.mock('~/composables/useLocale.ts', () => ({
  useLocale: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('../shared/chart-export.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../shared/chart-export.ts')>()
  return {
    ...actual,
    exportChartToJpeg: vi.fn(async () => new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: 'image/jpeg' })),
    triggerJpegDownload: vi.fn(),
  }
})

const layoutProbe = defineComponent({
  setup: () => {
    const layout = inject(chartLayoutKey, null)
    return { layout }
  },
  template:
    '<div class="probe"><svg width="40" height="20"></svg>{{ layout?.fitToContainer ? "fit" : "scroll" }}</div>',
})

/** Mounts a card with a parent click listener used to detect event leaks. */
const renderCard = () => {
  const parentClicks: string[] = []
  const wrapper = mount(TimelineChartCard, {
    props: { title: 'Shows / series', note: 'A note' },
    slots: { default: layoutProbe },
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
  wrapper.element.addEventListener('click', () => {
    parentClicks.push('click')
  })
  wrapper.element.addEventListener('pointerdown', () => {
    parentClicks.push('pointerdown')
  })
  wrapper.element.addEventListener('mousedown', () => {
    parentClicks.push('mousedown')
  })
  return { wrapper, parentClicks }
}

describe('TimelineChartCard JPEG export control', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    document.body.style.overflow = ''
    vi.mocked(exportChartToJpeg).mockClear()
    vi.mocked(triggerJpegDownload).mockClear()
  })

  it('places a hover-only desktop control at the top-right of the in-page chart container', () => {
    const { wrapper } = renderCard()
    const surface = wrapper.get('[data-chart-export-surface]')
    expect(surface.classes()).toContain('group/chart')
    const controls = wrapper.get('[data-chart-export-controls]')
    expect(controls.classes()).toEqual(expect.arrayContaining([
      'absolute',
      'top-0',
      'right-0',
      'md:opacity-0',
      'md:group-hover/chart:opacity-100',
      'md:group-focus-within/chart:opacity-100',
    ]))
    const button = wrapper.get('[data-chart-export-control="page"]')
    expect(button.attributes('aria-label')).toBe('chart.downloadJpeg')
    expect(wrapper.find('[data-chart-export-control="fullscreen"]').exists()).toBe(false)
  })

  it('keeps the in-page control outside the plot and always present in the markup for narrow viewports', () => {
    const { wrapper } = renderCard()
    const root = wrapper.get('[data-chart-export-root]').element
    const controls = wrapper.get('[data-chart-export-controls]').element
    expect(root.contains(controls)).toBe(false)
    // Mobile visibility is "always on": opacity utilities are md:-prefixed only.
    expect(wrapper.get('[data-chart-export-controls]').classes().some((name) => name === 'opacity-0')).toBe(false)
  })

  it('moves the control into the reserved fullscreen chrome and does not leave a plot-overlapping row', async () => {
    const { wrapper } = renderCard()
    await wrapper.get('button[aria-label="chart.fullscreenOpen"]').trigger('click')
    expect(wrapper.find('[data-chart-export-controls]').exists()).toBe(false)
    expect(wrapper.find('[data-chart-export-control="page"]').exists()).toBe(false)
    const toolbarButton = wrapper.get('[data-chart-fullscreen-toolbar] [data-chart-export-control="fullscreen"]')
    expect(toolbarButton.attributes('aria-label')).toBe('chart.downloadJpeg')
    const close = wrapper.get('button[aria-label="chart.fullscreenClose"]').element
    expect(toolbarButton.element.compareDocumentPosition(close) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    const plot = wrapper.get('[data-chart-fullscreen-plot]').element
    expect(plot.contains(toolbarButton.element)).toBe(false)
    expect(plot.contains(close)).toBe(false)
    expect(wrapper.find('.probe').text()).toContain('fit')
  })

  it('stops export clicks and pointer-downs from bubbling to the chart card', async () => {
    const { wrapper, parentClicks } = renderCard()
    const button = wrapper.get('[data-chart-export-control="page"]')
    await button.trigger('pointerdown')
    await button.trigger('mousedown')
    await button.trigger('click')
    expect(parentClicks).toEqual([])
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(exportChartToJpeg).toHaveBeenCalled()
    expect(triggerJpegDownload).toHaveBeenCalledWith(expect.any(Blob), 'Shows-series.jpg')
  })

  it('does not toggle fullscreen when the in-dialog export control is activated', async () => {
    const { wrapper, parentClicks } = renderCard()
    await wrapper.get('button[aria-label="chart.fullscreenOpen"]').trigger('click')
    parentClicks.length = 0
    await wrapper.get('[data-chart-export-control="fullscreen"]').trigger('click')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
    expect(parentClicks).toEqual([])
    expect(exportChartToJpeg).toHaveBeenCalled()
    expect(triggerJpegDownload).toHaveBeenCalledWith(expect.any(Blob), 'Shows-series.jpg')
  })
})
