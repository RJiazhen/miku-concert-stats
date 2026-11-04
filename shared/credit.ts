/**
 * Marks where the featured-vocalist segment begins. `featuring` is listed before `feat` so the
 * longer word wins the alternation; the whole pattern is case-insensitive for `Feat.` / `FEAT`.
 */
const FEATURED_CREDIT = /\b(?:featuring|feat|ft)\.?\s*/i

/**
 * VocaDB's placeholder for a credited role whose artist was never named.
 * It carries no identity, so it is dropped instead of shown as if it were a person.
 */
const UNKNOWN_ARTIST = /^unknown (?:artist|producer|voicebank)s?(?:\(s\))?$/i

/** Comma-style separators between artist names, matched in both scripts. */
const NAME_SEPARATOR = /[,、，]/u

/** Whether one artist token is VocaDB's unnamed placeholder. */
export const isUnknownArtist = (name: string): boolean => UNKNOWN_ARTIST.test(name.trim())

/**
 * Splits an artist list and drops placeholder names and blank entries.
 * Returns the remaining names in their original order.
 */
const namedArtistList = (value: string): string[] => {
  return value
    .split(NAME_SEPARATOR)
    .map((name) => name.trim())
    .filter((name) => name !== '' && !isUnknownArtist(name))
}

/**
 * Producer credit from an `artist_string` such as `ryo, supercell feat. 初音ミク`.
 * Drops the `feat.` / `featuring` segment and its separator, then drops VocaDB's
 * `Unknown producer(s)` placeholder, so `kz, Unknown producer(s) feat. various` becomes `kz`.
 * Returns null when nothing nameable is left, which the 演出角色 column already covers.
 */
export const producerCredit = (artistString: string | null): string | null => {
  if (artistString === null) return null
  const match = artistString.match(FEATURED_CREDIT)
  const producers = namedArtistList(match ? artistString.slice(0, match.index ?? 0) : artistString)
  return producers.length === 0 ? null : producers.join(', ')
}

/**
 * Artist string as shown to readers, with VocaDB's unnamed placeholders removed.
 * Keeps the whole credit, vocalists included, so `kz, Unknown producer(s) feat. various`
 * still reads `kz feat. various`. Returns null when nothing is left to show.
 */
export const displayArtistString = (artistString: string | null): string | null => {
  if (artistString === null) return null
  const match = artistString.match(FEATURED_CREDIT)
  const producers = namedArtistList(match ? artistString.slice(0, match.index ?? 0) : artistString)
  const featured = match
    ? namedArtistList(artistString.slice((match.index ?? 0) + match[0].length))
    : []
  const cast = featured.length === 0 ? '' : producers.length === 0 ? featured.join(', ') : `feat. ${featured.join(', ')}`
  const parts = [producers.join(', '), cast].filter((part) => part !== '')
  return parts.length === 0 ? null : parts.join(' ')
}
