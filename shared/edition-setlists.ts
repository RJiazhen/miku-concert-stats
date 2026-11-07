import type { ResolvedRotationLine, RotationReview } from './rotation.ts'
import {
  groupRowsIntoSlots,
  parseNoteSelectors,
  selectorLabel,
  type SlotItem,
  type SlotRow,
} from './setlist-slots.ts'
import type { Catalog, PerformanceRow } from './types.ts'

/** One region group from `data/setlist-merges.json`. */
export type SetlistMergeEntry = {
  group: string
  note?: string
}

/** Song list id string to its region group. */
export type SetlistMergeFile = Record<string, SetlistMergeEntry>

/** Lookups for the hand-checked region groups. */
export type SetlistMergeIndex = {
  /** Group key for a song list, or null when it stands alone. */
  groupOf: (songListId: number) => string | null
  /** Song list ids in a group, sorted by id. */
  listsOf: (group: string) => number[]
  groups: ReadonlyMap<string, readonly number[]>
  entries: ReadonlyMap<number, SetlistMergeEntry>
  size: number
}

/** Empty index so callers can skip region merging without branching. */
export const emptySetlistMergeIndex = (): SetlistMergeIndex => ({
  groupOf: () => null,
  listsOf: () => [],
  groups: new Map(),
  entries: new Map(),
  size: 0,
})

/** Reads a decimal song list id from a JSON key. */
const readSongListId = (key: string): number => {
  if (!/^[1-9]\d*$/.test(key)) throw new Error(`Setlist merge key ${key} is not a song list id`)
  return Number(key)
}

/**
 * Validates the region merge file.
 * Throws when a key is not a song list id, a group name is blank, or a note is not text.
 */
export const parseSetlistMerges = (value: unknown): SetlistMergeIndex => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Setlist merge file must be an object')
  }
  const entries = new Map<number, SetlistMergeEntry>()
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    const listId = readSongListId(key)
    if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new Error(`Setlist merge ${listId} is not an object`)
    }
    const record = entry as Record<string, unknown>
    if (typeof record.group !== 'string' || record.group.trim() === '') {
      throw new Error(`Setlist merge ${listId} group is empty`)
    }
    if (record.note !== undefined && typeof record.note !== 'string') {
      throw new Error(`Setlist merge ${listId} note is not text`)
    }
    const parsed: SetlistMergeEntry = { group: record.group }
    if (typeof record.note === 'string') parsed.note = record.note
    entries.set(listId, parsed)
  }
  const groups = new Map<string, number[]>()
  for (const [listId, entry] of entries) {
    const list = groups.get(entry.group) ?? []
    list.push(listId)
    groups.set(entry.group, list)
  }
  for (const list of groups.values()) list.sort((left, right) => left - right)
  return {
    groupOf: (songListId: number) => entries.get(songListId)?.group ?? null,
    listsOf: (group: string) => [...(groups.get(group) ?? [])],
    groups,
    entries,
    size: entries.size,
  }
}

/** Splits song list ids into merged groups plus standalone sides, each side ordered by id. */
export const partitionSongLists = (listIds: readonly number[], merges: SetlistMergeIndex): number[][] => {
  const groups = new Map<string, number[]>()
  const standalone: number[] = []
  for (const listId of [...listIds].sort((left, right) => left - right)) {
    const group = merges.groupOf(listId)
    if (group === null) {
      standalone.push(listId)
      continue
    }
    const list = groups.get(group) ?? []
    list.push(listId)
    groups.set(group, list)
  }
  const sides = [...groups.values()].map((list) => [...list].sort((left, right) => left - right))
  for (const listId of standalone) sides.push([listId])
  return sides.sort((left, right) => (left[0] ?? 0) - (right[0] ?? 0))
}

/**
 * Display sides for one edition.
 * A song list whose parsed length disagrees with its own shows is shown on its own instead of merged,
 * because a different song count means the two setlists are not the same programme.
 */
