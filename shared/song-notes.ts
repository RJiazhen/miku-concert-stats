/** Song id string to the note shown as an alert on that song's page. */
export type SongNoteFile = Record<string, string>

/**
 * Validates the song note file.
 * Throws when the value is not an object, a key is not a song id, or the text is blank.
 */
export const parseSongNotes = (value: unknown): SongNoteFile => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Song note file must be an object')
  }
  const file: SongNoteFile = {}
  for (const [id, note] of Object.entries(value)) {
    if (!/^\d+$/.test(id)) throw new Error(`Song note key ${id} is not an id`)
    if (typeof note !== 'string' || note.trim() === '') throw new Error(`Song note ${id} text is empty`)
    file[id] = note
  }
  return file
}

/** Returns the note for a song id, or null when the file has no row. */
export const songNoteFor = (file: SongNoteFile, songId: number): string | null => {
  return file[String(songId)] ?? null
}
