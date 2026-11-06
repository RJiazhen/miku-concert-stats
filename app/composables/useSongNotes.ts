import raw from '~~/data/song-notes.json'
import { parseSongNotes, songNoteFor, type SongNoteFile } from '~~/shared/song-notes.ts'

/** Parsed once: the note list is static build-time data. */
export const songNotes: SongNoteFile = parseSongNotes(raw)

/**
 * Reads the checked notes shown on song pages.
 * Only the canonical id is looked up, so a merged variant shows its group's note.
 */
export const useSongNotes = () => {
  /** Note for one song id, or null when nothing is checked for it. */
  const noteFor = (songId: number) => songNoteFor(songNotes, songId)

  return { noteFor }
}
