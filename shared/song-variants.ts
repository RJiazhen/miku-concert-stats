/** How a variant differs from its canonical song. */
export type VariantKind = 'remix' | 'remaster' | 'voicebank' | 'cover' | 'language'

/** One checked entry in the variant file. */
export type SongVariantEntry = {
  canonical: number
  kind: VariantKind
  note?: string
}

/** Variant song id string to its canonical song. */
export type SongVariantFile = Record<string, SongVariantEntry>

/** Lookups used by stats and pages to fold variants into one song. */
export type SongVariantIndex = {
  /** Canonical id for any song id. Songs without an entry map to themselves. */
  canonicalSongId: (songId: number) => number
  /** Variant ids merged into a canonical song, sorted by id. */
  variantSongIdsOf: (canonicalId: number) => number[]
  /** Canonical id followed by every variant id in its group. */
  groupSongIds: (songId: number) => number[]
  /** Canonical id to its group, variants included. */
  groups: ReadonlyMap<number, readonly number[]>
  /** Canonical id to the variant entries merged into it. */
  entriesByCanonical: ReadonlyMap<number, readonly SongVariantEntry[]>
  /** Number of merged variant entries. */
  size: number
}

const KINDS: readonly VariantKind[] = ['remix', 'remaster', 'voicebank', 'cover', 'language']

/** Whether a value is one of the accepted variant kinds. */
const isVariantKind = (value: unknown): value is VariantKind => {
  return typeof value === 'string' && (KINDS as readonly string[]).includes(value)
}

/** Reads a decimal song id from an object key or a JSON number. */
const readSongId = (value: unknown, context: string): number => {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) return value
  if (typeof value === 'string' && /^[1-9]\d*$/.test(value)) return Number(value)
  throw new Error(`${context} is not a song id`)
}

/** Builds an empty index so callers can skip variant merging without branching. */
export const emptySongVariantIndex = (): SongVariantIndex => ({
  canonicalSongId: (songId: number) => songId,
  variantSongIdsOf: () => [],
  groupSongIds: (songId: number) => [songId],
  groups: new Map(),
  entriesByCanonical: new Map(),
  size: 0,
})

/**
 * Validates the variant file and builds the lookup index.
 * Throws on a non-numeric key, an unknown kind, a canonical that is itself a variant (chains),
 * or a canonical equal to its own key.
 */
export const parseSongVariants = (value: unknown): SongVariantIndex => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Song variant file must be an object')
  }
  const raw = value as Record<string, unknown>
  const entries = new Map<number, SongVariantEntry>()
  for (const [key, entry] of Object.entries(raw)) {
    const variantId = readSongId(key, `Song variant key ${key}`)
    entries.set(variantId, parseEntry(variantId, entry))
  }
  for (const [variantId, entry] of entries) {
    if (entry.canonical === variantId) throw new Error(`Song ${variantId} is its own canonical`)
    if (entries.has(entry.canonical)) {
      throw new Error(`Song ${variantId} points at ${entry.canonical}, which is itself a variant`)
    }
  }
  return buildIndex(entries)
}

/** Reads one variant entry. */
const parseEntry = (variantId: number, entry: unknown): SongVariantEntry => {
  if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
    throw new Error(`Song variant ${variantId} is not an object`)
  }
  const record = entry as Record<string, unknown>
  const canonical = readSongId(record.canonical, `Song variant ${variantId} canonical`)
  if (!isVariantKind(record.kind)) throw new Error(`Song variant ${variantId} has an unknown kind`)
  if (record.note !== undefined && typeof record.note !== 'string') {
    throw new Error(`Song variant ${variantId} note is not text`)
  }
  const parsed: SongVariantEntry = { canonical, kind: record.kind }
  if (typeof record.note === 'string') parsed.note = record.note
  return parsed
}

/** Groups entries by canonical id and exposes closure-based lookups. */
const buildIndex = (entries: ReadonlyMap<number, SongVariantEntry>): SongVariantIndex => {
  const byCanonical = new Map<number, SongVariantEntry[]>()
  for (const entry of entries.values()) {
    const list = byCanonical.get(entry.canonical) ?? []
    list.push(entry)
    byCanonical.set(entry.canonical, list)
  }
  const variantIdsByCanonical = new Map<number, number[]>()
  for (const [variantId, entry] of entries) {
    const list = variantIdsByCanonical.get(entry.canonical) ?? []
    list.push(variantId)
    variantIdsByCanonical.set(entry.canonical, list)
  }
  const groups = new Map<number, readonly number[]>()
  for (const [canonical, variantIds] of variantIdsByCanonical) {
    variantIds.sort((left, right) => left - right)
    groups.set(canonical, [canonical, ...variantIds])
  }
  return {
    canonicalSongId: (songId: number) => entries.get(songId)?.canonical ?? songId,
    variantSongIdsOf: (canonicalId: number) => [...(variantIdsByCanonical.get(canonicalId) ?? [])],
    groupSongIds: (songId: number) => {
      const canonical = entries.get(songId)?.canonical ?? songId
      const group = groups.get(canonical)
      return group ? [...group] : [canonical]
    },
    groups,
    entriesByCanonical: byCanonical,
    size: entries.size,
  }
}
