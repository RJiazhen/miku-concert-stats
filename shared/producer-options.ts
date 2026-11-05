import { producerCredit } from './credit.ts'
import type { SongRow } from './types.ts'

/** Ranked row fields the producer picker reads. */
export type ProducerRankedRow = {
  /** Producer names shown for the row, already resolved to one name per artist. */
  producerList: readonly string[]
}

/** One producer that occurs in at least one ranked row. */
export type ProducerOption = {
  name: string
  /** Number of ranked rows that credit this producer. */
  count: number
}

/**
 * Structured producer names from `song_producers`, deduped in catalog order.
 * Every row already passed the producer-side evidence rule, so nothing is re-filtered here.
 */
const structuredProducerNames = (song: SongRow): string[] => {
  const names = new Set<string>()
  for (const credit of song.producers ?? []) {
    const name = credit.name.trim()
    if (name !== '') names.add(name)
  }
  return [...names]
}

/**
 * Free-text producer tokens from `artist_string`, deduped in source order.
 * `producerCredit` already strips the `feat.` segment and VocaDB's `Unknown producer(s)` placeholder.
 */
const freeTextProducerNames = (song: SongRow): string[] => {
  const credit = producerCredit(song.artist_string)
  if (credit === null) return []
  return [...new Set(credit.split(', ').map((name) => name.trim()).filter((name) => name !== ''))]
}

/**
 * Producer names shown for one song.
 *
 * Structured `song_producers` names win because they carry VocaDB's producer-side evidence
 * (Producer category, Composer, Arranger, VoiceManipulator). A song with structured rows never
 * emits free-text-only credits such as a Publisher, Illustrator, label, or circle. The free-text
 * `artist_string` credit is a fallback only for songs VocaDB gives no structured producer rows.
 */
export const producerNamesFor = (song: SongRow): string[] => {
  const structured = structuredProducerNames(song)
  if (structured.length > 0) return structured
  return freeTextProducerNames(song)
}

/**
 * Producer names for one ranking row, which may merge several variant songs.
 *
 * A structured credit on any song in the group wins over free text, so a variant's publisher or
 * label credit cannot reappear on a row whose canonical song has structured producers. The
 * free-text fallback comes from the canonical (first) song and only when no song in the group
 * has structured rows.
 */
export const producerNamesForSongs = (songs: readonly SongRow[]): string[] => {
  const structured = new Set<string>()
  for (const song of songs) for (const name of structuredProducerNames(song)) structured.add(name)
  if (structured.size > 0) return [...structured]
  const canonical = songs[0]
  return canonical === undefined ? [] : freeTextProducerNames(canonical)
}

/**
 * Producers present in the ranking, most frequent first and then by name.
 * Rows without producers contribute nothing, and a producer repeated on one row counts once.
 * Callers pass the rows before the search and producer filters so the list cannot shrink as those are applied,
 * which also keeps every option able to match at least one row.
 */
export const availableProducers = (rows: readonly ProducerRankedRow[]): ProducerOption[] => {
  const counts = new Map<string, number>()
  for (const row of rows) {
    for (const name of new Set(row.producerList)) counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  return [...counts]
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name, 'ja'))
}
