import { describe, expect, it } from 'vitest'
import { buildCityIndex, cityKey, cityLabel, matchCity, rankCities, showCount, type CityShow } from '../shared/cities.ts'
import { parsePlaceNames } from '../shared/place-names.ts'

/** Checked places used by every case. */
const index = buildCityIndex(
  parsePlaceNames({
    zh: {
      Tokyo: '东京',
      東京: '东京',
      東京都: '东京都',
      Osaka: '大阪',
      Sapporo: '札幌',
      'Washington D.C.': '华盛顿特区',
      Washington: '华盛顿',
      'Düsseldorf': '杜塞尔多夫',
    },
    en: {
      Tokyo: 'Tokyo',
      東京: 'Tokyo',
      東京都: 'Tokyo',
      Osaka: 'Osaka',
      Sapporo: 'Sapporo',
      'Washington D.C.': 'Washington, D.C.',
      Washington: 'Washington',
      'Düsseldorf': 'Düsseldorf',
    },
    'zh-Hant': {
      Tokyo: '東京',
      東京: '東京',
      東京都: '東京都',
      Osaka: '大阪',
      Sapporo: '札幌',
      'Washington D.C.': '華盛頓特區',
      Washington: '華盛頓',
      'Düsseldorf': '杜塞道夫',
    },
  }),
)

/** In-person show fixture. Defaults are a single day in Tokyo. */
const show = (overrides: Partial<CityShow> & Pick<CityShow, 'id'>): CityShow => ({
  name: `Show ${overrides.id}`,
  name_ja: null,
  venue_name: null,
  series_suffix: 'Tokyo',
  start_date: '2024-08-30',
  end_date: null,
  role: 'show',
  ...overrides,
})

describe('city keys', () => {
  it('drops an administrative suffix only when a name stays recognizable', () => {
    expect(cityKey('东京都')).toBe('东京')
    expect(cityKey('横滨市')).toBe('横滨')
    expect(cityKey('京都')).toBe('京都')
    expect(cityKey(' 东京 ')).toBe('东京')
  })
})

describe('city matching', () => {
  it('shows the city name in the active language', () => {
    expect(cityLabel(index, '东京', 'zh')).toBe('东京')
    expect(cityLabel(index, '东京', 'zh-Hant')).toBe('東京')
    expect(cityLabel(index, '杜塞尔多夫', 'zh-Hant')).toBe('杜塞道夫')
    expect(cityLabel(index, '东京', 'en')).toBe('Tokyo')
    expect(cityLabel(index, '东京', 'ja')).toBe('东京')
  })

  it('matches spellings from the suffix, name, and venue in that order', () => {
    expect(matchCity(show({ id: 1 }), index)).toEqual({ city: '东京', original: 'Tokyo' })
    expect(matchCity(show({ id: 2, series_suffix: null, name: '初音ミクシンフォニー 2026 東京' }), index)).toEqual({
      city: '东京',
      original: '東京',
    })
    expect(matchCity(show({ id: 3, series_suffix: 'presents MIKU EXPO', venue_name: 'Zepp Sapporo' }), index)).toEqual({
      city: '札幌',
      original: 'Sapporo',
    })
    expect(matchCity(show({ id: 4, series_suffix: null, name: 'MIKU EXPO 2021 Online' }), index)).toBeNull()
  })

  it('prefers the longer spelling', () => {
    expect(matchCity(show({ id: 5, series_suffix: 'Washington D.C.' }), index)?.city).toBe('华盛顿特区')
    expect(matchCity(show({ id: 6, series_suffix: 'Washington' }), index)?.city).toBe('华盛顿')
  })

  it('matches spellings that contain non-ASCII Latin letters', () => {
    expect(matchCity(show({ id: 7, series_suffix: 'Düsseldorf' }), index)).toEqual({
      city: '杜塞尔多夫',
      original: 'Düsseldorf',
    })
  })
})

describe('show counting', () => {
  it('counts every covered calendar day, and one for a missing or reversed range', () => {
    expect(showCount(show({ id: 1 }))).toBe(1)
    expect(showCount(show({ id: 2, start_date: '2024-08-30', end_date: '2024-09-01' }))).toBe(3)
    expect(showCount(show({ id: 3, start_date: '2024-08-30', end_date: '2024-08-30' }))).toBe(1)
    expect(showCount(show({ id: 4, start_date: '2024-08-30', end_date: '2024-08-01' }))).toBe(1)
    expect(showCount(show({ id: 5, start_date: null }))).toBe(1)
  })
})

