import { describe, expect, it } from 'vitest'
import { formatRotationReason, parseRotationNotes, reviewRotations, splitNote, type RotationPerformance } from '../shared/rotation.ts'
import type { Catalog, PerformanceRow } from '../shared/types.ts'

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

/** Three 2024 Magical Mirai stops, each spanning several days. */
const magicalMirai2024 = (): RotationPerformance[] => [
  show(7214, '初音ミク「マジカルミライ 2024」in FUKUOKA', '2024-08-17', '2024-08-18', '福岡国際会議場'),
  show(7215, '初音ミク「マジカルミライ 2024」in TOKYO', '2024-08-30', '2024-09-01', '幕張メッセ'),
  show(7217, '初音ミク「マジカルミライ 2024」in OSAKA', '2024-10-12', '2024-10-14', 'インテックス大阪'),
]

/** One Tokyo run used by note-context tests. */
const tokyo = (): RotationPerformance[] => [show(9, 'Magical Mirai in TOKYO', '2017-09-01', '2017-09-03')]

describe('rotation note splitting', () => {
  it('splits on slashes, commas, semicolons, and newlines but keeps date slashes', () => {
    expect(splitNote('Fukuoka Day 1 / Tokyo Day 1；Osaka Day 2, Sendai')).toEqual([
      'Fukuoka Day 1',
      'Tokyo Day 1',
      'Osaka Day 2',
      'Sendai',
    ])
    expect(splitNote('2024/08/31')).toEqual(['2024/08/31'])
    expect(splitNote('8/31')).toEqual(['8/31'])
  })
})

describe('rotation notes', () => {
  it('treats a blank note as every show of the list', () => {
    const shows = magicalMirai2024()
    expect(parseRotationNotes(null, shows)).toEqual({
      performanceIds: [7214, 7215, 7217],
      uncertain: false,
      reasons: [],
      info: [],
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
      info: [],
    })
    expect(parseRotationNotes('Day 2 OSAKA / Day 1 TOKYO / Day 3 TOKYO', magicalMirai2024()).performanceIds).toEqual([
      7215,
      7217,
    ])
  })

  it('applies a city-less day number to each city run instead of guessing one city', () => {
    expect(parseRotationNotes('Day 2', magicalMirai2024()).performanceIds).toEqual([7214, 7215, 7217])
    expect(parseRotationNotes('Day 1 / Day 3', magicalMirai2024()).performanceIds).toEqual([7214, 7215, 7217])
  })

  it('flags city-only notes when that city spans several shows and carries the count', () => {
    expect(parseRotationNotes('Osaka', magicalMirai2024())).toEqual({
      performanceIds: [7217],
      uncertain: true,
      reasons: ['city-only when city has several shows: 3'],
      info: [],
    })
    const oneNight = [show(1, 'Magical Mirai in OSAKA', '2016-09-01', '2016-09-01')]
    expect(parseRotationNotes('Osaka', oneNight)).toEqual({
      performanceIds: [1],
      uncertain: false,
      reasons: [],
      info: [],
    })
  })

  it('reads Japanese and Chinese day wording', () => {
    expect(parseRotationNotes('東京 2日目', magicalMirai2024()).performanceIds).toEqual([7215])
    expect(parseRotationNotes('2日目 夜', magicalMirai2024()).reasons).toEqual(['day with day/night shows'])
    expect(parseRotationNotes('両日', magicalMirai2024()).performanceIds).toEqual([7214, 7215, 7217])
    expect(parseRotationNotes('初日', [show(9, 'Magical Mirai in TOKYO', '2017-09-01', '2017-09-03')]).performanceIds).toEqual([9])
    expect(parseRotationNotes('千秋楽', [show(9, 'Magical Mirai in TOKYO', '2017-09-01', '2017-09-03')]).performanceIds).toEqual([9])
    expect(parseRotationNotes('第2天', magicalMirai2024()).performanceIds).toEqual([7214, 7215, 7217])
  })

  it('maps bare dates and keeps time-only notes as context', () => {
    expect(parseRotationNotes('2024-08-31', magicalMirai2024()).performanceIds).toEqual([7215])
    expect(parseRotationNotes('8/31', magicalMirai2024()).performanceIds).toEqual([7215])
    expect(parseRotationNotes('18:00', magicalMirai2024())).toEqual({
      performanceIds: [7214, 7215, 7217],
      uncertain: false,
      reasons: [],
      info: ['18:00'],
    })
  })

  it('matches cities read from the performance titles', () => {
    const expo2026 = [show(9811, 'MIKU EXPO 2026 Chicago', '2026-04-12', '2026-04-13'), show(9817, 'MIKU EXPO 2026 Glendale', '2026-04-28', '2026-04-28')]
    expect(parseRotationNotes('Chicago Day 1 / Glendale', expo2026).performanceIds).toEqual([9811, 9817])
  })

  it('flags day and night shows, and unresolved day markers', () => {
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
    expect(parseRotationNotes('Day 9', tokyo).reasons).toEqual(['unknown format'])
    expect(parseRotationNotes('Sendai', magicalMirai2024())).toMatchObject({
      performanceIds: [7214, 7215, 7217],
      uncertain: true,
      reasons: ['unmatched city'],
    })
  })

  it('passes non-rotation prose through as muted context instead of a warning', () => {
    const tokyo = [show(9, 'Magical Mirai in TOKYO', '2017-09-01', '2017-09-03')]
    expect(parseRotationNotes('Encore', tokyo)).toEqual({
      performanceIds: [9],
      uncertain: false,
      reasons: [],
      info: ['Encore'],
    })
    expect(parseRotationNotes('Band Members Introduction', tokyo).info).toEqual(['Band Members Introduction'])
    expect(parseRotationNotes('Chinese version', tokyo).reasons).toEqual([])
    expect(parseRotationNotes('HATSUNE MIKU EXPO 2021 Online', tokyo).info).toEqual(['HATSUNE MIKU EXPO 2021 Online'])
  })

  it('keeps context next to a partial city match', () => {
    expect(parseRotationNotes('Encore / Osaka', magicalMirai2024())).toMatchObject({
      performanceIds: [7217],
      reasons: ['city-only when city has several shows: 3'],
      info: ['Encore'],
    })
    expect(parseRotationNotes('Sendai', tokyo()).info).toEqual(['Sendai'])
  })
})

