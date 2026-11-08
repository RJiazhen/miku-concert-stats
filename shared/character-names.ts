import { parseNameMap, type NameMap, type SongLanguage } from './name-map.ts'

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
 * A character without a checked translation keeps its canonical Japanese name, never an empty label.
 */
export const localizeCharacterName = (file: CharacterNameFile, name: string, language: SongLanguage): string => {
  if (language !== 'zh') return name
  const translation = characterNameFor(file, name)
  return translation === null || translation.trim() === '' ? name : translation
}

/** Collation locale for character names: pinyin order in Chinese, Japanese order otherwise. */
export const characterSortLocale = (language: SongLanguage): string => (language === 'zh' ? 'zh-CN' : 'ja')

/** Compares two canonical character names by the name each shows in `language`. */
export const compareCharacterNames = (
  file: CharacterNameFile,
  left: string,
  right: string,
  language: SongLanguage,
): number => {
  return localizeCharacterName(file, left, language).localeCompare(
    localizeCharacterName(file, right, language),
    characterSortLocale(language),
  )
}
