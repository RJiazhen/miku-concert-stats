import { describe, expect, it } from 'vitest'
import {
  LOCALES,
  isLocale,
  localeFromLanguage,
  localeFromLanguages,
  localeSelfName,
  localeTag,
} from '../shared/i18n/locale.ts'

describe('localeFromLanguages', () => {
  it('picks the first supported language from an Accept-Language header', () => {
    expect(localeFromLanguages('fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7')).toBe('en')
    expect(localeFromLanguages('ja-JP,ja;q=0.9,en;q=0.8')).toBe('ja')
    expect(localeFromLanguages('ko-KR,ko;q=0.9,en;q=0.8')).toBe('ko')
    expect(localeFromLanguages('zh-TW,zh;q=0.9')).toBe('zh-Hant')
    expect(localeFromLanguages('zh-Hans-CN')).toBe('zh')
    expect(localeFromLanguages('de-DE,fr;q=0.8')).toBeNull()
  })
})

describe('localeFromLanguage', () => {
  it('keeps a single unsupported browser language on Chinese', () => {
    expect(localeFromLanguage('fr-FR')).toBe('zh')
    expect(localeFromLanguage('zh-CN')).toBe('zh')
  })

  it('selects Korean from Korean browser language tags', () => {
    expect(localeFromLanguage('ko')).toBe('ko')
    expect(localeFromLanguage('ko-KR')).toBe('ko')
    expect(localeFromLanguage('ko-KP')).toBe('ko')
  })
})

describe('Korean locale primitives', () => {
  it('lists Korean in the switcher after Japanese and before English', () => {
    expect(LOCALES).toEqual(['zh', 'zh-Hant', 'ja', 'ko', 'en'])
    expect(isLocale('ko')).toBe(true)
    expect(localeSelfName('ko')).toBe('한국어')
    expect(localeTag('ko')).toBe('ko')
  })
})
