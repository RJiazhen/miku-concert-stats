import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import { applyCatalogSql } from '../scripts/build-catalog.ts'
import { loadCatalog } from '../shared/catalog.ts'
import { parseSongNotes, songNoteFor } from '../shared/song-notes.ts'
import type { SqlRow } from '../shared/types.ts'

describe('song notes', () => {
  it('rejects a non-object, a non-id key, and blank text', () => {
    expect(() => parseSongNotes([])).toThrow(/object/)
    expect(() => parseSongNotes(null)).toThrow(/object/)
    expect(() => parseSongNotes({ melt: '说明' })).toThrow(/not an id/)
    expect(() => parseSongNotes({ '10': '  ' })).toThrow(/empty/)
    expect(() => parseSongNotes({ '10': 5 })).toThrow(/empty|text/)
  })

  it('looks up a note and misses a song without a row', () => {
    const file = parseSongNotes({ '10': '说明' })
    expect(songNoteFor(file, 10)).toBe('说明')
    expect(songNoteFor(file, 11)).toBeNull()
  })

  it('only keeps notes for catalog songs', () => {
    const raw = JSON.parse(readFileSync(new URL('../data/song-notes.json', import.meta.url), 'utf8')) as unknown
    const notes = parseSongNotes(raw)
    const db = new Database(':memory:')
    try {
      applyCatalogSql(db)
      const catalog = loadCatalog({
        /** Reads the in-memory catalog built from committed SQL. */
        all: (sql: string) => db.prepare(sql).all() as SqlRow[],
      })
      const ids = new Set(catalog.songs.map((song) => song.id))
      for (const id of Object.keys(notes)) {
        expect(ids.has(Number(id))).toBe(true)
      }
    } finally {
      db.close()
    }
  })
})
