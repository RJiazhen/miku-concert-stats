import { describe, expect, it } from 'vitest'
import { emptyPlaceNameIndex, localizePlaceNames, parsePlaceNames } from '../shared/place-names.ts'

/** Checked places used by every case. */
const index = parsePlaceNames({
  zh: {
    Tokyo: '东京',
    東京: '东京',
    東京都: '东京都',
    横浜市: '横滨市',
    大阪: '大阪',
    Vancouver: '温哥华',
    'New Taipei City': '新北',
    Taipei: '台北',
  },
  en: {
    Tokyo: 'Tokyo',
    東京: 'Tokyo',
    東京都: 'Tokyo',
    横浜市: 'Yokohama',
    大阪: 'Osaka',
    Vancouver: 'Vancouver',
    'New Taipei City': 'New Taipei City',
    Taipei: 'Taipei',
  },
})

describe('place name file', () => {
  it('rejects blank names and case-insensitive duplicates', () => {
    expect(() => parsePlaceNames({ zh: { Tokyo: '' } })).toThrow()
    expect(() => parsePlaceNames({ zh: { '': '东京' } })).toThrow()
    expect(() => parsePlaceNames({ zh: { Tokyo: '东京', TOKYO: '东京' } })).toThrow()
    expect(() => parsePlaceNames({ zh: {}, en: { Tokyo: 'Tokyo', TOKYO: 'Tokyo' } })).toThrow()
    expect(emptyPlaceNameIndex().entries).toHaveLength(0)
  })
})

describe('place localization', () => {
  it('replaces Latin places regardless of case', () => {
    expect(localizePlaceNames('MIKU EXPO 2024 Vancouver', index, 'zh')).toBe('MIKU EXPO 2024 温哥华')
    expect(localizePlaceNames('OSAKA', parsePlaceNames({ zh: { Osaka: '大阪' } }), 'zh')).toBe('大阪')
  })

  it('drops the English connector in front of a translated place', () => {
    expect(localizePlaceNames('10th Anniversary in OSAKA', parsePlaceNames({ zh: { Osaka: '大阪' } }), 'zh')).toBe('10th Anniversary 大阪')
    expect(localizePlaceNames('MIKU EXPO 2024 in Tokyo', index, 'zh')).toBe('MIKU EXPO 2024 东京')
  })

  it('prefers the longer spelling', () => {
    expect(localizePlaceNames('東京都', index, 'zh')).toBe('东京都')
    expect(localizePlaceNames('横浜市', index, 'zh')).toBe('横滨市')
    expect(localizePlaceNames('New Taipei City', index, 'zh')).toBe('新北')
    expect(localizePlaceNames('Taipei', index, 'zh')).toBe('台北')
  })

  it('only matches whole Latin words', () => {
    expect(localizePlaceNames('Tokyoite', index, 'zh')).toBe('Tokyoite')
    expect(localizePlaceNames('Tokyo', index, 'zh')).toBe('东京')
  })

  it('romanizes Japanese places and normalizes Latin spellings in English', () => {
    expect(localizePlaceNames('初音ミクシンフォニー 2016 東京都', index, 'en')).toBe('初音ミクシンフォニー 2016 Tokyo')
    expect(localizePlaceNames('MIKU EXPO 2024 in TOKYO', index, 'en')).toBe('MIKU EXPO 2024 in Tokyo')
    expect(localizePlaceNames('横浜市', index, 'en')).toBe('Yokohama')
  })

  it('drops the administrative suffix after a Japanese place', () => {
    expect(localizePlaceNames('初音ミクシンフォニー 2019 大阪市', index, 'en')).toBe('初音ミクシンフォニー 2019 Osaka')
    expect(localizePlaceNames('初音ミクシンフォニー 2019 大阪市', index, 'zh')).toBe('初音ミクシンフォニー 2019 大阪')
  })

  it('leaves the original language untouched', () => {
    expect(localizePlaceNames('MIKU EXPO 2024 Vancouver', index, 'ja')).toBe('MIKU EXPO 2024 Vancouver')
    expect(localizePlaceNames('東京都', index, 'ja')).toBe('東京都')
  })
})
