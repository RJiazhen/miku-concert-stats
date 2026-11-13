import { describe, expect, it } from 'vitest'
import { catalogTransaction, sqlLiteral } from '../scripts/sql/emit.ts'

describe('sql literals', () => {
  it('escapes quotes and refuses to turn undefined into a value', () => {
    expect(sqlLiteral("O'Hara")).toBe("'O''Hara'")
    expect(sqlLiteral(null)).toBe('NULL')
  })

  it('replaces only catalog tables', () => {
    const sql = catalogTransaction('SELECT 1;', '2026-10-12T00:00:00.000Z')
    expect(sql).toContain('DELETE FROM songs;')
    expect(sql).toContain('BEGIN;')
    expect(sql).toContain('COMMIT;')
  })
})
