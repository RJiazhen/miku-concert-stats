import { describe, expect, it } from 'vitest'
import { localSongMatches, mapSongSearch } from '../shared/lookup.ts'
import type { Catalog } from '../shared/types.ts'

describe('lookup', () => {
  it('matches songs already stored in the catalog', () => {
    const catalog = {
      songs: [
        { id: 1, name: 'カゲロウデイズ', name_ja: null, name_en: 'Kagerou Daze', artist_string: 'じん', song_type: 'Remaster', publish_date: null, length_seconds: null, source_url: 'https://vocadb.net/S/1', retrieved_at: '2026-10-12T00:00:00.000Z' },
      ],
    } as Catalog
    expect(localSongMatches(catalog, 'kagerou')).toHaveLength(1)
    expect(localSongMatches(catalog, 'not-in-catalog')).toHaveLength(0)
  })

  it('keeps at most five VocaDB hits and only supported PV services', () => {
    const items = Array.from({ length: 6 }, (_, index) => ({
      id: index + 1,
      name: `Song ${index}`,
      pvs: [
        { service: 'Youtube', url: 'https://youtu.be/x', disabled: false },
        { service: 'SoundCloud', url: 'https://soundcloud.com/x', disabled: false },
      ],
    }))
    const hits = mapSongSearch({ items })
    expect(hits).toHaveLength(5)
    expect(hits[0]?.pvs).toEqual([{ platform: 'youtube', url: 'https://youtu.be/x' }])
  })
})
