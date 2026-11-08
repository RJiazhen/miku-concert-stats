import { formatLocalizedName, type NameView, type SongLanguage } from './name-map.ts'

export type { SongLanguage }

/** One checked Chinese title for a VocaDB song. */
export type SongTitleEntry = {
  title: string
  /** Other accepted Chinese titles, shown under the primary title when Chinese is active. */
  aliases?: string[]
  source: string
  comment?: string
}

/** Song id string to a Chinese title. Missing ids are left untranslated. */
export type SongTitleFile = Record<string, SongTitleEntry>

/** Other names a song has in the active language. */
export type SongTitleAliasSources = {
  /** `data/song-titles.zh-CN.json` aliases, shown with the Chinese title. */
  zhAliases?: readonly string[]
  /** `data/song-aliases.json` aliases, shown with the original title. */
  originalAliases?: readonly string[]
  /** `songs.name_en`, shown with the original title. */
  nameEn?: string | null
  /** Chinese title even when the page shows the original, so a Chinese search hit can be explained. */
  zhTitle?: string | null
}

/** Primary title, original note, and the other names of the active language. */
export type SongTitleView = NameView & {
  /** Other names in the active language, deduplicated and different from the primary and original. */
  aliases: string[]
}

/** Which extra name explains a search hit, plus the line a result row prints under the title. */
export type SongTitleHit = SongTitleView & {
  /** The extra name the query matched, or null when it matched the primary or original title. */
  matchedAlias: string | null
  /** Second line of a result row: the matched alias, else the original note. */
  secondary: string | null
}

/**
 * Validates the Chinese title file.
 * Throws when a key is not a song id, a title is blank, or source is missing.
 */
export const parseSongTitles = (value: unknown): SongTitleFile => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Song title file must be an object')
  }
  const file: SongTitleFile = {}
  for (const [id, entry] of Object.entries(value)) {
    if (!/^\d+$/.test(id)) throw new Error(`Song title key ${id} is not an id`)
    file[id] = parseEntry(id, entry)
  }
  return file
}

/** Reads one title entry. */
const parseEntry = (id: string, entry: unknown): SongTitleEntry => {
  if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
    throw new Error(`Song ${id} entry is not an object`)
  }
  const record = entry as Record<string, unknown>
  if (typeof record.title !== 'string' || record.title.trim() === '') {
    throw new Error(`Song ${id} title is empty`)
  }
  if (typeof record.source !== 'string' || record.source.trim() === '') {
    throw new Error(`Song ${id} source is missing`)
  }
  if (record.comment !== undefined && typeof record.comment !== 'string') {
    throw new Error(`Song ${id} comment is not text`)
  }
  const title = record.title.trim()
  const parsed: SongTitleEntry = { title, source: record.source }
  const aliases = parseAliases(id, record.aliases, title)
  if (aliases !== undefined) parsed.aliases = aliases
  if (typeof record.comment === 'string') parsed.comment = record.comment
  return parsed
}

/**
 * Validates the optional alias list: trimmed, non-empty, unique, and different from the title.
 * Returns `undefined` when the entry has no alias list.
 */
const parseAliases = (id: string, value: unknown, title: string): string[] | undefined => {
  if (value === undefined) return undefined
  if (!Array.isArray(value)) throw new Error(`Song ${id} aliases is not a list`)
  const aliases: string[] = []
  for (const alias of value) {
    if (typeof alias !== 'string' || alias.trim() === '') {
      throw new Error(`Song ${id} alias is empty`)
    }
    const trimmed = alias.trim()
    if (trimmed === title) throw new Error(`Song ${id} alias repeats the title`)
    if (aliases.includes(trimmed)) throw new Error(`Song ${id} alias ${trimmed} is duplicated`)
    aliases.push(trimmed)
  }
  return aliases
}

/** Returns the Chinese title for a song id, or null when the file has no row. */
export const songTitleFor = (file: SongTitleFile, songId: number): SongTitleEntry | null => {
  return file[String(songId)] ?? null
}

/**
 * Every Chinese spelling of a song id that search may match: the display title first, then its
 * aliases. Empty when the file has no row, so a song without a Chinese title only matches its
 * catalog names.
 */
