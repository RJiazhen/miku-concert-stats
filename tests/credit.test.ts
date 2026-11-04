import { describe, expect, it } from 'vitest'
import { displayArtistString, producerCredit } from '../shared/credit.ts'

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

  it('drops VocaDB placeholder artists', () => {
    expect(producerCredit('kz, Unknown producer(s) feat. various')).toBe('kz')
    expect(producerCredit('Unknown producer(s) feat. 初音ミク')).toBeNull()
    expect(producerCredit('Unknown producer(s)')).toBeNull()
  })
})

describe('displayArtistString', () => {
  it('keeps the full credit when every name is real', () => {
    expect(displayArtistString('ryo, supercell feat. 初音ミク')).toBe('ryo, supercell feat. 初音ミク')
    expect(displayArtistString('ryo')).toBe('ryo')
  })

  it('removes the placeholder and keeps the rest of the credit', () => {
    expect(displayArtistString('kz, Unknown producer(s) feat. various')).toBe('kz feat. various')
    expect(displayArtistString('kz, Unknown producer(s)')).toBe('kz')
    expect(displayArtistString('Unknown producer(s) feat. 初音ミク V4 (中文版)')).toBe('初音ミク V4 (中文版)')
  })

  it('returns null when only the placeholder is credited', () => {
    expect(displayArtistString('Unknown producer(s)')).toBeNull()
    expect(displayArtistString(null)).toBeNull()
  })
})
