import { onMounted, onUnmounted, ref, watch, type Ref } from 'vue'

/** A template ref target: a plain element, a component instance exposing `$el`, or nothing. */
type WidthTarget = Element | { $el?: unknown } | null

/** Refs returned by `useElementWidth`. */
type ElementWidth = {
  /** Bind to the wrapper whose content width should drive the drawing. */
  widthAnchor: Ref<WidthTarget>
  /** Measured content width in CSS pixels; `0` until the first client-side measurement. */
  elementWidth: Ref<number>
}

/** Resolves the element a template ref points at, unwrapping component instances via `$el`. */
const resolveTarget = (target: WidthTarget): HTMLElement | null => {
  if (target === null) return null
  const element = target instanceof Element ? target : (target.$el ?? null)
  return element instanceof HTMLElement ? element : null
}

/**
 * Tracks the content width of an element, so a chart with a fixed-unit drawing width can
 * stretch its bands to fill a wider column instead of leaving dead space on the right.
 *
 * Starts at `0` so the server render and the first client render agree; the observer
 * reports the real width after mount and on every later size change. Only the horizontal
 * content box is reported: padding and a reserved scrollbar gutter are excluded.
 *
 * @returns the wrapper ref to bind plus the reactive content width.
 */
export const useElementWidth = (): ElementWidth => {
  const widthAnchor = ref<WidthTarget>(null)
  const elementWidth = ref(0)
  let observer: ResizeObserver | null = null

  /** Reads the anchor's content width, excluding its horizontal padding. */
  const measure = (): void => {
    const anchor = resolveTarget(widthAnchor.value)
    if (anchor === null) return
    const style = getComputedStyle(anchor)
    const padding = Number.parseFloat(style.paddingLeft) + Number.parseFloat(style.paddingRight)
    elementWidth.value = Math.max(0, Math.floor(anchor.clientWidth - padding))
  }

  /** Observes the current anchor; called on mount and whenever the template ref rebinds. */
  const observeAnchor = (): void => {
    observer?.disconnect()
    const anchor = resolveTarget(widthAnchor.value)
    if (anchor === null) {
      elementWidth.value = 0
      return
    }
    observer = new ResizeObserver(measure)
    observer.observe(anchor)
    measure()
  }

  /** Starts observing after hydration, once the wrapper the caller renders exists. */
  const startTracking = (): void => {
    observeAnchor()
  }
  onMounted(startTracking)

  /** Re-binds when the wrapper renders late, e.g. a chart that waits for data. */
  const rebindAnchor = (): void => {
    if (observer === null && widthAnchor.value === null) return
    observeAnchor()
  }
  watch(widthAnchor, rebindAnchor, { flush: 'post' })

  /** Releases the observer on unmount. */
  const stopTracking = (): void => {
    observer?.disconnect()
    observer = null
  }
  onUnmounted(stopTracking)

  return { widthAnchor, elementWidth }
}
