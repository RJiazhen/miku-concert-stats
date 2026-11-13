import { CITY_ALIASES, splitNote } from './rotation.ts'

/** One dimension set read from a setlist note fragment. */
export type NoteSelector = {
  city: string | null
  day: number | null
  show: number | null
  half: 'day' | 'night' | null
}

/** Chinese labels for the city keys in `CITY_ALIASES`. */
const CITY_LABELS: Record<string, string> = {
  tokyo: '东京',
  osaka: '大阪',
  fukuoka: '福冈',
  sapporo: '札幌',
  nagoya: '名古屋',
  yokohama: '横滨',
  sendai: '仙台',
  kobe: '神户',
  kyoto: '京都',
  hiroshima: '广岛',
  'new york': '纽约',
  'los angeles': '洛杉矶',
  'san jose': '圣何塞',
  'san francisco': '旧金山',
  'cedar park': '锡达帕克',
  'chicago': '芝加哥',
  'boston': '波士顿',
  'dallas': '达拉斯',
  'houston': '休斯敦',
  'portland': '波特兰',
  'seattle': '西雅图',
  'toronto': '多伦多',
  'vancouver': '温哥华',
  'atlanta': '亚特兰大',
  'orlando': '奥兰多',
  'glendale': '格伦代尔',
  'grand prairie': '大草原城',
  'duluth': '杜鲁斯',
  'monterrey': '蒙特雷',
  'montreal': '蒙特利尔',
  'hong kong': '香港',
  'kuala lumpur': '吉隆坡',
  'mexico city': '墨西哥城',
  denver: '丹佛',
  phoenix: '凤凰城',
  austin: '奥斯汀',
  washington: '华盛顿',
  detroit: '底特律',
  newark: '纽瓦克',
  hamilton: '汉密尔顿',
  brisbane: '布里斯班',
  sydney: '悉尼',
  perth: '珀斯',
  melbourne: '墨尔本',
  auckland: '奥克兰',
  paris: '巴黎',
  berlin: '柏林',
  london: '伦敦',
  beijing: '北京',
  shanghai: '上海',
  chengdu: '成都',
  guangzhou: '广州',
  seoul: '首尔',
  taipei: '台北',
  manila: '马尼拉',
  singapore: '新加坡',
  jakarta: '雅加达',
  bangkok: '曼谷',
  taichung: '台中',
}

/** Chinese label for a city key, or the key itself when unknown. */
export const cityLabel = (key: string): string => CITY_LABELS[key] ?? key

/** Show ordinal numbers mentioned by one note fragment, e.g. `1st and 2nd Show`. */
const showNumbers = (text: string): number[] => {
  const found: number[] = []
  for (const match of text.matchAll(/(\d)(?:st|nd|rd|th)?\s*(?:and\s*(\d)(?:st|nd|rd|th)?\s*)?shows?/gi)) {
    for (const value of [match[1], match[2]]) {
      if (value && !found.includes(Number(value))) found.push(Number(value))
    }
  }
  return found
}

/** City key named by one note fragment. Longer aliases win. */
const cityOf = (text: string): string | null => {
  const haystack = text.toLowerCase()
  let best: { key: string; length: number } | null = null
  for (const [key, aliases] of CITY_ALIASES) {
    for (const alias of aliases) {
      if (!haystack.includes(alias)) continue
      if (!best || alias.length > best.length) best = { key, length: alias.length }
    }
  }
  return best?.key ?? null
}

/**
 * Reads the show selection a setlist note describes.
 * Fragments without a city, day, show number, or day/night marker (for example `Encore`) contribute nothing,
 * so an empty result means the note gives no usable selection.
 */
export const parseNoteSelectors = (notes: string | null): NoteSelector[] => {
  if (notes === null || notes.trim() === '') return []
  const selectors: NoteSelector[] = []
  for (const segment of splitNote(notes)) {
    const lower = segment.toLowerCase()
    const day = lower.match(/day\s*(\d+)/)?.[1]
    const city = cityOf(lower)
    const half = /nighttime|evening|夜/.test(lower) ? 'night' : /daytime|afternoon|昼|日场/.test(lower) ? 'day' : null
    const shows = showNumbers(lower)
    if (shows.length === 0) {
      if (day === undefined && city === null && half === null) continue
      selectors.push({ city, day: day === undefined ? null : Number(day), show: null, half })
      continue
    }
    for (const show of shows) {
      selectors.push({ city, day: day === undefined ? null : Number(day), show, half })
    }
  }
  return selectors
}

/** One setlist line reduced to what slot grouping needs. */
export type SlotItem = {
  songListId: number
  position: number
  /** VocaDB song ids this line counts, in printed order. */
  songIds: number[]
  notes: string | null
  /** Performances the rotation parser assigns to this line. */
  performanceIds: number[]
  selectors: NoteSelector[]
}

