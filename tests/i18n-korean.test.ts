import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { LOCALES } from '../shared/i18n/locale.ts'
import { loadMessageModules, catalogForLocale } from '../shared/i18n/split-modules.ts'
import { formatSongTitle } from '../shared/song-titles.ts'
import { nameIn, parseNameMaps } from '../shared/name-map.ts'
import { localizeCharacterName, parseCharacterNames } from '../shared/character-names.ts'
import { localizeSeriesName, localizeSeriesInName, parseSeriesTitles } from '../shared/series-titles.ts'
import { localizePlaceNames, parsePlaceNames } from '../shared/place-names.ts'
import { localizeVenueName, parseVenueNames } from '../shared/venue-names.ts'

describe('Korean UI message coverage', () => {
  it('gives every message key a Korean string alongside the existing locales', () => {
    const modules = loadMessageModules()
    let keys = 0
    for (const messages of Object.values(modules)) {
      for (const entry of Object.values(messages)) {
        keys += 1
        for (const locale of LOCALES) {
          expect(typeof entry[locale]).toBe('string')
        }
        expect(entry.ko.length).toBeGreaterThan(0)
        expect(entry.zh).not.toBe('')
        expect(entry.ja).not.toBeUndefined()
        expect(entry.en).not.toBeUndefined()
      }
    }
    expect(keys).toBeGreaterThan(0)
    const korean = catalogForLocale('ko')
    expect(korean['common.appName']).toBe('하츠네 미쿠 콘서트 곡 통계')
    expect(korean['nav.language']).toBe('언어')
    // Previous locales keep their existing catalog strings.
    expect(catalogForLocale('zh')['common.appName']).toBe('初音未来演唱会曲目统计')
    expect(catalogForLocale('en')['common.appName']).toBe('Hatsune Miku Concert Statistics')
  })
})

describe('Korean name fallback without unsourced translations', () => {
  it('keeps original catalog song titles in Korean', () => {
    const view = formatSongTitle('ko', {
      jaTitle: 'メルト',
      translation: null,
      zhTitle: '融化',
      nameEn: 'Melt',
    })
    expect(view.primary).toBe('メルト')
    expect(view.originalNames).toEqual([])
  })

  it('does not take Chinese or English name-map rows as Korean stand-ins', () => {
    const maps = parseNameMaps({
      zh: { 初音ミク: '初音未来' },
      'zh-Hant': { 初音ミク: '初音未來' },
      en: { 初音ミク: 'Hatsune Miku' },
    }, 'Character name')
    expect(nameIn(maps, '初音ミク', 'zh')).toBe('初音未来')
    expect(nameIn(maps, '初音ミク', 'en')).toBe('Hatsune Miku')
    expect(nameIn(maps, '初音ミク', 'ko')).toBeNull()
    expect(nameIn(maps, '初音ミク', 'ja')).toBeNull()
  })

  it('falls back to original character, series, place, and venue names in Korean', () => {
    const characters = parseCharacterNames({
      zh: { 初音ミク: '初音未来' },
      'zh-Hant': { 初音ミク: '初音未來' },
      en: { 初音ミク: 'Hatsune Miku' },
    })
    expect(localizeCharacterName(characters, '初音ミク', 'ko')).toBe('初音ミク')
    expect(localizeCharacterName(characters, '初音ミク', 'en')).toBe('Hatsune Miku')

    const series = parseSeriesTitles({
      zh: { 'マジカルミライ': '魔法未来' },
      en: { 'マジカルミライ': 'Magical Mirai' },
    })
    expect(localizeSeriesName(series, 'マジカルミライ', 'ko')).toBe('マジカルミライ')
    expect(localizeSeriesInName('初音ミク「マジカルミライ 2024」', 'マジカルミライ', 2024, series, 'ko')).toBe(
      '初音ミク「マジカルミライ 2024」',
    )
    expect(localizeSeriesInName('初音ミク「マジカルミライ 2024」', 'マジカルミライ', 2024, series, 'en')).toContain(
      'Magical Mirai',
    )

    const places = parsePlaceNames({
      zh: { Tokyo: '东京', 東京: '东京' },
      'zh-Hant': { Tokyo: '東京', 東京: '東京' },
      en: { Tokyo: 'Tokyo', 東京: 'Tokyo' },
    })
    expect(localizePlaceNames('MIKU EXPO 2024 in Tokyo', places, 'ko')).toBe('MIKU EXPO 2024 in Tokyo')
    expect(localizePlaceNames('MIKU EXPO 2024 in Tokyo', places, 'en')).toMatch(/Tokyo/)

    const venues = parseVenueNames({ '東京ドーム': 'Tokyo Dome' })
    expect(localizeVenueName(venues, '東京ドーム', 'ko')).toBe('東京ドーム')
    expect(localizeVenueName(venues, '東京ドーム', 'en')).toBe('Tokyo Dome')
  })
})

describe('Korean language selection persistence config', () => {
  it('registers Korean in the i18n module and keeps the existing locale cookie', () => {
    const config = readFileSync(new URL('../nuxt.config.ts', import.meta.url), 'utf8')
    expect(config).toContain("cookieKey: 'miku-concert-stats-locale'")
    expect(config).toContain("code: 'ko'")
    expect(config).toContain("name: '한국어'")
    expect(config).toContain("strategy: 'no_prefix'")
  })
})
