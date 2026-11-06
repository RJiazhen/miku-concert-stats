import { describe, expect, it } from 'vitest'
import { localSongMatches } from '../shared/lookup.ts'
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
})
