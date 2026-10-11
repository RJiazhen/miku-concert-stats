import { describe, expect, it } from 'vitest'
import { parseShowtime } from '../shared/showtime.ts'

describe('parseShowtime', () => {
  it('reads a single Japanese-venue Showtime and keeps an excerpt', () => {
    const hit = parseShowtime('Daytime : OPEN 12:30 / Showtime 13:30 / Curtain 15:00', 'JP')
    expect(hit?.showtime_local).toBe('13:30')
    expect(hit?.timezone).toBe('Asia/Tokyo')
    expect(hit?.time_evidence).toContain('Showtime 13:30')
  })

  it('reads 開演', () => {
    expect(parseShowtime('開演 19:00', 'JP')?.showtime_local).toBe('19:00')
  })

  it('refuses two different showtimes', () => {
    const description = 'Daytime : Showtime 13:30\nNight : Showtime 19:30'
    expect(parseShowtime(description, 'JP')).toBeNull()
  })

  it('ignores START times and non-JP venues', () => {
    expect(parseShowtime('OPEN 11:30 / START 12:30', 'JP')).toBeNull()
    expect(parseShowtime('Showtime 13:30', 'US')).toBeNull()
  })
})
