import { describe, expect, it } from 'vitest'
import { normalizePerformance, normalizeSeries } from '../scripts/vocadb/normalize.ts'
import type { ApiEvent, ApiSeries } from '../scripts/vocadb/api-types.ts'

/** Fields taken from the public series 81 response on 2026-10-12. */
const seriesFixture = (): ApiSeries => ({
  id: 81,
  name: '初音ミク「マジカルミライ」',
  category: 'Concert',
  description: 'Hatsune Miku "Magical Mirai"',
  events: [],
})

describe('normalize VocaDB payloads', () => {
  it('keeps the 2014 Osaka show as a dated show without inventing a clock time', () => {
    const event: ApiEvent = {
      id: 2517,
      name: '初音ミク「マジカルミライ 2014」in OSAKA',
      description: '1st Show (Evening): OPEN 11:30 / START 12:30',
      date: '2014-08-30T00:00:00Z',
      seriesNumber: 2014,
      seriesSuffix: 'Osaka',
      status: 'Approved',
      venueName: 'インテックス大阪',
      venue: { addressCountryCode: 'JP', name: 'インテックス大阪' },
      songList: { id: 214, name: 'Hatsune Miku "Magical Mirai" 2014', featuredCategory: 'Concerts' },
    }
    const row = normalizePerformance(event, 81, '2026-10-12T00:00:00.000Z')
    expect(row.start_date).toBe('2014-08-30')
    expect(row.role).toBe('show')
    expect(row.showtime_local).toBeNull()
    expect(row.time_precision).toBe('day')
    expect(row.song_list_id).toBe(214)
  })

  it('refuses a series that is not a concert', () => {
    expect(() => normalizeSeries({ ...seriesFixture(), category: 'Club' }, '2026-10-12T00:00:00.000Z')).toThrow(/Concert/)
  })
})