describe('city ranking', () => {
  it('merges spellings of one city and counts concerts separately from shows', () => {
    const ranking = rankCities(
      [
        show({ id: 1, series_suffix: 'Tokyo', start_date: '2024-08-30', end_date: '2024-09-01' }),
        show({ id: 2, series_suffix: null, name: '初音ミクシンフォニー 2026 東京', start_date: '2026-07-05' }),
        show({ id: 3, series_suffix: null, name: '初音ミクシンフォニー 2026 東京都', start_date: '2026-09-05' }),
        show({ id: 4, series_suffix: 'Osaka', start_date: '2026-08-14', end_date: '2026-08-16' }),
      ],
      index,
    )
    expect(ranking.rows.map((row) => [row.city, row.concerts, row.shows, row.firstYear, row.lastYear])).toEqual([
      ['东京', 3, 5, 2024, 2026],
      ['大阪', 1, 3, 2026, 2026],
    ])
    expect(ranking.rows[0]?.performanceIds).toEqual([1, 2, 3])
    expect(new Set(ranking.rows[0]?.originalNames)).toEqual(new Set(['Tokyo', '東京', '東京都']))
    expect(ranking.unknown).toEqual({ concerts: 0, shows: 0, performanceIds: [] })
  })

  it('breaks show ties by concert count and keeps the order deterministic', () => {
    const performances = [
      show({ id: 1, series_suffix: 'Tokyo', start_date: '2024-08-30', end_date: '2024-08-31' }),
      show({ id: 2, series_suffix: 'Osaka', start_date: '2024-08-14' }),
      show({ id: 3, series_suffix: 'Osaka', start_date: '2024-10-12' }),
      show({ id: 4, series_suffix: 'Sapporo', start_date: '2024-08-17' }),
      show({ id: 5, series_suffix: 'Sapporo', start_date: '2024-08-18' }),
    ]
    const first = rankCities(performances, index)
    expect(first.rows.map((row) => [row.city, row.concerts, row.shows])).toEqual([
      ['大阪', 2, 2],
      ['札幌', 2, 2],
      ['东京', 1, 2],
    ])
    expect(rankCities([...performances].reverse(), index)).toEqual(first)
  })

  it('reports unplaceable rows instead of inventing a city', () => {
    const ranking = rankCities(
      [
        show({ id: 1, series_suffix: 'Tokyo' }),
        show({ id: 2, series_suffix: null, name: 'MIKU WITH YOU 2025', venue_name: "Jing'an Sports Center", start_date: null }),
        show({ id: 3, series_suffix: null, name: 'Unlabelled Show', venue_name: 'Somewhere' }),
      ],
      index,
    )
    expect(ranking.rows.map((row) => row.city)).toEqual(['东京'])
    expect(ranking.unknown).toEqual({ concerts: 2, shows: 2, performanceIds: [2, 3] })
  })

  it('skips broadcasts unless asked, then reports them as unplaceable', () => {
    const performances = [
      show({ id: 1, series_suffix: 'Tokyo' }),
      show({ id: 2, series_suffix: 'Online', name: 'MIKU EXPO 2021 Online', role: 'broadcast', start_date: '2021-06-06' }),
    ]
    const excluded = rankCities(performances, index)
    expect(excluded.rows[0]).toMatchObject({ city: '东京', concerts: 1, shows: 1 })
    expect(excluded.unknown).toEqual({ concerts: 0, shows: 0, performanceIds: [] })
    const included = rankCities(performances, index, { includeBroadcast: true })
    expect(included.unknown).toEqual({ concerts: 1, shows: 1, performanceIds: [2] })
  })

  it('shows the English city name while grouping by the Chinese key', () => {
    expect(cityLabel(index, '东京', 'zh')).toBe('东京')
    expect(cityLabel(index, '东京', 'en')).toBe('Tokyo')
    expect(cityLabel(index, '华盛顿特区', 'en')).toBe('Washington, D.C.')
    expect(cityLabel(index, '未知城市', 'en')).toBe('未知城市')
  })
})
