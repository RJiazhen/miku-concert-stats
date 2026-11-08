import { translate, type Locale } from './i18n/index.ts'
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
  /**
   * Original fragments that describe the line itself rather than selecting a show,
   * such as `Encore`, an event name, a URL, or a start time. Pages render these as
   * muted context instead of a parser warning.
   */
  info: string[]
}

/** One segment of a VocaDB setlist note after splitting on slashes, commas, and semicolons. */
type SegmentParse = {
  parsed: boolean
  performanceIds: number[]
  reasons: string[]
  /** Original segment when it carries context instead of selecting a show. */
  info: string | null
}

/** Canonical city key and the spellings that appear in notes or event names. */
export const CITY_ALIASES: readonly (readonly [string, readonly string[]])[] = [
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
  ['san francisco', ['san francisco']],
  ['cedar park', ['cedar park']],
  ['chicago', ['chicago']],
  ['boston', ['boston']],
  ['dallas', ['dallas']],
  ['houston', ['houston']],
  ['portland', ['portland']],
  ['seattle', ['seattle']],
  ['toronto', ['toronto']],
  ['vancouver', ['vancouver']],
  ['atlanta', ['atlanta']],
  ['orlando', ['orlando']],
  ['glendale', ['glendale']],
  ['grand prairie', ['grand prairie']],
  ['duluth', ['duluth']],
  ['monterrey', ['monterrey']],
  ['montreal', ['montreal']],
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

/** Day, night, and show-number wording that names one half of a day. */
const HALF_SHOW = /daytime|nighttime|afternoon|evening|1st(?:\s+and\s+2nd)?\s+show|2nd\s+show|昼夜|昼公演|夜公演|昼|夜/i

/** Wording that asks the parser to pick a day, so an unresolved fragment is a warning rather than prose. */
const ROTATION_SIGNAL = /\bday\b|\d+\s*日目|初日|千秋楽|最終日|両日|全日|全公演|昼夜|昼公演|夜公演|daytime|nighttime|afternoon|evening|1st\s+show|2nd\s+show/i

/** Whole fragments that are only a US state or district code split off a `City, ST` location. */
const REGION_NOISE = new Set([
  'ak', 'al', 'ar', 'az', 'ca', 'co', 'ct', 'dc', 'd.c', 'd.c.', 'de', 'fl', 'ga', 'hi', 'ia', 'id', 'il', 'in',
  'ks', 'ky', 'la', 'ma', 'md', 'me', 'mi', 'mn', 'mo', 'ms', 'mt', 'nc', 'nd', 'ne', 'nh', 'nj', 'nm', 'nv',
  'ny', 'oh', 'ok', 'or', 'pa', 'ri', 'sc', 'sd', 'tn', 'tx', 'ut', 'va', 'vt', 'wa', 'wi', 'wv', 'wy',
])

/** Words that follow a year in a performance title without naming a city. */
const CITY_STOPWORDS = new Set([
  'tour', 'online', 'rewind', 'live', 'concert', 'world tour', 'japan tour', 'north america', 'europe', 'asia', 'america',
])

/**
 * Parses a free-text setlist note into performance ids.
 * Blank notes mean every performance of the list. Prose that never selects a show is returned in `info`
 * instead of a warning; only a fragment that looks like a day marker but cannot be resolved stays uncertain.
 */
export const parseRotationNotes = (
  notes: string | null,
  performances: readonly RotationPerformance[],
): RotationParse => {
  const everyId = performances.map((row) => row.id).sort((left, right) => left - right)
  if (notes === null || notes.trim() === '') {
    return { performanceIds: everyId, uncertain: false, reasons: [], info: [] }
  }
  const reasons = new Set<string>()
  const info: string[] = []
  const matched = new Set<number>()
  let parsedAny = false
  for (const segment of splitNote(notes)) {
    const piece = parseSegment(segment, performances)
    if (piece.parsed) {
      parsedAny = true
      for (const id of piece.performanceIds) matched.add(id)
    }
    for (const reason of piece.reasons) reasons.add(reason)
    if (piece.info !== null && !info.includes(piece.info)) info.push(piece.info)
  }
  const performanceIds = parsedAny ? [...matched].sort((left, right) => left - right) : everyId
  return {
    performanceIds,
    uncertain: reasons.size > 0,
    reasons: [...reasons].sort(),
    info,
  }
}

/** Splits a note on slashes, commas, semicolons, and newlines, keeping date slashes such as `8/31` intact. */
export const splitNote = (notes: string): string[] => {
  return notes
    .split(/\s*[／;；,、]\s*|\n+|\s*\/\s*(?=[^\d\s])|(?<=[^\d\s])\s*\/\s*/u)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)
}

