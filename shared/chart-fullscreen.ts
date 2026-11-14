/** Viewport width at or below which fullscreen prefers a landscape lock (Tailwind `md`). */
export const COMPACT_FULLSCREEN_MAX_WIDTH = 767

/** A minimal Screen Orientation surface so tests can stub the browser API. */
export type ScreenOrientationLike = {
  lock: (orientation: string) => Promise<void>
  unlock: () => void
}

/** True when the viewport is already wider than it is tall. */
export const isLandscapeViewport = (width: number, height: number): boolean => width > height

/** True when a compact viewport should request a landscape orientation lock. */
export const prefersMobileLandscape = (width: number): boolean => width <= COMPACT_FULLSCREEN_MAX_WIDTH

/**
 * Requests browser fullscreen on an element.
 * Returns true only when the API exists and the promise fulfills; many mobile
 * browsers require this before `screen.orientation.lock` is allowed.
 */
export const tryEnterElementFullscreen = async (
  element: Element | null | undefined,
): Promise<boolean> => {
  if (element === null || element === undefined) return false
  const request = (element as Element & {
    requestFullscreen?: () => Promise<void>
    webkitRequestFullscreen?: () => Promise<void>
  }).requestFullscreen
    ?? (element as Element & { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen
  if (typeof request !== 'function') return false
  try {
    await request.call(element)
    return true
  } catch {
    return false
  }
}

/** Leaves browser fullscreen when this session previously entered it. */
export const exitElementFullscreen = async (held: boolean): Promise<void> => {
  if (!held || typeof document === 'undefined') return
  const doc = document as Document & {
    exitFullscreen?: () => Promise<void>
    webkitExitFullscreen?: () => Promise<void>
  }
  if (doc.fullscreenElement == null && (doc as Document & { webkitFullscreenElement?: Element | null }).webkitFullscreenElement == null) {
    return
  }
  const exit = doc.exitFullscreen ?? doc.webkitExitFullscreen
  if (typeof exit !== 'function') return
  try {
    await exit.call(doc)
  } catch {
    // Closing the dialog must still succeed if the browser already left fullscreen.
  }
}

/**
 * Requests a native landscape lock.
 * Returns true only when the API exists and the promise fulfills; missing APIs
 * and rejections leave the current orientation unchanged.
 */
export const tryLockLandscape = async (orientation: ScreenOrientationLike | null | undefined): Promise<boolean> => {
  if (orientation === null || orientation === undefined || typeof orientation.lock !== 'function') return false
  try {
    await orientation.lock('landscape')
    return true
  } catch {
    return false
  }
}

/** Releases a lock this session previously acquired. Ignores browsers that throw on unlock. */
export const unlockOrientation = (
  orientation: ScreenOrientationLike | null | undefined,
  held: boolean,
): void => {
  if (!held || orientation === null || orientation === undefined || typeof orientation.unlock !== 'function') return
  try {
    orientation.unlock()
  } catch {
    // Some browsers throw if nothing is held; closing the dialog must still succeed.
  }
}

/**
 * On a compact portrait viewport, enters element fullscreen then locks landscape.
 * Desktop-wide and already-landscape viewports skip both steps.
 */
export const tryMobileLandscapePresentation = async ({
  element,
  orientation,
  viewportWidth,
  viewportHeight,
}: {
  element: Element | null | undefined
  orientation: ScreenOrientationLike | null | undefined
  viewportWidth: number
  viewportHeight: number
}): Promise<{ documentFullscreen: boolean; orientationLock: boolean }> => {
  const compactPortrait =
    prefersMobileLandscape(viewportWidth) && !isLandscapeViewport(viewportWidth, viewportHeight)
  if (!compactPortrait) return { documentFullscreen: false, orientationLock: false }
  const documentFullscreen = await tryEnterElementFullscreen(element)
  const orientationLock = await tryLockLandscape(orientation)
  return { documentFullscreen, orientationLock }
}

/** Reads window and visualViewport sizes for layout decisions. */
export const readViewportSize = (win: Window): { width: number; height: number } => {
  const visual = win.visualViewport
  return {
    width: Math.round(visual?.width ?? win.innerWidth),
    height: Math.round(visual?.height ?? win.innerHeight),
  }
}

/** Returns the browser orientation object when it exposes lock/unlock; otherwise null. */
export const getScreenOrientation = (win: Window): ScreenOrientationLike | null => {
  const orientation = (win.screen as Screen & { orientation?: ScreenOrientationLike }).orientation
  if (orientation === undefined || typeof orientation.lock !== 'function') return null
  return orientation
}
