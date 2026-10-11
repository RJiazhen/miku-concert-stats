import { describe, expect, it } from 'vitest'
import { performanceRole, premieresFor } from '../shared/premiere.ts'

describe('performance role', () => {
  it('marks livestream wording as broadcast', () => {
    expect(performanceRole('Magical Mirai 配信', null)).toBe('broadcast')
    expect(performanceRole('MIKU EXPO', 'Livestream archive')).toBe('broadcast')
  })

  it('keeps an online show when the livestream words are absent', () => {
    expect(performanceRole('MIKU EXPO 2021 Online', 'Hall show')).toBe('show')
  })
})

describe('premieres', () => {
  it('picks the earlier show and ignores a later city and an earlier broadcast', () => {
    const rows = premieresFor([
      { id: 1, series_id: 81, series_number: 2014, start_date: '2014-08-01', role: 'broadcast', showtime_local: null },
      { id: 2518, series_id: 81, series_number: 2014, start_date: '2014-09-20', role: 'show', showtime_local: null },
      { id: 2517, series_id: 81, series_number: 2014, start_date: '2014-08-30', role: 'show', showtime_local: null },
    ])
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      premiere_performance_id: 2517,
      premiere_date: '2014-08-30',
    })
  })

  it('breaks a same-day tie by the lower performance id', () => {
    const rows = premieresFor([
      { id: 9, series_id: 82, series_number: 2016, start_date: '2016-01-01', role: 'show', showtime_local: '18:00' },
      { id: 4, series_id: 82, series_number: 2016, start_date: '2016-01-01', role: 'show', showtime_local: null },
    ])
    expect(rows[0]?.premiere_performance_id).toBe(4)
    expect(rows[0]?.premiere_showtime_local).toBeNull()
  })
})
