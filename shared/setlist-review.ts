import type { Catalog, PerformanceRow, PerformanceSetlistRow, PerformanceShowSetlistRow } from './types.ts'

/** One checklist entry: a thing a human has to confirm before the next pass. */
export type ReviewEntry = {
  /** Stable id such as `A-1`, reused between regenerations. */
  id: string
  title: string
  /** Facts the reader needs before answering. */
  facts: string[]
  /** Checkbox labels; each one is printed on its own line. */
  options: string[]
}

/** One checklist section. */
export type ReviewSection = {
  /** Section letter, `A` through `F`. */
  key: string
  title: string
  /** One-line explanation shown under the heading. */
  description: string
  entries: ReviewEntry[]
}

/** A 演出 whose 場次 are still just calendar days. */
export type MultiDayPerformance = {
  performance: PerformanceRow
  shows: PerformanceShowSetlistRow[]
  setlist: PerformanceSetlistRow | null
}

/** The review checklist, ready to render. */
export type SetlistReview = {
  sections: ReviewSection[]
  summary: {
    multiDay: number
    uncertainShows: number
    lengthMismatches: number
    inheritedLists: number
    curated: number
    /** 演出 with at least one cited outside source; a log, not a to-do count. */
    sourced: number
  }
}

/** Options shared by entry kinds that ask "is this right?". */
const CONFIRM_OPTIONS = [
  'Confirm the current data is correct',
  'Needs a fix (describe below)',
  'Cannot confirm; leave as-is for now',
  'Other (describe below)',
]

/** English label for one 场次 row (keeps 日场/夜场 as catalog terms). */
const showLabel = (row: PerformanceShowSetlistRow): string => {
  if (row.date === null) return 'date unknown'
  if (row.half === 'day') return `${row.date} daytime`
  if (row.half === 'night') return `${row.date} nighttime`
  return row.date
}

/** Distinct dates of a 演出, in order. */
const datesOf = (shows: readonly PerformanceShowSetlistRow[]): string[] => {
  const dates = new Set<string>()
  for (const show of shows) if (show.date !== null) dates.add(show.date)
  return [...dates].sort()
}

/** Groups rows by one key, preserving first-seen order. */
const groupBy = <T>(rows: readonly T[], key: (row: T) => string): Map<string, T[]> => {
  const map = new Map<string, T[]>()
  for (const row of rows) {
    const bucket = map.get(key(row)) ?? []
    bucket.push(row)
    map.set(key(row), bucket)
  }
  return map
}

/**
 * Builds the checklist of data that still needs a human decision.
 *
 * The catalog already contains every attribution that a source could supply, so this is not a
 * to-do queue that blocks work: it is the list to hand over at the end of a pass. Sections A
 * through E collect unresolved or conflicting facts. The adopted-source log is deliberately not
 * repeated here: it lives in `docs/setlist-confirmation.md` and in `performance_setlist_sources`.
 *
 * @param catalog Loaded catalog with the derived 場次 layer.
 */