export const displaySides = (
  listIds: readonly number[],
  merges: SetlistMergeIndex,
  review: RotationReview,
): number[][] => {
  const mismatched = new Set(review.shows.map((show) => show.songListId))
  const sides: number[][] = []
  for (const side of partitionSongLists(listIds, merges)) {
    if (side.length === 1) {
      sides.push(side)
      continue
    }
    const keep = side.filter((listId) => !mismatched.has(listId))
    const dropped = side.filter((listId) => mismatched.has(listId))
    if (keep.length > 1) sides.push(keep)
    else for (const listId of keep) sides.push([listId])
    for (const listId of dropped) sides.push([listId])
  }
  return sides.sort((left, right) => (left[0] ?? 0) - (right[0] ?? 0))
}

/** One displayed setlist row after folding and slot numbering. */
export type SetlistDisplayRow = {
  /** Printed slot number; rows inside one slot share it. */
  index: number
  items: SlotItem[]
  /** Null when every 演出 of the display plays this row. */
  showLabel: string | null
  /** Label read from the row's setlist notes, e.g. `大阪 第 2 天`; null when the label is only names. */
  selectorLabel: string | null
  /** Full 演出 names for this row, used as the title text. */
  showDetail: string[]
  /** 演出 the parser assigns to this row, aligned with `showDetail`. */
  performanceIds: number[]
  /** Rows sharing this slot number. */
  slotSize: number
}

/** A whole merged comparison or a single song list, ready to render. */
export type SetlistDisplay = {
  listIds: number[]
  baseListId: number
  allPerformanceIds: number[]
  rows: SetlistDisplayRow[]
  slotCount: number
  /** Rows folded into a shared slot, i.e. total rows minus slots. */
  mergedRowCount: number
}

/** Song list id to the performances that share it. */
const performancesByList = (catalog: Catalog): Map<number, PerformanceRow[]> => {
  const map = new Map<number, PerformanceRow[]>()
  for (const performance of catalog.performances) {
    if (performance.song_list_id === null) continue
    const list = map.get(performance.song_list_id) ?? []
    list.push(performance)
    map.set(performance.song_list_id, list)
  }
  return map
}

/** Builds the grouping item for one rotation line. */
const itemOf = (line: ResolvedRotationLine): SlotItem => ({
  songListId: line.songListId,
  position: line.position,
  songIds: [...line.songIds],
  notes: line.notes,
  performanceIds: [...line.performanceIds],
  selectors: parseNoteSelectors(line.notes),
})

/** Sorted rotation lines for one song list. */
const linesOfList = (review: RotationReview, songListId: number): ResolvedRotationLine[] => {
  return review.lines.filter((line) => line.songListId === songListId).sort((left, right) => left.position - right.position)
}

/** Picks the list that seeds the merged order: most shows, then most lines, then lowest id. */
const pickBase = (
  listIds: readonly number[],
  byList: ReadonlyMap<number, PerformanceRow[]>,
  review: RotationReview,
): number => {
  let best = listIds[0] ?? 0
  let bestShows = -1
  let bestLines = -1
  for (const listId of [...listIds].sort((left, right) => left - right)) {
    const shows = byList.get(listId)?.length ?? 0
    const lines = linesOfList(review, listId).length
    if (shows > bestShows || (shows === bestShows && lines > bestLines)) {
      best = listId
      bestShows = shows
      bestLines = lines
    }
  }
  return best
}

/** Longest common subsequence pairs for two id sequences. */
const lcsPairs = (left: readonly number[], right: readonly number[]): [number, number][] => {
  const rows = left.length
  const columns = right.length
  const table: number[][] = Array.from({ length: rows + 1 }, () => new Array<number>(columns + 1).fill(0))
  for (let i = rows - 1; i >= 0; i--) {
    for (let j = columns - 1; j >= 0; j--) {
      table[i]![j] = left[i] === right[j] ? table[i + 1]![j + 1]! + 1 : Math.max(table[i + 1]![j]!, table[i]![j + 1]!)
    }
  }
  const pairs: [number, number][] = []
  let i = 0
  let j = 0
  while (i < rows && j < columns) {
    if (left[i] === right[j]) {
      pairs.push([i, j])
      i++
      j++
      continue
    }
    if (table[i + 1]![j]! >= table[i]![j + 1]!) i++
    else j++
  }
  return pairs
}

