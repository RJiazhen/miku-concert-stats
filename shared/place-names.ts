import type { SongLanguage } from './song-titles.ts'

/** Place as written by VocaDB to its Chinese name. */
export type PlaceNameFile = Record<string, string>

/** One checked place with the matcher built from its spelling. */
export type PlaceNameEntry = {
  /** Place as written by VocaDB, kept for reporting. */
  key: string
  /** Chinese name shown when the site language is Chinese. */
  name: string
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

/** Escapes a literal string for use inside a regular expression. */
const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Builds the matcher for one place spelling. */
const placePattern = (key: string): RegExp => {
  if (!LATIN.test(key)) return new RegExp(escapeRegex(key), 'g')
  return new RegExp(`(?<![A-Za-z])${escapeRegex(key)}(?![A-Za-z])`, 'gi')
}

/** Builds the matcher for `in`/`at` plus the place, dropping the connector when translated. */
const connectorPattern = (key: string): RegExp => {
  return new RegExp(`(?<![A-Za-z])(?:in|at)\\s+${escapeRegex(key)}(?![A-Za-z])`, 'gi')
}

/** Empty index so callers can skip localization without branching. */
export const emptyPlaceNameIndex = (): PlaceNameIndex => ({ names: {}, entries: [] })

/**
 * Validates the place list and builds the matchers.
 * Throws on a blank key or name, and on two spellings that differ only in case.
 */
export const parsePlaceNames = (value: unknown): PlaceNameIndex => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Place name file must be an object')
  }
  const names: PlaceNameFile = {}
  const seen = new Set<string>()
  for (const [key, name] of Object.entries(value)) {
    if (key.trim() === '') throw new Error('Place name key is empty')
    if (typeof name !== 'string' || name.trim() === '') throw new Error(`Place ${key} name is empty`)
    const folded = key.toLowerCase()
    if (seen.has(folded)) throw new Error(`Place ${key} is listed twice`)
    seen.add(folded)
    names[key] = name
  }
  const entries = Object.entries(names)
    .map(([key, name]) => ({
      key,
      name,
      pattern: placePattern(key),
      connectorPattern: connectorPattern(key),
    }))
    .sort((left, right) => right.key.length - left.key.length)
  return { names, entries }
}

/**
 * Replaces checked place names with their Chinese name.
 * An English `in` / `at` directly in front of the place is dropped with it, so the note reads `10th Anniversary 大阪`.
 * Non-Chinese languages keep the VocaDB text untouched.
 */
export const localizePlaceNames = (text: string, index: PlaceNameIndex, language: SongLanguage): string => {
  if (language !== 'zh' || text === '') return text
  let localized = text
  for (const entry of index.entries) {
    localized = localized.replace(entry.connectorPattern, entry.name).replace(entry.pattern, entry.name)
  }
  return localized
}
