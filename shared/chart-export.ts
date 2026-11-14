/** MIME type of a real JPEG download. */
export const JPEG_MIME = 'image/jpeg'

/** JPEG encoding quality for chart downloads. */
export const JPEG_QUALITY = 0.92

/** Light-theme fallback when no opaque surface color is available. */
export const JPEG_BACKGROUND_FALLBACK_LIGHT = '#ffffff'

/** Dark-theme fallback matching the site's near-black canvas. */
export const JPEG_BACKGROUND_FALLBACK_DARK = '#05070d'

/** @deprecated Prefer theme-aware helpers; kept as the light fallback alias. */
export const JPEG_BACKGROUND_FALLBACK = JPEG_BACKGROUND_FALLBACK_LIGHT

/**
 * Turns a chart title and optional active filters into a `.jpg` filename.
 * Whitespace and punctuation become hyphens; letters and digits in any script are kept.
 */
export const chartExportFilename = (title: string, filters: readonly string[] = []): string => {
  const parts = [title, ...filters]
    .map((part) => part
      .trim()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, ''))
    .filter((part) => part !== '')
  return `${parts.length === 0 ? 'chart' : parts.join('-')}.jpg`
}

/** True when a CSS color string is missing, transparent, or fully alpha-zero. */
export const isTransparentCssColor = (value: string | null | undefined): boolean => {
  const text = value?.trim() ?? ''
  if (text === '' || text === 'transparent') return true
  const rgba = text.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i)
  if (rgba !== null && rgba[4] !== undefined && Number(rgba[4]) === 0) return true
  return text === 'rgba(0, 0, 0, 0)'
}

/** Light vs dark JPEG fallback from the document's color-mode class. */
export const themeJpegBackgroundFallback = (doc: Document = document): string =>
  doc.documentElement.classList.contains('dark')
    ? JPEG_BACKGROUND_FALLBACK_DARK
    : JPEG_BACKGROUND_FALLBACK_LIGHT

/** A usable opaque CSS color, or the given fallback when the value is empty or transparent. */
export const solidCssColor = (
  value: string | null | undefined,
  fallback: string = JPEG_BACKGROUND_FALLBACK_LIGHT,
): string => {
  if (isTransparentCssColor(value)) return fallback
  return value!.trim()
}

/**
 * Resolves a paint value that may still contain `var(...)`.
 * Canvas and serialized SVG cannot see document CSS variables, so callers must
 * pass an element whose computed style already resolved the token.
 */
export const resolvePaintColor = (
  raw: string | null | undefined,
  element: Element,
  property: 'color' | 'backgroundColor' | 'fill' | 'stroke',
  fallback: string,
): string => {
  const text = raw?.trim() ?? ''
  if (text !== '' && !text.includes('var(') && !isTransparentCssColor(text) && text !== 'none') {
    return text
  }
  const computed = globalThis.getComputedStyle(element)[property]
  return solidCssColor(computed, fallback)
}

/** True when the bytes start with a JPEG start-of-image marker. */
export const isJpegBytes = (bytes: Uint8Array): boolean =>
  bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff


/**
 * Natural width and height of an SVG drawing, preferring the width/height attributes
 * and viewBox over the visible client box so overflowed years are not dropped.
 */
export const intrinsicSvgSize = (svg: SVGSVGElement): { width: number; height: number } => {
  const attrWidth = Number(svg.getAttribute('width'))
  const attrHeight = Number(svg.getAttribute('height'))
  const viewBox = svg.viewBox?.baseVal
  const width = Number.isFinite(attrWidth) && attrWidth > 0
    ? attrWidth
    : (viewBox !== undefined && viewBox.width > 0 ? viewBox.width : (svg.clientWidth || svg.getBoundingClientRect().width || 1))
  const height = Number.isFinite(attrHeight) && attrHeight > 0
    ? attrHeight
    : (viewBox !== undefined && viewBox.height > 0 ? viewBox.height : (svg.clientHeight || svg.getBoundingClientRect().height || 1))
  return { width, height }
}

/**
 * Position of an element in the export root's unclipped content coordinates,
 * restoring overflow scroll so a scrolled chart still exports from year one.
 */
