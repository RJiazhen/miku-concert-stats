import type { SongRow } from './types.ts'

/**
 * One checked display title for a song whose upstream `songs.name` is unusable, plus other
 * spellings that should still be searchable.
 *
 * A song has exactly one title on the site, so the file holds one `title`; every other Japanese or
 * English spelling of the same song goes in `aliases` and only feeds search. Chinese titles live in
 * `data/song-titles.zh-CN.json`, and the canonical English name stays in `songs.name_en`
 * (`data/increments/0012-song-english-names.sql`).
 */
export type SongAliasEntry = {
  /** Japanese title the site shows in place of `songs.name_ja` / `songs.name`. */
  title: string
  /** Other accepted spellings. Search may match them; the site never displays them. */
  aliases?: string[]
  source: string
  comment?: string
}

/** Song id string to its checked alternate titles. */
export type SongAliasFile = Record<string, SongAliasEntry>

/** Reads a decimal song id from an object key. */
const readSongId = (key: string): string => {
  if (!/^[1-9]\d*$/.test(key)) throw new Error(`Song alias key ${key} is not an id`)
  return key
}

/**
 * Validates the optional alias list: trimmed, non-empty, unique, and different from the title.
 * Returns `undefined` when the entry has no alias list.
 */
const parseAliases = (songId: string, value: unknown, title: string): string[] | undefined => {
  if (value === undefined) return undefined
  if (!Array.isArray(value)) throw new Error(`Song ${songId} aliases is not a list`)
  const aliases: string[] = []
  for (const alias of value) {
    if (typeof alias !== 'string' || alias.trim() === '') {
      throw new Error(`Song ${songId} alias is empty`)
    }
    const trimmed = alias.trim()
    if (trimmed === title) throw new Error(`Song ${songId} alias repeats the title`)
    if (aliases.includes(trimmed)) throw new Error(`Song ${songId} alias ${trimmed} is duplicated`)
    aliases.push(trimmed)
  }
  return aliases
}

/** Reads one entry; throws when the title or source is blank or the alias list is malformed. */
const parseEntry = (songId: string, entry: unknown): SongAliasEntry => {
  if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
    throw new Error(`Song ${songId} alias entry is not an object`)
  }
  const record = entry as Record<string, unknown>
  if (typeof record.title !== 'string' || record.title.trim() === '') {
    throw new Error(`Song ${songId} alias title is empty`)
  }
  if (typeof record.source !== 'string' || record.source.trim() === '') {
    throw new Error(`Song ${songId} alias source is missing`)
  }
  if (record.comment !== undefined && typeof record.comment !== 'string') {
    throw new Error(`Song ${songId} alias comment is not text`)
  }
  const title = record.title.trim()
  const parsed: SongAliasEntry = { title, source: record.source }
  const aliases = parseAliases(songId, record.aliases, title)
  if (aliases !== undefined) parsed.aliases = aliases
  if (typeof record.comment === 'string') parsed.comment = record.comment
  return parsed
}

/**
 * Validates the alias file.
 * Throws when the value is not an object, a key is not a song id, or an entry is malformed.
 */
export const parseSongAliases = (value: unknown): SongAliasFile => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Song alias file must be an object')
  }
  const file: SongAliasFile = {}
  for (const [key, entry] of Object.entries(value)) {
    const songId = readSongId(key)
    file[songId] = parseEntry(songId, entry)
  }
  return file
}

/** Registration for one song, or null when the file has no row. */
export const songAliasFor = (file: SongAliasFile, songId: number): SongAliasEntry | null => {
  return file[String(songId)] ?? null
}

/** Every registered spelling of one song, title first, for search. */
export const songAliasTitles = (file: SongAliasFile, songId: number): string[] => {
  const entry = songAliasFor(file, songId)
  if (entry === null) return []
  return [entry.title, ...(entry.aliases ?? [])]
}

/** Display title the file declares for a song, or null when the song has no entry. */
export const japaneseAliasTitle = (file: SongAliasFile, songId: number): string | null => {
  return songAliasFor(file, songId)?.title ?? null
}

/** Japanese title to show for a song row: its registered title, else `name_ja`, else `name`. */
export const japaneseTitleOf = (
  file: SongAliasFile,
  song: Pick<SongRow, 'id' | 'name' | 'name_ja'>,
): string => {
  const alias = japaneseAliasTitle(file, song.id)
  if (alias !== null) return alias
  return song.name_ja ?? song.name
}