describe('rotation reason text', () => {
  it('translates every known parser reason into Chinese', () => {
    expect(formatRotationReason('unknown format')).toBe('备注写法未识别')
    expect(formatRotationReason('unmatched city')).toBe('城市没有对到任何一场')
    expect(formatRotationReason('day with day/night shows')).toBe('备注写到日场 / 夜场或当天有多场，解析器只定位到当天')
  })

  it('prints the show count for a city-only note', () => {
    expect(formatRotationReason('city-only when city has several shows: 3')).toBe('共 3 场')
    expect(formatRotationReason('city-only when city has several shows')).toBe('该城市有多场')
  })

  it('fills both counts into a setlist length mismatch', () => {
    expect(formatRotationReason('setlist length mismatch: 2 vs expected 3')).toBe('本场 2 首，同歌单其他场次多为 3 首')
  })

  it('falls back to the raw token for an unrecognized reason', () => {
    expect(formatRotationReason('some future reason')).toBe('some future reason')
  })
})

describe('setlist length check', () => {
  it('flags the short show and the rotation line that made the lengths differ', () => {
    const review = reviewRotations(lengthCatalog())
    expect(review.shows).toEqual([
      {
        performanceId: 1,
        songListId: 10,
        count: 2,
        expected: 3,
        reasons: ['setlist length mismatch: 2 vs expected 3'],
      },
    ])
    const osaka = review.lines.find((line) => line.position === 3)
    expect(osaka?.uncertain).toBe(true)
    expect(osaka?.reasons).toContain('setlist length mismatch: 2 vs expected 3')
    expect(review.lines.filter((line) => line.position !== 3).every((line) => line.uncertain === false)).toBe(true)
  })

  it('keeps informational note fragments on the resolved line', () => {
    const review = reviewRotations(lengthCatalog())
    const encore = review.lines.find((line) => line.position === 3)
    expect(encore?.info).toEqual(['Encore'])
    expect(review.lines.filter((line) => line.position !== 3).every((line) => line.info.length === 0)).toBe(true)
  })
})

/** Two one-day cities. Two songs are on both shows and one song is only in Osaka. */
const lengthCatalog = (): Catalog => {
  const performance = (id: number, name: string, date: string): PerformanceRow => ({
    id,
    series_id: 81,
    name,
    name_ja: null,
    venue_name: null,
    country_code: 'JP',
    start_date: date,
    end_date: date,
    showtime_local: null,
    timezone: null,
    time_precision: 'day',
    time_evidence: null,
    role: 'show',
    series_number: 2016,
    series_suffix: null,
    song_list_id: 10,
    vocadb_status: 'Finished',
    source_url: `https://vocadb.net/E/${id}`,
    retrieved_at: '2026-10-12T00:00:00.000Z',
  })
  return {
    sources: [],
    series: [],
    performances: [
      performance(1, 'Magical Mirai in TOKYO', '2016-09-01'),
      performance(2, 'Magical Mirai in OSAKA', '2016-09-10'),
    ],
    performanceLinks: [],
    premieres: [],
    songLists: [],
    songs: [],
    setlistItems: [
      { song_list_id: 10, position: 1, listed_song_id: 1, notes: null },
      { song_list_id: 10, position: 2, listed_song_id: 2, notes: '' },
      { song_list_id: 10, position: 3, listed_song_id: 3, notes: 'Osaka / Encore' },
    ],
    setlistItemSongs: [
      { song_list_id: 10, position: 1, song_id: 1, role: 'listed' },
      { song_list_id: 10, position: 2, song_id: 2, role: 'listed' },
      { song_list_id: 10, position: 3, song_id: 3, role: 'listed' },
    ],
    medleyQuarantine: [],
    videos: [],
  performanceSetlists: [],
  performanceSetlistSources: [],
  performanceShowSetlists: [],
  performanceShowSetlistItems: [],
  medleys: [],
  medleySongs: [],
  performanceStatus: [],
  }
}