/** Result for a fragment that selects no show: prose becomes muted info, ambiguous rotation wording stays a warning. */
const informational = (segment: string, warn: boolean): SegmentParse => {
  if (warn) return { parsed: false, performanceIds: [], reasons: ['unknown format'], info: null }
  return { parsed: false, performanceIds: [], reasons: [], info: segment }
}

/** Whether a fragment looks like it wants to select a day, so failing to resolve it deserves a warning. */
const looksLikeRotation = (segment: string): boolean => ROTATION_SIGNAL.test(segment)

/** A city naming no performance is context on a single-show list; on a rotating list it is a warning. */
const unmatchedCity = (segment: string, performances: readonly RotationPerformance[]): SegmentParse => {
  return performances.length <= 1
    ? { parsed: false, performanceIds: [], reasons: [], info: segment }
    : { parsed: false, performanceIds: [], reasons: ['unmatched city'], info: null }
}

/** Assigns a city-only fragment and carries how many shows that city covers. */
const cityOnly = (matches: readonly RotationPerformance[]): SegmentParse => {
  const count = Math.max(distinctDates(matches).length, matches.length)
  return {
    parsed: true,
    performanceIds: matches.map((row) => row.id).sort((left, right) => left - right),
    reasons: count > 1 ? [`city-only when city has several shows: ${count}`] : [],
    info: null,
  }
}

/** One day selector after matching a supported note syntax. */
type DayFragment = {
  /** `all` covers every date of the pool, `first` / `last` its edge days. */
  selector: number | 'first' | 'last' | 'all'
  /** Text before the day marker, which may name a city. */
  cityText: string
  /** Text after the day marker, which may name a day/night half. */
  extra: string
}

/** Matches English, Japanese, and Chinese day wording, returning null for anything else. */
const dayFragment = (segment: string): DayFragment | null => {
  const paren = segment.match(/^(.+?)\s*\(\s*day\s*(\d+)\s*\)(.*)$/i)
  if (paren) return { selector: Number(paren[2]), cityText: paren[1] ?? '', extra: paren[3] ?? '' }
  const cityThenDay = segment.match(/^(.+?)\s+day\s*(\d+)\b(.*)$/i)
  if (cityThenDay && !/^day$/i.test((cityThenDay[1] ?? '').trim())) {
    return { selector: Number(cityThenDay[2]), cityText: cityThenDay[1] ?? '', extra: cityThenDay[3] ?? '' }
  }
  const dayFirst = segment.match(/^day\s*(\d+)\b(.*)$/i)
  if (dayFirst) return { selector: Number(dayFirst[1]), cityText: '', extra: dayFirst[2] ?? '' }
  const japaneseAfterCity = segment.match(/^(.+?)\s*(\d+)\s*日目(.*)$/u)
  if (japaneseAfterCity) {
    return { selector: Number(japaneseAfterCity[2]), cityText: japaneseAfterCity[1] ?? '', extra: japaneseAfterCity[3] ?? '' }
  }
  const japaneseDay = segment.match(/^(\d+)\s*日目(.*)$/u)
  if (japaneseDay) return { selector: Number(japaneseDay[1]), cityText: '', extra: japaneseDay[2] ?? '' }
  const chineseAfterCity = segment.match(/^(.+?)\s*第\s*(\d+)\s*[天日](.*)$/u)
  if (chineseAfterCity) {
    return { selector: Number(chineseAfterCity[2]), cityText: chineseAfterCity[1] ?? '', extra: chineseAfterCity[3] ?? '' }
  }
  const chineseDay = segment.match(/^第?\s*(\d+)\s*[天日](.*)$/u)
  if (chineseDay) return { selector: Number(chineseDay[1]), cityText: '', extra: chineseDay[2] ?? '' }
  const worded = segment.match(/^(.*?)\s*(両日|初日|千秋楽|最終日|全日|全公演)\s*$/u)
  if (worded) {
    const word = worded[2] ?? ''
    const selector = word === '初日' ? 'first' : word === '千秋楽' || word === '最終日' ? 'last' : 'all'
    return { selector, cityText: worded[1] ?? '', extra: '' }
  }
  return null
}

