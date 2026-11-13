import { useCatalog } from './useCatalog.ts'
import { useSongAliases } from './useSongAliases.ts'
import { fromVocaDB } from '~~/shared/repertoire.ts'
import type { Catalog, SongRow } from '~~/shared/types.ts'

/**
 * Song id index per catalog object, so a title lookup is O(1) instead of a scan over every song.
 * Keyed by the catalog object: a rebuilt catalog gets its own index and can never return old rows.
 */
const songIndexes = new WeakMap<Catalog, Map<number, SongRow>>()

/** Returns the id index of `catalog`, building it on first use. */
const songIndex = (catalog: Catalog): Map<number, SongRow> => {
  const cached = songIndexes.get(catalog)
  if (cached !== undefined) return cached
  const index = new Map(catalog.songs.map((song) => [song.id, song]))
  songIndexes.set(catalog, index)
  return index
}

/** Song lookups backed by the shared catalog state. */
export const useSongLookup = () => {
  const { catalog } = useCatalog()
  const { japaneseTitle } = useSongAliases()

  /** Song row for an id, or null before the catalog loads. */
  const songById = (songId: number): SongRow | null => {
    const current = catalog.value
    if (current === null) return null
    return songIndex(current).get(songId) ?? null
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
