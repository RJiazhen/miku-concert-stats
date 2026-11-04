import { seriesLabels } from './performance-name.ts'
import type { SongLanguage } from './song-titles.ts'

/**
 * Series as written by VocaDB to its checked Chinese name.
 *
 * `MIKU EXPO` and `MIKU WITH YOU` are deliberately absent: their official Latin
 * spelling is the one Chinese-speaking fans use, so they keep the catalog name.
 */
export type SeriesTitleFile = Record<string, string>

/**
 * Validates the Chinese series list.
 * Throws when the file is not an object, a key is blank, a name is blank,
 * or two keys differ only in case.
 */
export const parseSeriesTitles = (value: unknown): SeriesTitleFile => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Series title file must be an object')
  }
  const file: SeriesTitleFile = {}
  const seen = new Set<string>()
  for (const [key, name] of Object.entries(value)) {
    if (key.trim() === '') throw new Error('Series title key is empty')
    if (typeof name !== 'string' || name.trim() === '') throw new Error(`Series ${key} name is empty`)
    const folded = key.toLowerCase()
    if (seen.has(folded)) throw new Error(`Series ${key} is listed twice`)
    seen.add(folded)
    file[key] = name
  }
  return file
}

/** Returns the Chinese name for a series, or null when the file has no row. */
export const seriesTitleFor = (file: SeriesTitleFile, name: string): string | null => {
  return file[name] ?? null
}

/** Primary name plus the catalog name when a Chinese name is showing. */
export type SeriesTitleView = {
  primary: string
  originalNote: string | null
}

/**
 * Formats a series name for the active language.
 * Chinese mode keeps the catalog name beside the translation unless they are the same string.
 */
export const formatSeriesTitle = (original: string, translation: string | null, language: SongLanguage): SeriesTitleView => {
  if (language !== 'zh' || translation === null || translation.trim() === '' || translation === original) {
    return { primary: original, originalNote: null }
  }
  return { primary: translation, originalNote: original }
}

/**
 * Chinese series name for the active language, falling back to the catalog name.
 * A series without a row still renders its VocaDB name instead of an empty string.
 */
export const localizeSeriesName = (file: SeriesTitleFile, name: string, language: SongLanguage): string => {
  return formatSeriesTitle(name, seriesTitleFor(file, name), language).primary
}

/** Closes the bracket that may hold a series year inside a series name. */
const CLOSING_BRACKET = /[」』】）)]$/

/** Splits a series name that wraps its core in brackets, as `初音ミク「マジカルミライ」` does. */
const bracketParts = (name: string): { prefix: string; core: string } | null => {
  const match = name.match(/^(.*[「『【（(])(.+?)[」』】）)]?$/)
  if (match === null) return null
  return { prefix: match[1] ?? '', core: match[2] ?? '' }
}

/**
 * Rebuilds one matched series label with its Chinese name.
 * The series year stays whether it sits outside the name (`MIKU EXPO 2024`)
 * or inside the closing bracket (`初音ミク「マジカルミライ 2024」`).
 */
const translatedLabel = (label: string, seriesName: string, translation: string): string => {
  if (label.startsWith(seriesName)) return `${translation}${label.slice(seriesName.length)}`
  const parts = bracketParts(seriesName)
  if (parts === null || !label.startsWith(parts.prefix)) return translation
  const middle = label.slice(parts.prefix.length)
  if (!middle.startsWith(parts.core)) return translation
  return `${translation}${middle.slice(parts.core.length).replace(CLOSING_BRACKET, '')}`
}

/**
 * Replaces the series label inside a performance name with its Chinese name.
 * Longer labels win, so `初音ミク「マジカルミライ 2024」in TOKYO` becomes `魔法未来 2024 in TOKYO`.
 * Non-Chinese languages and series without a row keep the VocaDB text untouched.
 */
export const localizeSeriesInName = (
  text: string,
  seriesName: string,
  seriesNumber: number | null,
  file: SeriesTitleFile,
  language: SongLanguage,
): string => {
  if (language !== 'zh' || text === '') return text
  const translation = seriesTitleFor(file, seriesName)
  if (translation === null) return text
  for (const label of seriesLabels(seriesName, seriesNumber)) {
    const index = text.indexOf(label)
    if (index === -1) continue
    const end = index + label.length
    const next = text.slice(end, end + 1)
    const separator = /[A-Za-z0-9]/.test(next) ? ' ' : ''
    return `${text.slice(0, index)}${translatedLabel(label, seriesName, translation)}${separator}${text.slice(end)}`
  }
  return text
}
