import { describe, expect, it } from 'vitest'
import { decideMedley } from '../shared/medley.ts'

describe('decideMedley', () => {
  it('keeps a non-mashup as the listed song', () => {
    expect(decideMedley({ songType: 'Original', listedSongId: 10, notes: null, webLinkUrls: [] })).toEqual({
      kind: 'single',
      songIds: [10],
    })
  })

  it('splits a mashup that cites two other VocaDB songs', () => {
    const decision = decideMedley({
      songType: 'Mashup',
      listedSongId: 99,
      notes: 'See https://vocadb.net/S/3 and https://vocadb.net/Song/Details/8',
      webLinkUrls: [],
    })
    expect(decision).toEqual({ kind: 'split', songIds: [3, 8] })
  })

  it('quarantines a mashup without two verifiable components', () => {
    const decision = decideMedley({
      songType: 'Mashup',
      listedSongId: 99,
      notes: 'medley',
      webLinkUrls: ['https://vocadb.net/S/99'],
    })
    expect(decision.kind).toBe('quarantine')
  })
})
