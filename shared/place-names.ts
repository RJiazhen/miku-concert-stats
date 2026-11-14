import { isChineseLocale, type Locale } from './i18n/index.ts'
import { parseNameMaps, type NameMapInput, type NameMaps } from './name-map.ts'

/** Place as written by VocaDB to its checked Chinese, Traditional Chinese, and English names. */
export type PlaceNameFile = NameMaps

/** The names one place spelling shows per language; null when that language has no row. */
export type PlaceNameNames = {
  zh: string | null
  'zh-Hant': string | null
  en: string | null
}

/** One checked place with the matcher built from its spelling. */
export type PlaceNameEntry = {
  /** Place as written by VocaDB, kept for reporting. */
  key: string
  /** Chinese, Traditional Chinese, and English names; Japanese keys gain an English romanization here. */
  names: PlaceNameNames
  /** Matches the place in a performance name. */
  pattern: RegExp
  /** Matches `in`/`at` before the place, so the English connector goes away with the translation. */
  connectorPattern: RegExp
}

/** Lookups for the hand-checked place list. */
export type PlaceNameIndex = {
  names: Readonly<PlaceNameFile>
  /** Entries longest first, so `東京都` wins over `東京`. */
  entries: readonly PlaceNameEntry[]
}

/** Latin spellings need a word boundary so `Tokyo` does not match inside another word. */
const LATIN = /^[\x20-\x7E]+$/

/**
 * Administrative suffix a Japanese place may carry inside a performance title.
 * `大阪市` is the same city as `大阪`, and leaving the suffix behind gave titles like `Osaka市`.
 */
const ADMIN_SUFFIX = '[市都府県]?'

/** Escapes a literal string for use inside a regular expression. */
const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Builds the matcher for one place spelling; a Japanese spelling also swallows a trailing 市/都/府/県. */
const placePattern = (key: string): RegExp => {
  if (!LATIN.test(key)) return new RegExp(`${escapeRegex(key)}${ADMIN_SUFFIX}`, 'g')
  return new RegExp(`(?<![A-Za-z])${escapeRegex(key)}(?![A-Za-z])`, 'gi')
}

/** Builds the matcher for `in`/`at` plus the place, dropping the connector when translated. */
const connectorPattern = (key: string): RegExp => {
  return new RegExp(`(?<![A-Za-z])(?:in|at)\\s+${escapeRegex(key)}(?![A-Za-z])`, 'gi')
}

/** Empty index so callers can skip localization without branching. */
export const emptyPlaceNameIndex = (): PlaceNameIndex => ({ names: { zh: {}, 'zh-Hant': {}, en: {}, ko: {} }, entries: [] })

/**
 * Validates the place files and builds the matchers.
 * Throws on a blank key or name, and on two spellings that differ only in case.
 */
export const parsePlaceNames = (input: NameMapInput): PlaceNameIndex => {
  const names = parseNameMaps(input, 'Place name')
  const keys = new Set([...Object.keys(names.zh), ...Object.keys(names['zh-Hant']), ...Object.keys(names.en)])
  const entries = [...keys]
    .map((key) => ({
      key,
      names: {
        zh: names.zh[key] ?? null,
        'zh-Hant': names['zh-Hant'][key] ?? null,
        en: names.en[key] ?? null,
      },
      pattern: placePattern(key),
      connectorPattern: connectorPattern(key),
    }))
    .sort((left, right) => right.key.length - left.key.length)
  return { names, entries }
}

/**
 * Replaces checked place names with their name in `locale`.
 * Chinese, including Traditional Chinese, also drops an English `in` / `at` directly in front of
 * the place, so the note reads `10th Anniversary 大阪`; English keeps the connector and only
 * normalizes the spelling (`10th Anniversary in Osaka`), and Japanese keeps the VocaDB text untouched.
 */
export const localizePlaceNames = (text: string, index: PlaceNameIndex, locale: Locale): string => {
  if (locale === 'ja' || locale === 'ko' || text === '') return text
  // Each replacement becomes a token so a shorter spelling cannot match inside a longer
  // translation that already happened (東京都 must stay 東京都, not collapse to 東京).
  const tokens: string[] = []
  /** Replaces every match with a token that points at the translated name. */
  const tokenize = (value: string, pattern: RegExp, name: string): string =>
    value.replace(pattern, () => {
      const token = `\uE000${tokens.length}\uE001`
      tokens.push(name)
      return token
    })
  let localized = text
  for (const entry of index.entries) {
    const name = entry.names[locale]
    if (name === null) continue
    if (isChineseLocale(locale)) localized = tokenize(localized, entry.connectorPattern, name)
    localized = tokenize(localized, entry.pattern, name)
  }
  return localized.replace(/\uE000(\d+)\uE001/g, (_match, index: string) => tokens[Number(index)] ?? '')
}
