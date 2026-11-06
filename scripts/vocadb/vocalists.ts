import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Database from 'better-sqlite3'
import { vocalistNames } from '../../shared/characters.ts'
import { LOCAL_SONG_ID_BASE } from '../../shared/repertoire.ts'
import type { SqlRow } from '../../shared/types.ts'
import { applyCatalogSql, repoRoot } from '../build-catalog.ts'
import { chunkInserts } from '../sql/emit.ts'
import type { ApiSong } from './api-types.ts'
import { createVocadbClient } from './client.ts'

const API = 'https://vocadb.net/api'

/** One collected vocalist credit. */
export type SongVocalistRow = {
  song_id: number
  name: string
}

/** Song API URL that returns the structured artist list. */
export const songArtistsUrl = (songId: number): string => `${API}/songs/${songId}?fields=Artists&lang=Default`

/** Song ids already in the committed catalog, read from the schema plus every increment. */
export const catalogSongIds = (root = repoRoot()): number[] => {
  const db = new Database(':memory:')
  try {
    applyCatalogSql(db, root)
    // A wiki-registered row has a reserved id and no VocaDB page, so the API cannot be asked.
    return db.prepare('SELECT id FROM songs WHERE id < ? ORDER BY id').all(LOCAL_SONG_ID_BASE).map((raw) => {
      const row = raw as SqlRow
      const id = row.id
      if (typeof id !== 'number') throw new Error('songs.id is not a number')
      return id
    })
  } finally {
    db.close()
  }
}

/**
 * Reads the vocalists off one song payload.
 * Only credits whose categories or roles name a Vocalist count; producers, illustrators,
 * and VocaDB's `Unknown producer(s)` placeholder are ignored.
 */
export const vocalistsOfSong = (song: ApiSong): string[] => {
  const names = vocalistNames(song.artists) ?? []
  return [...new Set(names.map((name) => name.trim()).filter((name) => name !== ''))]
}

/** Fetches every catalog song's artists and returns one row per vocalist. */
export const collectSongVocalists = async (
  getJson: (url: string) => Promise<unknown>,
  songIds: readonly number[],
): Promise<SongVocalistRow[]> => {
  const rows: SongVocalistRow[] = []
  for (const songId of songIds) {
    const payload = (await getJson(songArtistsUrl(songId))) as ApiSong
    if (payload.id !== songId) throw new Error(`Song ${songId} returned id ${payload.id}`)
    for (const name of vocalistsOfSong(payload)) rows.push({ song_id: songId, name })
  }
  return rows
}

/** Renders the song_vocalists increment. */
export const songVocalistSql = (rows: readonly SongVocalistRow[], retrievedAt: string): string => {
  return [
    '-- Vocalists credited on each catalog song, from VocaDB structured artists (fields=Artists).',
    '-- Source: https://vocadb.net/api/songs/{id}',
    `-- Retrieved: ${retrievedAt}`,
    '-- License: https://wiki.vocadb.net/docs/license (link back when reusing database contents)',
    '-- artist_string folds a large cast into `feat. various`; these rows keep the named vocalists.',
    'BEGIN;',
    'DELETE FROM song_vocalists;',
    chunkInserts('song_vocalists', ['song_id', 'name'], rows.map((row) => [row.song_id, row.name])),
    'COMMIT;',
    '',
  ].filter((part) => part !== '').join('\n')
}

/** Rewrites data/increments/0006-song-vocalists.sql from the live VocaDB artist lists. */
export const writeSongVocalistIncrement = async (root = repoRoot()): Promise<void> => {
  const retrievedAt = new Date().toISOString()
  const client = createVocadbClient({ cacheDir: path.join(root, 'data', 'cache') })
  const songIds = catalogSongIds(root)
  const rows = await collectSongVocalists(client.getJson, songIds)
  const target = path.join(root, 'data', 'increments', '0006-song-vocalists.sql')
  await mkdir(path.dirname(target), { recursive: true })
  await writeFile(target, songVocalistSql(rows, retrievedAt))
  console.log(`Wrote ${target}: ${rows.length} vocalist credits across ${songIds.length} songs, ${client.requestCount()} requests`)
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isDirectRun) {
  await writeSongVocalistIncrement()
}
