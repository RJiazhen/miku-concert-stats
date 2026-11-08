import type { Locale } from './i18n/index.ts'
import { formatLocalizedName, parseNameMap, type NameView } from './name-map.ts'
import { seriesLabels } from './performance-name.ts'

/**
 * Series as written by VocaDB to its checked Chinese name.
 *
 * `MIKU EXPO` is deliberately absent: its official Latin spelling is the one
 * Chinese-speaking fans use, so it keeps the catalog name.
 */
export type SeriesTitleFile = Record<string, string>

/**
 * Validates the Chinese series list.
 * Throws when the file is not an object, a key is blank, a name is blank,
 * or two keys differ only in case.
 */
export const parseSeriesTitles = (value: unknown): SeriesTitleFile => parseNameMap(value, 'Series title')

/** Returns the Chinese name for a series, or null when the file has no row. */
export const seriesTitleFor = (file: SeriesTitleFile, name: string): string | null => {
  return file[name] ?? null
}

/** Primary name plus the catalog name when a Chinese name is showing. */
export type SeriesTitleView = NameView

/**
 * Formats a series name for the active language.
 * Chinese and English keep the catalog name beside the translation unless they are the same string.
 */
export const formatSeriesTitle = (original: string, translation: string | null, locale: Locale): SeriesTitleView => {
  return formatLocalizedName(original, translation, locale)
}

/**
 * Chinese series name for the active language, falling back to the catalog name.
 * A series without a row still renders its VocaDB name instead of an empty string.
 */
export const localizeSeriesName = (file: SeriesTitleFile, name: string, locale: Locale): string => {
  return formatSeriesTitle(name, seriesTitleFor(file, name), locale).primary
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
 * Japanese, English, and series without a row keep the VocaDB text untouched.
 */
export const localizeSeriesInName = (
  text: string,
  seriesName: string,
  seriesNumber: number | null,
  file: SeriesTitleFile,
  locale: Locale,
): string => {
  if (locale !== 'zh' || text === '') return text
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
