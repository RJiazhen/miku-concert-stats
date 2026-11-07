import { useCatalog } from './useCatalog.ts'
import { useSongAliases } from './useSongAliases.ts'
import { fromVocaDB } from '~~/shared/repertoire.ts'
import type { SongRow } from '~~/shared/types.ts'

/** Song lookups backed by the shared catalog state. */
export const useSongLookup = () => {
  const { catalog } = useCatalog()
  const { japaneseTitle } = useSongAliases()

  /** Song row for an id, or null before the catalog loads. */
  const songById = (songId: number): SongRow | null => {
    return catalog.value?.songs.find((song) => song.id === songId) ?? null
  }

  /** Display name for a song id: a registered `ja` alias, else the Japanese title, else the name. */
  const songName = (songId: number): string => {
    const song = songById(songId)
    return song === null ? String(songId) : japaneseTitle(song)
  }

  /** Where a song id links: always the site page, same as the home ranking. */
  const songHref = (songId: number): string => `/songs/${songId}`

  /**
   * VocaDB page of a song, shown next to the title as a separate external link,
   * or null for repertoire VocaDB does not list.
   */
  const vocadbSongUrl = (songId: number): string | null => {
    const song = songById(songId)
    if (song === null || !fromVocaDB(song)) return null
    return song.source_url
  }

  return { catalog, songById, songName, songHref, vocadbSongUrl }
}
