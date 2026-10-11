import { describe, expect, it } from 'vitest'
import { evaluatePairs, isHoldoutSong } from '../shared/correlation.ts'
import type { ViewPair } from '../shared/correlation.ts'

/**
 * SAMPLE pairs for gate tests. These numbers are not concert measurements
 * and must never be written under data/increments.
 */
const samplePair = (
  songId: number,
  niconicoViews: number,
  youtubeViews: number,
  publishDate: string,
  pvType = 'Original',
): ViewPair => ({
  songId,
  niconicoViews,
  youtubeViews,
  publishDate,
  pvType,
  collectedAt: '2026-01-01T00:00:00.000Z',
})

/** Train ids are not divisible by 5. */
const trainIds = (): number[] => {
  const ids: number[] = []
  let candidate = 1
  while (ids.length < 40) {
    if (!isHoldoutSong(candidate)) ids.push(candidate)
    candidate += 1
  }
  return ids
}

describe('conversion gates', () => {
  it('publishes a SAMPLE log-linear relationship that clears every gate', () => {
    const pairs: ViewPair[] = []
    for (const songId of trainIds()) {
      const views = 50_000 + songId * 1000
      pairs.push(samplePair(songId, views, views * 2, '2001-01-01'))
    }
    const holdout = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75]
    for (const songId of holdout) {
      const views = 80_000 + songId
      pairs.push(samplePair(songId, views, views * 2, '2008-01-01'))
    }
    const result = evaluatePairs(pairs)
    expect(result.status).toBe('published')
    expect(result.version).toBe('1')
    const formula = JSON.parse(result.formula_json ?? '{}') as { a: number; b: number }
    expect(formula.b).toBeCloseTo(1, 6)
    expect(formula.a).toBeCloseTo(Math.log10(2), 6)
  })

  it('stays unpublished when a SAMPLE holdout stratum misses the error cap', () => {
    const pairs: ViewPair[] = []
    for (const songId of trainIds()) {
      const views = 50_000 + songId * 1000
      pairs.push(samplePair(songId, views, views * 2, '2001-01-01'))
    }
    const goodHoldout = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75]
    for (const songId of goodHoldout) {
      const views = 20_000 + songId
      pairs.push(samplePair(songId, views, views * 2, '2008-01-01'))
    }
    const badHoldout = [80, 85, 90, 95, 100, 105, 110, 115]
    for (const songId of badHoldout) {
      pairs.push(samplePair(songId, 200_000, 200_000 * 4, '2015-06-01'))
    }
    const result = evaluatePairs(pairs)
    expect(result.status).toBe('unpublished')
    expect(result.formula_json).toBeNull()
    expect(result.reason).toContain('median APE above 40%')
  })

  it('stays unpublished when there are no real paired snapshots', () => {
    const result = evaluatePairs([])
    expect(result.status).toBe('unpublished')
    expect(result.formula_json).toBeNull()
    expect(result.reason).toContain('training pairs 0')
  })
})
