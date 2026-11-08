import type { Locale } from './i18n/index.ts'
import { formatLocalizedName, nameIn, parseNameMaps, type NameMapInput, type NameMaps, type NameView } from './name-map.ts'
import { seriesLabels } from './performance-name.ts'

/**
 * Series as written by VocaDB to its checked Chinese and English names.
 *
 * `MIKU EXPO` is deliberately absent from the Chinese file: its official Latin spelling is the
 * one Chinese-speaking fans use, so it keeps the catalog name. The English file holds the
 * official English series names and keeps Latin names that already are English.
 */
export type SeriesTitleFile = NameMaps

/**
 * Validates the series files.
 * Throws when a file is not an object, a key is blank, a name is blank,
 * or two keys differ only in case.
 */
export const parseSeriesTitles = (input: NameMapInput): SeriesTitleFile => parseNameMaps(input, 'Series title')

/** Returns the series name in `locale`, or null when that language has no row. */
export const seriesTitleFor = (file: SeriesTitleFile, name: string, locale: Locale): string | null =>
  nameIn(file, name, locale)

/** Primary name plus the catalog name when a translation is showing. */
export type SeriesTitleView = NameView

/**
 * Formats a series name for the active language.
 * Chinese and English keep the catalog name beside the translation unless they are the same string;
 * Japanese shows the catalog name alone.
 */
export const formatSeriesTitle = (original: string, translation: string | null, locale: Locale): SeriesTitleView => {
  return formatLocalizedName(original, translation, locale)
}

/**
 * Series name for the active language, falling back to the catalog name.
 * A series without a row still renders its VocaDB name instead of an empty string.
 */
export const localizeSeriesName = (file: SeriesTitleFile, name: string, locale: Locale): string => {
  return formatSeriesTitle(name, seriesTitleFor(file, name, locale), locale).primary
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
 * Rebuilds one matched series label with its translated name.
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
 * Replaces the series label inside a performance name with its name in the active language.
 * Longer labels win, so `初音ミク「マジカルミライ 2024」in TOKYO` becomes `魔法未来 2024 in TOKYO`
 * in Chinese and `Magical Mirai 2024 in TOKYO` in English.
 * Japanese, and series without a row, keep the VocaDB text untouched.
 */
export const localizeSeriesInName = (
  text: string,
  seriesName: string,
  seriesNumber: number | null,
  file: SeriesTitleFile,
  locale: Locale,
): string => {
  if (locale === 'ja' || text === '') return text
  const translation = seriesTitleFor(file, seriesName, locale)
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
