// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import {
  JPEG_BACKGROUND_FALLBACK,
  JPEG_BACKGROUND_FALLBACK_DARK,
  JPEG_MIME,
  chartExportContentSize,
  chartExportFilename,
  intrinsicSvgSize,
  isJpegBytes,
  isTransparentCssColor,
  offsetInExportRoot,
  paintSolidJpegBackground,
  resolvePaintColor,
  solidCssColor,
  themeJpegBackgroundFallback,
} from '../shared/chart-export.ts'
import timeline from '../i18n/modules/timeline.ts'

describe('chart JPEG export helpers', () => {
  it('builds a .jpg filename from the chart title, active filters, and empty fallback', () => {
    expect(chartExportFilename('场次数年度变化')).toBe('场次数年度变化.jpg')
    expect(chartExportFilename('Shows / series')).toBe('Shows-series.jpg')
    expect(chartExportFilename('  ')).toBe('chart.jpg')
    expect(chartExportFilename('场次数年度变化', ['初音ミク', '2019–2024'])).toBe('场次数年度变化-初音ミク-2019-2024.jpg')
  })

  it('uses a theme-aware solid fallback when the background is missing or transparent', () => {
    expect(solidCssColor('rgb(255, 255, 255)')).toBe('rgb(255, 255, 255)')
    expect(solidCssColor('transparent')).toBe(JPEG_BACKGROUND_FALLBACK)
    expect(solidCssColor('rgba(0, 0, 0, 0)')).toBe(JPEG_BACKGROUND_FALLBACK)
    expect(solidCssColor(null)).toBe(JPEG_BACKGROUND_FALLBACK)
    expect(solidCssColor('transparent', JPEG_BACKGROUND_FALLBACK_DARK)).toBe(JPEG_BACKGROUND_FALLBACK_DARK)
    expect(JPEG_BACKGROUND_FALLBACK).toBe('#ffffff')
    expect(isTransparentCssColor('rgba(5, 7, 13, 0)')).toBe(true)
    document.documentElement.classList.remove('dark')
    expect(themeJpegBackgroundFallback()).toBe('#ffffff')
    document.documentElement.classList.add('dark')
    expect(themeJpegBackgroundFallback()).toBe(JPEG_BACKGROUND_FALLBACK_DARK)
    document.documentElement.classList.remove('dark')
  })

  it('resolves CSS-variable paint through computed style for canvas and SVG export', () => {
    const swatch = document.createElement('span')
    swatch.style.backgroundColor = 'rgb(57, 197, 187)'
    document.body.append(swatch)
    expect(resolvePaintColor('var(--color-miku-400)', swatch, 'backgroundColor', '#888888')).toBe('rgb(57, 197, 187)')
    expect(resolvePaintColor('rgb(225, 40, 133)', swatch, 'backgroundColor', '#888888')).toBe('rgb(225, 40, 133)')
    swatch.remove()
  })

  it('recognizes real JPEG bytes by the start-of-image marker and requires the JPEG mime', () => {
    expect(JPEG_MIME).toBe('image/jpeg')
    expect(isJpegBytes(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe(true)
    expect(isJpegBytes(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe(false)
    expect(isJpegBytes(new Uint8Array([0xff, 0xd8]))).toBe(false)
  })

  it('fills the solid background on the canvas before any later drawing', () => {
    const calls: string[] = []
    const context = {
      fillStyle: '',
      fillRect: (_x: number, _y: number, width: number, height: number) => {
        calls.push(`fillRect:${context.fillStyle}:${width}x${height}`)
      },
    }
    paintSolidJpegBackground(context as unknown as CanvasRenderingContext2D, 320, 180, '')
    expect(calls).toEqual(['fillRect:#ffffff:320x180'])
  })

  it('provides a download label in every current UI locale', () => {
    const labels = timeline['chart.downloadJpeg']
    expect(labels.zh.length).toBeGreaterThan(0)
    expect(labels['zh-Hant'].length).toBeGreaterThan(0)
    expect(labels.ja.length).toBeGreaterThan(0)
    expect(labels.en.length).toBeGreaterThan(0)
  })
})

describe('chart JPEG export uses the full natural drawing', () => {
  it('prefers the SVG width and viewBox over a smaller visible client box', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('width', '902')
    svg.setAttribute('height', '260')
    svg.setAttribute('viewBox', '0 0 902 260')
    Object.defineProperty(svg, 'clientWidth', { configurable: true, value: 326 })
    Object.defineProperty(svg, 'clientHeight', { configurable: true, value: 260 })
    expect(intrinsicSvgSize(svg)).toEqual({ width: 902, height: 260 })
  })

  it('sizes the export to the overflowed SVG, not the visible card width', () => {
    const root = document.createElement('div')
    Object.defineProperty(root, 'clientWidth', { configurable: true, value: 326 })
    Object.defineProperty(root, 'clientHeight', { configurable: true, value: 360 })
    Object.defineProperty(root, 'scrollWidth', { configurable: true, value: 330 })
    Object.defineProperty(root, 'scrollHeight', { configurable: true, value: 360 })
    root.getBoundingClientRect = () => ({ width: 326, height: 360, top: 0, left: 0, bottom: 360, right: 326, x: 0, y: 0, toJSON: () => ({}) })

    const overflow = document.createElement('div')
    Object.defineProperty(overflow, 'clientWidth', { configurable: true, value: 334 })
    Object.defineProperty(overflow, 'clientHeight', { configurable: true, value: 260 })
    Object.defineProperty(overflow, 'scrollWidth', { configurable: true, value: 910 })
    Object.defineProperty(overflow, 'scrollHeight', { configurable: true, value: 260 })
    overflow.getBoundingClientRect = () => ({ width: 334, height: 260, top: 100, left: 0, bottom: 360, right: 334, x: 0, y: 100, toJSON: () => ({}) })

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('width', '902')
    svg.setAttribute('height', '260')
    svg.setAttribute('viewBox', '0 0 902 260')
    Object.defineProperty(svg, 'clientWidth', { configurable: true, value: 326 })
    Object.defineProperty(svg, 'clientHeight', { configurable: true, value: 260 })
    svg.getBoundingClientRect = () => ({ width: 326, height: 260, top: 100, left: 0, bottom: 360, right: 326, x: 0, y: 100, toJSON: () => ({}) })

    overflow.append(svg)
    root.append(overflow)
    document.body.append(root)

    const size = chartExportContentSize(root)
    expect(size.width).toBeGreaterThanOrEqual(902)
    expect(size.height).toBeGreaterThanOrEqual(360)
    root.remove()
  })

  it('restores overflow scroll so a scrolled chart still starts at the first year', () => {
    const root = document.createElement('div')
    root.getBoundingClientRect = () => ({ width: 326, height: 260, top: 0, left: 0, bottom: 260, right: 326, x: 0, y: 0, toJSON: () => ({}) })
    const overflow = document.createElement('div')
    overflow.scrollLeft = 200
    overflow.scrollTop = 0
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    // Visible box starts 200px to the left of the clip when scrollLeft is 200.
    svg.getBoundingClientRect = () => ({ width: 902, height: 260, top: 0, left: -200, bottom: 260, right: 702, x: -200, y: 0, toJSON: () => ({}) })
    overflow.append(svg)
    root.append(overflow)
    document.body.append(root)

    expect(offsetInExportRoot(svg, root)).toEqual({ x: 0, y: 0 })
    root.remove()
  })
})
