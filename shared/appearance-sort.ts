/**
 * Sort state for the 出场记录 table on a song page.
 * Every column starts ascending; the date column still keeps the historical
 * date-then-show-id order, so the untouched table reads exactly as before.
 */

/** Columns of the 出场记录 table that can be sorted. */
export type AppearanceSortKey = 'date' | 'series' | 'venue' | 'note'

/** Direction of the active sort. */
export type AppearanceSortDirection = 'asc' | 'desc'

/** One active column and its direction. */
export type AppearanceSort = {
  key: AppearanceSortKey
  direction: AppearanceSortDirection
}

/** The fields the appearance comparators read. */
export type AppearanceSortRow = {
  date: string | null
  seriesName: string
  seriesNumber: number | null
  /** Localized show / city name shown in the 场次 column. */
  performanceName: string
  performanceId: number
  /** 备注 as plain display text; an empty string is the cell that prints —. */
  noteText: string
}

/** Locale used for Chinese series names and Japanese show names. */
const TEXT_LOCALE = 'zh-Hans'

/** A `YYYY-MM-DD` day, validated so malformed dates sort with the blanks. */
const DAY = /^(\d{4})-(\d{2})-(\d{2})$/

/**
 * Chronological key for a day string, or null when it is missing or malformed.
 * Parsed rather than compared as text so the order never depends on digit widths.
 */
const dayKey = (date: string | null): number | null => {
  if (date === null) return null
  const match = DAY.exec(date)
  if (match === null) return null
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

/**
 * Display text of a column, which is what the header sorts by.
 * Returns an empty string for a blank cell so blanks can be pushed to the end.
 */
const columnText = (row: AppearanceSortRow, key: AppearanceSortKey): string => {
  if (key === 'series') return row.seriesNumber === null ? row.seriesName : `${row.seriesName} ${row.seriesNumber}`
  if (key === 'venue') return row.performanceName
  if (key === 'note') return row.noteText
  return ''
}

/** Whether a cell is blank; the date column is blank when it has no usable day. */
const isBlank = (row: AppearanceSortRow, key: AppearanceSortKey): boolean =>
  key === 'date' ? dayKey(row.date) === null : columnText(row, key) === ''

/** Compares Chinese display strings, reading embedded numbers numerically. */
const compareText = (left: string, right: string): number => left.localeCompare(right, TEXT_LOCALE, { numeric: true })

/** Ascending comparison of two non-blank cells, ignoring the direction. */
const comparePrimary = (left: AppearanceSortRow, right: AppearanceSortRow, key: AppearanceSortKey): number => {
  if (key === 'date') {
    return (dayKey(left.date) ?? 0) - (dayKey(right.date) ?? 0)
  }
  return compareText(columnText(left, key), columnText(right, key))
}

/**
 * Deterministic tie-break shared by every column: the day first, then the show id.
 * Ascending tie-breaks keep rows with an equal key in the order the table has
 * always used, regardless of which column is active or which way it points.
 */
const compareTieBreak = (left: AppearanceSortRow, right: AppearanceSortRow): number => {
  const leftDay = dayKey(left.date)
  const rightDay = dayKey(right.date)
  if (leftDay !== rightDay) {
    if (leftDay === null) return 1
    if (rightDay === null) return -1
    return leftDay - rightDay
  }
  return left.performanceId - right.performanceId
}

/**
 * Compares two appearance rows for the active column and direction.
 * Blank cells always come last, in both directions; equal keys fall back to
 * the date-then-show-id tie-break so the order is stable.
 */
export const compareAppearances = (
  left: AppearanceSortRow,
  right: AppearanceSortRow,
  key: AppearanceSortKey,
  direction: AppearanceSortDirection = 'asc',
): number => {
  const leftBlank = isBlank(left, key)
  const rightBlank = isBlank(right, key)
  if (leftBlank !== rightBlank) return leftBlank ? 1 : -1
  if (!leftBlank) {
    const primary = comparePrimary(left, right, key)
    if (primary !== 0) return direction === 'desc' ? -primary : primary
  }
  return compareTieBreak(left, right)
}

/** Copies the rows into the order the active column asks for; the input stays untouched. */
export const sortAppearances = <T extends AppearanceSortRow>(rows: readonly T[], sort: AppearanceSort): T[] =>
  [...rows].sort((left, right) => compareAppearances(left, right, sort.key, sort.direction))

/**
 * Sort state after a header click: an inactive column starts ascending, the
 * active column flips between ascending and descending.
 */
export const nextAppearanceSort = (current: AppearanceSort, key: AppearanceSortKey): AppearanceSort => {
  if (current.key !== key) return { key, direction: 'asc' }
  return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
}
