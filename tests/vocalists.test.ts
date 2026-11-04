import { describe, expect, it } from 'vitest'
import { songVocalistSql, vocalistsOfSong } from '../scripts/vocadb/vocalists.ts'

describe('song vocalist collection', () => {
  it('keeps only the Vocalist credits, trimmed and deduplicated', () => {
    const vocalists = vocalistsOfSong({
      id: 680530,
      name: 'Hand in Hand',
      artistString: 'kz, Unknown producer(s) feat. various',
      artists: [
        { name: 'kz', categories: 'Producer', roles: 'Composer, Lyricist' },
        { name: 'Unknown producer(s)', categories: 'Producer', roles: 'VoiceManipulator' },
        { name: '初音ミク', categories: 'Vocalist', roles: 'Default' },
        { name: '初音ミク', categories: 'Vocalist', roles: 'Default' },
        { name: '鏡音レン', categories: 'Vocalist', roles: 'Default' },
        { name: 'MEIKO', categories: 'Producer, Vocalist', roles: 'Vocalist' },
        { name: '  ', categories: 'Vocalist', roles: 'Default' },
      ],
    })
    expect(vocalists).toEqual(['初音ミク', '鏡音レン', 'MEIKO'])
  })

  it('falls back to the nested artist name and returns nothing without a vocalist', () => {
    expect(vocalistsOfSong({
      id: 1,
      name: 'Song',
      artists: [{ categories: 'Vocalist', artist: { name: '巡音ルカ' } }],
    })).toEqual(['巡音ルカ'])
    expect(vocalistsOfSong({ id: 2, name: 'Song', artists: [{ name: 'ryo', categories: 'Producer' }] })).toEqual([])
  })

  it('replaces the table whenever the increment is applied', () => {
    const sql = songVocalistSql([{ song_id: 680530, name: 'KAITO' }], '2026-11-04T00:00:00.000Z')
    expect(sql).toContain('DELETE FROM song_vocalists;')
    expect(sql).toContain("INSERT INTO song_vocalists (song_id, name) VALUES\n(680530, 'KAITO');")
    expect(songVocalistSql([], '2026-11-04T00:00:00.000Z')).not.toContain('INSERT')
  })
})