/** One calendar day named by a standalone date fragment. */
type DateFragment = { year: number | null; month: number; day: number }

/** Reads a bare date such as `2024-08-31`, `8/31`, or `8月31日`. */
const dateFragment = (segment: string): DateFragment | null => {
  const iso = segment.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/)
  if (iso) return { year: Number(iso[1]), month: Number(iso[2]), day: Number(iso[3]) }
  const japanese = segment.match(/^(\d{1,2})月(\d{1,2})日?$/)
  if (japanese) return { year: null, month: Number(japanese[1]), day: Number(japanese[2]) }
  const slash = segment.match(/^(\d{1,2})\/(\d{1,2})$/)
  if (slash) return { year: null, month: Number(slash[1]), day: Number(slash[2]) }
  return null
}

/** Assigns a bare date to every performance whose dates include that calendar day. */
const dateSegment = (
  date: DateFragment,
  segment: string,
  performances: readonly RotationPerformance[],
): SegmentParse => {
  const wanted = `${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`
  const matches = performances.filter((row) =>
    datesOf(row).some((value) => value.slice(5) === wanted && (date.year === null || value.slice(0, 4) === String(date.year))),
  )
  if (matches.length === 0) return informational(segment, false)
  return {
    parsed: true,
    performanceIds: matches.map((row) => row.id).sort((left, right) => left - right),
    reasons: [],
    info: null,
  }
}

/**
 * Matches a fragment that names only a day/night half, e.g. `Nighttime Shows`, `Evening Concert`,
 * or `东京 夜公演`. The half cannot pick a row inside a multi-day run, so it stays a warning.
 */
const halfFragment = (segment: string): { cityText: string; word: string } | null => {
  const english = segment.match(/^(?:(.+?)\s+)?(daytime|nighttime|afternoon|evening)(?:\s+(?:shows?|concerts?))?$/i)
  if (english) return { cityText: english[1] ?? '', word: english[2] ?? '' }
  const japanese = segment.match(/^(?:(.+?)\s*)?(昼夜|昼公演|夜公演)$/u)
  if (japanese) return { cityText: japanese[1] ?? '', word: japanese[2] ?? '' }
  return null
}

/** Parses one city or day segment against the performances that share the song list. */
const parseSegment = (segment: string, performances: readonly RotationPerformance[]): SegmentParse => {
  if (REGION_NOISE.has(segment.toLowerCase().replace(/\s+/g, ''))) {
    return { parsed: false, performanceIds: [], reasons: [], info: null }
  }
  const day = dayFragment(segment)
  if (day) return daySegment(day.selector, day.cityText, day.extra, performances)
  const half = halfFragment(segment)
  if (half) return daySegment('all', half.cityText, half.word, performances)
  const date = dateFragment(segment)
  if (date) return dateSegment(date, segment, performances)
  const city = resolveCity(segment, performances)
  if (city) {
    const matches = performances.filter((row) => performanceMatchesCity(row, city))
    if (matches.length === 0) return unmatchedCity(segment, performances)
    return cityOnly(matches)
  }
  return informational(segment, looksLikeRotation(segment))
}

/**
 * Resolves one day selector: a numbered day, first/last day, or every day.
 * A numbered day with no city applies to each city's own run, so `Day 2` on a shared
 * list means both cities' second show rather than guessing one of them.
 * Fragments that cannot map to a date stay warnings when they look like day markers.
 */
