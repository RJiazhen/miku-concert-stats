import { reviewRotations } from './rotation.ts'
import { setlistSourceTag, setlistSourceUrl } from './album-setlists.ts'
import { partitionSongLists, type SetlistMergeIndex } from './edition-setlists.ts'
import type { Catalog, PerformanceRow, SongRow } from './types.ts'

/** Structural numbers for one song list. */
export type SetlistProfile = {
  songListId: number
  /** Printed setlist lines. */
  itemCount: number
  /** Distinct VocaDB songs on those lines. */
  uniqueSongs: number
  /** Lines carrying a VocaDB note. */
  notedCount: number
  /** First line marked Encore, or null when the list has no encore segment. */
  encoreStart: number | null
  /** Lines before the encore segment. */
  mainCount: number
  /** Lines from the encore marker to the end. */
  encoreCount: number
  /** Lines that only some days or shows perform. */
  daySpecific: number
}

/** How different two song lists are. */
export type SetlistPairSeverity =
  | 'identical'
  | 'order-only'
  | 'count-differs'
  | 'segment-differs'
  | 'probably-different-program'

/** One comparison between two song lists. */
export type SetlistPair = {
  scope: 'edition' | 'adjacent-edition'
  seriesId: number
  seriesName: string
  seriesNumber: number
  leftId: number
  rightId: number
  left: SetlistProfile
  right: SetlistProfile
  /** Right line count minus left. */
  countDelta: number
  shared: number
  onlyLeft: number
  onlyRight: number
  /** Longest common subsequence over the printed song order, relative to the longer list. */
  lcsRatio: number
  mainDelta: number
  encoreDelta: number
  daySpecificDelta: number
  orderChanged: boolean
  severity: SetlistPairSeverity
  merged: boolean
  suggestion: string
}

/** Grouped report used by the page and the committed files. */
export type SetlistDiffReport = {
  editions: SetlistPair[]
  adjacentEditions: SetlistPair[]
  summary: Record<SetlistPairSeverity, number>
  pairCount: number
  mergedPairCount: number
}

/** Chinese label for each severity, shared by the page and the Markdown file. */
export const SEVERITY_LABELS: Record<SetlistPairSeverity, string> = {
  identical: '完全相同',
  'order-only': '仅顺序不同',
  'count-differs': '曲目有增减',
  'segment-differs': '正片/安可段不一致',
  'probably-different-program': '可能不是同一套节目',
}

/** Suggested action for each severity. */
const SUGGESTIONS: Record<SetlistPairSeverity, string> = {
  identical: 'VocaDB 上有两份相同歌单，可考虑只保留一份',
  'order-only': '曲目集合相同，只有顺序不同，可按同一歌单处理',
  'count-differs': '曲目有增减，需要对照官方歌单核对',
  'segment-differs': '正片或安可段数量不一致，需要重点核对',
  'probably-different-program': '曲目差异过大，可能是不同节目，建议保持独立',
}

const SEVERITY_ORDER: readonly SetlistPairSeverity[] = [
  'segment-differs',
  'count-differs',
  'probably-different-program',
  'order-only',
  'identical',
]

const ENCORE_NOTE = /encore|アンコール/i

/** Ordered song ids of one list, first occurrence only. */
const songOrder = (catalog: Catalog, songListId: number): number[] => {
  const order: number[] = []
  const seen = new Set<number>()
  for (const link of catalog.setlistItemSongs) {
    if (link.song_list_id !== songListId) continue
    if (seen.has(link.song_id)) continue
    seen.add(link.song_id)
    order.push(link.song_id)
  }
  return order
}

/** Structural profile for one song list. */
export const setlistProfile = (
  catalog: Catalog,
  songListId: number,
  performanceCount: number,
  review: ReturnType<typeof reviewRotations>,
): SetlistProfile => {
  const items = catalog.setlistItems.filter((item) => item.song_list_id === songListId)
  const encorePositions = items.filter((item) => ENCORE_NOTE.test(item.notes ?? '')).map((item) => item.position)
  const encoreStart = encorePositions.length > 0 ? Math.min(...encorePositions) : null
  const lines = review.lines.filter((line) => line.songListId === songListId)
  const daySpecific = lines.filter((line) => line.performanceIds.length < performanceCount).length
  const mainCount = encoreStart === null ? items.length : items.filter((item) => item.position < encoreStart).length
  return {
    songListId,
    itemCount: items.length,
    uniqueSongs: songOrder(catalog, songListId).length,
    notedCount: items.filter((item) => (item.notes ?? '').trim() !== '').length,
    encoreStart,
    mainCount,
    encoreCount: items.length - mainCount,
    daySpecific,
  }
}

