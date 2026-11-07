/**
 * Shared shape of the three hand-checked translation files: songs, series, and places all map a
 * catalog spelling to one Chinese name and are displayed through the same language switch.
 */

/** Which title script the visitor asked for. */
export type SongLanguage = 'original' | 'zh'

/** Primary name plus the original beside it, when a translation is showing. */
export type NameView = {
  primary: string
  originalNote: string | null
}

/** A catalog spelling to Chinese name file. */
export type NameMap = Record<string, string>

/**
 * Validates a translation file that maps a spelling to one Chinese name.
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
 * Formats one name for the active language.
 * Chinese mode keeps the catalog name beside the translation unless they are the same string.
 */
export const formatLocalizedName = (
  original: string,
  translation: string | null,
  language: SongLanguage,
): NameView => {
  if (language !== 'zh' || translation === null || translation.trim() === '' || translation === original) {
    return { primary: original, originalNote: null }
  }
  return { primary: translation, originalNote: original }
}