export const offsetInExportRoot = (element: Element, root: HTMLElement): { x: number; y: number } => {
  const box = element.getBoundingClientRect()
  const rootBox = root.getBoundingClientRect()
  let scrollX = root.scrollLeft
  let scrollY = root.scrollTop
  let current = element.parentElement
  while (current !== null && current !== root) {
    if (current instanceof HTMLElement) {
      scrollX += current.scrollLeft
      scrollY += current.scrollTop
    }
    current = current.parentElement
  }
  return { x: box.left - rootBox.left + scrollX, y: box.top - rootBox.top + scrollY }
}

/**
 * Full natural drawing size of a chart root, including SVG width and descendant
 * overflow that is wider than the visible card.
 */
export const chartExportContentSize = (root: HTMLElement): { width: number; height: number } => {
  let width = Math.max(root.scrollWidth, root.clientWidth)
  let height = Math.max(root.scrollHeight, root.clientHeight)
  for (const el of Array.from(root.querySelectorAll('*'))) {
    const pos = offsetInExportRoot(el, root)
    if (el instanceof HTMLElement) {
      width = Math.max(width, pos.x + Math.max(el.scrollWidth, el.clientWidth))
      height = Math.max(height, pos.y + Math.max(el.scrollHeight, el.clientHeight))
    }
    if (el instanceof SVGSVGElement) {
      const size = intrinsicSvgSize(el)
      width = Math.max(width, pos.x + size.width)
      height = Math.max(height, pos.y + size.height)
    }
  }
  return { width: Math.max(1, Math.ceil(width)), height: Math.max(1, Math.ceil(height)) }
}

/**
 * Walks from an element toward the document root for the first opaque background.
 * Falls back to the active color-mode canvas so dark mode never exports a white page.
 */
export const readExportBackground = (element: Element): string => {
  const fallback = themeJpegBackgroundFallback(element.ownerDocument ?? document)
  let current: Element | null = element
  while (current !== null) {
    const background = globalThis.getComputedStyle(current).backgroundColor
    if (!isTransparentCssColor(background)) return solidCssColor(background, fallback)
    current = current.parentElement
  }
  return fallback
}

/** @deprecated Use `readExportBackground` so dark mode does not fall back to white. */
export const readElementBackground = (element: Element): string => readExportBackground(element)

/**
 * Readable foreground for titles and legend labels in the active theme.
 * Prefer highlighted text tokens over muted body color so exports stay legible.
 */
export const readExportForeground = (element: Element): string => {
  const fallback = themeJpegBackgroundFallback(element.ownerDocument ?? document) === JPEG_BACKGROUND_FALLBACK_DARK
    ? '#f8fafc'
    : '#111827'
  const root = element.ownerDocument?.documentElement ?? element
  for (const token of ['--ui-text-highlighted', '--ui-text']) {
    const value = globalThis.getComputedStyle(root).getPropertyValue(token).trim()
    if (value !== '' && !isTransparentCssColor(value)) return solidCssColor(value, fallback)
  }
  return solidCssColor(globalThis.getComputedStyle(element).color, fallback)
}


/** Paints an opaque JPEG background before any chart ink is drawn. */
export const paintSolidJpegBackground = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  background: string,
): void => {
  context.fillStyle = solidCssColor(background, themeJpegBackgroundFallback())
  context.fillRect(0, 0, width, height)
}

type ChartExportSource = {
  /** Card heading drawn above the plot. */
  title: string
  /** Opaque fill painted before the SVG, so JPEG has no transparent holes. */
  background: string
  /** The in-card plot wrapper: legend plus SVG. */
  root: HTMLElement
}

/**
 * Rasterizes a chart root to a JPEG blob with a solid background.
 * Legend rows marked `data-chart-export="legend"` are painted; hover-only hints are skipped.
 */
export const exportChartToJpeg = async (source: ChartExportSource): Promise<Blob> => {
  const root = source.root
  const svgs = Array.from(root.querySelectorAll('svg'))
  if (svgs.length === 0) throw new Error('Chart export found no SVG to draw')

  const content = chartExportContentSize(root)
  const title = source.title.trim()
  const pad = 16
  const titleBand = title === '' ? 0 : 28
  const width = Math.max(1, content.width + pad * 2)
  const height = Math.max(1, content.height + pad * 2 + titleBand)
  const dpr = Math.min(2, globalThis.devicePixelRatio || 1)
  const foreground = readExportForeground(root)

  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(width * dpr)
  canvas.height = Math.ceil(height * dpr)
  const context = canvas.getContext('2d')
  if (context === null) throw new Error('Chart export could not create a canvas')
  context.scale(dpr, dpr)
  paintSolidJpegBackground(context, width, height, source.background)

  if (title !== '') {
    context.fillStyle = foreground
    context.font = '600 14px ui-sans-serif, system-ui, sans-serif'
    context.textBaseline = 'top'
    context.fillText(title, pad, pad)
  }

  const originX = pad
  const originY = pad + titleBand
  const legends = Array.from(root.querySelectorAll('[data-chart-export="legend"]'))
  for (const legend of legends) {
    if (!(legend instanceof HTMLElement)) continue
    paintLegend(context, legend, root, originX, originY, foreground)
  }

  for (const svg of svgs) {
    const pos = offsetInExportRoot(svg, root)
    const size = intrinsicSvgSize(svg)
    const image = await svgToImage(svg)
    context.drawImage(
      image,
      originX + pos.x,
      originY + pos.y,
      Math.max(1, size.width),
      Math.max(1, size.height),
    )
  }

  return canvasToJpeg(canvas)
}

