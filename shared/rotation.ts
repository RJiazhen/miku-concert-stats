import type { Catalog, PerformanceRow } from './types.ts'

/** Fields the rotation parser reads from a performance that shares a song list. */
export type RotationPerformance = Pick<
  PerformanceRow,
  'id' | 'name' | 'name_ja' | 'venue_name' | 'series_suffix' | 'start_date' | 'end_date'
>

/** Performances a setlist note assigns, plus why the assignment may be wrong. */
export type RotationParse = {
  performanceIds: number[]
  uncertain: boolean
  reasons: string[]
}

/** One segment of a VocaDB setlist note after splitting on slashes and commas. */
type SegmentParse = {
  parsed: boolean
  performanceIds: number[]
  reasons: string[]
}

/** Canonical city key and the spellings that appear in notes or event names. */
const CITY_ALIASES: readonly (readonly [string, readonly string[]])[] = [
  ['tokyo', ['tokyo', '東京']],
  ['osaka', ['osaka', '大阪']],
  ['fukuoka', ['fukuoka', '福岡']],
  ['sapporo', ['sapporo', '札幌']],
  ['nagoya', ['nagoya', '名古屋']],
  ['yokohama', ['yokohama', '横浜']],
  ['sendai', ['sendai', '仙台']],
  ['kobe', ['kobe', '神戸']],
  ['kyoto', ['kyoto', '京都']],
  ['hiroshima', ['hiroshima', '広島']],
  ['new york', ['new york']],
  ['los angeles', ['los angeles']],
  ['san jose', ['san jose']],
  ['cedar park', ['cedar park']],
  ['hong kong', ['hong kong', '香港']],
  ['kuala lumpur', ['kuala lumpur']],
  ['mexico city', ['mexico city']],
  ['denver', ['denver']],
  ['phoenix', ['phoenix']],
  ['austin', ['austin']],
  ['washington', ['washington']],
  ['detroit', ['detroit']],
  ['newark', ['newark']],
  ['hamilton', ['hamilton']],
  ['brisbane', ['brisbane']],
  ['sydney', ['sydney']],
  ['perth', ['perth']],
  ['melbourne', ['melbourne']],
  ['auckland', ['auckland']],
  ['paris', ['paris']],
  ['berlin', ['berlin']],
  ['london', ['london']],
  ['beijing', ['beijing', '北京']],
  ['shanghai', ['shanghai', '上海']],
  ['chengdu', ['chengdu', '成都']],
  ['guangzhou', ['guangzhou', '广州']],
  ['seoul', ['seoul', 'ソウル', '首尔', '首爾']],
  ['taipei', ['taipei', '台北']],
  ['manila', ['manila']],
  ['singapore', ['singapore']],
  ['jakarta', ['jakarta']],
  ['bangkok', ['bangkok']],
  ['taichung', ['taichung']],
]

const HALF_SHOW = /daytime|nighttime|afternoon|evening|1st(?:\s+and\s+2nd)?\s+show|2nd\s+show|昼|夜/i

/**
 * Parses a free-text setlist note into performance ids.
 * Blank notes mean every performance of the list. Unrecognized text stays uncertain and falls back to every performance only when nothing in the note parsed.
 */
export const parseRotationNotes = (
  notes: string | null,
  performances: readonly RotationPerformance[],
): RotationParse => {
  const everyId = performances.map((row) => row.id).sort((left, right) => left - right)
  if (notes === null || notes.trim() === '') {
    return { performanceIds: everyId, uncertain: false, reasons: [] }
  }
  const reasons = new Set<string>()
  const matched = new Set<number>()
  let parsedAny = false
  for (const segment of splitNote(notes)) {
    const piece = parseSegment(segment, performances)
    if (piece.parsed) {
      parsedAny = true
      for (const id of piece.performanceIds) matched.add(id)
    }
    for (const reason of piece.reasons) reasons.add(reason)
  }
  const performanceIds = parsedAny ? [...matched].sort((left, right) => left - right) : everyId
  return {
    performanceIds,
    uncertain: reasons.size > 0 || !parsedAny,
    reasons: [...reasons].sort(),
  }
}

/** Splits a note on slashes and commas, keeping parenthetical day markers intact. */
const splitNote = (notes: string): string[] => {
  return notes
    .split(/\s*[/／]\s*|\s*[,、]\s*/)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)
}

