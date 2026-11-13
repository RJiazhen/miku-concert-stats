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
  zh: {
    初音ミク: '初音未来',
    鏡音リン: '镜音铃',
  },
  en: {
    初音ミク: 'Hatsune Miku',
    鏡音リン: 'Kagamine Rin',
  },
  'zh-Hant': {
    初音ミク: '初音未來',
    鏡音リン: '鏡音鈴',
  },
})

describe('character names', () => {
  it('follows the language and falls back to the canonical name', () => {
    expect(localizeCharacterName(names, '初音ミク', 'zh')).toBe('初音未来')
    expect(localizeCharacterName(names, '初音ミク', 'zh-Hant')).toBe('初音未來')
    expect(localizeCharacterName(names, '初音ミク', 'ja')).toBe('初音ミク')
    expect(localizeCharacterName(names, '初音ミク', 'en')).toBe('Hatsune Miku')
    expect(localizeCharacterName(names, '寒音ジミ', 'zh')).toBe('寒音ジミ')
    expect(localizeCharacterName(names, '寒音ジミ', 'zh-Hant')).toBe('寒音ジミ')
    expect(localizeCharacterName(names, '寒音ジミ', 'en')).toBe('寒音ジミ')
  })

  it('sorts by the displayed name in each language', () => {
    expect(compareCharacterNames(names, '初音ミク', '鏡音リン', 'zh')).toBeLessThan(0)
    expect(compareCharacterNames(names, '初音ミク', '鏡音リン', 'zh-Hant')).toBeLessThan(0)
    expect(compareCharacterNames(names, '初音ミク', '鏡音リン', 'ja')).toBeGreaterThan(0)
    expect(compareCharacterNames(names, '初音ミク', '鏡音リン', 'en')).toBeLessThan(0)
  })

  it('orders the ranking filter by the displayed names when counts tie', () => {
    const rows = [{ characterList: ['初音ミク'] }, { characterList: ['鏡音リン'] }]
    const chinese = availableCharacters(rows, (left, right) => compareCharacterNames(names, left, right, 'zh'))
    const english = availableCharacters(rows, (left, right) => compareCharacterNames(names, left, right, 'en'))
    const japanese = availableCharacters(rows)
    expect(chinese.map((option) => option.name)).toEqual(['初音ミク', '鏡音リン'])
    expect(english.map((option) => option.name)).toEqual(['初音ミク', '鏡音リン'])
    expect(japanese.map((option) => option.name)).toEqual(['鏡音リン', '初音ミク'])
  })

  it('only translates characters configured in characters.json', () => {
    const zh = JSON.parse(readFileSync(new URL('../data/characters.zh-CN.json', import.meta.url), 'utf8')) as unknown
    const hant = JSON.parse(readFileSync(new URL('../data/characters.zh-Hant.json', import.meta.url), 'utf8')) as unknown
    const en = JSON.parse(readFileSync(new URL('../data/characters.en.json', import.meta.url), 'utf8')) as unknown
    const configured = new Set(
      parseCharacterConfig(JSON.parse(readFileSync(new URL('../data/characters.json', import.meta.url), 'utf8')) as unknown)
        .map((rule) => rule.name),
    )
    for (const [key, label] of Object.entries(parseCharacterNames({ zh, 'zh-Hant': hant, en }).zh)) {
      expect(configured.has(key)).toBe(true)
      expect(label.trim().length).toBeGreaterThan(0)
    }
    for (const [key, label] of Object.entries(parseCharacterNames({ zh, 'zh-Hant': hant, en })['zh-Hant'])) {
      expect(configured.has(key)).toBe(true)
      expect(label.trim().length).toBeGreaterThan(0)
    }
    for (const [key, label] of Object.entries(parseCharacterNames({ zh, 'zh-Hant': hant, en }).en)) {
      expect(configured.has(key)).toBe(true)
      expect(label.trim().length).toBeGreaterThan(0)
    }
  })
})