/** Paints legend labels and color swatches in their layout positions relative to the plot root. */
const paintLegend = (
  context: CanvasRenderingContext2D,
  legend: HTMLElement,
  root: HTMLElement,
  originX: number,
  originY: number,
  foreground: string,
): void => {
  const items = Array.from(legend.querySelectorAll('[data-chart-export-item]'))
  const targets = items.length > 0 ? items : Array.from(legend.querySelectorAll(':scope > span'))
  for (const item of targets) {
    if (!(item instanceof HTMLElement)) continue
    const pos = offsetInExportRoot(item, root)
    const swatch = item.querySelector('[data-chart-export-swatch], span[style]')
    const color = swatch instanceof HTMLElement
      ? resolvePaintColor(
        swatch.getAttribute('style')?.match(/background-color:\s*([^;]+)/i)?.[1]
          ?? swatch.style.backgroundColor,
        swatch,
        'backgroundColor',
        '#888888',
      )
      : '#888888'
    const x = originX + pos.x
    const y = originY + pos.y
    const label = item.innerText.trim()
    context.fillStyle = color
    context.fillRect(x, y + 3, 8, 8)
    context.fillStyle = foreground
    context.font = '12px ui-sans-serif, system-ui, sans-serif'
    context.textBaseline = 'top'
    context.fillText(label, x + 12, y)
  }
}

/**
 * Clones an SVG and inlines computed fill/stroke so CSS variables still paint after serialization.
 */
const svgToImage = (svg: SVGSVGElement): Promise<HTMLImageElement> => {
  const clone = svg.cloneNode(true) as SVGSVGElement
  if (!clone.getAttribute('xmlns')) clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  const size = intrinsicSvgSize(svg)
  clone.setAttribute('width', String(size.width))
  clone.setAttribute('height', String(size.height))
  inlineComputedPaint(svg, clone)
  const xml = new XMLSerializer().serializeToString(clone)
  const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }))
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Chart export failed to rasterize the SVG'))
    }
    image.src = url
  })
}

/**
 * Copies computed fill and stroke onto a cloned SVG whenever the live tree used
 * CSS variables or currentColor, which serialized SVG cannot resolve alone.
 */
const inlineComputedPaint = (source: SVGSVGElement, clone: SVGSVGElement): void => {
  const fromNodes = [source, ...Array.from(source.querySelectorAll('*'))]
  const toNodes = [clone, ...Array.from(clone.querySelectorAll('*'))]
  for (let index = 0; index < fromNodes.length; index += 1) {
    const from = fromNodes[index]
    const to = toNodes[index]
    if (!(from instanceof SVGElement) || !(to instanceof SVGElement)) continue
    const style = globalThis.getComputedStyle(from)
    for (const attr of ['fill', 'stroke'] as const) {
      const raw = from.getAttribute(attr)
      const computed = style[attr]
      if (computed === '' || computed === 'none') continue
      const needsInline = raw === null
        || raw.includes('var(')
        || raw === 'currentColor'
        || raw === 'context-fill'
        || raw === 'context-stroke'
      if (needsInline) to.setAttribute(attr, computed)
    }
  }
}

/** Encodes the painted canvas as a JPEG blob. */
const canvasToJpeg = (canvas: HTMLCanvasElement): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob === null || blob.type !== JPEG_MIME) {
        reject(new Error('Chart export did not produce a JPEG'))
        return
      }
      resolve(blob)
    }, JPEG_MIME, JPEG_QUALITY)
  })

/** Starts a same-tab download of a JPEG blob. */
export const triggerJpegDownload = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.rel = 'noopener'
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
