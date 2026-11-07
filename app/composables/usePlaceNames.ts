import raw from '~~/data/place-names.zh-CN.json'
import { localizePlaceNames, parsePlaceNames, type PlaceNameIndex } from '~~/shared/place-names.ts'
import { useSongLanguage } from './useSongLanguage.ts'

/** Parsed once: the place list is static build-time data. */
export const placeNames: PlaceNameIndex = parsePlaceNames(raw)

/**
 * Localizes the place inside a performance name to the site's current language.
 * The language is shared with song titles, so one switch covers names and places.
 */
export const usePlaceNames = () => {
  const { language } = useSongLanguage()

  /** Chinese place names when the site language is Chinese, otherwise the VocaDB text. */
  const localizePlace = (text: string): string => localizePlaceNames(text, placeNames, language.value)

  return { localizePlace }
}
