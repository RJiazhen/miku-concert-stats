/**
 * Producer credit from an `artist_string` such as `ryo, supercell feat. 初音ミク`.
 * Returns null when the string only names featured vocalists, which the 演出角色 column already shows.
 */
export const producerCredit = (artistString: string | null): string | null => {
  if (artistString === null) return null
  const match = artistString.match(/\bfeat\.?\s/i)
  const producers = (match ? artistString.slice(0, match.index ?? 0) : artistString).trim()
  return producers === '' ? null : producers
}
