import { describe, expect, it } from 'vitest'
import { isPlaceholderSong } from '../shared/placeholder-song.ts'

describe('placeholder songs', () => {
  it('rejects the VocaDB placeholder row used for non-song segments', () => {
    expect(isPlaceholderSong({
      name: '???',
      names: [
        { value: '???' },
        { value: '[unknown]' },
        { value: '[Unknown song]' },
        { value: '[Placeholder song]' },
      ],
    })).toBe(true)
  })

  it('ignores case and surrounding whitespace in a marker', () => {
    expect(isPlaceholderSong({ name: '  [placeholder SONG]  ' })).toBe(true)
    expect(isPlaceholderSong({ name: '???', names: [{ value: '[temporary song]' }] })).toBe(true)
  })

  it('keeps a real song, including one whose title merely contains the word', () => {
    expect(isPlaceholderSong({ name: '千本桜' })).toBe(false)
    expect(isPlaceholderSong({ name: '???', names: [{ value: 'Hatsune Miku × Kodō Special Live' }] })).toBe(false)
    expect(isPlaceholderSong({ name: 'Placeholder Song', names: [] })).toBe(false)
  })
})
