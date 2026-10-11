import { describe, expect, it } from 'vitest'
import { parseRotationNotes, type RotationPerformance } from '../shared/rotation.ts'

/** One city stop on a shared song list. */
const show = (
  id: number,
  name: string,
  start: string,
  end: string | null,
  venue: string | null = null,
): RotationPerformance => ({
  id,
  name,
  name_ja: null,
  venue_name: venue,
  series_suffix: null,
  start_date: start,
  end_date: end,
})

const magicalMirai2024 = (): RotationPerformance[] => [
  show(7214, '初音ミク「マジカルミライ 2024」in FUKUOKA', '2024-08-17', '2024-08-18', '福岡国際会議場'),
  show(7215, '初音ミク「マジカルミライ 2024」in TOKYO', '2024-08-30', '2024-09-01', '幕張メッセ'),
  show(7217, '初音ミク「マジカルミライ 2024」in OSAKA', '2024-10-12', '2024-10-14', 'インテックス大阪'),
]

describe('rotation notes', () => {
  it('treats a blank note as every show of the list', () => {
    const shows = magicalMirai2024()
    expect(parseRotationNotes(null, shows)).toEqual({
      performanceIds: [7214, 7215, 7217],
      uncertain: false,
      reasons: [],
    })
    expect(parseRotationNotes('  ', shows).uncertain).toBe(false)
  })

  it('maps city day numbers onto the performance that covers that date', () => {
    const parsed = parseRotationNotes(
      'Fukuoka Day 1 / Tokyo Day 1 / Tokyo Day 3 / Osaka Day 2',
      magicalMirai2024(),
    )
    expect(parsed).toEqual({
      performanceIds: [7214, 7215, 7217],
      uncertain: false,
      reasons: [],
    })
    expect(parseRotationNotes('Day 2 OSAKA / Day 1 TOKYO / Day 3 TOKYO', magicalMirai2024()).performanceIds).toEqual([
      7215,
      7217,
    ])
  })

  it('flags city-only notes when that city spans several shows', () => {
    expect(parseRotationNotes('Osaka', magicalMirai2024())).toEqual({
      performanceIds: [7217],
      uncertain: true,
      reasons: ['city-only when city has several shows'],
    })
    const oneNight = [show(1, 'Magical Mirai in OSAKA', '2016-09-01', '2016-09-01')]
    expect(parseRotationNotes('Osaka', oneNight)).toEqual({
      performanceIds: [1],
      uncertain: false,
      reasons: [],
    })
  })

  it('flags day and night shows, unknown text, and cities that are not on the list', () => {
    const tokyo = [show(9, 'Magical Mirai in TOKYO', '2017-09-01', '2017-09-03', '幕張メッセ')]
    expect(parseRotationNotes('Day 1 Daytime', tokyo).reasons).toEqual(['day with day/night shows'])
    const splitBill = [
      show(1, 'Tokyo daytime', '2017-09-01', '2017-09-01'),
      show(2, 'Tokyo nighttime', '2017-09-01', '2017-09-01'),
    ]
    expect(parseRotationNotes('Tokyo Day 1', splitBill)).toMatchObject({
      performanceIds: [1, 2],
      uncertain: true,
      reasons: ['day with day/night shows'],
    })
    expect(parseRotationNotes('Encore', tokyo).reasons).toContain('unknown format')
    expect(parseRotationNotes('Sendai', tokyo)).toMatchObject({
      performanceIds: [9],
      uncertain: true,
      reasons: ['unmatched city'],
    })
    expect(parseRotationNotes('Encore / Osaka', magicalMirai2024())).toMatchObject({
      performanceIds: [7217],
      reasons: ['city-only when city has several shows', 'unknown format'],
    })
  })
})
