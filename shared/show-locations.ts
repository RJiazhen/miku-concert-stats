/**
 * Show-location table: one row per city the catalog performs in, with the country that city
 * belongs to. `data/show-locations.json` is the hand-maintained source; `scripts/show-locations.ts`
 * reads it, fills `performances.country_code` where VocaDB left it empty, and prints the table.
 *
 * City keys are the same Chinese names `matchCity` returns, so a location can be joined to a
 * performance without a second naming scheme. Aliases and venues are refreshed from the catalog;
 * only `country` is maintained by hand.
 */

import type { CityIndex, CityShow } from './cities.ts'
import { matchCity } from './cities.ts'

/** Version of the JSON layout; bump when a field changes shape. */
const FILE_VERSION = 1

/** File-level note written on every save, so the file explains itself in review. */
const FILE_NOTE = '按城市登记演出国家。aliases / venues 由 pnpm locations --sync 从目录刷新，country 手工维护；出现冲突时不覆盖 performances.country_code。'

/** ISO 3166-1 alpha-2 code in upper case. */
export type CountryCode = string

/** One city-level show location. */
export type ShowLocation = {
  /** Chinese city key, identical to `matchCity(...).city`. */
  city: string
  /** Country the city belongs to; null while nobody has filled it in. */
  country: CountryCode | null
  /** Catalog spellings that resolved to this city, e.g. `Tokyo`, `東京都`. */
  aliases: string[]
  /** Venues the catalog records in this city. */
  venues: string[]
  /** Optional maintainer note. */
  note?: string
}

/** Parsed `data/show-locations.json`. */
export type ShowLocationIndex = {
  version: typeof FILE_VERSION
  locations: readonly ShowLocation[]
  /** City key to its row, for O(1) joins against `matchCity`. */
  byCity: ReadonlyMap<string, ShowLocation>
}

/** A city-matchable performance plus the country code the table may fill in. */
export type LocationPerformance = CityShow & { country_code: string | null }

/** Performances of one city, as read from the catalog before the table decides a country. */
export type LocationGroup = {
  city: string
  aliases: string[]
  venues: string[]
  performances: {
    id: number
    /** `country_code` exactly as the catalog stores it. */
    country: string | null
  }[]
}

/** A country code to the performances that only need it filled in, not replaced. */
export type ShowLocationUpdate = {
  country: CountryCode
  performanceIds: number[]
}

/** A performance whose stored code disagrees with the location table. */
export type ShowLocationConflict = {
  performanceId: number
  city: string
  stored: string
  expected: CountryCode
}

/** Result of turning the table into performance-level updates. */
export type ShowLocationPlan = {
  updates: ShowLocationUpdate[]
  conflicts: ShowLocationConflict[]
  /** Cities the table still has no country for. */
  missingCities: string[]
}

let regionNames: Intl.DisplayNames | null = null

/** Shared region-name formatter, created once because construction is not free. */
const regionDisplay = (): Intl.DisplayNames => {
  regionNames ??= new Intl.DisplayNames(['zh-CN'], { type: 'region' })
  return regionNames
}

/** Chinese name of an ISO 3166-1 alpha-2 code, or the code itself when Intl has no name. */
export const countryName = (code: string): string => {
  const upper = code.toUpperCase()
  return regionDisplay().of(upper) ?? upper
}

/** Whether a value is an assigned ISO 3166-1 alpha-2 code (`ZZ`, the placeholder, is rejected). */
export const isCountryCode = (value: string): boolean => {
  const upper = value.toUpperCase()
  if (!/^[A-Z]{2}$/.test(upper) || upper === 'ZZ') return false
  return regionDisplay().of(upper) !== upper
}

/** Reads a required non-empty string. */
const text = (value: unknown, context: string): string => {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`${context} must be a non-empty string`)
  return value.trim()
}

/** Reads an array of non-empty strings. */
const textList = (value: unknown, context: string): string[] => {
  if (!Array.isArray(value)) throw new Error(`${context} must be an array of strings`)
  return value.map((item, index) => text(item, `${context}[${index}]`))
}

