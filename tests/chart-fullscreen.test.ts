// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'
import {
  COMPACT_FULLSCREEN_MAX_WIDTH,
  exitElementFullscreen,
  prefersMobileLandscape,
  tryEnterElementFullscreen,
  tryLockLandscape,
  tryMobileLandscapePresentation,
  unlockOrientation,
} from '../shared/chart-fullscreen.ts'

describe('prefersMobileLandscape', () => {
  it('matches the Tailwind md breakpoint used for compact chart fullscreen', () => {
    expect(COMPACT_FULLSCREEN_MAX_WIDTH).toBe(767)
    expect(prefersMobileLandscape(390)).toBe(true)
    expect(prefersMobileLandscape(767)).toBe(true)
    expect(prefersMobileLandscape(768)).toBe(false)
  })
})

describe('tryEnterElementFullscreen', () => {
  it('returns true only when requestFullscreen exists and fulfills', async () => {
    expect(await tryEnterElementFullscreen(null)).toBe(false)
    expect(await tryEnterElementFullscreen(undefined)).toBe(false)

    const ok = { requestFullscreen: vi.fn(async () => undefined) }
    expect(await tryEnterElementFullscreen(ok as never)).toBe(true)
    expect(ok.requestFullscreen).toHaveBeenCalledTimes(1)

    const rejected = { requestFullscreen: vi.fn(async () => { throw new Error('denied') }) }
    expect(await tryEnterElementFullscreen(rejected as never)).toBe(false)
  })
})

describe('exitElementFullscreen', () => {
  it('exits only when this session held fullscreen and an element is still fullscreen', async () => {
    const exitFullscreen = vi.fn(async () => undefined)
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: document.body })
    Object.defineProperty(document, 'exitFullscreen', { configurable: true, value: exitFullscreen })

    await exitElementFullscreen(false)
    expect(exitFullscreen).not.toHaveBeenCalled()

    await exitElementFullscreen(true)
    expect(exitFullscreen).toHaveBeenCalledTimes(1)

    Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: null })
    await exitElementFullscreen(true)
    expect(exitFullscreen).toHaveBeenCalledTimes(1)
  })
})

describe('tryLockLandscape', () => {
  it('returns true only when the orientation API exists and lock fulfills', async () => {
    expect(await tryLockLandscape(null)).toBe(false)
    expect(await tryLockLandscape(undefined)).toBe(false)

    const ok = { lock: vi.fn(async () => undefined), unlock: vi.fn() }
    expect(await tryLockLandscape(ok)).toBe(true)
    expect(ok.lock).toHaveBeenCalledWith('landscape')

    const missing = { unlock: vi.fn() }
    expect(await tryLockLandscape(missing as never)).toBe(false)

    const rejected = { lock: vi.fn(async () => { throw new Error('not allowed') }), unlock: vi.fn() }
    expect(await tryLockLandscape(rejected)).toBe(false)
  })
})

describe('tryMobileLandscapePresentation', () => {
  it('skips document fullscreen and lock on desktop or already-landscape viewports', async () => {
    const element = { requestFullscreen: vi.fn(async () => undefined) }
    const orientation = { lock: vi.fn(async () => undefined), unlock: vi.fn() }

    expect(await tryMobileLandscapePresentation({
      element: element as never,
      orientation,
      viewportWidth: 1280,
      viewportHeight: 800,
    })).toEqual({ documentFullscreen: false, orientationLock: false })
    expect(element.requestFullscreen).not.toHaveBeenCalled()

    expect(await tryMobileLandscapePresentation({
      element: element as never,
      orientation,
      viewportWidth: 844,
      viewportHeight: 390,
    })).toEqual({ documentFullscreen: false, orientationLock: false })
  })

  it('enters document fullscreen then locks landscape on compact portrait', async () => {
    const element = { requestFullscreen: vi.fn(async () => undefined) }
    const orientation = { lock: vi.fn(async () => undefined), unlock: vi.fn() }

    expect(await tryMobileLandscapePresentation({
      element: element as never,
      orientation,
      viewportWidth: 390,
      viewportHeight: 844,
    })).toEqual({ documentFullscreen: true, orientationLock: true })
    expect(element.requestFullscreen).toHaveBeenCalledTimes(1)
    expect(orientation.lock).toHaveBeenCalledWith('landscape')
  })
})

describe('unlockOrientation', () => {
  it('unlocks only when this session held a lock, and ignores unlock errors', () => {
    const orientation = { lock: vi.fn(async () => undefined), unlock: vi.fn() }
    unlockOrientation(orientation, false)
    expect(orientation.unlock).not.toHaveBeenCalled()
    unlockOrientation(orientation, true)
    expect(orientation.unlock).toHaveBeenCalledTimes(1)
    orientation.unlock.mockImplementation(() => { throw new Error('nothing held') })
    expect(() => unlockOrientation(orientation, true)).not.toThrow()
  })
})
