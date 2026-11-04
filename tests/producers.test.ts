import { describe, expect, it } from 'vitest'
import { producersOfSong, songProducerSql } from '../scripts/vocadb/producers.ts'

describe('song producer collection', () => {
  it('keeps Producer credits and records the lower-cased evidence in source order', () => {
    expect(producersOfSong({
      id: 1,
      name: 'Song',
      artists: [
        { id: 38, name: '八王子P', categories: 'Producer', roles: 'Arranger, Composer' },
        { id: 51, name: 'sasakure.UK', categories: 'Producer, Animator', roles: 'Animator, Composer' },
      ],
    })).toEqual([
      { artistId: 38, name: '八王子P', roles: 'producer, arranger, composer' },
      { artistId: 51, name: 'sasakure.UK', roles: 'producer, composer' },
    ])
  })

  it('keeps a Composer / Arranger / Lyricist credit even without the Producer category', () => {
    expect(producersOfSong({
      id: 2,
      name: 'Song',
      artists: [
        { id: 7, name: 'q*Left', categories: 'Other', roles: 'Lyricist' },
        { id: 8, name: 'Someone', categories: 'Other', roles: 'Composer, Arranger' },
        { id: 9, name: 'Vocalist', categories: 'Vocalist', roles: 'Default' },
      ],
    })).toEqual([
      { artistId: 7, name: 'q*Left', roles: 'lyricist' },
      { artistId: 8, name: 'Someone', roles: 'composer, arranger' },
    ])
  })

  it('drops VocaDB placeholders and credits without an artist id', () => {
    expect(producersOfSong({
      id: 3,
      name: 'Song',
      artists: [
        { id: 10, name: 'Unknown producer(s)', categories: 'Producer', roles: 'Composer' },
        { name: 'ryo', categories: 'Producer', roles: 'Composer' },
      ],
    })).toEqual([])
  })

  it('deduplicates by artist id and merges evidence across name variants', () => {
    expect(producersOfSong({
      id: 4,
      name: 'Song',
      artists: [
        { id: 38, name: '八王子P', categories: 'Producer', roles: 'Composer' },
        { id: 38, name: 'HachioujiP', categories: 'Producer', roles: 'Arranger' },
        { name: 'kz', categories: 'Producer', artist: { id: 89, name: 'kz' } },
      ],
    })).toEqual([
      { artistId: 38, name: '八王子P', roles: 'producer, composer, arranger' },
      { artistId: 89, name: 'kz', roles: 'producer' },
    ])
  })

  it('renders an additive INSERT OR IGNORE increment with a sourced header', () => {
    const sql = songProducerSql(
      [{ song_id: 680530, artist_id: 89, name: 'kz', roles: 'producer, composer, lyricist' }],
      '2026-11-04T00:00:00.000Z',
    )
    expect(sql).toContain('-- Source: https://vocadb.net/api/songs/{id}?fields=Artists&lang=Default')
    expect(sql).toContain('-- Retrieved: 2026-11-04T00:00:00.000Z')
    expect(sql).toContain('https://wiki.vocadb.net/docs/license')
    expect(sql).toContain('BEGIN;')
    expect(sql).toContain(
      "INSERT OR IGNORE INTO song_producers (song_id, artist_id, name, roles) VALUES\n(680530, 89, 'kz', 'producer, composer, lyricist');",
    )
    expect(sql).toContain('COMMIT;')
    expect(sql).not.toContain('DELETE FROM')
    expect(songProducerSql([], '2026-11-04T00:00:00.000Z')).not.toContain('INTO song_producers')
  })
})
