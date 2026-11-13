import { describe, expect, it } from 'vitest'
import { weightedDistinct } from '../shared/admin.ts'
import { parsePageviewPayload } from '../shared/visitor-tracking.ts'

/** A payload the browser tracker would send. */
const VALID = {
  visitorId: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
  sessionId: '9f1c1b7e-2b8a-4c1e-8f6d-1c2d3e4f5a6b',
  path: '/shows/2959',
  referrerHost: 'www.google.com',
  device: 'desktop',
  firstVisit: false,
}

describe('parsePageviewPayload', () => {
  it('accepts a well-formed event and fills the optional defaults', () => {
    expect(parsePageviewPayload(VALID)).toEqual(VALID)
    expect(parsePageviewPayload({ ...VALID, referrerHost: '  ' , device: undefined })).toMatchObject({
      referrerHost: 'direct',
      device: 'other',
      firstVisit: false,
    })
  })

  it('rejects ids, paths and devices it cannot store', () => {
    expect(parsePageviewPayload(null)).toBeNull()
    expect(parsePageviewPayload({ ...VALID, visitorId: 'not-a-uuid' })).toBeNull()
    expect(parsePageviewPayload({ ...VALID, sessionId: 'x' })).toBeNull()
    expect(parsePageviewPayload({ ...VALID, path: 'shows/2959' })).toBeNull()
    expect(parsePageviewPayload({ ...VALID, device: 'console' })).toBeNull()
  })

  it('truncates oversized text instead of rejecting the event', () => {
    const parsed = parsePageviewPayload({
      ...VALID,
      path: `/${'a'.repeat(500)}`,
      referrerHost: 'b'.repeat(500),
    })
    expect(parsed?.path).toHaveLength(200)
    expect(parsed?.referrerHost).toHaveLength(120)
  })
})

describe('weightedDistinct', () => {
  it('scales a distinct count back to the unsampled population', () => {
    expect(weightedDistinct(100, 100, 10)).toBe(10)
    expect(weightedDistinct(10, 100, 8)).toBe(80)
  })

  it('returns zero for an empty result instead of NaN', () => {
    expect(weightedDistinct(0, 0, 0)).toBe(0)
    expect(weightedDistinct(0, 100, 10)).toBe(0)
  })
})
