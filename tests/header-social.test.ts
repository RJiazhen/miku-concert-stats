import { describe, expect, it } from 'vitest'
import { headerSocialLinks } from '../shared/header-social.ts'

describe('headerSocialLinks', () => {
  it('places the Bilibili profile immediately to the right of X with the exact URL', () => {
    const keys = headerSocialLinks.map((link) => link.key)
    expect(keys).toEqual(['github', 'x', 'bilibili'])
    const xIndex = keys.indexOf('x')
    const bili = headerSocialLinks[xIndex + 1]
    expect(bili?.href).toBe('https://b23.tv/IITMbFk')
    expect(bili?.icon).toBe('i-tabler:brand-bilibili')
    expect(bili?.ariaKey).toBe('nav.bilibiliProfile')
  })
})
