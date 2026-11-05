import { describe, expect, it } from 'vitest'
import { availableProducers, producerNamesFor, producerNamesForSongs } from '../shared/producer-options.ts'
import type { SongRow } from '../shared/types.ts'

/** Song row with only the producer-relevant fields filled in. */
const song = (fields: Partial<SongRow> = {}): SongRow => ({
  id: 1,
  name: 'Song',
  name_ja: null,
  name_en: null,
  artist_string: null,
  song_type: 'Original',
  publish_date: null,
  length_seconds: null,
  source_url: 'https://vocadb.net/S/1',
  retrieved_at: '2026-01-01T00:00:00.000Z',
  ...fields,
})

describe('producerNamesFor', () => {
  it('prefers structured producer rows over the free-text credit', () => {
    expect(producerNamesFor(song({
      artist_string: 'kz, Google feat. 初音ミク',
      producers: [{ artistId: 89, name: 'kz', roles: 'producer, composer' }],
    }))).toEqual(['kz'])
  })

  it('falls back to the free-text credit only when there are no structured rows', () => {
    expect(producerNamesFor(song({
      artist_string: 'Anamanaguchi feat. 初音ミク',
      producers: [],
    }))).toEqual(['Anamanaguchi'])
    expect(producerNamesFor(song({ artist_string: null, producers: [] }))).toEqual([])
  })

  it('drops the Unknown producer(s) placeholder in the free-text fallback', () => {
    expect(producerNamesFor(song({
      artist_string: 'kz, Unknown producer(s) feat. various',
      producers: [],
    }))).toEqual(['kz'])
  })

  it('never emits a publisher-only free-text token when structured rows exist', () => {
    expect(producerNamesFor(song({
      artist_string: 'DECO*27, OTOIRO feat. 初音ミク',
      producers: [
        { artistId: 45, name: 'DECO*27', roles: 'producer, composer' },
        { artistId: 60068, name: 'Rockwell', roles: 'producer, arranger' },
      ],
    }))).toEqual(['DECO*27', 'Rockwell'])
  })

  it('deduplicates names in both paths', () => {
    expect(producerNamesFor(song({
      producers: [
        { artistId: 89, name: 'kz', roles: 'producer' },
        { artistId: 89, name: 'kz', roles: 'composer' },
      ],
    }))).toEqual(['kz'])
    expect(producerNamesFor(song({ artist_string: 'ryo, ryo feat. 初音ミク' }))).toEqual(['ryo'])
  })
})

describe('producerNamesForSongs', () => {
  it('takes structured names from any song in a merged variant group', () => {
    expect(producerNamesForSongs([
      song({ id: 1, artist_string: 'Various artists' }),
      song({ id: 2, producers: [{ artistId: 45, name: 'DECO*27', roles: 'producer' }] }),
    ])).toEqual(['DECO*27'])
  })

  it('uses the canonical free-text credit when no variant has structured rows', () => {
    expect(producerNamesForSongs([
      song({ id: 1, artist_string: 'Anamanaguchi feat. 初音ミク' }),
      song({ id: 2, artist_string: 'someone else' }),
    ])).toEqual(['Anamanaguchi'])
  })

  it('returns no names for an empty group', () => {
    expect(producerNamesForSongs([])).toEqual([])
  })
})

describe('availableProducers', () => {
  it('offers only producers that occur and counts the rows crediting them', () => {
    const options = availableProducers([
      { producerList: ['ryo', 'kz'] },
      { producerList: ['ryo'] },
      { producerList: [] },
      { producerList: ['八王子P'] },
    ])
    expect(new Map(options.map((option) => [option.name, option.count]))).toEqual(
      new Map([
        ['ryo', 2],
        ['kz', 1],
        ['八王子P', 1],
      ]),
    )
    expect(options.map((option) => option.name)).not.toContain('supercell')
  })

  it('sorts by occurrence count descending, then by name', () => {
    const options = availableProducers([
      { producerList: ['Beta'] },
      { producerList: ['Alpha'] },
      { producerList: ['Alpha', 'Beta'] },
      { producerList: ['Gamma', 'Gamma'] },
    ])
    expect(options).toEqual([
      { name: 'Alpha', count: 2 },
      { name: 'Beta', count: 2 },
      { name: 'Gamma', count: 1 },
    ])
  })

  it('counts a producer once per row even when the row repeats the name', () => {
    expect(availableProducers([{ producerList: ['kz', 'kz'] }])).toEqual([{ name: 'kz', count: 1 }])
  })

  it('returns no options when there are no rows or no producers', () => {
    expect(availableProducers([])).toEqual([])
    expect(availableProducers([{ producerList: [] }])).toEqual([])
  })
})
