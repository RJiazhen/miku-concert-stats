import type { Locale } from './i18n/index.ts'
import { nameIn, parseNameMaps, type NameMapInput, type NameMaps } from './name-map.ts'

/** Canonical (Japanese) character name to its checked Chinese, English, and Korean names. */
export type CharacterNameFile = NameMaps

/**
 * Validates the character translation files.
 * Throws on a non-object, a blank key or name, and two keys that differ only in case.
 */
export const parseCharacterNames = (input: NameMapInput): CharacterNameFile => parseNameMaps(input, 'Character name')

/** Display name for a canonical character name, or null when the language has no row. */
export const characterNameFor = (file: CharacterNameFile, name: string, locale: Locale): string | null =>
  nameIn(file, name, locale)

/**
 * Display name of a character in the active language.
 * Japanese keeps the canonical name; a character without a translation never renders an empty label.
 */
export const localizeCharacterName = (file: CharacterNameFile, name: string, locale: Locale): string => {
  const translation = characterNameFor(file, name, locale)
  return translation === null || translation.trim() === '' ? name : translation
}

/** Collation locale for character names: pinyin order in Chinese, English and Japanese order otherwise. */
export const characterSortLocale = (locale: Locale): string => {
  if (locale === 'en') return 'en'
  if (locale === 'zh') return 'zh-CN'
  if (locale === 'zh-Hant') return 'zh-Hant'
  if (locale === 'ko') return 'ko'
  return 'ja'
}

/** Compares two canonical character names by the name each shows in `locale`. */
export const compareCharacterNames = (
  file: CharacterNameFile,
  left: string,
  right: string,
  locale: Locale,
): number => {
  return localizeCharacterName(file, left, locale).localeCompare(
    localizeCharacterName(file, right, locale),
    characterSortLocale(locale),
  )
}
