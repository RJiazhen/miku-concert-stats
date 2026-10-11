/** What a setlist line contributes to song counts. */
export type MedleyDecision =
  | { kind: 'single'; songIds: number[] }
  | { kind: 'split'; songIds: number[] }
  | { kind: 'quarantine'; reason: string }

/** Inputs that can prove which songs a mashup line contains. */
export type MedleyInput = {
  songType: string
  listedSongId: number
  notes: string | null
  webLinkUrls: readonly string[]
}

const VOCADB_SONG_URL = /vocadb\.net\/(?:S|Song\/Details)\/(\d+)/gi

/**
 * Collects VocaDB song ids cited by a mashup's notes or web links.
 * Ids equal to the mashup itself are ignored.
 */
export const citedSongIds = (listedSongId: number, texts: readonly string[]): number[] => {
  const ids = new Set<number>()
  for (const text of texts) {
    for (const match of text.matchAll(VOCADB_SONG_URL)) {
      const id = Number(match[1])
      if (Number.isInteger(id) && id > 0 && id !== listedSongId) ids.add(id)
    }
  }
  return [...ids].sort((left, right) => left - right)
}

/**
 * Splits a mashup only when at least two other VocaDB song URLs are cited.
 * Anything else is quarantined so it is not counted as one song.
 * Non-mashup lines stay as the listed song.
 */
export const decideMedley = (input: MedleyInput): MedleyDecision => {
  if (input.songType !== 'Mashup') {
    return { kind: 'single', songIds: [input.listedSongId] }
  }
  const texts = [input.notes ?? '', ...input.webLinkUrls]
  const songIds = citedSongIds(input.listedSongId, texts)
  if (songIds.length >= 2) return { kind: 'split', songIds }
  return {
    kind: 'quarantine',
    reason: 'Mashup has fewer than two verifiable component song URLs on VocaDB notes or web links',
  }
}
