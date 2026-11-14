import { describe, expect, it } from 'vitest'
import { performanceDateLabel, performanceStatusOf } from '../shared/performance-date-label.ts'
import type { Translate } from '../shared/i18n/index.ts'

/** Test translator that echoes the message key. */
const t: Translate = (key) => key

describe('performanceDateLabel', () => {
  it('prints a known date and a multi-day range', () => {
    expect(performanceDateLabel('2026-12-26', t)).toBe('2026-12-26')
    expect(performanceDateLabel('2024-08-30', t, { endDate: '2024-09-01' })).toBe('2024-08-30 – 2024-09-01')
    expect(performanceDateLabel('2024-08-30', t, { endDate: '2024-08-30' })).toBe('2024-08-30')
  })

  it('keeps a known date when the show is cancelled or upcoming', () => {
    expect(performanceDateLabel('2026-12-26', t, { status: 'cancelled' })).toBe('2026-12-26')
    expect(performanceDateLabel('2026-12-26', t, { status: 'upcoming' })).toBe('2026-12-26')
  })

  it('labels a missing date as cancelled only for a sourced cancellation', () => {
    expect(performanceDateLabel(null, t, { status: 'cancelled' })).toBe('common.dateCancelled')
    expect(performanceDateLabel('', t, { status: 'cancelled' })).toBe('common.dateCancelled')
  })

  it('labels every other missing date as undetermined', () => {
    expect(performanceDateLabel(null, t)).toBe('common.dateUndetermined')
    expect(performanceDateLabel(null, t, { status: 'upcoming' })).toBe('common.dateUndetermined')
    expect(performanceDateLabel(null, t, { status: 'postponed' })).toBe('common.dateUndetermined')
  })
})

describe('performanceStatusOf', () => {
  it('returns the stored status or null when the catalog has no row', () => {
    const rows = [
      { performance_id: 2853, status: 'cancelled' as const, note: null, source_url: 'https://example.com', accessed_at: '2026-01-01' },
    ]
    expect(performanceStatusOf(rows, 2853)).toBe('cancelled')
    expect(performanceStatusOf(rows, 13210)).toBeNull()
  })
})
