import { describe, expect, it } from 'vitest'
import { chartDrawingWidth, chartOverflowClass } from '../shared/chart-layout.ts'

describe('chartDrawingWidth', () => {
  it('keeps the usual minimum and per-year floor when not fitting the container', () => {
    expect(
      chartDrawingWidth({ fitToContainer: false, elementWidth: 390, minWidth: 720, slotPixels: 800 }),
    ).toBe(800)
    expect(
      chartDrawingWidth({ fitToContainer: false, elementWidth: 390, minWidth: 720, slotPixels: 400 }),
    ).toBe(720)
    expect(
      chartDrawingWidth({ fitToContainer: false, elementWidth: 900, minWidth: 720, slotPixels: 400 }),
    ).toBe(900)
  })

  it('uses only the measured container width when fitting, so a narrow viewport does not force overflow', () => {
    expect(
      chartDrawingWidth({ fitToContainer: true, elementWidth: 390, minWidth: 720, slotPixels: 800 }),
    ).toBe(390)
  })

  it('falls back to the usual floor when the container has not been measured yet', () => {
    expect(
      chartDrawingWidth({ fitToContainer: true, elementWidth: 0, minWidth: 720, slotPixels: 400 }),
    ).toBe(720)
  })
})

describe('chartOverflowClass', () => {
  it('disables horizontal scrolling when the drawing is fitted to the container', () => {
    expect(chartOverflowClass(true)).toContain('overflow-x-hidden')
    expect(chartOverflowClass(true)).not.toContain('overflow-x-auto')
    expect(chartOverflowClass(false)).toContain('overflow-x-auto')
    expect(chartOverflowClass(false)).not.toContain('overflow-x-hidden')
  })
})