export const songTitleSpellings = (file: SongTitleFile, songId: number): string[] => {
  const entry = songTitleFor(file, songId)
  if (entry === null) return []
  return [entry.title, ...(entry.aliases ?? [])]
}

/** Other Chinese spellings of a song id, shown under the primary title; empty when it has none. */
export const songTitleAliases = (file: SongTitleFile, songId: number): string[] => {
  return songTitleFor(file, songId)?.aliases ?? []
}

/**
 * Trims, drops blanks, and removes duplicates: names equal to an excluded spelling or to an
 * earlier entry are skipped. Order is kept.
 */
const uniqueNames = (values: readonly (string | null | undefined)[], excluded: readonly string[]): string[] => {
  const blocked = new Set(excluded.map((value) => value.trim()))
  const names: string[] = []
  for (const value of values) {
    if (typeof value !== 'string') continue
    const name = value.trim()
    if (name === '' || blocked.has(name) || names.includes(name)) continue
    names.push(name)
  }
  return names
}

/** Other names one language shows: Chinese aliases in `zh`, Japanese/English spellings otherwise. */
const otherNames = (language: SongLanguage, sources: SongTitleAliasSources): string[] => {
  if (language === 'zh') return [...(sources.zhAliases ?? [])]
  return [...(sources.originalAliases ?? []), ...(sources.nameEn === null || sources.nameEn === undefined ? [] : [sources.nameEn])]
}

/**
 * Formats a song title for the active language and collects the other names of that language.
 * Chinese mode keeps the original beside the translation unless they are the same string; the
 * original mode lists the registered Japanese aliases and `songs.name_en` under the title.
 */
export const formatSongTitle = (
  original: string,
  translation: string | null,
  language: SongLanguage,
  sources: SongTitleAliasSources = {},
): SongTitleView => {
  const view = formatLocalizedName(original, translation, language)
  const excluded = view.originalNote === null ? [view.primary] : [view.primary, view.originalNote]
  return { ...view, aliases: uniqueNames(otherNames(language, sources), excluded) }
}

/** Folds one query or name for case-insensitive Latin matching; Japanese and Chinese are unaffected. */
const fold = (value: string): string => value.trim().toLocaleLowerCase()

/** Relevance of one name against a folded query: 0 exact, 1 prefix, 2 substring, null no match. */
const aliasRank = (value: string, needle: string): number | null => {
  const folded = fold(value)
  if (folded === needle) return 0
  if (folded.startsWith(needle)) return 1
  return folded.includes(needle) ? 2 : null
}

/** Picks the best matching alias: exact before prefix, prefix before substring, first wins ties. */
const matchedName = (query: string, names: readonly string[]): string | null => {
  const needle = fold(query)
  if (needle === '') return null
  let best: { name: string; rank: number } | null = null
  for (const name of names) {
    const rank = aliasRank(name, needle)
    if (rank === null) continue
    if (best === null || rank < best.rank) best = { name, rank }
  }
  return best?.name ?? null
}

/**
 * Matches one search query against a song title and its other names.
 * The second line of a result row shows the alias the query hit, so the reader can see why the
 * song matched; when no alias hit, it keeps the original note. The primary title still wins,
 * matching the search score where a primary hit ranks before an alias hit.
 */
export const matchSongTitle = (
  query: string,
  original: string,
  translation: string | null,
  language: SongLanguage,
  sources: SongTitleAliasSources = {},
): SongTitleHit => {
  const view = formatSongTitle(original, translation, language, sources)
  const needle = fold(query)
  const primaryHit = needle !== '' && fold(view.primary).includes(needle)
  const noteHit = needle !== '' && view.originalNote !== null && fold(view.originalNote).includes(needle)
  if (needle === '' || primaryHit || noteHit) {
    return { ...view, matchedAlias: null, secondary: view.originalNote }
  }
  const excluded = view.originalNote === null ? [view.primary] : [view.primary, view.originalNote]
  const candidates = uniqueNames(
    [sources.zhTitle, ...(sources.zhAliases ?? []), ...(sources.originalAliases ?? []), sources.nameEn],
    excluded,
  )
  const matched = matchedName(query, candidates)
  return { ...view, matchedAlias: matched, secondary: matched ?? view.originalNote }
}