/** Longest common subsequence length for two id sequences. */
const lcsLength = (left: readonly number[], right: readonly number[]): number => {
  const rows = left.length
  const columns = right.length
  let previous = new Array<number>(columns + 1).fill(0)
  for (let i = 1; i <= rows; i++) {
    const current = new Array<number>(columns + 1).fill(0)
    for (let j = 1; j <= columns; j++) {
      current[j] = left[i - 1] === right[j - 1] ? previous[j - 1]! + 1 : Math.max(previous[j]!, current[j - 1]!)
    }
    previous = current
  }
  return previous[columns] ?? 0
}

/** Whether a song list pair is already declared as one region group. */
const isMerged = (merges: SetlistMergeIndex, leftId: number, rightId: number): boolean => {
  const group = merges.groupOf(leftId)
  return group !== null && group === merges.groupOf(rightId)
}

/** Classifies a pair from its structural numbers. */
const classify = (pair: Omit<SetlistPair, 'severity' | 'suggestion'>): SetlistPairSeverity => {
  if (pair.countDelta === 0 && pair.lcsRatio >= 1 && pair.onlyLeft === 0 && pair.onlyRight === 0) return 'identical'
  if (pair.onlyLeft === 0 && pair.onlyRight === 0) return 'order-only'
  if (Math.abs(pair.countDelta) >= 8 || pair.lcsRatio < 0.5) return 'probably-different-program'
  if (pair.mainDelta !== 0 || pair.encoreDelta !== 0) return 'segment-differs'
  return 'count-differs'
}

/** Compares two song lists that cover the same or neighbouring editions. */
export const compareSetlists = (
  catalog: Catalog,
  merges: SetlistMergeIndex,
  series: { id: number; name: string },
  seriesNumber: number,
  leftId: number,
  rightId: number,
  scope: SetlistPair['scope'],
  performances: readonly PerformanceRow[],
  review: ReturnType<typeof reviewRotations>,
): SetlistPair => {
  const performancesByList = (listId: number): number =>
    performances.filter((row) => row.song_list_id === listId).length
  const left = setlistProfile(catalog, leftId, performancesByList(leftId), review)
  const right = setlistProfile(catalog, rightId, performancesByList(rightId), review)
  const leftSongs = songOrder(catalog, leftId)
  const rightSongs = songOrder(catalog, rightId)
  const leftSet = new Set(leftSongs)
  const rightSet = new Set(rightSongs)
  const shared = leftSongs.filter((id) => rightSet.has(id)).length
  const onlyLeft = leftSongs.filter((id) => !rightSet.has(id)).length
  const onlyRight = rightSongs.filter((id) => !leftSet.has(id)).length
  const longest = Math.max(leftSongs.length, rightSongs.length)
  const lcsRatio = longest === 0 ? 1 : lcsLength(leftSongs, rightSongs) / longest
  const base = {
    scope,
    seriesId: series.id,
    seriesName: series.name,
    seriesNumber,
    leftId,
    rightId,
    left,
    right,
    countDelta: right.itemCount - left.itemCount,
    shared,
    onlyLeft,
    onlyRight,
    lcsRatio,
    mainDelta: right.mainCount - left.mainCount,
    encoreDelta: right.encoreCount - left.encoreCount,
    daySpecificDelta: right.daySpecific - left.daySpecific,
    orderChanged: onlyLeft === 0 && onlyRight === 0 && lcsRatio < 1,
    merged: isMerged(merges, leftId, rightId),
  }
  const severity = classify(base)
  return { ...base, severity, suggestion: SUGGESTIONS[severity] }
}

