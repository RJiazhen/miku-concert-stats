/** One checked Chinese title for a VocaDB song. */
export type SongTitleEntry = {
  title: string
  /** Other accepted Chinese titles. Search may match them; the site never displays them. */
  aliases?: string[]
  source: string
  comment?: string
}

/** Song id string to a Chinese title. Missing ids are left untranslated. */
export type SongTitleFile = Record<string, SongTitleEntry>

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

/** Which title script the visitor asked for. */
export type SongLanguage = 'original' | 'zh'

/** Primary title plus the original in parentheses when a Chinese title is showing. */
export type SongTitleView = {
  primary: string
  originalNote: string | null
}

/**
 * Formats a song title for the active language.
 * Chinese mode keeps the original beside the translation unless they are the same string.
 */
export const formatSongTitle = (original: string, translation: string | null, language: SongLanguage): SongTitleView => {
  if (language !== 'zh' || translation === null || translation.trim() === '' || translation === original) {
    return { primary: original, originalNote: null }
  }
  return { primary: translation, originalNote: original }
}
