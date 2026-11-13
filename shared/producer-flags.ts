/** How a producer name participates in the site's statistics. */
export const PRODUCER_KINDS = ['core', 'support', 'label'] as const

/** One checked kind a producer name can carry. */
export type ProducerKind = (typeof PRODUCER_KINDS)[number]

/** One checked entry of `data/producer-flags.json`. */
export type ProducerFlagEntry = {
  /** Display name the catalog uses; required when the key is a VocaDB artist id. */
  name: string
  /** `label` and `support` are the meaningful flags; `core` restates the default. */
  kind: ProducerKind
  /** Why the name is flagged, kept as the audit trail next to the raw credits. */
  note: string | null
}

/** Flag lookups shared by the aggregation, filters, search, and pages. */
export type ProducerFlagIndex = {
  /**
   * Kind recorded for one credit. A VocaDB artist id wins over the display name, so a credit
   * keeps its flag when VocaDB re-spells the name; an unrecorded name is `core`.
   */
  kindOf: (name: string, artistId?: number | null) => ProducerKind
  /**
   * Whether a credit counts toward rankings, totals, filters, and search.
   * Only `label` is excluded; `support` stays counted but is marked on the song page.
   */
  isCounted: (name: string, artistId?: number | null) => boolean
  /** Flags by display name. */
  byName: ReadonlyMap<string, ProducerFlagEntry>
  /** Flags by VocaDB artist id. */
  byArtistId: ReadonlyMap<number, ProducerFlagEntry>
  /** Number of checked entries. */
  size: number
}

/** Empty index, so callers can aggregate without flags and without branching. */
export const emptyProducerFlagIndex = (): ProducerFlagIndex => ({
  kindOf: () => 'core',
  isCounted: () => true,
  byName: new Map(),
  byArtistId: new Map(),
  size: 0,
})

/** Whether a value is one of the accepted kinds. */
const isProducerKind = (value: unknown): value is ProducerKind =>
  typeof value === 'string' && (PRODUCER_KINDS as readonly string[]).includes(value)

/** Reads a non-empty trimmed string field. */
const text = (value: unknown, context: string): string => {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`${context} must be non-empty text`)
  return value.trim()
}

/** Whether a JSON key addresses a VocaDB artist id rather than a display name. */
const isArtistIdKey = (key: string): boolean => /^[1-9]\d*$/.test(key)

/** Parses one entry, defaulting its name to a name key. */
const parseEntry = (key: string, value: unknown): { entry: ProducerFlagEntry; artistId: number | null } => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Producer flag ${key} is not an object`)
  }
  const record = value as Record<string, unknown>
  if (!isProducerKind(record.kind)) throw new Error(`Producer flag ${key} has an unknown kind`)
  const artistId = isArtistIdKey(key) ? Number(key) : null
  // A name key defaults its name to the key; a numeric key must spell the name out.
  const name = text(artistId === null ? record.name ?? key : record.name, `Producer flag ${key} name`)
  if (record.note !== undefined && typeof record.note !== 'string') {
    throw new Error(`Producer flag ${key} note is not text`)
  }
  const note = typeof record.note === 'string' && record.note.trim() !== '' ? record.note.trim() : null
  return { entry: { name, kind: record.kind, note }, artistId }
}

/**
 * Validates `data/producer-flags.json` and builds the lookup index.
 *
 * Keys are either a VocaDB artist id (digits, and then `name` is required so the file stays
 * readable) or the producer display name. Two keys that describe the same name or the same
 * artist id are an error, so a name cannot be both a person and a label by accident.
 */
export const parseProducerFlags = (value: unknown): ProducerFlagIndex => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Producer flag file must be an object')
  }
  const byName = new Map<string, ProducerFlagEntry>()
  const byArtistId = new Map<number, ProducerFlagEntry>()
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const { entry, artistId } = parseEntry(key, raw)
    if (byName.has(entry.name)) throw new Error(`Producer ${entry.name} is flagged twice`)
    byName.set(entry.name, entry)
    if (artistId === null) continue
    if (byArtistId.has(artistId)) throw new Error(`VocaDB artist ${artistId} is flagged twice`)
    byArtistId.set(artistId, entry)
  }
  const kindOf = (name: string, artistId?: number | null): ProducerKind => {
    if (artistId !== null && artistId !== undefined) {
      const byId = byArtistId.get(artistId)
      if (byId !== undefined) return byId.kind
    }
    return byName.get(name)?.kind ?? 'core'
  }
  return {
    kindOf,
    isCounted: (name, artistId) => kindOf(name, artistId) !== 'label',
    byName,
    byArtistId,
    size: byName.size,
  }
}
