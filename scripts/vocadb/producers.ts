import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Database from 'better-sqlite3'
import { isUnknownArtist } from '../../shared/credit.ts'
import { LOCAL_SONG_ID_BASE } from '../../shared/repertoire.ts'
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
 * Roles that make a credit producer-side alongside VocaDB's Producer category.
 *
 * Verified against VocaDB's own documentation: the song page lists the "Producers" section as
 * `category "Producer"` (artist types Music producer / Cover artist) **or** a credit with the
 * roles Arranger, Composer or Voice manipulator, while Lyricist belongs to "Other artists".
 * `VoiceManipulator` (調声 / 調音) is deliberately kept: it is the vocal tuning credit, which is
 * part of production, not a performance or publishing credit.
 * Sources: https://wiki.vocadb.net/docs/song-entry-page and
 * https://wiki.vocadb.net/docs/song-entry-editing ("the artist's type determines their default roles").
 */
const PRODUCER_ROLES = new Set(['composer', 'arranger', 'voicemanipulator'])

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
 *   `Composer` / `Arranger` / `VoiceManipulator` (all case-insensitive). This mirrors the
 *   "Producers" section of https://wiki.vocadb.net/docs/song-entry-page;
 * - deliberately exclude every non-producer job, even when VocaDB lists the credit on the song:
 *   Publisher, Illustrator, Animator, Lyricist, Mixer, Mastering, Instrumentalist, and
 *   Label- or Circle-only credits. Their categories / roles never enter `PRODUCER_ROLES`, so a
 *   Google (`Publisher`), `momo` (`Illustrator`) or OTOIRO / supercell (`Circle` or `Label`)
 *   credit is dropped unless VocaDB also names a producer-side job. `VoiceManipulator` (調声 /
 *   調音) is kept on purpose as part of production. Lyricist is excluded because VocaDB lists
 *   lyricists under "Other artists", so `roles` is the evidence field and `categories` is the
 *   group membership the VocaDB UI also uses;
 * - `roles: "Default"` in the API means the credit inherits the artist type's default roles
 *   (a Music producer defaults to Composer/Arranger), so it is never treated as evidence by itself;
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

/**
 * Renders the song_producers increment.
 * The table is wholly derived, so a non-empty run clears it before inserting; an empty run writes
 * nothing at all, because wiping every credit is never the intended outcome of a failed fetch.
 */
export const songProducerSql = (rows: readonly SongProducerRow[], retrievedAt: string): string => {
  const header = [
    '-- Producer-side credits on each catalog song, from VocaDB structured artists (fields=Artists).',
    '-- Source: https://vocadb.net/api/songs/{id}?fields=Artists&lang=Default',
    `-- Retrieved: ${retrievedAt}`,
    '-- License: https://wiki.vocadb.net/docs/license (link back when reusing database contents)',
    '-- Kept when categories contain Producer or roles contain Composer / Arranger / VoiceManipulator,',
    '-- matching the VocaDB song page "Producers" section (https://wiki.vocadb.net/docs/song-entry-page);',
    '-- Lyricist is not included because VocaDB lists lyricists under "Other artists".',
    '-- roles stores that evidence lower-cased (producer, composer, ...). Placeholders are dropped.',
    '-- The table is wholly derived, so it is cleared first: INSERT OR IGNORE alone would keep the',
    '-- credits of songs that a later collection drops. No other table is touched.',
    '-- An empty result writes no statements, so a failed fetch cannot erase the existing rows.',
  ]
  if (rows.length === 0) return [...header, ''].join('\n')
  return [
    ...header,
    'BEGIN;',
    'DELETE FROM song_producers;',
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
