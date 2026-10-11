/** One vocalist credit from a VocaDB song `artists` array. */
export type ArtistCredit = {
  name?: string
  categories?: string
  roles?: string
  artist?: { name?: string }
}

/** A base character and the rules that fold voicebank names into it. */
export type CharacterRule = {
  name: string
  patterns: RegExp[]
}

/** Matched base names, in config order, and vocalist tokens that matched nothing. */
export type CharacterAssignment = {
  characters: string[]
  unmatched: string[]
}

/** Credits used to name the characters on one song. Structured vocalists win when present. */
export type CharacterSource = {
  artistString?: string | null
  artists?: readonly ArtistCredit[] | null
}

const FEAT = /feat\./i

/** Escapes a literal alias so it can be used as a prefix pattern. */
const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Compiles `data/characters.json`.
 * Each key is the display name. `patterns` are regular expressions, and each alias matches that text or the same text plus a voicebank suffix.
 * Throws when an entry has no rules or a pattern does not compile.
 */
export const parseCharacterConfig = (value: unknown): CharacterRule[] => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Character config must be an object')
  const rules: CharacterRule[] = []
  for (const [name, entry] of Object.entries(value)) {
    if (!name.trim()) throw new Error('Character name is empty')
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error(`Character ${name} is not an object`)
    const record = entry as { patterns?: unknown; aliases?: unknown }
    const sources: { source: string; flags: string }[] = []
    if (record.patterns !== undefined) {
      if (!Array.isArray(record.patterns)) throw new Error(`Character ${name} patterns must be an array`)
      for (const pattern of record.patterns) {
        if (typeof pattern !== 'string' || pattern.trim() === '') throw new Error(`Character ${name} has an empty pattern`)
        sources.push({ source: pattern, flags: '' })
      }
    }
    if (record.aliases !== undefined) {
      if (!Array.isArray(record.aliases)) throw new Error(`Character ${name} aliases must be an array`)
      for (const alias of record.aliases) {
        if (typeof alias !== 'string' || alias.trim() === '') throw new Error(`Character ${name} has an empty alias`)
        sources.push({ source: `^${escapeRegExp(alias)}(?:\\s|$)`, flags: 'i' })
      }
    }
    if (sources.length === 0) throw new Error(`Character ${name} has no patterns or aliases`)
    const patterns = sources.map((source) => {
      try {
        return new RegExp(source.source, source.flags)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        throw new Error(`Character ${name} pattern failed: ${message}`)
      }
    })
    rules.push({ name, patterns })
  }
  return rules
}

/**
 * Names whose categories or roles include Vocalist.
 * Returns null when the array is missing or contains no vocalist, so the caller can use `artist_string`.
 */
export const vocalistNames = (artists: readonly ArtistCredit[] | null | undefined): string[] | null => {
  if (!artists || artists.length === 0) return null
  const names: string[] = []
  for (const credit of artists) {
    const label = `${credit.categories ?? ''} ${credit.roles ?? ''}`
    if (!/\bVocalist\b/i.test(label)) continue
    const name = (credit.name || credit.artist?.name || '').trim()
    if (name) names.push(name)
  }
  return names.length === 0 ? null : names
}

/**
 * Vocalist tokens after the first `feat.` in an artist string.
 * Producers before that marker are ignored. Commas split multiple vocalists.
 */
export const vocalistsAfterFeat = (artistString: string | null | undefined): string[] => {
  if (!artistString) return []
  const match = FEAT.exec(artistString)
  if (!match) return []
  return artistString
    .slice(match.index + match[0].length)
    .split(/[,、]/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
}

/**
 * Maps one song's vocalists onto base character names.
 * Structured Vocalist credits replace the `feat.` fallback. Unmatched tokens are returned as written.
 */
export const assignCharacters = (rules: readonly CharacterRule[], source: CharacterSource): CharacterAssignment => {
  const tokens = vocalistNames(source.artists) ?? vocalistsAfterFeat(source.artistString)
  const matched = new Set<string>()
  const unmatched: string[] = []
  for (const token of tokens) {
    const rule = rules.find((entry) => entry.patterns.some((pattern) => pattern.test(token)))
    if (!rule) {
      if (!unmatched.includes(token)) unmatched.push(token)
      continue
    }
    matched.add(rule.name)
  }
  return {
    characters: rules.map((rule) => rule.name).filter((name) => matched.has(name)),
    unmatched,
  }
}
