import { describe, expect, it } from 'vitest'
import { producerCredit } from '../shared/credit.ts'

describe('producerCredit', () => {
  it('keeps a plain producer credit unchanged', () => {
    expect(producerCredit('ryo')).toBe('ryo')
  })

  it('drops the feat. segment and its leading separator', () => {
    expect(producerCredit('ryo feat. 初音ミク')).toBe('ryo')
    expect(producerCredit('ryo FEAT. 初音ミク')).toBe('ryo')
    expect(producerCredit('supercell ft. 初音ミク')).toBe('supercell')
  })

  it('drops the featuring variant', () => {
    expect(producerCredit('ryo featuring 初音ミク')).toBe('ryo')
    expect(producerCredit('ryo Featuring 初音ミク')).toBe('ryo')
  })

  it('keeps every comma-separated producer before feat.', () => {
    expect(producerCredit('ryo, supercell feat. 初音ミク')).toBe('ryo, supercell')
    expect(producerCredit('ryo, supercell featuring 初音ミク')).toBe('ryo, supercell')
  })

  it('trims a trailing comma left by the removed segment', () => {
    expect(producerCredit('ryo, feat. 初音ミク')).toBe('ryo')
  })

  it('returns null when only featured vocalists are credited', () => {
    expect(producerCredit('feat. 初音ミク')).toBeNull()
    expect(producerCredit('featuring 初音ミク')).toBeNull()
  })

  it('returns null for a missing credit', () => {
    expect(producerCredit(null)).toBeNull()
  })
})
