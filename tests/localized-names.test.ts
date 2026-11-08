import { describe, expect, it } from 'vitest'
import { allPerformanceNames, allSeriesNames, venueNameEn } from '../shared/localized-names.ts'
import { parsePlaceNames } from '../shared/place-names.ts'
import { parseSeriesTitles } from '../shared/series-titles.ts'
import { parseVenueNames } from '../shared/venue-names.ts'

/** Checked translations used by every case. */
const seriesTitles = parseSeriesTitles({
  zh: { '初音ミク「マジカルミライ」': '魔法未来', 'MIKU EXPO': 'MIKU EXPO' },
  en: { '初音ミク「マジカルミライ」': 'Magical Mirai', 'MIKU EXPO': 'MIKU EXPO' },
})

const places = parsePlaceNames({
  zh: { Tokyo: '东京', 東京: '东京', Osaka: '大阪', 大阪: '大阪' },
  en: { Tokyo: 'Tokyo', 東京: 'Tokyo', Osaka: 'Osaka', 大阪: 'Osaka' },
})

describe('localized names', () => {
  it('translates the series label and the place in one performance name', () => {
    const names = allPerformanceNames({
      name: '初音ミク「マジカルミライ 2024」in TOKYO',
      seriesName: '初音ミク「マジカルミライ」',
      seriesNumber: 2024,
      seriesTitles,
      places,
    })
    expect(names.ja).toBe('初音ミク「マジカルミライ 2024」in TOKYO')
    expect(names.zh).toBe('魔法未来 2024 东京')
    expect(names.en).toBe('Magical Mirai 2024 in Tokyo')
  })

  it('keeps a series with no row in the catalog spelling', () => {
    expect(allSeriesNames('MIKU EXPO', seriesTitles).zh).toBe('MIKU EXPO')
    expect(allSeriesNames('未知のシリーズ', seriesTitles).en).toBe('未知のシリーズ')
  })

  it('uses the English venue row and falls back to the catalog spelling', () => {
    const venues = parseVenueNames({ 幕張メッセ: 'Makuhari Messe' })
    expect(venueNameEn(venues, '幕張メッセ')).toBe('Makuhari Messe')
    expect(venueNameEn(venues, '上海静安体育中心')).toBe('上海静安体育中心')
    expect(venueNameEn(venues, null)).toBeNull()
  })
})
