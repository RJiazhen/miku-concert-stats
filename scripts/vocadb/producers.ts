import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Database from 'better-sqlite3'
import { isUnknownArtist } from '../../shared/credit.ts'
import type { SongProducerCredit, SongProducerRow, SqlRow } from '../../shared/types.ts'
import { applyCatalogSql, repoRoot } from '../build-catalog.ts'
import { chunkInsertsIgnoring } from '../sql/emit.ts'
import type { ApiArtist, ApiSong } from './api-types.ts'
import { createVocadbClient } from './client.ts'

const API = 'https://vocadb.net/api'

/** Song API URL that returns the structured artist list, including producer roles. */
export const songArtistsUrl = (songId: number): string => `${API}/songs/${songId}?fields=Artists&lang=Default`

/** Song ids already in the committed catalog, read from the schema plus every increment. */
export const catalogSongIds = (root = repoRoot()): number[] => {
  const db = new Database(':memory:')
  try {
    applyCatalogSql(db, root)
    return db.prepare('SELECT id FROM songs ORDER BY id').all().map((raw) => {
      const row = raw as SqlRow
      const id = row.id
      if (typeof id !== 'number') throw new Error('songs.id is not a number')
      return id
    })
  } finally {
    db.close()
  }
}

/** Roles that make a credit producer-side alongside VocaDB's Producer category. */
const PRODUCER_ROLES = new Set(['composer', 'arranger', 'lyricist'])

/** Splits a VocaDB comma-separated category or role field into trimmed lower-case tokens. */
const tokens = (value: string | undefined): string[] =>
  (value ?? '')
    .split(',')
    .map((token) => token.trim().toLowerCase())
    .filter((token) => token !== '')

/** Evidence tokens that qualify one credit, ordered as `producer` then the matched roles. */
const producerEvidence = (credit: ApiArtist): string[] => {
  const categories = tokens(credit.categories)
  const roles = tokens(credit.roles)
  const evidence: string[] = []
  if (categories.includes('producer')) evidence.push('producer')
  for (const role of roles) if (PRODUCER_ROLES.has(role)) evidence.push(role)
  return [...new Set(evidence)]
}

/**
 * Reads the producer-side credits off one song payload.
 *
 * Mapping rule (documented in docs/architecture.md):
 * - keep a credit when `categories` contains `Producer`, or `roles` contains
 *   `Composer` / `Arranger` / `Lyricist` (all case-insensitive);
 * - `roles` stores the auditable evidence: `producer` for the category plus the matched
 *   roles in source order, lower-cased and comma-separated (e.g. `producer, composer`);
 * - `artist.id` (falling back to the credit id) keeps name variants on one option, and
 *   repeated credits for the same artist merge their evidence;
 * - VocaDB placeholders such as `Unknown producer(s)` are dropped via `isUnknownArtist`,
 *   and a credit without an artist id is skipped because it cannot be joined reliably.
 */
export const producersOfSong = (song: ApiSong): SongProducerCredit[] => {
  const byArtistId = new Map<number, SongProducerCredit>()
  for (const credit of song.artists ?? []) {
    const artistId = credit.artist?.id ?? credit.id
    if (typeof artistId !== 'number' || !Number.isInteger(artistId)) continue
    const name = (credit.name || credit.artist?.name || '').trim()
    if (name === '' || isUnknownArtist(name)) continue
    const evidence = producerEvidence(credit)
    if (evidence.length === 0) continue
    const existing = byArtistId.get(artistId)
    if (!existing) {
      byArtistId.set(artistId, { artistId, name, roles: evidence.join(', ') })
      continue
    }
    const merged = new Set([...existing.roles.split(', '), ...evidence])
    existing.roles = [...merged].join(', ')
  }
  return [...byArtistId.values()].sort((left, right) => left.artistId - right.artistId)
}

/** Fetches every catalog song's artists and returns one row per producer-side credit. */
export const collectSongProducers = async (
  getJson: (url: string) => Promise<unknown>,
  songIds: readonly number[],
): Promise<SongProducerRow[]> => {
  const rows: SongProducerRow[] = []
  for (const songId of songIds) {
    const payload = (await getJson(songArtistsUrl(songId))) as ApiSong
    if (payload.id !== songId) throw new Error(`Song ${songId} returned id ${payload.id}`)
    for (const credit of producersOfSong(payload)) {
      rows.push({ song_id: songId, artist_id: credit.artistId, name: credit.name, roles: credit.roles })
    }
  }
  return rows
}

/** Renders the song_producers increment; additive only, so INSERT OR IGNORE keeps existing rows. */
export const songProducerSql = (rows: readonly SongProducerRow[], retrievedAt: string): string => {
  return [
    '-- Producer-side credits on each catalog song, from VocaDB structured artists (fields=Artists).',
    '-- Source: https://vocadb.net/api/songs/{id}?fields=Artists&lang=Default',
    `-- Retrieved: ${retrievedAt}`,
    '-- License: https://wiki.vocadb.net/docs/license (link back when reusing database contents)',
    '-- Kept when categories contain Producer or roles contain Composer / Arranger / Lyricist;',
    '-- roles stores that evidence lower-cased (producer, composer, ...). Placeholders are dropped.',
    '-- Purely additive: INSERT OR IGNORE, with no DELETE of catalog tables.',
    'BEGIN;',
    chunkInsertsIgnoring(
      'song_producers',
      ['song_id', 'artist_id', 'name', 'roles'],
      rows.map((row) => [row.song_id, row.artist_id, row.name, row.roles]),
    ),
    'COMMIT;',
    '',
  ].filter((part) => part !== '').join('\n')
}

/** Writes data/increments/0007-song-producers.sql from the cached VocaDB artist lists. */
export const writeSongProducerIncrement = async (root = repoRoot()): Promise<void> => {
  const retrievedAt = new Date().toISOString()
  const client = createVocadbClient({ cacheDir: path.join(root, 'data', 'cache') })
  const songIds = catalogSongIds(root)
  const rows = await collectSongProducers(client.getJson, songIds)
  const target = path.join(root, 'data', 'increments', '0007-song-producers.sql')
  await mkdir(path.dirname(target), { recursive: true })
  await writeFile(target, songProducerSql(rows, retrievedAt))
  const producers = new Set(rows.map((row) => row.artist_id))
  console.log(`Wrote ${target}: ${rows.length} producer credits, ${producers.size} distinct artists, ${client.requestCount()} requests`)
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isDirectRun) {
  await writeSongProducerIncrement()
}
