import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { availableCharacters } from '../shared/character-options.ts'
import {
  compareCharacterNames,
  localizeCharacterName,
  parseCharacterNames,
} from '../shared/character-names.ts'
import { parseCharacterConfig } from '../shared/characters.ts'

/** Checked characters used by every case. */
const names = parseCharacterNames({
  初音ミク: '初音未来',
  鏡音リン: '镜音铃',
})

describe('character names', () => {
  it('follows the language and falls back to the canonical name', () => {
    expect(localizeCharacterName(names, '初音ミク', 'zh')).toBe('初音未来')
    expect(localizeCharacterName(names, '初音ミク', 'ja')).toBe('初音ミク')
    expect(localizeCharacterName(names, '寒音ジミ', 'zh')).toBe('寒音ジミ')
  })

  it('sorts by the displayed name in each language', () => {
    expect(compareCharacterNames(names, '初音ミク', '鏡音リン', 'zh')).toBeLessThan(0)
    expect(compareCharacterNames(names, '初音ミク', '鏡音リン', 'ja')).toBeGreaterThan(0)
  })

  it('orders the ranking filter by the displayed names when counts tie', () => {
    const rows = [{ characterList: ['初音ミク'] }, { characterList: ['鏡音リン'] }]
    const chinese = availableCharacters(rows, (left, right) => compareCharacterNames(names, left, right, 'zh'))
    const japanese = availableCharacters(rows)
    expect(chinese.map((option) => option.name)).toEqual(['初音ミク', '鏡音リン'])
    expect(japanese.map((option) => option.name)).toEqual(['鏡音リン', '初音ミク'])
  })

  it('only translates characters configured in characters.json', () => {
    const raw = JSON.parse(readFileSync(new URL('../data/characters.zh-CN.json', import.meta.url), 'utf8')) as unknown
    const configured = new Set(
      parseCharacterConfig(JSON.parse(readFileSync(new URL('../data/characters.json', import.meta.url), 'utf8')) as unknown)
        .map((rule) => rule.name),
    )
    for (const [key, label] of Object.entries(parseCharacterNames(raw))) {
      expect(configured.has(key)).toBe(true)
      expect(label.trim().length).toBeGreaterThan(0)
    }
  })
})