/** Reads one location row. */
const parseLocation = (value: unknown, position: number): ShowLocation => {
  const context = `Show location #${position + 1}`
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${context} must be an object`)
  }
  const record = value as Record<string, unknown>
  const city = text(record.city, `${context} city`)
  let country: CountryCode | null = null
  if (record.country !== null && record.country !== undefined) {
    const raw = text(record.country, `${context} country`)
    if (!isCountryCode(raw)) throw new Error(`${context} country ${raw} is not an ISO 3166-1 alpha-2 code`)
    country = raw.toUpperCase()
  }
  const aliases = record.aliases === undefined ? [] : textList(record.aliases, `${context} aliases`)
  const venues = record.venues === undefined ? [] : textList(record.venues, `${context} venues`)
  if (record.note !== undefined && typeof record.note !== 'string') {
    throw new Error(`${context} note must be text`)
  }
  const location: ShowLocation = { city, country, aliases, venues }
  if (typeof record.note === 'string' && record.note.trim() !== '') location.note = record.note.trim()
  return location
}

/** Builds the city lookup of a location list, rejecting duplicate city keys. */
const indexLocations = (locations: ShowLocation[]): ShowLocationIndex => {
  const byCity = new Map<string, ShowLocation>()
  for (const location of locations) {
    if (byCity.has(location.city)) throw new Error(`Show location ${location.city} is listed twice`)
    byCity.set(location.city, location)
  }
  return { version: FILE_VERSION, locations, byCity }
}

/** Stable order: Chinese city name, so diffs stay small. */
export const compareLocations = (left: ShowLocation, right: ShowLocation): number => {
  return left.city.localeCompare(right.city, 'zh')
}

/**
 * Validates `data/show-locations.json`.
 * Throws on a wrong version, a blank city, an invalid country code, a non-text alias / venue /
 * note, or a duplicated city key.
 */
export const parseShowLocations = (value: unknown): ShowLocationIndex => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Show location file must be an object')
  }
  const record = value as Record<string, unknown>
  if (record.version !== FILE_VERSION) {
    throw new Error(`Show location file version must be ${FILE_VERSION}`)
  }
  if (!Array.isArray(record.locations)) throw new Error('Show location file locations must be an array')
  return indexLocations(record.locations.map(parseLocation))
}

/** Renders the table back to JSON, sorted by city and with the file-level note. */
export const serializeShowLocations = (index: ShowLocationIndex): string => {
  const locations = [...index.locations].sort(compareLocations).map((location) => {
    const row: Record<string, unknown> = {
      city: location.city,
      country: location.country,
      aliases: [...location.aliases].sort(),
      venues: [...location.venues].sort(),
    }
    if (location.note !== undefined) row.note = location.note
    return row
  })
  return `${JSON.stringify({ version: FILE_VERSION, note: FILE_NOTE, locations }, null, 2)}\n`
}

/** One country code when every stored code of a group agrees; null when they disagree or are all empty. */
const inferredCountry = (group: LocationGroup): CountryCode | null => {
  const codes = new Set(
    group.performances
      .map((performance) => performance.country?.trim().toUpperCase() ?? '')
      .filter((code) => code !== ''),
  )
  return codes.size === 1 ? [...codes][0] ?? null : null
}

/** Groups catalog performances by the city `matchCity` resolves. */
export const groupPerformancesByLocation = (
  performances: readonly LocationPerformance[],
  index: CityIndex,
): { groups: LocationGroup[]; unknownCityIds: number[] } => {
  const groups = new Map<string, LocationGroup>()
  const unknownCityIds: number[] = []
  for (const performance of performances) {
    const match = matchCity(performance, index)
    if (match === null) {
      unknownCityIds.push(performance.id)
      continue
    }
    const group = groups.get(match.city) ?? { city: match.city, aliases: [], venues: [], performances: [] }
    if (!group.aliases.includes(match.original)) group.aliases.push(match.original)
    const venue = performance.venue_name?.trim() ?? ''
    if (venue !== '' && !group.venues.includes(venue)) group.venues.push(venue)
    group.performances.push({ id: performance.id, country: performance.country_code })
    groups.set(match.city, group)
  }
  return {
    groups: [...groups.values()].sort((left, right) => left.city.localeCompare(right.city, 'zh')),
    unknownCityIds: unknownCityIds.sort((left, right) => left - right),
  }
}

/**
 * Merges catalog facts into the table without touching a country that is already set.
 * A city missing from the catalog is kept in the file, so a rename never drops a country.
 * Aliases and venues always follow the catalog.
 */
export const mergeLocationGroups = (
  index: ShowLocationIndex,
  groups: readonly LocationGroup[],
): { index: ShowLocationIndex; stale: ShowLocation[] } => {
  const seen = new Set<string>()
  const merged = groups.map((group): ShowLocation => {
    seen.add(group.city)
    const existing = index.byCity.get(group.city)
    const location: ShowLocation = {
      city: group.city,
      country: existing?.country ?? inferredCountry(group),
      aliases: [...group.aliases].sort(),
      venues: [...group.venues].sort(),
    }
    if (existing?.note !== undefined) location.note = existing.note
    return location
  })
  const stale = index.locations.filter((location) => !seen.has(location.city))
  return { index: indexLocations([...merged, ...stale].sort(compareLocations)), stale }
}

/** Sets one city's country, leaving every other row untouched. */
export const setLocationCountry = (
  index: ShowLocationIndex,
  city: string,
  country: CountryCode,
): ShowLocationIndex => {
  const existing = index.byCity.get(city)
  if (existing === undefined) throw new Error(`Show location ${city} is not in the table`)
  if (!isCountryCode(country)) throw new Error(`${country} is not an ISO 3166-1 alpha-2 code`)
  const updated: ShowLocation = { ...existing, country: country.toUpperCase() }
  return indexLocations(index.locations.map((location) => (location.city === city ? updated : location)))
}

/** Case-insensitive search over city, aliases, venues, country code, and country name. */
export const filterLocations = (index: ShowLocationIndex, query: string): ShowLocation[] => {
  const needle = query.trim().toLowerCase()
  if (needle === '') return [...index.locations]
  return index.locations.filter((location) => {
    const haystack = [
      location.city,
      ...location.aliases,
      ...location.venues,
      location.country ?? '',
      location.country === null ? '' : countryName(location.country),
    ]
    return haystack.some((value) => value.toLowerCase().includes(needle))
  })
}

/** Exact match on city or an alias, used before falling back to a single search hit. */
export const findLocationByKey = (index: ShowLocationIndex, key: string): ShowLocation | null => {
  const needle = key.trim().toLowerCase()
  if (needle === '') return null
  return index.locations.find((location) => {
    return location.city.toLowerCase() === needle
      || location.aliases.some((alias) => alias.toLowerCase() === needle)
  }) ?? null
}

/**
 * Turns the table into the performance-level changes the catalog needs.
 * Only blank `country_code` values are filled; a row that already carries a different code is
 * reported as a conflict instead of being rewritten.
 */
export const planShowLocationUpdates = (
  groups: readonly LocationGroup[],
  index: ShowLocationIndex,
): ShowLocationPlan => {
  const byCountry = new Map<CountryCode, number[]>()
  const conflicts: ShowLocationConflict[] = []
  const missingCities: string[] = []
  for (const group of groups) {
    const country = index.byCity.get(group.city)?.country ?? null
    if (country === null) {
      missingCities.push(group.city)
      continue
    }
    for (const performance of group.performances) {
      const stored = performance.country?.trim().toUpperCase() ?? ''
      if (stored === '') {
        const ids = byCountry.get(country) ?? []
        ids.push(performance.id)
        byCountry.set(country, ids)
      } else if (stored !== country) {
        conflicts.push({ performanceId: performance.id, city: group.city, stored, expected: country })
      }
    }
  }
  const updates = [...byCountry.entries()]
    .map(([country, performanceIds]) => ({
      country,
      performanceIds: performanceIds.sort((left, right) => left - right),
    }))
    .sort((left, right) => left.country.localeCompare(right.country))
  conflicts.sort((left, right) => left.performanceId - right.performanceId)
  return { updates, conflicts, missingCities: missingCities.sort((left, right) => left.localeCompare(right, 'zh')) }
}

/**
 * Renders the generated increment.
 * Every statement is idempotent and guarded by a blank `country_code`, so a later VocaDB
 * collection run cannot lose a manually registered country and an existing code never changes.
 */
export const renderShowLocationSql = (plan: ShowLocationPlan): string => {
  const lines = [
    '-- Show-location countries, generated by scripts/show-locations.ts from data/show-locations.json.',
    '-- Only fills performances.country_code that VocaDB left empty; an existing code is never replaced.',
    '-- Edit the JSON table, run `pnpm locations --sync`, then rebuild the catalog.',
    '',
  ]
  if (plan.updates.length === 0) {
    lines.push('-- No performance needs a country code.')
    return `${lines.join('\n')}\n`
  }
  for (const update of plan.updates) {
    lines.push(`-- ${countryName(update.country)} (${update.country})`)
    for (let start = 0; start < update.performanceIds.length; start += 90) {
      const chunk = update.performanceIds.slice(start, start + 90)
      lines.push(
        `UPDATE performances SET country_code = '${update.country}' `
          + `WHERE (country_code IS NULL OR trim(country_code) = '') AND id IN (${chunk.join(', ')});`,
      )
    }
  }
  return `${lines.join('\n')}\n`
}
