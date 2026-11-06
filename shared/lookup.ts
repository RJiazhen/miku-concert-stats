import type { Catalog, SongRow } from './types.ts'

/**
 * Finds songs already in the catalog.
 * Matching is a case-insensitive substring over the stored names and artist credit.
 */
export const localSongMatches = (catalog: Catalog, query: string): SongRow[] => {
  const needle = query.trim().toLocaleLowerCase()
  if (!needle) return []
  return catalog.songs
    .filter((song) => {
      const haystack = [song.name, song.name_ja, song.name_en, song.artist_string]
        .filter((part) => part)
        .join('\n')
        .toLocaleLowerCase()
      return haystack.includes(needle)
    })
    .slice(0, 20)
}

/**
 * Producer names already in the catalog, for the same header search.
 * Re-exported here so the two catalog searches live behind one module.
 */
export { localProducerMatches, type ProducerLookupHit } from './producers.ts'
