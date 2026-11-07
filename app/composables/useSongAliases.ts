import raw from '~~/data/song-aliases.json'
import {
  japaneseAliasTitle,
  japaneseTitleOf,
  parseSongAliases,
  songAliasTitles,
} from '~~/shared/song-aliases.ts'
import type { SongRow } from '~~/shared/types.ts'

const aliases = parseSongAliases(raw)

/**
 * Reads the registered song titles in `data/song-aliases.json`.
 * The file is static, so every page shares one parsed copy; no catalog load is needed for a
 * registered title to replace the title a setlist row was given.
 */
export const useSongAliases = () => {
  /** Display title for a song id: the registered title, else the caller's fallback. */
  const jaTitle = (songId: number, fallback: string): string => {
    return japaneseAliasTitle(aliases, songId) ?? fallback
  }

  /** Display title of a loaded song row: the registered title, else `name_ja`, else `name`. */
  const japaneseTitle = (song: SongRow): string => {
    return japaneseTitleOf(aliases, song)
  }

  /** Every registered spelling of this song, for search. */
  const aliasTitles = (songId: number): string[] => {
    return songAliasTitles(aliases, songId)
  }

  return { jaTitle, japaneseTitle, aliasTitles }
}
