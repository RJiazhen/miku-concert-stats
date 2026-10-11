import type { Catalog, Platform, SongRow } from './types.ts'

/** A song hit returned by the on-demand VocaDB search. */
export type LookupHit = {
  id: number
  name: string
  artistString: string | null
  url: string
  pvs: { platform: Platform; url: string }[]
}

const SERVICES: Record<string, Platform> = {
  NicoNicoDouga: 'niconico',
  Youtube: 'youtube',
  Bilibili: 'bilibili',
}

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

/** Maps a VocaDB song search payload to at most five hits with supported PV links. */
export const mapSongSearch = (payload: unknown): LookupHit[] => {
  if (!payload || typeof payload !== 'object' || !('items' in payload) || !Array.isArray(payload.items)) return []
  const hits: LookupHit[] = []
  for (const item of payload.items) {
    if (hits.length >= 5) break
    if (!item || typeof item !== 'object') continue
    const song = item as { id?: unknown; name?: unknown; artistString?: unknown; pvs?: unknown }
    if (typeof song.id !== 'number' || typeof song.name !== 'string') continue
    const pvs: LookupHit['pvs'] = []
    if (Array.isArray(song.pvs)) {
      for (const pv of song.pvs) {
        if (!pv || typeof pv !== 'object') continue
        const entry = pv as { service?: unknown; url?: unknown; disabled?: unknown }
        if (typeof entry.service !== 'string' || typeof entry.url !== 'string' || entry.disabled === true) continue
        const platform = SERVICES[entry.service]
        if (!platform) continue
        pvs.push({ platform, url: entry.url })
      }
    }
    hits.push({
      id: song.id,
      name: song.name,
      artistString: typeof song.artistString === 'string' ? song.artistString : null,
      url: `https://vocadb.net/S/${song.id}`,
      pvs,
    })
  }
  return hits
}