export const buildSetlistReview = (catalog: Catalog): SetlistReview => {
  const setlistByPerformance = new Map(catalog.performanceSetlists.map((row) => [row.performance_id, row]))
  const showsByPerformance = groupBy(catalog.performanceShowSetlists, (row) => String(row.performance_id))
  const seriesName = new Map(catalog.series.map((row) => [row.id, row.name]))
  const performanceById = new Map(catalog.performances.map((row) => [row.id, row]))

  /** Performs a stable ordering: series, then start date, then id. */
  const orderedPerformances = [...catalog.performances].sort((left, right) => {
    const leftSeries = seriesName.get(left.series_id) ?? ''
    const rightSeries = seriesName.get(right.series_id) ?? ''
    if (leftSeries !== rightSeries) return leftSeries.localeCompare(rightSeries, 'ja')
    const leftDate = left.start_date ?? '9999'
    const rightDate = right.start_date ?? '9999'
    if (leftDate !== rightDate) return leftDate.localeCompare(rightDate)
    return left.id - right.id
  })

  // A: 演出 spanning several dates that were never verified to have a day and a night show.
  const multiDay: MultiDayPerformance[] = []
  for (const performance of orderedPerformances) {
    const shows = showsByPerformance.get(String(performance.id)) ?? []
    const dates = datesOf(shows)
    const setlist = setlistByPerformance.get(performance.id) ?? null
    if (dates.length < 2) continue
    if (setlist?.day_night_dates !== null && setlist?.day_night_dates !== undefined) continue
    multiDay.push({ performance, shows, setlist })
  }
  const sectionA: ReviewEntry[] = multiDay.map((entry, index) => {
    const dates = datesOf(entry.shows)
    const facts = [
      `Series: ${seriesName.get(entry.performance.series_id) ?? String(entry.performance.series_id)}`,
      `Current data: ${entry.shows.length} 场次, derived from the date range, day/night not split`,
      `Dates: ${dates.join(', ')}`,
      `Source list: [${entry.setlist?.source_list_id ?? '—'}](https://vocadb.net/L/${entry.setlist?.source_list_id ?? ''}), ${entry.shows[0]?.item_count ?? 0} songs per 场次`,
      'VocaDB has no structured day/night field (`showtime_local` is empty)',
    ]
    return {
      id: `A-${index + 1}`,
      title: `${entry.performance.name} (演出 ${entry.performance.id})`,
      facts,
      options: [
        'Confirm every date has daytime + nighttime shows',
        'Confirm one show per day; leave as-is',
        'Some dates have two shows (describe below)',
        'Cannot confirm; leave as-is for now',
        'Other (describe below)',
      ],
    }
  })

  // B: 場次 whose attribution rests on a note that only reaches the city.
  const uncertainShows = catalog.performanceShowSetlists
    .filter((row) => row.uncertain === 1)
    .sort((left, right) => left.performance_id - right.performance_id || left.show_key.localeCompare(right.show_key))
  const sectionB: ReviewEntry[] = uncertainShows.map((show, index) => {
    const performance = performanceById.get(show.performance_id)
    const setlist = setlistByPerformance.get(show.performance_id)
    const facts = [
      `演出: ${performance?.name ?? String(show.performance_id)}`,
      `场次: ${showLabel(show)}`,
      `Current data: ${show.item_count} songs, ${show.omitted_count} rows omitted`,
      `Resolution: ${setlist?.resolution ?? 'unknown'}${setlist?.pending_review === 1 ? ' (attribution still pending review)' : ''}`,
      `Parse reasons: ${show.reasons}`,
    ]
    return {
      id: `B-${index + 1}`,
      title: `${performance?.name ?? String(show.performance_id)} · ${showLabel(show)}`,
      facts,
      options: CONFIRM_OPTIONS,
    }
  })

  // C: 場次 whose row count differs from the usual length of its source list.
  // Read the derived rows, because lengths only compare meaningfully per 場次.
  const sectionC: ReviewEntry[] = catalog.performanceShowSetlists
    .filter((row) => row.reasons.includes('setlist length mismatch'))
    .sort((left, right) => left.performance_id - right.performance_id || left.show_key.localeCompare(right.show_key))
    .map((row, index) => {
      const performance = performanceById.get(row.performance_id)
      const listId = performance?.song_list_id ?? 0
      const expected = /expected (\d+)/.exec(row.reasons)?.[1] ?? '?'
      return {
        id: `C-${index + 1}`,
        title: `${performance?.name ?? String(row.performance_id)} · ${showLabel(row)}`,
        facts: [
          `Source list: [${listId}](https://vocadb.net/L/${listId})`,
          `Current data: ${row.item_count} songs; other 场次 on the same list are usually ${expected}`,
          `Omitted ${row.omitted_count} rows`,
          `Parse reasons: ${row.reasons}`,
        ],
        options: [
          'Confirm the current row count is correct',
          'Exclude extra songs (describe below)',
          'Add missing songs (describe below)',
          'Cannot confirm; keep and mark uncertain',
          'Other (describe below)',
        ],
      }
    })

  // D: source lists with no usable note at all, inherited whole by every 演出.
  const inherited = catalog.performanceSetlists.filter((row) => row.status === 'inherited')
  const sectionD: ReviewEntry[] = [...groupBy(inherited, (row) => String(row.source_list_id))].map(([listId, rows], index) => {
    const first = rows[0]
    const names = rows
      .map((row) => performanceById.get(row.performance_id)?.name ?? String(row.performance_id))
      .slice(0, 12)
    const shows = rows.flatMap((row) => showsByPerformance.get(String(row.performance_id)) ?? [])
    return {
      id: `D-${index + 1}`,
      title: `Source list ${listId} (${rows.length} 演出, ${shows.length} 场次)`,
      facts: [
        `Source list: [${listId}](https://vocadb.net/L/${listId}), ${first?.source_row_count ?? 0} rows, no notes`,
        `Every 演出 inherits the whole list; ${shows[0]?.item_count ?? 0} songs per 场次`,
        `演出: ${names.join(', ')}${rows.length > names.length ? ` (+${rows.length - names.length} more)` : ''}`,
      ],
      options: [
        'Confirm the full setlist applies to every 场次 of these 演出',
        'There are stop-specific replacements (describe below)',
        'Cannot confirm; keep whole-list inheritance',
        'Other (describe below)',
      ],
    }
  })

  // E: rows a hand-checked correction changed.
  const curatedPerformances = catalog.performanceSetlists.filter((row) => row.change === 'curated')
  const sectionE: ReviewEntry[] = curatedPerformances.map((row, index) => {
    const performance = performanceById.get(row.performance_id)
    const shows = showsByPerformance.get(String(row.performance_id)) ?? []
    return {
      id: `E-${index + 1}`,
      title: `${performance?.name ?? String(row.performance_id)} (演出 ${row.performance_id})`,
      facts: [
        `Source list: [${row.source_list_id}](https://vocadb.net/L/${row.source_list_id}), ${row.source_row_count} rows`,
        `场次: ${shows.map(showLabel).join(', ')}`,
        `Note: ${row.note ?? '(none)'}`,
      ],
      options: ['Confirm the curation is correct', 'Needs adjustment (describe below)'],
    }
  })

  const sections: ReviewSection[] = [
    {
      key: 'A',
      title: 'Day/night shows still unverified (no structured VocaDB evidence)',
      description: 'These 演出 span multiple days, but VocaDB has no `showtime_local` and day/night splits were never hand-checked.',
      entries: sectionA,
    },
    {
      key: 'B',
      title: 'Song attribution pending (notes only reach city or date)',
      description: 'These 场次 were filtered by notes that do not pin a specific 场次.',
      entries: sectionB,
    },
    {
      key: 'C',
      title: 'Row count differs from other 场次 on the same list',
      description: 'Song counts differ from the usual length for this source list — extra songs, missing songs, or incomplete notes.',
      entries: sectionC,
    },
    {
      key: 'D',
      title: 'Source lists with no notes (whole-list inheritance)',
      description: 'These source lists have no notes; every 演出 inherits the full setlist, so stop-specific swaps cannot be proven.',
      entries: sectionD,
    },
    {
      key: 'E',
      title: 'Hand-curated rows',
      description: 'These 演出 had rows hand-specified, excluded, or added; confirm the curation is correct.',
      entries: sectionE,
    },
  ]

  return {
    sections,
    summary: {
      multiDay: sectionA.length,
      uncertainShows: sectionB.length,
      lengthMismatches: sectionC.length,
      inheritedLists: sectionD.length,
      curated: sectionE.length,
      sourced: new Set(catalog.performanceSetlistSources.map((row) => row.performance_id)).size,
    },
  }
}

