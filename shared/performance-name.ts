/** Whitespace separators kept in one normalized form. */
const normalize = (value: string): string => value.replace(/\s+/g, ' ').trim()

/** Punctuation left dangling at the start after a label is cut out. */
const LEADING_NOISE = /^[\s\u3000\-–—·:：,，、/|~〜]+/

/** Punctuation left dangling at the end after a label is cut out. */
const TRAILING_NOISE = /[\s\u3000\-–—·:：,，、/|~〜]+$/

/** Closing brackets that may follow a series label inside a performance name. */
const LEADING_CLOSE = /^[\s\u3000\]」』】〕》]+/

/** Opening brackets left in front of a series label. */
const LEADING_OPEN = /^[\s\u3000[「『【〔《]+/

/** Words that only connect a series label to the venue or city after it. */
const CONNECTORS = /^(in|at|presents|＠|@)\s+/i

/** A year or year range that belongs to the series label rather than the show. */
const YEAR_RANGE = /^\d{4}(?:[-–—~〜]\d{4})?/

/** Wrapper used around anniversary subtitles. */
const TILDE_WRAPPER = /〜([^〜]+)〜/g

/**
 * Labels a series can appear as inside a performance name, longest first.
 * Includes the year inside a trailing quote so `初音ミク「マジカルミライ」` + 2013
 * also matches `初音ミク「マジカルミライ 2013」`.
 */
export const seriesLabels = (seriesName: string, seriesNumber: number | null): string[] => {
  const series = normalize(seriesName)
  if (series === '') return []
  const labels = [series]
  if (seriesNumber !== null) {
    labels.push(`${series} ${seriesNumber}`, `${series}${seriesNumber}`)
    const quoted = series.match(/^(.*[「『【（(])(.+?)([」』】）)]?)$/)
    if (quoted) labels.push(`${quoted[1]}${quoted[2]} ${seriesNumber}${quoted[3] ?? ''}`)
  }
  return [...new Set(labels)].sort((left, right) => right.length - left.length)
}

/** Index of `label` inside `name`, ignoring case when folding keeps the length. */
const findLabel = (name: string, label: string): number => {
  const foldedName = name.toLowerCase()
  const foldedLabel = label.toLowerCase()
  const comparable = foldedName.length === name.length && foldedLabel.length === label.length
  return comparable ? foldedName.indexOf(foldedLabel) : name.indexOf(label)
}

/**
 * Performance name with the series label removed, so a table that already shows
 * the series and year does not repeat them in the show column.
 * Returns the remaining venue, edition, or subtitle; '' when the name is only the series label.
 */
export const shortPerformanceName = (name: string, seriesName: string, seriesNumber: number | null): string => {
  const full = normalize(name)
  for (const label of seriesLabels(seriesName, seriesNumber)) {
    const index = findLabel(full, label)
    if (index === -1) continue
    const tail = full
      .slice(index + label.length)
      .replace(LEADING_CLOSE, '')
      .replace(CONNECTORS, '')
      .replace(TILDE_WRAPPER, '$1')
      .replace(LEADING_NOISE, '')
      .replace(YEAR_RANGE, '')
      .replace(LEADING_NOISE, '')
      .replace(TRAILING_NOISE, '')
    if (tail !== '') return tail
    return full.slice(0, index).replace(LEADING_OPEN, '').replace(TRAILING_NOISE, '')
  }
  return full
}
