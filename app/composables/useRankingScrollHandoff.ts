import { onMounted, onUnmounted, toValue, watch, type MaybeRefOrGetter, type Ref } from 'vue'

/** Pixels of slack when deciding the page or a table is at a scroll edge. */
const EDGE_SLOP = 1

/** A template ref target: a plain element, a component instance exposing `$el`, or nothing. */
type AnchorTarget = Element | { $el?: unknown } | null

/** Ranking-table roots that should receive page-edge wheel handoff. */
const registeredTables = new Set<HTMLElement>()

/** How many active composable instances share the window wheel listener. */
let listenerUsers = 0

/** Resolves the element a template ref points at, unwrapping component instances via `$el`. */
const resolveAnchor = (anchor: AnchorTarget): HTMLElement | null => {
  if (anchor === null) return null
  const element = anchor instanceof Element ? anchor : (anchor.$el ?? null)
  return element instanceof HTMLElement ? element : null
}

/** True when the document cannot scroll further down. */
const isPageAtBottom = (): boolean => {
  const root = document.documentElement
  const maxScroll = root.scrollHeight - window.innerHeight
  return window.scrollY >= maxScroll - EDGE_SLOP
}

/** Remaining pixels a table can scroll in the given wheel direction (positive = down). */
const scrollRoom = (table: HTMLElement, deltaY: number): number => {
  if (deltaY > 0) {
    return Math.max(0, table.scrollHeight - table.clientHeight - table.scrollTop)
  }
  return Math.max(0, table.scrollTop)
}

/**
 * Picks the visible ranking table that can still scroll in `deltaY`'s direction.
 * Prefers the table with the largest visible height so stacked fill tables on detail
 * pages do not all consume the same wheel gesture.
 */
const pickHandoffTable = (deltaY: number): HTMLElement | null => {
  let best: HTMLElement | null = null
  let bestVisible = -1

  for (const table of registeredTables) {
    if (scrollRoom(table, deltaY) <= EDGE_SLOP) continue

    const rect = table.getBoundingClientRect()
    const visible = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0)
    if (visible <= 0) continue

    if (visible > bestVisible) {
      best = table
      bestVisible = visible
    }
  }

  return best
}

/** Converts a wheel event's deltaY into CSS pixels (handles line/page deltaMode). */
const wheelDeltaYPx = (event: WheelEvent): number => {
  if (event.deltaMode === 1) return event.deltaY * 16
  if (event.deltaMode === 2) return event.deltaY * window.innerHeight
  return event.deltaY
}

/**
 * Finds a registered table that contains the event target and can scroll in `deltaY`.
 */
const tableUnderPointer = (target: EventTarget | null, deltaY: number): HTMLElement | null => {
  if (!(target instanceof Node)) return null
  for (const table of registeredTables) {
    if (table.contains(target) && scrollRoom(table, deltaY) > EDGE_SLOP) return table
  }
  return null
}

/**
 * Forwards wheel deltas into a ranking table once the page is pinned at its bottom,
 * so further scrolling reveals that the table itself scrolls. Prefers the table under
 * the pointer; otherwise picks the most visible table that still has room.
 */
const onWindowWheel = (event: WheelEvent): void => {
  const deltaY = wheelDeltaYPx(event)
  if (deltaY === 0 || event.ctrlKey) return
  if (registeredTables.size === 0) return
  if (!isPageAtBottom()) return

  const table = tableUnderPointer(event.target, deltaY) ?? pickHandoffTable(deltaY)
  if (table === null) return

  const room = scrollRoom(table, deltaY)
  if (room <= EDGE_SLOP) return

  event.preventDefault()
  const applied = deltaY > 0 ? Math.min(deltaY, room) : Math.max(deltaY, -room)
  table.scrollTop += applied
}

/** Attaches the shared window wheel listener when the first table registers. */
const retainListener = (): void => {
  if (listenerUsers === 0) {
    window.addEventListener('wheel', onWindowWheel, { passive: false, capture: true })
  }
  listenerUsers += 1
}

/** Detaches the shared window wheel listener when the last table unregisters. */
const releaseListener = (): void => {
  listenerUsers = Math.max(0, listenerUsers - 1)
  if (listenerUsers === 0) {
    window.removeEventListener('wheel', onWindowWheel, { capture: true })
  }
}

/**
 * Registers a fill ranking table for page-bottom → table wheel handoff.
 * No-op while `enabled` is false (non-fill tables are not bounded scroll panes).
 *
 * @param tableAnchor - template ref on the table root (the scroll container)
 * @param enabled - usually the section's `fill` prop
 */
export const useRankingScrollHandoff = (
  tableAnchor: Ref<AnchorTarget>,
  enabled: MaybeRefOrGetter<boolean> = true,
): void => {
  let registered: HTMLElement | null = null

  /** Adds or removes the current table root from the shared handoff registry. */
  const syncRegistration = (): void => {
    const next = toValue(enabled) ? resolveAnchor(tableAnchor.value) : null
    if (registered === next) return
    if (registered !== null) {
      registeredTables.delete(registered)
      registered = null
    }
    if (next !== null) {
      registeredTables.add(next)
      registered = next
    }
  }

  /** Starts the shared listener and syncs the initial table registration. */
  const start = (): void => {
    retainListener()
    syncRegistration()
  }
  onMounted(start)

  watch([tableAnchor, () => toValue(enabled)], syncRegistration)

  /** Drops this table from the registry and releases the shared listener. */
  const stop = (): void => {
    if (registered !== null) {
      registeredTables.delete(registered)
      registered = null
    }
    releaseListener()
  }
  onUnmounted(stop)
}
