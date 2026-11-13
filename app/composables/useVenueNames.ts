import raw from '~~/data/venue-names.en.json'
import { localizeVenueName, parseVenueNames, type VenueNameFile } from '~~/shared/venue-names.ts'
import { useLocale } from './useLocale.ts'

/** Parsed once: the venue list is static build-time data. */
export const venueNames: VenueNameFile = parseVenueNames(raw)

/**
 * Localizes venue names to the site's current language.
 * Only English has a checked file; Chinese and Japanese keep the catalog spelling.
 */
export const useVenueNames = () => {
  const { locale } = useLocale()

  /** English venue name when English is active, otherwise the VocaDB spelling. */
  const localizeVenue = (name: string | null): string | null => {
    if (name === null) return null
    return localizeVenueName(venueNames, name, locale.value)
  }

  return { localizeVenue }
}