/** One row while the merged order is still being built. */
type WorkingRow = {
  anchor: number
  items: SlotItem[]
}

/**
 * Builds a merged setlist for one song list, or for a group of song lists that cover the same
 * series year (the cross-演出 comparison view). The list with the most 演出 seeds the order;
 * the others align by longest common subsequence.
 * A song that appears in another list at a different position folds into the row that already holds it.
 */
export const buildSetlistDisplay = (
  catalog: Catalog,
  review: RotationReview,
  listIds: readonly number[],
): SetlistDisplay => {
  const byList = performancesByList(catalog)
  const ids = [...new Set(listIds)].sort((left, right) => left - right)
  const baseListId = pickBase(ids, byList, review)
  const baseLines = linesOfList(review, baseListId)
  const rows: WorkingRow[] = baseLines.map((line) => ({ anchor: line.listedSongId, items: [itemOf(line)] }))

  for (const listId of ids) {
    if (listId === baseListId) continue
    const lines = linesOfList(review, listId)
    const pairs = lcsPairs(baseLines.map((line) => line.listedSongId), lines.map((line) => line.listedSongId))
    const matchedBase = new Map<number, number>()
    for (const [baseIndex, otherIndex] of pairs) matchedBase.set(otherIndex, baseIndex)
    const insertAfter = new Map<number, SlotItem[]>()
    let lastBase = -1
    lines.forEach((line, otherIndex) => {
      const baseIndex = matchedBase.get(otherIndex)
      if (baseIndex !== undefined) {
        const row = rows[baseIndex]
        if (row) row.items.push(itemOf(line))
        lastBase = baseIndex
        return
      }
      const item = itemOf(line)
      const bucket = insertAfter.get(lastBase) ?? []
      bucket.push(item)
      insertAfter.set(lastBase, bucket)
    })
    if (insertAfter.size > 0) {
      const rebuilt: WorkingRow[] = []
      for (let index = -1; index < rows.length; index++) {
        if (index >= 0) {
          const row = rows[index]
          if (row) rebuilt.push(row)
        }
        for (const item of insertAfter.get(index) ?? []) {
          rebuilt.push({ anchor: item.songIds[0] ?? item.position, items: [item] })
        }
      }
      rows.length = 0
      rows.push(...rebuilt)
    }
  }

  // Fold a later row whose anchor song already appeared earlier.
  const seen = new Map<number, WorkingRow>()
  const folded: WorkingRow[] = []
  for (const row of rows) {
    const existing = seen.get(row.anchor)
    if (existing) {
      existing.items.push(...row.items)
      continue
    }
    seen.set(row.anchor, row)
    folded.push(row)
  }

  const allPerformanceIds = [...new Set(ids.flatMap((listId) => (byList.get(listId) ?? []).map((row) => row.id)))].sort(
    (left, right) => left - right,
  )
  const allShowSet = new Set(allPerformanceIds)
  const performanceById = new Map(catalog.performances.map((row) => [row.id, row]))
  const slots = groupRowsIntoSlots(folded.map((row): SlotRow => ({ items: row.items })))
  const displayRows: SetlistDisplayRow[] = []
  let index = 0
  for (const slot of slots) {
    index++
    for (const row of slot.rows) {
      const shows = [...new Set(row.items.flatMap((item) => item.performanceIds))].sort((left, right) => left - right)
      const coversEveryShow =
        allPerformanceIds.length > 0 && shows.length === allPerformanceIds.length && shows.every((id) => allShowSet.has(id))
      const selectors = row.items.flatMap((item) => item.selectors)
      const timed = selectors.some((selector) => selector.day !== null || selector.show !== null || selector.half !== null)
      // A song every show plays needs a note only when it shares a slot and the note names the day or half.
      const annotate = !coversEveryShow || (slot.rows.length > 1 && timed)
      const selector = annotate ? selectorLabel(selectors) : null
      const label = annotate ? selector ?? showNames(shows, performanceById) : null
      displayRows.push({
        index,
        items: row.items,
        showLabel: label,
        selectorLabel: selector,
        showDetail: shows.map((id) => performanceById.get(id)?.name ?? String(id)),
        performanceIds: shows,
        slotSize: slot.rows.length,
      })
    }
  }
  return {
    listIds: ids,
    baseListId,
    allPerformanceIds,
    rows: displayRows,
    slotCount: slots.length,
    mergedRowCount: displayRows.length - slots.length,
  }
}

