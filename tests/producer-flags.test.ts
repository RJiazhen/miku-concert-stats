import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseProducerFlags } from '../shared/producer-flags.ts'

const committed = (): unknown =>
  JSON.parse(readFileSync(new URL('../data/producer-flags.json', import.meta.url), 'utf8')) as unknown

describe('parseProducerFlags', () => {
  it('defaults every unrecorded name to core and keeps the note', () => {
    const flags = parseProducerFlags({ OTOIRO: { kind: 'label', note: 'DECO*27 的厂牌' } })
    expect(flags.size).toBe(1)
    expect(flags.kindOf('OTOIRO')).toBe('label')
    expect(flags.byName.get('OTOIRO')).toEqual({ name: 'OTOIRO', kind: 'label', note: 'DECO*27 的厂牌' })
    expect(flags.kindOf('DECO*27')).toBe('core')
    expect(flags.isCounted('DECO*27')).toBe(true)
  })

  it('resolves a numeric key by artist id before the display name', () => {
    const flags = parseProducerFlags({ '60068': { kind: 'label', name: 'Rockwell' } })
    expect(flags.kindOf('Rockwell')).toBe('label')
    // A re-spelled credit still carries the flag through its artist id.
    expect(flags.kindOf('Rockwell (studio)', 60068)).toBe('label')
    expect(flags.isCounted('Rockwell', 60068)).toBe(false)
  })

  it('keeps support counted so a collaborator still appears with its badge', () => {
    const flags = parseProducerFlags({ Hayato: { kind: 'support' } })
    expect(flags.kindOf('Hayato')).toBe('support')
    expect(flags.isCounted('Hayato')).toBe(true)
  })

  it('rejects a numeric key without a name, an unknown kind, and a repeated name', () => {
    expect(() => parseProducerFlags({ '60068': { kind: 'label' } })).toThrow()
    expect(() => parseProducerFlags({ Someone: { kind: 'studio' } })).toThrow()
    expect(() => parseProducerFlags({ Someone: { kind: 'label' }, '12': { kind: 'core', name: 'Someone' } })).toThrow()
    expect(() => parseProducerFlags([])).toThrow()
  })

  it('flags the committed label / group entries, including the ensemble and circle credits', () => {
    const flags = parseProducerFlags(committed())
    expect(flags.kindOf('OTOIRO')).toBe('label')
    expect(flags.kindOf('Rockwell', 60068)).toBe('label')
    // Non-person VocaDB artist types: OtherGroup, Band, Circle.
    expect(flags.kindOf('東京フィルハーモニー交響楽団', 54531)).toBe('label')
    expect(flags.kindOf('鼓童', 56929)).toBe('label')
    expect(flags.kindOf('supercell')).toBe('label')
    expect(flags.kindOf('Anamanaguchi')).toBe('label')
    // Individual creators keep counting, and the artist-type evidence stays auditable.
    expect(flags.isCounted('DECO*27')).toBe(true)
    expect(flags.isCounted('Last Note. T', 32564)).toBe(true)
    for (const entry of flags.byName.values()) expect(entry.note).not.toBeNull()
  })
})
