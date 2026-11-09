import { onMounted, onUnmounted, ref, type Ref } from 'vue'

/** Viewport width below which a floating button folds its text label into an icon-only pill. */
const MOBILE_MEDIA_QUERY = '(width < 40rem)'

/**
 * Folds the text label of a floating action button on phones after the first scroll or tap,
 * so the pill stops covering content while the visitor reads.
 *
 * Every button that shares the bottom edge uses this hook, so the two sides of the page fold
 * at the same moment and can never end up with different widths. The state starts `false` and
 * is only ever set from a client event, keeping the server render and the first client render
 * identical. Widening past 40rem expands the label again, so a phone-sized collapse can never
 * leak onto a desktop viewport.
 *
 * @returns the collapsed flag to bind into the button's `class` and label span.
 */
export const useFloatingButtonCollapse = (): Ref<boolean> => {
  /** Whether the button already shrank to its icon-only form for this visit. */
  const collapsed = ref(false)

  /** Collapses the button once, then detaches both one-shot listeners. */
  const collapseButton = (): void => {
    collapsed.value = true
    stopFirstInteraction()
  }

  /** Detaches the scroll and click listeners that watch for the first interaction. */
  const stopFirstInteraction = (): void => {
    window.removeEventListener('scroll', collapseButton, { capture: true })
    window.removeEventListener('click', collapseButton, { capture: true })
  }

  /** Watches the first scroll or tap on a still-expanded phone viewport; a no-op elsewhere. */
  const watchFirstInteraction = (): void => {
    stopFirstInteraction()
    if (collapsed.value || !window.matchMedia(MOBILE_MEDIA_QUERY).matches) return
    window.addEventListener('scroll', collapseButton, { capture: true, passive: true })
    window.addEventListener('click', collapseButton, { capture: true, passive: true })
  }

  /** Re-arms the watch on narrowing and expands the label again on widening past 40rem. */
  const handleViewportChange = (event: MediaQueryListEvent): void => {
    if (event.matches) {
      watchFirstInteraction()
      return
    }
    collapsed.value = false
  }

  let mobileMediaQuery: MediaQueryList | undefined

  /** Subscribes to the 40rem breakpoint crossing after hydration. */
  const startWatching = (): void => {
    watchFirstInteraction()
    mobileMediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY)
    mobileMediaQuery.addEventListener('change', handleViewportChange)
  }
  onMounted(startWatching)

  /** Detaches the one-shot interaction listeners and the breakpoint listener. */
  const stopWatching = (): void => {
    stopFirstInteraction()
    mobileMediaQuery?.removeEventListener('change', handleViewportChange)
    mobileMediaQuery = undefined
  }
  onUnmounted(stopWatching)

  return collapsed
}