/** Renders one entry with its own blank lines, checkboxes, and a fill-in block. */
const renderEntry = (entry: ReviewEntry): string[] => {
  const lines: string[] = [`### ${entry.id} · ${entry.title}`, '']
  for (const fact of entry.facts) lines.push(`- ${fact}`)
  lines.push('')
  // A reference entry has no decision to make, so it gets no checkbox and no fill-in block.
  if (entry.options.length === 0) {
    lines.push('---', '')
    return lines
  }
  for (const option of entry.options) lines.push(`- [ ] ${option}`)
  lines.push('', '**Notes**', '', '> ', '> ', '', '---', '')
  return lines
}

/**
 * Renders the checklist Markdown.
 * Every checkbox sits on its own line and every entry ends with two blank quote lines for notes,
 * so the file can be filled in by hand and re-read by the next pass.
 */
export const renderSetlistReview = (review: SetlistReview): string => {
  const total = review.sections.reduce((sum, section) => sum + section.entries.length, 0)
  const lines: string[] = [
    '# Setlist review checklist',
    '',
    `> Generated by \`pnpm report:setlist-review\` (${total} entries). Keep checked items for the next pass; do not delete rows.`,
    '> Pick one conclusion per entry, then add concrete data or links under Notes.',
    '',
    '## Overview',
    '',
    '| Section | Count |',
    '| --- | --- |',
    ...review.sections.map((section) => `| ${section.key} ${section.title} | ${section.entries.length} |`),
    '',
    '> Source records (URL, access date, confidence) live in `docs/setlist-confirmation.md` §1 and the `/shows` footer; this checklist does not repeat them.',
    '',
    '---',
    '',
  ]
  for (const section of review.sections) {
    lines.push(`## ${section.key}. ${section.title}`, '', section.description, '')
    if (section.entries.length === 0) {
      lines.push('Nothing to confirm in this section for this pass.', '', '---', '')
      continue
    }
    for (const entry of section.entries) lines.push(...renderEntry(entry))
  }
  return lines.join('\n')
}
