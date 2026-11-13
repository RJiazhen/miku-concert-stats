/**
 * Bracket markers VocaDB puts on its stock placeholder song instead of a real title.
 * The marker entries are translations of song 15591 (`???`), which setlists use for
 * non-song segments such as a taiko interlude.
 */
const PLACEHOLDER_SONG_MARKERS = new Set([
  '[placeholder song]',
  '[unknown song]',
  '[unknown]',
  '[temporary song]',
  '[custom song]',
  '[out of scope song]',
])

/** Minimal shape of a VocaDB name translation needed by the placeholder check. */
export type SongNameEntry = {
  value: string
}

/** Minimal shape of a VocaDB song needed by the placeholder check. */
export type PlaceholderCandidate = {
  name: string
  names?: readonly SongNameEntry[]
}

/**
 * Whether a VocaDB song is the shared setlist placeholder rather than a real song.
 * Every known name (the primary name plus its translations) is compared case-insensitively
 * after trimming. A marker entry means the row stands for an unnamed segment and must not
 * be ingested as a song. Names are never rewritten, only skipped.
 */
export const isPlaceholderSong = (song: PlaceholderCandidate): boolean => {
  const values = [song.name, ...(song.names ?? []).map((entry) => entry.value)]
  return values.some((value) => PLACEHOLDER_SONG_MARKERS.has(value.trim().toLowerCase()))
}
