import { computed, onMounted, onUnmounted, ref, watch, type Ref } from 'vue'

/** Table height floor kept from before #14, when the ranking tables were capped at `70vh`. */
const MIN_HEIGHT = '70vh'

/** A template ref target: a plain element, a component instance exposing `$el`, or nothing. */
type AnchorTarget = Element | { $el?: unknown } | null

/** Refs and style returned by `useRankingTableHeight`. */
type RankingTableHeight = {
  /** Bind to the ranking table root (or a wrapper around it); its top edge starts the table. */
  tableAnchor: Ref<AnchorTarget>
  /** Inline style for the ranking table root, which is also the scroll container. */
  tableStyle: Ref<{ height: string }>
}

/** Resolves the element a template ref points at, unwrapping component instances via `$el`. */
const resolveAnchor = (anchor: AnchorTarget): HTMLElement | null => {
  if (anchor === null) return null
  const element = anchor instanceof Element ? anchor : (anchor.$el ?? null)
  return element instanceof HTMLElement ? element : null
}

/**
 * Sizes a ranking table so it fills the viewport below the page header and filter block,
 * while never dropping below the historical `70vh` table height.
 *
 * The measured offset is the distance from the document top to `tableAnchor`, so the
 * resulting height stays stable while the page scrolls. It is measured after mount, when
 * the table appears, on window resize, and whenever the page body changes size (for
 * example when the filter bar wraps). The listener and observer are released on unmount.
 *
 * @returns the table ref to bind plus the reactive inline height style for the table.
 */
export const useRankingTableHeight = (): RankingTableHeight => {
  const tableAnchor = ref<AnchorTarget>(null)
  const tableTop = ref<number | null>(null)
  let frame = 0
  let observer: ResizeObserver | null = null

  /** Reads the table's document offset; scrolling therefore never changes the height. */
  const measure = (): void => {
    const anchor = resolveAnchor(tableAnchor.value)
    if (anchor === null) return
    const top = anchor.getBoundingClientRect().top + window.scrollY
    tableTop.value = Math.max(0, Math.round(top))
  }

  /** Coalesces bursts of resize signals into one measurement per animation frame. */
  const scheduleMeasure = (): void => {
    if (frame !== 0) return
    frame = requestAnimationFrame(() => {
      frame = 0
      measure()
    })
  }

  /** Inline height that fills the remaining viewport but stays at least `70vh`. */
  const tableStyle = computed(() => ({
    height: tableTop.value === null ? MIN_HEIGHT : `max(${MIN_HEIGHT}, calc(100dvh - ${tableTop.value}px))`,
  }))

  /** Measures after hydration, then tracks viewport and body size changes. */
  const startTracking = (): void => {
    measure()
    window.addEventListener('resize', scheduleMeasure)
    observer = new ResizeObserver(scheduleMeasure)
    observer.observe(document.body)
  }
  onMounted(startTracking)

  /** Re-measures when the table mounts, unmounts or is replaced. */
  const remeasureOnTableChange = (): void => {
    scheduleMeasure()
  }
  watch(tableAnchor, remeasureOnTableChange)

  /** Releases the pending frame, the resize listener and the body observer. */
  const stopTracking = (): void => {
    if (frame !== 0) cancelAnimationFrame(frame)
    frame = 0
    window.removeEventListener('resize', scheduleMeasure)
    observer?.disconnect()
    observer = null
  }
  onUnmounted(stopTracking)

  return { tableAnchor, tableStyle }
}