const daySegment = (
  selector: number | 'first' | 'last' | 'all',
  cityText: string,
  extra: string,
  performances: readonly RotationPerformance[],
): SegmentParse => {
  if (typeof selector === 'number' && (!Number.isInteger(selector) || selector < 1)) {
    return informational(`${cityText} ${extra}`.trim(), true)
  }
  const citySource = `${cityText} ${extra}`.trim()
  const city = resolveCity(citySource, performances)
  const half = HALF_SHOW.test(citySource)
  if (!city && cityText.trim() !== '') return unmatchedCity(citySource, performances)
  const pools: RotationPerformance[][] = []
  if (city) {
    const rows = performances.filter((row) => performanceMatchesCity(row, city))
    if (rows.length === 0) return unmatchedCity(citySource, performances)
    pools.push(rows)
  } else {
    const keys = [...new Set(performances.map(performanceCityKey).filter((key): key is string => key !== null))]
    if (keys.length <= 1) pools.push([...performances])
    else for (const key of keys) pools.push(performances.filter((row) => performanceCityKey(row) === key))
  }
  const ids = new Set<number>()
  let ambiguous = half
  for (const pool of pools) {
    if (selector === 'all') {
      for (const row of pool) ids.add(row.id)
      continue
    }
    const dates = distinctDates(pool)
    const date = selector === 'first' ? dates[0] : selector === 'last' ? dates[dates.length - 1] : dates[selector - 1]
    if (!date) continue
    const covering = pool.filter((row) => datesOf(row).includes(date))
    if (covering.length > 1) ambiguous = true
    for (const row of covering) ids.add(row.id)
  }
  if (ids.size === 0) return informational(citySource, true)
  return {
    parsed: true,
    performanceIds: [...ids].sort((left, right) => left - right),
    reasons: ambiguous ? ['day with day/night shows'] : [],
    info: null,
  }
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

/** Adds a normalized title token unless it is punctuation, numeric, or a generic tour word. */
const addCityToken = (tokens: Set<string>, raw: string): void => {
  const head = raw.split(',')[0]
  if (!head) return
  const token = head
    .replace(/[.。;:!?！？、」』"'（）()[\]]+$/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
  if (token.length < 2 || /\d/.test(token) || CITY_STOPWORDS.has(token)) return
  tokens.add(token)
}

/** City-like tokens in a performance title: the part after `in` / `at` or after the series year. */
const derivedCityTokens = (performance: RotationPerformance): string[] => {
  const tokens = new Set<string>()
  for (const source of [performance.name, performance.name_ja ?? '']) {
    const afterIn = source.match(/(?:^|[\s」』)\]）])(?:in|at)\s+([^()（）[\]]+)\s*$/i)
    if (afterIn?.[1]) addCityToken(tokens, afterIn[1])
    const afterYear = source.match(/\b(?:19|20)\d{2}\s+([^()（）[\]]+)\s*$/)
    if (afterYear?.[1]) addCityToken(tokens, afterYear[1])
  }
  return [...tokens]
}

/** City key of a performance: the static alias, or a city token read from its title. */
export const performanceCityKey = (performance: RotationPerformance): string | null => {
  return performanceCity(performance) ?? derivedCityTokens(performance)[0] ?? null
}

/** Whether a performance belongs to the city key named by a note. */
const performanceMatchesCity = (performance: RotationPerformance, city: string): boolean => {
  if (performanceCity(performance) === city) return true
  return derivedCityTokens(performance).includes(city)
}

/** City key named by a note fragment, preferring static aliases and then the longest derived token. */
const resolveCity = (text: string, performances: readonly RotationPerformance[]): string | null => {
  const staticKey = cityKey(text)
  if (staticKey) return staticKey
  const haystack = text.toLowerCase()
  let best: { key: string; length: number } | null = null
  for (const performance of performances) {
    for (const token of derivedCityTokens(performance)) {
      if (!aliasIn(haystack, token)) continue
      if (!best || token.length > best.length) best = { key: token, length: token.length }
    }
  }
  return best?.key ?? null
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
  /** Original note fragments that carry context instead of a show selection, for muted display. */
  info: string[]
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
        info: [...rotation.info],
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

/** Human-readable text for one parser reason in the active language. */
export const formatRotationReason = (reason: string, locale: Locale = 'zh'): string => {
  const mismatch = reason.match(/^setlist length mismatch: (\d+) vs expected (\d+)$/)
  if (mismatch) {
    return translate(locale, 'rotation.lengthMismatch', { count: mismatch[1] ?? '', expected: mismatch[2] ?? '' })
  }
  if (reason === 'unknown format') return translate(locale, 'rotation.unknownFormat')
  if (reason === 'unmatched city') return translate(locale, 'rotation.unmatchedCity')
  const cityOnly = reason.match(/^city-only when city has several shows(?:: (\d+))?$/)
  if (cityOnly) return cityOnly[1] ? translate(locale, 'rotation.cityOnlyCount', { n: cityOnly[1] }) : translate(locale, 'rotation.cityOnly')
  if (reason === 'day with day/night shows') return translate(locale, 'rotation.dayNight')
  return reason
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
