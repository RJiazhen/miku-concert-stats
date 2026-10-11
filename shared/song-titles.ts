/** One checked Chinese title for a VocaDB song. */
export type SongTitleEntry = {
  title: string
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
  const parsed: SongTitleEntry = { title: record.title, source: record.source }
  if (typeof record.comment === 'string') parsed.comment = record.comment
  return parsed
}

/** Returns the Chinese title for a song id, or null when the file has no row. */
export const songTitleFor = (file: SongTitleFile, songId: number): SongTitleEntry | null => {
  return file[String(songId)] ?? null
}
