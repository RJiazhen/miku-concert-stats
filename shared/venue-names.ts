import type { Locale } from './i18n/index.ts'
import { parseNameMap, type NameMap } from './name-map.ts'

/** Venue as written by VocaDB to its checked English name. */
export type VenueNameFile = NameMap

/**
 * Validates the English venue list.
 * Throws when the value is not an object, a key is blank, a name is blank,
 * or two keys differ only in case.
 */
export const parseVenueNames = (value: unknown): VenueNameFile => parseNameMap(value, 'Venue name')

/**
 * Venue name in the active language.
 * Only English has a checked file; Chinese and Japanese keep the catalog spelling, and a venue
 * without a row renders its catalog name instead of an empty label.
 */
export const localizeVenueName = (file: VenueNameFile, name: string, locale: Locale): string => {
  if (locale !== 'en') return name
  return file[name] ?? name
}
