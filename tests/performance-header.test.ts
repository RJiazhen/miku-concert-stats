import { describe, expect, it } from 'vitest'
import { performanceHeaderFacts } from '../shared/performance-header.ts'

describe('performanceHeaderFacts', () => {
  it('prints a single date', () => {
    expect(performanceHeaderFacts({ start_date: '2012-10-02', end_date: null, showtime_local: null, venue_name: 'KITEC Star Hall' })).toEqual({
      dates: '2012-10-02',
      venue: 'KITEC Star Hall',
      showtime: null,
    })
  })

  it('prints a multi-day range', () => {
    const facts = performanceHeaderFacts({ start_date: '2024-08-30', end_date: '2024-09-01', showtime_local: '18:30', venue_name: '幕張メッセ' })
    expect(facts.dates).toBe('2024-08-30 – 2024-09-01')
    expect(facts.showtime).toBe('18:30')
  })

  it('collapses an end date that equals the start date', () => {
    expect(performanceHeaderFacts({ start_date: '2024-08-30', end_date: '2024-08-30', showtime_local: null, venue_name: null }).dates).toBe(
      '2024-08-30',
    )
  })

  it('omits missing fields instead of printing placeholders', () => {
    expect(performanceHeaderFacts({ start_date: null, end_date: '2024-08-30', showtime_local: '', venue_name: '  ' })).toEqual({
      dates: null,
      venue: null,
      showtime: null,
    })
  })
})
