import { useCatalog } from './useCatalog.ts'
import { fromVocaDB } from '~~/shared/repertoire.ts'
import type { SongRow } from '~~/shared/types.ts'

/** Song lookups backed by the shared catalog state. */
export const useSongLookup = () => {
  const { catalog } = useCatalog()

  /** Song row for an id, or null before the catalog loads. */
  const songById = (songId: number): SongRow | null => {
    return catalog.value?.songs.find((song) => song.id === songId) ?? null
  }

  /** Display name for a song id, preferring the Japanese title. */
  const songName = (songId: number): string => {
    const song = songById(songId)
    return song?.name_ja || song?.name || String(songId)
  }

  /**
   * Where a song id should link: VocaDB for a normal entry, the catalogue page for repertoire
   * VocaDB does not list (its reserved id has no VocaDB page).
   */
  const songHref = (songId: number): string => {
    return fromVocaDB(songById(songId)) ? `https://vocadb.net/S/${songId}` : `/songs/${songId}`
  }

  /** Only a VocaDB entry opens in a new tab. */
  const songHrefTarget = (songId: number): string | undefined => {
    return songHref(songId).startsWith('http') ? '_blank' : undefined
  }

  return { catalog, songById, songName, songHref, songHrefTarget }
}
