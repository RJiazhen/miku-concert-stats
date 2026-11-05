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
    pendingReview: number
  }
}

/** Options shared by entry kinds that ask "is this right?". */
const CONFIRM_OPTIONS = [
  '确认当前数据正确',
  '需要修正（写在下方补充说明）',
  '无法确认，暂时保持现状',
  '其它（写在下方补充说明）',
]

/** Chinese label for one 场次 row. */
const showLabel = (row: PerformanceShowSetlistRow): string => {
  if (row.date === null) return '日期未知'
  if (row.half === 'day') return `${row.date} 日场`
  if (row.half === 'night') return `${row.date} 夜场`
  return row.date
}

/** Distinct dates of a 演出, in order. */
const datesOf = (shows: readonly PerformanceShowSetlistRow[]): string[] => {
  const dates = new Set<string>()
  for (const show of shows) if (show.date !== null) dates.add(show.date)
  return [...dates].sort()
}

/** Most common item count among the 演出 of one source list. */
const modeLength = (rows: readonly { performance_id: number; item_count: number }[]): number => {
  const counts = new Map<number, number>()
  for (const row of rows) counts.set(row.item_count, (counts.get(row.item_count) ?? 0) + 1)
  let best = 0
  let bestTimes = -1
  for (const [count, times] of counts) {
    if (times > bestTimes || (times === bestTimes && count > best)) {
      best = count
      bestTimes = times
    }
  }
  return best
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
 * through E collect unresolved or conflicting facts; section F lists what was adopted from a
 * non-high-confidence source (today, fan wikis) so a reader can scan it quickly.
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
      `系列：${seriesName.get(entry.performance.series_id) ?? String(entry.performance.series_id)}`,
      `当前数据：${entry.shows.length} 个场次，按起止日期推导，未拆日夜场`,
      `日期：${dates.join('、')}`,
      `源歌单：[${entry.setlist?.source_list_id ?? '—'}](https://vocadb.net/L/${entry.setlist?.source_list_id ?? ''})，每场 ${entry.shows[0]?.item_count ?? 0} 首`,
      'VocaDB 没有日夜场结构化字段（`showtime_local` 为空）',
    ]
    return {
      id: `A-${index + 1}`,
      title: `${entry.performance.name}（演出 ${entry.performance.id}）`,
      facts,
      options: ['确认这些日期每天都有昼场 + 夜场', '确认每天只有一场，保持现状', '部分日期有两场（写在下方补充说明）', '无法确认，暂时保持现状', '其它（写在下方补充说明）'],
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
      `演出：${performance?.name ?? String(show.performance_id)}`,
      `场次：${showLabel(show)}`,
      `当前数据：${show.item_count} 首，省略 ${show.omitted_count} 行`,
      `归属方式：${setlist?.resolution ?? 'unknown'}${setlist?.pending_review === 1 ? '（数据来自非高置信度来源，见 F 节）' : ''}`,
      `解析原因：${show.reasons}`,
    ]
    return {
      id: `B-${index + 1}`,
      title: `${performance?.name ?? String(show.performance_id)} · ${showLabel(show)}`,
      facts,
      options: CONFIRM_OPTIONS,
    }
  })

  // C: 演出 whose row count differs from the usual length of its source list.
  const byList = groupBy(catalog.performanceShowSetlists, (row) => {
    const performance = performanceById.get(row.performance_id)
    return String(performance?.song_list_id ?? 0)
  })
  const sectionC: ReviewEntry[] = []
  for (const [listId, rows] of byList) {
    const expected = modeLength(rows)
    for (const row of rows) {
      if (row.item_count === expected) continue
      const performance = performanceById.get(row.performance_id)
      sectionC.push({
        id: `C-${sectionC.length + 1}`,
        title: `${performance?.name ?? String(row.performance_id)} · ${showLabel(row)}`,
        facts: [
          `源歌单：[${listId}](https://vocadb.net/L/${listId})`,
          `当前数据：${row.item_count} 首；同歌单其他场次多为 ${expected} 首`,
          `省略 ${row.omitted_count} 行`,
          `解析原因：${row.reasons}`,
        ],
        options: [
          '确认当前行数正确',
          '应排除多余曲目（写在下方补充说明）',
          '应补充缺失曲目（写在下方补充说明）',
          '无法确认，保留并标记不确定',
          '其它（写在下方补充说明）',
        ],
      })
    }
  }

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
      title: `源歌单 ${listId}（${rows.length} 个演出，${shows.length} 个场次）`,
      facts: [
        `源歌单：[${listId}](https://vocadb.net/L/${listId})，${first?.source_row_count ?? 0} 行，无任何备注`,
        `每个演出整份沿用，每场 ${shows[0]?.item_count ?? 0} 首`,
        `演出：${names.join('、')}${rows.length > names.length ? ` 等 ${rows.length} 个` : ''}`,
      ],
      options: [
        '确认整份歌单适用于这些演出的每一场',
        '有分站替换曲（写在下方补充说明）',
        '无法确认，保持整份沿用',
        '其它（写在下方补充说明）',
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
      title: `${performance?.name ?? String(row.performance_id)}（演出 ${row.performance_id}）`,
      facts: [
        `源歌单：[${row.source_list_id}](https://vocadb.net/L/${row.source_list_id})，${row.source_row_count} 行`,
        `场次：${shows.map(showLabel).join('、')}`,
        `说明：${row.note ?? '（无）'}`,
      ],
      options: ['确认校正正确', '需要调整（写在下方补充说明）'],
    }
  })

  // F: the source log. Every 演出 whose rows rest on an outside page is listed here so the
  // evidence stays auditable; nothing in this section needs a decision any more.
  const cited = [...groupBy(catalog.performanceSetlistSources, (row) => String(row.performance_id))]
  const sectionF: ReviewEntry[] = cited
    .sort((left, right) => Number(left[0]) - Number(right[0]))
    .map(([performanceId, sources], index) => {
      const row = setlistByPerformance.get(Number(performanceId))
      const performance = performanceById.get(Number(performanceId))
      const shows = showsByPerformance.get(performanceId) ?? []
      const facts = [
        `演出：${performance?.name ?? performanceId}`,
        `已采用：${shows.length} 个场次 / 每场 ${shows[0]?.item_count ?? 0} 首`,
        `归属方式：${row?.resolution ?? 'unknown'}${row?.pending_review === 1 ? '（仍待核实，见对应小节）' : ''}`,
        ...sources.map((source) => `来源：${source.title}（${source.confidence}，访问于 ${source.accessed_at}）${source.url}`),
        `说明：${row?.note ?? '（无）'}`,
      ]
      return {
        id: `F-${index + 1}`,
        title: `${performance?.name ?? performanceId}（演出 ${performanceId}）`,
        facts,
        options: [],
      }
    })

  const sections: ReviewSection[] = [
    {
      key: 'A',
      title: '日夜场待核实（VocaDB 无结构化证据）',
      description: '这些演出跨多天，但 VocaDB 没有 `showtime_local`，也没有人工核实过日夜场。',
      entries: sectionA,
    },
    {
      key: 'B',
      title: '曲目归属待确认（备注只到城市或日期）',
      description: '这些场次的曲目由备注筛出，备注没有定位到具体场次。',
      entries: sectionB,
    },
    {
      key: 'C',
      title: '行数与同歌单不一致（可能漏曲或多记）',
      description: '这些场次的曲目数与同歌单其他场次不同，需要确认是多唱、漏记，还是备注没覆盖到。',
      entries: sectionC,
    },
    {
      key: 'D',
      title: '全份歌单无备注（整份沿用）',
      description: '这些源歌单没有任何备注，每个演出整份沿用，无法证明有没有分站替换曲。',
      entries: sectionD,
    },
    {
      key: 'E',
      title: '人工校正行（curated）',
      description: '这些演出的行被人工指定、排除或补充过，需要确认校正正确。',
      entries: sectionE,
    },
    {
      key: 'F',
      title: '数据来源记录（已采用，无需确认）',
      description: '每个采用外部来源的演出都在这里留档：URL、访问日期与置信度。这一节只供核对来源，不必逐条回复。',
      entries: sectionF,
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
      pendingReview: sectionF.length,
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
  lines.push('', '**补充说明**', '', '> ', '> ', '', '---', '')
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
    '# 待二次确认清单',
    '',
    `> 由 \`pnpm report:setlist-review\` 生成，共 ${total} 条。勾选后不要删除条目，便于下一轮对照。`,
    '> 每条先在勾选框里选一个结论，再在「补充说明」里写具体数据或链接。',
    '',
    '## 总览',
    '',
    '| 节 | 条数 |',
    '| --- | --- |',
    ...review.sections.map((section) => `| ${section.key} ${section.title} | ${section.entries.length} |`),
    '',
    '---',
    '',
  ]
  for (const section of review.sections) {
    lines.push(`## ${section.key}. ${section.title}`, '', section.description, '')
    if (section.entries.length === 0) {
      lines.push('本轮没有需要确认的条目。', '', '---', '')
      continue
    }
    for (const entry of section.entries) lines.push(...renderEntry(entry))
  }
  return lines.join('\n')
}