/** Builds the full report for every same-edition pair plus adjacent editions. */
export const buildSetlistDiffReport = (catalog: Catalog, merges: SetlistMergeIndex): SetlistDiffReport => {
  const review = reviewRotations(catalog)
  const seriesById = new Map(catalog.series.map((row) => [row.id, row]))
  const editions = new Map<string, number[]>()
  for (const performance of catalog.performances) {
    if (performance.song_list_id === null || performance.series_number === null) continue
    const key = `${performance.series_id}:${performance.series_number}`
    const lists = editions.get(key) ?? []
    if (!lists.includes(performance.song_list_id)) lists.push(performance.song_list_id)
    editions.set(key, lists)
  }
  const pairs: SetlistPair[] = []
  for (const [key, listIds] of editions) {
    const [seriesIdText, numberText] = key.split(':')
    const seriesId = Number(seriesIdText)
    const seriesNumber = Number(numberText)
    const series = seriesById.get(seriesId) ?? { id: seriesId, name: String(seriesId) }
    const sides = partitionSongLists(listIds, merges)
    const lists = sides.flat().sort((left, right) => left - right)
    const performances = catalog.performances.filter((row) => row.series_id === seriesId && row.series_number === seriesNumber)
    for (let i = 0; i < lists.length; i++) {
      for (let j = i + 1; j < lists.length; j++) {
        const leftId = lists[i]
        const rightId = lists[j]
        if (leftId === undefined || rightId === undefined) continue
        pairs.push(compareSetlists(catalog, merges, series, seriesNumber, leftId, rightId, 'edition', performances, review))
      }
    }
  }

  const adjacent: SetlistPair[] = []
  const bySeries = new Map<number, number[]>()
  for (const [key] of editions) {
    const [seriesIdText, numberText] = key.split(':')
    const list = bySeries.get(Number(seriesIdText)) ?? []
    list.push(Number(numberText))
    bySeries.set(Number(seriesIdText), list)
  }
  for (const [seriesId, numbers] of bySeries) {
    const sorted = [...new Set(numbers)].sort((left, right) => left - right)
    for (let index = 1; index < sorted.length; index++) {
      const previousNumber = sorted[index - 1]
      const number = sorted[index]
      if (previousNumber === undefined || number === undefined) continue
      const previousLists = editions.get(`${seriesId}:${previousNumber}`) ?? []
      const currentLists = editions.get(`${seriesId}:${number}`) ?? []
      const previousBase = pickLargest(catalog, previousLists)
      const currentBase = pickLargest(catalog, currentLists)
      if (previousBase === null || currentBase === null) continue
      const series = seriesById.get(seriesId) ?? { id: seriesId, name: String(seriesId) }
      const performances = catalog.performances.filter((row) => row.series_id === seriesId)
      adjacent.push(compareSetlists(catalog, merges, series, number, previousBase, currentBase, 'adjacent-edition', performances, review))
    }
  }

  const summary = Object.fromEntries(SEVERITY_ORDER.map((severity) => [severity, 0])) as Record<SetlistPairSeverity, number>
  for (const pair of [...pairs, ...adjacent]) summary[pair.severity]++
  return {
    editions: sortPairs(pairs),
    adjacentEditions: sortPairs(adjacent),
    summary,
    pairCount: pairs.length,
    mergedPairCount: pairs.filter((pair) => pair.merged).length,
  }
}

/** Sorts pairs by severity first, then series and series year. */
const sortPairs = (pairs: SetlistPair[]): SetlistPair[] => {
  return [...pairs].sort((left, right) => {
    const severity = SEVERITY_ORDER.indexOf(left.severity) - SEVERITY_ORDER.indexOf(right.severity)
    if (severity !== 0) return severity
    if (left.seriesId !== right.seriesId) return left.seriesId - right.seriesId
    if (left.seriesNumber !== right.seriesNumber) return left.seriesNumber - right.seriesNumber
    return left.leftId - right.leftId || left.rightId - right.rightId
  })
}

/** Picks the list with the most performances, breaking ties by id. */
const pickLargest = (catalog: Catalog, listIds: readonly number[]): number | null => {
  if (listIds.length === 0) return null
  let best = listIds[0] ?? null
  let bestShows = -1
  for (const listId of [...listIds].sort((left, right) => left - right)) {
    const shows = catalog.performances.filter((row) => row.song_list_id === listId).length
    if (shows > bestShows) {
      best = listId
      bestShows = shows
    }
  }
  return best
}

/** Song names for a list of ids, falling back to the id. */
const songNames = (catalog: Catalog, ids: readonly number[]): string => {
  const byId = new Map<number, SongRow>(catalog.songs.map((row) => [row.id, row]))
  return ids.map((id) => byId.get(id)?.name ?? String(id)).join(' / ')
}

/** Song ids only present on one side of a pair. */
export const pairDifferences = (catalog: Catalog, pair: SetlistPair): { onlyLeft: number[]; onlyRight: number[] } => {
  const left = songOrder(catalog, pair.leftId)
  const right = songOrder(catalog, pair.rightId)
  const leftSet = new Set(left)
  const rightSet = new Set(right)
  return {
    onlyLeft: left.filter((id) => !rightSet.has(id)),
    onlyRight: right.filter((id) => !leftSet.has(id)),
  }
}

/** Renders one Markdown list item for a pair. */
const pairRow = (catalog: Catalog, pair: SetlistPair, checkable: boolean): string => {
  const differences = pairDifferences(catalog, pair)
  /** Markdown link for a song list; album fallbacks are tagged and point at the album. */
  const listLink = (songListId: number): string => {
    const tag = setlistSourceTag(songListId)
    const text = tag === null ? String(songListId) : `${songListId} · ${tag}`
    return `[${text}](${setlistSourceUrl(songListId)})`
  }
  const headline = [
    `**${pair.seriesName} ${pair.seriesNumber}**`,
    `${listLink(pair.leftId)} → ${listLink(pair.rightId)}`,
    `行数 ${pair.left.itemCount} → ${pair.right.itemCount}（${signed(pair.countDelta)}）`,
    `正片/安可 ${pair.left.mainCount}/${pair.left.encoreCount} → ${pair.right.mainCount}/${pair.right.encoreCount}（安可 ${signed(pair.encoreDelta)}）`,
    `共有 ${pair.shared} / 仅左 ${pair.onlyLeft} / 仅右 ${pair.onlyRight}`,
    `LCS ${pair.lcsRatio.toFixed(2)}`,
    pair.merged ? '已合并' : '未合并',
    SEVERITY_LABELS[pair.severity],
  ].join(' · ')
  const lines = [`${checkable ? '- [ ] ' : '- '}${headline}`]
  if (differences.onlyLeft.length > 0) lines.push(`      - 仅左：${songNames(catalog, differences.onlyLeft)}`)
  if (differences.onlyRight.length > 0) lines.push(`      - 仅右：${songNames(catalog, differences.onlyRight)}`)
  return lines.join('\n')
}

