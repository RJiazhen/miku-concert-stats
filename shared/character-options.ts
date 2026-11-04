/** Ranked row fields the character picker reads. */
export type CharacterRankedRow = {
  /** Base character names assigned to the row. Empty when no vocalist rule matched. */
  characterList: readonly string[]
}

/** One character that occurs in at least one ranked row. */
export type CharacterOption = {
  name: string
  /** Number of ranked rows that include this character. */
  count: number
}

/**
 * Characters present in the ranking, most frequent first and then by name.
 * Rows without characters contribute nothing, and a character repeated on one row counts once.
 * Callers pass the rows before the search and character filters so the list cannot shrink as those are applied,
 * which also keeps every option able to match at least one row.
 */
export const availableCharacters = (rows: readonly CharacterRankedRow[]): CharacterOption[] => {
  const counts = new Map<string, number>()
  for (const row of rows) {
    for (const name of new Set(row.characterList)) counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  return [...counts]
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name, 'ja'))
}
