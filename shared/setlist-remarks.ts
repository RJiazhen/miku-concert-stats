import { LOCALES, type Locale } from './i18n/locale.ts'

/** Stored remark text to the translations that exist for it. A missing locale is not a blank. */
export type SetlistRemarkFile = Record<string, Partial<Record<Locale, string>>>

/**
 * Locales tried before the stored remark, in order.
 * Traditional Chinese can use the Simplified row. Japanese, English, and Korean do not borrow
 * another language's translation; a missing row keeps the stored text.
 */
const FALLBACK: Record<Locale, readonly Locale[]> = {
  zh: ['zh'],
  'zh-Hant': ['zh-Hant', 'zh'],
  ja: ['ja'],
  en: ['en'],
  ko: ['ko'],
}

/**
 * Validates the remark translation file.
 * Throws when the value is not an object, a key is blank, a locale is unknown, or a translation is blank.
 */
export const parseSetlistRemarks = (value: unknown): SetlistRemarkFile => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Setlist remark file must be an object')
  }
  const file: SetlistRemarkFile = {}
  for (const [source, row] of Object.entries(value)) {
    if (source.trim() === '') throw new Error('Setlist remark key is empty')
    file[source] = parseRow(source, row)
  }
  return file
}

/**
 * Reads one remark's translations.
 * An unknown locale or a blank string is a mistake; a missing locale is left out.
 */
const parseRow = (source: string, row: unknown): Partial<Record<Locale, string>> => {
  if (row === null || typeof row !== 'object' || Array.isArray(row)) {
    throw new Error(`Setlist remark ${source} is not an object`)
  }
  const parsed: Partial<Record<Locale, string>> = {}
  for (const [locale, text] of Object.entries(row)) {
    if (!LOCALES.includes(locale as Locale)) throw new Error(`Setlist remark ${source} has an unknown locale ${locale}`)
    if (typeof text !== 'string' || text.trim() === '') throw new Error(`Setlist remark ${source} ${locale} text is empty`)
    parsed[locale as Locale] = text.trim()
  }
  return parsed
}

/**
 * Remark text for `locale`.
 * Uses that language's row, then the language's fallback chain, then the stored text.
 * A remark with no row is the stored text in every language.
 */
export const localizeSetlistRemark = (file: SetlistRemarkFile, source: string, locale: Locale): string => {
  const row = file[source]
  if (row === undefined) return source
  for (const candidate of FALLBACK[locale]) {
    const text = row[candidate]
    if (text !== undefined && text !== '') return text
  }
  return source
}
