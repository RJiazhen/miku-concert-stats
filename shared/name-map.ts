import type { Locale } from './i18n/index.ts'

/**
 * Shared shape of the hand-checked translation files: songs, series, places, venues, and characters
 * all map a catalog spelling to one display name per language and share the same language switch.
 */

/** Primary name plus the original beside it, when a translation is showing. */
export type NameView = {
  primary: string
  originalNote: string | null
}

/** A catalog spelling to display name file for one language. */
export type NameMap = Record<string, string>

/** Chinese, Traditional Chinese, and English files beside each other, so one lookup serves them all. */
export type NameMaps = {
  zh: NameMap
  'zh-Hant': NameMap
  en: NameMap
}

/** Raw translation files, as read from `data/*.zh-CN.json`, `data/*.zh-Hant.json`, and `data/*.en.json`. */
export type NameMapInput = {
  zh: unknown
  'zh-Hant'?: unknown
  en?: unknown
}

/**
 * Validates a translation file that maps a spelling to one display name.
 * Throws when the value is not an object, a key is blank, a name is blank, or two keys differ
 * only in case (which would make lookup order matter).
 *
 * @param value Parsed JSON value.
 * @param what Human-readable file label used in error messages, e.g. `Series title`.
 */
export const parseNameMap = (value: unknown, what: string): NameMap => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${what} file must be an object`)
  }
  const file: NameMap = {}
  const seen = new Set<string>()
  for (const [key, name] of Object.entries(value)) {
    if (key.trim() === '') throw new Error(`${what} key is empty`)
    if (typeof name !== 'string' || name.trim() === '') throw new Error(`${what} ${key} name is empty`)
    const folded = key.toLowerCase()
    if (seen.has(folded)) throw new Error(`${what} ${key} is listed twice`)
    seen.add(folded)
    file[key] = name
  }
  return file
}

/**
 * Validates the Chinese file and the optional Traditional Chinese and English files together.
 * A missing file leaves that language's names untranslated.
 */
export const parseNameMaps = (input: NameMapInput, what: string): NameMaps => {
  return {
    zh: parseNameMap(input.zh, what),
    'zh-Hant': parseNameMap(input['zh-Hant'] ?? {}, what),
    en: parseNameMap(input.en ?? {}, what),
  }
}

/**
 * Translation of one catalog spelling in `locale`, or null when that language has no row.
 * Japanese is the catalog language, so it never takes a row from these files.
 */
export const nameIn = (maps: NameMaps, key: string, locale: Locale): string | null => {
  if (locale === 'ja') return null
  return maps[locale][key] ?? null
}

/**
 * Formats one name for the active language.
 * Japanese shows the catalog name alone; the Chinese variants and English show the translation
 * with the original underneath, unless the two are the same string.
 */
export const formatLocalizedName = (
  original: string,
  translation: string | null,
  locale: Locale,
): NameView => {
  if (locale === 'ja' || translation === null || translation.trim() === '' || translation === original) {
    return { primary: original, originalNote: null }
  }
  return { primary: translation, originalNote: original }
}
