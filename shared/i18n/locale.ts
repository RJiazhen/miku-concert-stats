/**
 * Locale primitives for the four site languages.
 * Chinese is the source language: it defines the message keys, and every other catalog must
 * provide all of them. Traditional Chinese is a translation of the same catalog.
 */

/** Which language the interface and the names on it are shown in. */
export type Locale = 'zh' | 'zh-Hant' | 'ja' | 'en'

/** Every supported locale, in the order the switcher prints them. */
export const LOCALES: readonly Locale[] = ['zh', 'zh-Hant', 'ja', 'en']

/** Whether a stored or browser value names a supported locale. */
export const isLocale = (value: unknown): value is Locale =>
  value === 'zh' || value === 'zh-Hant' || value === 'ja' || value === 'en'

/**
 * Supported locale for one BCP 47 language tag, or null when the site does not translate into it.
 * Japanese and English match by their primary tag; Traditional Chinese also matches the regions
 * browsers use for it, and every other Chinese tag is Simplified Chinese.
 */
export const localeFromTag = (language: string): Locale | null => {
  const tag = language.trim().toLowerCase()
  if (tag.startsWith('ja')) return 'ja'
  if (tag.startsWith('en')) return 'en'
  if (tag.startsWith('zh-hant') || tag.startsWith('zh-tw') || tag.startsWith('zh-hk') || tag.startsWith('zh-mo')) {
    return 'zh-Hant'
  }
  if (tag.startsWith('zh')) return 'zh'
  return null
}

/**
 * Picks the locale a browser asks for: Japanese and English browsers get their own language,
 * Traditional Chinese browsers get Traditional Chinese, everything else starts in Chinese, the
 * site's source language.
 */
export const localeFromLanguage = (language: string): Locale => localeFromTag(language) ?? 'zh'

/**
 * First supported locale in an `Accept-Language` header, or null when none of its tags is supported.
 * Browsers list tags in preference order, and the site does not need the quality weights: the first
 * tag it supports is the one to render. This runs on the server so the first HTML already carries
 * the visitor's language, instead of switching after hydration.
 */
export const localeFromLanguages = (header: string): Locale | null => {
  for (const part of header.split(',')) {
    const tag = part.split(';')[0]?.trim() ?? ''
    const locale = localeFromTag(tag)
    if (locale !== null) return locale
  }
  return null
}

/** BCP 47 tag written to `<html lang>` and used for collation. */
export const localeTag = (locale: Locale): string => {
  if (locale === 'ja') return 'ja'
  if (locale === 'en') return 'en'
  if (locale === 'zh-Hant') return 'zh-Hant'
  return 'zh-Hans'
}

/** Name of a locale as its own speakers write it. */
export const localeSelfName = (locale: Locale): string => {
  if (locale === 'ja') return '日本語'
  if (locale === 'en') return 'English'
  if (locale === 'zh-Hant') return '繁體中文'
  return '简体中文'
}

/** Whether the locale writes Chinese, so shared Chinese rules (place connectors, aliases) apply. */
export const isChineseLocale = (locale: Locale): boolean => locale === 'zh' || locale === 'zh-Hant'
