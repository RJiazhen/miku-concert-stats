/** Ranked row fields the producer picker reads. */
export type ProducerRankedRow = {
  /** Producer names shown for the row, already resolved to one name per artist. */
  producerList: readonly string[]
}

/** One producer that occurs in at least one ranked row. */
export type ProducerOption = {
  name: string
  /** Number of ranked rows that credit this producer. */
  count: number
}

/**
 * Producers present in the ranking, most frequent first and then by name.
 * Rows without producers contribute nothing, and a producer repeated on one row counts once.
 * Callers pass the rows before the search and producer filters so the list cannot shrink as those are applied,
 * which also keeps every option able to match at least one row.
 */
export const availableProducers = (rows: readonly ProducerRankedRow[]): ProducerOption[] => {
  const counts = new Map<string, number>()
  for (const row of rows) {
    for (const name of new Set(row.producerList)) counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  return [...counts]
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name, 'ja'))
}
