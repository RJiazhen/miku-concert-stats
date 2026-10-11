import raw from '../data/characters.json'
import { assignCharacters, parseCharacterConfig, type ArtistCredit } from '../shared/characters.ts'

const rules = parseCharacterConfig(raw)

/** Base names in config order, for the ranking filter. */
export const characterNames: readonly string[] = rules.map((rule) => rule.name)

/**
 * Base character names for one song.
 * Structured Vocalist credits are used when the caller has them; otherwise the `feat.` list is used.
 */
export const songCharacters = (
  artistString: string | null,
  artists?: readonly ArtistCredit[] | null,
): string[] => assignCharacters(rules, { artistString, artists }).characters

/** Cell text for 演出角色. Songs with no matched vocalist show an em dash. */
export const formatCharacters = (
  artistString: string | null,
  artists?: readonly ArtistCredit[] | null,
): string => {
  const names = songCharacters(artistString, artists)
  return names.length === 0 ? '—' : names.join('、')
}
