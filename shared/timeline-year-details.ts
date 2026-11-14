import type {
  TimelineCharacterSongYear,
  TimelineCityYear,
  TimelinePerformance,
} from './timeline.ts'

/**
 * Performances belonging to the selected year, used by the series chart footer list.
 * An empty result means the footer stays closed even though year-selection may still be set.
 */
export const performancesOfYear = (
  performances: TimelinePerformance[],
  year: number | null,
): TimelinePerformance[] => {
  if (year === null) return []
  return performances.filter((row) => row.year === year)
}

/**
 * Character song rows for the selected year with positive counts only, most songs first.
 * Zero or absent roles stay out of the clicked-year footer.
 */
export const positiveCharacterYearRows = (
  rows: TimelineCharacterSongYear[],
  year: number | null,
  compareNames: (left: string, right: string) => number = (left, right) => left.localeCompare(right),
): TimelineCharacterSongYear[] => {
  if (year === null) return []
  return rows
    .filter((row) => row.year === year && row.count > 0)
    .sort((left, right) => right.count - left.count || compareNames(left.name, right.name))
}

/**
 * City coverage of the selected year, or null when that year has no domestic / overseas /
 * online / unknown-country 演出. A gap year keeps year-selection but does not open an empty footer.
 */
export const cityYearDetail = (
  rows: TimelineCityYear[],
  year: number | null,
): TimelineCityYear | null => {
  if (year === null) return null
  const row = rows.find((entry) => entry.year === year)
  if (row === undefined) return null
  if (row.domestic + row.overseas + row.online + row.unknownCountry <= 0) return null
  return row
}