/** Adds an explicit plus sign to positive deltas. */
const signed = (value: number): string => (value > 0 ? `+${value}` : String(value))

/** Renders the committed Markdown report. The page shows the same rows. */
export const renderSetlistDiffMarkdown = (catalog: Catalog, report: SetlistDiffReport): string => {
  const editionSummary = Object.fromEntries(
    SEVERITY_ORDER.map((severity) => [severity, report.editions.filter((pair) => pair.severity === severity).length]),
  ) as Record<SetlistPairSeverity, number>
  const header = [
    '# 歌单差异核验报告',
    '',
    '由 `pnpm report:setlist` 生成。数据来自已提交的 VocaDB 增量 SQL，播放量快照与报告无关。',
    '每行左侧是勾选框，人工核对后可直接在此文件打勾。',
    '',
    '## 总览',
    '',
    `- 同一系列年度歌单对：${report.pairCount} 对，其中 ${report.mergedPairCount} 对已在 data/setlist-merges.json 合并`,
    ...SEVERITY_ORDER.map((severity) => `- ${SEVERITY_LABELS[severity]}：${editionSummary[severity]} 对`),
    `- 相邻系列年度对比：${report.adjacentEditions.length} 对（仅作参考，不参与上面的分级统计）`,
    '',
    '## 读法',
    '',
    '- 行数：`左 → 右（差值）`',
    '- 正片/安可：`左正片行数/左安可行数 → 右正片行数/右安可行数（安可差值）`',
    '- 共有 / 仅左 / 仅右：按去重曲目统计',
    '- LCS：最长公共子序列占比，1.00 表示顺序完全相同',
    '- 「未合并」表示两份歌单目前分开显示；确认是同一套节目后，可写入 `data/setlist-merges.json`',
    '',
  ]
  const section = (title: string, pairs: readonly SetlistPair[], checkable: boolean, empty: string): string[] => {
    if (pairs.length === 0) return [`## ${title}`, '', empty, '']
    return [`## ${title}`, '', ...pairs.map((pair) => pairRow(catalog, pair, checkable)), '']
  }
  return [
    ...header,
    ...section('同一系列年度歌单对', report.editions, true, '没有需要核对的组合。'),
    ...section('相邻系列年度对比', report.adjacentEditions, false, '没有可比对的相邻系列年度。'),
  ].join('\n')
}

/** Renders the committed CSV report. */
export const renderSetlistDiffCsv = (catalog: Catalog, report: SetlistDiffReport): string => {
  const escape = (value: string): string => `"${value.replaceAll('"', '""')}"`
  const header = [
    'scope',
    'series',
    'series_number',
    'left_list',
    'right_list',
    'left_rows',
    'right_rows',
    'row_delta',
    'left_main',
    'right_main',
    'left_encore',
    'right_encore',
    'encore_delta',
    'shared',
    'only_left',
    'only_right',
    'lcs',
    'merged',
    'severity',
    'only_left_songs',
    'only_right_songs',
  ]
  const rows = [...report.editions, ...report.adjacentEditions].map((pair) => {
    const differences = pairDifferences(catalog, pair)
    return [
      pair.scope,
      pair.seriesName,
      String(pair.seriesNumber),
      String(pair.leftId),
      String(pair.rightId),
      String(pair.left.itemCount),
      String(pair.right.itemCount),
      String(pair.countDelta),
      String(pair.left.mainCount),
      String(pair.right.mainCount),
      String(pair.left.encoreCount),
      String(pair.right.encoreCount),
      String(pair.encoreDelta),
      String(pair.shared),
      String(pair.onlyLeft),
      String(pair.onlyRight),
      pair.lcsRatio.toFixed(3),
      pair.merged ? 'yes' : 'no',
      pair.severity,
      songNames(catalog, differences.onlyLeft),
      songNames(catalog, differences.onlyRight),
    ].map(escape)
  })
  return [header.join(','), ...rows.map((row) => row.join(','))].join('\n') + '\n'
}
