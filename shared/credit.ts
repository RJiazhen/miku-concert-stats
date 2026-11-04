/**
 * Marks where the featured-vocalist segment begins. `featuring` is listed before `feat` so the
 * longer word wins the alternation; the whole pattern is case-insensitive for `Feat.` / `FEAT`.
 */
const FEATURED_CREDIT = /\b(?:featuring|feat|ft)\.?\s*/i

/**
 * Producer credit from an `artist_string` such as `ryo, supercell feat. 初音ミク`.
 * Drops the `feat.` / `featuring` segment and the comma that separated it, so
 * `ryo, supercell feat. 初音ミク` becomes `ryo, supercell`.
 * Returns null when the string only names featured vocalists, which the 演出角色 column already shows.
 */
export const producerCredit = (artistString: string | null): string | null => {
  if (artistString === null) return null
  const match = artistString.match(FEATURED_CREDIT)
  const producers = (match ? artistString.slice(0, match.index ?? 0) : artistString)
    .replace(/[\s,、，]+$/u, '')
  return producers === '' ? null : producers
}