/** Joins performance names for a row that has no usable note. */
const showNames = (ids: readonly number[], performances: ReadonlyMap<number, PerformanceRow>): string | null => {
  if (ids.length === 0) return null
  return ids.map((id) => performances.get(id)?.name ?? String(id)).join('、')
}

/** What the 演出 column shows for one row. */
export type PerformanceCell = {
  /** Text for the cell; empty when the row needs no note on this page. */
  text: string
  /** Full 演出 names behind the cell, used as the tooltip. */
  title: string[]
}

/** Inputs for one row's 演出 cell. */
export type PerformanceCellInput = {
  /** Note-derived label such as `大阪 第 2 天`; wins over 演出 names when present. */
  selectorLabel: string | null
  /** 演出 the parser assigns to this row. */
  performanceIds: readonly number[]
  /** Full 演出 names, aligned with `performanceIds`. */
  names: readonly string[]
  /** 演出 in the displayed setlist, used to detect rows every 演出 plays. */
  allPerformanceIds: readonly number[]
  /** 演出 the page shows; null on the raw view and the cross-演出 comparison, where nothing is suppressed. */
  currentPerformanceId: number | null
  /** City of the page's 演出, so a city-only note for that same city is dropped. */
  currentCity: string | null
  /** Shortens a full 演出 name to its city or subtitle, e.g. `台湾`. */
  shortName: (name: string) => string
}

/**
 * Text for the 演出 column.
 * On a show page the page's own 演出 is already named by the header, so a row that only
 * covers it stays blank; rows owned by, or shared with, another 演出 keep a shortened
 * name list. Without a current 演出 (the raw view and the comparison view) the full names are kept.
 */
export const performanceCellOf = (input: PerformanceCellInput): PerformanceCell => {
  const title = [...input.names]
  const current = input.currentPerformanceId
  if (current === null) {
    return { text: input.selectorLabel ?? input.names.join('、'), title }
  }
  if (input.selectorLabel !== null) {
    const redundant = input.currentCity !== null && input.selectorLabel === input.currentCity
    return { text: redundant ? '' : input.selectorLabel, title }
  }
  const everyShow = new Set(input.allPerformanceIds)
  const coversEveryShow =
    input.performanceIds.length > 0 &&
    input.performanceIds.length === everyShow.size &&
    input.performanceIds.every((id) => everyShow.has(id))
  if (coversEveryShow) return { text: '', title }

  const pairs = input.performanceIds.map((id, index) => ({ id, name: input.names[index] ?? '' }))
  const others = pairs.filter((pair) => pair.id !== current)
  if (others.length === 0) return { text: '', title }
  const shown = pairs.some((pair) => pair.id === current) ? pairs : others
  const texts: string[] = []
  for (const pair of shown) {
    const short = input.shortName(pair.name).trim()
    const text = short === '' ? pair.name.trim() : short
    if (text !== '' && !texts.includes(text)) texts.push(text)
  }
  return { text: texts.join('、'), title }
}