/** Parses one city or day segment against the performances that share the song list. */
const parseSegment = (segment: string, performances: readonly RotationPerformance[]): SegmentParse => {
  const paren = segment.match(/^(.+?)\s*\(\s*day\s*(\d+)\s*\)(.*)$/i)
  if (paren) return daySegment(paren[2] ?? '', paren[1] ?? '', paren[3] ?? '', performances)
  const cityThenDay = segment.match(/^(.+?)\s+day\s*(\d+)\b(.*)$/i)
  if (cityThenDay && !/^day$/i.test((cityThenDay[1] ?? '').trim())) {
    return daySegment(cityThenDay[2] ?? '', cityThenDay[1] ?? '', cityThenDay[3] ?? '', performances)
  }
  const dayFirst = segment.match(/^day\s*(\d+)\b(.*)$/i)
  if (dayFirst) return daySegment(dayFirst[1] ?? '', dayFirst[2] ?? '', '', performances)
  if (/^(daytime|nighttime|afternoon|evening)\s+(?:shows?|concert)$/i.test(segment)) {
    return {
      parsed: true,
      performanceIds: performances.map((row) => row.id),
      reasons: ['day with day/night shows'],
    }
  }
  const city = cityKey(segment)
  if (!city) return { parsed: false, performanceIds: [], reasons: ['unknown format'] }
  const matches = performances.filter((row) => performanceCity(row) === city)
  if (matches.length === 0) return { parsed: false, performanceIds: [], reasons: ['unmatched city'] }
  const dates = distinctDates(matches)
  const several = matches.length > 1 || dates.length > 1
  return {
    parsed: true,
    performanceIds: matches.map((row) => row.id),
    reasons: several ? ['city-only when city has several shows'] : [],
  }
}

/** Reads a day number and an optional city from one segment. */
const daySegment = (
  dayText: string,
  cityText: string,
  extra: string,
  performances: readonly RotationPerformance[],
): SegmentParse => {
  const citySource = `${cityText} ${extra}`.trim()
  const city = cityKey(citySource)
  const half = HALF_SHOW.test(`${cityText} ${extra}`)
  if (!city && /[a-z\u3040-\u9fff]/i.test(citySource) && !half && !/^shows?$/i.test(citySource)) {
    return { parsed: false, performanceIds: [], reasons: ['unmatched city'] }
  }
  return assignDay(Number(dayText), city, half, performances)
}

/**
 * Resolves Day N inside one city, or across the list when the note names no city.
 * More than one performance on that date is a day/night ambiguity.
 */
const assignDay = (
  day: number,
  city: string | null,
  half: boolean,
  performances: readonly RotationPerformance[],
): SegmentParse => {
  const reasons = new Set<string>()
  if (!Number.isInteger(day) || day < 1) return { parsed: false, performanceIds: [], reasons: ['unknown format'] }
  const cities = new Set(performances.map((row) => performanceCity(row)).filter((key): key is string => key !== null))
  const pool = city
    ? performances.filter((row) => performanceCity(row) === city)
    : cities.size <= 1
      ? [...performances]
      : []
  if (city && pool.length === 0) return { parsed: false, performanceIds: [], reasons: ['unmatched city'] }
  if (!city && pool.length === 0) return { parsed: false, performanceIds: [], reasons: ['unknown format'] }
  const dates = distinctDates(pool)
  const date = dates[day - 1]
  if (!date) return { parsed: false, performanceIds: [], reasons: ['unknown format'] }
  const covering = pool.filter((row) => datesOf(row).includes(date))
  if (covering.length > 1 || half) reasons.add('day with day/night shows')
  return { parsed: true, performanceIds: covering.map((row) => row.id), reasons: [...reasons] }
}

/** City key for a note fragment or performance label. Longer aliases win. */
const cityKey = (text: string): string | null => {
  const haystack = text.toLowerCase()
  let best: { key: string; length: number } | null = null
  for (const [key, aliases] of CITY_ALIASES) {
    for (const alias of aliases) {
      if (!aliasIn(haystack, alias)) continue
      if (!best || alias.length > best.length) best = { key, length: alias.length }
    }
  }
  return best?.key ?? null
}

/** City named by a performance's title, venue, or series suffix. */
const performanceCity = (performance: RotationPerformance): string | null => {
  return cityKey([performance.name, performance.name_ja ?? '', performance.venue_name ?? '', performance.series_suffix ?? ''].join('\n'))
}

/** Whether an alias occurs as a whole token. Japanese aliases match by inclusion. */
const aliasIn = (haystack: string, alias: string): boolean => {
  if ([...alias].some((char) => char.charCodeAt(0) > 127)) return haystack.includes(alias)
  const pattern = new RegExp(`(?:^|[^a-z0-9])${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:$|[^a-z0-9])`, 'i')
  return pattern.test(haystack)
}

/** Sorted unique calendar days covered by these performances. */
const distinctDates = (performances: readonly RotationPerformance[]): string[] => {
  const dates = new Set<string>()
  for (const performance of performances) {
    for (const date of datesOf(performance)) dates.add(date)
  }
  return [...dates].sort()
}

/** One setlist line after note parsing and the length check. */
export type ResolvedRotationLine = {
  songListId: number
  position: number
  listedSongId: number
  songIds: number[]
  notes: string | null
  performanceIds: number[]
  uncertain: boolean
  reasons: string[]
}

