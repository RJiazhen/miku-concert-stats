import { useCatalog } from './useCatalog.ts'
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

  return { catalog, songById, songName }
}
