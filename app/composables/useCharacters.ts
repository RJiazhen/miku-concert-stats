import raw from '~~/data/characters.json'
import { assignCharacters, parseCharacterConfig, type CharacterRule } from '~~/shared/characters.ts'

const rules = parseCharacterConfig(raw)

/** Base names in config order, for the ranking filter. */
export const characterNames: readonly string[] = rules.map((rule) => rule.name)

/** Compiled character rules, shared with the timeline aggregation so both pages assign the same names. */
export const characterRules: readonly CharacterRule[] = rules

/** Image colour per base character; characters without a configured colour are absent. */
const colors = new Map(rules.filter((rule) => rule.color !== null).map((rule) => [rule.name, rule.color as string]))

/**
 * Image colour of a base character as `#rrggbb`, or null when the config lists none.
 * Used for the character chips on the ranking table.
 */
export const characterColor = (name: string): string | null => colors.get(name) ?? null

/** VocaDB credits of one song as the catalog stores them. */
export type SongCredits = {
  artist_string: string | null
  /** Vocalists collected from VocaDB's artists list; empty when the song has no structured credit. */
  vocalists?: readonly string[]
}

/**
 * Base character names for one song.
 * The collected vocalist list wins because `artist_string` collapses a large cast into `feat. various`;
 * without it the `feat.` segment of the artist string is used.
 */
export const songCharacters = (credits: SongCredits | null): string[] => {
  return assignCharacters(rules, {
    vocalists: credits?.vocalists ?? null,
    artistString: credits?.artist_string ?? null,
  }).characters
}

/** Cell text for 演出角色. Songs with no matched vocalist show an em dash. */
export const formatCharacters = (credits: SongCredits | null): string => {
  const names = songCharacters(credits)
  return names.length === 0 ? '—' : names.join('、')
}
