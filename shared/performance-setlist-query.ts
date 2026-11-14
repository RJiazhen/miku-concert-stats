import type { Translate } from './i18n/index.ts'
import { performanceSchedules, type PerformanceShow } from './event-schedule.ts'
import { performanceDateLabel, performanceStatusOf } from './performance-date-label.ts'
import type { RotationReview } from './rotation.ts'
import type { Catalog, PerformanceShowSetlistItemRow, PerformanceShowSetlistRow } from './types.ts'

/**
 * 場次 of every 演出 read from the derived layer, only for 演出 that have derived rows.
 * The keys are the same `PerformanceShow` objects the pages print.
 */
export const catalogSchedules = (catalog: Catalog, t?: Translate): Map<number, PerformanceShow[]> => {
  const map = new Map<number, PerformanceShow[]>()
  /** Schedule label when no translator is passed (stats/build keep Chinese source labels). */
  const halfLabel = (half: 'day' | 'night'): string => {
    if (t) return t(half === 'day' ? 'common.dayShow' : 'common.nightShow')
    return half === 'day' ? '日场' : '夜场'
  }
  /** Missing show date: cancelled only when the 演出 has a sourced cancellation row. */
  const missingDate = (performanceId: number): string => {
    const status = performanceStatusOf(catalog.performanceStatus, performanceId)
    if (t) return performanceDateLabel(null, t, { status })
    return status === 'cancelled' ? '已取消' : '尚未确定'
  }
  for (const row of catalog.performanceShowSetlists) {
    const bucket = map.get(row.performance_id) ?? []
    const dateText = row.date ?? missingDate(row.performance_id)
    bucket.push({
      key: row.show_key,
      performanceId: row.performance_id,
      date: row.date ?? '',
      half: row.half,
      label: row.half === null ? dateText : `${dateText} ${halfLabel(row.half)}`,
    })
    map.set(row.performance_id, bucket)
  }
  for (const bucket of map.values()) {
    bucket.sort((left, right) => left.date.localeCompare(right.date) || (left.half ?? '').localeCompare(right.half ?? ''))
  }
  return map
}

/**
 * 場次 count per 演出 for the index pages.
 *
 * The derived layer wins wherever it has rows, because it carries the hand-checked day/night
 * split and the exhibition-only days that were removed. 演出 without derived rows fall back to
 * the note-derived schedule, so the indexes and `/shows` always agree on one number.
 */
export const showCountsByPerformance = (catalog: Catalog, review: RotationReview): Map<number, number> => {
  const counts = new Map<number, number>()
  for (const [id, shows] of performanceSchedules(catalog, review)) counts.set(id, shows.length)
  for (const [id, shows] of catalogSchedules(catalog)) counts.set(id, shows.length)
  return counts
}

/**
 * Ids of 演出 that have a setlist at all: VocaDB's own `songList` or a derived wiki / curated
 * one. A wiki-sourced 演出 has no `song_list_id`, so checking that column alone would call every
 * Wikipedia-only stop "无歌单".
 */
export const setlistPerformanceIds = (catalog: Catalog): Set<number> => {
  const ids = new Set<number>()
  for (const row of catalog.performances) {
    if (row.song_list_id !== null) ids.add(row.id)
  }
  for (const row of catalog.performanceSetlists) ids.add(row.performance_id)
  return ids
}

/** Most common value. Ties keep the larger one, matching the rotation review. */
export const modeOf = (values: readonly number[]): number => {
  const frequency = new Map<number, number>()
  for (const value of values) frequency.set(value, (frequency.get(value) ?? 0) + 1)
  let expected = values[0] ?? 0
  let best = -1
  for (const [value, times] of frequency) {
    if (times > best || (times === best && value > expected)) {
      best = times
      expected = value
    }
  }
  return expected
}

/** Parses a stored JSON reason array, tolerating a corrupted value. */
export const parseReasons = (raw: string): string[] => {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((value): value is string => typeof value === 'string')
  } catch {
    return []
  }
}

