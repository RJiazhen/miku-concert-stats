import type { Locale } from './i18n/index.ts'
import { localizePlaceNames, type PlaceNameIndex } from './place-names.ts'
import { localizeSeriesInName, localizeSeriesName, type SeriesTitleFile } from './series-titles.ts'
import { localizeVenueName, type VenueNameFile } from './venue-names.ts'

/**
 * One name written in the three API languages.
 * `ja` is the catalog spelling, so a caller that only has a translation never loses the original.
 */
export type LocalizedText = {
  ja: string
  zh: string
  en: string
}

/** Inputs shared by the performance name helpers. */
type PerformanceNameInput = {
  /** Catalog performance name, usually Japanese. */
  name: string
  /** Catalog series name, used to find the series label inside `name`. */
  seriesName: string
  /** Series year; it stays in the translated label. */
  seriesNumber: number | null
  seriesTitles: SeriesTitleFile
  places: PlaceNameIndex
}

/**
 * One performance name in `locale`.
 * The series label is translated first, then checked place names (`in TOKYO`, `東京都`) follow,
 * which is the same order the show pages use. Japanese keeps the catalog text untouched.
 */
export const performanceNameIn = (input: PerformanceNameInput, locale: Locale): string => {
  const seriesLocalized = localizeSeriesInName(
    input.name,
    input.seriesName,
    input.seriesNumber,
    input.seriesTitles,
    locale,
  )
  return localizePlaceNames(seriesLocalized, input.places, locale)
}

/** One performance name in every language, so one payload row can carry all three. */
export const allPerformanceNames = (input: PerformanceNameInput): LocalizedText => {
  return {
    ja: input.name,
    zh: performanceNameIn(input, 'zh'),
    en: performanceNameIn(input, 'en'),
  }
}

/** One series name in every language; a series without a translation keeps the catalog name. */
export const allSeriesNames = (name: string, seriesTitles: SeriesTitleFile): LocalizedText => {
  return {
    ja: name,
    zh: localizeSeriesName(seriesTitles, name, 'zh'),
    en: localizeSeriesName(seriesTitles, name, 'en'),
  }
}

/** The English venue name, or the catalog spelling when the venue list has no row. */
export const venueNameEn = (file: VenueNameFile, name: string | null): string | null => {
  if (name === null) return null
  return localizeVenueName(file, name, 'en')
}
