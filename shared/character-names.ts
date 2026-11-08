import type { Locale } from './i18n/index.ts'
import { parseNameMap, type NameMap } from './name-map.ts'

/** Canonical (Japanese) character name to its checked Chinese name. */
export type CharacterNameFile = NameMap

/**
 * Validates the character translation file.
 * Throws on a non-object, a blank key or name, and two keys that differ only in case.
 */
export const parseCharacterNames = (value: unknown): CharacterNameFile => parseNameMap(value, 'Character name')

/** Chinese name for a canonical character name, or null when the file has no row. */
export const characterNameFor = (file: CharacterNameFile, name: string): string | null => file[name] ?? null

/**
 * Display name of a character in the active language.
 * The checked file only holds Chinese names, so Japanese and English keep the canonical
 * Japanese name; a character without a translation never renders an empty label.
 */
export const localizeCharacterName = (file: CharacterNameFile, name: string, locale: Locale): string => {
  if (locale !== 'zh') return name
  const translation = characterNameFor(file, name)
  return translation === null || translation.trim() === '' ? name : translation
}

/** Collation locale for character names: pinyin order in Chinese, English and Japanese order otherwise. */
export const characterSortLocale = (locale: Locale): string => {
  if (locale === 'en') return 'en'
  return locale === 'zh' ? 'zh-CN' : 'ja'
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
