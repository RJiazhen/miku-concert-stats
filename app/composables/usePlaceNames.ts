import raw from '~~/data/place-names.zh-CN.json'
import { localizePlaceNames, parsePlaceNames, type PlaceNameIndex } from '~~/shared/place-names.ts'
import { useLocale } from './useLocale.ts'

/** Parsed once: the place list is static build-time data. */
export const placeNames: PlaceNameIndex = parsePlaceNames(raw)

/**
 * Localizes the place inside a performance name to the site's current language.
 * The checked file only holds Chinese names, so Japanese and English keep the VocaDB text.
 */
export const usePlaceNames = () => {
  const { locale } = useLocale()

  /** Chinese place names when the site language is Chinese, otherwise the VocaDB text. */
  const localizePlace = (text: string): string => localizePlaceNames(text, placeNames, locale.value)

  return { localizePlace }
}
