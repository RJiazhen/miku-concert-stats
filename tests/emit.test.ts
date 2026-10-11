import { describe, expect, it } from 'vitest'
import { catalogTransaction, sqlLiteral } from '../scripts/sql/emit.ts'
import { snapshotsFromYoutube } from '../scripts/snapshot-youtube.ts'

describe('sql literals', () => {
  it('escapes quotes and refuses to turn undefined into a value', () => {
    expect(sqlLiteral("O'Hara")).toBe("'O''Hara'")
    expect(sqlLiteral(null)).toBe('NULL')
  })

  it('does not delete snapshot tables when replacing the catalog', () => {
    const sql = catalogTransaction('SELECT 1;', '2026-10-12T00:00:00.000Z')
    expect(sql).toContain('DELETE FROM songs;')
    expect(sql).not.toContain('DELETE FROM view_snapshots')
    expect(sql).not.toContain('DELETE FROM milestones')
  })
})

describe('youtube snapshot parsing', () => {
  it('skips items that have no viewCount', () => {
    const rows = snapshotsFromYoutube({
      items: [
        { id: 'abc', statistics: { viewCount: '42' } },
        { id: 'def', statistics: {} },
      ],
    }, '2026-10-12T00:00:00.000Z')
    expect(rows).toEqual([
      expect.objectContaining({ platform_video_id: 'abc', view_count: 42 }),
    ])
  })
})
