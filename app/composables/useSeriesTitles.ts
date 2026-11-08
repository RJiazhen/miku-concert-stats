import rawZh from '~~/data/series-titles.zh-CN.json'
import rawHant from '~~/data/series-titles.zh-Hant.json'
import rawEn from '~~/data/series-titles.en.json'
import {
  formatSeriesTitle,
  localizeSeriesInName,
  localizeSeriesName,
  parseSeriesTitles,
  seriesTitleFor,
  type SeriesTitleFile,
  type SeriesTitleView,
} from '~~/shared/series-titles.ts'
import { useLocale } from './useLocale.ts'

/** Parsed once: the series list is static build-time data. */
export const seriesTitles: SeriesTitleFile = parseSeriesTitles({ zh: rawZh, 'zh-Hant': rawHant, en: rawEn })

/**
 * Localizes series names to the site's current language.
 * The language is shared with song titles and places, so one switch covers every name.
 */
export const useSeriesTitles = () => {
  const { locale } = useLocale()

  /** Chinese or English series name when that language is active, otherwise the catalog name. */
  const localizeSeries = (name: string): string => localizeSeriesName(seriesTitles, name, locale.value)

  /** Primary series name plus the catalog name when a translation is showing. */
  const seriesTitle = (name: string): SeriesTitleView =>
    formatSeriesTitle(name, seriesTitleFor(seriesTitles, name, locale.value), locale.value)

  /** Performance name with its series label in the current language; the series year stays. */
  const localizePerformanceSeries = (text: string, seriesName: string, seriesNumber: number | null): string => {
    return localizeSeriesInName(text, seriesName, seriesNumber, seriesTitles, locale.value)
  }

  return { localizeSeries, seriesTitle, localizePerformanceSeries }
}
