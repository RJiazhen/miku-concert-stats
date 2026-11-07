/** SQL literal. Undefined is a programming error and is not stored as NULL. */
export const sqlLiteral = (value: string | number | null): string => {
  if (value === null) return 'NULL'
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Refusing a non-finite SQL number')
    return String(value)
  }
  return `'${value.replaceAll("'", "''")}'`
}

/** One INSERT statement, chunked by the caller. */
export const insertSql = (
  table: string,
  columns: readonly string[],
  rows: readonly (readonly (string | number | null)[])[],
  orIgnore = false,
): string => {
  if (rows.length === 0) return ''
  const values = rows.map((row) => {
    if (row.length !== columns.length) throw new Error(`Column mismatch for ${table}`)
    return `(${row.map((value) => sqlLiteral(value)).join(', ')})`
  })
  const verb = orIgnore ? 'INSERT OR IGNORE' : 'INSERT'
  return `${verb} INTO ${table} (${columns.join(', ')}) VALUES\n${values.join(',\n')};`
}

/** Splits rows so a single statement stays reviewable in git diffs. */
export const chunkInserts = (
  table: string,
  columns: readonly string[],
  rows: readonly (readonly (string | number | null)[])[],
  size = 80,
): string => chunk(table, columns, rows, size, false)

/** Like `chunkInserts`, but keeps existing rows instead of failing on a duplicate primary key. */
export const chunkInsertsIgnoring = (
  table: string,
  columns: readonly string[],
  rows: readonly (readonly (string | number | null)[])[],
  size = 80,
): string => chunk(table, columns, rows, size, true)

/** Builds one table's INSERT statements in reviewable chunks. */
const chunk = (
  table: string,
  columns: readonly string[],
  rows: readonly (readonly (string | number | null)[])[],
  size: number,
  orIgnore: boolean,
): string => {
  const parts: string[] = []
  for (let index = 0; index < rows.length; index += size) {
    const sql = insertSql(table, columns, rows.slice(index, index + size), orIgnore)
    if (sql) parts.push(sql)
  }
  return parts.join('\n')
}

/** Wraps catalog replacement SQL. */
export const catalogTransaction = (body: string, retrievedAt: string): string => {
  return [
    '-- Source: VocaDB public REST API https://vocadb.net/api/',
    `-- Retrieved: ${retrievedAt}`,
    '-- License: https://wiki.vocadb.net/docs/license (link back when reusing database contents)',
    'BEGIN;',
    'DELETE FROM setlist_item_songs;',
    'DELETE FROM medley_quarantine;',
    'DELETE FROM setlist_items;',
    'DELETE FROM videos;',
    'DELETE FROM songs;',
    'DELETE FROM song_lists;',
    'DELETE FROM edition_premieres;',
    'DELETE FROM performance_links;',
    'DELETE FROM performances;',
    'DELETE FROM series;',
    'DELETE FROM sources;',
    body.trim(),
    'COMMIT;',
    '',
  ].join('\n')
}