/** Songs one derived row contributes; a medley row expands to its parts. */
export const derivedItemSongIds = (catalog: Catalog, item: PerformanceShowSetlistItemRow): number[] => {
  if (item.song_id !== null) return [item.song_id]
  if (item.medley_id === null) return []
  return catalog.medleySongs
    .filter((row) => row.medley_id === item.medley_id)
    .sort((left, right) => left.position - right.position)
    .map((row) => row.song_id)
}

/** Derived rows of one 演出, grouped by 场次 and kept in printed order. */
export const derivedItemsByShow = (catalog: Catalog, performanceId: number): Map<string, PerformanceShowSetlistItemRow[]> => {
  const map = new Map<string, PerformanceShowSetlistItemRow[]>()
  for (const item of catalog.performanceShowSetlistItems) {
    if (item.performance_id !== performanceId) continue
    const bucket = map.get(item.show_key) ?? []
    bucket.push(item)
    map.set(item.show_key, bucket)
  }
  for (const bucket of map.values()) bucket.sort((left, right) => left.position - right.position)
  return map
}

/** One song or medley printed on a row, with the 場次 that played it. */
export type ShowSetlistPrintItem = {
  item: PerformanceShowSetlistItemRow
  /** 场次 that played this item; omitted when the table prints a single 场次. */
  shows?: PerformanceShowSetlistRow[]
}

/**
 * One printed row of a 场次 table, or of a merged 演出 table.
 * An ordinary row holds one item; a replacement slot holds every alternative it covers.
 * The page prints one table row per item and merges the 序号 cell across the slot's rows,
 * so the numbering still ends at the song count of a single 場次.
 */
export type ShowSetlistPrintRow = {
  /** Printed 序号; in a merged table this is the slot number the alternatives share. */
  position: number
  /** Song or medley alternatives printed under this 序号, in calendar order of their 場次. */
  items: ShowSetlistPrintItem[]
}

/** Result of merging the 场次 setlists of one 演出. */
export type MergedShowSetlist = {
  rows: ShowSetlistPrintRow[]
  /** False when the shows are too different for one shared programme to be honest. */
  mergeable: boolean
}

/** Identity of one printed row: a single song, or a medley that expands to its parts. */
const setlistRowKey = (item: PerformanceShowSetlistItemRow): string =>
  item.medley_id === null ? `song:${item.song_id}` : `medley:${item.medley_id}`

/**
 * Merges the 场次 setlists of one 演出 into one programme.
 *
 * The longest 场次 (earliest on a tie) gives the printed order. A row only other 场次 played
 * is inserted after the nearest row those 场次 share, so the running order stays intact.
 * Rows that sit at the same single position in every 场次 that played them are alternatives of
 * one 序号: they print on separate table rows under one merged 序号 cell, so the numbering
 * still ends at the song count of a single 場次.
 * `mergeable` is false when any 场次 shares less than half its rows with the representative:
 * the shows were different programmes then, and the page keeps them apart instead of
 * inventing one setlist. Returns null for a 演出 with fewer than two 场次.
 */
