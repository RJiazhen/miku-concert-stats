import rawZh from '~~/data/place-names.zh-CN.json'
import rawEn from '~~/data/place-names.en.json'
import { localizePlaceNames, parsePlaceNames, type PlaceNameIndex } from '~~/shared/place-names.ts'
import { useLocale } from './useLocale.ts'

/** Parsed once: the place list is static build-time data. */
export const placeNames: PlaceNameIndex = parsePlaceNames({ zh: rawZh, en: rawEn })

/**
 * Localizes the place inside a performance name or a venue label to the site's current language.
 * Chinese and English replace the spelling with the checked name; Japanese keeps the VocaDB text.
 */
export const usePlaceNames = () => {
  const { locale } = useLocale()

  /** Chinese or English place name when that language is active, otherwise the VocaDB text. */
  const localizePlace = (text: string): string => localizePlaceNames(text, placeNames, locale.value)

  return { localizePlace }
}