/** A show whose parsed setlist length is not the usual length for that song list. */
export type MismatchedShow = {
  performanceId: number
  songListId: number
  count: number
  expected: number
  reasons: string[]
}

/** Parsed lines plus shows that failed the per-list length check. */
export type RotationReview = {
  lines: ResolvedRotationLine[]
  shows: MismatchedShow[]
}

/**
 * Parses every setlist line and flags shows whose song count is not the mode for that list.
 * Selective or already uncertain lines on a mismatched list inherit `setlist length mismatch: X vs expected Y`.
 */
export const reviewRotations = (catalog: Catalog): RotationReview => {
  const performancesByList = new Map<number, PerformanceRow[]>()
  for (const performance of catalog.performances) {
    if (performance.song_list_id === null) continue
    const rows = performancesByList.get(performance.song_list_id) ?? []
    rows.push(performance)
    performancesByList.set(performance.song_list_id, rows)
  }
  const songsByPosition = new Map<string, number[]>()
  for (const link of catalog.setlistItemSongs) {
    const key = `${link.song_list_id}:${link.position}`
    const songs = songsByPosition.get(key) ?? []
    songs.push(link.song_id)
    songsByPosition.set(key, songs)
  }

  const lines: ResolvedRotationLine[] = []
  const shows: MismatchedShow[] = []
  const lists = new Set<number>([...performancesByList.keys(), ...catalog.setlistItems.map((item) => item.song_list_id)])
  for (const songListId of lists) {
    const performances = performancesByList.get(songListId) ?? []
    const items = catalog.setlistItems.filter((item) => item.song_list_id === songListId)
    const parsed: ResolvedRotationLine[] = items.map((item) => {
      const rotation = parseRotationNotes(item.notes, performances)
      return {
        songListId,
        position: item.position,
        listedSongId: item.listed_song_id,
        songIds: songsByPosition.get(`${songListId}:${item.position}`) ?? [],
        notes: item.notes,
        performanceIds: rotation.performanceIds,
        uncertain: rotation.uncertain,
        reasons: [...rotation.reasons],
      }
    })
    const mismatched = lengthMismatches(songListId, performances, parsed)
    if (mismatched.length > 0) {
      const everyId = new Set(performances.map((row) => row.id))
      for (const line of parsed) {
        const selective = line.uncertain || line.performanceIds.length !== everyId.size
        if (!selective) continue
        for (const show of mismatched) addReason(line, show.reasons[0] ?? '')
      }
    }
    lines.push(...parsed)
    shows.push(...mismatched)
  }
  return { lines, shows }
}

/** Shows whose parsed line count is not the most common length on that song list. */
const lengthMismatches = (
  songListId: number,
  performances: readonly PerformanceRow[],
  lines: readonly ResolvedRotationLine[],
): MismatchedShow[] => {
  if (performances.length === 0) return []
  const counts = performances.map((performance) => lines.filter((line) => line.performanceIds.includes(performance.id)).length)
  const expected = modeCount(counts)
  const mismatches: MismatchedShow[] = []
  performances.forEach((performance, index) => {
    const count = counts[index] ?? 0
    if (count === expected) return
    mismatches.push({
      performanceId: performance.id,
      songListId,
      count,
      expected,
      reasons: [`setlist length mismatch: ${count} vs expected ${expected}`],
    })
  })
  return mismatches
}

/** Most common count. Ties keep the larger count. */
const modeCount = (counts: readonly number[]): number => {
  const frequency = new Map<number, number>()
  for (const count of counts) frequency.set(count, (frequency.get(count) ?? 0) + 1)
  let expected = counts[0] ?? 0
  let best = -1
  for (const [count, times] of frequency) {
    if (times > best || (times === best && count > expected)) {
      best = times
      expected = count
    }
  }
  return expected
}

/** Adds a reason once and marks the line uncertain. */
const addReason = (line: ResolvedRotationLine, reason: string): void => {
  if (!reason || line.reasons.includes(reason)) return
  line.reasons.push(reason)
  line.reasons.sort()
  line.uncertain = true
}

/** Inclusive day list from start_date through end_date, capped at two weeks. */
const datesOf = (performance: RotationPerformance): string[] => {
  const start = performance.start_date
  if (start === null || !/^\d{4}-\d{2}-\d{2}$/.test(start)) return []
  const end = performance.end_date && /^\d{4}-\d{2}-\d{2}$/.test(performance.end_date) && performance.end_date >= start
    ? performance.end_date
    : start
  const dates: string[] = []
  const cursor = new Date(`${start}T00:00:00Z`)
  const last = new Date(`${end}T00:00:00Z`)
  while (cursor.getTime() <= last.getTime() && dates.length < 14) {
    dates.push(cursor.toISOString().slice(0, 10))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return dates
}