export const mergeShowSetlists = (
  shows: readonly PerformanceShowSetlistRow[],
  itemsByShow: ReadonlyMap<string, readonly PerformanceShowSetlistItemRow[]>,
): MergedShowSetlist | null => {
  const ordered = [...shows].sort(
    (left, right) =>
      (left.date ?? '9999').localeCompare(right.date ?? '9999') || (left.half ?? '').localeCompare(right.half ?? ''),
  )
  const first = ordered[0]
  if (first === undefined || ordered.length < 2) return null
  const representative = ordered.reduce((best, show) => (show.item_count > best.item_count ? show : best), first)

  /** Printed rows of one 场次, in order. */
  const itemsOf = (show: PerformanceShowSetlistRow): PerformanceShowSetlistItemRow[] =>
    [...(itemsByShow.get(show.show_key) ?? [])].sort((left, right) => left.position - right.position)

  /** Row keys of one 场次, de-duplicated while keeping their printed order. */
  const keysOf = (show: PerformanceShowSetlistRow): string[] => [...new Set(itemsOf(show).map(setlistRowKey))]

  const order = keysOf(representative)
  const representativeKeys = new Set(order)
  const mergeable = ordered.every((show) => {
    const keys = keysOf(show)
    return keys.filter((key) => representativeKeys.has(key)).length * 2 >= keys.length
  })
  /** 场次 that played each row, in calendar order. */
  const showsByKey = new Map<string, PerformanceShowSetlistRow[]>()
  /** Item printed for each row; the earliest 场次 carrying it wins. */
  const itemByKey = new Map<string, PerformanceShowSetlistItemRow>()
  for (const show of ordered) {
    for (const item of itemsOf(show)) {
      const key = setlistRowKey(item)
      if (!itemByKey.has(key)) itemByKey.set(key, item)
    }
    for (const key of keysOf(show)) showsByKey.set(key, [...(showsByKey.get(key) ?? []), show])
  }

  for (const show of ordered) {
    if (show.show_key === representative.show_key) continue
    const keys = keysOf(show)
    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index]
      if (key === undefined || order.includes(key)) continue
      let insertAt = -1
      // Prefer the nearest earlier row the merged program already has.
      for (let before = index - 1; before >= 0; before -= 1) {
        const position = order.indexOf(keys[before] ?? '')
        if (position !== -1) {
          insertAt = position + 1
          break
        }
      }
      if (insertAt === -1) {
        // A row before every shared earlier row goes in front of the next shared row.
        for (let after = index + 1; after < keys.length; after += 1) {
          const position = order.indexOf(keys[after] ?? '')
          if (position !== -1) {
            insertAt = position
            break
          }
        }
      }
      order.splice(insertAt === -1 ? order.length : insertAt, 0, key)
    }
  }

  /** Positions a row occupies inside each 場次 that played it. */
  const positionsByKey = new Map<string, Set<number>>()
  for (const show of ordered) {
    for (const item of itemsOf(show)) {
      const key = setlistRowKey(item)
      const positions = positionsByKey.get(key) ?? new Set<number>()
      positions.add(item.position)
      positionsByKey.set(key, positions)
    }
  }

  /** Slot key of a row: one single position means the other rows at that position are substitutes. */
  const slotKeyOf = (key: string): string => {
    const positions = positionsByKey.get(key)
    return positions?.size === 1 ? `position:${[...positions][0]}` : `row:${key}`
  }

  // Keep the merged order but pull the alternatives of one slot together.
  const slotKeys: string[] = []
  const keysBySlot = new Map<string, string[]>()
  for (const key of order) {
    const slotKey = slotKeyOf(key)
    const keys = keysBySlot.get(slotKey)
    if (keys === undefined) {
      keysBySlot.set(slotKey, [key])
      slotKeys.push(slotKey)
      continue
    }
    keys.push(key)
  }

  /** Calendar order of the first 場次 that played a row, used to order the alternatives. */
  const firstShowOf = (key: string): string => {
    const show = showsByKey.get(key)?.[0]
    return `${show?.date ?? '9999'}:${show?.half ?? ''}`
  }

  const rows: ShowSetlistPrintRow[] = slotKeys.map((slotKey, index) => {
    const keys = [...(keysBySlot.get(slotKey) ?? [])].sort((left, right) =>
      firstShowOf(left).localeCompare(firstShowOf(right)),
    )
    return {
      position: index + 1,
      items: keys.flatMap((key) => {
        const item = itemByKey.get(key)
        return item === undefined ? [] : [{ item, shows: showsByKey.get(key) ?? [] }]
      }),
    }
  })

  return { rows, mergeable }
}

