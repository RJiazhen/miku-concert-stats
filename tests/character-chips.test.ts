import { describe, expect, it } from 'vitest'
import { splitCharacterChips } from '../shared/character-chips.ts'

describe('character chips', () => {
  it('keeps every chip when the list is short enough', () => {
    expect(splitCharacterChips(['初音ミク', 'KAITO'])).toEqual({ visible: ['初音ミク', 'KAITO'], hidden: [] })
    expect(splitCharacterChips(['初音ミク', '鏡音リン', 'KAITO'])).toEqual({
      visible: ['初音ミク', '鏡音リン', 'KAITO'],
      hidden: [],
    })
  })

  it('shows three chips and hides the rest behind the counter', () => {
    const names = ['初音ミク', '鏡音リン', '鏡音レン', '巡音ルカ', 'MEIKO', 'KAITO']
    expect(splitCharacterChips(names)).toEqual({
      visible: ['初音ミク', '鏡音リン', '鏡音レン'],
      hidden: ['巡音ルカ', 'MEIKO', 'KAITO'],
    })
  })

  it('never invents chips for an empty list', () => {
    expect(splitCharacterChips([])).toEqual({ visible: [], hidden: [] })
  })
})