/** Formats a selector list as a short human label, e.g. `大阪 第 2 天`. */
export const selectorLabel = (selectors: readonly NoteSelector[]): string | null => {
  if (selectors.length === 0) return null
  const parts = selectors.map((selector) => {
    const pieces: string[] = []
    if (selector.city) pieces.push(cityLabel(selector.city))
    if (selector.day !== null) pieces.push(`第 ${selector.day} 天`)
    if (selector.show !== null) {
      pieces.push(selector.show === 1 ? '日场' : selector.show === 2 ? '夜场' : `第 ${selector.show} 场`)
    }
    if (selector.half) pieces.push(selector.half === 'night' ? '夜场' : '日场')
    return pieces.join(' ')
  })
  const unique = [...new Set(parts.filter((part) => part !== ''))]
  return unique.length === 0 ? null : unique.join('、')
}

/** Cities named by a selector list. */
const citiesOf = (selectors: readonly NoteSelector[]): Set<string> => {
  const cities = new Set<string>()
  for (const selector of selectors) if (selector.city) cities.add(selector.city)
  return cities
}

/** Whether two performance id lists share at least one show. */
const showsOverlap = (left: readonly number[], right: readonly number[]): boolean => {
  if (left.length === 0 || right.length === 0) return true
  const rightSet = new Set(right)
  return left.some((id) => rightSet.has(id))
}

/** Whether two selector fragments can describe the same day and show. */
const timeOverlaps = (left: NoteSelector, right: NoteSelector): boolean => {
  if (left.day !== null && right.day !== null && left.day !== right.day) return false
  if (left.show !== null && right.show !== null && left.show !== right.show) return false
  return true
}

/** Whether any selector pair from two items can describe the same day and show. */
const anyTimeOverlap = (left: readonly NoteSelector[], right: readonly NoteSelector[]): boolean => {
  return left.some((a) => right.some((b) => timeOverlaps(a, b)))
}

/** Day and show values are only parallel when both sides name a common day and show number. */
const timesAligned = (left: readonly NoteSelector[], right: readonly NoteSelector[]): boolean => {
  const leftDays = new Set(left.map((selector) => selector.day).filter((day): day is number => day !== null))
  const rightDays = new Set(right.map((selector) => selector.day).filter((day): day is number => day !== null))
  if (leftDays.size > 0 && rightDays.size > 0) {
    let shared = false
    for (const day of leftDays) if (rightDays.has(day)) shared = true
    if (!shared) return false
  }
  const leftShows = new Set(left.map((selector) => selector.show).filter((show): show is number => show !== null))
  const rightShows = new Set(right.map((selector) => selector.show).filter((show): show is number => show !== null))
  if (leftShows.size > 0 && rightShows.size > 0) {
    let shared = false
    for (const show of leftShows) if (rightShows.has(show)) shared = true
    if (!shared) return false
  }
  return true
}

/** Whether both sides name a day/night half and disagree. */
const halvesConflict = (left: readonly NoteSelector[], right: readonly NoteSelector[]): boolean => {
  const leftHalves = new Set(left.map((selector) => selector.half).filter((half): half is 'day' | 'night' => half !== null))
  const rightHalves = new Set(right.map((selector) => selector.half).filter((half): half is 'day' | 'night' => half !== null))
  if (leftHalves.size === 0 || rightHalves.size === 0) return false
  for (const half of leftHalves) if (rightHalves.has(half)) return false
  return true
}

/** Whether two lines are alternatives for the same setlist slot. */
export const itemsMergeable = (left: SlotItem, right: SlotItem): boolean => {
  if (left.selectors.length === 0 || right.selectors.length === 0) return false
  const sharedCities = [...citiesOf(left.selectors)].filter((city) => citiesOf(right.selectors).has(city))
  const overlap = showsOverlap(left.performanceIds, right.performanceIds)
  if (overlap) {
    // Same performance record: only the notes can prove that both songs never share a show.
    if (sharedCities.length > 0) {
      return sharedCities.every((city) => {
        const leftCity = left.selectors.filter((selector) => selector.city === city)
        const rightCity = right.selectors.filter((selector) => selector.city === city)
        return !anyTimeOverlap(leftCity, rightCity)
      })
    }
    return !anyTimeOverlap(left.selectors, right.selectors) || halvesConflict(left.selectors, right.selectors)
  }
  // Different shows: parallel only when they describe the same day, show number, and half.
  if (sharedCities.length > 0) return false
  if (!timesAligned(left.selectors, right.selectors)) return false
  if (halvesConflict(left.selectors, right.selectors)) return false
  return true
}

/** One displayed setlist row: alternatives from several song lists folded together. */
export type SlotRow = {
  items: SlotItem[]
}

/** Rows that share one printed slot number. */
export type SlotGroup = {
  rows: SlotRow[]
}

/** Whether every item of two rows is an alternative of every item on the other row. */
const rowsMergeable = (left: SlotRow, right: SlotRow): boolean => {
  return left.items.every((a) => right.items.every((b) => itemsMergeable(a, b)))
}

/**
 * Groups consecutive rows that describe the same slot.
 * A row only joins the open slot when it is an alternative of every row already in it.
 */
export const groupRowsIntoSlots = (rows: readonly SlotRow[]): SlotGroup[] => {
  const groups: SlotGroup[] = []
  let open: SlotRow[] | null = null
  for (const row of rows) {
    if (open && open.every((existing) => rowsMergeable(existing, row))) {
      open.push(row)
      continue
    }
    if (open) groups.push({ rows: open })
    open = [row]
  }
  if (open) groups.push({ rows: open })
  return groups
}
