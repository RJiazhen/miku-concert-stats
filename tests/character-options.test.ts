import { describe, expect, it } from 'vitest'
import { availableCharacters } from '../shared/character-options.ts'

describe('availableCharacters', () => {
  it('offers only characters that occur and counts the rows containing them', () => {
    const options = availableCharacters([
      { characterList: ['初音ミク', '鏡音リン'] },
      { characterList: ['初音ミク'] },
      { characterList: [] },
      { characterList: ['巡音ルカ'] },
    ])
    expect(new Map(options.map((option) => [option.name, option.count]))).toEqual(
      new Map([
        ['初音ミク', 2],
        ['鏡音リン', 1],
        ['巡音ルカ', 1],
      ]),
    )
    expect(options.map((option) => option.name)).not.toContain('MEIKO')
  })

  it('sorts by occurrence count descending, then by name', () => {
    const options = availableCharacters([
      { characterList: ['Beta'] },
      { characterList: ['Alpha'] },
      { characterList: ['Alpha', 'Beta'] },
      { characterList: ['Gamma', 'Gamma'] },
    ])
    expect(options).toEqual([
      { name: 'Alpha', count: 2 },
      { name: 'Beta', count: 2 },
      { name: 'Gamma', count: 1 },
    ])
  })

  it('counts a character once per row even when the row repeats it', () => {
    expect(availableCharacters([{ characterList: ['初音ミク', '初音ミク'] }])).toEqual([{ name: '初音ミク', count: 1 }])
  })

  it('returns no options when there are no rows or no characters', () => {
    expect(availableCharacters([])).toEqual([])
    expect(availableCharacters([{ characterList: [] }])).toEqual([])
  })
})
