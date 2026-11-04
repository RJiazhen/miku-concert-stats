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
  /** Variant id to the entry that merges it into its canonical song. */
  entries: ReadonlyMap<number, SongVariantEntry>
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
  entries: new Map(),
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
    entries,
    entriesByCanonical: byCanonical,
    size: entries.size,
  }
}

/** Chinese label for each variant kind, used in version notes. */
export const variantKindLabels: Record<VariantKind, string> = {
  remix: '混音',
  remaster: '重制',
  voicebank: '声库',
  cover: '翻唱',
  language: '语言',
}

/** Brackets, dashes, and spacing that a removed title leaves at either end. */
const EDGE_NOISE = /^[\s\-–—·:：,，、/|~〜()（）[\]【】「」『』]+|[\s\-–—·:：,，、/|~〜()（）[\]【】「」『』]+$/g

/** Folds a title fragment to the text worth showing, or '' when nothing is left. */
const trimTitleFragment = (value: string): string => value.replace(EDGE_NOISE, '').replace(/\s+/g, ' ').trim()

/**
 * Text left in a variant title after removing its canonical title.
 * Returns '' when the titles do not share the canonical title, so callers fall back to the kind.
 */
const titleRemainder = (variantName: string, canonicalName: string): string => {
  const variant = variantName.trim()
  const canonical = canonicalName.trim()
  if (variant === '' || canonical === '') return ''
  const lowerVariant = variant.toLowerCase()
  const lowerCanonical = canonical.toLowerCase()
  const comparable = lowerVariant.length === variant.length && lowerCanonical.length === canonical.length
  const index = comparable && lowerVariant.includes(lowerCanonical)
    ? lowerVariant.indexOf(lowerCanonical)
    : variant.indexOf(canonical)
  if (index === -1) return ''
  return trimTitleFragment(variant.slice(0, index) + variant.slice(index + canonical.length))
}

/**
 * Version note shown next to a performance: the canonical song reads `原版`,
 * a variant reads its kind plus the distinguishing title fragment.
 * The full song name is never repeated, and a variant with no visible difference keeps just the kind.
 */
export const variantVersionNote = (canonicalName: string, variantName: string, kind?: VariantKind): string => {
  const kindLabel = kind ? variantKindLabels[kind] : '其他版本'
  const remainder = titleRemainder(variantName, canonicalName)
  return remainder === '' ? kindLabel : `${kindLabel} · ${remainder}`
}
