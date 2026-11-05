import { describe, expect, it } from 'vitest'
import { buildAccessLoginUrl } from '../shared/admin.ts'

const CONFIG = {
  teamDomain: 'team.cloudflareaccess.com',
  aud: 'aud-tag-0123456789',
}

describe('Access login redirect', () => {
  it('builds the team login URL with the AUD as kid and the original path', () => {
    const url = buildAccessLoginUrl(CONFIG, 'stats.example.com', '/admin/feedback')
    expect(url).toBe(
      'https://team.cloudflareaccess.com/cdn-cgi/access/login/stats.example.com?kid=aud-tag-0123456789&redirect_url=%2Fadmin%2Ffeedback',
    )
  })

  it('keeps the query string inside the encoded redirect_url', () => {
    const url = buildAccessLoginUrl(CONFIG, 'stats.example.com', '/admin/feedback?filter=open&page=2')
    const redirect = new URL(url).searchParams.get('redirect_url')
    expect(redirect).toBe('/admin/feedback?filter=open&page=2')
  })
})
